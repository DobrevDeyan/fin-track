"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Target, Calendar, Plus } from "lucide-react"
import { useMoney } from "@/contexts/CurrencyContext"
import { calculateGoalProgress } from "@/lib/firestore-goals"
import { motion } from "framer-motion"
import { useTranslations, useLocale } from "next-intl"
import type { HouseholdGoal } from "@/contexts/dashboard/HouseholdGoalsContext"

const MEMBER_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#3b82f6"]

interface Props {
  goal: HouseholdGoal
  onEdit: (goal: HouseholdGoal) => void
  onDelete: (goalId: string) => Promise<void>
  onAddFunds: (goal: HouseholdGoal) => void
}

export function HouseholdGoalCard({ goal, onEdit, onDelete, onAddFunds }: Props) {
  const t = useTranslations("goals")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const { format } = useMoney()
  const progress = calculateGoalProgress(goal.currentAmount, goal.targetAmount)
  const remaining = goal.targetAmount - goal.currentAmount
  const isComplete = progress >= 100

  // Deadlines are stored at UTC midnight; render in UTC so the calendar date
  // never drifts a day in negative-offset timezones.
  const deadlineText = goal.deadline
    ? goal.deadline.toDate().toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : null

  const progressColor = isComplete
    ? "bg-green-500"
    : progress >= 75 ? "bg-blue-500"
    : progress >= 50 ? "bg-yellow-500"
    : "bg-muted-foreground/30"

  // Aggregate contributions by member
  const byMember = goal.contributions.reduce<Record<string, { displayName: string; total: number }>>(
    (acc, c) => {
      if (!acc[c.uid]) acc[c.uid] = { displayName: c.displayName, total: 0 }
      acc[c.uid].total += c.amount
      return acc
    },
    {}
  )
  const memberTotals = Object.entries(byMember).sort((a, b) => b[1].total - a[1].total)

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card className={!goal.isActive ? "opacity-60" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate">{goal.name}</CardTitle>
              {goal.category && (
                <p className="text-sm text-muted-foreground mt-0.5">{goal.category}</p>
              )}
            </div>
            {isComplete && (
              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded shrink-0 ml-2">
                {t("complete")}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{t("progress")}</span>
              <span className="text-sm font-semibold">{progress.toFixed(1)}%</span>
            </div>
            <div
              className="w-full bg-muted rounded-full h-3 overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("progress")}
            >
              <div
                className={`h-full ${progressColor} transition-all duration-300`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("current")}</span>
              <p className="font-semibold">{format(goal.currentAmount)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("target")}</span>
              <p className="font-semibold">{format(goal.targetAmount)}</p>
            </div>
          </div>

          {remaining > 0 && (
            <p className="text-sm">
              <span className="text-muted-foreground">{t("remainingAmount")}: </span>
              <span className="font-semibold">{format(remaining)}</span>
            </p>
          )}

          {deadlineText && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{t("deadline")}: {deadlineText}</span>
            </div>
          )}

          {goal.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}

          {/* Contributors */}
          {memberTotals.length > 0 && (
            <div className="pt-2 border-t space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">{t("contributions")}</p>
              {memberTotals.map(([uid, { displayName, total }], i) => (
                <div key={uid} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{displayName}</span>
                  </div>
                  <span className="font-medium tabular-nums">
                    {format(total)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button variant="default" className="flex-1" onClick={() => onAddFunds(goal)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("addFunds")}
            </Button>
            <div className="flex gap-2 flex-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(goal)}>
                <Edit className="h-4 w-4 mr-2" />
                {tCommon("edit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50"
                onClick={() => onDelete(goal.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {tCommon("delete")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
