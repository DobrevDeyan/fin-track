"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/currency-utils"
import { useTranslations } from "next-intl"

interface BudgetProgressBarProps {
  monthlyBudget: number
  currentMonthExpenses: number
  userCurrency: string
}

export function BudgetProgressBar({ monthlyBudget, currentMonthExpenses, userCurrency }: BudgetProgressBarProps) {
  const t = useTranslations("dashboard")

  const spent = currentMonthExpenses

  const hasBudget = monthlyBudget > 0
  const remaining = hasBudget ? Math.max(monthlyBudget - spent, 0) : 0
  const percentage = hasBudget ? Math.min((spent / monthlyBudget) * 100, 100) : 0
  const isOverBudget = hasBudget && spent > monthlyBudget

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
            {formatCurrency(spent, { currency: userCurrency })}
            {hasBudget && ` / ${formatCurrency(monthlyBudget, { currency: userCurrency })}`}
          </span>
        </div>

        {hasBudget ? (
          <Progress value={spent} max={monthlyBudget} className="h-3 mb-3" indicatorClassName={barColor} />
        ) : (
          <div className="h-3 w-full bg-muted rounded-full mb-3" />
        )}

        <div className="flex items-center justify-between text-sm">
          <span className={isOverBudget ? "text-red-600 font-semibold" : "text-muted-foreground"}>
            {!hasBudget
              ? t("budgetNotSet")
              : isOverBudget
              ? t("overBudgetBy", { amount: formatCurrency(spent - monthlyBudget, { currency: userCurrency }) })
              : t("remainingBudget", { amount: formatCurrency(remaining, { currency: userCurrency }) })}
          </span>
          {hasBudget && <span className="text-muted-foreground">{Math.round(percentage)}%</span>}
        </div>
      </CardContent>
    </Card>
  )
}
