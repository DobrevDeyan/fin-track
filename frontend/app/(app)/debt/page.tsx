"use client"

import { useEffect, useState, useMemo, useId } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useMoney } from "@/contexts/CurrencyContext"
import { useTranslations, useLocale } from "next-intl"
import { getUserDebts, saveUserDebts } from "@/lib/firestore-debt"
import { createEntry } from "@/lib/firestore-entries"
import type { DebtItem, DebtType } from "@/lib/firestore-types"
import { BASE_CURRENCY } from "@/lib/constants/currency.constants"
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
  Loader2, Snowflake, Flame, Pencil, AlertTriangle, CreditCard,
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

const DEBT_TYPES: DebtType[] = ["credit_card", "loan", "mortgage", "student_loan", "other"]

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
  neverPaysOff: boolean
  timeline: { month: number; label: string; totalBalance: number }[]
}

function calculatePayoff(debts: DebtItem[], extraPayment: number, strategy: Strategy): PayoffResult {
  if (debts.length === 0 || debts.every((d) => d.balance <= 0)) {
    return { months: 0, totalInterest: 0, neverPaysOff: false, timeline: [] }
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

  // If the loop hit the cap with balances still outstanding, these inputs never
  // amortise (interest outpaces payments) — surface that instead of a bogus date.
  const neverPaysOff = balances.some((d) => d.balance > 0.01)
  return { months: month, totalInterest: Math.round(totalInterest), neverPaysOff, timeline }
}

function debtFreeDate(months: number, locale: string): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" })
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
  const t = useTranslations("debt")
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
        <Label htmlFor={`${id}-name`} className="text-xs">{t("debtName")}</Label>
        <Input id={`${id}-name`} placeholder={t("debtNamePlaceholder")} value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-type`} className="text-xs">{t("type")}</Label>
        <Select value={v.type} onValueChange={(val) => setV({ ...v, type: val as DebtType })}>
          <SelectTrigger id={`${id}-type`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEBT_TYPES.map((k) => (
              <SelectItem key={k} value={k}>{t(`types.${k}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`${id}-balance`} className="text-xs">{t("currentBalance", { currency })}</Label>
          <Input id={`${id}-balance`} type="number" min="0" step="0.01" placeholder="5000"
            value={v.balance} onChange={(e) => setV({ ...v, balance: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-rate`} className="text-xs">{t("interestRate")}</Label>
          <Input id={`${id}-rate`} type="number" min="0" step="0.1" placeholder="19.9"
            value={v.interestRate} onChange={(e) => setV({ ...v, interestRate: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-min`} className="text-xs">{t("minPayment", { currency })}</Label>
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
          {t("save")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>{t("cancel")}</Button>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function DebtPage() {
  const { user } = useAuth()
  const { format: formatAmount, toBase, fromBase, currency: userCurrency } = useMoney()
  const t = useTranslations("debt")
  const locale = useLocale()
  const [debts, setDebts] = useState<DebtItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [strategy, setStrategy] = useState<Strategy>("avalanche")
  const [extraPayment, setExtraPayment] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<DebtItem | null>(null)
  const [paymentDebt, setPaymentDebt] = useState<DebtItem | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentSaving, setPaymentSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    getUserDebts(user.uid)
      .then(setDebts)
      .catch(() => toast.error(t("failedToLoad")))
      .finally(() => setLoading(false))
  }, [user, t])

  const persist = async (next: DebtItem[]) => {
    if (!user) return
    setSaving(true)
    try {
      await saveUserDebts(user.uid, next)
      setDebts(next)
    } catch {
      toast.error(t("failedToSave"))
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = (values: Omit<DebtItem, "id">) => {
    const next = [...debts, { ...values, id: crypto.randomUUID(), balance: toBase(values.balance), minPayment: toBase(values.minPayment) }]
    persist(next)
    setAddOpen(false)
    toast.success(t("debtAdded"))
  }

  const handleEdit = (values: Omit<DebtItem, "id">) => {
    if (!editItem) return
    const next = debts.map((d) => (d.id === editItem.id ? { ...values, id: d.id, balance: toBase(values.balance), minPayment: toBase(values.minPayment) } : d))
    persist(next)
    setEditItem(null)
    toast.success(t("debtUpdated"))
  }

  const handleDelete = (id: string) => {
    persist(debts.filter((d) => d.id !== id))
    toast.success(t("debtRemoved"))
  }

  const handlePayment = async () => {
    if (!user || !paymentDebt || paymentSaving) return
    const display = parseFloat(paymentAmount)
    if (!display || display <= 0) return
    setPaymentSaving(true)
    try {
      const baseAmount = toBase(display)
      await createEntry(user.uid, {
        type: "expense",
        amount: baseAmount,
        currency: BASE_CURRENCY,
        description: t("paymentDesc", { name: paymentDebt.name }),
        category: t("paymentCategory"),
        date: new Date().toISOString(),
      })
      const newBalance = Math.max(0, paymentDebt.balance - baseAmount)
      const next = debts.map((d) => d.id === paymentDebt.id ? { ...d, balance: newBalance } : d)
      await persist(next)
      toast.success(t("paymentSuccess"))
      setPaymentDebt(null)
      setPaymentAmount("")
    } catch {
      toast.error(t("failedToSave"))
    } finally {
      setPaymentSaving(false)
    }
  }

  const totalDebt = useMemo(
    () => debts.reduce((s, d) => s + d.balance, 0),
    [debts]
  )
  const totalMinPayment = useMemo(
    () => debts.reduce((s, d) => s + d.minPayment, 0),
    [debts]
  )

  // Debts whose minimum payment doesn't even cover one month of interest — these
  // are why a payoff plan may never converge (see review D1).
  const underwaterDebts = useMemo(
    () => debts.filter((d) => d.balance > 0 && (d.balance * d.interestRate) / 1200 >= d.minPayment),
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
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("subtitle")}
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
                    {t(`types.${d.type}`)}
                  </Badge>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="text-base font-bold text-foreground">{formatAmount(d.balance)}</span>
                  <span>{d.interestRate}{t("aprLabel")}</span>
                  <span>{t("minPerMonth", { amount: formatAmount(d.minPayment) })}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700"
                  title={t("recordPayment")}
                  onClick={() => { setPaymentDebt(d); setPaymentAmount("") }}>
                  <CreditCard className="h-3.5 w-3.5" />
                </Button>
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
          <Plus className="h-4 w-4 mr-1.5" /> {t("addDebt")}
        </Button>
      </div>

      {debts.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{t("totalDebt")}</p>
                <p className="text-xl font-bold text-destructive">{formatAmount(totalDebt)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{t("minPayments")}</p>
                <p className="text-xl font-bold">{formatAmount(totalMinPayment)}{t("perMonth")}</p>
              </CardContent>
            </Card>
            {result.months > 0 && (
              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{t("interestToPay")}</p>
                  <p className="text-xl font-bold text-emerald-600">{formatAmount(result.totalInterest)}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Strategy + extra payment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("payoffStrategy")}</CardTitle>
              <CardDescription className="text-xs">
                {t("payoffStrategyDesc")}
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
                    <p className="text-sm font-medium">{t("avalanche")}</p>
                    <p className="text-xs text-muted-foreground">{t("avalancheDesc")}</p>
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
                    <p className="text-sm font-medium">{t("snowball")}</p>
                    <p className="text-xs text-muted-foreground">{t("snowballDesc")}</p>
                  </div>
                </button>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("extraPayment", { currency: userCurrency })}</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  placeholder="0"
                  value={extraPayment || ""}
                  onChange={(e) => setExtraPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="max-w-[180px]"
                />
                <p className="text-xs text-muted-foreground">{t("extraPaymentHint")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payoff headline */}
          {result.neverPaysOff ? (
            <Card className="bg-red-500/5 border-red-500/30">
              <CardContent className="p-5 flex items-start gap-4">
                <AlertTriangle className="h-8 w-8 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-lg font-bold text-red-600">{t("neverPaysOffTitle")}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {underwaterDebts.length > 0
                      ? t("neverPaysOffBody", { names: underwaterDebts.map((d) => d.name).join(", ") })
                      : t("neverPaysOffBodyGeneric")}
                    {" "}{t("neverPaysOffHint")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : result.months > 0 ? (
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-5 flex items-start gap-4">
                <Trophy className="h-8 w-8 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-lg font-bold">
                    {t("debtFreeBy", { date: debtFreeDate(result.months, locale) })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("monthsCount", { count: result.months })} · {t("totalInterest", { amount: formatAmount(result.totalInterest) })}
                  </p>
                  {avalancheResult.months !== snowballResult.months && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {strategy === "avalanche"
                        ? t("avalancheSaves", { amount: formatAmount(snowballResult.totalInterest - avalancheResult.totalInterest) })
                        : t("snowballFaster", {
                            count: avalancheResult.months - snowballResult.months,
                            monthWord: avalancheResult.months - snowballResult.months === 1 ? "month" : "months",
                          })}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Timeline chart */}
          {!result.neverPaysOff && result.timeline.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-emerald-500" />
                  {t("balanceOverTime")}
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
                        formatter={(v) => [formatAmount(Number(v ?? 0)), t("balance")]}
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
          {!result.neverPaysOff && avalancheResult.months > 0 && snowballResult.months > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("strategyComparison")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className={cn("rounded-lg border p-3", strategy === "avalanche" && "border-primary bg-primary/5")}>
                    <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                    <p className="text-xs font-medium">{t("avalanche")}</p>
                    <p className="text-sm font-bold mt-1">{debtFreeDate(avalancheResult.months, locale)}</p>
                    <p className="text-xs text-muted-foreground">{t("interestAmount", { amount: formatAmount(avalancheResult.totalInterest) })}</p>
                  </div>
                  <div className={cn("rounded-lg border p-3", strategy === "snowball" && "border-primary bg-primary/5")}>
                    <Snowflake className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <p className="text-xs font-medium">{t("snowball")}</p>
                    <p className="text-sm font-bold mt-1">{debtFreeDate(snowballResult.months, locale)}</p>
                    <p className="text-xs text-muted-foreground">{t("interestAmount", { amount: formatAmount(snowballResult.totalInterest) })}</p>
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
            <p className="font-medium mb-1">{t("noDebtsTitle")}</p>
            <p className="text-xs max-w-xs mx-auto">
              {t("noDebtsBody")}
            </p>
          </CardContent>
        </Card>
      )}

      {saving && (
        <div className="fixed bottom-20 right-4 flex items-center gap-1.5 bg-background border rounded-full px-3 py-1.5 shadow-sm text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> {t("savingIndicator")}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("addDebtDialogTitle")}</DialogTitle></DialogHeader>
          <DebtForm currency={userCurrency} onSave={handleAdd} onCancel={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={!!paymentDebt} onOpenChange={(o) => !o && setPaymentDebt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("paymentDialogTitle")}</DialogTitle>
            <p className="text-sm text-muted-foreground">{t("paymentDialogDesc")}</p>
          </DialogHeader>
          {paymentDebt && (
            <div className="space-y-4 pt-1">
              <div className="space-y-1">
                <Label className="text-xs">{t("paymentAmountLabel", { currency: userCurrency })}</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  autoFocus
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={fromBase(paymentDebt.minPayment).toFixed(2)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("balance")}: {formatAmount(paymentDebt.balance)} · {t("minPerMonth", { amount: formatAmount(paymentDebt.minPayment) })}
                </p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPaymentDebt(null)}>{t("cancel")}</Button>
                <Button
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || paymentSaving}
                  onClick={handlePayment}
                >
                  {paymentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("recordPayment")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("editDebtDialogTitle")}</DialogTitle></DialogHeader>
          {editItem && (
            <DebtForm
              currency={userCurrency}
              initial={{
                name: editItem.name,
                balance: String(fromBase(editItem.balance)),
                interestRate: String(editItem.interestRate),
                minPayment: String(fromBase(editItem.minPayment)),
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
