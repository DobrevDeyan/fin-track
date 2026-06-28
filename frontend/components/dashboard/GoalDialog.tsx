"use client"

import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { GoalDocument } from "@/lib/firestore-types"
import { BASE_CURRENCY } from "@/lib/constants/currency.constants"
import { AMOUNT_RULES } from "@/lib/constants/validation.constants"
import { useMoney } from "@/contexts/CurrencyContext"
import { logger } from "@/lib/utils/logger"

/** Format a numeric amount for a number input: round to cents, drop non-finite. */
const toAmountInput = (n: number) => (Number.isFinite(n) ? (Math.round(n * 100) / 100).toString() : "")


interface GoalData {
  name: string
  targetAmount: number
  currentAmount: number
  currency: string
  deadline?: string
  category?: string
  description?: string
  isActive: boolean
}

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: GoalData) => Promise<void>
  editingGoal?: (GoalDocument & { id: string }) | null
  categories: string[]
  defaultCurrency?: string
}

export function GoalDialog({
  open,
  onOpenChange,
  onSubmit,
  editingGoal,
  categories,
}: GoalDialogProps) {
  const t = useTranslations("goals")
  const tCommon = useTranslations("common")
  const { toBase, fromBase } = useMoney()
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("")
  const [deadline, setDeadline] = useState("")
  const [category, setCategory] = useState<string>("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<"name" | "targetAmount" | "currentAmount" | "deadline", string>>>({})

  const validate = () => {
    const e: typeof errors = {}
    if (!name.trim()) e.name = t("validation.nameRequired")

    const target = parseFloat(targetAmount)
    if (!targetAmount || !Number.isFinite(target) || target <= 0 || target > AMOUNT_RULES.MAX) {
      e.targetAmount = t("validation.targetAmountRequired")
    }

    if (currentAmount !== "") {
      const current = parseFloat(currentAmount)
      if (!Number.isFinite(current) || current < 0 || current > AMOUNT_RULES.MAX) {
        e.currentAmount = t("validation.currentAmountInvalid")
      }
    }

    if (deadline) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      // Parse the date-only input as LOCAL midnight (not UTC) to avoid TZ drift.
      const picked = new Date(`${deadline}T00:00:00`)
      if (Number.isNaN(picked.getTime()) || picked < today) {
        e.deadline = t("validation.deadlineInPast")
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Populate form when editing. Amounts are stored in EUR base; show them in the
  // user's display currency via fromBase().
  useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name)
      setTargetAmount(toAmountInput(fromBase(editingGoal.targetAmount)))
      setCurrentAmount(toAmountInput(fromBase(editingGoal.currentAmount)))
      if (editingGoal.deadline) {
        const date = editingGoal.deadline.toDate()
        setDeadline(date.toISOString().split("T")[0])
      } else {
        setDeadline("")
      }
      setCategory(editingGoal.category || "")
      setDescription(editingGoal.description || "")
      setIsActive(editingGoal.isActive)
    } else {
      setName("")
      setTargetAmount("")
      setCurrentAmount("0")
      setDeadline("")
      setCategory("")
      setDescription("")
      setIsActive(true)
    }
    setErrors({})
  }, [editingGoal, open, fromBase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        name,
        // Convert user-entered (display-currency) amounts to EUR base for storage.
        targetAmount: toBase(parseFloat(targetAmount)),
        currentAmount: toBase(parseFloat(currentAmount) || 0),
        currency: BASE_CURRENCY,
        deadline: deadline || undefined,
        category: category || undefined,
        description: description || undefined,
        isActive,
      })

      // Reset form
      setName("")
      setTargetAmount("")
      setCurrentAmount("0")
      setDeadline("")
      setCategory("")
      setDescription("")
      setIsActive(true)
      onOpenChange(false)
    } catch (error) {
      logger.error("Error submitting goal", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingGoal ? t("editGoal") : t("createGoalTitle")}</DialogTitle>
          <DialogDescription>
            {editingGoal
              ? t("editGoalDesc")
              : t("createGoalDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("goalName")}</Label>
              <Input
                id="name"
                placeholder={t("goalNamePlaceholder")}
                value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: undefined })) }}
                className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t("descriptionOptional")}</Label>
              <Textarea
                id="description"
                placeholder={t("descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="targetAmount">{t("targetAmount")}</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={AMOUNT_RULES.MAX}
                placeholder="0.00"
                value={targetAmount}
                onChange={(e) => { setTargetAmount(e.target.value); if (errors.targetAmount) setErrors(prev => ({ ...prev, targetAmount: undefined })) }}
                className={errors.targetAmount ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.targetAmount && <p className="text-xs text-red-500">{errors.targetAmount}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currentAmount">{t("currentAmount")}</Label>
              <Input
                id="currentAmount"
                type="number"
                step="0.01"
                min="0"
                max={AMOUNT_RULES.MAX}
                placeholder="0.00"
                value={currentAmount}
                onChange={(e) => { setCurrentAmount(e.target.value); if (errors.currentAmount) setErrors(prev => ({ ...prev, currentAmount: undefined })) }}
                className={errors.currentAmount ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.currentAmount && <p className="text-xs text-red-500">{errors.currentAmount}</p>}
              <p className="text-xs text-muted-foreground">
                {t("currentAmountHint")}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">{t("categoryOptional")}</Label>
              <Select value={category || "none"} onValueChange={(value) => setCategory(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectCategoryOptional")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noCategory")}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deadline">{t("deadlineOptional")}</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => { setDeadline(e.target.value); if (errors.deadline) setErrors(prev => ({ ...prev, deadline: undefined })) }}
                className={errors.deadline ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.deadline && <p className="text-xs text-red-500">{errors.deadline}</p>}
              <p className="text-xs text-muted-foreground">
                {t("deadlineHint")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                {t("activeGoal")}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t("saving") : editingGoal ? t("updateGoal") : t("createGoal")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

