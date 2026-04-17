/**
 * Firestore Savings Accounts Service
 * 
 * Functions for CRUD operations on savingsAccounts collection
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
  increment,
} from "firebase/firestore"
import { db } from "./firebase"
import { SavingsAccountDocument } from "./firestore-types"
import { logger } from "./utils/logger"

export type CreateSavingsAccountInput = Omit<
  SavingsAccountDocument,
  "userId" | "createdAt" | "updatedAt"
> & {
  userId: string
}

/**
 * Create a new savings account in Firestore
 */
export async function createSavingsAccount(
  userId: string,
  accountData: Omit<CreateSavingsAccountInput, "userId">
): Promise<string> {
  try {
    const accountsRef = collection(db, "savingsAccounts")
    
    // Build the account object, only including fields that are not undefined
    const newAccount: any = {
      name: accountData.name.trim(),
      balance: accountData.balance ?? 0,
      currency: accountData.currency,
      isActive: accountData.isActive ?? true,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    }
    
    // Only include optional fields if they have values
    if (accountData.description !== undefined && accountData.description.trim() !== "") {
      newAccount.description = accountData.description.trim()
    }
    if (accountData.color !== undefined) {
      newAccount.color = accountData.color
    }
    if (accountData.icon !== undefined) {
      newAccount.icon = accountData.icon
    }
    
    const docRef = await addDoc(accountsRef, {
      userId,
      ...newAccount,
    })
    
    return docRef.id
  } catch (error) {
    logger.error("Error creating savings account", error)
    throw error
  }
}

/**
 * Get all savings accounts for a user
 */
export async function getUserSavingsAccounts(
  userId: string
): Promise<(SavingsAccountDocument & { id: string })[]> {
  try {
    const accountsRef = collection(db, "savingsAccounts")
    const q = query(
      accountsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (SavingsAccountDocument & { id: string })[]
  } catch (error: any) {
    // If index is not ready, fetch without orderBy and sort in memory
    if (error?.code === "failed-precondition" || error?.message?.includes("index")) {
      // Index is still building - this is expected and will resolve automatically
      // Using fallback: fetch without orderBy and sort in memory
      const accountsRef = collection(db, "savingsAccounts")
      const q = query(
        accountsRef,
        where("userId", "==", userId)
      )
      
      const querySnapshot = await getDocs(q)
      const accounts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (SavingsAccountDocument & { id: string })[]
      
      // Sort by createdAt descending in memory
      return accounts.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0
        const bTime = b.createdAt?.toMillis?.() || 0
        return bTime - aTime
      })
    }
    logger.error("Error fetching savings accounts", error)
    throw error
  }
}

/**
 * Get active savings accounts for a user
 */
export async function getActiveSavingsAccounts(
  userId: string
): Promise<(SavingsAccountDocument & { id: string })[]> {
  try {
    const accountsRef = collection(db, "savingsAccounts")
    const q = query(
      accountsRef,
      where("userId", "==", userId),
      where("isActive", "==", true),
      orderBy("createdAt", "desc")
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (SavingsAccountDocument & { id: string })[]
  } catch (error) {
    logger.error("Error fetching active savings accounts", error)
    throw error
  }
}

/**
 * Update a savings account
 */
export async function updateSavingsAccount(
  accountId: string,
  updateData: Partial<Omit<SavingsAccountDocument, "userId" | "createdAt">>
): Promise<void> {
  try {
    const accountRef = doc(db, "savingsAccounts", accountId)
    
    const cleanUpdateData: any = {
      updatedAt: serverTimestamp(),
    }
    
    if (updateData.name !== undefined) {
      cleanUpdateData.name = updateData.name.trim()
    }
    if (updateData.balance !== undefined) {
      cleanUpdateData.balance = updateData.balance
    }
    if (updateData.currency !== undefined) {
      cleanUpdateData.currency = updateData.currency
    }
    if (updateData.description !== undefined) {
      // Only include description if it has a value after trimming
      const trimmedDescription = updateData.description?.trim()
      if (trimmedDescription !== undefined && trimmedDescription !== "") {
        cleanUpdateData.description = trimmedDescription
      }
      // If it's empty string, we can set it to empty string (Firebase allows empty strings)
      // but we'll skip undefined values
    }
    if (updateData.color !== undefined) {
      cleanUpdateData.color = updateData.color
    }
    if (updateData.icon !== undefined) {
      cleanUpdateData.icon = updateData.icon
    }
    if (updateData.isActive !== undefined) {
      cleanUpdateData.isActive = updateData.isActive
    }
    
    await updateDoc(accountRef, cleanUpdateData as Record<string, unknown>)
  } catch (error) {
    logger.error("Error updating savings account", error)
    throw error
  }
}

/**
 * Add money to a savings account
 */
export async function addToSavingsAccount(
  accountId: string,
  amount: number
): Promise<void> {
  try {
    const accountRef = doc(db, "savingsAccounts", accountId)
    await updateDoc(accountRef, {
      balance: increment(amount),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    logger.error("Error adding to savings account", error)
    throw error
  }
}

/**
 * Withdraw money from a savings account
 */
export async function withdrawFromSavingsAccount(
  accountId: string,
  amount: number
): Promise<void> {
  try {
    const accountRef = doc(db, "savingsAccounts", accountId)
    const accountDoc = await getDoc(accountRef)
    
    if (!accountDoc.exists()) {
      throw new Error("Savings account not found")
    }
    
    const currentBalance = accountDoc.data().balance as number
    if (currentBalance < amount) {
      throw new Error("Insufficient balance in savings account")
    }
    
    await updateDoc(accountRef, {
      balance: increment(-amount),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    logger.error("Error withdrawing from savings account", error)
    throw error
  }
}

/**
 * Delete a savings account
 */
export async function deleteSavingsAccount(accountId: string): Promise<void> {
  try {
    const accountRef = doc(db, "savingsAccounts", accountId)
    await deleteDoc(accountRef)
  } catch (error) {
    logger.error("Error deleting savings account", error)
    throw error
  }
}

/**
 * Get a single savings account by ID
 */
export async function getSavingsAccount(
  accountId: string
): Promise<(SavingsAccountDocument & { id: string }) | null> {
  try {
    const accountRef = doc(db, "savingsAccounts", accountId)
    const docSnapshot = await getDoc(accountRef)
    
    if (!docSnapshot.exists()) {
      return null
    }
    
    return {
      id: docSnapshot.id,
      ...docSnapshot.data(),
    } as SavingsAccountDocument & { id: string }
  } catch (error) {
    logger.error("Error fetching savings account", error)
    throw error
  }
}

/**
 * Calculate total savings across all accounts
 * Accepts any object with balance and isActive properties
 */
export function calculateTotalSavings(
  accounts: { balance: number; isActive: boolean }[]
): number {
  return accounts
    .filter((acc) => acc.isActive)
    .reduce((sum, acc) => sum + acc.balance, 0)
}

