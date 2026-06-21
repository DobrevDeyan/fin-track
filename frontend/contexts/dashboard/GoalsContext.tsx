"use client"

/**
 * Goals Context
 *
 * Provides financial goals state and operations to all dashboard components.
 * Adding funds to a goal now creates an expense entry for proper accounting.
 */

import { createContext, useContext, ReactNode, useCallback, useState, useEffect } from "react"
import { toast } from "sonner"
import { Timestamp } from "firebase/firestore"
import { useTranslations } from "next-intl"
import {
  createGoal,
  getUserGoals,
  deleteGoal,
  updateGoal,
} from "@/lib/firestore-goals"
import { createEntry } from "@/lib/firestore-entries"
import { GoalDocument } from "@/lib/firestore-types"
import { getErrorMessage, ERROR_MESSAGES } from "@/lib/utils/error"
import { useCurrency } from "@/contexts/CurrencyContext"
import { BASE_CURRENCY } from "@/lib/constants/currency.constants"
import { useFinancialSummary } from "./FinancialSummaryContext"
import { logger } from "@/lib/utils/logger"


// Use the full document type for compatibility with existing components
export type Goal = GoalDocument & { id: string }

export interface GoalFormData {
  name: string
  targetAmount: number
  currentAmount: number
  currency: string
  deadline?: string | Date | Timestamp
  category?: string
  description?: string
  isActive: boolean
}


interface GoalsContextValue {
  // State
  goals: Goal[]
  loading: boolean
  dialogOpen: boolean
  editingGoal: Goal | null

  // Actions
  loadGoals: () => Promise<void>
  handleSubmit: (data: GoalFormData) => Promise<void>
  handleEdit: (goal: Goal) => void
  handleDelete: (goalId: string) => Promise<void>
  handleAddFunds: (goalId: string, amount: number) => Promise<void>
  handleDialogClose: (open: boolean) => void
  openDialog: () => void
}

const GoalsContext = createContext<GoalsContextValue | null>(null)

interface GoalsProviderProps {
  children: ReactNode
  userId: string | undefined
}

export function GoalsProvider({ children, userId }: GoalsProviderProps) {
  const t = useTranslations()
  const { userCurrency, toBaseCurrency } = useCurrency()
  const { refreshSummary } = useFinancialSummary()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  useEffect(() => {
    if (!userId) {
      setGoals([])
      setLoading(false)
    }
  }, [userId])

  const loadGoals = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      const firestoreGoals = await getUserGoals(userId)
      setGoals(firestoreGoals)
    } catch (error) {
      logger.error(t(ERROR_MESSAGES.LOAD_FAILED), error)
      setGoals([])
    } finally {
      setLoading(false)
    }
  }, [userId, t])

  const handleSubmit = useCallback(
    async (data: GoalFormData) => {
      if (!userId) return

      try {
        if (editingGoal) {
          await updateGoal(editingGoal.id, {
            name: data.name,
            targetAmount: data.targetAmount,
            currentAmount: data.currentAmount,
            currency: data.currency,
            deadline: data.deadline as Timestamp,
            category: data.category,
            description: data.description,
            isActive: data.isActive,
          })

          await loadGoals()
          toast.success(t("toast.goals.updateSuccess"))
          setEditingGoal(null)
        } else {
          await createGoal(userId, {
            name: data.name,
            targetAmount: data.targetAmount,
            currentAmount: data.currentAmount,
            currency: data.currency,
            deadline: data.deadline as Timestamp,
            category: data.category,
            description: data.description,
            isActive: data.isActive,
          })

          await loadGoals()
          toast.success(t("toast.goals.createSuccess"))
        }
      } catch (error: unknown) {
        logger.error(t(ERROR_MESSAGES.GOAL_SAVE_FAILED), error)
        toast.error(t(getErrorMessage(error, ERROR_MESSAGES.GOAL_SAVE_FAILED)))
        throw error
      }
    },
    [userId, editingGoal, loadGoals, t]
  )

  const handleEdit = useCallback((goal: Goal) => {
    setEditingGoal(goal)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (goalId: string) => {
      if (!userId) return

      const deletedGoal = goals.find(g => g.id === goalId)
      if (!deletedGoal) return

      setGoals(prev => prev.filter(g => g.id !== goalId))

      const timer = setTimeout(async () => {
        try {
          await deleteGoal(goalId)
        } catch (error) {
          logger.error(t(ERROR_MESSAGES.GOAL_DELETE_FAILED), error)
          await loadGoals()
          toast.error(t(ERROR_MESSAGES.GOAL_DELETE_FAILED))
        }
      }, 5000)

      toast.success(t("toast.goals.deleted"), {
        action: { label: t("toast.undo"), onClick: () => { clearTimeout(timer); loadGoals() } },
        duration: 5000,
      })
    },
    [userId, goals, loadGoals, t]
  )

  const handleAddFunds = useCallback(
    async (goalId: string, amount: number) => {
      if (!userId) return

      const goal = goals.find(g => g.id === goalId)
      if (!goal) return

      try {
        // 1. Create an expense entry for proper accounting
        //    Amount must be converted to EUR base before storage.
        await createEntry(userId, {
          type: "expense",
          amount: toBaseCurrency(amount),
          currency: BASE_CURRENCY,
          description: `Goal contribution: ${goal.name}`,
          category: "Goal Contribution",
          date: new Date().toISOString(),
        })

        // 2. Update the goal's currentAmount
        const newAmount = goal.currentAmount + amount
        await updateGoal(goalId, {
          currentAmount: newAmount,
        })

        await loadGoals()
        await refreshSummary()
        toast.success(t("toast.goals.addFundsSuccess"))
      } catch (error) {
        logger.error(t(ERROR_MESSAGES.GOAL_ADD_FUNDS_FAILED), error)
        toast.error(t(ERROR_MESSAGES.GOAL_ADD_FUNDS_FAILED))
      }
    },
    [userId, userCurrency, goals, loadGoals, refreshSummary, t]
  )

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingGoal(null)
    }
  }, [])

  const openDialog = useCallback(() => {
    setEditingGoal(null)
    setDialogOpen(true)
  }, [])

  const value: GoalsContextValue = {
    goals,
    loading,
    dialogOpen,
    editingGoal,
    loadGoals,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleAddFunds,
    handleDialogClose,
    openDialog,
  }

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
}

export function useGoalsContext() {
  const context = useContext(GoalsContext)
  if (!context) {
    throw new Error("useGoalsContext must be used within a GoalsProvider")
  }
  return context
}
