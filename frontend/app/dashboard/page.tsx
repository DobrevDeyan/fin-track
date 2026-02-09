"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { useCurrency } from "@/contexts/CurrencyContext"
import { Button } from "@/components/ui/button"
import { ScanLine, Calendar } from "lucide-react"
import { Navbar } from "@/components/Navbar"
import { MetricsCards } from "@/components/dashboard/MetricsCards"
import { TransactionsTable } from "@/components/dashboard/TransactionsTable"
import { AddTransactionDialog } from "@/components/dashboard/AddTransactionDialog"
import { QuickExpenseFAB } from "@/components/dashboard/QuickExpenseFAB"
import { TransactionFilters } from "@/components/dashboard/TransactionFilters"
import { SalaryReminderNotification } from "@/components/SalaryReminderNotification"
import { ReceiptScannerDialog } from "@/components/dashboard/ReceiptScannerDialog"
import { Toast } from "@/components/ui/toast"

// Section components
import {
  SavingsSection,
  BudgetsSection,
  RecurringSection,
  GoalsSection,
} from "@/components/dashboard/sections"

// Dashboard contexts
import {
  DashboardProvider,
  useSavingsContext,
  useBudgetsContext,
  useGoalsContext,
  useRecurringContext,
} from "@/contexts/dashboard"

// Custom hooks (still need entries for transactions)
import { useEntries, type ToastState } from "@/lib/hooks/dashboard"

// Utilities
import { getUniqueCategories } from "@/lib/categories"
import { calculateMetricsWithComparison } from "@/lib/metrics-utils"
import { calculateTotalSavings } from "@/lib/firestore-savings"

// Lazy load charts (Recharts is ~200KB)
const SpendingChart = dynamic(
  () => import("@/components/dashboard/SpendingChart").then((mod) => ({ default: mod.SpendingChart })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
    ssr: false,
  }
)

const CategoryChart = dynamic(
  () => import("@/components/dashboard/CategoryChart").then((mod) => ({ default: mod.CategoryChart })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
    ssr: false,
  }
)

/**
 * Inner dashboard content that uses the feature contexts
 */
