/**
 * Firestore Recurring Transactions Service
 * 
 * Functions for CRUD operations on recurringTransactions collection
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  serverTimestamp,
  getDoc,
  FieldValue,
} from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { db, functions } from "./firebase"
import { RecurringEntryDocument } from "./firestore-types"
import { logger } from "./utils/logger"

// Type for update data
interface RecurringUpdateData {
  [key: string]: FieldValue | string | number | boolean | Timestamp | undefined
  updatedAt: FieldValue
  name?: string
  amount?: number
  type?: "income" | "expense"
  category?: string
  frequency?: "weekly" | "monthly" | "yearly"
  isActive?: boolean
  nextDate?: Timestamp
}

// Helper to check if error is a Firestore index error
function isFirestoreIndexError(error: unknown): boolean {
  if (error instanceof Error) {
    const firestoreError = error as Error & { code?: string }
    return (
      firestoreError.code === "failed-precondition" ||
      firestoreError.message?.includes("index") ||
      false
    )
  }
  return false
}

// Helper to convert date to timestamp
function toTimestamp(date: Timestamp | Date | string): Timestamp {
  if (date instanceof Timestamp) {
    return date
  }
  if (date && typeof date === "object" && "toMillis" in date) {
    return date as unknown as Timestamp
  }
  if (date instanceof Date) {
    return Timestamp.fromDate(date)
  }
  return Timestamp.fromDate(new Date(date as string))
}

export type CreateRecurringInput = Omit<
  RecurringEntryDocument,
  "userId" | "createdAt" | "updatedAt"
> & {
  userId: string
  nextDate: string | Date | Timestamp
}

/**
 * Create a new recurring transaction in Firestore
 */
export async function createRecurringTransaction(
  userId: string,
  recurringData: Omit<CreateRecurringInput, "userId"> & {
    nextDate: string | Date | Timestamp
  }
): Promise<string> {
  try {
    const recurringRef = collection(db, "recurringTransactions")
    
    // Convert nextDate to Timestamp
    let nextDateTimestamp: Timestamp
    
    const toTimestamp = (date: string | Date | Timestamp): Timestamp => {
      if (date && typeof date === "object" && "toMillis" in date) {
        return date as unknown as Timestamp
      }
      if (date instanceof Date) {
        return Timestamp.fromDate(date)
      }
      return Timestamp.fromDate(new Date(date as string))
    }
    
    nextDateTimestamp = toTimestamp(recurringData.nextDate)
    
    const newRecurring: Omit<RecurringEntryDocument, "userId"> = {
      name: recurringData.name.trim(),
      amount: recurringData.amount,
      type: recurringData.type,
      category: recurringData.category,
      frequency: recurringData.frequency,
      nextDate: nextDateTimestamp,
      isActive: recurringData.isActive ?? true,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    }
    
    const docRef = await addDoc(recurringRef, {
      userId,
      ...newRecurring,
    })
    
    return docRef.id
  } catch (error) {
    logger.error("Error creating recurring transaction", error)
    throw error
  }
}

/**
 * Get all recurring transactions for a user
 */
export async function getUserRecurringTransactions(
  userId: string
): Promise<(RecurringEntryDocument & { id: string })[]> {
  try {
    const recurringRef = collection(db, "recurringTransactions")
    const q = query(
      recurringRef,
      where("userId", "==", userId)
    )

    const querySnapshot = await getDocs(q)
    const transactions = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as (RecurringEntryDocument & { id: string })[]

    // Always sort by nextDate ascending in memory to avoid needing a composite index
    return transactions.sort((a, b) => {
      const aTime = a.nextDate?.toMillis?.() || 0
      const bTime = b.nextDate?.toMillis?.() || 0
      return aTime - bTime
    })
  } catch (error: unknown) {
    logger.error("Error fetching recurring transactions", error)
    throw error
  }
}

/**
 * Get active recurring transactions for a user
 */
