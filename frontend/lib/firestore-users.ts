/**
 * Firestore Users Service
 * 
 * Functions for user preferences management
 */

import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore"
import { db } from "./firebase"
import { UserDocument } from "./firestore-types"
import { logger } from "./utils/logger"
import { type SupportedCurrency, BASE_CURRENCY } from "./constants/currency.constants"
import { fetchExchangeRates, convertAmount } from "./exchange-rate"
import { createEntry } from "./firestore-entries"

/**
 * Get user document from Firestore
 */
export async function getUserDocument(userId: string): Promise<(UserDocument & { id: string }) | null> {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)
    
    if (!userSnap.exists()) {
      return null
    }
    
    return {
      id: userSnap.id,
      ...userSnap.data(),
    } as UserDocument & { id: string }
  } catch (error) {
    logger.error("Error fetching user document", error)
    throw error
  }
}

/**
 * Update user display name in Firestore and Firebase Auth
 */
export async function updateUserDisplayName(userId: string, displayName: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, { displayName, updatedAt: serverTimestamp() })

    const { auth } = await import("./firebase")
    const { updateProfile } = await import("firebase/auth")
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName })
    }

    // Keep the household members array in sync (fire-and-forget — non-fatal)
    try {
      const { callUpdateHouseholdMemberName } = await import("./firestore-household")
      await callUpdateHouseholdMemberName(displayName)
    } catch (err) {
      logger.warn("Could not sync display name to household", { err })
    }
  } catch (error) {
    logger.error("Error updating display name", error)
    throw error
  }
}

/**
 * Update user currency preference
 */
export async function updateUserCurrency(userId: string, currency: SupportedCurrency): Promise<void> {
  try {
    const userRef = doc(db, "users", userId)

    await updateDoc(userRef, {
      currency,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    logger.error("Error updating user currency", error)
    throw error
  }
}

/**
 * Update user language preference
 */
export async function updateUserLanguage(userId: string, language: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId)

    await updateDoc(userRef, {
      language,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    logger.error("Error updating user language", error)
    throw error
  }
}

/**
 * Complete user onboarding (set display name, currency, monthly budget)
 */
export async function completeOnboarding(
  userId: string,
  data: { displayName: string; currency: string; monthlyBudget: number; salaryDate?: number }
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId)

    // Stored amounts are canonical base currency (EUR). The wizard collects the
    // budget/salary in the user's display currency, so convert before persisting
    // (identity for EUR users; corrects USD users).
    let baseMonthlyBudget = data.monthlyBudget
    try {
      const rates = await fetchExchangeRates()
      baseMonthlyBudget = convertAmount(
        data.monthlyBudget,
        data.currency as SupportedCurrency,
        BASE_CURRENCY,
        rates
      )
    } catch (rateErr) {
      logger.warn("Onboarding: exchange-rate fetch failed; storing budget unconverted", { rateErr })
    }

    await updateDoc(userRef, {
      displayName: data.displayName,
      currency: data.currency,
      monthlyBudget: baseMonthlyBudget,
      onboardingCompleted: true,
      updatedAt: serverTimestamp(),
    })

    // Keep Firebase Auth profile in sync so all UI sources agree
    const { auth } = await import("./firebase")
    const { updateProfile } = await import("firebase/auth")
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: data.displayName })
    }

    // Auto-create Recurring Salary Transaction if they set a budget and a date
    if (data.monthlyBudget > 0 && data.salaryDate) {
      const now = new Date()
      // Clamp the salary day to the target month's length so e.g. day 31 in a
      // 30-day month doesn't roll into the 1st of the following month.
      const clampedDay = (year: number, month: number) =>
        Math.min(data.salaryDate!, new Date(year, month + 1, 0).getDate())
      const thisMonthDate = new Date(
        now.getFullYear(), now.getMonth(), clampedDay(now.getFullYear(), now.getMonth())
      )

      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const salaryIsToday = thisMonthDate.getTime() === today.getTime()

      // If salary day is in the future this month, schedule for then.
      // If it's today, create an immediate entry and schedule next month.
      // If it already passed (but not today), just schedule next month — don't backdate.
      const nextDate = thisMonthDate > now
        ? thisMonthDate
        : new Date(
            now.getFullYear(), now.getMonth() + 1,
            clampedDay(now.getFullYear(), now.getMonth() + 1)
          )

      const { Timestamp } = await import("firebase/firestore")

      // Delete any existing "Monthly Salary" recurring transactions for this user
      // so re-running the wizard never creates duplicates.
      // Query by userId only (single-field index, always available), filter name in JS.
      const existingSnap = await getDocs(
        query(collection(db, "recurringTransactions"), where("userId", "==", userId))
      )
      await Promise.all(
        existingSnap.docs
          .filter((d) => d.data().name === "Monthly Salary")
          .map((d) => deleteDoc(d.ref))
      )

      const recurringRef = doc(collection(db, "recurringTransactions"))
      await setDoc(recurringRef, {
        userId,
        name: "Monthly Salary",
        amount: baseMonthlyBudget,
        type: "income",
        category: "Salary",
        frequency: "monthly",
        nextDate: Timestamp.fromDate(nextDate),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      if (salaryIsToday) {
        await createEntry(userId, {
          type: "income",
          amount: baseMonthlyBudget,
          currency: BASE_CURRENCY,
          category: "Salary",
          description: "Monthly Salary",
          date: today,
          recurringId: recurringRef.id,
          recurring: true,
        })
      }
    }
  } catch (error) {
    logger.error("Error completing onboarding", error, { critical: true })
    throw error
  }
}

