/**
 * Firebase Cloud Functions for Fin-Track
 *
 * Includes scheduled functions for processing recurring transactions
 */

import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentDeleted, onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_CALLS = 3;

/**
 * Enforce per-user rate limiting for a callable function.
 * Stores call timestamps in Firestore under rateLimits/{userId}_{fnName}.
 * Throws resource-exhausted if the user exceeds RATE_LIMIT_MAX_CALLS
 * within the rolling RATE_LIMIT_WINDOW_MS window.
 */
async function checkRateLimit(userId: string, fnName: string, maxCalls = RATE_LIMIT_MAX_CALLS): Promise<void> {
  const ref = db.collection("rateLimits").doc(`${userId}_${fnName}`);
  const now = Date.now();

  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const recentCalls: number[] = snap.exists
      ? ((snap.data()!.calls as number[]) ?? []).filter(
          (t) => now - t < RATE_LIMIT_WINDOW_MS
        )
      : [];

    if (recentCalls.length >= maxCalls) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many requests. Please wait a few minutes before trying again."
      );
    }

    recentCalls.push(now);
    txn.set(ref, { calls: recentCalls, userId, fnName }, { merge: true });
  });
}

// ─── Audit Logging ────────────────────────────────────────────────────────────

/**
 * Write a structured audit log entry to the auditLog collection.
 * This collection is admin-write only (see firestore.rules).
 */
