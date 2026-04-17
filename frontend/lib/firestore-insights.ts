/**
 * Firestore helpers for AI Insights caching
 *
 * Caches AI-generated monthly digests in Firestore so they only
 * need to be generated once per month per user.
 *
 * Collection: aiInsights/{userId}
 * Fields:
 *   userId: string
 *   digests: { "2026-03": "...", "2026-02": "..." }
 *   updatedAt: Timestamp
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { logger } from "./utils/logger"

export async function getAIDigest(
  userId: string,
  monthKey: string
): Promise<string | null> {
  try {
    const ref = doc(db, "aiInsights", userId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    const data = snap.data()
    return data?.digests?.[monthKey] ?? null
  } catch {
    return null
  }
}

export async function saveAIDigest(
  userId: string,
  monthKey: string,
  digest: string
): Promise<void> {
  try {
    const ref = doc(db, "aiInsights", userId)
    await setDoc(
      ref,
      {
        userId,
        digests: { [monthKey]: digest },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  } catch (err) {
    logger.error("[firestore-insights] Failed to save AI digest", err)
  }
}
