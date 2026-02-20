"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/currency-utils"
import { useTranslations } from "next-intl"

interface BudgetProgressBarProps {
  monthlyBudget: number
  entries: { type: string; amount: number; date: string }[]
  userCurrency: string
}

export function BudgetProgressBar({ monthlyBudget, entries, userCurrency }: BudgetProgressBarProps) {
  const t = useTranslations("dashboard")

  const spent = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return entries
      .filter((e) => {
        if (e.type !== "expense") return false
        const d = new Date(e.date)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((sum, e) => sum + Math.abs(e.amount), 0)
  }, [entries])

  const remaining = Math.max(monthlyBudget - spent, 0)
  const percentage = monthlyBudget > 0 ? Math.min((spent / monthlyBudget) * 100, 100) : 0
  const isOverBudget = spent > monthlyBudget

  const barColor = isOverBudget
    ? "bg-red-500"
    : percentage > 75
      ? "bg-amber-500"
      : "bg-emerald-500"

  return (
    <Card className="drop-shadow-xl shadow-black/10">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">{t("budgetThisMonth")}</h3>
          <span className="text-sm font-semibold">
            {formatCurrency(spent, { currency: userCurrency })} / {formatCurrency(monthlyBudget, { currency: userCurrency })}
          </span>
        </div>

        <Progress value={spent} max={monthlyBudget} className="h-3 mb-3" indicatorClassName={barColor} />

        <div className="flex items-center justify-between text-sm">
          <span className={isOverBudget ? "text-red-600 font-semibold" : "text-muted-foreground"}>
            {isOverBudget
              ? t("overBudgetBy", { amount: formatCurrency(spent - monthlyBudget, { currency: userCurrency }) })
              : t("remainingBudget", { amount: formatCurrency(remaining, { currency: userCurrency }) })}
          </span>
          <span className="text-muted-foreground">{Math.round(percentage)}%</span>
        </div>
      </CardContent>
    </Card>
  )
}
