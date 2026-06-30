"use client"

/**
 * Year-over-Year Chart
 *
 * Compares monthly income and expenses across the current year versus the
 * previous year. Reads from the server-maintained financialSummaries months
 * map (full history) rather than the reports page's range-limited entries, so
 * it never under-counts. (RA-11)
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
import { useTranslations, useLocale } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMoney } from "@/contexts/CurrencyContext"
import type { MonthlyData } from "@/lib/firestore-types"

interface YearOverYearChartProps {
  months: Record<string, MonthlyData> | undefined
}

interface TooltipPayloadItem {
  name: string
  value: number
  fill: string
}

export function YearOverYearChart({ months }: YearOverYearChartProps) {
  const t = useTranslations("reports")
  const locale = useLocale()
  const { format } = useMoney()
  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1

  const monthLabel = (monthIndex: number) =>
    new Date(Date.UTC(2000, monthIndex, 1)).toLocaleDateString(locale, {
      month: "short",
      timeZone: "UTC",
    })

  const curIncomeName = `${currentYear} ${t("income")}`
  const curExpensesName = `${currentYear} ${t("expenses")}`
  const prevIncomeName = `${previousYear} ${t("income")}`
  const prevExpensesName = `${previousYear} ${t("expenses")}`

  // One row per month, pulling income/expenses for both years from the summary.
  const data = Array.from({ length: 12 }, (_, i) => {
    const mm = String(i + 1).padStart(2, "0")
    const cur = months?.[`${currentYear}-${mm}`]
    const prev = months?.[`${previousYear}-${mm}`]
    return {
      month: monthLabel(i),
      curIncome: cur?.income ?? 0,
      curExpenses: cur?.expenses ?? 0,
      prevIncome: prev?.income ?? 0,
      prevExpenses: prev?.expenses ?? 0,
    }
  })

  const hasPreviousYear = data.some((d) => d.prevIncome > 0 || d.prevExpenses > 0)

  const formatTick = (value: number) =>
    format(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: TooltipPayloadItem[]
    label?: string
  }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: p.fill }} />
              {p.name}
            </span>
            <span className="font-mono">{format(p.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("yearOverYear")}</CardTitle>
        <CardDescription>
          {t("yearOverYearDesc", { current: String(currentYear), previous: String(previousYear) })}
          {!hasPreviousYear && ` — ${t("yearOverYearHint")}`}
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
            <Bar dataKey="curIncome" name={curIncomeName} fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="curExpenses" name={curExpensesName} fill="#ef4444" radius={[3, 3, 0, 0]} />
            {hasPreviousYear && (
              <>
                <Bar dataKey="prevIncome" name={prevIncomeName} fill="#86efac" radius={[3, 3, 0, 0]} />
                <Bar dataKey="prevExpenses" name={prevExpensesName} fill="#fca5a5" radius={[3, 3, 0, 0]} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
