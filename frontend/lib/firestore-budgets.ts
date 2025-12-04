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
} from "firebase/firestore"
import { db } from "./firebase"
import { BudgetDocument, CreateBudgetInput } from "./firestore-types"

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
    
    // Convert dates to Timestamps
    let startDateTimestamp: Timestamp
    let endDateTimestamp: Timestamp
    
    // Helper function to convert to Timestamp
    const toTimestamp = (date: string | Date | Timestamp): Timestamp => {
      if (date && typeof date === "object" && "toMillis" in date) {
        return date as Timestamp
      }
      if (date instanceof Date) {
        return Timestamp.fromDate(date)
      }
      return Timestamp.fromDate(new Date(date))
    }
    
    startDateTimestamp = toTimestamp(budgetData.startDate)
    endDateTimestamp = toTimestamp(budgetData.endDate)
    
    const newBudget: any = {
      userId,
      name: budgetData.name,
      amount: budgetData.amount,
      currency: budgetData.currency || "EUR",
      period: budgetData.period,
      startDate: startDateTimestamp,
      endDate: endDateTimestamp,
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
    console.error("Error creating budget:", error)
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
    } catch (indexError: any) {
      // If index error, try without orderBy and sort in memory
      if (indexError.code === "failed-precondition" || indexError.message?.includes("index")) {
        console.warn("Firestore index not found, fetching without orderBy and sorting in memory")
        q = query(
          budgetsRef,
          where("userId", "==", userId)
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

    // Sort by startDate if we didn't use orderBy
    if (budgets.length > 0 && budgets[0].startDate instanceof Timestamp) {
      budgets.sort((a, b) => {
        const dateA = a.startDate instanceof Timestamp ? a.startDate.toMillis() : new Date(a.startDate as any).getTime()
        const dateB = b.startDate instanceof Timestamp ? b.startDate.toMillis() : new Date(b.startDate as any).getTime()
        return dateB - dateA // Descending order
      })
    }

    return budgets
  } catch (error) {
    console.error("Error fetching budgets:", error)
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
    } catch (indexError: any) {
      if (indexError.code === "failed-precondition" || indexError.message?.includes("index")) {
        console.warn("Firestore index not found, fetching without orderBy")
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
    console.error("Error fetching active budgets:", error)
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
    } catch (indexError: any) {
      if (indexError.code === "failed-precondition" || indexError.message?.includes("index")) {
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
    console.error("Error fetching budgets by category:", error)
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
    
    // Convert date strings to Timestamps if provided
    const updateData: any = { ...updates }
    if (updates.startDate && typeof updates.startDate === "string") {
      updateData.startDate = Timestamp.fromDate(new Date(updates.startDate))
    }
    if (updates.endDate && typeof updates.endDate === "string") {
      updateData.endDate = Timestamp.fromDate(new Date(updates.endDate))
    }
    
    await updateDoc(budgetRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating budget:", error)
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
    console.error("Error deleting budget:", error)
    throw error
  }
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
    console.error("Error fetching budget:", error)
    throw error
  }
}

