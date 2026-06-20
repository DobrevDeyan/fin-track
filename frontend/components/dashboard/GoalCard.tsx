"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Target, Calendar, Plus } from "lucide-react"
import { GoalDocument } from "@/lib/firestore-types"
import { useMoney } from "@/contexts/CurrencyContext"
import { calculateGoalProgress } from "@/lib/firestore-goals"
import { getBadgeStatusColor } from "@/lib/constants/ui.constants"
import { motion } from "framer-motion"

interface GoalCardProps {
  goal: GoalDocument & { id: string }
  onEdit: (goal: GoalDocument & { id: string }) => void
  onDelete: (goalId: string) => Promise<void>
  onAddFunds: (goal: GoalDocument & { id: string }) => void
}

export function GoalCard({ goal, onEdit, onDelete, onAddFunds }: GoalCardProps) {
  const { format } = useMoney()
  const progress = calculateGoalProgress(goal.currentAmount, goal.targetAmount)
  const remaining = goal.targetAmount - goal.currentAmount
  const isComplete = progress >= 100

  const deadlineText = goal.deadline
    ? goal.deadline.toDate().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null

  const progressColor = isComplete
    ? "bg-green-500"
    : progress >= 75
    ? "bg-blue-500"
    : progress >= 50
    ? "bg-yellow-500"
    : "bg-muted-foreground/30"

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
    <Card className={`${!goal.isActive ? "opacity-60" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{goal.name}</CardTitle>
            {goal.category && (
              <p className="text-sm text-muted-foreground mt-1">{goal.category}</p>
            )}
          </div>
          {!goal.isActive && (
            <span className={`text-xs ${getBadgeStatusColor("inactive")} px-2 py-1 rounded`}>
              Inactive
            </span>
          )}
          {isComplete && (
            <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">
              Complete!
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-semibold">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${progressColor} transition-all duration-300`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Current</span>
              <p className="font-semibold">{format(goal.currentAmount)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Target</span>
              <p className="font-semibold">{format(goal.targetAmount)}</p>
            </div>
          </div>

          {remaining > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Remaining: </span>
              <span className="font-semibold">{format(remaining)}</span>
            </div>
          )}

          {deadlineText && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Deadline: {deadlineText}</span>
            </div>
          )}

          {goal.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onAddFunds(goal)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
            <div className="flex gap-2 flex-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(goal)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onDelete(goal.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  )
}

