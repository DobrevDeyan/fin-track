"use client"

/**
 * Recurring Transactions Context
 *
 * Provides recurring transactions state and operations to all dashboard components
 * Eliminates prop drilling for recurring transaction-related data
 */

import { createContext, useContext, ReactNode, useCallback, useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Timestamp } from "firebase/firestore"
import {
  createRecurringTransaction,
  getUserRecurringTransactions,
  deleteRecurringTransaction,
  updateRecurringTransaction,
} from "@/lib/firestore-recurring"
import { RecurringEntryDocument } from "@/lib/firestore-types"
import { getErrorMessage, ERROR_MESSAGES } from "@/lib/utils/error"
import { logger } from "@/lib/utils/logger"


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


interface RecurringContextValue {
  // State
  recurringTransactions: RecurringTransaction[]
  loading: boolean
  dialogOpen: boolean
  editingRecurring: RecurringTransaction | null

  // Actions
  loadRecurringTransactions: () => Promise<void>
  ensureRecurringLoaded: () => Promise<void>
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
}

export function RecurringProvider({ children, userId }: RecurringProviderProps) {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (!userId) {
      setRecurringTransactions([])
      setLoading(false)
      hasLoadedRef.current = false
    }
  }, [userId])

  const loadRecurringTransactions = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      const firestoreRecurring = await getUserRecurringTransactions(userId)
      setRecurringTransactions(firestoreRecurring)
      hasLoadedRef.current = true
    } catch (error) {
      logger.error("Error loading recurring transactions", error)
      setRecurringTransactions([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const ensureRecurringLoaded = useCallback(async () => {
    if (hasLoadedRef.current) return
    await loadRecurringTransactions()
  }, [loadRecurringTransactions])

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
          toast.success("Recurring transaction updated successfully")
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
          toast.success("Recurring transaction created successfully")
        }
      } catch (error: unknown) {
        logger.error("Error saving recurring transaction", error)
        toast.error(getErrorMessage(error, ERROR_MESSAGES.RECURRING_SAVE_FAILED))
        throw error
      }
    },
    [userId, editingRecurring, loadRecurringTransactions]
  )

  const handleEdit = useCallback((recurring: RecurringTransaction) => {
    setEditingRecurring(recurring)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (recurringId: string) => {
      if (!userId) return

      const deletedRecurring = recurringTransactions.find(r => r.id === recurringId)
      if (!deletedRecurring) return

      setRecurringTransactions(prev => prev.filter(r => r.id !== recurringId))

      const timer = setTimeout(async () => {
        try {
          await deleteRecurringTransaction(recurringId)
        } catch (error) {
          logger.error("Error deleting recurring transaction", error)
          await loadRecurringTransactions()
          toast.error(ERROR_MESSAGES.RECURRING_DELETE_FAILED)
        }
      }, 5000)

      toast.success("Recurring transaction deleted", {
        action: { label: "Undo", onClick: () => { clearTimeout(timer); loadRecurringTransactions() } },
        duration: 5000,
      })
    },
    [userId, recurringTransactions, loadRecurringTransactions]
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
    ensureRecurringLoaded,
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
