"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

const chartData = [
  { month: "Jan", spending: 1200 },
  { month: "Feb", spending: 1900 },
  { month: "Mar", spending: 1400 },
  { month: "Apr", spending: 2100 },
  { month: "May", spending: 1800 },
  { month: "Jun", spending: 2400 },
  { month: "Jul", spending: 2200 },
]

const chartConfig = {
  spending: {
    label: "Spending",
    color: "hsl(var(--chart-1))",
  },
} satisfies Record<string, { label: string; color: string }>

export function SpendingChart() {
  return (
    <Card className="drop-shadow-xl shadow-black/10 dark:shadow-white/10 w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text">
          Spending Overview
        </CardTitle>
        <CardDescription>Your spending trends over the last 7 months</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}

