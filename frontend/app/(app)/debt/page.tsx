"use client"

import { useEffect, useState, useMemo, useId } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useCurrency } from "@/contexts/CurrencyContext"
import { formatCurrency } from "@/lib/currency-utils"
import { getUserDebts, saveUserDebts } from "@/lib/firestore-debt"
import type { DebtItem, DebtType } from "@/lib/firestore-types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Landmark, Plus, Trash2, TrendingDown, Trophy, CalendarCheck,
  Loader2, Snowflake, Flame, Pencil,
} from "lucide-react"
import dynamic from "next/dynamic"

const AreaChart = dynamic(
  () => import("recharts").then((r) => r.AreaChart),
  { ssr: false }
)
const Area = dynamic(() => import("recharts").then((r) => r.Area), { ssr: false })
const XAxis = dynamic(() => import("recharts").then((r) => r.XAxis), { ssr: false })
const YAxis = dynamic(() => import("recharts").then((r) => r.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import("recharts").then((r) => r.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import("recharts").then((r) => r.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(
  () => import("recharts").then((r) => r.ResponsiveContainer),
  { ssr: false }
)

type Strategy = "snowball" | "avalanche"

const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: "Credit Card",
  loan: "Personal Loan",
  mortgage: "Mortgage",
  student_loan: "Student Loan",
  other: "Other",
}

const DEBT_TYPE_COLORS: Record<DebtType, string> = {
  credit_card: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  loan: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  mortgage: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  student_loan: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

// ── Payoff calculator ───────────────────────────────────────────────────────

interface PayoffResult {
  months: number
  totalInterest: number
  timeline: { month: number; label: string; totalBalance: number }[]
}

function calculatePayoff(debts: DebtItem[], extraPayment: number, strategy: Strategy): PayoffResult {
  if (debts.length === 0 || debts.every((d) => d.balance <= 0)) {
    return { months: 0, totalInterest: 0, timeline: [] }
  }

  // Work on mutable copies
  let balances = debts.map((d) => ({ ...d, balance: d.balance }))
  const minPayments = debts.map((d) => d.minPayment)
  let totalInterest = 0
  let month = 0
  const MAX_MONTHS = 600 // 50 year cap
  const timeline: PayoffResult["timeline"] = []

  while (balances.some((d) => d.balance > 0.01) && month < MAX_MONTHS) {
    month++

    // Apply interest
    balances = balances.map((d) => {
      if (d.balance <= 0) return d
      const interest = (d.balance * (d.interestRate / 100)) / 12
      totalInterest += interest
      return { ...d, balance: d.balance + interest }
    })

    // Pay minimums
    let remaining = extraPayment
    balances = balances.map((d, i) => {
      if (d.balance <= 0) return d
      const pay = Math.min(d.balance, minPayments[i])
      return { ...d, balance: d.balance - pay }
    })

    // Find target for extra payment
    const active = balances.filter((d) => d.balance > 0)
    if (active.length > 0 && remaining > 0) {
      let target: DebtItem
      if (strategy === "snowball") {
        target = active.reduce((a, b) => (a.balance < b.balance ? a : b))
      } else {
        target = active.reduce((a, b) => (a.interestRate > b.interestRate ? a : b))
      }
      const idx = balances.findIndex((d) => d.id === target.id)
      const pay = Math.min(balances[idx].balance, remaining)
      balances[idx] = { ...balances[idx], balance: balances[idx].balance - pay }
    }

    if (month % 3 === 0 || month === 1) {
      const total = balances.reduce((s, d) => s + Math.max(0, d.balance), 0)
      const date = new Date()
      date.setMonth(date.getMonth() + month)
      timeline.push({
        month,
        label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        totalBalance: Math.round(total),
      })
    }
  }

  return { months: month, totalInterest: Math.round(totalInterest), timeline }
}

function debtFreeDate(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

// ── Form ────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "", balance: "", interestRate: "", minPayment: "", type: "credit_card" as DebtType,
}

function DebtForm({
  initial,
  currency,
  onSave,
  onCancel,
}: {
  initial?: Partial<typeof EMPTY_FORM>
  currency: string
  onSave: (values: Omit<DebtItem, "id">) => void
  onCancel: () => void
}) {
  const [v, setV] = useState({ ...EMPTY_FORM, ...initial })
  const id = useId()

  const valid =
    v.name.trim() &&
    parseFloat(v.balance) > 0 &&
    parseFloat(v.interestRate) >= 0 &&
    parseFloat(v.minPayment) > 0

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={`${id}-name`} className="text-xs">Debt name</Label>
        <Input id={`${id}-name`} placeholder="e.g. Visa Credit Card" value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-type`} className="text-xs">Type</Label>
        <Select value={v.type} onValueChange={(val) => setV({ ...v, type: val as DebtType })}>
          <SelectTrigger id={`${id}-type`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(DEBT_TYPE_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`${id}-balance`} className="text-xs">Current balance ({currency})</Label>
          <Input id={`${id}-balance`} type="number" min="0" step="0.01" placeholder="5000"
            value={v.balance} onChange={(e) => setV({ ...v, balance: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-rate`} className="text-xs">Interest rate (APR %)</Label>
          <Input id={`${id}-rate`} type="number" min="0" step="0.1" placeholder="19.9"
            value={v.interestRate} onChange={(e) => setV({ ...v, interestRate: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-min`} className="text-xs">Minimum monthly payment ({currency})</Label>
        <Input id={`${id}-min`} type="number" min="1" step="0.01" placeholder="150"
          value={v.minPayment} onChange={(e) => setV({ ...v, minPayment: e.target.value })} />
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" disabled={!valid}
          onClick={() => onSave({
            name: v.name.trim(),
            balance: parseFloat(v.balance),
            interestRate: parseFloat(v.interestRate),
            minPayment: parseFloat(v.minPayment),
            type: v.type,
            currency,
          })}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function DebtPage() {
  const { user } = useAuth()
  const { userCurrency } = useCurrency()
  const formatAmount = (amount: number) => formatCurrency(amount, { currency: userCurrency })
  const [debts, setDebts] = useState<DebtItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [strategy, setStrategy] = useState<Strategy>("avalanche")
  const [extraPayment, setExtraPayment] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<DebtItem | null>(null)

  useEffect(() => {
    if (!user) return
    getUserDebts(user.uid)
      .then(setDebts)
      .catch(() => toast.error("Failed to load debts."))
      .finally(() => setLoading(false))
  }, [user])

  const persist = async (next: DebtItem[]) => {
    if (!user) return
    setSaving(true)
    try {
      await saveUserDebts(user.uid, next)
      setDebts(next)
    } catch {
      toast.error("Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = (values: Omit<DebtItem, "id">) => {
    const next = [...debts, { ...values, id: crypto.randomUUID() }]
    persist(next)
    setAddOpen(false)
    toast.success("Debt added.")
  }

  const handleEdit = (values: Omit<DebtItem, "id">) => {
    if (!editItem) return
    const next = debts.map((d) => (d.id === editItem.id ? { ...values, id: d.id } : d))
    persist(next)
    setEditItem(null)
    toast.success("Debt updated.")
  }

  const handleDelete = (id: string) => {
    persist(debts.filter((d) => d.id !== id))
    toast.success("Debt removed.")
  }

  const totalDebt = useMemo(
    () => debts.reduce((s, d) => s + d.balance, 0),
    [debts]
  )
  const totalMinPayment = useMemo(
    () => debts.reduce((s, d) => s + d.minPayment, 0),
    [debts]
  )

  const result = useMemo(
    () => calculatePayoff(debts, extraPayment, strategy),
    [debts, extraPayment, strategy]
  )

  const avalancheResult = useMemo(
    () => calculatePayoff(debts, extraPayment, "avalanche"),
    [debts, extraPayment]
  )
  const snowballResult = useMemo(
    () => calculatePayoff(debts, extraPayment, "snowball"),
    [debts, extraPayment]
  )

  if (loading) return <DebtSkeleton />

  return (
    <div className="container max-w-3xl py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" />
          Debt Payoff Planner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Snowball or avalanche — find the fastest path to debt freedom.
        </p>
      </div>

      {/* Debt list */}
      <div className="space-y-2">
        {debts.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{d.name}</span>
                  <Badge variant="outline" className={cn("text-xs", DEBT_TYPE_COLORS[d.type])}>
                    {DEBT_TYPE_LABELS[d.type]}
                  </Badge>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="text-base font-bold text-foreground">{formatAmount(d.balance)}</span>
                  <span>{d.interestRate}% APR</span>
                  <span>Min {formatAmount(d.minPayment)}/mo</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditItem(d)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(d.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add a debt
        </Button>
      </div>

      {debts.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total debt</p>
                <p className="text-xl font-bold text-destructive">{formatAmount(totalDebt)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Min. payments</p>
                <p className="text-xl font-bold">{formatAmount(totalMinPayment)}/mo</p>
              </CardContent>
            </Card>
            {result.months > 0 && (
              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Interest to pay</p>
                  <p className="text-xl font-bold text-emerald-600">{formatAmount(result.totalInterest)}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Strategy + extra payment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Payoff strategy</CardTitle>
              <CardDescription className="text-xs">
                Choose a strategy and optionally add extra monthly payment above minimums.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setStrategy("avalanche")}
                  className={cn(
                    "flex-1 flex items-center gap-2 rounded-lg border p-3 text-left transition-colors",
                    strategy === "avalanche"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                >
                  <Flame className={cn("h-4 w-4 shrink-0", strategy === "avalanche" ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <p className="text-sm font-medium">Avalanche</p>
                    <p className="text-xs text-muted-foreground">Highest interest first — saves the most money</p>
                  </div>
                </button>
                <button
                  onClick={() => setStrategy("snowball")}
                  className={cn(
                    "flex-1 flex items-center gap-2 rounded-lg border p-3 text-left transition-colors",
                    strategy === "snowball"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                >
                  <Snowflake className={cn("h-4 w-4 shrink-0", strategy === "snowball" ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <p className="text-sm font-medium">Snowball</p>
                    <p className="text-xs text-muted-foreground">Lowest balance first — builds momentum</p>
                  </div>
                </button>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Extra monthly payment ({userCurrency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  placeholder="0"
                  value={extraPayment || ""}
                  onChange={(e) => setExtraPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="max-w-[180px]"
                />
                <p className="text-xs text-muted-foreground">Added on top of minimum payments each month.</p>
              </div>
            </CardContent>
          </Card>

          {/* Payoff headline */}
          {result.months > 0 && (
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-5 flex items-start gap-4">
                <Trophy className="h-8 w-8 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-lg font-bold">
                    Debt-free by{" "}
                    <span className="text-emerald-600">{debtFreeDate(result.months)}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {result.months} months · {formatAmount(result.totalInterest)} total interest
                  </p>
                  {avalancheResult.months !== snowballResult.months && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {strategy === "avalanche"
                        ? `Avalanche saves ${formatAmount(snowballResult.totalInterest - avalancheResult.totalInterest)} vs snowball`
                        : `Snowball is ${avalancheResult.months - snowballResult.months} month${avalancheResult.months - snowballResult.months !== 1 ? "s" : ""} faster than avalanche`}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline chart */}
          {result.timeline.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-emerald-500" />
                  Balance over time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.timeline} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                        width={36}
                      />
                      <Tooltip
                        formatter={(v) => [formatAmount(Number(v ?? 0)), "Balance"]}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="totalBalance"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fill="url(#debtGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Strategy comparison */}
          {avalancheResult.months > 0 && snowballResult.months > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Strategy comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className={cn("rounded-lg border p-3", strategy === "avalanche" && "border-primary bg-primary/5")}>
                    <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                    <p className="text-xs font-medium">Avalanche</p>
                    <p className="text-sm font-bold mt-1">{debtFreeDate(avalancheResult.months)}</p>
                    <p className="text-xs text-muted-foreground">{formatAmount(avalancheResult.totalInterest)} interest</p>
                  </div>
                  <div className={cn("rounded-lg border p-3", strategy === "snowball" && "border-primary bg-primary/5")}>
                    <Snowflake className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <p className="text-xs font-medium">Snowball</p>
                    <p className="text-sm font-bold mt-1">{debtFreeDate(snowballResult.months)}</p>
                    <p className="text-xs text-muted-foreground">{formatAmount(snowballResult.totalInterest)} interest</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {debts.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            <Landmark className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">No debts added yet</p>
            <p className="text-xs max-w-xs mx-auto">
              Add your credit cards, loans, and any other debts to see your payoff timeline and how much interest you'll save.
            </p>
          </CardContent>
        </Card>
      )}

      {saving && (
        <div className="fixed bottom-20 right-4 flex items-center gap-1.5 bg-background border rounded-full px-3 py-1.5 shadow-sm text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a debt</DialogTitle></DialogHeader>
          <DebtForm currency={userCurrency} onSave={handleAdd} onCancel={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit debt</DialogTitle></DialogHeader>
          {editItem && (
            <DebtForm
              currency={userCurrency}
              initial={{
                name: editItem.name,
                balance: String(editItem.balance),
                interestRate: String(editItem.interestRate),
                minPayment: String(editItem.minPayment),
                type: editItem.type,
              }}
              onSave={handleEdit}
              onCancel={() => setEditItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DebtSkeleton() {
  return (
    <div className="container max-w-3xl py-8 px-4 space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  )
}
