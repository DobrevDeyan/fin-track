"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useMoney } from "@/contexts/CurrencyContext"
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
import { Timestamp } from "firebase/firestore"
import { DateRangeCalculator } from "@/lib/utils/date-range-utils"
import type { BudgetPeriod } from "@/lib/constants/budget.constants"
import { logger } from "@/lib/utils/logger"


interface BudgetData {
  name: string
  category: string
  amount: number
  currency: string
  period: "weekly" | "monthly" | "yearly"
  startDate: string
  endDate: string
  isActive: boolean
  alertThreshold?: number
}

interface BudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: BudgetData) => Promise<void>
  editingBudget?: {
    id: string
    name: string
    category: string
    amount: number
    currency: string
    period: "weekly" | "monthly" | "yearly"
    startDate: string
    endDate: string
    isActive: boolean
    alertThreshold?: number
  } | null
  categories: string[]
}

import { BASE_CURRENCY } from "@/lib/constants/currency.constants"
import { BUDGET_PERIODS } from "@/lib/constants/budget.constants"
import { AMOUNT_RULES } from "@/lib/constants/validation.constants"

export function BudgetDialog({
  open,
  onOpenChange,
  onSubmit,
  editingBudget,
  categories,
}: BudgetDialogProps) {
  const t = useTranslations("budgets")
  const tCommon = useTranslations("common")
  const { toBase, fromBase } = useMoney()
  const [name, setName] = useState("")
  const [category, setCategory] = useState<string>("")
  const [amount, setAmount] = useState("")
  const [period, setPeriod] = useState<BudgetPeriod>("monthly")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [alertThreshold, setAlertThreshold] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<"name" | "category" | "amount" | "endDate" | "alertThreshold", string>>>({})

  const validate = () => {
    const e: typeof errors = {}
    if (!name.trim()) e.name = t("validation.nameRequired")
    if (!category) e.category = t("validation.categoryRequired")
    const amt = parseFloat(amount)
    if (!amount || Number.isNaN(amt) || amt <= 0) e.amount = t("validation.amountRequired")
    else if (amt > AMOUNT_RULES.MAX) e.amount = t("validation.amountTooLarge")
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) e.endDate = t("validation.endDateAfterStart")
    if (alertThreshold) {
      const th = parseFloat(alertThreshold)
      if (Number.isNaN(th) || th < 0 || th > 100) e.alertThreshold = t("validation.thresholdRange")
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Populate form when editing
  useEffect(() => {
    if (editingBudget) {
      setName(editingBudget.name)
      setCategory(editingBudget.category || "")
      setAmount(fromBase(editingBudget.amount).toFixed(2))
      setPeriod(editingBudget.period)
      // Extract date part (YYYY-MM-DD) from ISO string if needed
      setStartDate(editingBudget.startDate.split("T")[0])
      setEndDate(editingBudget.endDate.split("T")[0])
      setIsActive(editingBudget.isActive)
      setAlertThreshold(editingBudget.alertThreshold?.toString() || "")
    } else {
      setName("")
      setCategory("")
      setAmount("")
      setPeriod("monthly")
      const start = DateRangeCalculator.getPeriodStart("monthly", new Date())
      const dates = DateRangeCalculator.calculatePeriodRangeISO("monthly", start)
      setStartDate(dates.start)
      setEndDate(dates.end)
      setIsActive(true)
      setAlertThreshold("")
    }
    setErrors({})
    // `fromBase` intentionally excluded: it changes identity when exchange
    // rates load, and re-running this effect would wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingBudget, open])

  // Update end date when period or start date changes (for new budgets)
  useEffect(() => {
    if (!editingBudget && startDate && period) {
      // Parse as LOCAL midnight (append time) so the date doesn't shift a day.
      const start = new Date(startDate + "T00:00:00")
      const dates = DateRangeCalculator.calculatePeriodRangeISO(period, start)
      setEndDate(dates.end)
    }
  }, [period, startDate, editingBudget])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        name,
        category,
        amount: toBase(parseFloat(amount)),
        currency: BASE_CURRENCY,
        period,
        startDate,
        endDate,
        isActive,
        alertThreshold: alertThreshold ? parseFloat(alertThreshold) : undefined,
      })

      // Reset form
      setName("")
      setCategory("")
      setAmount("")
      setPeriod("monthly")
      const start = DateRangeCalculator.getPeriodStart("monthly", new Date())
      const dates = DateRangeCalculator.calculatePeriodRangeISO("monthly", start)
      setStartDate(dates.start)
      setEndDate(dates.end)
      setIsActive(true)
      setAlertThreshold("")
      onOpenChange(false)
    } catch (error) {
      // Error is handled by parent component
      logger.error("Error submitting budget", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingBudget ? t("editBudget") : t("createBudget")}</DialogTitle>
          <DialogDescription>
            {editingBudget
              ? t("editBudgetDesc")
              : t("createBudgetDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("budgetName")}</Label>
              <Input
                id="name"
                placeholder={t("budgetNamePlaceholder")}
                value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: undefined })) }}
                className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">{t("category")}</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); if (errors.category) setErrors(prev => ({ ...prev, category: undefined })) }}>
                <SelectTrigger className={errors.category ? "border-red-500 focus:ring-red-500" : ""}>
                  <SelectValue placeholder={t("selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">{t("budgetAmount")}</Label>
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
              <Label htmlFor="period">{t("period")}</Label>
              <Select
                value={period}
                onValueChange={(value: BudgetPeriod) => {
                  setPeriod(value)
                  // Snap start to the new period's natural boundary (new budgets only);
                  // the effect above recomputes the matching end date.
                  if (!editingBudget) {
                    const start = DateRangeCalculator.getPeriodStart(value, new Date())
                    setStartDate(DateRangeCalculator.toLocalISODate(start))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_PERIODS.map((periodOption) => (
                    <SelectItem key={periodOption} value={periodOption}>
                      {tCommon(periodOption)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">{t("startDate")}</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">{t("endDate")}</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); if (errors.endDate) setErrors(prev => ({ ...prev, endDate: undefined })) }}
                  min={startDate}
                  className={errors.endDate ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              </div>
            </div>
            {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}

            <div className="grid gap-2">
              <Label htmlFor="alertThreshold">{t("alertThreshold")}</Label>
              <Input
                id="alertThreshold"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="80"
                value={alertThreshold}
                onChange={(e) => { setAlertThreshold(e.target.value); if (errors.alertThreshold) setErrors(prev => ({ ...prev, alertThreshold: undefined })) }}
                className={errors.alertThreshold ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.alertThreshold && <p className="text-xs text-red-500">{errors.alertThreshold}</p>}
              <p className="text-xs text-muted-foreground">
                {t("alertThresholdDesc")}
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
                {t("activeBudget")}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : editingBudget ? t("updateBudget") : t("createBudget")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

