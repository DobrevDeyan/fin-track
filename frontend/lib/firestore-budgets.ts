/**
 * Firestore Budgets Service
 *
 * Functions for CRUD operations on budgets collection
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
import { db } from "./firebase"
import { BudgetDocument, CreateBudgetInput } from "./firestore-types"
import { logger } from "./utils/logger"

// Type for creating a new budget document
interface NewBudgetDocument {
  userId: string
  name: string
  amount: number
  currency: string
  period: "weekly" | "monthly" | "yearly"
  startDate: Timestamp
  endDate: Timestamp
  isActive: boolean
  createdAt: FieldValue
  updatedAt: FieldValue
  category?: string
  alertThreshold?: number
}

// Type for update data
interface BudgetUpdateData {
  [key: string]: FieldValue | string | number | boolean | Timestamp | undefined
  updatedAt: FieldValue
  name?: string
  category?: string
  amount?: number
  currency?: string
  period?: "weekly" | "monthly" | "yearly"
  startDate?: Timestamp
  endDate?: Timestamp
  isActive?: boolean
  alertThreshold?: number
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
  if (date instanceof Date) {
    return Timestamp.fromDate(date)
  }
  // Check if it's a Timestamp-like object (has toMillis method)
  if (date && typeof date === "object" && "toMillis" in date) {
    return date as unknown as Timestamp
  }
  return Timestamp.fromDate(new Date(date as string))
}

// Helper to get milliseconds from a date value
function getDateMillis(date: Timestamp | Date | string): number {
  if (date instanceof Timestamp) {
    return date.toMillis()
  }
  if (date instanceof Date) {
    return date.getTime()
  }
  return new Date(date).getTime()
}

/**
 * Create a new budget in Firestore
 */
export async function createBudget(
  userId: string,
  budgetData: Omit<CreateBudgetInput, "userId"> & {
    startDate: string | Date | Timestamp
    endDate: string | Date | Timestamp
  }
): Promise<string> {
  try {
    const budgetRef = collection(db, "budgets")

    const newBudget: NewBudgetDocument = {
      userId,
      name: budgetData.name,
      amount: budgetData.amount,
      currency: budgetData.currency || "EUR",
      period: budgetData.period,
      startDate: toTimestamp(budgetData.startDate),
      endDate: toTimestamp(budgetData.endDate),
      isActive: budgetData.isActive !== undefined ? budgetData.isActive : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    // Only add optional fields if they are defined
    if (budgetData.category !== undefined && budgetData.category.trim() !== "") {
      newBudget.category = budgetData.category
    }
    if (budgetData.alertThreshold !== undefined) {
      newBudget.alertThreshold = budgetData.alertThreshold
    }

    const docRef = await addDoc(budgetRef, newBudget)
    return docRef.id
  } catch (error) {
    logger.error("Error creating budget", error)
    throw error
  }
}

/**
 * Get all budgets for a user
 */
export async function getUserBudgets(userId: string): Promise<(BudgetDocument & { id: string })[]> {
  try {
    const budgetsRef = collection(db, "budgets")

    // Try with orderBy first (requires index)
    let q = query(
      budgetsRef,
      where("userId", "==", userId),
      orderBy("startDate", "desc")
    )

    let querySnapshot
    try {
      querySnapshot = await getDocs(q)
    } catch (indexError: unknown) {
      if (isFirestoreIndexError(indexError)) {
        q = query(budgetsRef, where("userId", "==", userId))
        querySnapshot = await getDocs(q)
      } else {
        throw indexError
      }
    }

    const budgets: (BudgetDocument & { id: string })[] = []

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as BudgetDocument
      budgets.push({
        ...data,
        id: docSnap.id,
      })
    })

    // Sort by startDate descending
    if (budgets.length > 0) {
      budgets.sort((a, b) => {
        const dateA = getDateMillis(a.startDate)
        const dateB = getDateMillis(b.startDate)
        return dateB - dateA
      })
    }

    return budgets
  } catch (error) {
    logger.error("Error fetching budgets", error)
    throw error
  }
}

/**
 * Get active budgets for a user
 */
export async function getActiveBudgets(userId: string): Promise<(BudgetDocument & { id: string })[]> {
  try {
    const budgetsRef = collection(db, "budgets")

    let q = query(
      budgetsRef,
      where("userId", "==", userId),
      where("isActive", "==", true),
      orderBy("startDate", "desc")
    )

    let querySnapshot
    try {
      querySnapshot = await getDocs(q)
    } catch (indexError: unknown) {
      if (isFirestoreIndexError(indexError)) {
        q = query(
          budgetsRef,
          where("userId", "==", userId),
          where("isActive", "==", true)
        )
        querySnapshot = await getDocs(q)
      } else {
        throw indexError
      }
    }

    const budgets: (BudgetDocument & { id: string })[] = []

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as BudgetDocument
      budgets.push({
        ...data,
        id: docSnap.id,
      })
    })

    return budgets
  } catch (error) {
    logger.error("Error fetching active budgets", error)
    throw error
  }
}