function DashboardInnerContent() {
  const t = useTranslations("dashboard")
  const tNav = useTranslations("nav")
  const { user } = useAuth()
  const { userCurrency } = useCurrency()

  // Get data from contexts for metrics calculations
  const { savingsAccounts, loadSavingsAccounts } = useSavingsContext()
  const { loadBudgets } = useBudgetsContext()
  const { loadGoals } = useGoalsContext()
  const { loadRecurringTransactions } = useRecurringContext()

  // Toast state (shared across all features)
  const [toast, setToast] = useState<ToastState | null>(null)
  const showToast = useCallback((newToast: ToastState) => setToast(newToast), [])
  const clearToast = useCallback(() => setToast(null), [])

  // Receipt scanner state
  const [scannerDialogOpen, setScannerDialogOpen] = useState(false)

  // Track if initial load has happened
  const hasLoadedRef = useRef(false)

  // Entries hook (still manages its own state)
  const entriesHook = useEntries({
    userId: user?.uid,
    userCurrency,
    onToast: showToast,
    onSavingsReload: loadSavingsAccounts,
  })

  // Load all data when auth is ready
  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      entriesHook.loadEntries()
      loadBudgets()
      loadRecurringTransactions()
      loadGoals()
      loadSavingsAccounts()
    }
  }, [user, entriesHook.loadEntries, loadBudgets, loadRecurringTransactions, loadGoals, loadSavingsAccounts])

  // Memoized values
  const categories = useMemo(
    () => getUniqueCategories(entriesHook.entries),
    [entriesHook.entries]
  )

  const metrics = useMemo(
    () => calculateMetricsWithComparison(entriesHook.entries),
    [entriesHook.entries]
  )

  const totalSavingsAccounts = useMemo(
    () => calculateTotalSavings(savingsAccounts),
    [savingsAccounts]
  )

  const savingsChange = useMemo(() => {
    const activeSavingsCount = savingsAccounts.filter((acc) => acc.isActive).length
    return {
      change:
        activeSavingsCount > 0
          ? `Total across ${activeSavingsCount} account${activeSavingsCount !== 1 ? "s" : ""}`
          : "No savings accounts yet",
      trend: "neutral" as const,
    }
  }, [savingsAccounts])

  const activeSavingsAccounts = useMemo(
    () =>
      savingsAccounts
        .filter((acc) => acc.isActive)
        .map((acc) => ({
          id: acc.id,
          name: acc.name,
          balance: acc.balance,
          currency: acc.currency,
        })),
    [savingsAccounts]
  )

  const {
    current: { totalIncome, totalExpenses, totalBalance },
    changes: { balance: balanceChange, income: incomeChange, expenses: expensesChange },
  } = metrics

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <div className="container py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("welcome", { name: user?.email?.split("@")[0] || "" })}
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              onClick={() => setScannerDialogOpen(true)}
              className="flex-1 md:flex-initial"
            >
              <ScanLine className="mr-2 h-4 w-4" />
              {t("scanReceipt")}
            </Button>
            <Button variant="outline" asChild className="flex-1 md:flex-initial">
              <a href="/calendar">
                <Calendar className="mr-2 h-4 w-4" />
                {tNav("calendar")}
              </a>
            </Button>
            <Button variant="outline" asChild className="flex-1 md:flex-initial">
              <a href="/reports">{tNav("reports")}</a>
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="mb-8">
          <MetricsCards
            totalBalance={totalBalance}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            savings={totalSavingsAccounts}
            balanceChange={balanceChange}
            incomeChange={incomeChange}
            expensesChange={expensesChange}
            savingsChange={savingsChange}
            userCurrency={userCurrency}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <SpendingChart entries={entriesHook.entries} />
          <CategoryChart entries={entriesHook.entries} />
        </div>

        {/* Transactions Table */}
        <TransactionsTable
          transactions={
            entriesHook.filteredEntries.length > 0
              ? entriesHook.filteredEntries
              : entriesHook.entries
          }
          onAdd={() => entriesHook.setDialogOpen(true)}
          onEdit={entriesHook.handleEdit}
          onDelete={entriesHook.handleDelete}
          filters={
            <TransactionFilters
              entries={entriesHook.entries}
              onFilterChange={entriesHook.setFilteredEntries}
              compact={true}
            />
          }
        />

        {/* Savings Accounts Section - now uses context, minimal props */}
        <SavingsSection userCurrency={userCurrency} />

        {/* Budget Management Section - uses context, only needs entries & categories */}
        <BudgetsSection
          entries={entriesHook.entries}
          categories={categories}
          userCurrency={userCurrency}
        />

        {/* Recurring Transactions Section - uses context, only needs categories */}
        <RecurringSection categories={categories} />

        {/* Financial Goals Section - uses context, only needs categories */}
        <GoalsSection categories={categories} userCurrency={userCurrency} />

        {/* Add/Edit Entry Dialog */}
        <AddTransactionDialog
          open={entriesHook.dialogOpen}
          onOpenChange={entriesHook.handleDialogClose}
          onSubmit={entriesHook.handleAdd}
          editingEntry={entriesHook.editingEntry}
          savingsAccounts={activeSavingsAccounts}
        />

        {/* Receipt Scanner Dialog */}
        <ReceiptScannerDialog
          open={scannerDialogOpen}
          onOpenChange={setScannerDialogOpen}
          onSubmit={entriesHook.handleAdd}
        />

        {/* Quick Expense FAB */}
        <QuickExpenseFAB onSubmit={entriesHook.handleAdd} />

        {/* Salary Reminder Notifications */}
        <SalaryReminderNotification entries={entriesHook.entries} />

        {/* Toast Notification */}
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={clearToast} />
        )}
      </div>
    </div>
  )
}

/**
 * Dashboard content wrapper with auth check
 */
function DashboardContent() {
  const { user, loading: authLoading } = useAuth()

  // Toast state for DashboardProvider
  const [toast, setToast] = useState<ToastState | null>(null)
  const showToast = useCallback((newToast: ToastState) => setToast(newToast), [])
  const clearToast = useCallback(() => setToast(null), [])

  // Client-side mount check
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!authLoading && !user) {
      window.location.href = "/auth/login"
    }
  }, [user, authLoading])

  // Loading state
  if (!mounted || authLoading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardProvider userId={user.uid} onToast={showToast}>
      <DashboardInnerContent />
      {/* Toast at provider level */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}
    </DashboardProvider>
  )
}

export default function DashboardPage() {
  return <DashboardContent />
}
