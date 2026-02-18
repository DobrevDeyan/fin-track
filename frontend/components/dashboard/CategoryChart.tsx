"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Pie, PieChart, Cell } from "recharts"
import { formatCurrency } from "@/lib/currency-utils"

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
  userCurrency?: string
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

export function CategoryChart({ entries, userCurrency = "EUR" }: CategoryChartProps) {
  // Calculate spending by category for current month
  const categoryData = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Filter expenses from current month
    const currentMonthExpenses = entries.filter((entry) => {
      if (entry.type !== "expense") return false
      const entryDate = new Date(entry.date)
      return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear
    })

    // Group by category
    const categoryMap = new Map<string, number>()
    currentMonthExpenses.forEach((entry) => {
      const current = categoryMap.get(entry.category) || 0
      categoryMap.set(entry.category, current + entry.amount)
    })

    // Convert to array and sort by amount
    const data = Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: categoryColors[name] || categoryColors["Other"],
      }))
      .sort((a, b) => b.value - a.value)

    return data
  }, [entries])

  const total = categoryData.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="drop-shadow-xl shadow-black/10 w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">
          Spending by Category
        </CardTitle>
        <CardDescription>Breakdown of your expenses this month</CardDescription>
      </CardHeader>
      <CardContent>
        {categoryData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No expense data for this month
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
                      {formatCurrency(item.value, { currency: userCurrency })}
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

