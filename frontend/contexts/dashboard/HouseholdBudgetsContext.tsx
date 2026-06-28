"use client"

import { createContext, useContext, ReactNode, useCallback, useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Timestamp } from "firebase/firestore"
import {
  getHouseholdBudgets,
  createHouseholdBudget,
  updateHouseholdBudget,
  deleteHouseholdBudget,
  renewHouseholdBudget,
} from "@/lib/firestore-household-budgets"
import { toISOString } from "@/lib/utils/timestamp"
import { logger } from "@/lib/utils/logger"
import type { Budget, BudgetFormData } from "./BudgetsContext"

interface HouseholdBudgetsContextValue {
  budgets: Budget[]
  loading: boolean
  error: string | null
  dialogOpen: boolean
  editingBudget: Budget | null
  loadBudgets: () => Promise<void>
  ensureBudgetsLoaded: () => Promise<void>
  handleSubmit: (data: BudgetFormData) => Promise<void>
  handleEdit: (budget: Budget) => void
  handleDelete: (budgetId: string) => Promise<void>
  handleRenew: (budgetId: string, period: "weekly" | "monthly" | "yearly") => Promise<void>
  handleDialogClose: (open: boolean) => void
  openDialog: () => void
}

const HouseholdBudgetsContext = createContext<HouseholdBudgetsContextValue | null>(null)

interface Props {
  children: ReactNode
  householdId: string | null | undefined
}

export function HouseholdBudgetsProvider({ children, householdId }: Props) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const hasLoadedRef = useRef(false)
  const pendingDeletesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Reset when household changes so new household data loads fresh
  useEffect(() => {
    hasLoadedRef.current = false
    setBudgets([])
  }, [householdId])

  // On unmount, fire any still-pending deletes immediately (honors intent)
  // without touching React state afterwards.
  useEffect(() => {
    const pending = pendingDeletesRef.current
    return () => {
      pending.forEach((timer, budgetId) => {
        clearTimeout(timer)
        deleteHouseholdBudget(budgetId).catch((err) => logger.error("Error flushing shared budget delete", err))
      })
      pending.clear()
    }
  }, [])

  const loadBudgets = useCallback(async () => {
    if (!householdId) return
    try {
      setLoading(true)
      setError(null)
      const raw = await getHouseholdBudgets(householdId)
      const converted: Budget[] = raw.map((b) => ({
        id: b.id,
        name: b.name,
        category: b.category,
        amount: b.amount,
        currency: b.currency,
        period: b.period,
        startDate: toISOString(b.startDate) || new Date().toISOString(),
        endDate: toISOString(b.endDate) || new Date().toISOString(),
        isActive: b.isActive,
        alertThreshold: b.alertThreshold,
      }))
      setBudgets(converted)
      hasLoadedRef.current = true
    } catch (err) {
      logger.error("Error loading household budgets", err)
      setBudgets([])
      setError("load_failed")
    } finally {
      setLoading(false)
    }
  }, [householdId])

  const ensureBudgetsLoaded = useCallback(async () => {
    if (hasLoadedRef.current) return
    await loadBudgets()
  }, [loadBudgets])

  const handleSubmit = useCallback(
    async (data: BudgetFormData) => {
      if (!householdId) return
      try {
        const startTs = typeof data.startDate === "string"
          ? Timestamp.fromDate(new Date(data.startDate))
          : data.startDate as unknown as Timestamp
        const endTs = typeof data.endDate === "string"
          ? Timestamp.fromDate(new Date(data.endDate))
          : data.endDate as unknown as Timestamp

        if (editingBudget) {
          await updateHouseholdBudget(editingBudget.id, {
            name: data.name, category: data.category, amount: data.amount,
            currency: data.currency, period: data.period,
            startDate: startTs, endDate: endTs,
            isActive: data.isActive, alertThreshold: data.alertThreshold,
          })
          toast.success("Shared budget updated")
          setEditingBudget(null)
        } else {
          await createHouseholdBudget(householdId, {
            name: data.name, category: data.category, amount: data.amount,
            currency: data.currency, period: data.period,
            startDate: startTs, endDate: endTs,
            isActive: data.isActive, alertThreshold: data.alertThreshold,
          })
          toast.success("Shared budget created")
        }
        await loadBudgets()
      } catch (error) {
        logger.error("Error saving household budget", error)
        toast.error("Failed to save shared budget")
        throw error
      }
    },
    [householdId, editingBudget, loadBudgets]
  )

  const handleEdit = useCallback((budget: Budget) => {
    setEditingBudget(budget)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (budgetId: string) => {
      const deleted = budgets.find((b) => b.id === budgetId)
      if (!deleted) return
      setBudgets((prev) => prev.filter((b) => b.id !== budgetId))
      const timer = setTimeout(async () => {
        pendingDeletesRef.current.delete(budgetId)
        try {
          await deleteHouseholdBudget(budgetId)
        } catch {
          await loadBudgets()
          toast.error("Failed to delete shared budget")
        }
      }, 5000)
      pendingDeletesRef.current.set(budgetId, timer)
      toast.success("Shared budget deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timer)
            pendingDeletesRef.current.delete(budgetId)
            loadBudgets()
          },
        },
        duration: 5000,
      })
    },
    [budgets, loadBudgets]
  )

  const handleRenew = useCallback(
    async (budgetId: string, period: "weekly" | "monthly" | "yearly") => {
      try {
        await renewHouseholdBudget(budgetId, period)
        await loadBudgets()
        toast.success("Shared budget renewed")
      } catch {
        toast.error("Failed to renew shared budget")
      }
    },
    [loadBudgets]
  )

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) setEditingBudget(null)
  }, [])

  const openDialog = useCallback(() => {
    setEditingBudget(null)
    setDialogOpen(true)
  }, [])

  return (
    <HouseholdBudgetsContext.Provider value={{
      budgets, loading, error, dialogOpen, editingBudget,
      loadBudgets, ensureBudgetsLoaded, handleSubmit,
      handleEdit, handleDelete, handleRenew, handleDialogClose, openDialog,
    }}>
      {children}
    </HouseholdBudgetsContext.Provider>
  )
}

export function useHouseholdBudgetsContext() {
  const ctx = useContext(HouseholdBudgetsContext)
  if (!ctx) throw new Error("useHouseholdBudgetsContext must be used within HouseholdBudgetsProvider")
  return ctx
}
