/**
 * Client-side Firestore helpers for the Financial Health Leaderboard.
 *
 * leaderboardStats/current  — any authenticated user can read
 * leaderboardProfiles/{uid} — owner-read only
 */

import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { LeaderboardStats, LeaderboardProfile } from "@/lib/firestore-types"

export async function getLeaderboardStats(): Promise<LeaderboardStats | null> {
  const snap = await getDoc(doc(db, "leaderboardStats", "current"))
  return snap.exists() ? (snap.data() as LeaderboardStats) : null
}

export async function getMyLeaderboardProfile(userId: string): Promise<LeaderboardProfile | null> {
  const snap = await getDoc(doc(db, "leaderboardProfiles", userId))
  return snap.exists() ? (snap.data() as LeaderboardProfile) : null
}

/** Update opt-in preference directly on the user document. */
export async function setLeaderboardOptIn(userId: string, optIn: boolean): Promise<void> {
  await updateDoc(doc(db, "users", userId), { leaderboardOptIn: optIn })
}