async function logAuditEvent(
  userId: string,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  await db.collection("auditLog").add({
    userId,
    action,
    details,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// Type definitions matching frontend types
interface RecurringTransaction {
  userId: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  frequency: "weekly" | "monthly" | "yearly";
  nextDate: admin.firestore.Timestamp;
  isActive: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Calculate the next occurrence date based on frequency.
 *
 * KEEP IN SYNC with the frontend copy in
 * frontend/lib/firestore-recurring.ts (calculateNextDate). The two packages
 * deploy independently, so this logic is intentionally duplicated — any change
 * to month-end / leap-year handling must be mirrored in both.
 */
function calculateNextDate(
  currentDate: Date,
  frequency: "weekly" | "monthly" | "yearly"
): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "monthly": {
      const day = nextDate.getDate();
      nextDate.setDate(1); // prevent month-end overflow (e.g. Jan 31 → Mar 2)
      nextDate.setMonth(nextDate.getMonth() + 1);
      const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(day, maxDay));
      break;
    }
    case "yearly": {
      const month = nextDate.getMonth();
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      // Feb 29 on a non-leap year rolls to Mar 1 — clamp back to Feb 28
      if (nextDate.getMonth() !== month) {
        nextDate.setDate(0);
      }
      break;
    }
  }

  return nextDate;
}

/**
 * Process a single recurring transaction, catching up EVERY missed occurrence
 * whose date is due (<= now), not just the earliest one (review R5-3).
 *
 * Each occurrence is created in its own transaction keyed by a deterministic
 * entry ID (`rec_{id}_{YYYY-MM-DD}`), so concurrent executions converge on the
 * same document instead of double-writing — closing the old read-then-write gap.
 * A safety cap bounds how many entries one run can mint.
 */
async function processRecurringTransaction(
  recurringId: string,
  recurring: RecurringTransaction
): Promise<void> {
  const recurringRef = db.collection("recurringTransactions").doc(recurringId);
  const now = admin.firestore.Timestamp.now();
  // Bound catch-up so a wildly back-dated nextDate (e.g. a weekly item set years
  // ago) can't mint an unbounded number of entries in a single run. Any
  // remainder is processed on subsequent daily runs.
  const MAX_CATCHUP = 60;

  // Cursor over the due occurrence dates. Each iteration creates one entry for
  // the cursor date and advances by one period until we reach a future date.
  let cursor = recurring.nextDate;

  for (let i = 0; i < MAX_CATCHUP; i++) {
    if (cursor.toMillis() > now.toMillis()) break;

    const dateStr = cursor.toDate().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const entryId = `rec_${recurringId}_${dateStr}`;
    const entryRef = db.collection("entries").doc(entryId);

    const next = await db.runTransaction<admin.firestore.Timestamp | null>(async (txn) => {
      const [entrySnap, recurringSnap] = await Promise.all([
        txn.get(entryRef),
        txn.get(recurringRef),
      ]);

      const latest = recurringSnap.data() as RecurringTransaction | undefined;
      // Paused or deleted mid-run — stop catching up.
      if (!latest?.isActive) return null;

      // Another execution already advanced past our cursor — resync to the
      // authoritative nextDate and continue from there (no double write).
      if (latest.nextDate.toMillis() !== cursor.toMillis()) {
        return latest.nextDate;
      }

      const advanced = admin.firestore.Timestamp.fromDate(
        calculateNextDate(cursor.toDate(), latest.frequency)
      );

      // Use the freshly-read document for the entry payload so a concurrent edit
      // to amount/category/name isn't lost (review R5-9).
      if (!entrySnap.exists) {
        txn.set(entryRef, {
          userId: latest.userId,
          type: latest.type,
          amount: latest.amount,
          currency: "EUR",
          description: latest.name,
          category: latest.category,
          date: cursor,
          recurring: true,
          recurringId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`Processed recurring transaction: ${latest.name}`, {
          recurringId,
          entryId,
          userId: latest.userId,
          amount: latest.amount,
          type: latest.type,
          newNextDate: advanced.toDate().toISOString(),
        });
      } else {
        // Entry already exists (a prior partial run created it); still advance
        // nextDate so we make progress and don't loop on the same date.
        logger.info(`Recurring entry already exists, advancing nextDate: ${latest.name}`, {
          recurringId,
          entryId,
        });
      }

      txn.update(recurringRef, {
        nextDate: advanced,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return advanced;
    });

    if (next === null) break; // inactive/deleted mid-run
    cursor = next;
  }
}

/**
 * Main function to process all due recurring transactions
 */
async function processDueRecurringTransactions(): Promise<{
  processed: number;
  errors: number;
}> {
  const now = admin.firestore.Timestamp.now();

  // Query all active recurring transactions where nextDate <= now
  const recurringQuery = db
    .collection("recurringTransactions")
    .where("isActive", "==", true)
    .where("nextDate", "<=", now);

  const snapshot = await recurringQuery.get();

  logger.info(`Found ${snapshot.size} recurring transactions to process`);

  let processed = 0;
  let errors = 0;

  for (const doc of snapshot.docs) {
    const recurring = doc.data() as RecurringTransaction;

    try {
      await processRecurringTransaction(doc.id, recurring);
      processed++;
    } catch (error) {
      errors++;
      logger.error(`Error processing recurring transaction ${doc.id}:`, error);
    }
  }

  return { processed, errors };
}

/**
 * Scheduled function that runs daily at 1:00 AM UTC
 * Processes all due recurring transactions
 */
export const processRecurringTransactionsScheduled = onSchedule(
  {
    schedule: "0 1 * * *", // Every day at 1:00 AM UTC
    timeZone: "UTC",
    retryCount: 3,
  },
  async () => {
    logger.info("Starting scheduled recurring transactions processing");

    const result = await processDueRecurringTransactions();

    logger.info("Completed recurring transactions processing", result);
  }
);

/**
 * Scheduled function that runs on the 1st of every month at 00:05 UTC.
 * Resets all scanUsage documents so each user starts a fresh quota.
 */
export const resetMonthlyScanCounts = onSchedule(
  {
    schedule: "5 0 1 * *", // 1st of each month at 00:05 UTC
    timeZone: "UTC",
    retryCount: 2,
  },
  async () => {
    logger.info("Starting monthly scan count reset");

    const newMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const snapshot = await db.collection("scanUsage").get();

    if (snapshot.empty) {
      logger.info("No scanUsage documents to reset");
      return;
    }

    // Process in batches of 490 (Firestore limit is 500 per batch)
    const BATCH_SIZE = 490;
    const docs = snapshot.docs;
    let resetCount = 0;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + BATCH_SIZE);

      for (const doc of chunk) {
        batch.update(doc.ref, {
          count: 0,
          month: newMonth,
          resetAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      resetCount += chunk.length;
    }

    logger.info(`Reset scan counts for ${resetCount} users`, { month: newMonth });
  }
);

/**
 * Callable function to manually trigger processing
 * Useful for testing or catching up on missed transactions
 * Can only be called by authenticated users (processes only their transactions)
 */
export const processMyRecurringTransactions = onCall(
  { enforceAppCheck: false },
  async (request) => {
    // Ensure user is authenticated
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to process recurring transactions"
      );
    }

    const userId = request.auth.uid;

    // Rate limit: max 3 calls per 5 minutes per user
    await checkRateLimit(userId, "processMyRecurringTransactions");

    const now = admin.firestore.Timestamp.now();

    // Query only this user's active recurring transactions where nextDate <= now
    const recurringQuery = db
      .collection("recurringTransactions")
      .where("userId", "==", userId)
      .where("isActive", "==", true)
      .where("nextDate", "<=", now);

    const snapshot = await recurringQuery.get();

    logger.info(
      `User ${userId}: Found ${snapshot.size} recurring transactions to process`
    );

    let processed = 0;
    let errors = 0;

    for (const doc of snapshot.docs) {
      const recurring = doc.data() as RecurringTransaction;

      try {
        await processRecurringTransaction(doc.id, recurring);
        processed++;
      } catch (error) {
        errors++;
        logger.error(`Error processing recurring transaction ${doc.id}:`, error);
      }
    }

    return {
      success: true,
      processed,
      errors,
      message: `Processed ${processed} recurring transaction(s)`,
    };
  }
);

// ─── Push Notification Helpers ────────────────────────────────────────────────

/**
 * Persist a notification to the user's in-app notification inbox.
 * Always called alongside sendPushToUser so the record survives even if push fails.
 */
async function saveNotification(
  userId: string,
  notification: { title: string; body: string; url?: string; type?: string }
): Promise<void> {
  await db
    .collection("users")
    .doc(userId)
    .collection("notifications")
    .add({
      title: notification.title,
      body: notification.body,
      url: notification.url ?? "/notifications",
      type: notification.type ?? "system",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Send a push notification to all FCM tokens stored on a user document.
 * Silently removes stale tokens (FCM returns "registration-token-not-registered").
 */
async function sendPushToUser(
  userId: string,
  notification: { title: string; body: string; url?: string; tag?: string; type?: string }
): Promise<void> {
  // Persist to the in-app inbox FIRST, regardless of whether a push is delivered —
  // users who never enabled browser push must still see notifications (review N1).
  await saveNotification(userId, notification);

  const userSnap = await db.collection("users").doc(userId).get();
  const tokens: string[] = userSnap.data()?.fcmTokens ?? [];
  if (tokens.length === 0) return;

  const staleTokens: string[] = [];

  await Promise.all(
    tokens.map(async (token) => {
      try {
        const absUrl = `https://fin-track-adc2c.firebaseapp.com${notification.url ?? "/dashboard/"}`;
        // Data-only message — no top-level `notification` field.
        // This prevents the Firebase SDK from auto-displaying a bare notification
        // and lets our SW / foreground handler render the full title + body.
        await admin.messaging().send({
          token,
          data: {
            title: notification.title,
            body: notification.body,
            url: absUrl,
            tag: notification.tag ?? "pocket",
          },
          webpush: {
            fcmOptions: {
              link: absUrl,
            },
          },
          android: {
            priority: "high",
          },
          apns: {
            payload: {
              aps: {
                "content-available": 1,
                alert: {
                  title: notification.title,
                  body: notification.body,
                },
                sound: "default",
                badge: 1,
              },
            },
          },
        });
      } catch (err: any) {
        if (err?.errorInfo?.code === "messaging/registration-token-not-registered") {
          staleTokens.push(token);
        } else {
          logger.warn(`FCM send failed for token`, { token: token.slice(0, 20), err });
        }
      }
    })
  );

  // Clean up invalidated tokens
  if (staleTokens.length > 0) {
    await db.collection("users").doc(userId).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...staleTokens),
    });
  }
}

// ─── Budget Alert Trigger ─────────────────────────────────────────────────────

/**
 * Fires whenever a new expense entry is created.
 * Checks if any of the user's active budgets has crossed the 80% or 100% threshold
 * for the current month and sends a push notification if so.
 */
export const checkBudgetOnEntry = onDocumentWritten(
  { document: "entries/{entryId}", region: "europe-west4" },
  async (event) => {
    // Re-evaluate on create AND update (e.g. an edited amount or category that
    // pushes a budget over threshold). Deletes have no `after` → skipped.
    const data = event.data?.after?.data();
    if (!data || data.type !== "expense") return;

    const userId = data.userId as string;
    const entryDate: admin.firestore.Timestamp = data.date;
    const entryTs = entryDate.toDate();

    // Fetch all active budgets for this user
    const budgetsSnap = await db
      .collection("budgets")
      .where("userId", "==", userId)
      .where("isActive", "==", true)
      .get();

    if (budgetsSnap.empty) return;

    for (const budgetDoc of budgetsSnap.docs) {
      try {
        const budget = budgetDoc.data();

        // Skip budgets with no positive limit (legacy/corrupt docs) to avoid /0.
        if (typeof budget.amount !== "number" || budget.amount <= 0) continue;

        const budgetStart: admin.firestore.Timestamp = budget.startDate;
        const budgetEnd: admin.firestore.Timestamp = budget.endDate;
        // Dedup key tied to THIS budget period instance (its startDate), so alert
        // state resets when the budget renews — not every calendar month. Fixes
        // weekly/yearly budgets re-alerting every month (review B3).
        const periodKey = budgetStart.toDate().toISOString().slice(0, 10);

        // Skip if the triggering entry falls outside this budget's period
        if (entryTs < budgetStart.toDate() || entryTs > budgetEnd.toDate()) continue;

        // Query all expenses within this budget's exact date range
        const expensesSnap = await db
          .collection("entries")
          .where("userId", "==", userId)
          .where("type", "==", "expense")
          .where("date", ">=", budgetStart)
          .where("date", "<=", budgetEnd)
          .get();

        // Sum only expenses matching this budget's category
        const spent = expensesSnap.docs
          .filter((e) => e.data().category === budget.category)
          .reduce((sum, e) => sum + (e.data().amount as number), 0);

        const pct = Math.round((spent / budget.amount) * 100);
        // Treat 0 / missing / out-of-range threshold as the 80% default so a
        // stray 0 doesn't fire an alert on every single expense.
        const rawThreshold = budget.alertThreshold;
        const threshold =
          typeof rawThreshold === "number" && rawThreshold > 0 && rawThreshold <= 100
            ? rawThreshold
            : 80;

        if (pct < threshold) continue;

        const isOver = pct >= 100;
        const alertLevel = isOver ? 100 : threshold;

        // Dedup: skip if we already sent an alert at this level (or higher) this month.
        // lastAlertedMonthKey / lastAlertedLevel are written below when we send.
        if (
          budget.lastAlertedPeriodKey === periodKey &&
          (budget.lastAlertedLevel ?? 0) >= alertLevel
        ) continue;

        const title = isOver
          ? `🚨 Budget exceeded: ${budget.name}`
          : `⚠️ Budget alert: ${budget.name}`;
        const body = isOver
          ? `You've spent ${pct}% of your ${budget.name} budget.`
          : `You've used ${pct}% of your ${budget.name} budget.`;

        await sendPushToUser(userId, { title, body, url: "/notifications", tag: `budget-${budgetDoc.id}`, type: "budget" });

        // Mark this alert level as sent so the next expense doesn't re-notify
        await budgetDoc.ref.update({
          lastAlertedPeriodKey: periodKey,
          lastAlertedLevel: alertLevel,
        });
      } catch (err) {
        logger.error(`checkBudgetOnEntry: failed processing budget ${budgetDoc.id}`, { err });
      }
    }
  }
);

// ─── Reset User Notifications ────────────────────────────────────────────────

/**
 * Callable function to delete all notifications for the authenticated user.
 * Uses Admin SDK so it bypasses Firestore security rules (which only allow
 * Cloud Functions to delete notifications).
 */
export const deleteMyNotifications = onCall(
  { region: "europe-west4" },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError("unauthenticated", "Not authenticated");

    const BATCH_SIZE = 490;
    const notificationsRef = db.collection("users").doc(userId).collection("notifications");
    const snap = await notificationsRef.get();

    for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    return { deleted: snap.size };
  }
);

// ─── Audit Log Triggers ───────────────────────────────────────────────────────

/**
 * Log every entry deletion to the audit trail.
 * Captures what was deleted, by whom, and when — for compliance and recovery.
 */
export const onEntryDeleted = onDocumentDeleted({ document: "entries/{entryId}", region: "europe-west4" }, async (event) => {
  const data = event.data?.data();
  if (!data) return;

  await logAuditEvent(data.userId as string, "entry.deleted", {
    entryId: event.params.entryId,
    amount: data.amount,
    type: data.type,
    category: data.category,
    description: data.description,
    date: data.date,
  });
});

/**
 * Log creation of high-value entries (amount >= 10,000).
 * Unusual large transactions are worth flagging in the audit trail.
 */
export const onLargeEntryCreated = onDocumentCreated({ document: "entries/{entryId}", region: "europe-west4" }, async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const LARGE_AMOUNT_THRESHOLD = 10_000;
  if ((data.amount as number) < LARGE_AMOUNT_THRESHOLD) return;

  await logAuditEvent(data.userId as string, "entry.large_amount_created", {
    entryId: event.params.entryId,
    amount: data.amount,
    type: data.type,
    category: data.category,
    description: data.description,
  });
});

// ─── Financial Health Leaderboard ─────────────────────────────────────────────

type HealthTier = "critical" | "needs-work" | "good" | "excellent" | "outstanding";

interface MonthlyData {
  income: number;
  expenses: number;
  expensesByCategory: Record<string, number>;
}

function lbMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function lbStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = lbMean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length);
}

function lbClamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lbGetSortedKeys(months: Record<string, MonthlyData>): string[] {
  return Object.keys(months).sort();
}

function lbGetLastN(months: Record<string, MonthlyData>, n: number, before: string): string[] {
  return lbGetSortedKeys(months).filter((k) => k < before).slice(-n);
}

/**
 * Server-side port of calculateHealthScore from insights-engine.ts.
 * Operates on raw Firestore data — no client SDK imports.
 */
function computeHealthScore(
  months: Record<string, MonthlyData>,
  budgets: Array<{ category: string; amount: number; period: string; isActive: boolean }>,
  goals: Array<{ targetAmount: number; currentAmount: number; isActive: boolean }>
): { score: number; tier: HealthTier } {
  // Mirror the client guard (insights-engine calculateHealthScore): an account
  // with no monthly data has nothing to score — return 0/critical rather than
  // accumulating neutral/default points into a misleading positive score.
  if (Object.keys(months).length === 0) {
    return { score: 0, tier: "critical" };
  }

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const recent3 = lbGetLastN(months, 3, currentKey);
  const past6 = lbGetLastN(months, 6, currentKey);

  // 1. Savings Rate (max 30)
  let savingsScore = 0;
  const rateKeys = recent3.length > 0 ? recent3 : (months[currentKey] ? [currentKey] : []);
  if (rateKeys.length > 0) {
    const rates = rateKeys.map((k) => {
      const m = months[k];
      return m.income > 0 ? (m.income - m.expenses) / m.income : 0;
    });
    savingsScore = lbClamp((lbMean(rates) / 0.2) * 30, 0, 30);
  }

  // 2. Budget Adherence (max 25)
  let budgetScore = 12.5;
  const activeBudgets = budgets.filter((b) => b.isActive);
  if (activeBudgets.length > 0) {
    const curData = months[currentKey];
    const catExpenses = curData?.expensesByCategory ?? {};
    const withinLimit = activeBudgets.filter((b) => {
      const spent = catExpenses[b.category] ?? 0;
      const equiv = b.period === "yearly" ? b.amount / 12 : b.period === "weekly" ? b.amount * 4.33 : b.amount;
      return spent <= equiv;
    }).length;
    budgetScore = (withinLimit / activeBudgets.length) * 25;
  }

  // 3. Goal Progress (max 20)
  let goalScore = 10;
  const activeGoals = goals.filter((g) => g.isActive);
  if (activeGoals.length > 0) {
    goalScore = lbMean(activeGoals.map((g) => g.targetAmount > 0 ? lbClamp(g.currentAmount / g.targetAmount, 0, 1) : 0)) * 20;
  }

  // 4. Income Stability (max 15)
  // Neutral (half marks) until there are >=3 months of history — an account
  // with too little data hasn't *earned* full stability marks.
  let incomeScore = 7.5;
  if (past6.length >= 3) {
    const incomes = past6.map((k) => months[k].income);
    const incMean = lbMean(incomes);
    incomeScore = 15 * (1 - lbClamp(incMean > 0 ? lbStdDev(incomes) / incMean : 0, 0, 1));
  }

  // 5. Spending Regularity (max 10) — neutral until >=3 months of history.
  let spendingScore = 5;
  if (past6.length >= 3) {
    const expenses = past6.map((k) => months[k].expenses);
    const expMean = lbMean(expenses);
    spendingScore = 10 * (1 - lbClamp((expMean > 0 ? lbStdDev(expenses) / expMean : 0) * 0.5, 0, 1));
  }

  const raw = savingsScore + budgetScore + goalScore + incomeScore + spendingScore;
  const score = lbClamp(Math.round(isNaN(raw) ? 0 : raw), 0, 100);
  const tier: HealthTier =
    score < 40 ? "critical" :
    score < 55 ? "needs-work" :
    score < 70 ? "good" :
    score < 85 ? "excellent" : "outstanding";

  return { score, tier };
}

