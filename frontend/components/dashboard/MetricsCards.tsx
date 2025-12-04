"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react"
import { formatCurrency } from "@/lib/currency-utils"

interface MetricsCardsProps {
  totalBalance: number
  totalIncome: number
  totalExpenses: number
  savings: number
  balanceChange: { change: string; trend: "up" | "down" | "neutral" }
  incomeChange: { change: string; trend: "up" | "down" | "neutral" }
  expensesChange: { change: string; trend: "up" | "down" | "neutral" }
  savingsChange: { change: string; trend: "up" | "down" | "neutral" }
}

export function MetricsCards({
  totalBalance,
  totalIncome,
  totalExpenses,
  savings,
  balanceChange,
  incomeChange,
  expensesChange,
  savingsChange,
}: MetricsCardsProps) {
  const metrics = [
    {
      title: "Total Balance",
      value: formatCurrency(totalBalance, { currency: "EUR" }),
      icon: Wallet,
      gradient: "from-[#F596D3] to-[#D247BF]",
      change: balanceChange.change,
      trend: balanceChange.trend,
    },
    {
      title: "Total Income",
      value: formatCurrency(totalIncome, { currency: "EUR" }),
      icon: TrendingUp,
      gradient: "from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7]",
      change: incomeChange.change,
      trend: incomeChange.trend,
    },
    {
      title: "Total Expenses",
      value: formatCurrency(totalExpenses, { currency: "EUR" }),
      icon: TrendingDown,
      gradient: "from-[#FF6B6B] to-[#EE5A6F]",
      change: expensesChange.change,
      trend: expensesChange.trend,
    },
    {
      title: "Savings",
      value: formatCurrency(savings, { currency: "EUR" }),
      icon: PiggyBank,
      gradient: "from-[#4ECDC4] to-[#44A08D]",
      change: savingsChange.change,
      trend: savingsChange.trend,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <Card
            key={metric.title}
            className="relative overflow-hidden drop-shadow-xl shadow-black/10 dark:shadow-white/10"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-5`}
            />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p
                className={`text-xs mt-1 ${
                  metric.trend === "up"
                    ? "text-green-600 dark:text-green-400"
                    : metric.trend === "down"
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                }`}
              >
                {metric.change} from last month
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

