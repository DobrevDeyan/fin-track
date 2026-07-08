/**
 * Client-side Firestore helpers for the Financial Health Leaderboard.
 *
 * leaderboardStats/current  — any authenticated user can read
 * leaderboardProfiles/{uid} — owner-read only
 */

import { doc, getDoc, getDocFromServer } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { LeaderboardStats, LeaderboardProfile } from "@/lib/firestore-types"

export async function getLeaderboardStats(bypassCache = false): Promise<LeaderboardStats | null> {
  const snap = bypassCache
    ? await getDocFromServer(doc(db, "leaderboardStats", "current"))
    : await getDoc(doc(db, "leaderboardStats", "current"))
  return snap.exists() ? (snap.data() as LeaderboardStats) : null
}

export async function getMyLeaderboardProfile(userId: string): Promise<LeaderboardProfile | null> {
  const snap = await getDocFromServer(doc(db, "leaderboardProfiles", userId))
  return snap.exists() ? (snap.data() as LeaderboardProfile) : null
}
