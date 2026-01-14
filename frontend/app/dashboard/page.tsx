"use client"

import { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic"
import { useAuth } from "@/contexts/AuthContext"
import { useCurrency } from "@/contexts/CurrencyContext"
import { Button } from "@/components/ui/button"
import { LogOut, Plus } from "lucide-react"
import { MetricsCards } from "@/components/dashboard/MetricsCards"
import { TransactionsTable } from "@/components/dashboard/TransactionsTable"
import { AddTransactionDialog } from "@/components/dashboard/AddTransactionDialog"
import { QuickExpenseFAB } from "@/components/dashboard/QuickExpenseFAB"
import { TransactionFilters } from "@/components/dashboard/TransactionFilters"
import { SalaryReminderNotification } from "@/components/SalaryReminderNotification"
import { BudgetList } from "@/components/dashboard/BudgetList"
import { BudgetDialog } from "@/components/dashboard/BudgetDialog"
import { RecurringTransactionList } from "@/components/dashboard/RecurringTransactionList"
import { RecurringTransactionDialog } from "@/components/dashboard/RecurringTransactionDialog"
import { GoalList } from "@/components/dashboard/GoalList"
import { GoalDialog } from "@/components/dashboard/GoalDialog"
import { SavingsAccountList } from "@/components/dashboard/SavingsAccountList"
import { SavingsAccountDialog } from "@/components/dashboard/SavingsAccountDialog"
import { Navbar } from "@/components/Navbar"
import { CollapsibleSection } from "@/components/ui/collapsible-section"

// Lazy load charts (Recharts is ~200KB) - only load when needed
const SpendingChart = dynamic(() => import("@/components/dashboard/SpendingChart").then(mod => ({ default: mod.SpendingChart })), {
  loading: () => (
    <div className="flex items-center justify-center h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
  ssr: false, // Disable SSR for charts (client-only)
});
const CategoryChart = dynamic(() => import("@/components/dashboard/CategoryChart").then(mod => ({ default: mod.CategoryChart })), {
  loading: () => (
    <div className="flex items-center justify-center h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
  ssr: false, // Disable SSR for charts (client-only)
});
import { createEntry, getUserEntries, deleteEntry, updateEntry } from "@/lib/firestore-entries"
import {
  createBudget,
  getUserBudgets,
  deleteBudget,
  updateBudget,
} from "@/lib/firestore-budgets"
import {
  createRecurringTransaction,
  getUserRecurringTransactions,
  deleteRecurringTransaction,
  updateRecurringTransaction,
  calculateNextDate,
} from "@/lib/firestore-recurring"
import {
  createGoal,
  getUserGoals,
  deleteGoal,
  updateGoal,
} from "@/lib/firestore-goals"
import {
  createSavingsAccount,
  getUserSavingsAccounts,
  deleteSavingsAccount,
  updateSavingsAccount,
  addToSavingsAccount,
  withdrawFromSavingsAccount,
  calculateTotalSavings,
} from "@/lib/firestore-savings"
import { Timestamp } from "firebase/firestore"
import { Toast } from "@/components/ui/toast"
import { exportEntriesToCSV } from "@/lib/export-utils"
import { formatCurrency } from "@/lib/currency-utils"
import { getUniqueCategories } from "@/lib/categories"
import {
  calculateMetricsWithComparison,
  getCurrentMonthEntries,
  getPreviousMonthEntries,
} from "@/lib/metrics-utils"
import { getMonthName, getPreviousMonth } from "@/lib/date-utils"
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "@/lib/constants/validation.constants"

interface Entry {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: "income" | "expense"
  currency?: string // Currency of the entry
  notes?: string
}

interface Budget {
  id: string
  name: string
  category?: string
  amount: number
  currency: string
  period: "weekly" | "monthly" | "yearly"
  startDate: string // Always converted to ISO string when loaded
  endDate: string // Always converted to ISO string when loaded
  isActive: boolean
  alertThreshold?: number
}

function DashboardContent() {
  const { user, loading, logout } = useAuth()
  const { userCurrency } = useCurrency() // Must be called before any conditional returns
  const [entries, setEntries] = useState<Entry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const salaryReminderShown = useRef(false)
  const budgetReminderShown = useRef(false)
  const hasLoadedRef = useRef(false)
  
  // Budget state
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [budgetsLoading, setBudgetsLoading] = useState(true)
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)

  // Recurring transactions state
  const [recurringTransactions, setRecurringTransactions] = useState<
    (import("@/lib/firestore-types").RecurringEntryDocument & { id: string })[]
  >([])
  const [recurringLoading, setRecurringLoading] = useState(true)
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<
    (import("@/lib/firestore-types").RecurringEntryDocument & { id: string }) | null
  >(null)

  // Goals state
  const [goals, setGoals] = useState<
    (import("@/lib/firestore-types").GoalDocument & { id: string })[]
  >([])
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<
    (import("@/lib/firestore-types").GoalDocument & { id: string }) | null
  >(null)

  // Savings accounts state
  const [savingsAccounts, setSavingsAccounts] = useState<
    (import("@/lib/firestore-types").SavingsAccountDocument & { id: string })[]
  >([])
  const [savingsAccountsLoading, setSavingsAccountsLoading] = useState(true)
  const [savingsAccountDialogOpen, setSavingsAccountDialogOpen] = useState(false)
  const [editingSavingsAccount, setEditingSavingsAccount] = useState<
    (import("@/lib/firestore-types").SavingsAccountDocument & { id: string }) | null
  >(null)

  // Load entries from Firestore - ensure it runs on mount and when auth state is ready
  useEffect(() => {
    // Always reset loading states on mount to prevent stuck states from previous renders
    const isMounted = !hasLoadedRef.current
    if (isMounted) {
      hasLoadedRef.current = true
    }
    
    // Load data when auth is ready and user is available
    if (!loading && user) {
      // Always reload data on mount or when user changes
      if (isMounted || entries.length === 0) {
        loadEntries()
      }
      if (isMounted || budgets.length === 0) {
        loadBudgets()
      }
      if (isMounted || recurringTransactions.length === 0) {
        loadRecurringTransactions()
      }
      if (isMounted || goals.length === 0) {
        loadGoals()
      }
      if (isMounted || savingsAccounts.length === 0) {
        loadSavingsAccounts()
      }
    } else if (!loading && !user) {
      // Reset loading states if no user
      setEntriesLoading(false)
      setBudgetsLoading(false)
      setRecurringLoading(false)
      setGoalsLoading(false)
      setSavingsAccountsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading])
  
  // Safety timeout - ensure loading states don't get stuck forever
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (entriesLoading && user && !loading) {
        console.warn("Entries loading timeout - forcing to false")
        setEntriesLoading(false)
      }
      if (budgetsLoading && user && !loading) {
        console.warn("Budgets loading timeout - forcing to false")
        setBudgetsLoading(false)
      }
      if (recurringLoading && user && !loading) {
        console.warn("Recurring transactions loading timeout - forcing to false")
        setRecurringLoading(false)
      }
      if (goalsLoading && user && !loading) {
        console.warn("Goals loading timeout - forcing to false")
        setGoalsLoading(false)
      }
      if (savingsAccountsLoading && user && !loading) {
        console.warn("Savings accounts loading timeout - forcing to false")
        setSavingsAccountsLoading(false)
      }
    }, 15000) // 15 second timeout
    
    return () => clearTimeout(timeout)
  }, [entriesLoading, budgetsLoading, recurringLoading, goalsLoading, savingsAccountsLoading, user, loading])

  // Load recurring transactions from Firestore
  const loadRecurringTransactions = async () => {
    if (!user) return

    try {
      setRecurringLoading(true)
      const firestoreRecurring = await getUserRecurringTransactions(user.uid)
      setRecurringTransactions(firestoreRecurring)
    } catch (error) {
      console.error("Error loading recurring transactions:", error)
      setRecurringTransactions([])
    } finally {
      setRecurringLoading(false)
    }
  }

  // Load goals from Firestore
  const loadGoals = async () => {
    if (!user) return

    try {
      setGoalsLoading(true)
      const firestoreGoals = await getUserGoals(user.uid)
      setGoals(firestoreGoals)
    } catch (error) {
      console.error("Error loading goals:", error)
      setGoals([])
    } finally {
      setGoalsLoading(false)
    }
  }

  // Load savings accounts from Firestore
  const loadSavingsAccounts = async () => {
    if (!user) return

    try {
      setSavingsAccountsLoading(true)
      const accounts = await getUserSavingsAccounts(user.uid)
      setSavingsAccounts(accounts)
    } catch (error) {
      console.error("Error loading savings accounts:", error)
      setSavingsAccounts([])
    } finally {
      setSavingsAccountsLoading(false)
    }
  }

  // Load budgets from Firestore
  const loadBudgets = async () => {
    if (!user) return

    try {
      setBudgetsLoading(true)
      const firestoreBudgets = await getUserBudgets(user.uid)
      
      // Convert Firestore budgets to local format
      const convertedBudgets: Budget[] = firestoreBudgets.map((budget) => ({
        id: budget.id,
        name: budget.name,
        category: budget.category,
        amount: budget.amount,
        currency: budget.currency,
        period: budget.period,
        startDate: budget.startDate instanceof Timestamp 
          ? budget.startDate.toDate().toISOString()
          : typeof budget.startDate === "string"
          ? budget.startDate
          : new Date(budget.startDate as any).toISOString(),
        endDate: budget.endDate instanceof Timestamp 
          ? budget.endDate.toDate().toISOString()
          : typeof budget.endDate === "string"
          ? budget.endDate
          : new Date(budget.endDate as any).toISOString(),
        isActive: budget.isActive,
        alertThreshold: budget.alertThreshold,
      }))
      
      setBudgets(convertedBudgets)
    } catch (error) {
      console.error("Error loading budgets:", error)
      // Set empty array on error so section still shows
      setBudgets([])
    } finally {
      setBudgetsLoading(false)
    }
  }

  // Check for salary reminder (1st-5th of current month, or 28th-31st for next month)
  useEffect(() => {
    if (!user || loading || entriesLoading || salaryReminderShown.current) {
      console.log("[Salary Reminder] Skipping check:", {
        user: !!user,
        loading,
        entriesLoading,
        alreadyShown: salaryReminderShown.current
      })
      return
    }

    const checkSalaryReminder = () => {
      const today = new Date()
      const currentDay = today.getDate()
      const currentMonth = today.getMonth()
      const currentYear = today.getFullYear()

      console.log("[Salary Reminder] Checking reminder:", {
        currentDay,
        currentMonth: currentMonth + 1, // 0-indexed to 1-indexed
        currentYear,
        entriesCount: entries.length
      })

      // Check if we're in a reminder period
      // 1st-5th: remind about CURRENT month (to set up budget early)
      // 28th-31st: remind about NEXT month (to prepare for upcoming month)
      const isReminderPeriod = currentDay >= 28 || currentDay <= 5

      if (!isReminderPeriod) {
        console.log("[Salary Reminder] Not in reminder period (day must be 1-5 or 28-31)")
        return
      }

      // Determine which month to check for salary
      let monthToCheck = currentMonth
      let yearToCheck = currentYear

      if (currentDay <= 5) {
        // Early in month: remind about CURRENT month
        monthToCheck = currentMonth
        yearToCheck = currentYear
        console.log("[Salary Reminder] Early in month - checking CURRENT month:", {
          month: monthToCheck + 1,
          year: yearToCheck
        })
      } else if (currentDay >= 28) {
        // Late in month: remind about NEXT month
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
        monthToCheck = nextMonth
        yearToCheck = nextYear
        console.log("[Salary Reminder] Late in month - checking NEXT month:", {
          month: monthToCheck + 1,
          year: yearToCheck
        })
      }

      // Check if user has a salary entry for the month we're checking
      const salaryEntries = entries.filter((entry) => {
        if (entry.type !== "income" || entry.category.toLowerCase() !== "salary") {
          return false
        }
        const entryDate = new Date(entry.date)
        return (
          entryDate.getMonth() === monthToCheck &&
          entryDate.getFullYear() === yearToCheck
        )
      })

      const hasSalaryEntry = salaryEntries.length > 0

      console.log("[Salary Reminder] Salary check result:", {
        monthToCheck: monthToCheck + 1,
        yearToCheck,
        hasSalaryEntry,
        salaryEntriesFound: salaryEntries.length,
        salaryEntries: salaryEntries.map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          date: e.date
        }))
      })

      // Show reminder if no salary entry found (only once per session)
      if (!hasSalaryEntry && !salaryReminderShown.current) {
        const monthName = getMonthName(new Date(yearToCheck, monthToCheck))
        console.log("[Salary Reminder] Showing reminder for:", monthName)
        setToast({
          message: `💼 Reminder: Please enter your ${monthName} salary to track your monthly budget!`,
          type: "success",
        })
        salaryReminderShown.current = true
      } else if (hasSalaryEntry) {
        console.log("[Salary Reminder] Salary entry found - no reminder needed")
      }
    }

    // Small delay to ensure entries are loaded
    const timer = setTimeout(checkSalaryReminder, 1000)
    return () => clearTimeout(timer)
  }, [user, loading, entriesLoading, entries])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!loading && !user) {
      window.location.href = "/auth/login"
    }
  }, [user, loading])

  const loadEntries = async () => {
    if (!user) return

    try {
      setEntriesLoading(true)
      const firestoreEntries = await getUserEntries(user.uid)
      
      // Convert Firestore entries to local format
      const convertedEntries: Entry[] = firestoreEntries.map((entry) => ({
        id: entry.id,
        description: entry.description,
        amount: entry.amount,
        category: entry.category,
        date: entry.date instanceof Timestamp 
          ? entry.date.toDate().toISOString()
          : typeof entry.date === "string"
          ? entry.date
          : new Date(entry.date as any).toISOString(),
        type: entry.type,
        currency: entry.currency,
        notes: entry.notes,
      }))
      
      setEntries(convertedEntries)
      setFilteredEntries(convertedEntries) // Initialize filtered entries
    } catch (error) {
      console.error("Error loading entries:", error)
    } finally {
      setEntriesLoading(false)
    }
  }

  const handleExportCSV = () => {
    try {
      exportEntriesToCSV(filteredEntries.length > 0 ? filteredEntries : entries)
      setToast({
        message: SUCCESS_MESSAGES.CSV_EXPORTED,
        type: "success",
      })
    } catch (error) {
      console.error("Error exporting CSV:", error)
      setToast({
        message: ERROR_MESSAGES.EXPORT_FAILED,
        type: "error",
      })
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      if (typeof window !== "undefined") {
        window.location.href = "/"
      }
    } catch (error) {
      console.error("Failed to logout:", error)
    }
  }

  const handleAddEntry = async (data: {
    description: string
    amount: number
    category: string
    type: "income" | "expense"
    date: string
    notes?: string
    allocateToSavings?: {
      accountId: string
      amount: number
    }
  }) => {
    if (!user) return

    try {
      if (editingEntry) {
        // Update existing entry
        await updateEntry(editingEntry.id, {
          type: data.type,
          amount: data.amount,
          description: data.description,
          category: data.category,
          date: data.date as any, // Will be converted to Timestamp in updateEntry
          notes: data.notes,
        })

        // Reload entries from Firestore
        await loadEntries()

        setToast({
          message: SUCCESS_MESSAGES.ENTRY_UPDATED,
          type: "success",
        })
        setEditingEntry(null)
      } else {
        // Calculate the amount that should count towards balance (exclude savings allocation)
        const allocatedToSavings = data.allocateToSavings?.amount || 0
        const balanceAmount = data.type === "income" 
          ? Math.max(0, data.amount - allocatedToSavings) // Ensure non-negative
          : data.amount

        // If income with savings allocation, handle savings FIRST, then entry
        if (data.type === "income" && data.allocateToSavings) {
          try {
            // Add to savings account FIRST
            await addToSavingsAccount(
              data.allocateToSavings.accountId,
              data.allocateToSavings.amount
            )
            await loadSavingsAccounts()
            
            // Only create entry if there's a remaining amount after savings allocation
            // (This ensures allocated savings don't affect total balance)
            if (balanceAmount > 0) {
              await createEntry(user.uid, {
                type: data.type,
                amount: balanceAmount, // Use remaining amount, not full amount
                currency: userCurrency,
                description: data.description,
                category: data.category,
                date: data.date,
                notes: data.notes,
              })
              await loadEntries()
              
              setToast({
                message: `Entry added (${balanceAmount.toFixed(2)} ${userCurrency} to balance) and ${data.allocateToSavings.amount.toFixed(2)} ${userCurrency} allocated to savings`,
                type: "success",
              })
            } else {
              // No entry created - 100% allocated to savings
              setToast({
                message: `${data.allocateToSavings.amount.toFixed(2)} ${userCurrency} allocated to savings (no entry created as 100% allocated to savings)`,
                type: "success",
              })
            }
          } catch (savingsError: any) {
            console.error("Error allocating to savings:", savingsError)
            // If savings allocation fails, still create the entry (fallback)
            if (balanceAmount > 0) {
              await createEntry(user.uid, {
                type: data.type,
                amount: balanceAmount,
                currency: userCurrency,
                description: data.description,
                category: data.category,
                date: data.date,
                notes: data.notes,
              })
              await loadEntries()
            }
            setToast({
              message: `Failed to allocate to savings: ${savingsError.message}. Entry may have been created with full amount.`,
              type: "error",
            })
          }
        } else {
          // Regular entry (no savings allocation)
          await createEntry(user.uid, {
            type: data.type,
            amount: balanceAmount,
            currency: userCurrency,
            description: data.description,
            category: data.category,
            date: data.date,
            notes: data.notes,
          })
          
          // Reload entries from Firestore to get the complete data
          await loadEntries()
          
          // Show success message
          setToast({
            message: SUCCESS_MESSAGES.ENTRY_ADDED(data.type),
            type: "success",
          })
        }
      }
    } catch (error: any) {
      console.error("Error saving entry:", error)
      setToast({
        message: error.message || ERROR_MESSAGES.SAVE_FAILED,
        type: "error",
      })
      throw error // Re-throw to show error in UI
    }
  }

  const handleEditEntry = (id: string) => {
    const entry = entries.find((e) => e.id === id)
    if (entry) {
      setEditingEntry(entry)
      setDialogOpen(true)
    }
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingEntry(null)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    if (!user) return

    try {
      // Delete from Firestore
      await deleteEntry(id)
      
      // Update local state
      setEntries(entries.filter((e) => e.id !== id))
      
      // Show success message
      setToast({
        message: "Entry deleted successfully!",
        type: "success",
      })
    } catch (error: any) {
      console.error("Error deleting entry:", error)
      setToast({
        message: ERROR_MESSAGES.DELETE_FAILED,
        type: "error",
      })
    }
  }

  // Budget handlers
  const handleAddBudget = async (data: {
    name: string
    category?: string
    amount: number
    currency: string
    period: "weekly" | "monthly" | "yearly"
    startDate: string
    endDate: string
    isActive: boolean
    alertThreshold?: number
  }) => {
    if (!user) return

    try {
      if (editingBudget) {
        // Update existing budget
        await updateBudget(editingBudget.id, {
          name: data.name,
          category: data.category,
          amount: data.amount,
          currency: data.currency,
          period: data.period,
          startDate: data.startDate as any,
          endDate: data.endDate as any,
          isActive: data.isActive,
          alertThreshold: data.alertThreshold,
        })

        await loadBudgets()

        setToast({
          message: SUCCESS_MESSAGES.BUDGET_UPDATED,
          type: "success",
        })
        setEditingBudget(null)
      } else {
        // Create new budget
        await createBudget(user.uid, {
          name: data.name,
          category: data.category,
          amount: data.amount,
          currency: data.currency,
          period: data.period,
          startDate: data.startDate as any, // Will be converted to Timestamp in createBudget
          endDate: data.endDate as any, // Will be converted to Timestamp in createBudget
          isActive: data.isActive,
          alertThreshold: data.alertThreshold,
        })

        await loadBudgets()

        setToast({
          message: SUCCESS_MESSAGES.BUDGET_CREATED,
          type: "success",
        })
      }
    } catch (error: any) {
      console.error("Error saving budget:", error)
      setToast({
        message: error.message || ERROR_MESSAGES.SAVE_FAILED,
        type: "error",
      })
      throw error
    }
  }

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget)
    setBudgetDialogOpen(true)
  }

  const handleDeleteBudget = async (budgetId: string) => {
    if (!user) return

    try {
      await deleteBudget(budgetId)
      await loadBudgets()
      
      setToast({
        message: SUCCESS_MESSAGES.BUDGET_DELETED,
        type: "success",
      })
    } catch (error: any) {
      console.error("Error deleting budget:", error)
      setToast({
        message: ERROR_MESSAGES.DELETE_FAILED,
        type: "error",
      })
    }
  }

  const handleBudgetDialogClose = (open: boolean) => {
    setBudgetDialogOpen(open)
    if (!open) {
      setEditingBudget(null)
    }
  }

  // Recurring transaction handlers
  const handleAddRecurringTransaction = async (data: {
    name: string
    amount: number
    type: "income" | "expense"
    category: string
    frequency: "weekly" | "monthly" | "yearly"
    nextDate: string
    isActive: boolean
  }) => {
    if (!user) return

    try {
      if (editingRecurring) {
        // Update existing recurring transaction
        await updateRecurringTransaction(editingRecurring.id, {
          name: data.name,
          amount: data.amount,
          type: data.type,
          category: data.category,
          frequency: data.frequency,
          nextDate: data.nextDate as any,
          isActive: data.isActive,
        })

        await loadRecurringTransactions()

        setToast({
          message: SUCCESS_MESSAGES.RECURRING_UPDATED,
          type: "success",
        })
        setEditingRecurring(null)
      } else {
        // Create new recurring transaction
        await createRecurringTransaction(user.uid, {
          name: data.name,
          amount: data.amount,
          type: data.type,
          category: data.category,
          frequency: data.frequency,
          nextDate: data.nextDate as any,
          isActive: data.isActive,
        })

        await loadRecurringTransactions()

        setToast({
          message: "Recurring transaction created successfully!",
          type: "success",
        })
      }
    } catch (error: any) {
      console.error("Error saving recurring transaction:", error)
      setToast({
        message: error.message || ERROR_MESSAGES.SAVE_FAILED,
        type: "error",
      })
      throw error
    }
  }

  const handleEditRecurring = (
    recurring: import("@/lib/firestore-types").RecurringEntryDocument & { id: string }
  ) => {
    setEditingRecurring(recurring)
    setRecurringDialogOpen(true)
  }

  const handleDeleteRecurring = async (recurringId: string) => {
    if (!user) return

    try {
      await deleteRecurringTransaction(recurringId)
      await loadRecurringTransactions()

      setToast({
        message: SUCCESS_MESSAGES.RECURRING_DELETED,
        type: "success",
      })
    } catch (error: any) {
      console.error("Error deleting recurring transaction:", error)
      setToast({
        message: "Failed to delete recurring transaction. Please try again.",
        type: "error",
      })
    }
  }

  const handleRecurringDialogClose = (open: boolean) => {
    setRecurringDialogOpen(open)
    if (!open) {
      setEditingRecurring(null)
    }
  }

  // Goal handlers
  const handleAddGoal = async (data: {
    name: string
    targetAmount: number
    currentAmount: number
    currency: string
    deadline?: string
    category?: string
    description?: string
    isActive: boolean
  }) => {
    if (!user) return

    try {
      if (editingGoal) {
        // Update existing goal
        await updateGoal(editingGoal.id, {
          name: data.name,
          targetAmount: data.targetAmount,
          currentAmount: data.currentAmount,
          currency: data.currency,
          deadline: data.deadline as any,
          category: data.category,
          description: data.description,
          isActive: data.isActive,
        })

        await loadGoals()

        setToast({
          message: SUCCESS_MESSAGES.GOAL_UPDATED,
          type: "success",
        })
        setEditingGoal(null)
      } else {
        // Create new goal
        await createGoal(user.uid, {
          name: data.name,
          targetAmount: data.targetAmount,
          currentAmount: data.currentAmount,
          currency: data.currency,
          deadline: data.deadline as any,
          category: data.category,
          description: data.description,
          isActive: data.isActive,
        })

        await loadGoals()

        setToast({
          message: "Goal created successfully!",
          type: "success",
        })
      }
    } catch (error: any) {
      console.error("Error saving goal:", error)
      setToast({
        message: error.message || ERROR_MESSAGES.SAVE_FAILED,
        type: "error",
      })
      throw error
    }
  }

  const handleEditGoal = (goal: import("@/lib/firestore-types").GoalDocument & { id: string }) => {
    setEditingGoal(goal)
    setGoalDialogOpen(true)
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return

    try {
      await deleteGoal(goalId)
      await loadGoals()

      setToast({
        message: SUCCESS_MESSAGES.GOAL_DELETED,
        type: "success",
      })
    } catch (error: any) {
      console.error("Error deleting goal:", error)
      setToast({
        message: "Failed to delete goal. Please try again.",
        type: "error",
      })
    }
  }

  const handleGoalDialogClose = (open: boolean) => {
    setGoalDialogOpen(open)
    if (!open) {
      setEditingGoal(null)
    }
  }

  // Savings accounts handlers
  const handleAddSavingsAccount = async (data: {
    name: string
    balance: number
    currency: string
    description?: string
    color?: string
    icon?: string
    isActive: boolean
  }) => {
    if (!user) return

    try {
      await createSavingsAccount(user.uid, data)
      await loadSavingsAccounts()

      setToast({
        message: "Savings account created successfully",
        type: "success",
      })
    } catch (error: any) {
      console.error("Error creating savings account:", error)
      setToast({
        message: "Failed to create savings account. Please try again.",
        type: "error",
      })
    }
  }

  const handleSubmitSavingsAccount = async (data: {
    name: string
    balance: number
    currency: string
    description?: string
    color?: string
    icon?: string
    isActive: boolean
  }) => {
    if (editingSavingsAccount) {
      await handleUpdateSavingsAccount(data)
    } else {
      await handleAddSavingsAccount(data)
    }
  }

  const handleEditSavingsAccount = (
    account: import("@/lib/firestore-types").SavingsAccountDocument & { id: string }
  ) => {
    setEditingSavingsAccount(account)
    setSavingsAccountDialogOpen(true)
  }

  const handleUpdateSavingsAccount = async (data: {
    name: string
    balance: number
    currency: string
    description?: string
    color?: string
    icon?: string
    isActive: boolean
  }) => {
    if (!user || !editingSavingsAccount) return

    try {
      await updateSavingsAccount(editingSavingsAccount.id, data)
      await loadSavingsAccounts()

      setToast({
        message: "Savings account updated successfully",
        type: "success",
      })
    } catch (error: any) {
      console.error("Error updating savings account:", error)
      setToast({
        message: "Failed to update savings account. Please try again.",
        type: "error",
      })
    }
  }

  const handleDeleteSavingsAccount = async (accountId: string) => {
    if (!user) return

    try {
      await deleteSavingsAccount(accountId)
      await loadSavingsAccounts()

      setToast({
        message: "Savings account deleted successfully",
        type: "success",
      })
    } catch (error: any) {
      console.error("Error deleting savings account:", error)
      setToast({
        message: "Failed to delete savings account. Please try again.",
        type: "error",
      })
    }
  }

  const handleAddMoneyToSavings = async (accountId: string, amount: number) => {
    if (!user) return

    try {
      await addToSavingsAccount(accountId, amount)
      await loadSavingsAccounts()

      setToast({
        message: "Money added to savings account",
        type: "success",
      })
    } catch (error: any) {
      console.error("Error adding money to savings account:", error)
      setToast({
        message: "Failed to add money. Please try again.",
        type: "error",
      })
    }
  }

  const handleWithdrawMoneyFromSavings = async (accountId: string, amount: number) => {
    if (!user) return

    try {
      await withdrawFromSavingsAccount(accountId, amount)
      await loadSavingsAccounts()

      setToast({
        message: "Money withdrawn from savings account",
        type: "success",
      })
    } catch (error: any) {
      console.error("Error withdrawing money from savings account:", error)
      const errorMessage = error?.message?.includes("Insufficient")
        ? "Insufficient balance in savings account"
        : "Failed to withdraw money. Please try again."
      setToast({
        message: errorMessage,
        type: "error",
      })
    }
  }

  const handleSavingsAccountDialogClose = (open: boolean) => {
    setSavingsAccountDialogOpen(open)
    if (!open) {
      setEditingSavingsAccount(null)
    }
  }

  // Get unique categories from entries
  const categories = getUniqueCategories(entries)

  // Client-side mount check to prevent hydration issues
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading only on initial auth load, not on data loading
  if (!mounted || loading) {
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

  // Calculate metrics with comparison to previous month
  const metrics = calculateMetricsWithComparison(entries)
  const {
    current: {
      totalIncome,
      totalExpenses,
      totalBalance,
      savings,
    },
    changes: {
      balance: balanceChange,
      income: incomeChange,
      expenses: expensesChange,
      savings: savingsChange,
    },
  } = metrics

  // Calculate total savings from savings accounts
  const totalSavingsAccounts = calculateTotalSavings(savingsAccounts)

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <div className="container py-8 px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {user.email?.split("@")[0]}
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" asChild className="flex-1 md:flex-initial">
              <a href="/reports">Reports</a>
            </Button>
            {/* <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button> */}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="mb-8">
          <MetricsCards
            totalBalance={totalBalance}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            savings={savings}
            balanceChange={balanceChange}
            incomeChange={incomeChange}
            expensesChange={expensesChange}
            savingsChange={savingsChange}
            userCurrency={userCurrency}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <SpendingChart entries={entries} />
          <CategoryChart entries={entries} />
        </div>

        {/* Entries Table */}
        <TransactionsTable
          transactions={filteredEntries.length > 0 ? filteredEntries : entries}
          onAdd={() => setDialogOpen(true)}
          onEdit={handleEditEntry}
          onDelete={handleDeleteEntry}  
        />

        {/* Transaction Filters */}
        <TransactionFilters
          entries={entries}
          onFilterChange={setFilteredEntries}
          onExport={handleExportCSV}
        />


        {/* Savings Accounts Section */}
        <CollapsibleSection
          title="Savings Accounts"
          description={`Track your savings separately from your spending balance${savingsAccounts.length > 0 ? ` • Total: ${formatCurrency(calculateTotalSavings(savingsAccounts), { currency: userCurrency })}` : ''}`}
          actionButton={
            <Button 
              onClick={() => {
                console.log("Button clicked! Opening dialog...")
                setSavingsAccountDialogOpen(true)
              }} 
              className="w-full md:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Savings Account
            </Button>
          }
        >
          {savingsAccountsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading savings accounts...</p>
              </div>
            </div>
          ) : (
            <SavingsAccountList
              accounts={savingsAccounts}
              onAdd={() => setSavingsAccountDialogOpen(true)}
              onEdit={handleEditSavingsAccount}
              onDelete={handleDeleteSavingsAccount}
              onAddMoney={handleAddMoneyToSavings}
              onWithdrawMoney={handleWithdrawMoneyFromSavings}
              defaultCurrency={userCurrency}
              hideHeader={true}
            />
          )}
        </CollapsibleSection>

        

        {/* Budget Management Section */}
        <CollapsibleSection
          title="Budget Management"
          description="Track your spending limits and stay on budget"
          actionButton={
            <Button onClick={() => setBudgetDialogOpen(true)} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Budget
            </Button>
          }
        >
          {budgetsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading budgets...</p>
              </div>
            </div>
          ) : (
            <BudgetList
              budgets={budgets}
              entries={entries}
              categories={categories}
              onAdd={() => setBudgetDialogOpen(true)}
              onEdit={handleEditBudget}
              onDelete={handleDeleteBudget}
            />
          )}
        </CollapsibleSection>

        {/* Recurring Transactions Section */}
        <CollapsibleSection
          title="Recurring Transactions"
          description="Manage your recurring bills, subscriptions, and income"
          actionButton={
            <Button onClick={() => setRecurringDialogOpen(true)} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Recurring Transaction
            </Button>
          }
        >
          {recurringLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading recurring transactions...</p>
              </div>
            </div>
          ) : (
            <RecurringTransactionList
              recurringTransactions={recurringTransactions}
              onAdd={() => setRecurringDialogOpen(true)}
              onEdit={handleEditRecurring}
              onDelete={handleDeleteRecurring}
            />
          )}
        </CollapsibleSection>

        {/* Financial Goals Section */}
        <CollapsibleSection
          title="Financial Goals"
          description="Set and track your savings goals and milestones"
          actionButton={
            <Button onClick={() => setGoalDialogOpen(true)} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Goal
            </Button>
          }
        >
          {goalsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading goals...</p>
              </div>
            </div>
          ) : (
            <GoalList
              goals={goals}
              onAdd={() => setGoalDialogOpen(true)}
              onEdit={handleEditGoal}
              onDelete={handleDeleteGoal}
            />
          )}
        </CollapsibleSection>

        {/* Add/Edit Entry Dialog */}
        <AddTransactionDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          onSubmit={handleAddEntry}
          editingEntry={editingEntry}
          savingsAccounts={savingsAccounts.filter(acc => acc.isActive).map(acc => ({
            id: acc.id,
            name: acc.name,
            balance: acc.balance,
            currency: acc.currency,
          }))}
        />

        {/* Add/Edit Budget Dialog */}
        <BudgetDialog
          open={budgetDialogOpen}
          onOpenChange={handleBudgetDialogClose}
          onSubmit={handleAddBudget}
          editingBudget={editingBudget}
          categories={categories}
          defaultCurrency={userCurrency}
        />

        {/* Add/Edit Recurring Transaction Dialog */}
        <RecurringTransactionDialog
          open={recurringDialogOpen}
          onOpenChange={handleRecurringDialogClose}
          onSubmit={handleAddRecurringTransaction}
          editingRecurring={editingRecurring}
          categories={categories}
        />

        {/* Add/Edit Goal Dialog */}
        <GoalDialog
          open={goalDialogOpen}
          onOpenChange={handleGoalDialogClose}
          onSubmit={handleAddGoal}
          editingGoal={editingGoal}
          categories={categories}
          defaultCurrency={userCurrency}
        />

        {/* Add/Edit Savings Account Dialog */}
        <SavingsAccountDialog
          open={savingsAccountDialogOpen}
          onOpenChange={handleSavingsAccountDialogClose}
          onSubmit={handleSubmitSavingsAccount}
          editingAccount={editingSavingsAccount}
          defaultCurrency={userCurrency}
        />

        {/* Quick Expense FAB */}
        <QuickExpenseFAB onSubmit={handleAddEntry} />

        {/* Salary Reminder Notifications */}
        <SalaryReminderNotification entries={entries} />

        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <DashboardContent />
}
