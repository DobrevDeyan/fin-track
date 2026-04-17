/**
 * useBudgets Hook
 *
 * Manages budget state and CRUD operations for the dashboard
 */

import { useState, useCallback } from "react"
import { Timestamp } from "firebase/firestore"
import {
  createBudget,
  getUserBudgets,
  deleteBudget,
  updateBudget,
} from "@/lib/firestore-budgets"
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "@/lib/constants/validation.constants"
import { toISOString } from "@/lib/utils/timestamp"
import type { Budget, BudgetFormData, ToastState } from "./types"
import { logger } from "@/lib/utils/logger"

interface UseBudgetsOptions {
  userId: string | undefined
  onToast: (toast: ToastState) => void
}

export function useBudgets({ userId, onToast }: UseBudgetsOptions) {
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
        startDate: toISOString(budget.startDate) || "",
        endDate: toISOString(budget.endDate) || "",
        isActive: budget.isActive,
        alertThreshold: budget.alertThreshold,
      }))

      setBudgets(convertedBudgets)
    } catch (error) {
      logger.error("Error loading budgets", error)
      setBudgets([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const handleAdd = useCallback(async (data: BudgetFormData) => {
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
        onToast({ message: SUCCESS_MESSAGES.BUDGET_UPDATED, type: "success" })
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
        onToast({ message: SUCCESS_MESSAGES.BUDGET_CREATED, type: "success" })
      }
    } catch (error: unknown) {
      logger.error("Error saving budget", error)
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SAVE_FAILED
      onToast({ message: errorMessage, type: "error" })
      throw error
    }
  }, [userId, editingBudget, loadBudgets, onToast])

  const handleEdit = useCallback((budget: Budget) => {
    setEditingBudget(budget)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (budgetId: string) => {
    if (!userId) return

    try {
      await deleteBudget(budgetId)
      await loadBudgets()
      onToast({ message: SUCCESS_MESSAGES.BUDGET_DELETED, type: "success" })
    } catch (error) {
      logger.error("Error deleting budget", error)
      onToast({ message: ERROR_MESSAGES.DELETE_FAILED, type: "error" })
    }
  }, [userId, loadBudgets, onToast])

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingBudget(null)
    }
  }, [])

  return {
    budgets,
    loading,
    dialogOpen,
    setDialogOpen,
    editingBudget,
    loadBudgets,
    handleAdd,
    handleEdit,
    handleDelete,
    handleDialogClose,
  }
}
