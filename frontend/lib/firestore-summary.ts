/**
 * Firestore Financial Summary Service (read-only client access)
 *
 * The summary document is SERVER-AUTHORITATIVE: it is written only by the
 * `maintainFinancialSummary` Cloud Function trigger (Admin SDK), and the
 * security rules deny client create/update. The client only READS it — the
 * dashboard subscribes to it live via onSnapshot (see FinancialSummaryContext).
 * To force a rebuild/repair, call the `rebuildMySummary` callable.
 */

import { doc, getDoc, Timestamp } from "firebase/firestore"
import { db } from "./firebase"
import { logger } from "./utils/logger"
import type { FinancialSummaryDocument, MonthlyData } from "./firestore-types"

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
  salary: 0,
  expensesByCategory: {},
  incomeByCategory: {},
}

/**
 * Document reference for a user's financial summary (for reads / onSnapshot).
 */
export function getSummaryRef(userId: string) {
  return doc(db, "financialSummaries", userId)
}

/**
 * Read the financial summary for a user (one-off). Returns null if it doesn't
 * exist yet (e.g. a new user before their first entry, which the trigger creates).
 */
export async function getFinancialSummary(
  userId: string
): Promise<FinancialSummaryDocument | null> {
  try {
    const docSnap = await getDoc(getSummaryRef(userId))
    if (!docSnap.exists()) return null
    return docSnap.data() as FinancialSummaryDocument
  } catch (error) {
    logger.error("[firestore-summary] Error fetching financial summary", error)
    throw error
  }
}

/**
 * Get month data from summary, returning empty defaults if not found
 */
export function getMonthData(
  summary: FinancialSummaryDocument,
  monthKey: string
): MonthlyData {
  const month = (summary.months || {})[monthKey]
  if (!month) return { ...EMPTY_MONTH }

  return {
    income: month.income || 0,
    expenses: month.expenses || 0,
    salary: month.salary || 0,
    expensesByCategory: month.expensesByCategory || {},
    incomeByCategory: month.incomeByCategory || {},
  }
}