/**
 * Reset all financial data for a user without deleting their account.
 *
 * Collections cleared:
 *   entries, budgets, goals, savingsAccounts, recurringTransactions, assets, categories
 *   (queried by userId field, chunked into 500-doc batches)
 *
 * Single documents cleared:
 *   financialSummaries/{userId}, aiInsights/{userId}
 *
 * Preserved:
 *   users/{userId} (profile, currency, language, subscription flags)
 *   scanUsage/{userId} (tied to subscription plan)
 *   customers/ (Stripe billing data)
 */
export async function resetFinancialData(userId: string): Promise<void> {
  const BATCH_SIZE = 490

  // Delete Storage receipts before removing the Firestore entries that reference them
  try {
    const { deleteReceipt } = await import("./receipt-utils")
    const entriesRef = collection(db, "entries")
    const receiptSnap = await getDocs(
      query(entriesRef, where("userId", "==", userId), where("receiptUrl", "!=", null))
    )
    const receiptUrls = receiptSnap.docs
      .map((d) => d.data().receiptUrl as string | undefined)
      .filter((url): url is string => !!url)
    await Promise.allSettled(receiptUrls.map((url) => deleteReceipt(url)))
  } catch (err) {
    logger.error("Error deleting Storage receipts during financial reset", err)
    // Non-fatal — continue reset
  }

  // Delete the summary doc BEFORE the entries: the maintainFinancialSummary
  // trigger fast-skips entry deletes when the summary is already gone, so the
  // batch delete below doesn't fan out into N full recomputes (each of which
  // would re-read the whole entries collection).
  await Promise.all([
    deleteDoc(doc(db, "financialSummaries", userId)),
    deleteDoc(doc(db, "aiInsights", userId)),
  ])

  const userOwnedCollections = [
    "entries",
    "budgets",
    "goals",
    "savingsAccounts",
    "recurringTransactions",
    "assets",
    "categories",
  ]

  for (const collectionName of userOwnedCollections) {
    const colRef = collection(db, collectionName)
    const q = query(colRef, where("userId", "==", userId))
    const snapshot = await getDocs(q)

    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
      const chunk = snapshot.docs.slice(i, i + BATCH_SIZE)
      const batch = writeBatch(db)
      chunk.forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  }
}

/**
 * Delete all Firestore data for a user, then delete their Firebase Auth account.
 *
 * Collections deleted:
 *   entries, budgets, goals, savingsAccounts, recurringTransactions, assets
 *   (queried by userId field, chunked into 500-doc batches)
 *
 * Single documents deleted (client-side here):
 *   financialSummaries/{userId}, aiInsights/{userId}, userDebts/{userId}, users/{userId}
 *   (scanUsage/{userId} and leaderboardProfiles/{userId} are admin-write-only and
 *    are deleted server-side by the deleteMyAccount CF — see step 5/6)
 *
 * Side-effects:
 *   - Firebase Storage receipts under receipts/{userId}/ are deleted
 *   - User is removed from their household (owner transfer or dissolution via CF)
 */
