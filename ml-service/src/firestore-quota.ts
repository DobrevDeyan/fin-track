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

export const SCAN_LIMITS: Record<PlanTier, number> = {
  free: 0,
  pro: 30,
  business: 150,
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

  // Free tier always blocked — no transaction needed
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
