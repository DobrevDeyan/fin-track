"use client"

/**
 * Budgets Context
 *
 * Provides budget state and operations to all dashboard components
 * Eliminates prop drilling for budget-related data
 */

import { createContext, useContext, ReactNode, useCallback, useState } from "react"
import { Timestamp } from "firebase/firestore"
import {
  createBudget,
  getUserBudgets,
  deleteBudget,
  updateBudget,
} from "@/lib/firestore-budgets"
import { toISOString } from "@/lib/utils/timestamp"
import { getErrorMessage, ERROR_MESSAGES } from "@/lib/utils/error"

export interface Budget {
  id: string
  name: string
  category?: string
  amount: number
  currency: string
  period: "weekly" | "monthly" | "yearly"
  startDate: string
  endDate: string
  isActive: boolean
  alertThreshold?: number
}

export interface BudgetFormData {
  name: string
  category?: string
  amount: number
  currency: string
  period: "weekly" | "monthly" | "yearly"
  startDate: string | Date
  endDate: string | Date
  isActive: boolean
  alertThreshold?: number
}

interface ToastState {
  message: string
  type: "success" | "error"
}

interface BudgetsContextValue {
  // State
  budgets: Budget[]
  loading: boolean
  dialogOpen: boolean
  editingBudget: Budget | null

  // Actions
  loadBudgets: () => Promise<void>
  handleSubmit: (data: BudgetFormData) => Promise<void>
  handleEdit: (budget: Budget) => void
  handleDelete: (budgetId: string) => Promise<void>
  handleDialogClose: (open: boolean) => void
  openDialog: () => void
}

const BudgetsContext = createContext<BudgetsContextValue | null>(null)

interface BudgetsProviderProps {
  children: ReactNode
  userId: string | undefined
  onToast: (toast: ToastState) => void
}

export function BudgetsProvider({ children, userId, onToast }: BudgetsProviderProps) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)

  const loadBudgets = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      const firestoreBudgets = await getUserBudgets(userId)

      const convertedBudgets: Budget[] = firestoreBudgets.map((budget) => ({
        id: budget.id,
        name: budget.name,
        category: budget.category,
        amount: budget.amount,
        currency: budget.currency,
        period: budget.period,
        startDate: toISOString(budget.startDate) || new Date().toISOString(),
        endDate: toISOString(budget.endDate) || new Date().toISOString(),
        isActive: budget.isActive,
        alertThreshold: budget.alertThreshold,
      }))

      setBudgets(convertedBudgets)
    } catch (error) {
      console.error("Error loading budgets:", error)
      setBudgets([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const handleSubmit = useCallback(
    async (data: BudgetFormData) => {
      if (!userId) return

      try {
        if (editingBudget) {
          await updateBudget(editingBudget.id, {
            name: data.name,
            category: data.category,
            amount: data.amount,
            currency: data.currency,
            period: data.period,
            startDate: data.startDate as unknown as Timestamp,
            endDate: data.endDate as unknown as Timestamp,
            isActive: data.isActive,
            alertThreshold: data.alertThreshold,
          })

          await loadBudgets()
          onToast({ message: "Budget updated successfully", type: "success" })
          setEditingBudget(null)
        } else {
          await createBudget(userId, {
            name: data.name,
            category: data.category,
            amount: data.amount,
            currency: data.currency,
            period: data.period,
            startDate: data.startDate as unknown as Timestamp,
            endDate: data.endDate as unknown as Timestamp,
            isActive: data.isActive,
            alertThreshold: data.alertThreshold,
          })

          await loadBudgets()
          onToast({ message: "Budget created successfully", type: "success" })
        }
      } catch (error: unknown) {
        console.error("Error saving budget:", error)
        onToast({ message: getErrorMessage(error, ERROR_MESSAGES.BUDGET_SAVE_FAILED), type: "error" })
        throw error
      }
    },
    [userId, editingBudget, loadBudgets, onToast]
  )

  const handleEdit = useCallback((budget: Budget) => {
    setEditingBudget(budget)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (budgetId: string) => {
      if (!userId) return

      try {
        await deleteBudget(budgetId)
        await loadBudgets()
        onToast({ message: "Budget deleted successfully", type: "success" })
      } catch (error) {
        console.error("Error deleting budget:", error)
        onToast({ message: ERROR_MESSAGES.BUDGET_DELETE_FAILED, type: "error" })
      }
    },
    [userId, loadBudgets, onToast]
  )

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingBudget(null)
    }
  }, [])

  const openDialog = useCallback(() => {
    setEditingBudget(null)
    setDialogOpen(true)
  }, [])

  const value: BudgetsContextValue = {
    budgets,
    loading,
    dialogOpen,
    editingBudget,
    loadBudgets,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleDialogClose,
    openDialog,
  }

  return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>
}

export function useBudgetsContext() {
  const context = useContext(BudgetsContext)
  if (!context) {
    throw new Error("useBudgetsContext must be used within a BudgetsProvider")
  }
  return context
}
