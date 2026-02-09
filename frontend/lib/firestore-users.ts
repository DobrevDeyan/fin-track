/**
 * Firestore Users Service
 * 
 * Functions for user preferences management
 */

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import { UserDocument } from "./firestore-types"
import { type SupportedCurrency } from "./constants/currency.constants"

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

