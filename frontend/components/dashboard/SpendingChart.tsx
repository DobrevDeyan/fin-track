"use client"

import { useMemo } from "react"
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
}

const chartConfig = {
  spending: {
    label: "Spending",
    color: "hsl(var(--chart-1))",
  },
} satisfies Record<string, { label: string; color: string }>

export function SpendingChart({ entries }: SpendingChartProps) {
  // Calculate spending by month for the last 7 months
  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const now = new Date()
    const last7Months: { month: string; spending: number }[] = []

    // Get last 7 months
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = months[date.getMonth()]
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      // Calculate total expenses for this month
      const monthSpending = entries
        .filter((entry) => {
          if (entry.type !== "expense") return false
          const entryDate = new Date(entry.date)
          const entryMonthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, "0")}`
          return entryMonthKey === monthKey
        })
        .reduce((sum, entry) => sum + entry.amount, 0)

      last7Months.push({
        month: monthName,
        spending: monthSpending,
      })
    }

    return last7Months
  }, [entries])
  return (
    <Card className="drop-shadow-xl shadow-black/10 w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">
          Spending Overview
        </CardTitle>
        <CardDescription>Your spending trends over the last 7 months</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.every((d) => d.spending === 0) ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No spending data available
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

