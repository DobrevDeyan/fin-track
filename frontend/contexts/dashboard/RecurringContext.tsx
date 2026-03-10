"use client"

/**
 * Recurring Transactions Context
 *
 * Provides recurring transactions state and operations to all dashboard components
 * Eliminates prop drilling for recurring transaction-related data
 */

import { createContext, useContext, ReactNode, useCallback, useState, useEffect } from "react"
import { Timestamp } from "firebase/firestore"
import {
  createRecurringTransaction,
  getUserRecurringTransactions,
  deleteRecurringTransaction,
  updateRecurringTransaction,
} from "@/lib/firestore-recurring"
import { RecurringEntryDocument } from "@/lib/firestore-types"
import { getErrorMessage, ERROR_MESSAGES } from "@/lib/utils/error"

// Use the full document type for compatibility with existing components
export type RecurringTransaction = RecurringEntryDocument & { id: string }

export interface RecurringFormData {
  name: string
  amount: number
  type: "income" | "expense"
  category: string
  frequency: "weekly" | "monthly" | "yearly"
  nextDate: string | Date | Timestamp
  isActive: boolean
}

interface ToastState {
  message: string
  type: "success" | "error"
}

interface RecurringContextValue {
  // State
  recurringTransactions: RecurringTransaction[]
  loading: boolean
  dialogOpen: boolean
  editingRecurring: RecurringTransaction | null

  // Actions
  loadRecurringTransactions: () => Promise<void>
  handleSubmit: (data: RecurringFormData) => Promise<void>
  handleEdit: (recurring: RecurringTransaction) => void
  handleDelete: (recurringId: string) => Promise<void>
  handleDialogClose: (open: boolean) => void
  openDialog: () => void
}

const RecurringContext = createContext<RecurringContextValue | null>(null)

interface RecurringProviderProps {
  children: ReactNode
  userId: string | undefined
  onToast: (toast: ToastState) => void
}

export function RecurringProvider({ children, userId, onToast }: RecurringProviderProps) {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null)

  useEffect(() => {
    if (!userId) {
      setRecurringTransactions([])
      setLoading(false)
    }
  }, [userId])

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

  const handleSubmit = useCallback(
    async (data: RecurringFormData) => {
      if (!userId) return

      try {
        if (editingRecurring) {
          await updateRecurringTransaction(editingRecurring.id, {
            name: data.name,
            amount: data.amount,
            type: data.type,
            category: data.category,
            frequency: data.frequency,
            nextDate: data.nextDate as Timestamp,
            isActive: data.isActive,
          })

          await loadRecurringTransactions()
          onToast({ message: "Recurring transaction updated successfully", type: "success" })
          setEditingRecurring(null)
        } else {
          await createRecurringTransaction(userId, {
            name: data.name,
            amount: data.amount,
            type: data.type,
            category: data.category,
            frequency: data.frequency,
            nextDate: data.nextDate as Timestamp,
            isActive: data.isActive,
          })

          await loadRecurringTransactions()
          onToast({ message: "Recurring transaction created successfully", type: "success" })
        }
      } catch (error: unknown) {
        console.error("Error saving recurring transaction:", error)
        onToast({
          message: getErrorMessage(error, ERROR_MESSAGES.RECURRING_SAVE_FAILED),
          type: "error",
        })
        throw error
      }
    },
    [userId, editingRecurring, loadRecurringTransactions, onToast]
  )

  const handleEdit = useCallback((recurring: RecurringTransaction) => {
    setEditingRecurring(recurring)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (recurringId: string) => {
      if (!userId) return

      try {
        await deleteRecurringTransaction(recurringId)
        await loadRecurringTransactions()
        onToast({ message: "Recurring transaction deleted successfully", type: "success" })
      } catch (error) {
        console.error("Error deleting recurring transaction:", error)
        onToast({ message: ERROR_MESSAGES.RECURRING_DELETE_FAILED, type: "error" })
      }
    },
    [userId, loadRecurringTransactions, onToast]
  )

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingRecurring(null)
    }
  }, [])

  const openDialog = useCallback(() => {
    setEditingRecurring(null)
    setDialogOpen(true)
  }, [])

  const value: RecurringContextValue = {
    recurringTransactions,
    loading,
    dialogOpen,
    editingRecurring,
    loadRecurringTransactions,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleDialogClose,
    openDialog,
  }

  return <RecurringContext.Provider value={value}>{children}</RecurringContext.Provider>
}

export function useRecurringContext() {
  const context = useContext(RecurringContext)
  if (!context) {
    throw new Error("useRecurringContext must be used within a RecurringProvider")
  }
  return context
}
