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
} from "firebase/firestore"
import { db } from "./firebase"
import { EntryDocument, CreateEntryInput } from "./firestore-types"

/**
 * Create a new entry in Firestore
 */
export async function createEntry(
  userId: string,
  entryData: Omit<CreateEntryInput, "userId"> & { date: string | Date | Timestamp }
): Promise<string> {
  try {
    const entryRef = collection(db, "entries")
    
    // Convert date to Timestamp
    let dateTimestamp: Timestamp
    if (entryData.date instanceof Timestamp) {
      dateTimestamp = entryData.date
    } else if (entryData.date instanceof Date) {
      dateTimestamp = Timestamp.fromDate(entryData.date)
    } else {
      dateTimestamp = Timestamp.fromDate(new Date(entryData.date))
    }
    
    // Build entry object, only including defined fields
    const newEntry: any = {
      userId,
      type: entryData.type,
      amount: entryData.amount,
      currency: entryData.currency || "EUR",
      description: entryData.description,
      category: entryData.category,
      date: dateTimestamp,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    // Only add optional fields if they are defined
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
export async function getUserEntries(userId: string): Promise<(EntryDocument & { id: string })[]> {
  try {
    const entriesRef = collection(db, "entries")
    
    // Try with orderBy first (requires index)
    let q = query(
      entriesRef,
      where("userId", "==", userId),
      orderBy("date", "desc")
    )

    let querySnapshot
    try {
      querySnapshot = await getDocs(q)
    } catch (indexError: any) {
      // If index error, try without orderBy and sort in memory
      if (indexError.code === "failed-precondition" || indexError.message?.includes("index")) {
        // Index is still building - using fallback (this is expected and will resolve automatically)
        q = query(
          entriesRef,
          where("userId", "==", userId)
        )
        querySnapshot = await getDocs(q)
      } else {
        throw indexError
      }
    }

    const entries: (EntryDocument & { id: string })[] = []

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as EntryDocument
      entries.push({
        ...data,
        id: docSnap.id,
      })
    })

    // Sort by date if we didn't use orderBy
    if (entries.length > 0 && entries[0].date instanceof Timestamp) {
      entries.sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date as any).getTime()
        const dateB = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date as any).getTime()
        return dateB - dateA // Descending order
      })
    }

    return entries
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
    
    // Convert date string to Timestamp if provided
    const updateData: any = { ...updates }
    if (updates.date && typeof updates.date === "string") {
      updateData.date = Timestamp.fromDate(new Date(updates.date))
    }
    
    // Build update object, filtering out undefined values
    // Firestore doesn't allow undefined values in updateDoc()
    const cleanUpdateData: any = {
      updatedAt: serverTimestamp(),
    }
    
    // Only include defined fields
    if (updateData.type !== undefined) {
      cleanUpdateData.type = updateData.type
    }
    if (updateData.amount !== undefined) {
      cleanUpdateData.amount = updateData.amount
    }
    if (updateData.currency !== undefined) {
      cleanUpdateData.currency = updateData.currency
    }
    if (updateData.description !== undefined) {
      cleanUpdateData.description = updateData.description
    }
    if (updateData.category !== undefined) {
      cleanUpdateData.category = updateData.category
    }
    if (updateData.date !== undefined) {
      cleanUpdateData.date = updateData.date
    }
    if (updateData.categoryId !== undefined) {
      cleanUpdateData.categoryId = updateData.categoryId
    }
    if (updateData.tags !== undefined) {
      cleanUpdateData.tags = updateData.tags
    }
    // Handle notes: only include if defined and not empty string
    if (updateData.notes !== undefined) {
      if (updateData.notes === "" || updateData.notes === null) {
        // Use deleteField() to remove the field if it's empty
        cleanUpdateData.notes = deleteField()
      } else {
        cleanUpdateData.notes = updateData.notes
      }
    }
    if (updateData.location !== undefined) {
      cleanUpdateData.location = updateData.location
    }
    if (updateData.receiptUrl !== undefined) {
      cleanUpdateData.receiptUrl = updateData.receiptUrl
    }
    if (updateData.recurring !== undefined) {
      cleanUpdateData.recurring = updateData.recurring
    }
    if (updateData.recurringId !== undefined) {
      cleanUpdateData.recurringId = updateData.recurringId
    }
    
    await updateDoc(entryRef, cleanUpdateData)
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

