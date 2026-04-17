/**
 * Firestore Goals Service
 * 
 * Functions for CRUD operations on goals collection
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
import { GoalDocument } from "./firestore-types"
import { logger } from "./utils/logger"

// Type for update data
interface GoalUpdateData {
  [key: string]: FieldValue | string | number | boolean | Timestamp | undefined
  updatedAt: FieldValue
  name?: string
  targetAmount?: number
  currentAmount?: number
  currency?: string
  category?: string
  description?: string
  isActive?: boolean
  deadline?: Timestamp
}

export type CreateGoalInput = Omit<
  GoalDocument,
  "userId" | "createdAt" | "updatedAt"
> & {
  userId: string
  deadline?: string | Date | Timestamp
}

/**
 * Create a new goal in Firestore
 */
export async function createGoal(
  userId: string,
  goalData: Omit<CreateGoalInput, "userId"> & {
    deadline?: string | Date | Timestamp
  }
): Promise<string> {
  try {
    const goalsRef = collection(db, "goals")
    
    const toTimestamp = (date: string | Date | Timestamp | undefined): Timestamp | undefined => {
      if (!date) return undefined
      if (date && typeof date === "object" && "toMillis" in date) {
        return date as unknown as Timestamp
      }
      if (date instanceof Date) {
        return Timestamp.fromDate(date)
      }
      return Timestamp.fromDate(new Date(date as string))
    }
    
    const deadlineTimestamp = goalData.deadline ? toTimestamp(goalData.deadline) : undefined
    
    const newGoal: Record<string, unknown> = {
      name: goalData.name.trim(),
      targetAmount: goalData.targetAmount,
      currentAmount: goalData.currentAmount ?? 0,
      currency: goalData.currency,
      isActive: goalData.isActive ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    if (deadlineTimestamp) newGoal.deadline = deadlineTimestamp
    if (goalData.category) newGoal.category = goalData.category
    if (goalData.description?.trim()) newGoal.description = goalData.description.trim()
    
    const docRef = await addDoc(goalsRef, {
      userId,
      ...newGoal,
    })
    
    return docRef.id
  } catch (error) {
    logger.error("Error creating goal", error)
    throw error
  }
}

/**
 * Get all goals for a user
 */
export async function getUserGoals(
  userId: string
): Promise<(GoalDocument & { id: string })[]> {
  try {
    const goalsRef = collection(db, "goals")
    const q = query(
      goalsRef,
      where("userId", "==", userId)
    )
    
    const querySnapshot = await getDocs(q)
    const goals = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (GoalDocument & { id: string })[]
    
    // Sort manually: active first, then by deadline (if exists)
    return goals.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1
      if (!a.isActive && b.isActive) return 1
      if (a.deadline && b.deadline) {
        return a.deadline.toMillis() - b.deadline.toMillis()
      }
      if (a.deadline && !b.deadline) return -1
      if (!a.deadline && b.deadline) return 1
      return 0
    })
  } catch (error) {
    logger.error("Error fetching goals", error)
    throw error
  }
}

/**
 * Get active goals for a user
 */
export async function getActiveGoals(
  userId: string
): Promise<(GoalDocument & { id: string })[]> {
  try {
    const goalsRef = collection(db, "goals")
    const q = query(
      goalsRef,
      where("userId", "==", userId),
      where("isActive", "==", true)
    )
    
    const querySnapshot = await getDocs(q)
    const goals = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (GoalDocument & { id: string })[]
    
    // Sort by deadline if exists
    return goals.sort((a, b) => {
      if (a.deadline && b.deadline) {
        return a.deadline.toMillis() - b.deadline.toMillis()
      }
      if (a.deadline && !b.deadline) return -1
      if (!a.deadline && b.deadline) return 1
      return 0
    })
  } catch (error) {
    logger.error("Error fetching active goals", error)
    throw error
  }
}

/**
 * Update a goal
 */
export async function updateGoal(
  goalId: string,
  updateData: Partial<Omit<GoalDocument, "userId" | "createdAt">> & {
    deadline?: string | Date | Timestamp
  }
): Promise<void> {
  try {
    const goalRef = doc(db, "goals", goalId)

    // Helper to convert to Timestamp
    const toTimestamp = (date: string | Date | Timestamp | undefined): Timestamp | undefined => {
      if (!date) return undefined
      if (date instanceof Timestamp) return date
      if (date && typeof date === "object" && "toMillis" in date) {
        return date as unknown as Timestamp
      }
      if (date instanceof Date) {
        return Timestamp.fromDate(date)
      }
      return Timestamp.fromDate(new Date(date as string))
    }

    const cleanUpdateData: GoalUpdateData = {
      updatedAt: serverTimestamp(),
    }

    if (updateData.name !== undefined) {
      cleanUpdateData.name = updateData.name.trim()
    }
    if (updateData.targetAmount !== undefined) {
      cleanUpdateData.targetAmount = updateData.targetAmount
    }
    if (updateData.currentAmount !== undefined) {
      cleanUpdateData.currentAmount = updateData.currentAmount
    }
    if (updateData.currency !== undefined) {
      cleanUpdateData.currency = updateData.currency
    }
    if (updateData.category !== undefined) {
      cleanUpdateData.category = updateData.category
    }
    if (updateData.description !== undefined) {
      cleanUpdateData.description = updateData.description?.trim()
    }
    if (updateData.isActive !== undefined) {
      cleanUpdateData.isActive = updateData.isActive
    }
    if (updateData.deadline !== undefined) {
      cleanUpdateData.deadline = toTimestamp(updateData.deadline)
    }

    await updateDoc(goalRef, cleanUpdateData as Record<string, unknown>)
  } catch (error) {
    logger.error("Error updating goal", error)
    throw error
  }
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string): Promise<void> {
  try {
    const goalRef = doc(db, "goals", goalId)
    await deleteDoc(goalRef)
  } catch (error) {
    logger.error("Error deleting goal", error)
    throw error
  }
}

/**
 * Get a single goal by ID
 */
export async function getGoal(
  goalId: string
): Promise<(GoalDocument & { id: string }) | null> {
  try {
    const goalRef = doc(db, "goals", goalId)
    const docSnapshot = await getDoc(goalRef)
    
    if (!docSnapshot.exists()) {
      return null
    }
    
    return {
      id: docSnapshot.id,
      ...docSnapshot.data(),
    } as GoalDocument & { id: string }
  } catch (error) {
    logger.error("Error fetching goal", error)
    throw error
  }
}

/**
 * Calculate goal progress percentage
 */
export function calculateGoalProgress(currentAmount: number, targetAmount: number): number {
  if (targetAmount === 0) return 0
  return Math.min((currentAmount / targetAmount) * 100, 100)
}

