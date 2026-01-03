"use client"

import { GoalCard } from "./GoalCard"
import { Button } from "@/components/ui/button"
import { Plus, Target } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { GoalDocument } from "@/lib/firestore-types"

interface GoalListProps {
  goals: (GoalDocument & { id: string })[]
  onAdd: () => void
  onEdit: (goal: GoalDocument & { id: string }) => void
  onDelete: (goalId: string) => Promise<void>
}

export function GoalList({ goals, onAdd, onEdit, onDelete }: GoalListProps) {
  // Sort: active first, then by deadline (earliest first), then by progress
  const sortedGoals = [...goals].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    
    // If both have deadlines, sort by deadline
    if (a.deadline && b.deadline) {
      return a.deadline.toMillis() - b.deadline.toMillis()
    }
    if (a.deadline && !b.deadline) return -1
    if (!a.deadline && b.deadline) return 1
    
    return 0
  })

  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Financial Goals Yet</h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            Set financial goals to track your savings progress. Whether it's an emergency fund,
            vacation, or major purchase, goals help you stay motivated and on track.
          </p>
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Goal
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedGoals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

