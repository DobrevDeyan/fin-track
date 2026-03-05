"use client"

import { RecurringTransactionCard } from "./RecurringTransactionCard"
import { Button } from "@/components/ui/button"
import { Plus, Repeat } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { RecurringEntryDocument } from "@/lib/firestore-types"
import { useTranslations } from "next-intl"

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
  const t = useTranslations("recurring")

  // Sort: active first, then by next date
  const sortedRecurring = [...recurringTransactions].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return a.nextDate.toMillis() - b.nextDate.toMillis()
  })

  if (recurringTransactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 md:py-16">
          <Repeat className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-4 md:mb-6" />
          <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">{t("noTransactions")}</h3>
          <p className="text-sm md:text-base text-muted-foreground text-center mb-4 md:mb-6 max-w-md md:max-w-lg px-4">
            {t("noTransactionsDesc")}
          </p>
          <Button onClick={onAdd} size="default" className="md:text-base">
            <Plus className="h-4 w-4 mr-2" />
            {t("createFirst")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
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

