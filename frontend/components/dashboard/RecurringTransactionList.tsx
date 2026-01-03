"use client"

import { RecurringTransactionCard } from "./RecurringTransactionCard"
import { Button } from "@/components/ui/button"
import { Plus, Repeat } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { RecurringEntryDocument } from "@/lib/firestore-types"

interface RecurringTransactionListProps {
  recurringTransactions: (RecurringEntryDocument & { id: string })[]
  onAdd: () => void
  onEdit: (recurring: RecurringEntryDocument & { id: string }) => void
  onDelete: (recurringId: string) => Promise<void>
}

export function RecurringTransactionList({
  recurringTransactions,
  onAdd,
  onEdit,
  onDelete,
}: RecurringTransactionListProps) {
  // Sort: active first, then by next date
  const sortedRecurring = [...recurringTransactions].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return a.nextDate.toMillis() - b.nextDate.toMillis()
  })

  if (recurringTransactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Repeat className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Recurring Transactions Yet</h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            Set up recurring bills and subscriptions to automatically create transactions. Perfect for
            monthly subscriptions, bills, or regular income.
          </p>
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Recurring Transaction
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedRecurring.map((recurring) => (
          <RecurringTransactionCard
            key={recurring.id}
            recurring={recurring}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}

