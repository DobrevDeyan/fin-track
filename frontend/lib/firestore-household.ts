/**
 * Client-side Firestore reads for household data.
 * Writes always go through Cloud Functions (Admin SDK) to maintain security.
 */

import { doc, onSnapshot } from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { db, functions } from "@/lib/firebase"
import type { HouseholdDocument } from "@/lib/firestore-types"

// ─── Callable wrappers ────────────────────────────────────────────────────────

export const callCreateHousehold = (name: string) =>
  httpsCallable<{ name: string }, { householdId: string; name: string }>(
    functions,
    "createHousehold"
  )({ name })

export const callSendHouseholdInvite = (householdId: string, invitedEmail: string) =>
  httpsCallable<
    { householdId: string; invitedEmail: string },
    { inviteId: string; token: string }
  >(functions, "sendHouseholdInvite")({ householdId, invitedEmail })

export const callAcceptHouseholdInvite = (token: string) =>
  httpsCallable<{ token: string }, { householdId: string; householdName: string }>(
    functions,
    "acceptHouseholdInvite"
  )({ token })

export const callGetHouseholdEntries = (
  householdId: string,
  opts?: { startDate?: string; endDate?: string; limit?: number }
) =>
  httpsCallable<
    { householdId: string; startDate?: string; endDate?: string; limit?: number },
    {
      entries: HouseholdEntry[]
      members: { uid: string; displayName: string; email: string }[]
    }
  >(functions, "getHouseholdEntries")({ householdId, ...opts })

export const callLeaveHousehold = (householdId: string) =>
  httpsCallable<{ householdId: string }, { ok: boolean }>(
    functions,
    "leaveHousehold"
  )({ householdId })

// ─── Real-time household listener ────────────────────────────────────────────

/**
 * Subscribe to the household document.
 * Returns the unsubscribe function.
 */
export function subscribeToHousehold(
  householdId: string,
  onData: (household: HouseholdDocument | null) => void,
  onError?: (err: Error) => void
): () => void {
  const ref = doc(db, "households", householdId)
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null)
        return
      }
      onData(snap.data() as HouseholdDocument)
    },
    (err) => onError?.(err)
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** Entry as returned by getHouseholdEntries Cloud Function (dates are ISO strings) */
export interface HouseholdEntry {
  id: string
  userId: string
  memberDisplayName: string
  type: "income" | "expense"
  amount: number
  currency: string
  description: string
  category: string
  date: string        // ISO string
  createdAt?: string
  updatedAt?: string
  tags?: string[]
  notes?: string
  receiptUrl?: string
  recurring?: boolean
}
