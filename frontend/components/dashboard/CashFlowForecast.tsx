"use client"

/**
 * Cash Flow Forecast
 *
 * 90-day forward projection based on:
 *   - Active recurring transactions (known future dates)
 *   - Average daily discretionary spend (from last 3 months)
 *   - Starting balance = lifetime net balance
 *
 * Renders a Recharts AreaChart with a confidence band.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { memo } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useInsightsContext } from "@/contexts/dashboard/InsightsContext"
import { useMoney } from "@/contexts/CurrencyContext"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { UpgradePrompt } from "@/components/ui/UpgradePrompt"

// Forecast date keys are UTC civil days (see generateCashFlowForecast); parse and
// render them in UTC so the axis labels don't shift a day in non-UTC timezones.
function formatAxisDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + "T00:00:00Z")
  return d.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" })
}

interface TooltipPayloadItem {
  dataKey: string
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  const { format } = useMoney()
  const t = useTranslations("insights")
  const locale = useLocale()
  if (!active || !payload?.length) return null
  const balance = payload.find((p) => p.dataKey === "balance")?.value
  const lower = payload.find((p) => p.dataKey === "lower")?.value
  const upper = payload.find((p) => p.dataKey === "upper")?.value

  return (
    <div className="rounded-lg border bg-popover text-popover-foreground p-3 shadow-md text-xs">
      <p className="font-medium mb-1">{label ? formatAxisDate(label, locale) : ""}</p>
      <p className="text-foreground font-semibold">
        {format(balance ?? 0)}
      </p>
      {lower !== undefined && upper !== undefined && (
        <p className="text-muted-foreground">
          {t("range")}: {format(lower)} – {format(upper)}
        </p>
      )}
    </div>
  )
}
export const CashFlowForecast = memo(function CashFlowForecast(_: { userCurrency?: string }) {
  const { cashFlowData } = useInsightsContext()
  const { isPro, loading: subscriptionLoading } = useSubscription()
  const { format } = useMoney()
  const t = useTranslations("insights")
  const locale = useLocale()

  if (subscriptionLoading) {
    return (
      <Card className="drop-shadow-xl shadow-black/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            {t("cashFlowForecastTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 rounded-lg animate-pulse bg-muted" />
        </CardContent>
      </Card>
    )
  }

  if (!isPro) {
    return (
      <Card className="drop-shadow-xl shadow-black/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            {t("cashFlowForecastTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UpgradePrompt
            mode="card"
            feature={t("cashFlowUpgradeFeature")}
            description={t("cashFlowUpgradeDesc")}
          />
        </CardContent>
      </Card>
    )
  }

  if (cashFlowData.length === 0) {
    return (
      <Card className="drop-shadow-xl shadow-black/10 border-dashed">
        <CardContent className="flex items-center gap-3 py-4 px-4">
          <TrendingUp className="h-5 w-5 text-muted-foreground/50 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground/70">{t("cashFlowForecastShort")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("cashFlowUnlock")}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Summary numbers at 30 / 60 / 90 days
  const at = (days: number) => {
    const idx = Math.min(Math.floor(days / 3), cashFlowData.length - 1)
    return cashFlowData[idx]
  }
  const d30 = at(30)
  const d60 = at(60)
  const d90 = at(90)
  const startBalance = cashFlowData[0]?.balance ?? 0
  const trend30 = d30.balance >= startBalance ? "up" : "down"

  return (
    <Card className="drop-shadow-xl shadow-black/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {trend30 === "up" ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            {t("cashFlowForecastTitle")}
          </CardTitle>
          <span className="text-xs text-muted-foreground">{t("cashFlowBasedOn")}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chart */}
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={cashFlowData}
              margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => formatAxisDate(v, locale)}
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                interval={Math.floor(cashFlowData.length / 4)}
              />
              <YAxis
                tickFormatter={(v) => format(v, { maximumFractionDigits: 0 })}
                tick={{ fontSize: 10 }}
                width={70}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Confidence band (upper – lower area) */}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="transparent"
                fill="url(#bandGrad)"
                strokeWidth={0}
              />
              {/* Mask the area below `lower` with the card background so only the
                  band between lower and upper shows. Must track the theme
                  background, not hardcoded white, or it paints a white wedge in
                  dark mode. (RA-15) */}
              <Area
                type="monotone"
                dataKey="lower"
                stroke="transparent"
                fill="hsl(var(--background))"
                strokeWidth={0}
              />
              {/* Main balance line */}
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#balanceGrad)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary pills */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t("daysLabel", { count: 30 }), point: d30 },
            { label: t("daysLabel", { count: 60 }), point: d60 },
            { label: t("daysLabel", { count: 90 }), point: d90 },
          ].map(({ label, point }) => (
            <div
              key={label}
              className="rounded-lg bg-muted/40 p-2.5 text-center"
            >
              <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
              <div
                className={`text-sm font-semibold ${
                  point.balance >= startBalance ? "text-green-600" : "text-red-500"
                }`}
              >
                {format(point.balance)}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {t("cashFlowFootnote")}
        </p>
      </CardContent>
    </Card>
  )
})
