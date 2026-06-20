"use client"

import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useMoney } from "@/contexts/CurrencyContext"
import { getUserRecurringTransactions, updateRecurringTransaction } from "@/lib/firestore-recurring"
import type { RecurringEntryDocument } from "@/lib/firestore-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  CreditCard, TrendingDown, Calendar, PauseCircle, PlayCircle,
  AlertTriangle, ArrowUpDown, Repeat,
} from "lucide-react"
import { cn } from "@/lib/utils"

type RecurringTx = RecurringEntryDocument & { id: string }
type SortKey = "cost" | "name" | "nextDate"

function toMonthly(amount: number, frequency: RecurringTx["frequency"]): number {
  if (frequency === "weekly") return amount * 4.33
  if (frequency === "yearly") return amount / 12
  return amount
}

function toAnnual(amount: number, frequency: RecurringTx["frequency"]): number {
  if (frequency === "weekly") return amount * 52
  if (frequency === "yearly") return amount
  return amount * 12
}

function daysUntil(ts: RecurringTx["nextDate"]): number {
  const now = new Date()
  const next = ts.toDate()
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 86_400_000))
}

const CATEGORY_COLORS: Record<string, string> = {
  "Entertainment": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "Bills & Utilities": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Shopping": "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "Food & Dining": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Transportation": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "Other": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS["Other"]
}

export default function SubscriptionsPage() {
  const { user } = useAuth()
  const { format: fmt } = useMoney()
  const [items, setItems] = useState<RecurringTx[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>("cost")
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getUserRecurringTransactions(user.uid)
      .then(setItems)
      .catch(() => toast.error("Failed to load subscriptions."))
      .finally(() => setLoading(false))
  }, [user])

  const subscriptions = useMemo(
    () => items.filter((t) => t.type === "expense"),
    [items]
  )

  const sorted = useMemo(() => {
    return [...subscriptions].sort((a, b) => {
      if (sortKey === "cost") return toMonthly(b.amount, b.frequency) - toMonthly(a.amount, a.frequency)
      if (sortKey === "name") return a.name.localeCompare(b.name)
      if (sortKey === "nextDate") return daysUntil(a.nextDate) - daysUntil(b.nextDate)
      return 0
    })
  }, [subscriptions, sortKey])

  const active = useMemo(() => sorted.filter((s) => s.isActive), [sorted])
  const totalMonthly = useMemo(
    () => active.reduce((sum, s) => sum + toMonthly(s.amount, s.frequency), 0),
    [active]
  )
  const totalAnnual = useMemo(() => totalMonthly * 12, [totalMonthly])

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    active.forEach((s) => {
      map[s.category] = (map[s.category] ?? 0) + toMonthly(s.amount, s.frequency)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [active])

  const handleToggle = async (item: RecurringTx) => {
    setToggling(item.id)
    try {
      await updateRecurringTransaction(item.id, { isActive: !item.isActive })
      setItems((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, isActive: !t.isActive } : t))
      )
      toast.success(item.isActive ? "Subscription paused." : "Subscription resumed.")
    } catch {
      toast.error("Failed to update subscription.")
    } finally {
      setToggling(null)
    }
  }

  if (loading) return <SubscriptionsSkeleton />

  return (
    <div className="container max-w-3xl py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Repeat className="h-6 w-6 text-primary" />
          Subscription Tracker
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          All your recurring expenses in one place. Pause anything you don't need.
        </p>
      </div>

      {/* Summary banner */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Monthly cost</p>
            <p className="text-2xl font-bold text-primary">{fmt(totalMonthly)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{active.length} active</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Annual cost</p>
            <p className="text-2xl font-bold text-destructive">{fmt(totalAnnual)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">per year</p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">By category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byCategory.map(([cat, amount]) => {
              const pct = totalMonthly > 0 ? (amount / totalMonthly) * 100 : 0
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={cn("px-1.5 py-0.5 rounded-full text-xs font-medium", categoryColor(cat))}>{cat}</span>
                    <span className="text-muted-foreground">{fmt(amount)}/mo</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Sort:</span>
        {(["cost", "name", "nextDate"] as SortKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setSortKey(k)}
            className={cn(
              "text-xs px-2 py-1 rounded-md transition-colors",
              sortKey === k
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {k === "cost" ? "Cost" : k === "name" ? "Name" : "Next charge"}
          </button>
        ))}
      </div>

      {/* Subscription list */}
      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-30" />
            No recurring expenses found. Add them from the dashboard.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => {
            const monthly = toMonthly(item.amount, item.frequency)
            const annual = toAnnual(item.amount, item.frequency)
            const days = daysUntil(item.nextDate)
            const isExpensive = monthly > totalMonthly * 0.3 && active.length > 1

            return (
              <Card
                key={item.id}
                className={cn(
                  "transition-opacity",
                  !item.isActive && "opacity-50"
                )}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{item.name}</span>
                      <Badge variant="outline" className={cn("text-xs shrink-0", categoryColor(item.category))}>
                        {item.category}
                      </Badge>
                      {!item.isActive && (
                        <Badge variant="secondary" className="text-xs shrink-0">Paused</Badge>
                      )}
                      {isExpensive && item.isActive && (
                        <span title="This is over 30% of your total subscription spend">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-base font-bold">
                        {fmt(item.amount)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">/{item.frequency === "weekly" ? "wk" : item.frequency === "monthly" ? "mo" : "yr"}</span>
                      </span>
                      {item.frequency !== "monthly" && (
                        <span className="text-xs text-muted-foreground">≈ {fmt(monthly)}/mo</span>
                      )}
                      <span className="text-xs text-muted-foreground">{fmt(annual)}/yr</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {item.isActive
                        ? days === 0
                          ? "Charges today"
                          : days === 1
                          ? "Charges tomorrow"
                          : `Next charge in ${days} days`
                        : "Paused"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "shrink-0 h-8 w-8 p-0",
                      item.isActive
                        ? "text-muted-foreground hover:text-destructive"
                        : "text-muted-foreground hover:text-emerald-600"
                    )}
                    disabled={toggling === item.id}
                    onClick={() => handleToggle(item)}
                    title={item.isActive ? "Pause" : "Resume"}
                  >
                    {item.isActive
                      ? <PauseCircle className="h-5 w-5" />
                      : <PlayCircle className="h-5 w-5" />}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Savings tip */}
      {totalMonthly > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4 flex items-start gap-3">
            <TrendingDown className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Pausing just one subscription could save you{" "}
              <span className="font-semibold text-foreground">
                {fmt(sorted.find((s) => s.isActive)
                  ? toAnnual(sorted.filter((s) => s.isActive)[0].amount, sorted.filter((s) => s.isActive)[0].frequency)
                  : 0)}
              </span>{" "}
              a year. Review anything you haven't used in the past 30 days.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SubscriptionsSkeleton() {
  return (
    <div className="container max-w-3xl py-8 px-4 space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  )
}