/** Derive a stable, anonymous display handle from a userId via SHA-256 hash. */
function deriveHandle(userId: string): string {
  const hash = crypto.createHash("sha256").update(userId).digest("hex");
  const num = parseInt(hash.slice(0, 5), 16) % 100000;
  return `#${String(num).padStart(5, "0")}`;
}

function lbMedian(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function lbPercentile(sorted: number[], pct: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((pct / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Scheduled leaderboard aggregation.
 * Runs on the 2nd of each month at 02:00 UTC, after monthly resets settle.
 * Only includes users who have opted in (leaderboardOptIn: true).
 * Produces leaderboardProfiles/{userId} (owner-read) and leaderboardStats/current (public read).
 */
export const aggregateLeaderboard = onSchedule(
  {
    schedule: "0 3 * * *", // Every day at 03:00 UTC
    timeZone: "UTC",
    retryCount: 2,
    region: "europe-west4",
  },
  async () => {
    logger.info("Starting leaderboard aggregation");

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // 1. Fetch all opted-in users
    const usersSnap = await db.collection("users").where("leaderboardOptIn", "==", true).get();
    logger.info(`Found ${usersSnap.size} opted-in users`);

    const profiles: Array<{ userId: string; score: number; tier: HealthTier; handle: string; months: number }> = [];

    // 2. Score each user (batch fetches to avoid overwhelming Firestore)
    const BATCH = 50;
    for (let i = 0; i < usersSnap.docs.length; i += BATCH) {
      const chunk = usersSnap.docs.slice(i, i + BATCH);
      await Promise.all(chunk.map(async (userDoc) => {
        const userId = userDoc.id;
        try {
          const [summarySnap, budgetsSnap, goalsSnap] = await Promise.all([
            db.collection("financialSummaries").doc(userId).get(),
            db.collection("budgets").where("userId", "==", userId).where("isActive", "==", true).get(),
            db.collection("goals").where("userId", "==", userId).where("isActive", "==", true).get(),
          ]);

          if (!summarySnap.exists) return;
          const months = (summarySnap.data()?.months ?? {}) as Record<string, MonthlyData>;
          const monthCount = Object.keys(months).length;

          // Accounts with no monthly data don't belong on the leaderboard.
          // Delete any stale profile (e.g. user cleared all entries) and skip.
          if (monthCount === 0) {
            await db.collection("leaderboardProfiles").doc(userId).delete();
            return;
          }

          const budgets = budgetsSnap.docs.map((d) => d.data() as { category: string; amount: number; period: string; isActive: boolean });
          const goals = goalsSnap.docs.map((d) => d.data() as { targetAmount: number; currentAmount: number; isActive: boolean });

          const { score, tier } = computeHealthScore(months, budgets, goals);
          const handle = deriveHandle(userId);

          // Write individual profile (owner-read)
          await db.collection("leaderboardProfiles").doc(userId).set({
            score,
            tier,
            anonymousHandle: handle,
            monthsOfData: monthCount,
            computedAt: admin.firestore.FieldValue.serverTimestamp(),
            optedIn: true,
          });

          profiles.push({ userId, score, tier, handle, months: monthCount });
        } catch (err) {
          logger.warn(`Skipped user ${userId} during leaderboard aggregation`, { err });
        }
      }));
    }

    if (profiles.length === 0) {
      logger.info("No profiles scored — skipping leaderboardStats write");
      return;
    }

    // 3. Compute aggregate stats
    const scores = profiles.map((p) => p.score).sort((a, b) => a - b);
    const tierDist: Record<HealthTier, number> = { critical: 0, "needs-work": 0, good: 0, excellent: 0, outstanding: 0 };
    profiles.forEach((p) => { tierDist[p.tier]++; });

    const top10 = [...profiles].sort((a, b) => b.score - a.score).slice(0, 10).map((p) => ({
      anonymousHandle: p.handle,
      score: p.score,
      tier: p.tier,
    }));

    // top10/25/50 percentile = minimum score to be in that band
    const top10Score = lbPercentile([...scores].reverse(), 10);
    const top25Score = lbPercentile([...scores].reverse(), 25);
    const top50Score = lbPercentile([...scores].reverse(), 50);

    await db.collection("leaderboardStats").doc("current").set({
      totalParticipants: profiles.length,
      medianScore: lbMedian(scores),
      meanScore: Math.round(lbMean(scores)),
      tierDistribution: tierDist,
      scorePercentileBands: { top10: top10Score, top25: top25Score, top50: top50Score },
      topScores: top10,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      monthKey,
    });

    logger.info("Leaderboard aggregation complete", { participants: profiles.length, monthKey });
    await logAuditEvent("system", "leaderboard.aggregated", { participants: profiles.length, monthKey });
  }
);

/**
 * Callable: opt the current user in or out of the leaderboard.
 * On opt-out, immediately deletes their leaderboardProfile.
 */
export const updateLeaderboardOptIn = onCall(
  { region: "europe-west4" },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError("unauthenticated", "Not authenticated");

    await checkRateLimit(userId, "updateLeaderboardOptIn");

    const optIn = request.data?.optIn as boolean;
    if (typeof optIn !== "boolean") throw new HttpsError("invalid-argument", "optIn must be a boolean");

    await db.collection("users").doc(userId).update({
      leaderboardOptIn: optIn,
      leaderboardOptInAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Immediately purge profile on opt-out (GDPR)
    if (!optIn) {
      await db.collection("leaderboardProfiles").doc(userId).delete();
    }

    return { ok: true, optIn };
  }
);

/**
 * Callable: any authenticated user can trigger a leaderboard aggregation on demand.
 * Rate-limited to 1 call per 5 min per user to prevent abuse.
 * Useful for bootstrapping and for users who want fresh data.
 */
export const triggerLeaderboardAggregation = onCall(
  { region: "europe-west4" },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError("unauthenticated", "Not authenticated");
    await checkRateLimit(userId, "triggerLeaderboardAggregation");

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const usersSnap = await db.collection("users").where("leaderboardOptIn", "==", true).get();
    const profiles: Array<{ userId: string; score: number; tier: HealthTier; handle: string; months: number }> = [];

    const BATCH = 50;
    for (let i = 0; i < usersSnap.docs.length; i += BATCH) {
      const chunk = usersSnap.docs.slice(i, i + BATCH);
      await Promise.all(chunk.map(async (userDoc) => {
        const uid = userDoc.id;
        try {
          const [summarySnap, budgetsSnap, goalsSnap] = await Promise.all([
            db.collection("financialSummaries").doc(uid).get(),
            db.collection("budgets").where("userId", "==", uid).where("isActive", "==", true).get(),
            db.collection("goals").where("userId", "==", uid).where("isActive", "==", true).get(),
          ]);
          if (!summarySnap.exists) return;
          const months = (summarySnap.data()?.months ?? {}) as Record<string, MonthlyData>;
          // Accounts with no monthly data don't belong on the leaderboard.
          // Delete any stale profile and skip.
          if (Object.keys(months).length === 0) {
            await db.collection("leaderboardProfiles").doc(uid).delete();
            return;
          }
          const budgets = budgetsSnap.docs.map((d) => d.data() as { category: string; amount: number; period: string; isActive: boolean });
          const goals = goalsSnap.docs.map((d) => d.data() as { targetAmount: number; currentAmount: number; isActive: boolean });
          const { score, tier } = computeHealthScore(months, budgets, goals);
          const handle = deriveHandle(uid);
          await db.collection("leaderboardProfiles").doc(uid).set({
            score, tier, anonymousHandle: handle,
            monthsOfData: Object.keys(months).length,
            computedAt: admin.firestore.FieldValue.serverTimestamp(),
            optedIn: true,
          });
          profiles.push({ userId: uid, score, tier, handle, months: Object.keys(months).length });
        } catch { /* skip user on error */ }
      }));
    }

    if (profiles.length === 0) return { ok: true, participants: 0 };

    const scores = profiles.map((p) => p.score).sort((a, b) => a - b);
    const tierDist: Record<HealthTier, number> = { critical: 0, "needs-work": 0, good: 0, excellent: 0, outstanding: 0 };
    profiles.forEach((p) => { tierDist[p.tier]++; });
    const top10 = [...profiles].sort((a, b) => b.score - a.score).slice(0, 10).map((p) => ({ anonymousHandle: p.handle, score: p.score, tier: p.tier }));

    await db.collection("leaderboardStats").doc("current").set({
      totalParticipants: profiles.length,
      medianScore: lbMedian(scores),
      meanScore: Math.round(lbMean(scores)),
      tierDistribution: tierDist,
      scorePercentileBands: {
        top10: lbPercentile([...scores].reverse(), 10),
        top25: lbPercentile([...scores].reverse(), 25),
        top50: lbPercentile([...scores].reverse(), 50),
      },
      topScores: top10,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      monthKey,
    });

    return { ok: true, participants: profiles.length };
  }
);

// ─── Household / Family Budgeting ─────────────────────────────────────────────

interface HouseholdMember {
  uid: string;
  displayName: string;
  email: string;
  joinedAt: admin.firestore.Timestamp;
}

interface HouseholdDocument {
  name: string;
  ownerUid: string;
  members: HouseholdMember[];
  memberUids: string[];
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Look up the caller's household (by ownerUid or members array) and repair
 * the householdId pointer on their user doc if it is missing.
 * Returns { householdId, name } or { householdId: null }.
 */
export const getMyHousehold = onCall(
  { region: "europe-west4" },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError("unauthenticated", "Not authenticated");

    const userSnap = await db.collection("users").doc(userId).get();
    const existingId = userSnap.data()?.householdId as string | undefined;

    const buildPayload = async (hdoc: FirebaseFirestore.DocumentSnapshot) => {
      const data = hdoc.data()!;
      // Backfill memberUids if missing
      if (!data.memberUids) {
        const uids = (data.members as HouseholdMember[]).map((m) => m.uid);
        await hdoc.ref.update({ memberUids: uids });
        data.memberUids = uids;
      }
      // Only write householdId pointer if it's missing or stale
      if (existingId !== hdoc.id) {
        await db.collection("users").doc(userId).update({ householdId: hdoc.id });
      }
      return {
        householdId: hdoc.id,
        household: {
          name: data.name as string,
          ownerUid: data.ownerUid as string,
          members: data.members as HouseholdMember[],
          memberUids: data.memberUids as string[],
        },
      };
    };
    if (existingId) {
      const hSnap = await db.collection("households").doc(existingId).get();
      if (hSnap.exists) {
        return buildPayload(hSnap);
      }
    }

    // Not on user doc — search by ownerUid
    const ownerSnap = await db
      .collection("households")
      .where("ownerUid", "==", userId)
      .limit(1)
      .get();

    if (!ownerSnap.empty) {
      return buildPayload(ownerSnap.docs[0]);
    }

    // Not owner — check membership via the flat memberUids array.
    // (array-contains on the full member objects never matches a partial {uid}.)
    const memberSnap = await db
      .collection("households")
      .where("memberUids", "array-contains", userId)
      .limit(1)
      .get();

    if (!memberSnap.empty) {
      return buildPayload(memberSnap.docs[0]);
    }

    return { householdId: null, household: null };
  }
);

/**
 * Create a new household. The caller becomes the owner and first member.
 * Returns { householdId }.
 */
export const createHousehold = onCall(
  { region: "europe-west4" },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError("unauthenticated", "Not authenticated");

    await checkRateLimit(userId, "createHousehold");

    // A user can only belong to one household — check the flat memberUids array
    const existing = await db
      .collection("households")
      .where("memberUids", "array-contains", userId)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new HttpsError("already-exists", "You are already in a household. Leave it before creating a new one.");
    }

    const name = (request.data?.name as string | undefined)?.trim() || "My Family";
    const userSnap = await db.collection("users").doc(userId).get();
    const userData = userSnap.data();
    const displayName = userData?.displayName || userData?.username || userData?.email || "Unknown";
    // Prefer the verified email from the auth token over the user doc (doc email may be empty)
    const email = (request.auth?.token?.email || userData?.email || "").toLowerCase();

    const member: HouseholdMember = {
      uid: userId,
      displayName,
      email,
      joinedAt: admin.firestore.Timestamp.now(),
    };

    const householdRef = db.collection("households").doc();
    await householdRef.set({
      name,
      ownerUid: userId,
      members: [member],
      memberUids: [userId],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Store household membership on user doc for quick lookup
    await db.collection("users").doc(userId).update({
      householdId: householdRef.id,
    });

    await logAuditEvent(userId, "household.created", { householdId: householdRef.id, name });

    return { householdId: householdRef.id, name };
  }
);

/**
 * Generate an invite link token for a given household.
 * Caller must be a member of the household.
 * Returns { token, inviteUrl } — the frontend copies the URL to clipboard.
 * Token expires in 7 days.
 */
export const sendHouseholdInvite = onCall(
  { region: "europe-west4" },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError("unauthenticated", "Not authenticated");

    await checkRateLimit(userId, "sendHouseholdInvite", 10);

    const { householdId, invitedEmail } = request.data as { householdId: string; invitedEmail: string };
    if (!householdId || !invitedEmail) {
      throw new HttpsError("invalid-argument", "householdId and invitedEmail are required");
    }

    const householdRef = db.collection("households").doc(householdId);
    const householdSnap = await householdRef.get();
    if (!householdSnap.exists) throw new HttpsError("not-found", "Household not found");

    const household = householdSnap.data() as HouseholdDocument;
    const isMember = household.members.some((m) => m.uid === userId);
    if (!isMember) throw new HttpsError("permission-denied", "You are not a member of this household");

    // Check invitee isn't already a member
    const alreadyMember = household.members.some((m) => m.email === invitedEmail.toLowerCase());
    if (alreadyMember) throw new HttpsError("already-exists", "That person is already in this household");

    const userSnap = await db.collection("users").doc(userId).get();
    const inviterName = userSnap.data()?.displayName || userSnap.data()?.username || "A family member";

    // Expire any existing pending invites for the same email+household
    const staleSnap = await db
      .collection("householdInvites")
      .where("householdId", "==", householdId)
      .where("invitedEmail", "==", invitedEmail.toLowerCase())
      .where("status", "==", "pending")
      .get();

    const batch = db.batch();
    staleSnap.docs.forEach((d) => batch.update(d.ref, { status: "expired" }));

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const inviteRef = db.collection("householdInvites").doc();
    batch.set(inviteRef, {
      householdId,
      householdName: household.name,
      invitedEmail: invitedEmail.toLowerCase(),
      invitedBy: userId,
      inviterName,
      token,
      status: "pending",
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    await logAuditEvent(userId, "household.invite_sent", {
      householdId,
      invitedEmail,
      inviteId: inviteRef.id,
    });

    return { inviteId: inviteRef.id, token };
  }
);

/**
 * Accept a household invite using its token.
 * Caller must be authenticated. Their email is validated against the invite.
 * Adds the caller to the household's members array.
 */
export const acceptHouseholdInvite = onCall(
  { region: "europe-west4" },
  async (request) => {
    const userId = request.auth?.uid;
    const callerEmail = request.auth?.token?.email;
    const emailVerified = request.auth?.token?.email_verified;
    if (!userId || !callerEmail) throw new HttpsError("unauthenticated", "Not authenticated");
    if (!emailVerified) throw new HttpsError("unauthenticated", "Email address must be verified to accept household invites");

    await checkRateLimit(userId, "acceptHouseholdInvite");

    const { token } = request.data as { token: string };
    if (!token) throw new HttpsError("invalid-argument", "token is required");

    // Find the invite by token
    const inviteSnap = await db
      .collection("householdInvites")
      .where("token", "==", token)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (inviteSnap.empty) {
      throw new HttpsError("not-found", "Invite not found or already used");
    }

    const inviteDoc = inviteSnap.docs[0];
    const invite = inviteDoc.data();

    // Validate expiry
    if (invite.expiresAt.toDate() < new Date()) {
      await inviteDoc.ref.update({ status: "expired" });
      throw new HttpsError("deadline-exceeded", "This invite link has expired");
    }

    // Validate the caller's email matches the invite
    if (callerEmail.toLowerCase() !== invite.invitedEmail) {
      throw new HttpsError(
        "permission-denied",
        `This invite was sent to ${invite.invitedEmail}. Please log in with that email address.`
      );
    }

    const householdRef = db.collection("households").doc(invite.householdId);
    const householdSnap = await householdRef.get();
    if (!householdSnap.exists) {
      throw new HttpsError("not-found", "Household no longer exists");
    }

    const household = householdSnap.data() as HouseholdDocument;
    const alreadyMember = household.members.some((m) => m.uid === userId);
    if (alreadyMember) {
      await inviteDoc.ref.update({ status: "accepted" });
      return { householdId: invite.householdId, householdName: invite.householdName };
    }

    const userSnap = await db.collection("users").doc(userId).get();
    const userData = userSnap.data();

    // H2: single-household guard — users can only belong to one household at a time
    if (userData?.householdId && userData.householdId !== invite.householdId) {
      throw new HttpsError(
        "failed-precondition",
        "You are already a member of another household. Leave it before accepting this invite."
      );
    }

    const displayName = userData?.displayName || userData?.username || callerEmail;

    const newMember: HouseholdMember = {
      uid: userId,
      displayName,
      email: callerEmail.toLowerCase(),
      joinedAt: admin.firestore.Timestamp.now(),
    };

    const batch = db.batch();
    batch.update(householdRef, {
      members: admin.firestore.FieldValue.arrayUnion(newMember),
      memberUids: admin.firestore.FieldValue.arrayUnion(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(inviteDoc.ref, { status: "accepted" });
    // Store householdId on the user for quick lookup
    batch.update(db.collection("users").doc(userId), { householdId: invite.householdId });

    await batch.commit();

    await logAuditEvent(userId, "household.invite_accepted", {
      householdId: invite.householdId,
      inviteId: inviteDoc.id,
    });

    return { householdId: invite.householdId, householdName: invite.householdName };
  }
);

/**
 * Fetch merged entries for all members of a household.
 * Caller must be a member of the household.
 * Supports optional date range (startDate / endDate as ISO strings).
 * Returns entries sorted by date descending, each annotated with memberDisplayName.
 */
export const getHouseholdEntries = onCall(
  { region: "europe-west4" },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError("unauthenticated", "Not authenticated");

    const { householdId, startDate, endDate, limit: limitArg } = request.data as {
      householdId: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    };

    if (!householdId) throw new HttpsError("invalid-argument", "householdId is required");

    const householdSnap = await db.collection("households").doc(householdId).get();
    if (!householdSnap.exists) throw new HttpsError("not-found", "Household not found");

    const household = householdSnap.data() as HouseholdDocument;
    const isMember = household.members.some((m) => m.uid === userId);
    if (!isMember) throw new HttpsError("permission-denied", "Not a member of this household");

    const memberUids = household.members.map((m) => m.uid);
    const memberNameMap: Record<string, string> = {};
    household.members.forEach((m) => { memberNameMap[m.uid] = m.displayName; });

    const maxEntries = Math.min(limitArg ?? 200, 500);

    // Fetch entries for all members in parallel (up to 10 members, Firestore in-query limit is 30)
    const startTs = startDate ? admin.firestore.Timestamp.fromDate(new Date(startDate)) : null;
    const endTs = endDate ? admin.firestore.Timestamp.fromDate(new Date(endDate)) : null;

    const CHUNK = 10; // Firestore `in` limit is 30; keep chunks small

    const chunks: string[][] = [];
    for (let i = 0; i < memberUids.length; i += CHUNK) {
      chunks.push(memberUids.slice(i, i + CHUNK));
    }

    const chunkSnaps = await Promise.all(
      chunks.map((uidChunk) => {
        let q = db
          .collection("entries")
          .where("userId", "in", uidChunk)
          .orderBy("date", "desc");
        if (startTs) q = q.where("date", ">=", startTs) as typeof q;
        if (endTs) q = q.where("date", "<=", endTs) as typeof q;
        return q.limit(maxEntries).get();
      })
    );

    const allEntries: Array<Record<string, unknown>> = [];
    chunkSnaps.forEach((snap) => {
      snap.docs.forEach((d) => {
        const data = d.data();
        allEntries.push({
          id: d.id,
          ...data,
          memberDisplayName: memberNameMap[data.userId as string] ?? "Unknown",
          date: (data.date as admin.firestore.Timestamp).toDate().toISOString(),
          createdAt: (data.createdAt as admin.firestore.Timestamp)?.toDate().toISOString(),
          updatedAt: (data.updatedAt as admin.firestore.Timestamp)?.toDate().toISOString(),
        });
      });
    });

    // Sort merged result by date descending and cap at maxEntries
    allEntries.sort((a, b) =>
      new Date(b.date as string).getTime() - new Date(a.date as string).getTime()
    );

    return {
      entries: allEntries.slice(0, maxEntries),
      members: household.members.map((m) => ({ uid: m.uid, displayName: m.displayName, email: m.email })),
    };
  }
);

/**
 * Leave the current household.
 * If the caller is the owner and the only member, the household is deleted.
 * If the caller is the owner but others remain, ownership transfers to the next member.
 */
export const leaveHousehold = onCall(
  { region: "europe-west4" },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError("unauthenticated", "Not authenticated");

    await checkRateLimit(userId, "leaveHousehold");

    const { householdId } = request.data as { householdId: string };
    if (!householdId) throw new HttpsError("invalid-argument", "householdId is required");

    const householdRef = db.collection("households").doc(householdId);
    const householdSnap = await householdRef.get();
    if (!householdSnap.exists) throw new HttpsError("not-found", "Household not found");

    const household = householdSnap.data() as HouseholdDocument;
    const isMember = household.members.some((m) => m.uid === userId);
    if (!isMember) throw new HttpsError("permission-denied", "You are not in this household");

    const remainingMembers = household.members.filter((m) => m.uid !== userId);

    const batch = db.batch();

    if (remainingMembers.length === 0) {
      // Last member leaving — delete the household and all associated data
      batch.delete(householdRef);

      // H3: clean up orphaned sub-data so nothing lingers after dissolution
      const [budgetSnap, goalSnap, inviteSnap] = await Promise.all([
        db.collection("householdBudgets").where("householdId", "==", householdId).get(),
        db.collection("householdGoals").where("householdId", "==", householdId).get(),
        db.collection("householdInvites")
          .where("householdId", "==", householdId)
          .where("status", "==", "pending")
          .get(),
      ]);
      budgetSnap.docs.forEach((d) => batch.delete(d.ref));
      goalSnap.docs.forEach((d) => batch.delete(d.ref));
      inviteSnap.docs.forEach((d) => batch.delete(d.ref));
    } else {
      const updates: Record<string, unknown> = {
        members: remainingMembers,
        memberUids: remainingMembers.map((m) => m.uid),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      // Transfer ownership if needed
      if (household.ownerUid === userId) {
        updates.ownerUid = remainingMembers[0].uid;
      }
      batch.update(householdRef, updates);
    }

    // Clear householdId from the leaving user's document
    batch.update(db.collection("users").doc(userId), {
      householdId: admin.firestore.FieldValue.delete(),
    });

    await batch.commit();

    await logAuditEvent(userId, "household.left", { householdId, remainingCount: remainingMembers.length });

    return { ok: true };
  }
);

/**
 * Update the caller's displayName inside their household members array.
 * Called automatically when a user renames themselves in Settings.
 */
export const updateHouseholdMemberName = onCall(
  { region: "europe-west4" },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError("unauthenticated", "Not authenticated");

    const { displayName } = request.data as { displayName?: string };
    if (!displayName?.trim()) throw new HttpsError("invalid-argument", "displayName is required");

    const userSnap = await db.collection("users").doc(userId).get();
    const householdId = userSnap.data()?.householdId as string | undefined;
    if (!householdId) return { ok: true }; // not in a household — nothing to do

    const householdRef = db.collection("households").doc(householdId);
    const householdSnap = await householdRef.get();
    if (!householdSnap.exists) return { ok: true };

    const household = householdSnap.data() as HouseholdDocument;
    const updatedMembers = household.members.map((m) =>
      m.uid === userId ? { ...m, displayName: displayName.trim() } : m
    );

    await householdRef.update({
      members: updatedMembers,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { ok: true };
  }
);

// ─── Account Deletion ─────────────────────────────────────────────────────────

/**
 * Delete all server-side data for the authenticated user and remove their
 * Firebase Auth account.
 *
 * Covers data that the client SDK cannot touch (admin-write-only collections,
 * Stripe subcollections, Auth account deletion).  Client-owned Firestore data
 * (entries, budgets, etc.) is deleted by the frontend before calling this.
 *
 * Deleted here:
 *   - auditLog documents where userId == uid
 *   - customers/{uid} + subcollections (checkout_sessions, subscriptions, payments)
 *   - rateLimits documents where userId == uid
 *   - householdInvites documents where invitedEmail == user's email (pending invites)
 *   - users/{uid}/notifications subcollection
 *   - Firebase Auth account
 */
export const deleteMyAccount = onCall(
  { region: "europe-west4" },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError("unauthenticated", "Not authenticated");

    const userEmail = request.auth?.token?.email ?? null;
    const BATCH_SIZE = 490;

    // Helper: delete all docs from a query in batches
    async function deleteQueryBatched(
      q: FirebaseFirestore.Query
    ): Promise<void> {
      const snap = await q.get();
      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // Helper: delete all docs in a subcollection
    async function deleteSubcollection(
      parentRef: FirebaseFirestore.DocumentReference,
      subcollectionName: string
    ): Promise<void> {
      const snap = await parentRef.collection(subcollectionName).get();
      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // 1. auditLog entries (admin-write-only collection)
    await deleteQueryBatched(
      db.collection("auditLog").where("userId", "==", userId)
    );

    // 2. Stripe customers subtree
    const customerRef = db.collection("customers").doc(userId);
    await Promise.all([
      deleteSubcollection(customerRef, "checkout_sessions"),
      deleteSubcollection(customerRef, "subscriptions"),
      deleteSubcollection(customerRef, "payments"),
    ]);
    await customerRef.delete();

    // 3. rateLimits documents for this user
    await deleteQueryBatched(
      db.collection("rateLimits").where("userId", "==", userId)
    );

    // 4. Pending household invites sent to this user's email
    if (userEmail) {
      await deleteQueryBatched(
        db
          .collection("householdInvites")
          .where("invitedEmail", "==", userEmail.toLowerCase())
          .where("status", "==", "pending")
      );
    }

    // 5. Notifications subcollection
    await deleteSubcollection(
      db.collection("users").doc(userId),
      "notifications"
    );

    // 5b. Backstop: delete client-owned data too, in case the frontend pre-delete
    //     step failed or was skipped — leaves no orphaned documents under this uid.
    await Promise.all([
      deleteQueryBatched(db.collection("entries").where("userId", "==", userId)),
      deleteQueryBatched(db.collection("budgets").where("userId", "==", userId)),
      deleteQueryBatched(db.collection("goals").where("userId", "==", userId)),
      deleteQueryBatched(db.collection("savingsAccounts").where("userId", "==", userId)),
      deleteQueryBatched(db.collection("categories").where("userId", "==", userId)),
      deleteQueryBatched(db.collection("recurringTransactions").where("userId", "==", userId)),
      deleteQueryBatched(db.collection("assets").where("userId", "==", userId)),
    ]);
    await Promise.all([
      db.collection("financialSummaries").doc(userId).delete(),
      db.collection("aiInsights").doc(userId).delete(),
      db.collection("scanUsage").doc(userId).delete(),
      db.collection("userDebts").doc(userId).delete(),
      db.collection("leaderboardProfiles").doc(userId).delete(),
      // users/{uid} — deleted by the client first, but ensure the CF is self-sufficient
      // if invoked standalone (e.g., admin repair). Firestore delete is idempotent.
      db.collection("users").doc(userId).delete(),
    ]);

    // 6. Delete the Firebase Auth account last — once gone, no token is valid
    await admin.auth().deleteUser(userId);

    await logAuditEvent(userId, "account_deleted", { deletedAt: new Date().toISOString() }).catch(() => {
      // best-effort — the auditLog was already purged, this is a final tombstone
    });

    return { ok: true };
  }
);

// ─── Financial Summary Maintenance (server-authoritative) ─────────────────────

interface SummaryMonthAgg {
  income: number;
  expenses: number;
  salary: number;
  expensesByCategory: Record<string, number>;
  incomeByCategory: Record<string, number>;
}

/**
 * Recompute financialSummaries/{userId} from the user's entries with the Admin
 * SDK. This is the SINGLE writer of the summary — clients are denied create/
 * update by the security rules.
 *
 * It derives totals from the entries themselves (not deltas), so it is
 * idempotent — safe under Firestore's at-least-once trigger redelivery — and
 * self-heals any drift on the next entry mutation.
 */
async function rebuildSummaryFromEntries(userId: string, eventMillis?: number): Promise<void> {
  const summaryRef = db.collection("financialSummaries").doc(userId);
  const snap = await db.collection("entries").where("userId", "==", userId).get();

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalSalary = 0;
  const months: Record<string, SummaryMonthAgg> = {};

  for (const doc of snap.docs) {
    const e = doc.data() as {
      type?: "income" | "expense";
      amount?: number;
      category?: string;
      categoryId?: string;
      date?: admin.firestore.Timestamp;
    };
    if (typeof e.amount !== "number" || !isFinite(e.amount) || !e.date) continue;
    const category = e.category ?? "Uncategorized";
    const d = e.date.toDate();
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!months[monthKey]) {
      months[monthKey] = { income: 0, expenses: 0, salary: 0, expensesByCategory: {}, incomeByCategory: {} };
    }
    const m = months[monthKey];
    if (e.type === "income") {
      totalIncome += e.amount;
      m.income += e.amount;
      m.incomeByCategory[category] = (m.incomeByCategory[category] || 0) + e.amount;
      if (category === "Salary" || e.categoryId === "salary") {
        totalSalary += e.amount;
        m.salary += e.amount;
      }
    } else {
      totalExpenses += e.amount;
      m.expenses += e.amount;
      m.expensesByCategory[category] = (m.expensesByCategory[category] || 0) + e.amount;
    }
  }

  // Read-check-write in a transaction so a recompute triggered by an OLDER
  // entry-write event can't clobber one already written from a NEWER event.
  // Without this, two near-simultaneous writes can each read-all then each set,
  // leaving the summary reflecting whichever set happened to land last (review
  // M5). The heavy entries read stays outside the transaction; the ordering
  // guard (lastEventMillis) ensures the newest event's snapshot — which read the
  // most complete data — wins. `eventMillis` is omitted by manual rebuilds,
  // which always write (and stamp "now") since they are deliberate repairs.
  await db.runTransaction(async (tx) => {
    const cur = await tx.get(summaryRef);
    if (eventMillis !== undefined && cur.exists) {
      const stored = (cur.data() as { lastEventMillis?: number } | undefined)?.lastEventMillis;
      if (typeof stored === "number" && stored > eventMillis) return; // a newer recompute already won
    }

    // No entries left (e.g. after a reset or account deletion) — remove the doc
    // rather than leave an empty summary behind. (Residual edge: a concurrent
    // stale setter could briefly revive it; self-heals on the next mutation.)
    if (snap.empty) {
      if (cur.exists) tx.delete(summaryRef);
      return;
    }

    tx.set(summaryRef, {
      userId,
      totalIncome,
      totalExpenses,
      totalSalary,
      entryCount: snap.size,
      months,
      lastEventMillis: eventMillis ?? Date.now(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Trigger: keep financialSummaries in sync on every entry create/update/delete,
 * INCLUDING entries created server-side (e.g. by the recurring-transaction
 * processor), which previously never updated the summary (review R1).
 */
export const maintainFinancialSummary = onDocumentWritten(
  { document: "entries/{entryId}", region: "europe-west4" },
  async (event) => {
    const before = event.data?.before?.data() as { userId?: string } | undefined;
    const after = event.data?.after?.data() as { userId?: string } | undefined;
    const userId = after?.userId ?? before?.userId;
    if (!userId) return;
    // event.time is the entry-write commit time; use it to order concurrent
    // recomputes (see rebuildSummaryFromEntries / review M5).
    const eventMillis = event.time ? new Date(event.time).getTime() : Date.now();
    await rebuildSummaryFromEntries(userId, Number.isFinite(eventMillis) ? eventMillis : Date.now());
  }
);

/**
 * Callable: force a server-side rebuild of the caller's financial summary.
 * Used to backfill/repair summaries written by the old client path before the
 * summary became server-authoritative, or any time the client finds it missing.
 */
export const rebuildMySummary = onCall(
  { region: "europe-west4" },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError("unauthenticated", "Not authenticated");
    await rebuildSummaryFromEntries(userId);
    return { ok: true };
  }
);
