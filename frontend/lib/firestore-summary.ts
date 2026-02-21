/**
 * Firestore Financial Summary Service
 *
 * Manages the per-user financial summary document that serves as
 * the single source of truth for dashboard metrics.
 *
 * The summary is updated atomically with every entry CRUD operation
 * and validated on dashboard load via entry count comparison.
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import type {
  FinancialSummaryDocument,
  MonthlyData,
  EntryDocument,
} from "./firestore-types"

/**
 * Get month key from a Date, Timestamp, or ISO string
 * Returns format "YYYY-MM"
 */
export function getMonthKey(date: Timestamp | Date | string): string {
  let d: Date
  if (date instanceof Timestamp) {
    d = date.toDate()
  } else if (date instanceof Date) {
    d = date
  } else {
    d = new Date(date)
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

/**
 * Get the current month key
 */
export function getCurrentMonthKey(): string {
  return getMonthKey(new Date())
}

/**
 * Get the previous month key
 */
export function getPreviousMonthKey(): string {
  const now = new Date()
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const d = new Date(prevYear, prevMonth, 1)
  return getMonthKey(d)
}

const EMPTY_MONTH: MonthlyData = {
  income: 0,
  expenses: 0,
  expensesByCategory: {},
  incomeByCategory: {},
}

/**
 * Get the financial summary document reference for a user
 */
function getSummaryRef(userId: string) {
  return doc(db, "financialSummaries", userId)
}

/**
 * Read the financial summary for a user
 */
export async function getFinancialSummary(
  userId: string
): Promise<FinancialSummaryDocument | null> {
  try {
    const summaryRef = getSummaryRef(userId)
    const docSnap = await getDoc(summaryRef)

    if (!docSnap.exists()) {
      return null
    }

    return docSnap.data() as FinancialSummaryDocument
  } catch (error) {
    console.error("Error fetching financial summary:", error)
    throw error
  }
}

/**
 * Get ALL entries for a user (no pagination) - used for summary initialization
 */
async function getAllUserEntries(
  userId: string
): Promise<(EntryDocument & { id: string })[]> {
  const entriesRef = collection(db, "entries")
  const q = query(entriesRef, where("userId", "==", userId))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as EntryDocument),
  }))
}

/**
 * Compute a financial summary from a list of entries
 */
function computeSummaryFromEntries(
  userId: string,
  entries: (EntryDocument & { id: string })[]
): FinancialSummaryDocument {
  let totalIncome = 0
  let totalExpenses = 0
  const months: Record<string, MonthlyData> = {}

  for (const entry of entries) {
    const monthKey = getMonthKey(entry.date)

    if (!months[monthKey]) {
      months[monthKey] = {
        income: 0,
        expenses: 0,
        expensesByCategory: {},
        incomeByCategory: {},
      }
    }

    const month = months[monthKey]

    if (entry.type === "income") {
      totalIncome += entry.amount
      month.income += entry.amount
      month.incomeByCategory[entry.category] =
        (month.incomeByCategory[entry.category] || 0) + entry.amount
    } else {
      totalExpenses += entry.amount
      month.expenses += entry.amount
      month.expensesByCategory[entry.category] =
        (month.expensesByCategory[entry.category] || 0) + entry.amount
    }
  }

  return {
    userId,
    totalIncome,
    totalExpenses,
    entryCount: entries.length,
    months,
    updatedAt: Timestamp.now(),
  }
}

/**
 * Initialize (or rebuild) the financial summary from all entries
 */
export async function initializeFinancialSummary(
  userId: string
): Promise<FinancialSummaryDocument> {
  try {
    const allEntries = await getAllUserEntries(userId)
    const summary = computeSummaryFromEntries(userId, allEntries)

    const summaryRef = getSummaryRef(userId)
    await setDoc(summaryRef, {
      ...summary,
      updatedAt: serverTimestamp(),
    })

    return summary
  } catch (error) {
    console.error("Error initializing financial summary:", error)
    throw error
  }
}

/**
 * Validate if the summary is stale by comparing entry counts
 * Uses getCountFromServer() which is a cheap metadata query
 */
async function isSummaryStale(
  userId: string,
  summary: FinancialSummaryDocument
): Promise<boolean> {
  try {
    const entriesRef = collection(db, "entries")
    const q = query(entriesRef, where("userId", "==", userId))
    const snapshot = await getCountFromServer(q)
    const actualCount = snapshot.data().count

    return actualCount !== summary.entryCount
  } catch (error) {
    console.error("Error validating summary:", error)
    // If we can't validate, assume it's fine to avoid blocking
    return false
  }
}

/**
 * Get or create the financial summary, rebuilding if stale
 * This is the main entry point for the dashboard
 */
export async function getOrCreateSummary(
  userId: string
): Promise<FinancialSummaryDocument> {
  const existing = await getFinancialSummary(userId)

  if (!existing) {
    return initializeFinancialSummary(userId)
  }

  const stale = await isSummaryStale(userId, existing)
  if (stale) {
    return initializeFinancialSummary(userId)
  }

  return existing
}

/**
 * Get month data from summary, returning empty defaults if not found
 */
export function getMonthData(
  summary: FinancialSummaryDocument,
  monthKey: string
): MonthlyData {
  return summary.months[monthKey] || { ...EMPTY_MONTH }
}
