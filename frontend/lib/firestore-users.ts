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
} from "firebase/firestore"
import { db } from "./firebase"
import { UserDocument } from "./firestore-types"
import { type SupportedCurrency } from "./constants/currency.constants"
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
    console.error("Error fetching user document:", error)
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
    console.error("Error updating user currency:", error)
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
    console.error("Error updating user language:", error)
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

    await updateDoc(userRef, {
      displayName: data.displayName,
      currency: data.currency,
      monthlyBudget: data.monthlyBudget,
      onboardingCompleted: true,
      updatedAt: serverTimestamp(),
    })

    // Auto-create Recurring Salary Transaction if they set a budget and a date
    if (data.monthlyBudget > 0 && data.salaryDate) {
      const now = new Date()
      const currentMonthTemp = new Date(now.getFullYear(), now.getMonth(), data.salaryDate)
      
      let nextDate = currentMonthTemp
      let shouldCreateImmediateEntry = false
      
      // If the date has already passed this month, schedule for next month
      if (currentMonthTemp <= now) {
        shouldCreateImmediateEntry = true
        // Handle Dec -> Jan rollover automatically via Date
        nextDate = new Date(now.getFullYear(), now.getMonth() + 1, data.salaryDate)
      }

      const { Timestamp } = await import("firebase/firestore")

      const recurringRef = doc(collection(db, "recurringTransactions"))
      await setDoc(recurringRef, {
        userId,
        name: "Monthly Salary",
        amount: data.monthlyBudget,
        type: "income",
        category: "Salary",
        frequency: "monthly",
        nextDate: Timestamp.fromDate(nextDate),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      
      if (shouldCreateImmediateEntry) {
         await createEntry(userId, {
           type: "income",
           amount: data.monthlyBudget,
           currency: data.currency,
           category: "Salary",
           description: "Monthly Salary generated from onboarding",
           date: currentMonthTemp,
           recurringId: recurringRef.id,
           recurring: true,
         })
      }
    }
  } catch (error) {
    console.error("Error completing onboarding:", error)
    throw error
  }
}

/**
 * Delete all Firestore data for a user, then delete their Firebase Auth account.
 *
 * Collections deleted:
 *   entries, budgets, goals, savingsAccounts, recurringTransactions
 *   (queried by userId field, chunked into 500-doc batches)
 *
 * Single documents deleted:
 *   financialSummaries/{userId}, aiInsights/{userId}, users/{userId}
 */
export async function deleteUserData(userId: string): Promise<void> {
  const BATCH_SIZE = 490 // safely under the 500-write Firestore batch limit

  const userOwnedCollections = [
    "entries",
    "budgets",
    "goals",
    "savingsAccounts",
    "recurringTransactions",
  ]

  // Delete all documents in each collection that belong to this user
  for (const collectionName of userOwnedCollections) {
    const colRef = collection(db, collectionName)
    const q = query(colRef, where("userId", "==", userId))
    const snapshot = await getDocs(q)

    // Process in chunks to stay within batch size
    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
      const chunk = snapshot.docs.slice(i, i + BATCH_SIZE)
      const batch = writeBatch(db)
      chunk.forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  }

  // Delete single-document records keyed by userId
  await Promise.all([
    deleteDoc(doc(db, "financialSummaries", userId)),
    deleteDoc(doc(db, "aiInsights", userId)),
    deleteDoc(doc(db, "scanUsage", userId)),
    deleteDoc(doc(db, "users", userId)),
  ])

  // Finally delete the Firebase Auth account.
  // Dynamic imports avoid importing browser-only firebase/auth at module level,
  // which would break server-side evaluation of this shared utility file.
  const { auth } = await import("./firebase")
  const { deleteUser } = await import("firebase/auth")
  const currentUser = auth.currentUser
  if (currentUser) {
    await deleteUser(currentUser)
  }
}

