"use client"

import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingDown, TrendingUp, Wallet, ArrowUp, ArrowDown, Minus } from "lucide-react"
import { formatCurrency } from "@/lib/currency-utils"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface MetricsCardsProps {
  totalBalance: number
  monthlyIncome: number
  monthlySpending: number
  monthlyCashFlow: number
  incomeChange: { change: string; trend: "up" | "down" | "neutral" }
  spendingChange: { change: string; trend: "up" | "down" | "neutral" }
  cashFlowChange: { change: string; trend: "up" | "down" | "neutral" }
  userCurrency?: string
}

function TrendBadge({ change, trend }: { change: string; trend: "up" | "down" | "neutral" }) {
  if (change === "No change") return null
  const Icon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-semibold",
        trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-muted-foreground"
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {change}
    </span>
  )
}

export const MetricsCards = memo(function MetricsCards({
  totalBalance,
  monthlyIncome,
  monthlySpending,
  monthlyCashFlow,
  incomeChange,
  spendingChange,
  cashFlowChange,
  userCurrency = "EUR",
}: MetricsCardsProps) {
  const t = useTranslations("dashboard")
  const fmt = (v: number) => formatCurrency(v, { currency: userCurrency })

  const monthlyStats = [
    {
      label: t("monthlyIncome"),
      value: fmt(monthlyIncome),
      rawValue: monthlyIncome,
      icon: TrendingUp,
      iconColor: "text-emerald-600",
      change: incomeChange,
      positiveIsGood: true,
    },
    {
      label: t("monthlySpending"),
      value: fmt(monthlySpending),
      rawValue: monthlySpending,
      icon: TrendingDown,
      iconColor: "text-red-500",
      change: spendingChange,
      positiveIsGood: false,
    },
    {
      label: t("monthlyCashFlow"),
      value: fmt(monthlyCashFlow),
      rawValue: monthlyCashFlow,
      icon: Wallet,
      iconColor: monthlyCashFlow >= 0 ? "text-emerald-600" : "text-red-500",
      change: cashFlowChange,
      positiveIsGood: true,
    },
  ]

  return (
    <Card className="overflow-hidden drop-shadow-xl shadow-black/10">
      {/* Net Balance — all-time */}
      <div className="px-5 pt-5 pb-4 border-b">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {t("totalBalance")}
            </p>
            <p
              className={cn(
                "text-3xl font-bold tracking-tight",
                totalBalance >= 0 ? "text-foreground" : "text-red-500"
              )}
            >
              {fmt(totalBalance)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">{t("allTimeNet")}</p>
          </div>
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Wallet className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      </div>

      {/* This Month — 3 stats */}
      <CardContent className="p-0">
        <div className="px-5 pt-3 pb-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            {t("thisMonth")}
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x">
          {monthlyStats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="px-4 py-3 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Icon className={cn("h-3 w-3", stat.iconColor)} />
                  <span className="text-[10px] font-medium leading-none">{stat.label}</span>
                </div>
                <p
                  className={cn(
                    "text-base font-bold leading-tight",
                    stat.rawValue < 0 ? "text-red-500" : "text-foreground"
                  )}
                >
                  {stat.value}
                </p>
                <TrendBadge change={stat.change.change} trend={stat.change.trend} />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
})
