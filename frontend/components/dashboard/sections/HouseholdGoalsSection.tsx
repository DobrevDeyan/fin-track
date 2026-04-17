"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Target, Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { GoalDialog } from "@/components/dashboard/GoalDialog"
import { HouseholdGoalCard } from "@/components/dashboard/HouseholdGoalCard"
import { useHouseholdGoalsContext, type HouseholdGoal } from "@/contexts/dashboard/HouseholdGoalsContext"
import { AMOUNT_RULES } from "@/lib/constants/validation.constants"
import { motion } from "framer-motion"

interface Props {
  categories: string[]
  userCurrency: string
}

export function HouseholdGoalsSection({ categories, userCurrency }: Props) {
  const {
    goals, loading, dialogOpen, editingGoal,
    ensureGoalsLoaded, loadGoals, handleDialogClose, handleSubmit,
    handleEdit, handleDelete, handleAddFunds, openDialog,
  } = useHouseholdGoalsContext()

  useEffect(() => { ensureGoalsLoaded() }, [ensureGoalsLoaded])

  const [addFundsOpen, setAddFundsOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<HouseholdGoal | null>(null)
  const [fundAmount, setFundAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const onAddFundsClick = (goal: HouseholdGoal) => {
    setSelectedGoal(goal)
    setFundAmount("")
    setAddFundsOpen(true)
  }

  const onAddFundsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGoal || !fundAmount || parseFloat(fundAmount) <= 0) return
    setSubmitting(true)
    try {
      await handleAddFunds(selectedGoal.id, parseFloat(fundAmount))
      setAddFundsOpen(false)
      setSelectedGoal(null)
      setFundAmount("")
    } finally {
      setSubmitting(false)
    }
  }

  // Convert editingGoal to GoalDocument shape for GoalDialog
  const editingGoalForDialog = editingGoal ? {
    ...editingGoal,
    userId: "",
  } : null

  return (
    <>
      <div className="py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Shared savings goals the whole household works toward together.
          </p>
          <Button onClick={openDialog} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Shared Goal
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-full mt-2" />
              </div>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm mb-1">No shared goals yet</p>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              Create a shared goal like a vacation fund or emergency savings that the whole household contributes to.
            </p>
            <Button size="sm" onClick={openDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Shared Goal
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal, i) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07, ease: "easeOut" }}
              >
                <HouseholdGoalCard
                  goal={goal}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAddFunds={onAddFundsClick}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <GoalDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleSubmit}
        editingGoal={editingGoalForDialog as any}
        categories={categories}
        defaultCurrency={userCurrency}
      />

      {/* Add Funds dialog */}
      <Dialog open={addFundsOpen} onOpenChange={setAddFundsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Funds — {selectedGoal?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onAddFundsSubmit}>
            <div className="py-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="fundAmount">Amount ({userCurrency})</Label>
                <Input
                  id="fundAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={AMOUNT_RULES.MAX}
                  placeholder="0.00"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This will be recorded as a personal expense and added to the shared goal.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddFundsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Funds
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
