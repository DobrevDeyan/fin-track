/**
 * Firestore Entries Service
 *
 * Functions for CRUD operations on entries collection.
 * All mutations atomically update the financial summary via batch writes.
 */

import {
  collection,
  updateDoc,
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
  writeBatch,
  increment,
} from "firebase/firestore"
import { db } from "./firebase"
import { EntryDocument, CreateEntryInput } from "./firestore-types"
import { getMonthKey } from "./firestore-summary"

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
  savingsAllocation?: { accountId: string; amount: number; accountName: string }
}

// Type for update data
interface EntryUpdateData {
  [key: string]:
    | FieldValue
    | string
    | number
    | boolean
    | Timestamp
    | string[]
    | { lat: number; lng: number; name?: string }
    | { accountId: string; amount: number; accountName: string }
    | undefined
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

/**
 * Build the summary update fields for adding an entry's effect
 */
function buildSummaryIncrements(
  type: "income" | "expense",
  amount: number,
  category: string,
  date: Timestamp | Date | string,
  sign: 1 | -1 = 1
): Record<string, FieldValue> {
  const monthKey = getMonthKey(date)
  const delta = amount * sign

  const updates: Record<string, FieldValue> = {
    updatedAt: serverTimestamp(),
    entryCount: increment(sign),
  }

  if (type === "income") {
    updates.totalIncome = increment(delta)
    updates[`months.${monthKey}.income`] = increment(delta)
    updates[`months.${monthKey}.incomeByCategory.${category}`] = increment(delta)
  } else {
    updates.totalExpenses = increment(delta)
    updates[`months.${monthKey}.expenses`] = increment(delta)
    updates[`months.${monthKey}.expensesByCategory.${category}`] = increment(delta)
  }

  return updates
}

/**
 * Create a new entry in Firestore + atomically update financial summary
 */
export async function createEntry(
  userId: string,
  entryData: Omit<CreateEntryInput, "userId"> & {
    date: string | Date | Timestamp
    savingsAllocation?: { accountId: string; amount: number; accountName: string }
  }
): Promise<string> {
  try {
    const batch = writeBatch(db)

    // 1. Build entry document
    const entryRef = doc(collection(db, "entries"))
    const entryDate = toTimestamp(entryData.date)

    const newEntry: NewEntryDocument = {
      userId,
      type: entryData.type,
      amount: entryData.amount,
      currency: entryData.currency || "EUR",
      description: entryData.description,
      category: entryData.category,
      date: entryDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

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
    if (
      entryData.receiptUrl !== undefined &&
      entryData.receiptUrl.trim() !== ""
    ) {
      newEntry.receiptUrl = entryData.receiptUrl
    }
    if (entryData.recurring !== undefined) {
      newEntry.recurring = entryData.recurring
    }
    if (
      entryData.recurringId !== undefined &&
      entryData.recurringId.trim() !== ""
    ) {
      newEntry.recurringId = entryData.recurringId
    }
    if (entryData.savingsAllocation) {
      newEntry.savingsAllocation = entryData.savingsAllocation
    }

    batch.set(entryRef, newEntry)

    // 2. Update financial summary atomically
    const summaryRef = doc(db, "financialSummaries", userId)
    const summaryUpdates = buildSummaryIncrements(
      entryData.type,
      entryData.amount,
      entryData.category,
      entryDate
    )
    batch.set(summaryRef, summaryUpdates, { merge: true })

    // 3. Commit both operations atomically
    await batch.commit()

    return entryRef.id
  } catch (error) {
    console.error("Error creating entry:", error)
    throw error
  }
}

/**
 * Get all entries for a user with pagination
 */
export async function getUserEntries(
  userId: string,
  lastVisible: unknown = null,
  limitCount: number = 20
): Promise<{
  entries: (EntryDocument & { id: string })[]
  lastVisible: unknown
}> {
  try {
    const entriesRef = collection(db, "entries")

    const { limit, startAfter } = await import("firebase/firestore")

    let q
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
      console.error(
        "Firestore Index Error (likely missing index for userId + date):",
        indexError
      )
      throw indexError
    }

    const entries: (EntryDocument & { id: string })[] = []

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as EntryDocument
      entries.push({
        ...data,
        id: docSnap.id,
      })
    })

    const lastVisibleDoc =
      querySnapshot.docs[querySnapshot.docs.length - 1]

    return { entries, lastVisible: lastVisibleDoc }
  } catch (error) {
    console.error("Error fetching entries:", error)
    throw error
  }
}

/**
 * Update an existing entry + atomically update financial summary
 *
 * @param oldEntry - The previous state of the entry (for reversing its summary effect)
 */
