/**
 * Firestore Net Worth Service
 *
 * CRUD operations for the `assets` collection.
 * Each document represents a single asset or liability owned by a user.
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"

export type AssetType = "bank" | "investment" | "property" | "vehicle" | "other"

export interface AssetDocument {
  userId: string
  name: string
  type: AssetType
  value: number
  currency: string
  isLiability: boolean
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type Asset = AssetDocument & { id: string }

export interface CreateAssetInput {
  name: string
  type: AssetType
  value: number
  currency: string
  isLiability: boolean
  notes?: string
}

export async function getAssets(userId: string): Promise<Asset[]> {
  const q = query(
    collection(db, "assets"),
    where("userId", "==", userId),
    orderBy("createdAt", "asc")
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ ...(d.data() as AssetDocument), id: d.id }))
}

export async function createAsset(userId: string, input: CreateAssetInput): Promise<string> {
  const ref = await addDoc(collection(db, "assets"), {
    userId,
    name: input.name,
    type: input.type,
    value: input.value,
    currency: input.currency,
    isLiability: input.isLiability,
    notes: input.notes ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateAsset(
  assetId: string,
  updates: Partial<Omit<AssetDocument, "userId" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "assets", assetId), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteAsset(assetId: string): Promise<void> {
  await deleteDoc(doc(db, "assets", assetId))
}
