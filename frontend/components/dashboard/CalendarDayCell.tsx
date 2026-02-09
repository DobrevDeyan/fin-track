"use client"

import { cn } from "@/lib/utils"
import type { CalendarDay } from "@/lib/date-utils"
import type { Entry } from "@/lib/hooks/dashboard/types"
import { Repeat } from "lucide-react"

export interface DayData {
  entries: Entry[]
  recurringItems: { name: string; amount: number; type: "income" | "expense" }[]
}

interface CalendarDayCellProps {
  day: CalendarDay
  data: DayData | undefined
  userCurrency: string
  onClick: (day: CalendarDay) => void
}

export function CalendarDayCell({ day, data, userCurrency, onClick }: CalendarDayCellProps) {
  const entries = data?.entries ?? []
  const recurring = data?.recurringItems ?? []

  const incomeTotal = entries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0)
  const expenseTotal = entries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0)

  const recurringIncome = recurring
    .filter((r) => r.type === "income")
    .reduce((sum, r) => sum + r.amount, 0)
  const recurringExpense = recurring
    .filter((r) => r.type === "expense")
    .reduce((sum, r) => sum + r.amount, 0)

  const hasEntries = entries.length > 0
  const hasRecurring = recurring.length > 0
  const hasData = hasEntries || hasRecurring

  return (
    <button
      type="button"
      onClick={() => onClick(day)}
      className={cn(
        "relative flex flex-col p-1 sm:p-2 min-h-[60px] sm:min-h-[90px] text-left border border-border/40 transition-colors hover:bg-accent/50",
        !day.isCurrentMonth && "bg-muted/30 text-muted-foreground",
        day.isToday && "ring-2 ring-primary ring-inset bg-primary/5",
        hasData && "cursor-pointer"
      )}
    >
      {/* Day number */}
      <span
        className={cn(
          "text-xs sm:text-sm font-medium leading-none",
          day.isToday && "text-primary font-bold",
          !day.isCurrentMonth && "text-muted-foreground/60"
        )}
      >
        {day.date.getDate()}
      </span>

      {/* Transaction indicators */}
      <div className="mt-auto flex flex-col gap-0.5 overflow-hidden">
        {/* Desktop: show amounts */}
        {(incomeTotal > 0 || recurringIncome > 0) && (
          <div className="hidden sm:flex items-center gap-1 text-[10px] leading-tight text-green-600 truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            +{(incomeTotal + recurringIncome).toFixed(0)}
          </div>
        )}
        {(expenseTotal > 0 || recurringExpense > 0) && (
          <div className="hidden sm:flex items-center gap-1 text-[10px] leading-tight text-red-600 truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            -{(expenseTotal + recurringExpense).toFixed(0)}
          </div>
        )}

        {/* Mobile: show dots only */}
        <div className="flex sm:hidden items-center gap-1 mt-1">
          {(incomeTotal > 0 || recurringIncome > 0) && (
            <span className="w-2 h-2 rounded-full bg-green-500" />
          )}
          {(expenseTotal > 0 || recurringExpense > 0) && (
            <span className="w-2 h-2 rounded-full bg-red-500" />
          )}
          {hasRecurring && (
            <Repeat className="w-2.5 h-2.5 text-blue-500" />
          )}
        </div>

        {/* Desktop recurring indicator */}
        {hasRecurring && (
          <div className="hidden sm:flex items-center gap-1 text-[10px] leading-tight text-blue-600 truncate">
            <Repeat className="w-2.5 h-2.5 shrink-0" />
            {recurring.length}
          </div>
        )}
      </div>
    </button>
  )
}
