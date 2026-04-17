"use client"

import { useMemo } from "react"
import { formatCurrency } from "@/lib/currency-utils"
import type { HouseholdEntry } from "@/lib/firestore-household"

const MEMBER_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#3b82f6"]

interface Props {
  entries: HouseholdEntry[]
  userCurrency: string
}

export function HouseholdMemberBreakdown({ entries, userCurrency }: Props) {
  const fmt = (n: number) => formatCurrency(n, { currency: userCurrency })

  const members = useMemo(() => {
    const map = new Map<string, { name: string; expenses: number; income: number }>()
    for (const e of entries) {
      const m = map.get(e.memberDisplayName) ?? { name: e.memberDisplayName, expenses: 0, income: 0 }
      if (e.type === "expense") m.expenses += e.amount
      else m.income += e.amount
      map.set(e.memberDisplayName, m)
    }
    return Array.from(map.values()).sort((a, b) => b.expenses - a.expenses)
  }, [entries])

  const totalExpenses = members.reduce((s, m) => s + m.expenses, 0)

  if (members.length < 2) return null

  return (
    <div className="px-4 py-3 border-b space-y-3">
      {/* Stacked proportional bar */}
      {totalExpenses > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Spending by member</span>
            <span className="text-xs font-medium tabular-nums">{fmt(totalExpenses)} total</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden gap-[2px]">
            {members
              .filter((m) => m.expenses > 0)
              .map((m, i) => (
                <div
                  key={m.name}
                  title={`${m.name}: ${fmt(m.expenses)}`}
                  style={{
                    flex: m.expenses / totalExpenses,
                    backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length],
                  }}
                />
              ))}
          </div>
        </div>
      )}

      {/* Per-member legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {members.map((m, i) => {
          const color = MEMBER_COLORS[i % MEMBER_COLORS.length]
          const pct = totalExpenses > 0 ? Math.round((m.expenses / totalExpenses) * 100) : 0
          return (
            <div key={m.name} className="flex items-center gap-1.5 min-w-0">
              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs font-medium truncate max-w-[100px]">{m.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {fmt(m.expenses)}
                {totalExpenses > 0 && (
                  <span className="opacity-60 ml-1">{pct}%</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
