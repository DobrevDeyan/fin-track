"use client"

import { useMemo } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

interface Entry {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: "income" | "expense"
}

interface SpendingChartProps {
  entries: Entry[]
  /** Selected range (YYYY-MM-DD); the chart shows one bucket per month in it. */
  startDate?: string
  endDate?: string
}

const chartConfig = {
  spending: {
    label: "Spending",
    color: "hsl(var(--chart-1))",
  },
} satisfies Record<string, { label: string; color: string }>

// Enumerate inclusive "YYYY-MM" keys between two YYYY-MM-DD strings (TZ-free).
function monthKeysBetween(start: string, end: string): string[] {
  const [sy, sm] = start.slice(0, 7).split("-").map(Number)
  const [ey, em] = end.slice(0, 7).split("-").map(Number)
  if (!sy || !sm || !ey || !em) return []
  const keys: string[] = []
  let y = sy
  let m = sm
  let guard = 0
  while ((y < ey || (y === ey && m <= em)) && guard < 600) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`)
    m++
    if (m > 12) {
      m = 1
      y++
    }
    guard++
  }
  return keys
}

export function SpendingChart({ entries, startDate, endDate }: SpendingChartProps) {
  const t = useTranslations("reports")
  const locale = useLocale()

  // One bucket per month across the SELECTED range. Entries are already filtered
  // to that range by the page; bucket each by the UTC month of its ISO date so
  // this agrees with the metrics monthlyBreakdown (which slices the UTC date)
  // instead of re-deriving a fixed "last 7 months" local-time window. (RA-3/RA-4)
  const chartData = useMemo(() => {
    if (!startDate || !endDate) return []
    const keys = monthKeysBetween(startDate, endDate)

    const spendingByMonth = new Map<string, number>()
    for (const e of entries) {
      if (e.type !== "expense") continue
      const key = e.date.slice(0, 7) // "YYYY-MM" (UTC)
      spendingByMonth.set(key, (spendingByMonth.get(key) ?? 0) + e.amount)
    }

    return keys.map((key) => {
      const labelDate = new Date(key + "-01T00:00:00Z")
      return {
        month: labelDate.toLocaleDateString(locale, { month: "short", timeZone: "UTC" }),
        spending: spendingByMonth.get(key) ?? 0,
      }
    })
  }, [entries, startDate, endDate, locale])

  const hasData = chartData.some((d) => d.spending > 0)

  return (
    <Card className="drop-shadow-xl shadow-black/10 w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">
          {t("spendingOverview")}
        </CardTitle>
        <CardDescription>{t("spendingOverviewDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            {t("noSpendingData")}
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
              data={chartData}
              margin={{
                left: 12,
                right: 12,
                top: 12,
                bottom: 24,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
                interval={0}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area
                dataKey="spending"
                type="natural"
                fill="var(--color-spending)"
                fillOpacity={0.4}
                stroke="var(--color-spending)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
