/**
 * useEntries Hook
 *
 * Manages entry state and CRUD operations for the dashboard
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
}

export function useEntries({
  userId,
  userCurrency,
  onToast,
  onSavingsReload
}: UseEntriesOptions) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)

  const loadEntries = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      const firestoreEntries = await getUserEntries(userId)

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
    } catch (error) {
      console.error("Error loading entries:", error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const handleAdd = useCallback(async (data: EntryFormData) => {
    if (!userId) return

    try {
      if (editingEntry) {
        await updateEntry(editingEntry.id, {
          type: data.type,
          amount: data.amount,
          description: data.description,
          category: data.category,
          date: data.date as unknown as Timestamp,
          notes: data.notes,
          tags: data.tags,
          receiptUrl: data.receiptUrl,
        })

        await loadEntries()
        onToast({ message: SUCCESS_MESSAGES.ENTRY_UPDATED, type: "success" })
        setEditingEntry(null)
      } else {
        const allocatedToSavings = data.allocateToSavings?.amount || 0
        const balanceAmount = data.type === "income"
          ? Math.max(0, data.amount - allocatedToSavings)
          : data.amount

        if (data.type === "income" && data.allocateToSavings) {
          try {
            await addToSavingsAccount(
              data.allocateToSavings.accountId,
              data.allocateToSavings.amount
            )
            if (onSavingsReload) await onSavingsReload()

            if (balanceAmount > 0) {
              await createEntry(userId, {
                type: data.type,
                amount: balanceAmount,
                currency: userCurrency,
                description: data.description,
                category: data.category,
                date: data.date,
                notes: data.notes,
                tags: data.tags,
                receiptUrl: data.receiptUrl,
              })
              await loadEntries()

              onToast({
                message: `Entry added (${balanceAmount.toFixed(2)} ${userCurrency} to balance) and ${data.allocateToSavings.amount.toFixed(2)} ${userCurrency} allocated to savings`,
                type: "success",
              })
            } else {
              onToast({
                message: `${data.allocateToSavings.amount.toFixed(2)} ${userCurrency} allocated to savings`,
                type: "success",
              })
            }
          } catch (savingsError: unknown) {
            console.error("Error allocating to savings:", savingsError)
            if (balanceAmount > 0) {
              await createEntry(userId, {
                type: data.type,
                amount: balanceAmount,
                currency: userCurrency,
                description: data.description,
                category: data.category,
                date: data.date,
                notes: data.notes,
                tags: data.tags,
                receiptUrl: data.receiptUrl,
              })
              await loadEntries()
            }
            const errorMessage = savingsError instanceof Error ? savingsError.message : "Unknown error"
            onToast({
              message: `Failed to allocate to savings: ${errorMessage}`,
              type: "error",
            })
          }
        } else {
          await createEntry(userId, {
            type: data.type,
            amount: balanceAmount,
            currency: userCurrency,
            description: data.description,
            category: data.category,
            date: data.date,
            notes: data.notes,
            tags: data.tags,
          })

          await loadEntries()
          onToast({ message: SUCCESS_MESSAGES.ENTRY_ADDED(data.type), type: "success" })
        }
      }
    } catch (error: unknown) {
      console.error("Error saving entry:", error)
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SAVE_FAILED
      onToast({ message: errorMessage, type: "error" })
      throw error
    }
  }, [userId, userCurrency, editingEntry, loadEntries, onToast, onSavingsReload])

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
      await deleteEntry(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
      setFilteredEntries((prev) => prev.filter((e) => e.id !== id))
      onToast({ message: "Entry deleted successfully!", type: "success" })
    } catch (error) {
      console.error("Error deleting entry:", error)
      onToast({ message: ERROR_MESSAGES.DELETE_FAILED, type: "error" })
    }
  }, [userId, onToast])

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
    handleAdd,
    handleEdit,
    handleDelete,
    handleDialogClose,
  }
}
