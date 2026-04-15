import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "./firebase"
import type { DebtItem, UserDebtsDocument } from "./firestore-types"

export async function getUserDebts(userId: string): Promise<DebtItem[]> {
  const snap = await getDoc(doc(db, "userDebts", userId))
  if (!snap.exists()) return []
  return (snap.data() as UserDebtsDocument).debts ?? []
}

export async function saveUserDebts(userId: string, debts: DebtItem[]): Promise<void> {
  await setDoc(doc(db, "userDebts", userId), {
    userId,
    debts,
    updatedAt: serverTimestamp(),
  })
}
