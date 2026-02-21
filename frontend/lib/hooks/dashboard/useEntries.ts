/**
 * useEntries Hook
 *
 * Manages entry state and CRUD operations for the dashboard.
 * All mutations atomically update the financial summary.
 */

import { useState, useCallback } from "react"
import { Timestamp } from "firebase/firestore"
import {
  createEntry,
  getUserEntries,
  deleteEntry,
  updateEntry
} from "@/lib/firestore-entries"
import { addToSavingsAccount } from "@/lib/firestore-savings"
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "@/lib/constants/validation.constants"
import type { Entry, EntryFormData, ToastState } from "./types"

interface UseEntriesOptions {
  userId: string | undefined
  userCurrency: string
  onToast: (toast: ToastState) => void
  onSavingsReload?: () => Promise<void>
  onSummaryRefresh?: () => Promise<void>
}

export function useEntries({
  userId,
  userCurrency,
  onToast,
  onSavingsReload,
  onSummaryRefresh
}: UseEntriesOptions) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)

  const [lastVisible, setLastVisible] = useState<unknown>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const loadEntries = useCallback(async (refresh = false) => {
    if (!userId) return

    try {
      if (refresh) {
        setLoading(true)
        setLastVisible(null)
      }

      const { entries: firestoreEntries, lastVisible: newLastVisible } = await getUserEntries(userId, null, 20)

      const convertedEntries: Entry[] = firestoreEntries.map((entry) => ({
        id: entry.id,
        description: entry.description,
        amount: entry.amount,
        category: entry.category,
        date: entry.date instanceof Timestamp
          ? entry.date.toDate().toISOString()
          : typeof entry.date === "string"
          ? entry.date
          : new Date(entry.date as unknown as string | number | Date).toISOString(),
        type: entry.type,
        currency: entry.currency,
        notes: entry.notes,
        tags: entry.tags,
        receiptUrl: entry.receiptUrl,
      }))

      setEntries(convertedEntries)
      setFilteredEntries(convertedEntries)
      setLastVisible(newLastVisible)
      setHasMore(firestoreEntries.length === 20)
    } catch (error) {
      console.error("Error loading entries:", error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const loadMore = useCallback(async () => {
    if (!userId || !lastVisible || isLoadingMore) return

    try {
      setIsLoadingMore(true)
      const { entries: firestoreEntries, lastVisible: newLastVisible } = await getUserEntries(userId, lastVisible, 20)

      const convertedEntries: Entry[] = firestoreEntries.map((entry) => ({
        id: entry.id,
        description: entry.description,
        amount: entry.amount,
        category: entry.category,
        date: entry.date instanceof Timestamp
          ? entry.date.toDate().toISOString()
          : typeof entry.date === "string"
          ? entry.date
          : new Date(entry.date as unknown as string | number | Date).toISOString(),
        type: entry.type,
        currency: entry.currency,
        notes: entry.notes,
        tags: entry.tags,
        receiptUrl: entry.receiptUrl,
      }))

      setEntries((prev) => [...prev, ...convertedEntries])
      setFilteredEntries((prev) => [...prev, ...convertedEntries])

      setLastVisible(newLastVisible)
      setHasMore(firestoreEntries.length === 20)
    } catch (error) {
      console.error("Error loading more entries:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [userId, lastVisible, isLoadingMore])

  const handleAdd = useCallback(async (data: EntryFormData) => {
    if (!userId) return

    try {
      if (editingEntry) {
        // Pass old entry data so the summary can be updated atomically
        await updateEntry(editingEntry.id, {
          type: data.type,
          amount: data.amount,
          description: data.description,
          category: data.category,
          date: data.date as unknown as Timestamp,
          notes: data.notes,
          tags: data.tags,
          receiptUrl: data.receiptUrl,
        }, {
          type: editingEntry.type,
          amount: editingEntry.amount,
          category: editingEntry.category,
          date: editingEntry.date,
          userId,
        })

        await loadEntries()
        if (onSummaryRefresh) await onSummaryRefresh()
        onToast({ message: SUCCESS_MESSAGES.ENTRY_UPDATED, type: "success" })
        setEditingEntry(null)
      } else {
        // For income with savings allocation: record FULL income amount
        // The savings allocation is tracked as metadata on the entry
        if (data.type === "income" && data.allocateToSavings && data.allocateToSavings.amount > 0) {
          try {
            // 1. Add to savings account
            await addToSavingsAccount(
              data.allocateToSavings.accountId,
              data.allocateToSavings.amount
            )
            if (onSavingsReload) await onSavingsReload()

            // 2. Create entry with FULL income amount + savings allocation metadata
            await createEntry(userId, {
              type: data.type,
              amount: data.amount, // Full income amount
              currency: userCurrency,
              description: data.description,
              category: data.category,
              date: data.date,
              notes: data.notes,
              tags: data.tags,
              receiptUrl: data.receiptUrl,
              savingsAllocation: {
                accountId: data.allocateToSavings.accountId,
                amount: data.allocateToSavings.amount,
                accountName: data.allocateToSavings.accountName,
              },
            })

            await loadEntries()
            if (onSummaryRefresh) await onSummaryRefresh()

            onToast({
              message: `Income of ${data.amount.toFixed(2)} ${userCurrency} recorded. ${data.allocateToSavings.amount.toFixed(2)} ${userCurrency} allocated to savings.`,
              type: "success",
            })
          } catch (savingsError: unknown) {
            console.error("Error allocating to savings:", savingsError)
            // Fallback: still create the entry with full amount but without allocation metadata
            await createEntry(userId, {
              type: data.type,
              amount: data.amount,
              currency: userCurrency,
              description: data.description,
              category: data.category,
              date: data.date,
              notes: data.notes,
              tags: data.tags,
              receiptUrl: data.receiptUrl,
            })
            await loadEntries()
            if (onSummaryRefresh) await onSummaryRefresh()

            const errorMessage = savingsError instanceof Error ? savingsError.message : "Unknown error"
            onToast({
              message: `Entry added but savings allocation failed: ${errorMessage}`,
              type: "error",
            })
          }
        } else {
          // Standard entry creation (no savings allocation)
          await createEntry(userId, {
            type: data.type,
            amount: data.amount,
            currency: userCurrency,
            description: data.description,
            category: data.category,
            date: data.date,
            notes: data.notes,
            tags: data.tags,
          })

          await loadEntries()
          if (onSummaryRefresh) await onSummaryRefresh()
          onToast({ message: SUCCESS_MESSAGES.ENTRY_ADDED(data.type), type: "success" })
        }
      }
    } catch (error: unknown) {
      console.error("Error saving entry:", error)
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SAVE_FAILED
      onToast({ message: errorMessage, type: "error" })
      throw error
    }
  }, [userId, userCurrency, editingEntry, loadEntries, onToast, onSavingsReload, onSummaryRefresh])

  const handleEdit = useCallback((id: string) => {
    const entry = entries.find((e) => e.id === id)
    if (entry) {
      setEditingEntry(entry)
      setDialogOpen(true)
    }
  }, [entries])

  const handleDelete = useCallback(async (id: string) => {
    if (!userId) return

    try {
      // Find the entry to pass its data for summary reversal
      const entry = entries.find((e) => e.id === id)
      if (entry) {
        await deleteEntry(id, {
          type: entry.type,
          amount: entry.amount,
          category: entry.category,
          date: entry.date,
          userId,
        })
      } else {
        // Fallback: delete without summary update (summary will self-heal)
        await deleteEntry(id)
      }

      setEntries((prev) => prev.filter((e) => e.id !== id))
      setFilteredEntries((prev) => prev.filter((e) => e.id !== id))
      if (onSummaryRefresh) await onSummaryRefresh()
      onToast({ message: "Entry deleted successfully!", type: "success" })
    } catch (error) {
      console.error("Error deleting entry:", error)
      onToast({ message: ERROR_MESSAGES.DELETE_FAILED, type: "error" })
    }
  }, [userId, entries, onToast, onSummaryRefresh])

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingEntry(null)
    }
  }, [])

  return {
    entries,
    filteredEntries,
    setFilteredEntries,
    loading,
    dialogOpen,
    setDialogOpen,
    editingEntry,
    loadEntries,
    loadMore,
    hasMore,
    isLoadingMore,
    handleAdd,
    handleEdit,
    handleDelete,
    handleDialogClose,
  }
}
