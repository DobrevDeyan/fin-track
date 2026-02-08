"use client"

/**
 * Savings Context
 *
 * Provides savings accounts state and operations to all dashboard components
 * Eliminates prop drilling for savings-related data
 */

import { createContext, useContext, ReactNode, useCallback, useState } from "react"
import {
  createSavingsAccount,
  getUserSavingsAccounts,
  deleteSavingsAccount,
  updateSavingsAccount,
  addToSavingsAccount,
  withdrawFromSavingsAccount,
} from "@/lib/firestore-savings"
import { SavingsAccountDocument } from "@/lib/firestore-types"
import { isInsufficientBalanceError, ERROR_MESSAGES } from "@/lib/utils/error"

// Use the full document type for compatibility with existing components
export type SavingsAccount = SavingsAccountDocument & { id: string }

export interface SavingsAccountFormData {
  name: string
  balance: number
  currency: string
  description?: string
  color?: string
  icon?: string
  isActive: boolean
}

interface ToastState {
  message: string
  type: "success" | "error"
}

interface SavingsContextValue {
  // State
  savingsAccounts: SavingsAccount[]
  loading: boolean
  dialogOpen: boolean
  editingAccount: SavingsAccount | null

  // Actions
  loadSavingsAccounts: () => Promise<void>
  handleSubmit: (data: SavingsAccountFormData) => Promise<void>
  handleEdit: (account: SavingsAccount) => void
  handleDelete: (accountId: string) => Promise<void>
  handleAddMoney: (accountId: string, amount: number) => Promise<void>
  handleWithdrawMoney: (accountId: string, amount: number) => Promise<void>
  handleDialogClose: (open: boolean) => void
  openDialog: () => void
}

const SavingsContext = createContext<SavingsContextValue | null>(null)

interface SavingsProviderProps {
  children: ReactNode
  userId: string | undefined
  onToast: (toast: ToastState) => void
}

export function SavingsProvider({ children, userId, onToast }: SavingsProviderProps) {
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
      console.error("Error loading savings accounts:", error)
      setSavingsAccounts([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const handleCreate = useCallback(
    async (data: SavingsAccountFormData) => {
      if (!userId) return

      try {
        await createSavingsAccount(userId, data)
        await loadSavingsAccounts()
        onToast({ message: "Savings account created successfully", type: "success" })
      } catch (error) {
        console.error("Error creating savings account:", error)
        onToast({ message: ERROR_MESSAGES.SAVINGS_SAVE_FAILED, type: "error" })
      }
    },
    [userId, loadSavingsAccounts, onToast]
  )

  const handleUpdate = useCallback(
    async (data: SavingsAccountFormData) => {
      if (!userId || !editingAccount) return

      try {
        await updateSavingsAccount(editingAccount.id, data)
        await loadSavingsAccounts()
        onToast({ message: "Savings account updated successfully", type: "success" })
      } catch (error) {
        console.error("Error updating savings account:", error)
        onToast({ message: ERROR_MESSAGES.SAVINGS_SAVE_FAILED, type: "error" })
      }
    },
    [userId, editingAccount, loadSavingsAccounts, onToast]
  )

  const handleSubmit = useCallback(
    async (data: SavingsAccountFormData) => {
      if (editingAccount) {
        await handleUpdate(data)
      } else {
        await handleCreate(data)
      }
    },
    [editingAccount, handleCreate, handleUpdate]
  )

  const handleEdit = useCallback((account: SavingsAccount) => {
    setEditingAccount(account)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (accountId: string) => {
      if (!userId) return

      try {
        await deleteSavingsAccount(accountId)
        await loadSavingsAccounts()
        onToast({ message: "Savings account deleted successfully", type: "success" })
      } catch (error) {
        console.error("Error deleting savings account:", error)
        onToast({ message: ERROR_MESSAGES.SAVINGS_DELETE_FAILED, type: "error" })
      }
    },
    [userId, loadSavingsAccounts, onToast]
  )

  const handleAddMoney = useCallback(
    async (accountId: string, amount: number) => {
      if (!userId) return

      try {
        await addToSavingsAccount(accountId, amount)
        await loadSavingsAccounts()
        onToast({ message: "Money added to savings account", type: "success" })
      } catch (error) {
        console.error("Error adding money to savings account:", error)
        onToast({ message: ERROR_MESSAGES.DEPOSIT_FAILED, type: "error" })
      }
    },
    [userId, loadSavingsAccounts, onToast]
  )

  const handleWithdrawMoney = useCallback(
    async (accountId: string, amount: number) => {
      if (!userId) return

      try {
        await withdrawFromSavingsAccount(accountId, amount)
        await loadSavingsAccounts()
        onToast({ message: "Money withdrawn from savings account", type: "success" })
      } catch (error: unknown) {
        console.error("Error withdrawing money from savings account:", error)
        const errorMessage = isInsufficientBalanceError(error)
          ? ERROR_MESSAGES.INSUFFICIENT_BALANCE
          : ERROR_MESSAGES.WITHDRAW_FAILED
        onToast({ message: errorMessage, type: "error" })
      }
    },
    [userId, loadSavingsAccounts, onToast]
  )

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingAccount(null)
    }
  }, [])

  const openDialog = useCallback(() => {
    setEditingAccount(null)
    setDialogOpen(true)
  }, [])

  const value: SavingsContextValue = {
    savingsAccounts,
    loading,
    dialogOpen,
    editingAccount,
    loadSavingsAccounts,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleAddMoney,
    handleWithdrawMoney,
    handleDialogClose,
    openDialog,
  }

  return <SavingsContext.Provider value={value}>{children}</SavingsContext.Provider>
}

export function useSavingsContext() {
  const context = useContext(SavingsContext)
  if (!context) {
    throw new Error("useSavingsContext must be used within a SavingsProvider")
  }
  return context
}
