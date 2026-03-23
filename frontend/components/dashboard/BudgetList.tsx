"use client"

import { BudgetCard } from "./BudgetCard"
import { BudgetDialog } from "./BudgetDialog"
import { Button } from "@/components/ui/button"
import { Plus, Wallet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"

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

interface Entry {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: "income" | "expense"
  notes?: string
}

interface BudgetListProps {
  budgets: Budget[]
  entries: Entry[]
  categories: string[]
  onAdd: () => void
  onEdit: (budget: Budget) => void
  onDelete: (budgetId: string) => Promise<void>
  onRenew: (budgetId: string, period: "weekly" | "monthly" | "yearly") => Promise<void>
}

/**
 * Calculate spending for a budget based on entries
 */
function calculateBudgetSpending(budget: Budget, entries: Entry[]): number {
  const budgetStart = new Date(budget.startDate)
  const budgetEnd = new Date(budget.endDate)

  return entries
    .filter((entry) => {
      // Only count expenses matching the budget's category
      if (entry.type !== "expense") return false
      if (entry.category !== budget.category) return false

      // Filter by date range
      const entryDate = new Date(entry.date)
      return entryDate >= budgetStart && entryDate <= budgetEnd
    })
    .reduce((sum, entry) => sum + entry.amount, 0)
}

export function BudgetList({
  budgets,
  entries,
  categories,
  onAdd,
  onEdit,
  onDelete,
  onRenew,
}: BudgetListProps) {
  // Filter to show active budgets first, then inactive
  const sortedBudgets = [...budgets].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return 0
  })

  if (budgets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 md:py-16">
          <Wallet className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-4 md:mb-6" />
          <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">No Budgets Yet</h3>
          <p className="text-sm md:text-base text-muted-foreground text-center mb-4 md:mb-6 max-w-md md:max-w-lg px-4">
            Create a budget to track your spending and stay on top of your finances. Set monthly,
            weekly, or yearly limits for categories or overall spending.
          </p>
          <Button onClick={onAdd} size="default" className="md:text-base">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Budget
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedBudgets.map((budget, index) => {
          const spent = calculateBudgetSpending(budget, entries)
          return (
            <motion.div
              key={budget.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.07, ease: "easeOut" }}
            >
              <BudgetCard
                budget={budget}
                spent={spent}
                onEdit={onEdit}
                onDelete={onDelete}
                onRenew={onRenew}
              />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

