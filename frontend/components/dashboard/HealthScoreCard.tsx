"use client"

/**
 * Financial Health Score Card
 *
 * Displays a 0–100 score derived from savings rate, budget adherence,
 * goal progress, income stability, and spending regularity.
 * Clicking the card opens a breakdown popover.
 */

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useInsightsContext } from "@/contexts/dashboard/InsightsContext"
import { Info } from "lucide-react"

const TIER_LABELS = {
  critical: "Critical",
  "needs-work": "Needs Work",
  good: "Good",
  excellent: "Excellent",
  outstanding: "Outstanding",
}

const TIER_COLORS = {
  critical: { stroke: "#ef4444", text: "text-red-500", bg: "bg-red-50 dark:bg-red-950" },
  "needs-work": { stroke: "#f97316", text: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950" },
  good: { stroke: "#eab308", text: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950" },
  excellent: { stroke: "#22c55e", text: "text-green-500", bg: "bg-green-50 dark:bg-green-950" },
  outstanding: { stroke: "#3b82f6", text: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
}

const BREAKDOWN_LABELS = [
  { key: "savingsRate", label: "Savings Rate", max: 30 },
  { key: "budgetAdherence", label: "Budget Discipline", max: 25 },
  { key: "goalProgress", label: "Goal Progress", max: 20 },
  { key: "incomeStability", label: "Income Stability", max: 15 },
  { key: "spendingRegularity", label: "Spending Regularity", max: 10 },
] as const

// SVG ring dimensions
const SIZE = 120
const RADIUS = 46
const STROKE = 9
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function HealthScoreCard() {
  const { healthScore } = useInsightsContext()
  const [open, setOpen] = useState(false)

  if (!healthScore) {
    return (
      <Card className="drop-shadow-xl shadow-black/10 flex-1">
        <CardContent className="flex items-center justify-center h-full min-h-[140px]">
          <div className="text-center text-muted-foreground">
            <div className="text-sm">Add transactions to see your Financial Health Score</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { score, tier, breakdown } = healthScore
  const colors = TIER_COLORS[tier]
  const dashOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Card
          className="drop-shadow-xl shadow-black/10 flex-1 cursor-pointer hover:shadow-md transition-shadow select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
          aria-label="Financial Health Score — click for breakdown"
        >
          <CardContent className="flex items-center gap-4 py-4 px-5">
            {/* Score Ring */}
            <div className="relative flex-shrink-0">
              <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
                {/* Track */}
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={STROKE}
                  className="text-muted/30"
                />
                {/* Progress arc */}
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth={STROKE}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
                {/* Score number */}
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`font-bold fill-foreground`}
                  fontSize="24"
                  fontWeight="700"
                >
                  {score}
                </text>
              </svg>
            </div>

            {/* Labels */}
            <div className="flex flex-col gap-1 min-w-0">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Financial Health
              </div>
              <div className={`text-xl font-bold ${colors.text}`}>
                {TIER_LABELS[tier]}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>Tap for breakdown</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PopoverTrigger>

      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Score Breakdown</h4>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {score}/100
            </span>
          </div>
          <div className="space-y-2.5">
            {BREAKDOWN_LABELS.map(({ key, label, max }) => {
              const val = breakdown[key]
              const pct = Math.round((val / max) * 100)
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{val}/{max}</span>
                  </div>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: colors.stroke,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground pt-1 border-t">
            Based on savings rate, budget discipline, goal progress, income stability, and spending consistency.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
