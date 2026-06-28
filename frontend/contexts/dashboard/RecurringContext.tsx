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
  toggleActive: (recurringId: string, nextActive: boolean) => Promise<void>
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
  // Tracks in-flight optimistic-delete timers so they can be flushed on unmount
  // instead of firing against an unmounted component (review R5-10).
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    if (!userId) {
      setRecurringTransactions([])
      setLoading(false)
      hasLoadedRef.current = false
    }
  }, [userId])

  // On unmount, commit any pending optimistic deletes immediately so the user's
  // delete intent isn't dropped and no timer leaks (review R5-10).
  useEffect(() => {
    const timers = pendingDeletes.current
    return () => {
      timers.forEach((timer, id) => {
        clearTimeout(timer)
        deleteRecurringTransaction(id).catch((err) =>
          logger.error("Error flushing pending recurring delete on unmount", err)
        )
      })
      timers.clear()
    }
  }, [])

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
        pendingDeletes.current.delete(recurringId)
        try {
          await deleteRecurringTransaction(recurringId)
        } catch (error) {
          logger.error("Error deleting recurring transaction", error)
          await loadRecurringTransactions()
          toast.error(ERROR_MESSAGES.RECURRING_DELETE_FAILED)
        }
      }, 5000)
      pendingDeletes.current.set(recurringId, timer)

      toast.success("Recurring transaction deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            const pending = pendingDeletes.current.get(recurringId)
            if (pending) {
              clearTimeout(pending)
              pendingDeletes.current.delete(recurringId)
            }
            loadRecurringTransactions()
          },
        },
        duration: 5000,
      })
    },
    [userId, recurringTransactions, loadRecurringTransactions]
  )

  const toggleActive = useCallback(
    async (recurringId: string, nextActive: boolean) => {
      // Optimistic flip on the shared cache so the dashboard and the
      // subscriptions page stay in sync from one source of truth (review R5-6).
      setRecurringTransactions(prev =>
        prev.map(r => (r.id === recurringId ? { ...r, isActive: nextActive } : r))
      )
      try {
        await updateRecurringTransaction(recurringId, { isActive: nextActive })
      } catch (error) {
        // Revert on failure
        setRecurringTransactions(prev =>
          prev.map(r => (r.id === recurringId ? { ...r, isActive: !nextActive } : r))
        )
        logger.error("Error toggling recurring transaction", error)
        throw error
      }
    },
    []
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
    toggleActive,
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
