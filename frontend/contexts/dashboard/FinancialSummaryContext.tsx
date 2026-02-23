"use client"

/**
 * Financial Summary Context
 *
 * Provides the financial summary (single source of truth for metrics)
 * to all dashboard components. Eliminates the need to compute metrics
 * from paginated entries.
 */

import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useState,
  useMemo,
  useEffect,
  useRef,
} from "react"
import {
  getOrCreateSummary,
  getCurrentMonthKey,
  getPreviousMonthKey,
  getMonthData,
} from "@/lib/firestore-summary"
import { calculateChange } from "@/lib/metrics-utils"
import type { FinancialSummaryDocument, MonthlyData } from "@/lib/firestore-types"

interface FinancialSummaryContextValue {
  summary: FinancialSummaryDocument | null
  loading: boolean

  // Pre-computed metrics
  totalBalance: number
  currentMonthIncome: number
  currentMonthExpenses: number
  currentMonthBalance: number
  previousMonthIncome: number
  previousMonthExpenses: number
  previousMonthBalance: number
  currentMonthData: MonthlyData
  previousMonthData: MonthlyData

  // Salary tracking
  currentMonthSalary: number
  previousMonthSalary: number
  totalSalary: number

  // Changes (formatted)
  balanceChange: { change: string; trend: "up" | "down" | "neutral" }
  incomeChange: { change: string; trend: "up" | "down" | "neutral" }
  expensesChange: { change: string; trend: "up" | "down" | "neutral" }
  savingsChange: { change: string; trend: "up" | "down" | "neutral" }
  salaryChange: { change: string; trend: "up" | "down" | "neutral" }

  // Actions
  refreshSummary: () => Promise<void>
}

const FinancialSummaryContext =
  createContext<FinancialSummaryContextValue | null>(null)

interface FinancialSummaryProviderProps {
  children: ReactNode
  userId: string | undefined
}

const EMPTY_MONTH: MonthlyData = {
  income: 0,
  expenses: 0,
  salary: 0,
  expensesByCategory: {},
  incomeByCategory: {},
}

const NEUTRAL_CHANGE = { change: "No change", trend: "neutral" as const }

export function FinancialSummaryProvider({
  children,
  userId,
}: FinancialSummaryProviderProps) {
  const [summary, setSummary] = useState<FinancialSummaryDocument | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSummary = useCallback(async () => {
    if (!userId) {
      console.log("[FinancialSummaryContext] No userId provided to refreshSummary")
      return
    }

    try {
      setLoading(true)
      console.log(`[FinancialSummaryContext] refreshSummary triggered for userId: ${userId}`)
      
      const data = await getOrCreateSummary(userId)
      
      console.log("[FinancialSummaryContext] Summary fetch success:", {
        id: userId,
        totalIncome: data.totalIncome,
        totalExpenses: data.totalExpenses,
        entryCount: data.entryCount,
        hasMonths: !!data.months,
        monthsCount: data.months ? Object.keys(data.months).length : 0,
        currentMonth: getCurrentMonthKey()
      })
      
      setSummary(data)
    } catch (error) {
      console.error("[FinancialSummaryContext] Failed to load summary:", error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const initialLoadDone = useRef(false)

  // Automatically load summary when userId changes
  useEffect(() => {
    if (userId) {
      console.log(`[FinancialSummaryContext] userId active: ${userId}`)
      refreshSummary()
      initialLoadDone.current = true
    } else if (initialLoadDone.current) {
      console.log("[FinancialSummaryContext] userId disappeared, clearing summary")
      setSummary(null)
      setLoading(false)
    }
  }, [userId, refreshSummary])

  const currentMonthKey = getCurrentMonthKey()
  const previousMonthKey = getPreviousMonthKey()

  const currentMonthData = useMemo(
    () => (summary ? getMonthData(summary, currentMonthKey) : EMPTY_MONTH),
    [summary, currentMonthKey]
  )

  const previousMonthData = useMemo(
    () => (summary ? getMonthData(summary, previousMonthKey) : EMPTY_MONTH),
    [summary, previousMonthKey]
  )

  const totalBalance = summary
    ? summary.totalIncome - summary.totalExpenses
    : 0

  const currentMonthIncome = currentMonthData.income
  const currentMonthExpenses = currentMonthData.expenses
  const currentMonthBalance = currentMonthIncome - currentMonthExpenses
  const previousMonthIncome = previousMonthData.income
  const previousMonthExpenses = previousMonthData.expenses
  const previousMonthBalance = previousMonthIncome - previousMonthExpenses

  const currentMonthSalary = currentMonthData.salary || 0
  const previousMonthSalary = previousMonthData.salary || 0
  const totalSalary = summary?.totalSalary || 0

  const balanceChange = useMemo(
    () =>
      summary
        ? calculateChange(currentMonthBalance, previousMonthBalance)
        : NEUTRAL_CHANGE,
    [summary, currentMonthBalance, previousMonthBalance]
  )

  const incomeChange = useMemo(
    () =>
      summary
        ? calculateChange(currentMonthIncome, previousMonthIncome)
        : NEUTRAL_CHANGE,
    [summary, currentMonthIncome, previousMonthIncome]
  )

  const expensesChange = useMemo(
    () =>
      summary
        ? calculateChange(currentMonthExpenses, previousMonthExpenses)
        : NEUTRAL_CHANGE,
    [summary, currentMonthExpenses, previousMonthExpenses]
  )

  const savingsChange = useMemo(
    () =>
      summary
        ? calculateChange(currentMonthBalance, previousMonthBalance)
        : NEUTRAL_CHANGE,
    [summary, currentMonthBalance, previousMonthBalance]
  )

  const salaryChange = useMemo(
    () =>
      summary
        ? calculateChange(currentMonthSalary, previousMonthSalary)
        : NEUTRAL_CHANGE,
    [summary, currentMonthSalary, previousMonthSalary]
  )

  const value: FinancialSummaryContextValue = useMemo(
    () => ({
      summary,
      loading,
      totalBalance,
      currentMonthIncome,
      currentMonthExpenses,
      currentMonthBalance,
      previousMonthIncome,
      previousMonthExpenses,
      previousMonthBalance,
      currentMonthData,
      previousMonthData,
      currentMonthSalary,
      previousMonthSalary,
      totalSalary,
      balanceChange,
      incomeChange,
      expensesChange,
      savingsChange,
      salaryChange,
      refreshSummary,
    }),
    [
      summary,
      loading,
      totalBalance,
      currentMonthIncome,
      currentMonthExpenses,
      currentMonthBalance,
      previousMonthIncome,
      previousMonthExpenses,
      previousMonthBalance,
      currentMonthData,
      previousMonthData,
      currentMonthSalary,
      previousMonthSalary,
      totalSalary,
      balanceChange,
      incomeChange,
      expensesChange,
      savingsChange,
      salaryChange,
      refreshSummary,
    ]
  )

  return (
    <FinancialSummaryContext.Provider value={value}>
      {children}
    </FinancialSummaryContext.Provider>
  )
}

export function useFinancialSummary() {
  const context = useContext(FinancialSummaryContext)
  if (!context) {
    throw new Error(
      "useFinancialSummary must be used within a FinancialSummaryProvider"
    )
  }
  return context
}
