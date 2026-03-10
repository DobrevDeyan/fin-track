"use client"

/**
 * Savings Context
 *
 * Provides savings accounts state and operations to all dashboard components
 * Eliminates prop drilling for savings-related data
 */

import { createContext, useContext, ReactNode, useCallback, useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
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
}

export function SavingsProvider({ children, userId }: SavingsProviderProps) {
  const t = useTranslations() // Initialize useTranslations
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<SavingsAccount | null>(null)

  useEffect(() => {
    if (!userId) {
      setSavingsAccounts([])
      setLoading(false)
    }
  }, [userId])

  const loadSavingsAccounts = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      const accounts = await getUserSavingsAccounts(userId)
      setSavingsAccounts(accounts)
    } catch (error) {
      console.error(t(ERROR_MESSAGES.LOAD_FAILED) + ":", error) // Use translated error
      setSavingsAccounts([])
    } finally {
      setLoading(false)
    }
  }, [userId, t]) // Add t to dependencies

  const handleCreate = useCallback(
    async (data: SavingsAccountFormData) => {
      if (!userId) return

      try {
        await createSavingsAccount(userId, data)
        await loadSavingsAccounts()
        toast.success(t("toast.savings.createSuccess")) // Use translated message
      } catch (error) {
        console.error(t(ERROR_MESSAGES.SAVINGS_SAVE_FAILED) + ":", error) // Use translated error
        toast.error(t(ERROR_MESSAGES.SAVINGS_SAVE_FAILED)) // Use translated error
      }
    },
    [userId, loadSavingsAccounts, t]
  )

  const handleUpdate = useCallback(
    async (data: SavingsAccountFormData) => {
      if (!userId || !editingAccount) return

      try {
        await updateSavingsAccount(editingAccount.id, data)
        await loadSavingsAccounts()
        toast.success(t("toast.savings.updateSuccess")) // Use translated message
      } catch (error) {
        console.error(t(ERROR_MESSAGES.SAVINGS_SAVE_FAILED) + ":", error) // Use translated error
        toast.error(t(ERROR_MESSAGES.SAVINGS_SAVE_FAILED)) // Use translated error
      }
    },
    [userId, editingAccount, loadSavingsAccounts, t]
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

      const deletedAccount = savingsAccounts.find(a => a.id === accountId)
      if (!deletedAccount) return

      setSavingsAccounts(prev => prev.filter(a => a.id !== accountId))

      const timer = setTimeout(async () => {
        try {
          await deleteSavingsAccount(accountId)
        } catch (error) {
          console.error(t(ERROR_MESSAGES.SAVINGS_DELETE_FAILED) + ":", error)
          await loadSavingsAccounts()
          toast.error(t(ERROR_MESSAGES.SAVINGS_DELETE_FAILED))
        }
      }, 5000)

      toast.success(t("toast.savings.deleted"), {
        action: { label: t("toast.undo"), onClick: () => { clearTimeout(timer); loadSavingsAccounts() } },
        duration: 5000,
      })
    },
    [userId, savingsAccounts, loadSavingsAccounts, t]
  )

  const handleAddMoney = useCallback(
    async (accountId: string, amount: number) => {
      if (!userId) return

      try {
        await addToSavingsAccount(accountId, amount)
        await loadSavingsAccounts()
        toast.success(t("toast.savings.depositSuccess")) // Use translated message
      } catch (error) {
        console.error(t(ERROR_MESSAGES.DEPOSIT_FAILED) + ":", error) // Use translated error
        toast.error(t(ERROR_MESSAGES.DEPOSIT_FAILED)) // Use translated error
      }
    },
    [userId, loadSavingsAccounts, t]
  )

  const handleWithdrawMoney = useCallback(
    async (accountId: string, amount: number) => {
      if (!userId) return

      try {
        await withdrawFromSavingsAccount(accountId, amount)
        await loadSavingsAccounts()
        toast.success(t("toast.savings.withdrawSuccess")) // Use translated message
      } catch (error: unknown) {
        console.error(t(ERROR_MESSAGES.WITHDRAW_FAILED) + ":", error) // Use translated error
        const errorMessage = isInsufficientBalanceError(error)
          ? ERROR_MESSAGES.INSUFFICIENT_BALANCE
          : ERROR_MESSAGES.WITHDRAW_FAILED
        toast.error(t(errorMessage)) // Use translated error
      }
    },
    [userId, loadSavingsAccounts, t]
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

