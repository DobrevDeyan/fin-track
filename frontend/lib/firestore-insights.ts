/**
 * Firestore helpers for AI Insights caching
 *
 * Caches AI-generated monthly digests in Firestore so they only
 * need to be generated once per month per user.
 *
 * Collection: aiInsights/{userId}
 * Fields:
 *   userId: string
 *   digests: { "2026-03": { text, fingerprint, updatedAt }, ... }
 *           (legacy entries may be a bare string with no fingerprint)
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

interface DigestEntry {
  text: string
  fingerprint?: string | null
  updatedAt?: number
}

/**
 * Read a cached digest for the month. When `expectedFingerprint` is supplied, the
 * cached entry is only returned if its fingerprint still matches the current data —
 * otherwise it's stale and `null` is returned so the caller regenerates. Legacy
 * entries stored as a bare string have no fingerprint and are always returned. (I9-3)
 */
export async function getAIDigest(
  userId: string,
  monthKey: string,
  expectedFingerprint?: string
): Promise<string | null> {
  try {
    const ref = doc(db, "aiInsights", userId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    const entry = snap.data()?.digests?.[monthKey]
    if (!entry) return null

    // Legacy shape: a bare string with no fingerprint to validate against.
    if (typeof entry === "string") return entry

    const { text, fingerprint } = entry as DigestEntry
    if (typeof text !== "string") return null

    if (expectedFingerprint && fingerprint && fingerprint !== expectedFingerprint) {
      return null // stale — underlying data changed since generation
    }
    return text
  } catch {
    return null
  }
}

export async function saveAIDigest(
  userId: string,
  monthKey: string,
  digest: string,
  fingerprint?: string
): Promise<void> {
  try {
    const ref = doc(db, "aiInsights", userId)
    const entry: DigestEntry = {
      text: digest,
      fingerprint: fingerprint ?? null,
      updatedAt: Date.now(),
    }
    await setDoc(
      ref,
      {
        userId,
        digests: { [monthKey]: entry },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  } catch (err) {
    logger.error("[firestore-insights] Failed to save AI digest", err)
  }
}
