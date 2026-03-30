"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import type { HealthTier } from "@/lib/firestore-types"

interface Props {
  distribution: Record<HealthTier, number>
  total: number
  myTier?: HealthTier
}

const TIER_ORDER: HealthTier[] = ["critical", "needs-work", "good", "excellent", "outstanding"]

const TIER_COLORS: Record<HealthTier, string> = {
  critical: "#ef4444",
  "needs-work": "#f97316",
  good: "#3b82f6",
  excellent: "#10b981",
  outstanding: "#8b5cf6",
}

const TIER_LABELS: Record<HealthTier, string> = {
  critical: "Critical",
  "needs-work": "Needs Work",
  good: "Good",
  excellent: "Excellent",
  outstanding: "Outstanding",
}

export default function DistributionChart({ distribution, total, myTier }: Props) {
  const data = TIER_ORDER.map((tier) => ({
    tier,
    label: TIER_LABELS[tier],
    count: distribution[tier] ?? 0,
    pct: total > 0 ? Math.round(((distribution[tier] ?? 0) / total) * 100) : 0,
  }))

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="20%" margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value, _, entry) => [
              `${value ?? 0} users (${(entry as { payload: { pct: number } }).payload.pct}%)`,
              "",
            ]}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.tier}
                fill={TIER_COLORS[entry.tier]}
                opacity={myTier && myTier !== entry.tier ? 0.45 : 1}
                strokeWidth={myTier === entry.tier ? 2 : 0}
                stroke={myTier === entry.tier ? TIER_COLORS[entry.tier] : undefined}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
