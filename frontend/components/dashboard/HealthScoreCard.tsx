"use client"

/**
 * Financial Health Score Card
 *
 * Displays a 0–100 score derived from savings rate, budget adherence,
 * goal progress, income stability, and spending regularity.
 * Clicking the card opens a breakdown popover.
 */

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useInsightsContext } from "@/contexts/dashboard/InsightsContext"
import { TrendingUp, Wallet, Target, Shield, Activity } from "lucide-react"

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
  { key: "savingsRate",       label: "Savings Rate",        max: 30, icon: TrendingUp },
  { key: "budgetAdherence",   label: "Budget Discipline",   max: 25, icon: Wallet },
  { key: "goalProgress",      label: "Goal Progress",       max: 20, icon: Target },
  { key: "incomeStability",   label: "Income Stability",    max: 15, icon: Shield },
  { key: "spendingRegularity",label: "Spending Regularity", max: 10, icon: Activity },
] as const

function getBarColor(pct: number) {
  if (pct >= 80) return "#22c55e"
  if (pct >= 50) return "#eab308"
  return "#ef4444"
}

// SVG ring dimensions
const SIZE = 120
const RADIUS = 46
const STROKE = 9
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function HealthScoreCard() {
  const { healthScore } = useInsightsContext()
  const [open, setOpen] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const [animatedOffset, setAnimatedOffset] = useState(CIRCUMFERENCE)

  // Count-up + ring fill animation on mount
  useEffect(() => {
    if (!healthScore) return
    const target = healthScore.score
    const duration = 1200
    const start = Date.now()
    const animate = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplayScore(Math.round(target * eased))
      setAnimatedOffset(CIRCUMFERENCE - (target / 100) * CIRCUMFERENCE * eased)
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [healthScore?.score])

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

  // Weakest metric for focus tip
  const weakest = [...BREAKDOWN_LABELS]
    .map(({ key, label, max }) => ({ label, pct: (breakdown[key] / max) * 100 }))
    .sort((a, b) => a.pct - b.pct)[0]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Card
          className="drop-shadow-xl shadow-black/10 flex-1 cursor-pointer hover:shadow-lg transition-all duration-300 select-none active:scale-[0.99]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
          aria-label="Financial Health Score — click for breakdown"
        >
          <CardContent className="flex items-center gap-4 py-4 px-5">
            {/* Score Ring with glow */}
            <div className="relative flex-shrink-0">
              <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                aria-hidden
                style={{ filter: `drop-shadow(0 0 8px ${colors.stroke}55)` }}
              >
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
                  strokeDashoffset={animatedOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
                {/* Animated score number */}
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground"
                  fontSize="24"
                  fontWeight="700"
                >
                  {displayScore}
                </text>
              </svg>
            </div>

            {/* Labels + mini bars */}
            <div className="flex flex-col gap-1 min-w-0">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Financial Health
              </div>
              <div className={`text-xl font-bold ${colors.text}`}>
                {TIER_LABELS[tier]}
              </div>
              {/* Mini color-coded bar preview */}
              <div className="flex gap-1 mt-1.5">
                {BREAKDOWN_LABELS.map(({ key, max }) => {
                  const pct = (breakdown[key] / max) * 100
                  return (
                    <div
                      key={key}
                      className="h-1.5 flex-1 rounded-full"
                      style={{ backgroundColor: getBarColor(pct) }}
                    />
                  )
                })}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Tap for breakdown
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

          <div className="space-y-3">
            {BREAKDOWN_LABELS.map(({ key, label, max, icon: Icon }) => {
              const val = breakdown[key]
              const pct = Math.round((val / max) * 100)
              const barColor = getBarColor(pct)
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      {label}
                    </span>
                    <span className="font-semibold tabular-nums">{val}/{max}</span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {weakest.pct < 80 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Focus area: </span>
                {weakest.label} — improving this will boost your score the most.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
