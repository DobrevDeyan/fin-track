/**
 * useEntries Hook
 *
 * Manages entry state and CRUD operations for the dashboard.
 * All mutations atomically update the financial summary.
 *
 * Reads are backed by TanStack Query rather than useState/useEffect. What the
 * library now owns, and this file no longer hand-rolls:
 *   - the cache (keyed per user, shared across every mounted copy of this hook)
 *   - loading / error / "is fetching another page" flags
 *   - request deduplication (three components, one Firestore read)
 *   - invalidation on write
 *
 * The public API is unchanged, deliberately: loadEntries/loadMore/hasMore/
 * isLoadingMore/loadAllEntries all still exist with the same signatures, so
 * dashboard, calendar and GlobalQuickAdd needed no edits.
 *
 * The read profile is unchanged too. Both queries stay disabled until a
 * consumer explicitly asks for the data — GlobalQuickAdd is mounted in the
 * (app) layout on every page and must never trigger a fetch, which an
 * unconditionally-enabled query would do.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { Timestamp } from "firebase/firestore"
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query"
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
import { entryKeys } from "@/lib/query-keys"
import type { EntryDocument } from "@/lib/firestore-types"
import type { Entry, EntryFormData } from "./types"
import { useCurrency } from "@/contexts/CurrencyContext"
import { BASE_CURRENCY } from "@/lib/constants/currency.constants"
import { logger } from "@/lib/utils/logger"

const PAGE_SIZE = 20

interface EntriesPage {
  entries: Entry[]
  /** Firestore snapshot used as the startAfter cursor for the next page. */
  cursor: unknown
}

/** Firestore document to view model. Was duplicated in three places. */
function toEntry(doc: EntryDocument & { id: string }): Entry {
  return {
    id: doc.id,
    description: doc.description,
    amount: doc.amount,
    category: doc.category,
    date: toISOString(doc.date) || "",
    type: doc.type,
    currency: doc.currency,
    notes: doc.notes,
    tags: doc.tags,
    receiptUrl: doc.receiptUrl,
  }
}

interface UseEntriesOptions {
  userId: string | undefined
  userCurrency: string
  onSavingsReload?: () => Promise<void>
  onSummaryRefresh?: () => Promise<void>
}

export function useEntries({
  userId,
  onSavingsReload,
  onSummaryRefresh
}: UseEntriesOptions) {
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)

  // Both queries are opt-in. The *Requested state is the enabled flag; the
  // matching ref keeps the imperative loaders referentially stable, since they
  // sit in consumer effect dependency arrays.
  const [listRequested, setListRequested] = useState(false)
  const listRequestedRef = useRef(false)
  const [historyRequested, setHistoryRequested] = useState(false)

  // Stored amounts are canonical EUR; the form works in the user display
  // currency. Convert display to EUR on the way into Firestore.
  const { toBaseCurrency } = useCurrency()

  // Paginated list for the transactions table. The cursor that used to live in
  // useState is now the query pageParam; hasMore is derived, not tracked.
  const listQuery = useInfiniteQuery({
    queryKey: entryKeys.list(userId),
    queryFn: async ({ pageParam }): Promise<EntriesPage> => {
      const { entries: docs, lastVisible } = await getUserEntries(userId!, pageParam, PAGE_SIZE)
      return { entries: docs.map(toEntry), cursor: lastVisible }
    },
    initialPageParam: null as unknown,
    // A short final page means the collection is exhausted. Returning undefined
    // is what makes hasNextPage false.
    getNextPageParam: (lastPage: EntriesPage) =>
      lastPage.entries.length === PAGE_SIZE ? lastPage.cursor : undefined,
    enabled: !!userId && listRequested,
  })

  // Full entry history, fetched only when the transactions filter/search is
  // active so filtering covers the whole dataset rather than the first page
  // (see review M1). The old attempted-ref retry guard is gone: a failed query
  // settles into an error state and is not re-fired by a consumer effect
  // calling loadAllEntries() again, because enabling is idempotent.
  const historyQuery = useQuery({
    queryKey: entryKeys.history(userId),
    queryFn: async () => (await getAllUserEntries(userId!)).map(toEntry),
    enabled: !!userId && historyRequested,
  })

  const entries = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.entries) ?? [],
    [listQuery.data]
  )

  const listError = listQuery.error
  useEffect(() => {
    if (!listError) return
    logger.error("Error loading entries", listError)
    toast.error("Failed to load transactions. Pull to refresh or try again.")
  }, [listError])

  const historyError = historyQuery.error
  useEffect(() => {
    if (!historyError) return
    // The view falls back to the paginated list; no toast, as before.
    logger.error("Error loading full entry history for filtering", historyError)
  }, [historyError])

  const { refetch: refetchList } = listQuery

  // The first call mounts the query, which performs the initial fetch; later
  // calls are real refreshes. Without that distinction the dashboard mount
  // effect would fire a second read on top of the initial fetch.
  const loadEntries = useCallback(async () => {
    if (!userId) return
    if (!listRequestedRef.current) {
      listRequestedRef.current = true
      setListRequested(true)
      return
    }
    await refetchList()
  }, [userId, refetchList])

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = listQuery

  const loadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return
    await fetchNextPage()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  // Idempotent: safe to call on every render while a filter is active.
  const loadAllEntries = useCallback(async () => {
    if (!userId) return
    setHistoryRequested(true)
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

        // One call replaces the old pair of "refetch the list" plus
        // "hand-invalidate the full-history cache".
        await queryClient.invalidateQueries({ queryKey: entryKeys.all })
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

        await queryClient.invalidateQueries({ queryKey: entryKeys.all })
        if (onSummaryRefresh) await onSummaryRefresh()
        toast.success(SUCCESS_MESSAGES.ENTRY_ADDED(data.type))
      }
    } catch (error: unknown) {
      logger.error("Error saving entry", error)
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SAVE_FAILED
      toast.error(errorMessage)
      throw error
    }
  }, [userId, editingEntry, queryClient, onSavingsReload, onSummaryRefresh, toBaseCurrency])

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

      // Drop the row from both caches in place, exactly as the old code spliced
      // it out of component state. No refetch: it costs no extra reads and the
      // pagination cursors stay valid.
      queryClient.setQueryData<InfiniteData<EntriesPage, unknown>>(
        entryKeys.list(userId),
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  entries: page.entries.filter((e) => e.id !== id),
                })),
              }
            : old
      )
      queryClient.setQueryData<Entry[]>(entryKeys.history(userId), (old) =>
        old ? old.filter((e) => e.id !== id) : old
      )

      if (onSummaryRefresh) await onSummaryRefresh()
      toast.success("Entry deleted successfully!")
    } catch (error) {
      logger.error("Error deleting entry", error)
      toast.error(ERROR_MESSAGES.DELETE_FAILED)
    }
  }, [userId, entries, queryClient, onSummaryRefresh])

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingEntry(null)
    }
  }, [])

  return {
    entries,
    allEntries: historyQuery.data ?? null,
    loadAllEntries,
    loadingAllEntries: historyQuery.isFetching,
    loading: listQuery.isPending,
    error: listQuery.error,
    dialogOpen,
    setDialogOpen,
    editingEntry,
    loadEntries,
    loadMore,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    handleAdd,
    handleEdit,
    handleDelete,
    handleDialogClose,
  }
}
