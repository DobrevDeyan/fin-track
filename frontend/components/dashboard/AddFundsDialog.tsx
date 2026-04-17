"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GoalDocument } from "@/lib/firestore-types"
import { AMOUNT_RULES } from "@/lib/constants/validation.constants"
import { logger } from "@/lib/utils/logger"


interface AddFundsDialogProps {
  goal: (GoalDocument & { id: string }) | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddFunds: (goalId: string, amount: number) => Promise<void>
}

export function AddFundsDialog({
  goal,
  open,
  onOpenChange,
  onAddFunds,
}: AddFundsDialogProps) {
  const t = useTranslations("goals")
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal || !amount || parseFloat(amount) <= 0) return

    try {
      setIsSubmitting(true)
      await onAddFunds(goal.id, parseFloat(amount))
      setAmount("")
      onOpenChange(false)
    } catch (error) {
      logger.error("Error adding funds", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!goal) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("addFundsTitle")}</DialogTitle>
          <DialogDescription>
            {t("addFundsDesc")} ({goal.name})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">{t("addAmount")}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {goal.currency}
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={AMOUNT_RULES.MAX}
                  placeholder="0.00"
                  className="pl-12"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !amount}>
              {isSubmitting ? "Adding..." : t("addFunds")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
