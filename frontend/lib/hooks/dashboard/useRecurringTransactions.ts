/**
 * useRecurringTransactions Hook
 *
 * Manages recurring transaction state and CRUD operations for the dashboard
 */

import { useState, useCallback } from "react"
import {
  createRecurringTransaction,
  getUserRecurringTransactions,
  deleteRecurringTransaction,
  updateRecurringTransaction
} from "@/lib/firestore-recurring"
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "@/lib/constants/validation.constants"
import type { RecurringTransaction, RecurringFormData, ToastState } from "./types"
import type { Timestamp } from "firebase/firestore"

interface UseRecurringTransactionsOptions {
  userId: string | undefined
  onToast: (toast: ToastState) => void
}

export function useRecurringTransactions({
  userId,
  onToast
}: UseRecurringTransactionsOptions) {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null)

  const loadRecurringTransactions = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      const firestoreRecurring = await getUserRecurringTransactions(userId)
      setRecurringTransactions(firestoreRecurring)
    } catch (error) {
      console.error("Error loading recurring transactions:", error)
      setRecurringTransactions([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const handleAdd = useCallback(async (data: RecurringFormData) => {
    if (!userId) return

    try {
      if (editingRecurring) {
        await updateRecurringTransaction(editingRecurring.id, {
          name: data.name,
          amount: data.amount,
          type: data.type,
          category: data.category,
          frequency: data.frequency,
          nextDate: data.nextDate as unknown as Timestamp,
          isActive: data.isActive,
        })

        await loadRecurringTransactions()
        onToast({ message: SUCCESS_MESSAGES.RECURRING_UPDATED, type: "success" })
        setEditingRecurring(null)
      } else {
        await createRecurringTransaction(userId, {
          name: data.name,
          amount: data.amount,
          type: data.type,
          category: data.category,
          frequency: data.frequency,
          nextDate: data.nextDate as unknown as Timestamp,
          isActive: data.isActive,
        })

        await loadRecurringTransactions()
        onToast({ message: "Recurring transaction created successfully!", type: "success" })
      }
    } catch (error: unknown) {
      console.error("Error saving recurring transaction:", error)
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SAVE_FAILED
      onToast({ message: errorMessage, type: "error" })
      throw error
    }
  }, [userId, editingRecurring, loadRecurringTransactions, onToast])

  const handleEdit = useCallback((recurring: RecurringTransaction) => {
    setEditingRecurring(recurring)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (recurringId: string) => {
    if (!userId) return

    try {
      await deleteRecurringTransaction(recurringId)
      await loadRecurringTransactions()
      onToast({ message: SUCCESS_MESSAGES.RECURRING_DELETED, type: "success" })
    } catch (error) {
      console.error("Error deleting recurring transaction:", error)
      onToast({ message: "Failed to delete recurring transaction. Please try again.", type: "error" })
    }
  }, [userId, loadRecurringTransactions, onToast])

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingRecurring(null)
    }
  }, [])

  return {
    recurringTransactions,
    loading,
    dialogOpen,
    setDialogOpen,
    editingRecurring,
    loadRecurringTransactions,
    handleAdd,
    handleEdit,
    handleDelete,
    handleDialogClose,
  }
}
