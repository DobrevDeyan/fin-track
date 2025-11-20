"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react"

interface MetricsCardsProps {
  totalBalance: number
  totalIncome: number
  totalExpenses: number
  savings: number
}

export function MetricsCards({
  totalBalance,
  totalIncome,
  totalExpenses,
  savings,
}: MetricsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const metrics = [
    {
      title: "Total Balance",
      value: formatCurrency(totalBalance),
      icon: Wallet,
      gradient: "from-[#F596D3] to-[#D247BF]",
      change: "+12.5%",
      trend: "up",
    },
    {
      title: "Total Income",
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      gradient: "from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7]",
      change: "+8.2%",
      trend: "up",
    },
    {
      title: "Total Expenses",
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      gradient: "from-[#FF6B6B] to-[#EE5A6F]",
      change: "-3.1%",
      trend: "down",
    },
    {
      title: "Savings",
      value: formatCurrency(savings),
      icon: PiggyBank,
      gradient: "from-[#4ECDC4] to-[#44A08D]",
      change: "+15.3%",
      trend: "up",
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
                    : "text-red-600 dark:text-red-400"
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

