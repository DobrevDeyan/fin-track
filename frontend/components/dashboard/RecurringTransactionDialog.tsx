"use client"

import { useState, useEffect } from "react"
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
import { RecurringEntryDocument } from "@/lib/firestore-types"
import { AMOUNT_RULES } from "@/lib/constants/validation.constants"
import { logger } from "@/lib/utils/logger"
import { INCOME_CATEGORIES } from "@/lib/categories"
import { useTranslations } from "next-intl"
import { useMoney } from "@/contexts/CurrencyContext"


interface RecurringTransactionData {
  name: string
  amount: number
  type: "income" | "expense"
  category: string
  frequency: "weekly" | "monthly" | "yearly"
  nextDate: string
  isActive: boolean
}

interface RecurringTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: RecurringTransactionData) => Promise<void>
  editingRecurring?: (RecurringEntryDocument & { id: string }) | null
  categories: string[]
}

export function RecurringTransactionDialog({
  open,
  onOpenChange,
  onSubmit,
  editingRecurring,
  categories,
}: RecurringTransactionDialogProps) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"income" | "expense">("expense")
  const [category, setCategory] = useState("")
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly")
  const [nextDate, setNextDate] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<"name" | "category" | "amount" | "nextDate", string>>>({})
  const t = useTranslations("recurring")
  const tCommon = useTranslations("common")
  // Stored amounts are canonical base currency (EUR); the form works in the
  // user's display currency. Convert base->display on edit, display->base on save.
  const { toBase, fromBase } = useMoney()

  // Minimum selectable next-occurrence date — today (UTC, matching the default
  // values set below). Past dates are rejected so the scheduler never back-dates
  // a flood of catch-up entries (review R5-1).
  const minDate = new Date().toISOString().split("T")[0]

  const validate = () => {
    const e: typeof errors = {}
    if (!name.trim()) e.name = t("validation.nameRequired")
    if (!category) e.category = t("validation.categoryRequired")
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) e.amount = t("validation.amountRequired")
    else if (amt > AMOUNT_RULES.MAX) e.amount = t("validation.amountTooLarge", { max: AMOUNT_RULES.MAX })
    if (!nextDate || nextDate < minDate) e.nextDate = t("validation.dateInFuture")
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Populate form when editing
  useEffect(() => {
    if (editingRecurring) {
      setName(editingRecurring.name)
      setAmount(fromBase(editingRecurring.amount).toFixed(2))
      setType(editingRecurring.type)
      setCategory(editingRecurring.category)
      setFrequency(editingRecurring.frequency)
      // Convert Timestamp to date string
      const date = editingRecurring.nextDate.toDate()
      setNextDate(date.toISOString().split("T")[0])
      setIsActive(editingRecurring.isActive)
    } else {
      // Reset form for new recurring transaction
      setName("")
      setAmount("")
      setType("expense")
      setCategory("")
      setFrequency("monthly")
      // Set default next date to today
      const today = new Date()
      setNextDate(today.toISOString().split("T")[0])
      setIsActive(true)
    }
    setErrors({})
  }, [editingRecurring, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        name,
        amount: toBase(parseFloat(amount)),
        type,
        category,
        frequency,
        nextDate,
        isActive,
      })

      // Reset form
      setName("")
      setAmount("")
      setType("expense")
      setCategory("")
      setFrequency("monthly")
      const today = new Date()
      setNextDate(today.toISOString().split("T")[0])
      setIsActive(true)
      onOpenChange(false)
    } catch (error) {
      logger.error("Error submitting recurring transaction", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Income and expense have different category lists — a recurring income
  // (e.g. Salary) must offer income categories, not the expense set.
  const filteredCategories =
    type === "income" ? INCOME_CATEGORIES : categories

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRecurring ? t("editRecurring") : t("createRecurring")}
          </DialogTitle>
          <DialogDescription>
            {editingRecurring ? t("editRecurringDesc") : t("createRecurringDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("transactionName")}</Label>
              <Input
                id="name"
                placeholder={t("transactionNamePlaceholder")}
                value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: undefined })) }}
                className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">{tCommon("type")}</Label>
              <Select
                value={type}
                onValueChange={(value: "income" | "expense") => {
                  setType(value)
                  // Different category list per type — clear a stale selection
                  setCategory("")
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">{tCommon("expense")}</SelectItem>
                  <SelectItem value="income">{tCommon("income")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">{tCommon("category")}</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); if (errors.category) setErrors(prev => ({ ...prev, category: undefined })) }}>
                <SelectTrigger className={errors.category ? "border-red-500 focus:ring-red-500" : ""}>
                  <SelectValue placeholder={tCommon("category")} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">{tCommon("amount")}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={AMOUNT_RULES.MAX}
                placeholder="0.00"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); if (errors.amount) setErrors(prev => ({ ...prev, amount: undefined })) }}
                className={errors.amount ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="frequency">{tCommon("frequency")}</Label>
              <Select
                value={frequency}
                onValueChange={(value: "weekly" | "monthly" | "yearly") => setFrequency(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{tCommon("weekly")}</SelectItem>
                  <SelectItem value="monthly">{tCommon("monthly")}</SelectItem>
                  <SelectItem value="yearly">{tCommon("yearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nextDate">{t("nextOccurrence")}</Label>
              <Input
                id="nextDate"
                type="date"
                min={minDate}
                value={nextDate}
                onChange={(e) => { setNextDate(e.target.value); if (errors.nextDate) setErrors(prev => ({ ...prev, nextDate: undefined })) }}
                className={errors.nextDate ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.nextDate && <p className="text-xs text-red-500">{errors.nextDate}</p>}
              <p className="text-xs text-muted-foreground">
                {t("nextOccurrenceHint")}
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
                {t("activeAutoCreate")}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tCommon("loading") : editingRecurring ? t("editRecurring") : t("createRecurring")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

