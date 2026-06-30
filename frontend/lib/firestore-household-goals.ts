import {
  collection, addDoc, getDocs, query, where,
  doc, updateDoc, deleteDoc, serverTimestamp, arrayUnion, deleteField, increment, FieldValue,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { HouseholdGoalDocument, HouseholdGoalContribution } from "@/lib/firestore-types"
import { logger } from "@/lib/utils/logger"

export type HouseholdGoal = HouseholdGoalDocument & { id: string }

export async function getHouseholdGoals(householdId: string): Promise<HouseholdGoal[]> {
  const q = query(collection(db, "householdGoals"), where("householdId", "==", householdId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as HouseholdGoal))
}

export async function createHouseholdGoal(
  householdId: string,
  data: Omit<HouseholdGoalDocument, "householdId" | "contributions" | "createdAt" | "updatedAt">
): Promise<string> {
  try {
    const { deadline, category, description, ...required } = data
    const docData: Record<string, unknown> = {
      ...required,
      householdId,
      contributions: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    if (deadline !== undefined) docData.deadline = deadline
    if (category !== undefined) docData.category = category
    if (description !== undefined) docData.description = description

    const ref = await addDoc(collection(db, "householdGoals"), docData)
    return ref.id
  } catch (error) {
    logger.error("Error creating household goal", error)
    throw error
  }
}

export async function updateHouseholdGoal(
  goalId: string,
  updates: Partial<Omit<HouseholdGoalDocument, "householdId" | "createdAt">>
): Promise<void> {
  try {
    const { deadline, category, description, ...rest } = updates
    const docData: Record<string, unknown> = {
      ...rest,
      updatedAt: serverTimestamp(),
    }
    // Use deleteField() to clear optional fields when explicitly set to undefined
    docData.deadline = deadline !== undefined ? deadline : deleteField()
    if (category !== undefined) docData.category = category
    if (description !== undefined) docData.description = description
    await updateDoc(doc(db, "householdGoals", goalId), docData as Record<string, FieldValue | unknown>)
  } catch (error) {
    logger.error("Error updating household goal", error)
    throw error
  }
}

export async function deleteHouseholdGoal(goalId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "householdGoals", goalId))
  } catch (error) {
    logger.error("Error deleting household goal", error)
    throw error
  }
}

export async function addFundsToHouseholdGoal(
  goalId: string,
  amount: number,
  contribution: HouseholdGoalContribution
): Promise<void> {
  try {
    // H7-13: use a server-side atomic increment (not a client read-modify-write)
    // so concurrent contributions from different members can't clobber each other
    // and leave currentAmount out of sync with the contributions array.
    await updateDoc(doc(db, "householdGoals", goalId), {
      currentAmount: increment(amount),
      contributions: arrayUnion(contribution),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    logger.error("Error adding funds to household goal", error)
    throw error
  }
}
