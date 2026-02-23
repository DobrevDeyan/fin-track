"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingDown, Wallet, PiggyBank } from "lucide-react"
import { formatCurrency } from "@/lib/currency-utils"
import { getTrendColor } from "@/lib/constants/ui.constants"
import { useTranslations } from "next-intl"

interface MetricsCardsProps {
  totalBalance: number
  netSavings: number
  totalExpenses: number
  balanceChange: { change: string; trend: "up" | "down" | "neutral" }
  savingsChange: { change: string; trend: "up" | "down" | "neutral" }
  expensesChange: { change: string; trend: "up" | "down" | "neutral" }
  userCurrency?: string
}

export function MetricsCards({
  totalBalance,
  netSavings,
  totalExpenses,
  balanceChange,
  savingsChange,
  expensesChange,
  userCurrency = "EUR",
}: MetricsCardsProps) {
  const t = useTranslations("dashboard")

  const metrics = [
    {
      titleKey: "totalBalance",
      value: formatCurrency(totalBalance, { currency: userCurrency }),
      icon: Wallet,
      gradient: "from-blue-600 to-blue-800",
      iconColor: "text-blue-600",
      change: balanceChange.change,
      trend: balanceChange.trend,
      isSavings: false,
    },
    {
      titleKey: "netSavings",
      value: formatCurrency(netSavings, { currency: userCurrency }),
      icon: PiggyBank,
      gradient: netSavings >= 0 ? "from-emerald-600 to-emerald-800" : "from-orange-600 to-orange-800",
      iconColor: netSavings >= 0 ? "text-emerald-600" : "text-orange-600",
      change: savingsChange.change,
      trend: savingsChange.trend,
      isSavings: false,
    },
    {
      titleKey: "totalExpenses",
      value: formatCurrency(totalExpenses, { currency: userCurrency }),
      icon: TrendingDown,
      gradient: "from-red-600 to-red-800",
      iconColor: "text-red-600",
      change: expensesChange.change,
      trend: expensesChange.trend,
      isSavings: false,
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <Card
            key={metric.titleKey}
            className="relative overflow-hidden drop-shadow-xl shadow-black/10"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-10`}
            />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {(metric as any).title ? (metric as any).title : t(metric.titleKey)}
              </CardTitle>
              <Icon className={`h-4 w-4 ${metric.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.change !== "+100%" && metric.change !== "-100%" && metric.change !== "No change" ? (
                <p className={`text-xs mt-1 ${getTrendColor(metric.trend as "up" | "down" | "neutral")}`}>
                  {metric.isSavings
                    ? metric.change
                    : `${metric.change} ${t("fromLastMonth")}`}
                </p>
              ) : null}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