export async function getActiveRecurringTransactions(
  userId: string
): Promise<(RecurringEntryDocument & { id: string })[]> {
  try {
    const recurringRef = collection(db, "recurringTransactions")
    const q = query(
      recurringRef,
      where("userId", "==", userId),
      where("isActive", "==", true),
      orderBy("nextDate", "asc")
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (RecurringEntryDocument & { id: string })[]
  } catch (error) {
    logger.error("Error fetching active recurring transactions", error)
    throw error
  }
}

/**
 * Update a recurring transaction
 */
export async function updateRecurringTransaction(
  recurringId: string,
  updateData: Partial<Omit<RecurringEntryDocument, "userId" | "createdAt">> & {
    nextDate?: string | Date | Timestamp
  }
): Promise<void> {
  try {
    const recurringRef = doc(db, "recurringTransactions", recurringId)

    const cleanUpdateData: RecurringUpdateData = {
      updatedAt: serverTimestamp(),
    }

    if (updateData.name !== undefined) {
      cleanUpdateData.name = updateData.name.trim()
    }
    if (updateData.amount !== undefined) {
      cleanUpdateData.amount = updateData.amount
    }
    if (updateData.type !== undefined) {
      cleanUpdateData.type = updateData.type
    }
    if (updateData.category !== undefined) {
      cleanUpdateData.category = updateData.category
    }
    if (updateData.frequency !== undefined) {
      cleanUpdateData.frequency = updateData.frequency
    }
    if (updateData.isActive !== undefined) {
      cleanUpdateData.isActive = updateData.isActive
    }
    if (updateData.nextDate !== undefined) {
      cleanUpdateData.nextDate = toTimestamp(updateData.nextDate)
    }

    await updateDoc(recurringRef, cleanUpdateData as Record<string, unknown>)
  } catch (error) {
    logger.error("Error updating recurring transaction", error)
    throw error
  }
}

/**
 * Delete a recurring transaction
 */
export async function deleteRecurringTransaction(
  recurringId: string
): Promise<void> {
  try {
    const recurringRef = doc(db, "recurringTransactions", recurringId)
    await deleteDoc(recurringRef)
  } catch (error) {
    logger.error("Error deleting recurring transaction", error)
    throw error
  }
}

/**
 * Get a single recurring transaction by ID
 */
export async function getRecurringTransaction(
  recurringId: string
): Promise<(RecurringEntryDocument & { id: string }) | null> {
  try {
    const recurringRef = doc(db, "recurringTransactions", recurringId)
    const docSnapshot = await getDoc(recurringRef)
    
    if (!docSnapshot.exists()) {
      return null
    }
    
    return {
      id: docSnapshot.id,
      ...docSnapshot.data(),
    } as RecurringEntryDocument & { id: string }
  } catch (error) {
    logger.error("Error fetching recurring transaction", error)
    throw error
  }
}

/**
 * Calculate next occurrence date based on frequency
 */
export function calculateNextDate(
  currentDate: Date,
  frequency: "weekly" | "monthly" | "yearly"
): Date {
  const nextDate = new Date(currentDate)

  switch (frequency) {
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case "monthly": {
      const day = nextDate.getDate()
      nextDate.setDate(1) // prevent month-end overflow (e.g. Jan 31 → Mar 2)
      nextDate.setMonth(nextDate.getMonth() + 1)
      const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
      nextDate.setDate(Math.min(day, maxDay))
      break
    }
    case "yearly": {
      const month = nextDate.getMonth()
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      // Feb 29 on a non-leap year rolls to Mar 1 — clamp back to Feb 28
      if (nextDate.getMonth() !== month) {
        nextDate.setDate(0)
      }
      break
    }
  }

  return nextDate
}

/**
 * Response from the processMyRecurringTransactions Cloud Function
 */
export interface ProcessRecurringResult {
  success: boolean
  processed: number
  errors: number
  message: string
}

/**
 * Manually trigger processing of due recurring transactions
 * Calls the Cloud Function to process all due subscriptions for the current user
 */
export async function processMyRecurringTransactions(): Promise<ProcessRecurringResult> {
  try {
    const processFunction = httpsCallable<void, ProcessRecurringResult>(
      functions,
      "processMyRecurringTransactions"
    )
    const result = await processFunction()
    return result.data
  } catch (error) {
    logger.error("Error processing recurring transactions", error)
    throw error
  }
}

