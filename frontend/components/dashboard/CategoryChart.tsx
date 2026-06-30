"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Pie, PieChart, Cell } from "recharts"
import { useMoney } from "@/contexts/CurrencyContext"

interface Entry {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: "income" | "expense"
}

interface CategoryChartProps {
  entries: Entry[]
}

const categoryColors: Record<string, string> = {
  "Food & Dining": "hsl(var(--chart-1))",
  "Shopping": "hsl(var(--chart-2))",
  "Transportation": "hsl(var(--chart-3))",
  "Bills & Utilities": "hsl(var(--chart-4))",
  "Entertainment": "hsl(var(--chart-5))",
  "Health & Pharmacy": "hsl(330, 70%, 55%)",
  "Education": "hsl(240, 60%, 55%)",
  "Travel & Vacation": "hsl(175, 60%, 45%)",
  "Gifts & Donations": "hsl(350, 75%, 60%)",
  "Taxes & Insurance": "hsl(25, 75%, 50%)",
  "Salary": "hsl(var(--chart-1))",
  "Other": "hsl(var(--muted))",
}

const chartConfig = {
  value: {
    label: "Amount",
  },
} satisfies Record<string, { label: string }>

export function CategoryChart({ entries }: CategoryChartProps) {
  const t = useTranslations("reports")
  const { format } = useMoney()

  // Spending by category across the SELECTED range (entries are already filtered
  // to it by the page). Previously this re-filtered to the current calendar
  // month, so any non-current range rendered empty. (RA-3)
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>()
    for (const entry of entries) {
      if (entry.type !== "expense") continue
      categoryMap.set(entry.category, (categoryMap.get(entry.category) ?? 0) + entry.amount)
    }

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: categoryColors[name] || categoryColors["Other"],
      }))
      .sort((a, b) => b.value - a.value)
  }, [entries])

  const total = categoryData.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="drop-shadow-xl shadow-black/10 w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">
          {t("categoryBreakdown")}
        </CardTitle>
        <CardDescription>{t("categoryBreakdownDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {categoryData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            {t("noExpenseData")}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-center w-full">
              <ChartContainer config={chartConfig} className="h-[250px] w-full max-w-[250px]">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>
            <div className="space-y-3">
              {categoryData.map((item) => {
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0"
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                    <div className="text-sm font-semibold">
                      {format(item.value)}
                    </div>
                      <div className="text-xs text-muted-foreground">
                        {percentage}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
