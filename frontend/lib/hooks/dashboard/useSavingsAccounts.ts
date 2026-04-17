/**
 * useSavingsAccounts Hook
 *
 * Manages savings accounts state and CRUD operations for the dashboard
 */

import { useState, useCallback } from "react"
import {
  createSavingsAccount,
  getUserSavingsAccounts,
  deleteSavingsAccount,
  updateSavingsAccount,
  addToSavingsAccount,
  withdrawFromSavingsAccount,
} from "@/lib/firestore-savings"
import type { SavingsAccount, SavingsAccountFormData, ToastState } from "./types"
import { logger } from "@/lib/utils/logger"

interface UseSavingsAccountsOptions {
  userId: string | undefined
  onToast: (toast: ToastState) => void
}

export function useSavingsAccounts({ userId, onToast }: UseSavingsAccountsOptions) {
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<SavingsAccount | null>(null)

  const loadSavingsAccounts = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      const accounts = await getUserSavingsAccounts(userId)
      setSavingsAccounts(accounts)
    } catch (error) {
      logger.error("Error loading savings accounts", error)
      setSavingsAccounts([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const handleCreate = useCallback(async (data: SavingsAccountFormData) => {
    if (!userId) return

    try {
      await createSavingsAccount(userId, data)
      await loadSavingsAccounts()
      onToast({ message: "Savings account created successfully", type: "success" })
    } catch (error) {
      logger.error("Error creating savings account", error)
      onToast({ message: "Failed to create savings account. Please try again.", type: "error" })
    }
  }, [userId, loadSavingsAccounts, onToast])

  const handleUpdate = useCallback(async (data: SavingsAccountFormData) => {
    if (!userId || !editingAccount) return

    try {
      await updateSavingsAccount(editingAccount.id, data)
      await loadSavingsAccounts()
      onToast({ message: "Savings account updated successfully", type: "success" })
    } catch (error) {
      logger.error("Error updating savings account", error)
      onToast({ message: "Failed to update savings account. Please try again.", type: "error" })
    }
  }, [userId, editingAccount, loadSavingsAccounts, onToast])

  const handleSubmit = useCallback(async (data: SavingsAccountFormData) => {
    if (editingAccount) {
      await handleUpdate(data)
    } else {
      await handleCreate(data)
    }
  }, [editingAccount, handleCreate, handleUpdate])

  const handleEdit = useCallback((account: SavingsAccount) => {
    setEditingAccount(account)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (accountId: string) => {
    if (!userId) return

    try {
      await deleteSavingsAccount(accountId)
      await loadSavingsAccounts()
      onToast({ message: "Savings account deleted successfully", type: "success" })
    } catch (error) {
      logger.error("Error deleting savings account", error)
      onToast({ message: "Failed to delete savings account. Please try again.", type: "error" })
    }
  }, [userId, loadSavingsAccounts, onToast])

  const handleAddMoney = useCallback(async (accountId: string, amount: number) => {
    if (!userId) return

    try {
      await addToSavingsAccount(accountId, amount)
      await loadSavingsAccounts()
      onToast({ message: "Money added to savings account", type: "success" })
    } catch (error) {
      logger.error("Error adding money to savings account", error)
      onToast({ message: "Failed to add money. Please try again.", type: "error" })
    }
  }, [userId, loadSavingsAccounts, onToast])

  const handleWithdrawMoney = useCallback(async (accountId: string, amount: number) => {
    if (!userId) return

    try {
      await withdrawFromSavingsAccount(accountId, amount)
      await loadSavingsAccounts()
      onToast({ message: "Money withdrawn from savings account", type: "success" })
    } catch (error: unknown) {
      logger.error("Error withdrawing money from savings account", error)
      const errorMessage = error instanceof Error && error.message?.includes("Insufficient")
        ? "Insufficient balance in savings account"
        : "Failed to withdraw money. Please try again."
      onToast({ message: errorMessage, type: "error" })
    }
  }, [userId, loadSavingsAccounts, onToast])

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingAccount(null)
    }
  }, [])

  return {
    savingsAccounts,
    loading,
    dialogOpen,
    setDialogOpen,
    editingAccount,
    loadSavingsAccounts,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleAddMoney,
    handleWithdrawMoney,
    handleDialogClose,
  }
}