/**
 * Get budgets by category
 */
export async function getBudgetsByCategory(
  userId: string,
  category: string
): Promise<(BudgetDocument & { id: string })[]> {
  try {
    const budgetsRef = collection(db, "budgets")

    let q = query(
      budgetsRef,
      where("userId", "==", userId),
      where("category", "==", category),
      where("isActive", "==", true),
      orderBy("startDate", "desc")
    )

    let querySnapshot
    try {
      querySnapshot = await getDocs(q)
    } catch (indexError: unknown) {
      if (isFirestoreIndexError(indexError)) {
        q = query(
          budgetsRef,
          where("userId", "==", userId),
          where("category", "==", category),
          where("isActive", "==", true)
        )
        querySnapshot = await getDocs(q)
      } else {
        throw indexError
      }
    }

    const budgets: (BudgetDocument & { id: string })[] = []

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as BudgetDocument
      budgets.push({
        ...data,
        id: docSnap.id,
      })
    })

    return budgets
  } catch (error) {
    logger.error("Error fetching budgets by category", error)
    throw error
  }
}

/**
 * Update an existing budget
 */
export async function updateBudget(
  budgetId: string,
  updates: Partial<Omit<BudgetDocument, "id" | "userId" | "createdAt">>
): Promise<void> {
  try {
    const budgetRef = doc(db, "budgets", budgetId)

    // Build update object with required updatedAt field
    const cleanUpdateData: BudgetUpdateData = {
      updatedAt: serverTimestamp(),
    }

    // Only include defined fields
    if (updates.name !== undefined) {
      cleanUpdateData.name = updates.name
    }
    if (updates.category !== undefined) {
      cleanUpdateData.category = updates.category
    }
    if (updates.amount !== undefined) {
      cleanUpdateData.amount = updates.amount
    }
    if (updates.currency !== undefined) {
      cleanUpdateData.currency = updates.currency
    }
    if (updates.period !== undefined) {
      cleanUpdateData.period = updates.period
    }
    if (updates.startDate !== undefined) {
      cleanUpdateData.startDate = toTimestamp(updates.startDate)
    }
    if (updates.endDate !== undefined) {
      cleanUpdateData.endDate = toTimestamp(updates.endDate)
    }
    if (updates.isActive !== undefined) {
      cleanUpdateData.isActive = updates.isActive
    }
    if (updates.alertThreshold !== undefined) {
      cleanUpdateData.alertThreshold = updates.alertThreshold
    }

    await updateDoc(budgetRef, cleanUpdateData as Record<string, unknown>)
  } catch (error) {
    logger.error("Error updating budget", error)
    throw error
  }
}

/**
 * Delete a budget
 */
export async function deleteBudget(budgetId: string): Promise<void> {
  try {
    const budgetRef = doc(db, "budgets", budgetId)
    await deleteDoc(budgetRef)
  } catch (error) {
    logger.error("Error deleting budget", error)
    throw error
  }
}

/**
 * Renew an expired budget by advancing its dates to the current period
 */
export async function renewBudget(
  budgetId: string,
  period: "weekly" | "monthly" | "yearly"
): Promise<void> {
  const now = new Date()
  let startDate: Date
  let endDate: Date

  if (period === "monthly") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endDate.setHours(23, 59, 59, 999)
  } else if (period === "weekly") {
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day // Monday as week start
    startDate = new Date(now)
    startDate.setDate(now.getDate() + diff)
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    endDate.setHours(23, 59, 59, 999)
  } else {
    startDate = new Date(now.getFullYear(), 0, 1)
    endDate = new Date(now.getFullYear(), 11, 31)
    endDate.setHours(23, 59, 59, 999)
  }

  await updateBudget(budgetId, {
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    isActive: true,
  })
}

/**
 * Get a single budget by ID
 */
export async function getBudget(budgetId: string): Promise<(BudgetDocument & { id: string }) | null> {
  try {
    const budgetRef = doc(db, "budgets", budgetId)
    const docSnap = await getDoc(budgetRef)

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...(docSnap.data() as BudgetDocument),
      }
    }

    return null
  } catch (error) {
    logger.error("Error fetching budget", error)
    throw error
  }
}
