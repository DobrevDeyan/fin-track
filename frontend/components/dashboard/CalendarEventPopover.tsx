"use client"

import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Repeat } from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { useMoney } from "@/contexts/CurrencyContext"
import { getCategoryColor } from "@/lib/constants/category.constants"
import { getTransactionTypeColor } from "@/lib/constants/transaction.constants"
import type { Entry } from "@/lib/hooks/dashboard/types"

interface RecurringItem {
  name: string
  amount: number
  type: "income" | "expense"
  category: string
  frequency: string
}

interface CalendarEventPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  entries: Entry[]
  recurringItems: RecurringItem[]
  userCurrency: string
  onAddTransaction: (dateStr: string) => void
}

export function CalendarEventPopover({
  open,
  onOpenChange,
  date,
  entries,
  recurringItems,
  userCurrency,
  onAddTransaction,
}: CalendarEventPopoverProps) {
  const t = useTranslations("calendar")
  const { format } = useMoney()

  if (!date) return null

  const incomeTotal = entries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0)
  const expenseTotal = entries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0)

  const dateStr = date.toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{formatDate(date, { month: "long", day: "numeric", year: "numeric" })}</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        {(entries.length > 0 || recurringItems.length > 0) && (
          <div className="flex gap-4 text-sm mb-2">
            {incomeTotal > 0 && (
              <span className="text-green-600 font-medium">
                +{format(incomeTotal)}
              </span>
            )}
            {expenseTotal > 0 && (
              <span className="text-red-600 font-medium">
                -{format(expenseTotal)}
              </span>
            )}
          </div>
        )}

        {/* Transactions */}
        {entries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">{t("transactions")}</h4>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2 rounded-md border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className={getCategoryColor(entry.category)}>
                    {entry.category}
                  </Badge>
                  <span className="text-sm truncate">{entry.description}</span>
                </div>
                <span className={`text-sm font-medium shrink-0 ml-2 ${getTransactionTypeColor(entry.type)}`}>
                  {entry.type === "income" ? "+" : "-"}
                  {format(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Recurring items */}
        {recurringItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Repeat className="w-3.5 h-3.5" />
              {t("legend.recurring")}
            </h4>
            {recurringItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-md border border-dashed border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className={getCategoryColor(item.category)}>
                    {item.category}
                  </Badge>
                  <span className="text-sm truncate">{item.name}</span>
                  <span className="text-[10px] text-muted-foreground">({item.frequency})</span>
                </div>
                <span className={`text-sm font-medium shrink-0 ml-2 ${getTransactionTypeColor(item.type)}`}>
                  {item.type === "income" ? "+" : "-"}
                  {format(item.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {entries.length === 0 && recurringItems.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noTransactionsOnDay")}
          </p>
        )}

        {/* Add transaction button */}
        <Button
          onClick={() => {
            onAddTransaction(dateStr)
            onOpenChange(false)
          }}
          className="w-full mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addTransaction")}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
