"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { generateCalendarDays, isSameDay, formatDateForInput } from "@/lib/date-utils"
import { calculateNextDate } from "@/lib/firestore-recurring"
import { CalendarDayCell, type DayData } from "./CalendarDayCell"
import { CalendarEventPopover } from "./CalendarEventPopover"
import type { Entry } from "@/lib/hooks/dashboard/types"
import type { RecurringTransaction } from "@/contexts/dashboard/RecurringContext"
import type { CalendarDay } from "@/lib/date-utils"
import { Timestamp } from "firebase/firestore"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

interface CalendarViewProps {
  entries: Entry[]
  recurringTransactions: RecurringTransaction[]
  userCurrency: string
  onAddTransaction: (date: string) => void
}

/** Convert a Timestamp / Date / string to a JS Date */
function toDate(val: Timestamp | Date | string): Date {
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date(val)
}

export function CalendarView({
  entries,
  recurringTransactions,
  userCurrency,
  onAddTransaction,
}: CalendarViewProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Generate calendar grid
  const calendarDays = useMemo(
    () => generateCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  )

  // Index entries by date string (YYYY-MM-DD)
  const entriesByDate = useMemo(() => {
    const map = new Map<string, Entry[]>()
    for (const entry of entries) {
      const key = formatDateForInput(entry.date)
      const list = map.get(key) || []
      list.push(entry)
      map.set(key, list)
    }
    return map
  }, [entries])

  // Project recurring transactions onto calendar dates
  const recurringByDate = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; type: "income" | "expense"; category: string; frequency: string }[]>()

    const gridStart = calendarDays[0].date
    const gridEnd = calendarDays[calendarDays.length - 1].date

    for (const rt of recurringTransactions) {
      if (!rt.isActive) continue

      let nextDate = toDate(rt.nextDate)

      // Advance nextDate until it enters the visible grid window (or passes it)
      let iterations = 0
      while (nextDate < gridStart && iterations < 400) {
        nextDate = calculateNextDate(nextDate, rt.frequency)
        iterations++
      }

      // Collect all occurrences within the grid
      iterations = 0
      while (nextDate <= gridEnd && iterations < 60) {
        const key = formatDateForInput(nextDate)
        const list = map.get(key) || []
        list.push({
          name: rt.name,
          amount: rt.amount,
          type: rt.type,
          category: rt.category,
          frequency: rt.frequency,
        })
        map.set(key, list)
        nextDate = calculateNextDate(nextDate, rt.frequency)
        iterations++
      }
    }

    return map
  }, [recurringTransactions, calendarDays])

  // Build day data lookup
  const dayDataMap = useMemo(() => {
    const map = new Map<string, DayData>()
    const allKeys = new Set([...entriesByDate.keys(), ...recurringByDate.keys()])
    for (const key of allKeys) {
      map.set(key, {
        entries: entriesByDate.get(key) || [],
        recurringItems: recurringByDate.get(key) || [],
      })
    }
    return map
  }, [entriesByDate, recurringByDate])

  // Navigation
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }, [])

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }, [])

  const goToToday = useCallback(() => {
    const now = new Date()
    setCurrentMonth(now.getMonth())
    setCurrentYear(now.getFullYear())
  }, [])

  // Day click handler
  const handleDayClick = useCallback((day: CalendarDay) => {
    setSelectedDay(day)
    setPopoverOpen(true)
  }, [])

  // Selected day data
  const selectedDateStr = selectedDay ? formatDateForInput(selectedDay.date) : ""
  const selectedEntries = selectedDateStr ? (entriesByDate.get(selectedDateStr) || []) : []
  const selectedRecurring = selectedDateStr ? (recurringByDate.get(selectedDateStr) || []) : []

  return (
    <div className="space-y-4">
      {/* Header: Month/Year + Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </h2>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-2"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const key = formatDateForInput(day.date)
          return (
            <CalendarDayCell
              key={index}
              day={day}
              data={dayDataMap.get(key)}
              userCurrency={userCurrency}
              onClick={handleDayClick}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          Income
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          Expense
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          Recurring
        </div>
      </div>

      {/* Day detail popover */}
      <CalendarEventPopover
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        date={selectedDay?.date ?? null}
        entries={selectedEntries}
        recurringItems={selectedRecurring}
        userCurrency={userCurrency}
        onAddTransaction={onAddTransaction}
      />
    </div>
  )
}
