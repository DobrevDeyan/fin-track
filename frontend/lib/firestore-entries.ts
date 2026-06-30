/**
 * Firestore Entries Service
 *
 * Functions for CRUD operations on the entries collection.
 *
 * The financial summary (financialSummaries/{userId}) is NO LONGER written by
 * the client. It is maintained server-side by the `maintainFinancialSummary`
 * Cloud Function trigger, which recomputes it on every entry create/update/
 * delete (including entries created by the recurring-transaction processor).
 * Security rules deny client create/update on that doc. The client only writes
 * entries here; the summary updates a moment later and the dashboard listens to
 * it live (see FinancialSummaryContext).
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
  setDoc,
  deleteDoc,
} from "firebase/firestore"
import { db } from "./firebase"
import { EntryDocument, CreateEntryInput } from "./firestore-types"
import { logger } from "./utils/logger"

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
 * Create a new entry in Firestore.
 * The financial summary is updated by the server-side trigger.
 */
export async function createEntry(
  userId: string,
  entryData: Omit<CreateEntryInput, "userId"> & {
    date: string | Date | Timestamp
    savingsAllocation?: { accountId: string; amount: number; accountName: string }
  }
): Promise<string> {
  try {
    // Build the entry document
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

    // Persist only the entry; the maintainFinancialSummary trigger recomputes
    // financialSummaries/{userId} server-side.
    await setDoc(entryRef, newEntry)

    return entryRef.id
  } catch (error) {
    logger.error("Error creating entry", error, { critical: true })
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
      logger.error("Firestore Index Error (likely missing index for userId + date + createdAt)", indexError)
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
    logger.error("Error fetching entries", error)
    throw error
  }
}

/**
 * Get the user's full entry history (bounded), most-recent first.
 *
 * Used by the transactions filter/search view so that searching and filtering
 * operate over the whole dataset rather than only the first paginated page
 * (see review M1). Pages through Firestore in batches and stops at `maxEntries`
 * to bound read cost; a user with more than that many entries searches their
 * most recent `maxEntries`. Reuses the same userId + date + createdAt index as
 * getUserEntries.
 */
export async function getAllUserEntries(
  userId: string,
  maxEntries: number = 2000
): Promise<(EntryDocument & { id: string })[]> {
  try {
    const entriesRef = collection(db, "entries")
    const { limit, startAfter } = await import("firebase/firestore")
    const pageSize = 500

    const all: (EntryDocument & { id: string })[] = []
    let cursor: unknown = null

    while (all.length < maxEntries) {
      const q = cursor
        ? query(
            entriesRef,
            where("userId", "==", userId),
            orderBy("date", "desc"),
            orderBy("createdAt", "desc"),
            startAfter(cursor),
            limit(pageSize)
          )
        : query(
            entriesRef,
            where("userId", "==", userId),
            orderBy("date", "desc"),
            orderBy("createdAt", "desc"),
            limit(pageSize)
          )

      const snap = await getDocs(q)
      if (snap.empty) break

      snap.forEach((d) =>
        all.push({ ...(d.data() as EntryDocument), id: d.id })
      )

      if (snap.docs.length < pageSize) break
      cursor = snap.docs[snap.docs.length - 1]
    }

    return all.slice(0, maxEntries)
  } catch (error) {
    logger.error("Error fetching all entries", error)
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
    // Anchor bounds at UTC midnight to match how entry dates are stored
    // (UTC-midnight Timestamps) and getCustomDateRange in date-utils. Using
    // local time here dropped/pulled boundary-day entries for non-UTC users. (RA-5)
    const start = Timestamp.fromDate(new Date(startDate + "T00:00:00.000Z"))
    const end = Timestamp.fromDate(new Date(endDate + "T23:59:59.999Z"))

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
    logger.error("Error fetching entries by date range", error)
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
    logger.error("Error fetching entries with receipts", error)
    throw error
  }
}

/**
 * Update an existing entry.
 * The financial summary is updated by the server-side trigger.
 *
 * @param _oldEntry - Deprecated; retained for call-site compatibility. The
 *   summary is now recomputed server-side, so the previous state is unused.
 */
export async function updateEntry(
  entryId: string,
  updates: Partial<Omit<EntryDocument, "id" | "userId" | "createdAt">>,
  _oldEntry?: {
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

    // The summary is maintained server-side by the maintainFinancialSummary
    // trigger, so we only persist the entry change here.
    await updateDoc(entryRef, cleanUpdateData as Record<string, unknown>)
  } catch (error) {
    logger.error("Error updating entry", error, { critical: true })
    throw error
  }
}

/**
 * Delete an entry.
 * The financial summary is updated by the server-side trigger.
 *
 * @param _entryData - Deprecated; retained for call-site compatibility.
 */
export async function deleteEntry(
  entryId: string,
  _entryData?: {
    type: "income" | "expense"
    amount: number
    category: string
    date: Timestamp | Date | string
    userId: string
  }
): Promise<void> {
  try {
    const entryRef = doc(db, "entries", entryId)
    // The summary is maintained server-side by the maintainFinancialSummary
    // trigger, so deleting the entry is all the client needs to do.
    await deleteDoc(entryRef)
  } catch (error) {
    logger.error("Error deleting entry", error, { critical: true })
    throw error
  }
}

/**
 * Check if the user has any salary income entry for the current calendar month.
 * Uses a direct Firestore query — not affected by the 20-entry pagination limit.
 */
export async function hasSalaryEntryThisMonth(userId: string): Promise<boolean> {
  const now = new Date()
  const monthStart = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1))
  const monthEnd = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59))
  const { limit } = await import("firebase/firestore")
  const q = query(
    collection(db, "entries"),
    where("userId", "==", userId),
    where("type", "==", "income"),
    where("category", "==", "Salary"),
    where("date", ">=", monthStart),
    where("date", "<=", monthEnd),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
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
    logger.error("Error fetching entry", error)
    throw error
  }
}
