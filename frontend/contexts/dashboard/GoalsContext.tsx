"use client"

/**
 * Goals Context
 *
 * Provides financial goals state and operations to all dashboard components
 * Eliminates prop drilling for goals-related data
 */

import { createContext, useContext, ReactNode, useCallback, useState } from "react"
import { Timestamp } from "firebase/firestore"
import {
  createGoal,
  getUserGoals,
  deleteGoal,
  updateGoal,
} from "@/lib/firestore-goals"
import { GoalDocument } from "@/lib/firestore-types"
import { getErrorMessage, ERROR_MESSAGES } from "@/lib/utils/error"

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

interface ToastState {
  message: string
  type: "success" | "error"
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
  handleDialogClose: (open: boolean) => void
  openDialog: () => void
}

const GoalsContext = createContext<GoalsContextValue | null>(null)

interface GoalsProviderProps {
  children: ReactNode
  userId: string | undefined
  onToast: (toast: ToastState) => void
}

export function GoalsProvider({ children, userId, onToast }: GoalsProviderProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  const loadGoals = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      const firestoreGoals = await getUserGoals(userId)
      setGoals(firestoreGoals)
    } catch (error) {
      console.error("Error loading goals:", error)
      setGoals([])
    } finally {
      setLoading(false)
    }
  }, [userId])

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
          onToast({ message: "Goal updated successfully", type: "success" })
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
          onToast({ message: "Goal created successfully", type: "success" })
        }
      } catch (error: unknown) {
        console.error("Error saving goal:", error)
        onToast({ message: getErrorMessage(error, ERROR_MESSAGES.GOAL_SAVE_FAILED), type: "error" })
        throw error
      }
    },
    [userId, editingGoal, loadGoals, onToast]
  )

  const handleEdit = useCallback((goal: Goal) => {
    setEditingGoal(goal)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (goalId: string) => {
      if (!userId) return

      try {
        await deleteGoal(goalId)
        await loadGoals()
        onToast({ message: "Goal deleted successfully", type: "success" })
      } catch (error) {
        console.error("Error deleting goal:", error)
        onToast({ message: ERROR_MESSAGES.GOAL_DELETE_FAILED, type: "error" })
      }
    },
    [userId, loadGoals, onToast]
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
