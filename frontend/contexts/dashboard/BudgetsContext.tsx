"use client"

/**
 * Budgets Context
 *
 * Provides budget state and operations to all dashboard components
 * Eliminates prop drilling for budget-related data
 */

import { createContext, useContext, ReactNode, useCallback, useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Timestamp } from "firebase/firestore"
import {
  createBudget,
  getUserBudgets,
  deleteBudget,
  updateBudget,
  renewBudget,
} from "@/lib/firestore-budgets"
import { toISOString } from "@/lib/utils/timestamp"
import { getErrorMessage, ERROR_MESSAGES } from "@/lib/utils/error"
import { logger } from "@/lib/utils/logger"


export interface Budget {
  id: string
  name: string
  category: string
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
  category: string
  amount: number
  currency: string
  period: "weekly" | "monthly" | "yearly"
  startDate: string | Date
  endDate: string | Date
  isActive: boolean
  alertThreshold?: number
}


interface BudgetsContextValue {
  // State
  budgets: Budget[]
  loading: boolean
  error: string | null
  dialogOpen: boolean
  editingBudget: Budget | null

  // Actions
  loadBudgets: () => Promise<void>
  ensureBudgetsLoaded: () => Promise<void>
  handleSubmit: (data: BudgetFormData) => Promise<void>
  handleEdit: (budget: Budget) => void
  handleDelete: (budgetId: string) => Promise<void>
  handleRenew: (budgetId: string, period: "weekly" | "monthly" | "yearly") => Promise<void>
  handleDialogClose: (open: boolean) => void
  openDialog: () => void
}

const BudgetsContext = createContext<BudgetsContextValue | null>(null)

interface BudgetsProviderProps {
  children: ReactNode
  userId: string | undefined
}

export function BudgetsProvider({ children, userId }: BudgetsProviderProps) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const hasLoadedRef = useRef(false)
  // Pending optimistic deletes keyed by budgetId, so we can cancel them on Undo
  // and flush them on unmount instead of leaking timers / updating after unmount.
  const pendingDeletesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    if (!userId) {
      setBudgets([])
      setLoading(false)
      hasLoadedRef.current = false
    }
  }, [userId])

  // On unmount, fire any still-pending deletes immediately (honors the user's
  // intent) without touching React state afterwards.
  useEffect(() => {
    const pending = pendingDeletesRef.current
    return () => {
      pending.forEach((timer, budgetId) => {
        clearTimeout(timer)
        deleteBudget(budgetId).catch((err) => logger.error("Error flushing budget delete", err))
      })
      pending.clear()
    }
  }, [])

  const loadBudgets = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
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
      hasLoadedRef.current = true
    } catch (err) {
      logger.error("Error loading budgets", err)
      setBudgets([])
      setError(ERROR_MESSAGES.BUDGET_LOAD_FAILED)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const ensureBudgetsLoaded = useCallback(async () => {
    if (hasLoadedRef.current) return
    await loadBudgets()
  }, [loadBudgets])

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
          toast.success("Budget updated successfully")
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
          toast.success("Budget created successfully")
        }
      } catch (error: unknown) {
        logger.error("Error saving budget", error)
        toast.error(getErrorMessage(error, ERROR_MESSAGES.BUDGET_SAVE_FAILED))
        throw error
      }
    },
    [userId, editingBudget, loadBudgets]
  )

  const handleEdit = useCallback((budget: Budget) => {
    setEditingBudget(budget)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (budgetId: string) => {
      if (!userId) return

      const deletedBudget = budgets.find(b => b.id === budgetId)
      if (!deletedBudget) return

      setBudgets(prev => prev.filter(b => b.id !== budgetId))

      const timer = setTimeout(async () => {
        pendingDeletesRef.current.delete(budgetId)
        try {
          await deleteBudget(budgetId)
        } catch (error) {
          logger.error("Error deleting budget", error)
          await loadBudgets()
          toast.error(ERROR_MESSAGES.BUDGET_DELETE_FAILED)
        }
      }, 5000)
      pendingDeletesRef.current.set(budgetId, timer)

      toast.success("Budget deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timer)
            pendingDeletesRef.current.delete(budgetId)
            loadBudgets()
          },
        },
        duration: 5000,
      })
    },
    [userId, budgets, loadBudgets]
  )

  const handleRenew = useCallback(
    async (budgetId: string, period: "weekly" | "monthly" | "yearly") => {
      try {
        await renewBudget(budgetId, period)
        await loadBudgets()
        toast.success("Budget renewed for the current period")
      } catch (error) {
        logger.error("Error renewing budget", error)
        toast.error("Failed to renew budget")
      }
    },
    [loadBudgets]
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
    error,
    dialogOpen,
    editingBudget,
    loadBudgets,
    ensureBudgetsLoaded,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleRenew,
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
