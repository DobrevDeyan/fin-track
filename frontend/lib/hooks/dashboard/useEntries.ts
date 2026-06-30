/**
 * useEntries Hook
 *
 * Manages entry state and CRUD operations for the dashboard.
 * All mutations atomically update the financial summary.
 */

import { useState, useCallback, useRef } from "react"
import { Timestamp } from "firebase/firestore"
import {
  createEntry,
  getUserEntries,
  getAllUserEntries,
  deleteEntry,
  updateEntry
} from "@/lib/firestore-entries"
import { addToSavingsAccount } from "@/lib/firestore-savings"
import { deleteReceipt } from "@/lib/receipt-utils"
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)

  const [lastVisible, setLastVisible] = useState<unknown>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Full entry history, loaded lazily only when the transactions filter/search
  // is active so that filtering covers the whole dataset, not just the first
  // paginated page (see review M1). `null` = not loaded yet.
  const [allEntries, setAllEntries] = useState<Entry[] | null>(null)
  const [loadingAllEntries, setLoadingAllEntries] = useState(false)
  // Guards the lazy full-history load so a failed fetch doesn't get retried in a
  // tight loop by the caller's effect. Reset to false only on cache invalidation
  // (a create/edit), which lets the next active-filter render refetch.
  const allEntriesAttemptedRef = useRef(false)

  // Stored amounts are canonical EUR; the form works in the user's display currency.
  // Convert display → EUR on the way into Firestore.
  const { toBaseCurrency } = useCurrency()

  const loadEntries = useCallback(async (refresh = false) => {
    if (!userId) return

    try {
      setError(null)
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
      setLastVisible(newLastVisible)
      setHasMore(firestoreEntries.length === 20)
    } catch (err) {
      logger.error("Error loading entries", err)
      setError(err instanceof Error ? err : new Error("Failed to load entries"))
      toast.error("Failed to load transactions. Pull to refresh or try again.")
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

      setLastVisible(newLastVisible)
      setHasMore(firestoreEntries.length === 20)
    } catch (error) {
      logger.error("Error loading more entries", error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [userId, lastVisible, isLoadingMore])

  // Invalidate the cached full history so the next active-filter render refetches.
  const invalidateAllEntries = useCallback(() => {
    allEntriesAttemptedRef.current = false
    setAllEntries(null)
  }, [])

  // Load the full entry history for filtering/search. Lazy + cached + self-
  // guarding: safe to call on every render while a filter is active. It fetches
  // at most once per cache generation (success OR failure) so a failed fetch is
  // not retried in a loop; a create/edit invalidates the cache to allow a fresh
  // attempt. A delete mirrors the removal in-place (see handleDelete).
  const loadAllEntries = useCallback(async () => {
    if (!userId || allEntriesAttemptedRef.current) return
    allEntriesAttemptedRef.current = true
    setLoadingAllEntries(true)
    try {
      const firestoreEntries = await getAllUserEntries(userId)
      const converted: Entry[] = firestoreEntries.map((entry) => ({
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
      setAllEntries(converted)
    } catch (err) {
      logger.error("Error loading full entry history for filtering", err)
      // Leave allEntries as-is; the view falls back to the paginated list.
    } finally {
      setLoadingAllEntries(false)
    }
  }, [userId])

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
        invalidateAllEntries() // full-history cache is stale after an edit
        if (onSummaryRefresh) await onSummaryRefresh()
        toast.success(SUCCESS_MESSAGES.ENTRY_UPDATED)
        setEditingEntry(null)
      } else {
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

        // Only AFTER the entry is safely recorded, run any automated savings
        // transfer (an expense whose category is a savings account). Doing this
        // after creation ensures we never move money into savings without a
        // matching expense entry (see review F2).
        if (data.type === "expense" && data.categoryId?.startsWith("savings_")) {
          try {
            const accountId = data.categoryId.replace("savings_", "")
            await addToSavingsAccount(accountId, toBaseCurrency(data.amount))
            if (onSavingsReload) await onSavingsReload()
          } catch (transferError) {
            logger.error("Error processing auto-transfer to savings", transferError)
            toast.error("Transaction saved, but moving it into the savings account failed — adjust the balance manually.")
          }
        }

        await loadEntries()
        invalidateAllEntries() // full-history cache is stale after a new entry
        if (onSummaryRefresh) await onSummaryRefresh()
        toast.success(SUCCESS_MESSAGES.ENTRY_ADDED(data.type))
      }
    } catch (error: unknown) {
      logger.error("Error saving entry", error)
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SAVE_FAILED
      toast.error(errorMessage)
      throw error
    }
  }, [userId, editingEntry, loadEntries, invalidateAllEntries, onSavingsReload, onSummaryRefresh, toBaseCurrency])

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

      // Best-effort cleanup of the attached receipt image so it doesn't orphan
      // in Storage after its transaction is gone (review RCP-10). Non-fatal:
      // the entry is already deleted; a stuck image shouldn't surface an error.
      if (entry?.receiptUrl) {
        try {
          await deleteReceipt(entry.receiptUrl)
        } catch (receiptError) {
          logger.error("Failed to delete receipt image for deleted entry", receiptError)
        }
      }

      setEntries((prev) => prev.filter((e) => e.id !== id))
      setAllEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev))
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
    allEntries,
    loadAllEntries,
    loadingAllEntries,
    loading,
    error,
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
