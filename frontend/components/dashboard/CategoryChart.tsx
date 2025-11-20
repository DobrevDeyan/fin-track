"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Pie, PieChart, Cell } from "recharts"

const categoryData = [
  { name: "Food & Dining", value: 1200, color: "hsl(var(--chart-1))" },
  { name: "Shopping", value: 800, color: "hsl(var(--chart-2))" },
  { name: "Transportation", value: 600, color: "hsl(var(--chart-3))" },
  { name: "Bills & Utilities", value: 500, color: "hsl(var(--chart-4))" },
  { name: "Entertainment", value: 400, color: "hsl(var(--chart-5))" },
  { name: "Other", value: 300, color: "hsl(var(--muted))" },
]

const chartConfig = {
  value: {
    label: "Amount",
  },
} satisfies Record<string, { label: string }>

export function CategoryChart() {
  const total = categoryData.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="drop-shadow-xl shadow-black/10 dark:shadow-white/10">
      <CardHeader>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text">
          Spending by Category
        </CardTitle>
        <CardDescription>Breakdown of your expenses this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="space-y-3">
            {categoryData.map((item) => {
              const percentage = ((item.value / total) * 100).toFixed(1)
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
                      ${item.value.toLocaleString()}
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
      </CardContent>
    </Card>
  )
}