export async function deleteUserData(userId: string): Promise<void> {
  const BATCH_SIZE = 490 // safely under the 500-write Firestore batch limit

  // 1. Fetch user doc before we delete it — needed for householdId
  const userDoc = await getUserDocument(userId)

  // 2. Leave household via CF (handles ownership transfer + dissolution)
  if (userDoc?.householdId) {
    try {
      const { callLeaveHousehold } = await import("./firestore-household")
      await callLeaveHousehold(userDoc.householdId)
    } catch (err) {
      logger.error("Error leaving household during account deletion", err)
      // Non-fatal — continue deletion
    }
  }

  // 3. Delete Firebase Storage receipts before removing Firestore entries.
  //    Query only by userId (no composite index needed) and filter receiptUrl in
  //    memory — a "receiptUrl != null" query requires a composite index that may
  //    not exist, which would silently skip receipt cleanup entirely.
  try {
    const { deleteReceipt } = await import("./receipt-utils")
    const entriesRef = collection(db, "entries")
    const receiptSnap = await getDocs(query(entriesRef, where("userId", "==", userId)))
    const receiptUrls = receiptSnap.docs
      .map((d) => d.data().receiptUrl as string | undefined)
      .filter((url): url is string => !!url)
    // allSettled — a missing file must not block the rest of the deletion
    await Promise.allSettled(receiptUrls.map((url) => deleteReceipt(url)))
  } catch (err) {
    logger.error("Error deleting Storage receipts during account deletion", err)
    // Non-fatal — continue deletion
  }

  // 4. Best-effort single-document cleanup keyed by userId, BEFORE the entries
  //    batch: with the summary doc already gone, the maintainFinancialSummary
  //    trigger fast-skips each entry delete instead of re-reading the whole
  //    collection. allSettled so one rejected delete (e.g. a stale rule) can't
  //    abort the rest; the CF backstop (step 6) removes any that fail here.
  //    NOTE: scanUsage and leaderboardProfiles are admin-write-only — only the
  //    deleteMyAccount CF can remove them.
  await Promise.allSettled([
    deleteDoc(doc(db, "financialSummaries", userId)),
    deleteDoc(doc(db, "aiInsights", userId)),
    deleteDoc(doc(db, "userDebts", userId)),
    deleteDoc(doc(db, "users", userId)),
  ])

  // 5. Best-effort client-side cleanup of user-owned collections.
  //    The deleteMyAccount CF (step 6) is a full Admin-SDK backstop that re-deletes
  //    every collection below server-side, so a permission hiccup or stale rule
  //    here must NEVER abort before the CF runs — otherwise the Auth account is
  //    left intact and the user can't actually delete it (review: deletion abort).
  const userOwnedCollections = [
    "entries",
    "budgets",
    "goals",
    "savingsAccounts",
    "recurringTransactions",
    "assets",
    "categories",
  ]

  for (const collectionName of userOwnedCollections) {
    try {
      const colRef = collection(db, collectionName)
      const q = query(colRef, where("userId", "==", userId))
      const snapshot = await getDocs(q)

      for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
        const chunk = snapshot.docs.slice(i, i + BATCH_SIZE)
        const batch = writeBatch(db)
        chunk.forEach((d) => batch.delete(d.ref))
        await batch.commit()
      }
    } catch (err) {
      logger.error(`Client cleanup of ${collectionName} failed during account deletion (CF will backstop)`, err)
    }
  }

  // 6. AUTHORITATIVE deletion. The server-side CF (Admin SDK, bypasses rules)
  //    deletes every user collection plus admin-only data (auditLog, customers/
  //    Stripe, rateLimits, householdInvites, scanUsage, leaderboardProfiles,
  //    notifications) and finally admin.auth().deleteUser(). This is the step
  //    that MUST succeed — its failure is a real, surfaced error.
  const { getFunctions, httpsCallable } = await import("firebase/functions")
  const { app } = await import("./firebase")
  const fns = getFunctions(app, "europe-west4")
  await httpsCallable(fns, "deleteMyAccount")()
}

/**
 * Save an FCM token to the user's document (appends to array, deduped by arrayUnion).
 * Called after notification permission is granted.
 */
export async function saveFcmToken(userId: string, token: string): Promise<void> {
  const userRef = doc(db, "users", userId)
  await updateDoc(userRef, {
    fcmTokens: arrayUnion(token),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Remove a stale FCM token (e.g., on logout or when FCM invalidates it).
 */
export async function removeFcmToken(userId: string, token: string): Promise<void> {
  const userRef = doc(db, "users", userId)
  await updateDoc(userRef, {
    fcmTokens: arrayRemove(token),
    updatedAt: serverTimestamp(),
  })
}

