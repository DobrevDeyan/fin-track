import {
  collection, addDoc, getDocs, query, where,
  doc, updateDoc, deleteDoc, serverTimestamp, Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { HouseholdBudgetDocument } from "@/lib/firestore-types"
import { logger } from "@/lib/utils/logger"

export type HouseholdBudget = HouseholdBudgetDocument & { id: string }

export async function getHouseholdBudgets(householdId: string): Promise<HouseholdBudget[]> {
  const q = query(collection(db, "householdBudgets"), where("householdId", "==", householdId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as HouseholdBudget))
}

export async function createHouseholdBudget(
  householdId: string,
  data: Omit<HouseholdBudgetDocument, "householdId" | "createdAt" | "updatedAt">
): Promise<string> {
  try {
    const { alertThreshold, ...required } = data
    const docData: Record<string, unknown> = {
      ...required,
      householdId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    if (alertThreshold !== undefined) docData.alertThreshold = alertThreshold
    const ref = await addDoc(collection(db, "householdBudgets"), docData)
    return ref.id
  } catch (error) {
    logger.error("Error creating household budget", error)
    throw error
  }
}

export async function updateHouseholdBudget(
  budgetId: string,
  updates: Partial<Omit<HouseholdBudgetDocument, "householdId" | "createdAt">>
): Promise<void> {
  try {
    const { alertThreshold, ...rest } = updates
    const docData: Record<string, unknown> = { ...rest, updatedAt: serverTimestamp() }
    if (alertThreshold !== undefined) docData.alertThreshold = alertThreshold
    await updateDoc(doc(db, "householdBudgets", budgetId), docData)
  } catch (error) {
    logger.error("Error updating household budget", error)
    throw error
  }
}

export async function deleteHouseholdBudget(budgetId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "householdBudgets", budgetId))
  } catch (error) {
    logger.error("Error deleting household budget", error)
    throw error
  }
}

export async function renewHouseholdBudget(
  budgetId: string,
  period: "weekly" | "monthly" | "yearly"
): Promise<void> {
  const now = new Date()
  let startDate: Date
  let endDate: Date

  if (period === "monthly") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  } else if (period === "weekly") {
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    startDate = new Date(now)
    startDate.setDate(now.getDate() + diff)
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    endDate.setHours(23, 59, 59, 999)
  } else {
    startDate = new Date(now.getFullYear(), 0, 1)
    endDate = new Date(now.getFullYear(), 11, 31)
  }

  try {
    await updateDoc(doc(db, "householdBudgets", budgetId), {
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      isActive: true,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    logger.error("Error renewing household budget", error)
    throw error
  }
}
