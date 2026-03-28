/**
 * Firebase Cloud Functions for Fin-Track
 *
 * Includes scheduled functions for processing recurring transactions
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentDeleted, onDocumentCreated } from "firebase-functions/v2/firestore";
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
async function checkRateLimit(userId: string, fnName: string): Promise<void> {
  const ref = db.collection("rateLimits").doc(`${userId}_${fnName}`);
  const now = Date.now();

  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const recentCalls: number[] = snap.exists
      ? ((snap.data()!.calls as number[]) ?? []).filter(
          (t) => now - t < RATE_LIMIT_WINDOW_MS
        )
      : [];

    if (recentCalls.length >= RATE_LIMIT_MAX_CALLS) {
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
 * Calculate the next occurrence date based on frequency
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
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
}

/**
 * Process a single recurring transaction:
 * 1. Check idempotency — skip if an entry already exists for this date
 * 2. Create an entry in the entries collection
 * 3. Update the nextDate to the next occurrence
 */
async function processRecurringTransaction(
  recurringId: string,
  recurring: RecurringTransaction
): Promise<void> {
  // Idempotency guard: check if we already created an entry for this
  // recurringId + date combination to prevent duplicates on retries or
  // concurrent function executions.
  const existingSnapshot = await db
    .collection("entries")
    .where("recurringId", "==", recurringId)
    .where("date", "==", recurring.nextDate)
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    logger.info(`Skipping duplicate recurring transaction: ${recurring.name}`, {
      recurringId,
      nextDate: recurring.nextDate.toDate().toISOString(),
    });
    return;
  }

  const batch = db.batch();

  // 1. Create the entry
  const entryRef = db.collection("entries").doc();
  const entryData = {
    userId: recurring.userId,
    type: recurring.type,
    amount: recurring.amount,
    currency: "EUR", // Default currency - could be extended to store in recurring
    description: recurring.name,
    category: recurring.category,
    date: recurring.nextDate,
    recurring: true,
    recurringId: recurringId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  batch.set(entryRef, entryData);

  // 2. Calculate and update the next date
  const currentNextDate = recurring.nextDate.toDate();
  const newNextDate = calculateNextDate(currentNextDate, recurring.frequency);

  const recurringRef = db.collection("recurringTransactions").doc(recurringId);
  batch.update(recurringRef, {
    nextDate: admin.firestore.Timestamp.fromDate(newNextDate),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  logger.info(`Processed recurring transaction: ${recurring.name}`, {
    recurringId,
    userId: recurring.userId,
    amount: recurring.amount,
    type: recurring.type,
    newNextDate: newNextDate.toISOString(),
  });
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
      url: notification.url ?? "/dashboard/",
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
  const userSnap = await db.collection("users").doc(userId).get();
  const tokens: string[] = userSnap.data()?.fcmTokens ?? [];
  if (tokens.length === 0) return;

  const staleTokens: string[] = [];

  await Promise.all(
    tokens.map(async (token) => {
      try {
        const absUrl = `https://fin-track-adc2c.firebaseapp.com${notification.url ?? "/dashboard/"}`;
        await admin.messaging().send({
          token,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: {
            url: absUrl,
          },
          webpush: {
            notification: {
              icon: "https://fin-track-adc2c.firebaseapp.com/icons/favicon_dark/web-app-manifest-192x192.png",
              badge: "https://fin-track-adc2c.firebaseapp.com/icons/favicon_dark/favicon-96x96.png",
              tag: notification.tag ?? "pocket",
              renotify: true,
            },
            fcmOptions: {
              link: absUrl,
            },
          },
          android: {
            priority: "high",
            notification: {
              icon: "https://fin-track-adc2c.firebaseapp.com/icons/favicon_dark/web-app-manifest-192x192.png",
              tag: notification.tag ?? "pocket",
              clickAction: absUrl,
            },
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: notification.title,
                  body: notification.body,
                },
                sound: "default",
                badge: 1,
              },
            },
            fcmOptions: {
              imageUrl: "https://fin-track-adc2c.firebaseapp.com/icons/favicon_dark/web-app-manifest-192x192.png",
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

  // Persist to in-app inbox regardless of push delivery
  await saveNotification(userId, notification);
}

// ─── TODO: REMOVE — Test push notification ────────────────────────────────────
export const sendTestPush = onCall(
  { region: "europe-west4" },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError("unauthenticated", "Not authenticated");
    await sendPushToUser(userId, {
      title: "🧪 Test notification",
      body: "Push notifications are working correctly!",
      url: "/dashboard/",
      tag: "test-push",
      type: "test",
    });
    return { ok: true };
  }
);

// ─── Budget Alert Trigger ─────────────────────────────────────────────────────

/**
 * Fires whenever a new expense entry is created.
 * Checks if any of the user's active budgets has crossed the 80% or 100% threshold
 * for the current month and sends a push notification if so.
 */
export const checkBudgetOnEntry = onDocumentCreated(
  { document: "entries/{entryId}", region: "europe-west4" },
  async (event) => {
    const data = event.data?.data();
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
      const budget = budgetDoc.data();

      const budgetStart: admin.firestore.Timestamp = budget.startDate;
      const budgetEnd: admin.firestore.Timestamp = budget.endDate;

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
      const threshold = budget.alertThreshold ?? 80;

      console.log(`Budget alert: ${budget.name} - ${pct}% - threshold: ${threshold}% - spent: ${spent} - budget: ${budget.amount}`);

      if (pct < threshold) continue;

      const isOver = pct >= 100;
      const title = isOver
        ? `🚨 Budget exceeded: ${budget.name}`
        : `⚠️ Budget alert: ${budget.name}`;
      const body = isOver
        ? `You've spent ${pct}% of your ${budget.name} budget.`
        : `You've used ${pct}% of your ${budget.name} budget.`;

      await sendPushToUser(userId, { title, body, url: "/dashboard/", tag: `budget-${budgetDoc.id}`, type: "budget" });
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
