"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react"
import { formatCurrency } from "@/lib/currency-utils"
import { getTrendColor } from "@/lib/constants/ui.constants"

interface MetricsCardsProps {
  totalBalance: number
  totalIncome: number
  totalExpenses: number
  savings: number
  balanceChange: { change: string; trend: "up" | "down" | "neutral" }
  incomeChange: { change: string; trend: "up" | "down" | "neutral" }
  expensesChange: { change: string; trend: "up" | "down" | "neutral" }
  savingsChange: { change: string; trend: "up" | "down" | "neutral" }
  userCurrency?: string
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
  userCurrency = "EUR",
}: MetricsCardsProps) {
  const metrics = [
    {
      title: "Total Balance",
      value: formatCurrency(totalBalance, { currency: userCurrency }),
      icon: Wallet,
      gradient: "from-black to-gray-800",
      change: balanceChange.change,
      trend: balanceChange.trend,
    },
    {
      title: "Total Income",
      value: formatCurrency(totalIncome, { currency: userCurrency }),
      icon: TrendingUp,
      gradient: "from-black to-gray-800",
      change: incomeChange.change,
      trend: incomeChange.trend,
    },
    {
      title: "Total Expenses",
      value: formatCurrency(totalExpenses, { currency: userCurrency }),
      icon: TrendingDown,
      gradient: "from-black to-gray-800",
      change: expensesChange.change,
      trend: expensesChange.trend,
    },
    {
      title: "Savings",
      value: formatCurrency(savings, { currency: userCurrency }),
      icon: PiggyBank,
      gradient: "from-black to-gray-800",
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
            className="relative overflow-hidden drop-shadow-xl shadow-black/10"
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
              <p className={`text-xs mt-1 ${getTrendColor(metric.trend)}`}>
                {metric.title === "Savings" 
                  ? metric.change 
                  : `${metric.change} from last month`}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

