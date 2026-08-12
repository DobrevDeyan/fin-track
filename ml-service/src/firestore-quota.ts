/**
 * Firestore Quota Management
 *
 * Server-side scan quota tracking using Firebase Admin SDK.
 * The scanUsage/{userId} document is write-protected from clients —
 * only this module (running as admin) can increment or reset counts.
 */

import * as admin from 'firebase-admin';

// Reuse the Admin app initialised in auth.ts
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export type PlanTier = 'free' | 'pro' | 'business';

// Receipt OCR runs on the Gemini vision backend (~$0.0005/scan, OCR_BACKEND),
// ~200x cheaper than Document AI's $0.10. A small free allowance is now a cheap
// acquisition hook (forms the habit, drives activation) rather than a cash loss;
// paid tiers monetize volume + the AI coach. This module is AUTHORITATIVE — the
// frontend copy in subscription.constants.ts mirrors it (no shared package across
// the two deploys, so values are kept in sync by hand).
export const SCAN_LIMITS: Record<PlanTier, number> = {
  free: 5,    // ~$0.0025/user/month at Gemini rates — negligible; drives activation
  pro: 10,
  business: 50,
};

// Per-user DAILY cap on AI insight calls (digest + chat combined). The IP-based
// limiter in api-server.ts is too coarse (shared NAT punishes innocents, and one
// Pro user can still run up cost); this bounds spend per account. Free tier is
// already blocked upstream by the tier check. (I9-5)
export const INSIGHTS_DAILY_LIMITS: Record<PlanTier, number> = {
  free: 0,
  pro: 50,
  business: 200,
};

/**
 * Resolves the user's current subscription tier by querying
 * the customers/{uid}/subscriptions sub-collection (written by the
 * "Run Payments with Stripe" Firebase Extension).
 */
export async function checkSubscriptionTier(uid: string): Promise<PlanTier> {
  try {
    const snapshot = await db
      .collection('customers')
      .doc(uid)
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing'])
      .limit(1)
      .get();

    if (snapshot.empty) return 'free';

    const role: string | undefined = snapshot.docs[0].data().role;
    if (!role) return 'free';

    const normalized = role.toLowerCase();
    if (normalized === 'business' || normalized === 'enterprise') return 'business';
    if (normalized === 'pro' || normalized === 'premium') return 'pro';
    return 'free';
  } catch (err: any) {
    console.error('[quota] checkSubscriptionTier error:', err.message);
    return 'free'; // fail safe: treat as free
  }
}

interface QuotaResult {
  allowed: boolean;
  count: number;
  limit: number;
}

/**
 * Atomically checks and increments the user's scan counter.
 * Uses a Firestore transaction to prevent race conditions.
 *
 * Returns { allowed: false } if the user is at or over their limit.
 * Returns { allowed: true, count, limit } on success (count is the new value).
 */
export async function checkAndIncrementScanQuota(
  uid: string,
  tier: PlanTier
): Promise<QuotaResult> {
  const limit = SCAN_LIMITS[tier];
  const docRef = db.collection('scanUsage').doc(uid);
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  // Zero limit = fully blocked. This is the free tier's normal path: scanning is
  // a paid feature, and api-server.ts turns this into the upgrade prompt.
  if (limit === 0) {
    return { allowed: false, count: 0, limit: 0 };
  }

  try {
    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);

      let count = 0;

      if (doc.exists) {
        const data = doc.data()!;
        // If we're in a new month, treat the count as 0 (handles missed resets)
        count = data.month === currentMonth ? (data.count ?? 0) : 0;
      }

      if (count >= limit) {
        return { allowed: false, count, limit };
      }

      const newCount = count + 1;
      tx.set(
        docRef,
        {
          count: newCount,
          month: currentMonth,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { allowed: true, count: newCount, limit };
    });

    return result;
  } catch (err: any) {
    console.error('[quota] checkAndIncrementScanQuota error:', err.message);
    // On transaction failure, block the scan — safer than allowing unlimited usage
    return { allowed: false, count: 0, limit };
  }
}

/**
 * Atomically checks and increments the user's DAILY AI-insights counter.
 * Returns { allowed: false } when at/over the per-tier daily limit. Mirrors the
 * scan-quota transaction but keyed by day ("YYYY-MM-DD") since AI calls are bursty.
 * (I9-5)
 */
export async function checkAndIncrementInsightsQuota(
  uid: string,
  tier: PlanTier
): Promise<QuotaResult> {
  const limit = INSIGHTS_DAILY_LIMITS[tier];
  const docRef = db.collection('insightsUsage').doc(uid);
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  if (limit <= 0) {
    return { allowed: false, count: 0, limit: 0 };
  }

  try {
    return await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);

      let count = 0;
      if (doc.exists) {
        const data = doc.data()!;
        count = data.day === today ? (data.count ?? 0) : 0;
      }

      if (count >= limit) {
        return { allowed: false, count, limit };
      }

      const newCount = count + 1;
      tx.set(
        docRef,
        {
          count: newCount,
          day: today,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { allowed: true, count: newCount, limit };
    });
  } catch (err: any) {
    console.error('[quota] checkAndIncrementInsightsQuota error:', err.message);
    // On transaction failure, block — safer than allowing unmetered AI usage.
    return { allowed: false, count: 0, limit };
  }
}

/**
 * Refund one scan to the user's monthly counter — used when a scan was counted
 * (checkAndIncrementScanQuota succeeded) but the Document AI call then failed,
 * so the user isn't charged a scan for a failure (review RC1).
 */
export async function refundScanQuota(uid: string): Promise<void> {
  const docRef = db.collection('scanUsage').doc(uid);
  const currentMonth = new Date().toISOString().slice(0, 7);
  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      if (!doc.exists) return;
      const data = doc.data()!;
      // Only refund within the same month the scan was counted.
      if (data.month !== currentMonth) return;
      const count = data.count ?? 0;
      if (count <= 0) return;
      tx.update(docRef, {
        count: count - 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  } catch (err: any) {
    console.error('[quota] refundScanQuota error:', err.message);
    // Non-fatal — a failed refund just leaves the (already-counted) failed scan.
  }
}
