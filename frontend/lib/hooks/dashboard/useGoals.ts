/**
 * useGoals Hook
 *
 * Manages financial goals state and CRUD operations for the dashboard
 */

import { useState, useCallback } from "react"
import {
  createGoal,
  getUserGoals,
  deleteGoal,
  updateGoal,
} from "@/lib/firestore-goals"
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "@/lib/constants/validation.constants"
import type { Goal, GoalFormData, ToastState } from "./types"
import { logger } from "@/lib/utils/logger"
import type { Timestamp } from "firebase/firestore"

interface UseGoalsOptions {
  userId: string | undefined
  onToast: (toast: ToastState) => void
}

export function useGoals({ userId, onToast }: UseGoalsOptions) {
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
      logger.error("Error loading goals", error)
      setGoals([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const handleAdd = useCallback(async (data: GoalFormData) => {
    if (!userId) return

    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, {
          name: data.name,
          targetAmount: data.targetAmount,
          currentAmount: data.currentAmount,
          currency: data.currency,
          deadline: data.deadline as unknown as Timestamp,
          category: data.category,
          description: data.description,
          isActive: data.isActive,
        })

        await loadGoals()
        onToast({ message: SUCCESS_MESSAGES.GOAL_UPDATED, type: "success" })
        setEditingGoal(null)
      } else {
        await createGoal(userId, {
          name: data.name,
          targetAmount: data.targetAmount,
          currentAmount: data.currentAmount,
          currency: data.currency,
          deadline: data.deadline as unknown as Timestamp,
          category: data.category,
          description: data.description,
          isActive: data.isActive,
        })

        await loadGoals()
        onToast({ message: "Goal created successfully!", type: "success" })
      }
    } catch (error: unknown) {
      logger.error("Error saving goal", error)
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SAVE_FAILED
      onToast({ message: errorMessage, type: "error" })
      throw error
    }
  }, [userId, editingGoal, loadGoals, onToast])

  const handleEdit = useCallback((goal: Goal) => {
    setEditingGoal(goal)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (goalId: string) => {
    if (!userId) return

    try {
      await deleteGoal(goalId)
      await loadGoals()
      onToast({ message: SUCCESS_MESSAGES.GOAL_DELETED, type: "success" })
    } catch (error) {
      logger.error("Error deleting goal", error)
      onToast({ message: "Failed to delete goal. Please try again.", type: "error" })
    }
  }, [userId, loadGoals, onToast])

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingGoal(null)
    }
  }, [])

  return {
    goals,
    loading,
    dialogOpen,
    setDialogOpen,
    editingGoal,
    loadGoals,
    handleAdd,
    handleEdit,
    handleDelete,
    handleDialogClose,
  }
}
