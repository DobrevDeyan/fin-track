"use client"

/**
 * Year-over-Year Chart
 *
 * Compares monthly income and expenses across the current year
 * versus the previous year, using entries already loaded by the
 * reports page (no extra Firestore calls).
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/currency-utils"

interface Entry {
  id: string
  date: string
  type: "income" | "expense"
  amount: number
  category: string
}

interface YearOverYearChartProps {
  entries: Entry[]
  userCurrency?: string
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function YearOverYearChart({ entries, userCurrency = "EUR" }: YearOverYearChartProps) {
  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1

  // Build month buckets for both years
  const buckets: Record<number, Record<number, { income: number; expenses: number }>> = {
    [currentYear]: {},
    [previousYear]: {},
  }

  for (const entry of entries) {
    const d = new Date(entry.date)
    const year = d.getFullYear()
    const month = d.getMonth() // 0-indexed
    if (year !== currentYear && year !== previousYear) continue
    if (!buckets[year][month]) buckets[year][month] = { income: 0, expenses: 0 }
    if (entry.type === "income") buckets[year][month].income += entry.amount
    else buckets[year][month].expenses += entry.amount
  }

  // Build chart data — one row per month
  const data = MONTH_LABELS.map((month, i) => ({
    month,
    [`${currentYear} Income`]: buckets[currentYear][i]?.income ?? 0,
    [`${currentYear} Expenses`]: buckets[currentYear][i]?.expenses ?? 0,
    [`${previousYear} Income`]: buckets[previousYear][i]?.income ?? 0,
    [`${previousYear} Expenses`]: buckets[previousYear][i]?.expenses ?? 0,
  }))

  // Check if there's any previous-year data to show
  const hasPreviousYear = entries.some((e) => new Date(e.date).getFullYear() === previousYear)

  const formatTick = (value: number) =>
    formatCurrency(value, { currency: userCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: p.fill }} />
              {p.name}
            </span>
            <span className="font-mono">{formatCurrency(p.value, { currency: userCurrency })}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Year-over-Year Comparison</CardTitle>
        <CardDescription>
          Monthly income and expenses: {currentYear} vs {previousYear}
          {!hasPreviousYear && " — add transactions from last year to see the comparison"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatTick} tick={{ fontSize: 11 }} width={72} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey={`${currentYear} Income`} fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey={`${currentYear} Expenses`} fill="#ef4444" radius={[3, 3, 0, 0]} />
            {hasPreviousYear && (
              <>
                <Bar dataKey={`${previousYear} Income`} fill="#86efac" radius={[3, 3, 0, 0]} />
                <Bar dataKey={`${previousYear} Expenses`} fill="#fca5a5" radius={[3, 3, 0, 0]} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
