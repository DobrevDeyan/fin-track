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
import { toast } from "sonner"
import { toISOString } from "@/lib/utils/timestamp"
import type { Entry, EntryFormData } from "./types"
import { useCurrency } from "@/contexts/CurrencyContext"
import { BASE_CURRENCY } from "@/lib/constants/currency.constants"
import { logger } from "@/lib/utils/logger"

interface UseEntriesOptions {
  userId: string | undefined
  userCurrency: string
  onSavingsReload?: () => Promise<void>
  onSummaryRefresh?: () => Promise<void>
}

export function useEntries({
  userId,
  userCurrency,
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

  // Stored amounts are canonical EUR; the form works in the user's display currency.
  // Convert display → EUR on the way into Firestore.
  const { toBaseCurrency } = useCurrency()

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
      logger.error("Error loading entries", error)
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
        date: toISOString(entry.date) || "",
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
      logger.error("Error loading more entries", error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [userId, lastVisible, isLoadingMore])

  const handleAdd = useCallback(async (data: EntryFormData) => {
    if (!userId) return

    try {
      if (editingEntry) {
        // Pass old entry data so the summary can be updated atomically.
        // editingEntry.amount is already canonical EUR (stored); the new amount
        // comes from the form in display currency, so convert it to EUR.
        await updateEntry(editingEntry.id, {
          type: data.type,
          amount: toBaseCurrency(data.amount),
          currency: BASE_CURRENCY,
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
        toast.success(SUCCESS_MESSAGES.ENTRY_UPDATED)
        setEditingEntry(null)
      } else {
        // Handle automated savings/goals transfers for "expense" types
        // where the category is actually a savings account or a goal
        if (data.type === "expense" && data.categoryId) {
          try {
            if (data.categoryId.startsWith("savings_")) {
              const accountId = data.categoryId.replace("savings_", "");
              // Adding to saving (moving money into the account) — store in EUR
              await addToSavingsAccount(accountId, toBaseCurrency(data.amount));
              if (onSavingsReload) await onSavingsReload();
            }
          } catch (transferError) {
             logger.error("Error processing auto-transfer", transferError);
             toast.error("Transaction added but auto-transfer to Savings/Goal failed.");
          }
        }

        // Standard entry creation — amount stored canonically in EUR
        await createEntry(userId, {
          type: data.type,
          amount: toBaseCurrency(data.amount),
          currency: BASE_CURRENCY,
          description: data.description,
          category: data.category,
          date: data.date,
          notes: data.notes,
          tags: data.tags,
          receiptUrl: data.receiptUrl,
          categoryId: data.categoryId,
        })
        
        await loadEntries()
        if (onSummaryRefresh) await onSummaryRefresh()
        toast.success(SUCCESS_MESSAGES.ENTRY_ADDED(data.type))
      }
    } catch (error: unknown) {
      logger.error("Error saving entry", error)
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SAVE_FAILED
      toast.error(errorMessage)
      throw error
    }
  }, [userId, editingEntry, loadEntries, onSavingsReload, onSummaryRefresh, toBaseCurrency])

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
      toast.success("Entry deleted successfully!")
    } catch (error) {
      logger.error("Error deleting entry", error)
      toast.error(ERROR_MESSAGES.DELETE_FAILED)
    }
  }, [userId, entries, onSummaryRefresh])

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
