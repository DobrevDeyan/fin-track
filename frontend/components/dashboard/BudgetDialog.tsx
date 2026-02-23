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
import { Timestamp } from "firebase/firestore"
import { DateRangeCalculator } from "@/lib/utils/date-range-utils"
import type { BudgetPeriod } from "@/lib/constants/budget.constants"

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
  defaultCurrency?: string
}

import { SUPPORTED_CURRENCIES } from "@/lib/constants/currency.constants"
import { BUDGET_PERIODS } from "@/lib/constants/budget.constants"

const currencies = SUPPORTED_CURRENCIES

export function BudgetDialog({
  open,
  onOpenChange,
  onSubmit,
  editingBudget,
  categories,
  defaultCurrency = "EUR",
}: BudgetDialogProps) {
  const t = useTranslations("budgets")
  const tCommon = useTranslations("common")
  const [name, setName] = useState("")
  const [category, setCategory] = useState<string>("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState(defaultCurrency)
  const [period, setPeriod] = useState<BudgetPeriod>("monthly")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [alertThreshold, setAlertThreshold] = useState("")

  // Populate form when editing
  useEffect(() => {
    if (editingBudget) {
      setName(editingBudget.name)
      setCategory(editingBudget.category || "")
      setAmount(editingBudget.amount.toString())
      setCurrency(editingBudget.currency)
      setPeriod(editingBudget.period)
      // Extract date part (YYYY-MM-DD) from ISO string if needed
      setStartDate(editingBudget.startDate.split("T")[0])
      setEndDate(editingBudget.endDate.split("T")[0])
      setIsActive(editingBudget.isActive)
      setAlertThreshold(editingBudget.alertThreshold?.toString() || "")
    } else {
      // Reset form for new budget
      setName("")
      setCategory("")
      setAmount("")
      setCurrency(defaultCurrency)
      setPeriod("monthly")
      const now = new Date()
      const dates = DateRangeCalculator.calculatePeriodRangeISO("monthly", now)
      setStartDate(dates.start)
      setEndDate(dates.end)
      setIsActive(true)
      setAlertThreshold("")
    }
  }, [editingBudget, open, defaultCurrency])

  // Update end date when period or start date changes (for new budgets)
  useEffect(() => {
    if (!editingBudget && startDate && period) {
      const start = new Date(startDate)
      const dates = DateRangeCalculator.calculatePeriodRangeISO(period, start)
      setEndDate(dates.end)
    }
  }, [period, startDate, editingBudget])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !amount || !category) return

    try {
      await onSubmit({
        name,
        category,
        amount: parseFloat(amount),
        currency,
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
      setCurrency(defaultCurrency)
      setPeriod("monthly")
      const now = new Date()
      const dates = DateRangeCalculator.calculatePeriodRangeISO("monthly", now)
      setStartDate(dates.start)
      setEndDate(dates.end)
      setIsActive(true)
      setAlertThreshold("")
      onOpenChange(false)
    } catch (error) {
      // Error is handled by parent component
      console.error("Error submitting budget:", error)
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
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">{t("category")}</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">{t("budgetAmount")}</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">{tCommon("currency")}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr} value={curr}>
                        {curr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="period">{t("period")}</Label>
              <Select
                value={period}
                onValueChange={(value: BudgetPeriod) => setPeriod(value)}
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
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">{t("endDate")}</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  required
                />
              </div>
            </div>

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
                onChange={(e) => setAlertThreshold(e.target.value)}
              />
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
            <Button type="submit">{editingBudget ? t("updateBudget") : t("createBudget")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