export async function updateEntry(
  entryId: string,
  updates: Partial<Omit<EntryDocument, "id" | "userId" | "createdAt">>,
  oldEntry?: {
    type: "income" | "expense"
    amount: number
    category: string
    date: Timestamp | Date | string
    userId: string
  }
): Promise<void> {
  try {
    const entryRef = doc(db, "entries", entryId)

    const cleanUpdateData: EntryUpdateData = {
      updatedAt: serverTimestamp(),
    }

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
      cleanUpdateData.date = toTimestamp(updates.date)
    }
    if (updates.categoryId !== undefined) {
      cleanUpdateData.categoryId = updates.categoryId
    }
    if (updates.tags !== undefined) {
      cleanUpdateData.tags = updates.tags
    }
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

    // If we have old entry data, update summary atomically
    if (oldEntry) {
      const batch = writeBatch(db)
      batch.update(entryRef, cleanUpdateData as Record<string, unknown>)

      const summaryRef = doc(db, "financialSummaries", oldEntry.userId)

      // Reverse old entry's effect (sign = -1, entryCount stays same)
      const reverseUpdates = buildSummaryIncrements(
        oldEntry.type,
        oldEntry.amount,
        oldEntry.category,
        oldEntry.date
      )
      // Don't change entryCount for updates (it's the same entry)
      delete reverseUpdates.entryCount
      // Negate all increments
      const oldMonthKey = getMonthKey(oldEntry.date)
      const negatedReverse: Record<string, FieldValue> = {
        updatedAt: serverTimestamp(),
      }
      if (oldEntry.type === "income") {
        negatedReverse.totalIncome = increment(-oldEntry.amount)
        negatedReverse[`months.${oldMonthKey}.income`] = increment(-oldEntry.amount)
        negatedReverse[`months.${oldMonthKey}.incomeByCategory.${oldEntry.category}`] = increment(-oldEntry.amount)
      } else {
        negatedReverse.totalExpenses = increment(-oldEntry.amount)
        negatedReverse[`months.${oldMonthKey}.expenses`] = increment(-oldEntry.amount)
        negatedReverse[`months.${oldMonthKey}.expensesByCategory.${oldEntry.category}`] = increment(-oldEntry.amount)
      }

      // Apply new entry's effect
      const newType = updates.type ?? oldEntry.type
      const newAmount = updates.amount ?? oldEntry.amount
      const newCategory = updates.category ?? oldEntry.category
      const newDate = updates.date ?? oldEntry.date
      const newMonthKey = getMonthKey(newDate)

      const addUpdates: Record<string, FieldValue> = {}
      if (newType === "income") {
        addUpdates.totalIncome = increment(newAmount)
        addUpdates[`months.${newMonthKey}.income`] = increment(newAmount)
        addUpdates[`months.${newMonthKey}.incomeByCategory.${newCategory}`] = increment(newAmount)
      } else {
        addUpdates.totalExpenses = increment(newAmount)
        addUpdates[`months.${newMonthKey}.expenses`] = increment(newAmount)
        addUpdates[`months.${newMonthKey}.expensesByCategory.${newCategory}`] = increment(newAmount)
      }

      // Merge reverse + add into one update (Firestore handles multiple increments on same field)
      // But if they target the same field, we need to combine them.
      // The safest approach: compute net deltas ourselves.
      const combinedUpdates: Record<string, FieldValue> = {
        updatedAt: serverTimestamp(),
      }

      // Net income change
      const oldIncomeEffect = oldEntry.type === "income" ? oldEntry.amount : 0
      const newIncomeEffect = newType === "income" ? newAmount : 0
      const incomeDelta = newIncomeEffect - oldIncomeEffect
      if (incomeDelta !== 0) {
        combinedUpdates.totalIncome = increment(incomeDelta)
      }

      // Net expenses change
      const oldExpenseEffect = oldEntry.type === "expense" ? oldEntry.amount : 0
      const newExpenseEffect = newType === "expense" ? newAmount : 0
      const expenseDelta = newExpenseEffect - oldExpenseEffect
      if (expenseDelta !== 0) {
        combinedUpdates.totalExpenses = increment(expenseDelta)
      }

      // Monthly breakdown: reverse old month, add to new month
      if (oldEntry.type === "income") {
        combinedUpdates[`months.${oldMonthKey}.income`] = increment(-oldEntry.amount)
        combinedUpdates[`months.${oldMonthKey}.incomeByCategory.${oldEntry.category}`] = increment(-oldEntry.amount)
      } else {
        combinedUpdates[`months.${oldMonthKey}.expenses`] = increment(-oldEntry.amount)
        combinedUpdates[`months.${oldMonthKey}.expensesByCategory.${oldEntry.category}`] = increment(-oldEntry.amount)
      }

      if (newType === "income") {
        // If same month+field, increments accumulate correctly
        const key = `months.${newMonthKey}.income`
        combinedUpdates[key] = increment(
          newAmount + ((combinedUpdates[key] as unknown as number) || 0)
        )
        // Actually, we can't read the FieldValue. Let's use a different approach:
        // Just add both operations; if they target the same field path, Firestore
        // handles the second set() call. But in a single update(), duplicate keys
        // in JS object would overwrite. So we must handle this case manually.
      }

      // Simplified approach: compute per-field net deltas
      const fieldDeltas: Record<string, number> = {}

      // Reverse old
      if (oldEntry.type === "income") {
        fieldDeltas[`totalIncome`] = (fieldDeltas[`totalIncome`] || 0) - oldEntry.amount
        fieldDeltas[`months.${oldMonthKey}.income`] = (fieldDeltas[`months.${oldMonthKey}.income`] || 0) - oldEntry.amount
        fieldDeltas[`months.${oldMonthKey}.incomeByCategory.${oldEntry.category}`] = (fieldDeltas[`months.${oldMonthKey}.incomeByCategory.${oldEntry.category}`] || 0) - oldEntry.amount
      } else {
        fieldDeltas[`totalExpenses`] = (fieldDeltas[`totalExpenses`] || 0) - oldEntry.amount
        fieldDeltas[`months.${oldMonthKey}.expenses`] = (fieldDeltas[`months.${oldMonthKey}.expenses`] || 0) - oldEntry.amount
        fieldDeltas[`months.${oldMonthKey}.expensesByCategory.${oldEntry.category}`] = (fieldDeltas[`months.${oldMonthKey}.expensesByCategory.${oldEntry.category}`] || 0) - oldEntry.amount
      }

      // Apply new
      if (newType === "income") {
        fieldDeltas[`totalIncome`] = (fieldDeltas[`totalIncome`] || 0) + newAmount
        fieldDeltas[`months.${newMonthKey}.income`] = (fieldDeltas[`months.${newMonthKey}.income`] || 0) + newAmount
        fieldDeltas[`months.${newMonthKey}.incomeByCategory.${newCategory}`] = (fieldDeltas[`months.${newMonthKey}.incomeByCategory.${newCategory}`] || 0) + newAmount
      } else {
        fieldDeltas[`totalExpenses`] = (fieldDeltas[`totalExpenses`] || 0) + newAmount
        fieldDeltas[`months.${newMonthKey}.expenses`] = (fieldDeltas[`months.${newMonthKey}.expenses`] || 0) + newAmount
        fieldDeltas[`months.${newMonthKey}.expensesByCategory.${newCategory}`] = (fieldDeltas[`months.${newMonthKey}.expensesByCategory.${newCategory}`] || 0) + newAmount
      }

      // Build final summary update with non-zero deltas
      const finalSummaryUpdate: Record<string, FieldValue> = {
        updatedAt: serverTimestamp(),
      }
      for (const [field, delta] of Object.entries(fieldDeltas)) {
        if (delta !== 0) {
          finalSummaryUpdate[field] = increment(delta)
        }
      }

      batch.set(summaryRef, finalSummaryUpdate, { merge: true })
      await batch.commit()
    } else {
      // No old entry data - just update the entry without summary
      await updateDoc(entryRef, cleanUpdateData as Record<string, unknown>)
    }
  } catch (error) {
    console.error("Error updating entry:", error)
    throw error
  }
}

