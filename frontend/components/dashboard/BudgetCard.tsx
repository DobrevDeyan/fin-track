"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Pencil, Trash2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/date-utils"
import { ColorUtils } from "@/lib/utils/color-utils"
import { getTrendColor } from "@/lib/constants/ui.constants"

interface Budget {
  id: string
  name: string
  category: string
  amount: number
  currency: string
  period: "weekly" | "monthly" | "yearly"
  startDate: string // Always ISO string when loaded
  endDate: string // Always ISO string when loaded
  isActive: boolean
  alertThreshold?: number
}

interface BudgetCardProps {
  budget: Budget
  spent: number
  onEdit: (budget: Budget) => void
  onDelete: (budgetId: string) => void
  onRenew: (budgetId: string, period: "weekly" | "monthly" | "yearly") => Promise<void>
}

export function BudgetCard({ budget, spent, onEdit, onDelete, onRenew }: BudgetCardProps) {
  const remaining = budget.amount - spent
  const percentage = Math.min((spent / budget.amount) * 100, 100)
  const isOverBudget = spent > budget.amount
  const isNearThreshold = budget.alertThreshold && percentage >= budget.alertThreshold

  // Format dates (always strings when loaded)
  const startDate = new Date(budget.startDate)
  const endDate = new Date(budget.endDate)
  const isExpired = endDate < new Date()

  const renewLabel = (() => {
    const now = new Date()
    if (budget.period === "monthly") {
      return `Renew for ${now.toLocaleString("default", { month: "long", year: "numeric" })}`
    }
    if (budget.period === "weekly") return "Renew for this week"
    return `Renew for ${now.getFullYear()}`
  })()

  const getProgressColor = () => {
    if (isOverBudget) return "bg-red-500"
    if (isNearThreshold) return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <Card className={cn("relative", isExpired && "opacity-60")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{budget.name}</CardTitle>
            <Badge variant="secondary" className="mt-1">
              {budget.category}
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} •{" "}
              {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(budget)}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(budget.id)}
              className="h-8 w-8 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Spent</span>
              <span className="font-medium">
                {budget.currency} {spent.toFixed(2)} / {budget.currency} {budget.amount.toFixed(2)}
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full transition-all duration-300", getProgressColor())}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={`font-medium ${isOverBudget ? "text-red-500" : ""}`}>
                {percentage.toFixed(1)}% used
              </span>
              <span className={`font-medium ${ColorUtils.getTrendColorClassFromValue(remaining)}`}>
                {remaining >= 0
                  ? `${budget.currency} ${remaining.toFixed(2)} remaining`
                  : `${budget.currency} ${Math.abs(remaining).toFixed(2)} over budget`}
              </span>
            </div>
          </div>

          {/* Status Indicator */}
          {isExpired ? (
            <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Expired — period ended</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs"
                onClick={() => onRenew(budget.id, budget.period)}
              >
                <RefreshCw className="h-3 w-3" />
                {renewLabel}
              </Button>
            </div>
          ) : (
            <>
              {isOverBudget && (
                <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700">Over budget!</span>
                </div>
              )}
              {isNearThreshold && !isOverBudget && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-md">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    Approaching budget limit ({budget.alertThreshold}%)
                  </span>
                </div>
              )}
              {!isOverBudget && !isNearThreshold && percentage < 50 && (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                  <CheckCircle2 className={`h-4 w-4 ${getTrendColor("up")}`} />
                  <span className="text-sm text-green-700">On track</span>
                </div>
              )}
            </>
          )}

          {/* Active Status */}
          {!budget.isActive && (
            <Badge variant="outline" className="w-fit">
              Inactive
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

