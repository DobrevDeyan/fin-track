/**
 * Firestore Entries Service
 *
 * Functions for CRUD operations on entries collection
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
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
import { EntryDocument, CreateEntryInput } from "./firestore-types"

// Type for creating a new entry document
interface NewEntryDocument {
  userId: string
  type: "income" | "expense"
  amount: number
  currency: string
  description: string
  category: string
  date: Timestamp
  createdAt: FieldValue
  updatedAt: FieldValue
  categoryId?: string
  tags?: string[]
  notes?: string
  location?: { lat: number; lng: number; name?: string }
  receiptUrl?: string
  recurring?: boolean
  recurringId?: string
}

// Type for update data
interface EntryUpdateData {
  [key: string]: FieldValue | string | number | boolean | Timestamp | string[] | { lat: number; lng: number; name?: string } | undefined
  updatedAt: FieldValue
  type?: "income" | "expense"
  amount?: number
  currency?: string
  description?: string
  category?: string
  date?: Timestamp
  categoryId?: string
  tags?: string[]
  notes?: string | FieldValue
  location?: { lat: number; lng: number; name?: string }
  receiptUrl?: string
  recurring?: boolean
  recurringId?: string
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
  return Timestamp.fromDate(new Date(date))
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
 * Create a new entry in Firestore
 */
export async function createEntry(
  userId: string,
  entryData: Omit<CreateEntryInput, "userId"> & { date: string | Date | Timestamp }
): Promise<string> {
  try {
    const entryRef = collection(db, "entries")

    // Build entry object with required fields
    const newEntry: NewEntryDocument = {
      userId,
      type: entryData.type,
      amount: entryData.amount,
      currency: entryData.currency || "EUR",
      description: entryData.description,
      category: entryData.category,
      date: toTimestamp(entryData.date),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    // Add optional fields if they are defined
    if (entryData.categoryId !== undefined) {
      newEntry.categoryId = entryData.categoryId
    }
    if (entryData.tags !== undefined && entryData.tags.length > 0) {
      newEntry.tags = entryData.tags
    }
    if (entryData.notes !== undefined && entryData.notes.trim() !== "") {
      newEntry.notes = entryData.notes
    }
    if (entryData.location !== undefined) {
      newEntry.location = entryData.location
    }
    if (entryData.receiptUrl !== undefined && entryData.receiptUrl.trim() !== "") {
      newEntry.receiptUrl = entryData.receiptUrl
    }
    if (entryData.recurring !== undefined) {
      newEntry.recurring = entryData.recurring
    }
    if (entryData.recurringId !== undefined && entryData.recurringId.trim() !== "") {
      newEntry.recurringId = entryData.recurringId
    }

    const docRef = await addDoc(entryRef, newEntry)

    return docRef.id
  } catch (error) {
    console.error("Error creating entry:", error)
    throw error
  }
}

/**
 * Get all entries for a user
 */
/**
 * Get all entries for a user with pagination
 */
export async function getUserEntries(
  userId: string, 
  lastVisible: unknown = null, 
  limitCount: number = 20
): Promise<{ entries: (EntryDocument & { id: string })[], lastVisible: unknown }> {
  try {
    const entriesRef = collection(db, "entries")

    // Try with orderBy first (requires index)
    let q;
    
    // Import needed functions dynamically or ensure they are at top level
    const { limit, startAfter } = await import("firebase/firestore");

    if (lastVisible) {
      q = query(
        entriesRef,
        where("userId", "==", userId),
        orderBy("date", "desc"),
        startAfter(lastVisible),
        limit(limitCount)
      )
    } else {
       q = query(
        entriesRef,
        where("userId", "==", userId),
        orderBy("date", "desc"),
        limit(limitCount)
      )
    }

    let querySnapshot
    try {
      querySnapshot = await getDocs(q)
    } catch (indexError: unknown) {
      // If index error, try without orderBy (fallback for dev, but breaks pagination logic strictly speaking without client-side filter)
      // For creating the index, the developer needs the link from the console error.
      // We will re-throw if it's an index error so the developer can see the link.
      console.error("Firestore Index Error (likely missing index for userId + date):", indexError);
      throw indexError;
    }

    const entries: (EntryDocument & { id: string })[] = []

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as EntryDocument
      entries.push({
        ...data,
        id: docSnap.id,
      })
    })

    const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

    return { entries, lastVisible: lastVisibleDoc }
  } catch (error) {
    console.error("Error fetching entries:", error)
    throw error
  }
}

/**
 * Update an existing entry
 */
export async function updateEntry(
  entryId: string,
  updates: Partial<Omit<EntryDocument, "id" | "userId" | "createdAt">>
): Promise<void> {
  try {
    const entryRef = doc(db, "entries", entryId)

    // Build update object with required updatedAt field
    const cleanUpdateData: EntryUpdateData = {
      updatedAt: serverTimestamp(),
    }

    // Only include defined fields
    if (updates.type !== undefined) {
      cleanUpdateData.type = updates.type
    }
    if (updates.amount !== undefined) {
      cleanUpdateData.amount = updates.amount
    }
    if (updates.currency !== undefined) {
      cleanUpdateData.currency = updates.currency
    }
    if (updates.description !== undefined) {
      cleanUpdateData.description = updates.description
    }
    if (updates.category !== undefined) {
      cleanUpdateData.category = updates.category
    }
    if (updates.date !== undefined) {
      // Convert date to Timestamp if it's a string or Date
      cleanUpdateData.date = toTimestamp(updates.date)
    }
    if (updates.categoryId !== undefined) {
      cleanUpdateData.categoryId = updates.categoryId
    }
    if (updates.tags !== undefined) {
      cleanUpdateData.tags = updates.tags
    }
    // Handle notes: use deleteField() to remove if empty
    if (updates.notes !== undefined) {
      if (updates.notes === "" || updates.notes === null) {
        cleanUpdateData.notes = deleteField()
      } else {
        cleanUpdateData.notes = updates.notes
      }
    }
    if (updates.location !== undefined) {
      cleanUpdateData.location = updates.location
    }
    if (updates.receiptUrl !== undefined) {
      cleanUpdateData.receiptUrl = updates.receiptUrl
    }
    if (updates.recurring !== undefined) {
      cleanUpdateData.recurring = updates.recurring
    }
    if (updates.recurringId !== undefined) {
      cleanUpdateData.recurringId = updates.recurringId
    }

    await updateDoc(entryRef, cleanUpdateData as Record<string, unknown>)
  } catch (error) {
    console.error("Error updating entry:", error)
    throw error
  }
}

/**
 * Delete an entry
 */
export async function deleteEntry(entryId: string): Promise<void> {
  try {
    const entryRef = doc(db, "entries", entryId)
    await deleteDoc(entryRef)
  } catch (error) {
    console.error("Error deleting entry:", error)
    throw error
  }
}

/**
 * Get a single entry by ID
 */
export async function getEntry(entryId: string): Promise<EntryDocument | null> {
  try {
    const entryRef = doc(db, "entries", entryId)
    const docSnap = await getDoc(entryRef)

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...(docSnap.data() as Omit<EntryDocument, "id">),
      } as EntryDocument
    }

    return null
  } catch (error) {
    console.error("Error fetching entry:", error)
    throw error
  }
}