/**
 * Delete an entry + atomically update financial summary
 *
 * @param entryData - The entry being deleted (for reversing its summary effect)
 */
export async function deleteEntry(
  entryId: string,
  entryData?: {
    type: "income" | "expense"
    amount: number
    category: string
    date: Timestamp | Date | string
    userId: string
  }
): Promise<void> {
  try {
    const entryRef = doc(db, "entries", entryId)

    if (entryData) {
      const batch = writeBatch(db)
      batch.delete(entryRef)

      // Reverse the entry's effect on the summary
      const summaryRef = doc(db, "financialSummaries", entryData.userId)
      const reverseUpdates = buildSummaryIncrements(
        entryData.type,
        entryData.amount,
        entryData.category,
        entryData.date,
        -1
      )
      batch.set(summaryRef, reverseUpdates, { merge: true })

      await batch.commit()
    } else {
      // Fallback: delete without summary update (summary will self-heal on next load)
      const { deleteDoc } = await import("firebase/firestore")
      await deleteDoc(entryRef)
    }
  } catch (error) {
    console.error("Error deleting entry:", error)
    throw error
  }
}

/**
 * Get a single entry by ID
 */
export async function getEntry(
  entryId: string
): Promise<(EntryDocument & { id: string }) | null> {
  try {
    const entryRef = doc(db, "entries", entryId)
    const docSnap = await getDoc(entryRef)

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...(docSnap.data() as EntryDocument),
      }
    }

    return null
  } catch (error) {
    console.error("Error fetching entry:", error)
    throw error
  }
}
