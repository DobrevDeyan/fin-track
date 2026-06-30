"use client"

import { createContext, useContext, ReactNode, useCallback, useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Timestamp } from "firebase/firestore"
import {
  getHouseholdGoals,
  createHouseholdGoal,
  updateHouseholdGoal,
  deleteHouseholdGoal,
  addFundsToHouseholdGoal,
  type HouseholdGoal,
} from "@/lib/firestore-household-goals"
import { createEntry } from "@/lib/firestore-entries"
import { logger } from "@/lib/utils/logger"
import { useCurrency } from "@/contexts/CurrencyContext"
import { BASE_CURRENCY } from "@/lib/constants/currency.constants"
import type { GoalFormData } from "./GoalsContext"

export type { HouseholdGoal }

interface HouseholdGoalsContextValue {
  goals: HouseholdGoal[]
  loading: boolean
  error: string | null
  dialogOpen: boolean
  editingGoal: HouseholdGoal | null
  loadGoals: () => Promise<void>
  ensureGoalsLoaded: () => Promise<void>
  handleSubmit: (data: GoalFormData) => Promise<void>
  handleEdit: (goal: HouseholdGoal) => void
  handleDelete: (goalId: string) => Promise<void>
  handleAddFunds: (goalId: string, amount: number) => Promise<void>
  handleDialogClose: (open: boolean) => void
  openDialog: () => void
}

const HouseholdGoalsContext = createContext<HouseholdGoalsContextValue | null>(null)

interface Props {
  children: ReactNode
  householdId: string | null | undefined
  userId: string | undefined
  displayName?: string
}

export function HouseholdGoalsProvider({ children, householdId, userId, displayName }: Props) {
  const { toBaseCurrency } = useCurrency()
  const [goals, setGoals] = useState<HouseholdGoal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<HouseholdGoal | null>(null)
  const hasLoadedRef = useRef(false)
  // Pending optimistic deletes keyed by goalId — cancelled on Undo.
  const pendingDeletesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  // Tracks whether the provider is still mounted so timers that fire after
  // unmount (H7-7) still COMMIT the delete but skip any state updates.
  const mountedRef = useRef(true)

  useEffect(() => {
    hasLoadedRef.current = false
    setGoals([])
  }, [householdId])

  // H7-7: don't flush pending deletes on unmount — that committed a delete the
  // instant the user left Family view, silently cutting the 5s undo window short.
  // Instead let each timer run to completion (the global toast keeps Undo live
  // across navigation); we only guard against state updates after unmount.
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const loadGoals = useCallback(async () => {
    if (!householdId) return
    try {
      setLoading(true)
      setError(null)
      const raw = await getHouseholdGoals(householdId)
      setGoals(raw)
      hasLoadedRef.current = true
    } catch (error) {
      logger.error("Error loading household goals", error)
      setGoals([])
      // H7-8: surface the real cause (permission-denied, missing index, …) rather
      // than masking every failure behind a generic message.
      setError(error instanceof Error ? error.message : "Failed to load shared goals")
    } finally {
      setLoading(false)
    }
  }, [householdId])

  const ensureGoalsLoaded = useCallback(async () => {
    if (hasLoadedRef.current) return
    await loadGoals()
  }, [loadGoals])

  const handleSubmit = useCallback(
    async (data: GoalFormData) => {
      if (!householdId) return
      const deadlineTs = data.deadline
        ? (data.deadline instanceof Timestamp
          ? data.deadline
          : Timestamp.fromDate(new Date(data.deadline as string)))
        : undefined

      try {
        if (editingGoal) {
          await updateHouseholdGoal(editingGoal.id, {
            name: data.name,
            targetAmount: data.targetAmount,
            currentAmount: data.currentAmount,
            currency: data.currency,
            deadline: deadlineTs,
            category: data.category,
            description: data.description,
            isActive: data.isActive,
          })
          toast.success("Shared goal updated")
          setEditingGoal(null)
        } else {
          await createHouseholdGoal(householdId, {
            name: data.name,
            targetAmount: data.targetAmount,
            currentAmount: data.currentAmount,
            currency: data.currency,
            deadline: deadlineTs,
            category: data.category,
            description: data.description,
            isActive: data.isActive,
          })
          toast.success("Shared goal created")
        }
        await loadGoals()
      } catch (error) {
        logger.error("Error saving household goal", error)
        toast.error("Failed to save shared goal")
        throw error
      }
    },
    [householdId, editingGoal, loadGoals]
  )

  const handleEdit = useCallback((goal: HouseholdGoal) => {
    setEditingGoal(goal)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (goalId: string) => {
      const deleted = goals.find((g) => g.id === goalId)
      if (!deleted) return
      setGoals((prev) => prev.filter((g) => g.id !== goalId))
      const timer = setTimeout(async () => {
        pendingDeletesRef.current.delete(goalId)
        try {
          await deleteHouseholdGoal(goalId)
        } catch {
          if (!mountedRef.current) return
          await loadGoals()
          toast.error("Failed to delete shared goal")
        }
      }, 5000)
      pendingDeletesRef.current.set(goalId, timer)
      toast.success("Shared goal deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timer)
            pendingDeletesRef.current.delete(goalId)
            loadGoals()
          },
        },
        duration: 5000,
      })
    },
    [goals, loadGoals]
  )

  const handleAddFunds = useCallback(
    async (goalId: string, amount: number) => {
      if (!userId) return
      const goal = goals.find((g) => g.id === goalId)
      if (!goal) return
      // Convert the member's display-currency input to EUR base ONCE so the
      // expense entry, the goal total, and the contribution record all agree.
      const baseAmount = toBaseCurrency(amount)
      try {
        // Record personal expense for the contributing member
        await createEntry(userId, {
          type: "expense",
          amount: baseAmount,
          currency: BASE_CURRENCY,
          description: `Shared goal: ${goal.name}`,
          category: "Goal Contribution",
          date: new Date().toISOString(),
        })
        // Update goal total + contribution record (all EUR base). currentAmount
        // is incremented atomically server-side (H7-13), so we don't pass a
        // client-read base value that a concurrent contribution could clobber.
        await addFundsToHouseholdGoal(goalId, baseAmount, {
          uid: userId,
          displayName: displayName || "Member",
          amount: baseAmount,
          addedAt: new Date().toISOString(),
        })
        await loadGoals()
        toast.success("Funds added to shared goal")
      } catch (error) {
        logger.error("Error adding funds to household goal", error)
        toast.error("Failed to add funds")
      }
    },
    [userId, displayName, goals, loadGoals, toBaseCurrency]
  )

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) setEditingGoal(null)
  }, [])

  const openDialog = useCallback(() => {
    setEditingGoal(null)
    setDialogOpen(true)
  }, [])

  return (
    <HouseholdGoalsContext.Provider value={{
      goals, loading, error, dialogOpen, editingGoal,
      loadGoals, ensureGoalsLoaded, handleSubmit, handleEdit, handleDelete,
      handleAddFunds, handleDialogClose, openDialog,
    }}>
      {children}
    </HouseholdGoalsContext.Provider>
  )
}

export function useHouseholdGoalsContext() {
  const ctx = useContext(HouseholdGoalsContext)
  if (!ctx) throw new Error("useHouseholdGoalsContext must be used within HouseholdGoalsProvider")
  return ctx
}
