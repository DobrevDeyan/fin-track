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
    
    if (category === "Salary") {
      updates.totalSalary = increment(delta)
      updates[`months.${monthKey}.salary`] = increment(delta)
    }
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
    // 2. Update financial summary atomically
    //    We use update() because it correctly treats dots in keys as map paths.
    //    If the document doesn't exist, we must initialize it first.
    const summaryRef = doc(db, "financialSummaries", userId)
    const summarySnap = await getDoc(summaryRef)

    if (!summarySnap.exists()) {
      // Re-initialize from scratch if summary is missing
      // This is less common because dashboard loads first, but good for robustness
      const { initializeFinancialSummary } = await import("./firestore-summary")
      await initializeFinancialSummary(userId)
    }

    const summaryUpdates = buildSummaryIncrements(
      entryData.type,
      entryData.amount,
      entryData.category,
      entryDate
    )
    batch.update(summaryRef, summaryUpdates)

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
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(limitCount)
      )
    } else {
      q = query(
        entriesRef,
        where("userId", "==", userId),
        orderBy("date", "desc"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      )
    }

    let querySnapshot
    try {
      querySnapshot = await getDocs(q)
    } catch (indexError: unknown) {
      console.error(
        "Firestore Index Error (likely missing index for userId + date + createdAt):",
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
 * Get entries for a user within a date range (for reports).
 * Queries Firestore server-side — only loads docs in the selected range.
 */
export async function getUserEntriesByDateRange(
  userId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
): Promise<(EntryDocument & { id: string })[]> {
  try {
    const entriesRef = collection(db, "entries")
    const start = Timestamp.fromDate(new Date(startDate + "T00:00:00"))
    const end = Timestamp.fromDate(new Date(endDate + "T23:59:59"))

    const q = query(
      entriesRef,
      where("userId", "==", userId),
      where("date", ">=", start),
      where("date", "<=", end),
      orderBy("date", "desc")
    )

    const querySnapshot = await getDocs(q)
    const entries: (EntryDocument & { id: string })[] = []
    querySnapshot.forEach((docSnap) => {
      entries.push({ ...(docSnap.data() as EntryDocument), id: docSnap.id })
    })
    return entries
  } catch (error) {
    console.error("Error fetching entries by date range:", error)
    throw error
  }
}

/**
 * Get all entries for a user that have a receipt attached
 */
export async function getUserEntriesWithReceipts(
  userId: string
): Promise<(EntryDocument & { id: string })[]> {
  try {
    const entriesRef = collection(db, "entries")
    const { limit } = await import("firebase/firestore")
    // Firestore supports != null to find docs where the field exists and is not null
    const q = query(
      entriesRef,
      where("userId", "==", userId),
      where("receiptUrl", "!=", null),
      orderBy("receiptUrl"),
      orderBy("date", "desc"),
      limit(200)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => ({ ...(d.data() as EntryDocument), id: d.id }))
  } catch (error) {
    console.error("Error fetching entries with receipts:", error)
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

      const oldMonthKey = getMonthKey(oldEntry.date)
      const newType = updates.type ?? oldEntry.type
      const newAmount = updates.amount ?? oldEntry.amount
      const newCategory = updates.category ?? oldEntry.category
      const newDate = updates.date ?? oldEntry.date
      const newMonthKey = getMonthKey(newDate)

      const combinedUpdates: Record<string, FieldValue> = {
        updatedAt: serverTimestamp(),
      }

      // Compute net per-field deltas (reverse old, apply new)
      const fieldDeltas: Record<string, number> = {}

      // Reverse old
      if (oldEntry.type === "income") {
        fieldDeltas[`totalIncome`] = (fieldDeltas[`totalIncome`] || 0) - oldEntry.amount
        fieldDeltas[`months.${oldMonthKey}.income`] = (fieldDeltas[`months.${oldMonthKey}.income`] || 0) - oldEntry.amount
        fieldDeltas[`months.${oldMonthKey}.incomeByCategory.${oldEntry.category}`] = (fieldDeltas[`months.${oldMonthKey}.incomeByCategory.${oldEntry.category}`] || 0) - oldEntry.amount
        if (oldEntry.category === "Salary") {
          fieldDeltas[`totalSalary`] = (fieldDeltas[`totalSalary`] || 0) - oldEntry.amount
          fieldDeltas[`months.${oldMonthKey}.salary`] = (fieldDeltas[`months.${oldMonthKey}.salary`] || 0) - oldEntry.amount
        }
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
        if (newCategory === "Salary") {
          fieldDeltas[`totalSalary`] = (fieldDeltas[`totalSalary`] || 0) + newAmount
          fieldDeltas[`months.${newMonthKey}.salary`] = (fieldDeltas[`months.${newMonthKey}.salary`] || 0) + newAmount
        }
      } else {
        fieldDeltas[`totalExpenses`] = (fieldDeltas[`totalExpenses`] || 0) + newAmount
        fieldDeltas[`months.${newMonthKey}.expenses`] = (fieldDeltas[`months.${newMonthKey}.expenses`] || 0) + newAmount
        fieldDeltas[`months.${newMonthKey}.expensesByCategory.${newCategory}`] = (fieldDeltas[`months.${newMonthKey}.expensesByCategory.${newCategory}`] || 0) + newAmount
      }

      for (const [field, delta] of Object.entries(fieldDeltas)) {
        if (delta !== 0) {
          // Add to combinedUpdates since that's what we eventually use
          combinedUpdates[field] = increment(delta)
        }
      }

      batch.update(summaryRef, combinedUpdates)
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
      batch.update(summaryRef, reverseUpdates)

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
