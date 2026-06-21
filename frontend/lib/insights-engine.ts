/**
 * Insights Engine
 *
 * Pure algorithmic functions for financial intelligence features:
 * - Financial Health Score (0-100)
 * - Spending Anomaly Detection (Z-score based)
 * - Cash Flow Forecast (90-day projection)
 * - AI Context Builder (spending summary for Gemini)
 *
 * All functions are pure (no side effects, no API calls) and run client-side.
 */

import type { FinancialSummaryDocument, MonthlyData } from "./firestore-types"
import type { Budget } from "@/contexts/dashboard/BudgetsContext"
import type { Goal } from "@/contexts/dashboard/GoalsContext"
import type { RecurringTransaction } from "@/contexts/dashboard/RecurringContext"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HealthScoreBreakdown {
  savingsRate: number        // 0–30
  budgetAdherence: number    // 0–25
  goalProgress: number       // 0–20
  incomeStability: number    // 0–15
  spendingRegularity: number // 0–10
}

export interface HealthScore {
  score: number
  breakdown: HealthScoreBreakdown
  tier: "critical" | "needs-work" | "good" | "excellent" | "outstanding"
}

export interface Anomaly {
  category: string
  current: number
  average: number
  zScore: number
  changePercent: number
}

export interface ForecastPoint {
  date: string    // YYYY-MM-DD
  balance: number
  lower: number
  upper: number
}

export interface SpendingContext {
  month: string
  currentMonth: { totalIncome: number; totalExpenses: number; savingsRate: string }
  previousMonth: { totalIncome: number; totalExpenses: number; savingsRate: string }
  topSpendingCategories: Array<{ name: string; amount: number; percentOfTotal: number }>
  budgetSummary: string
  goalsSummary: Array<{ name: string; progress: string }> | string
  unusualSpending: Array<{ category: string; changePercent: string; current: number; average: number }>
}

// ─── Statistical Helpers ─────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function getCurrentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getSortedMonthKeys(months: Record<string, MonthlyData>): string[] {
  return Object.keys(months).sort()
}

function getLastNMonthKeys(
  months: Record<string, MonthlyData>,
  n: number,
  beforeKey: string
): string[] {
  return getSortedMonthKeys(months)
    .filter((k) => k < beforeKey)
    .slice(-n)
}

// ─── Feature 1: Financial Health Score ───────────────────────────────────────

export function calculateHealthScore(
  summary: FinancialSummaryDocument | null,
  budgets: Budget[],
  goals: Goal[]
): HealthScore {
  const empty: HealthScore = {
    score: 0,
    breakdown: {
      savingsRate: 0,
      budgetAdherence: 0,
      goalProgress: 0,
      incomeStability: 0,
      spendingRegularity: 0,
    },
    tier: "critical",
  }

  if (!summary || !summary.months || Object.keys(summary.months).length === 0) {
    return empty
  }

  const months = summary.months
  const currentKey = getCurrentMonthKey()
  const recent3 = getLastNMonthKeys(months, 3, currentKey)
  const past6 = getLastNMonthKeys(months, 6, currentKey)

  // 1. Savings Rate (max 30pts)
  // Target: 20% savings rate. Score scales linearly; capped at 30.
  let savingsRateScore = 0
  if (recent3.length > 0) {
    const rates = recent3.map((k) => {
      const m = months[k]
      return m.income > 0 ? (m.income - m.expenses) / m.income : 0
    })
    const avgRate = mean(rates)
    savingsRateScore = clamp((avgRate / 0.2) * 30, 0, 30)
  } else {
    // Fall back to current month if no history
    const cur = months[currentKey]
    if (cur && cur.income > 0) {
      const rate = (cur.income - cur.expenses) / cur.income
      savingsRateScore = clamp((rate / 0.2) * 30, 0, 30)
    }
  }

  // 2. Budget Adherence (max 25pts)
  let budgetScore = 12.5 // Neutral when no budgets
  const activeBudgets = budgets.filter((b) => b.isActive)
  if (activeBudgets.length > 0) {
    const curData = months[currentKey]
    const catExpenses = curData?.expensesByCategory || {}

    const withinLimit = activeBudgets.filter((b) => {
      const spent = catExpenses[b.category] || 0
      // Normalise yearly/weekly budgets to monthly equivalent
      const monthlyEquiv =
        b.period === "yearly"
          ? b.amount / 12
          : b.period === "weekly"
          ? b.amount * 4.33
          : b.amount
      return spent <= monthlyEquiv
    }).length

    budgetScore = (withinLimit / activeBudgets.length) * 25
  }

  // 3. Goal Progress (max 20pts)
  let goalScore = 10 // Neutral when no goals
  const activeGoals = goals.filter((g) => g.isActive)
  if (activeGoals.length > 0) {
    const avgProgress = mean(
      activeGoals.map((g) =>
        g.targetAmount > 0 ? clamp(g.currentAmount / g.targetAmount, 0, 1) : 0
      )
    )
    goalScore = avgProgress * 20
  }

  // 4. Income Stability (max 15pts)
  // Measured as coefficient of variation (lower = more stable).
  // Neutral (half marks) until there are >=3 months of history — an account
  // with too little data hasn't earned full stability marks. Keep this in sync
  // with computeHealthScore in functions/src/index.ts (leaderboard scorer).
  let incomeScore = 7.5
  if (past6.length >= 3) {
    const incomes = past6.map((k) => months[k].income)
    const incMean = mean(incomes)
    const incCV = incMean > 0 ? stdDev(incomes) / incMean : 0
    incomeScore = 15 * (1 - clamp(incCV, 0, 1))
  }

  // 5. Spending Regularity (max 10pts) — neutral until >=3 months of history.
  let spendingScore = 5
  if (past6.length >= 3) {
    const expenses = past6.map((k) => months[k].expenses)
    const expMean = mean(expenses)
    const expCV = expMean > 0 ? stdDev(expenses) / expMean : 0
    // Use gentler penalty (× 0.5) since variable spending is more tolerable
    spendingScore = 10 * (1 - clamp(expCV * 0.5, 0, 1))
  }

  const raw =
    savingsRateScore + budgetScore + goalScore + incomeScore + spendingScore
  const score = clamp(Math.round(isNaN(raw) ? 0 : raw), 0, 100)

  const tier =
    score < 40
      ? "critical"
      : score < 55
      ? "needs-work"
      : score < 70
      ? "good"
      : score < 85
      ? "excellent"
      : "outstanding"

  const safeRound = (v: number) => Math.round(isNaN(v) ? 0 : v)
  return {
    score,
    breakdown: {
      savingsRate: safeRound(savingsRateScore),
      budgetAdherence: safeRound(budgetScore),
      goalProgress: safeRound(goalScore),
      incomeStability: safeRound(incomeScore),
      spendingRegularity: safeRound(spendingScore),
    },
    tier,
  }
}

// ─── Feature 2: Anomaly Detection ────────────────────────────────────────────

export function detectAnomalies(
  summary: FinancialSummaryDocument | null
): Anomaly[] {
  if (!summary || !summary.months) return []

  const months = summary.months
  const currentKey = getCurrentMonthKey()
  const currentData = months[currentKey]
  if (!currentData) return []

  const pastKeys = getLastNMonthKeys(months, 6, currentKey)
  if (pastKeys.length < 2) return []

  const currentExpenses = currentData.expensesByCategory || {}
  const anomalies: Anomaly[] = []

  for (const [category, current] of Object.entries(currentExpenses)) {
    if (current === 0) continue

    const pastAmounts = pastKeys.map(
      (k) => months[k]?.expensesByCategory?.[category] ?? 0
    )
    const avg = mean(pastAmounts)

    if (avg === 0) {
      // New category this month with meaningful spend
      if (current > 10 && pastKeys.length >= 3) {
        anomalies.push({
          category,
          current,
          average: 0,
          zScore: 3,
          changePercent: 100,
        })
      }
      continue
    }

    const sd = stdDev(pastAmounts)
    const z = sd > 0 ? (current - avg) / sd : 0
    const changePct = ((current - avg) / avg) * 100

    // Flag if statistically unusual or > 50% above average (with ≥ 3 months history)
    if (z > 1.8 || (changePct > 50 && pastKeys.length >= 3)) {
      anomalies.push({
        category,
        current,
        average: avg,
        zScore: z,
        changePercent: changePct,
      })
    }
  }

  return anomalies.sort((a, b) => b.zScore - a.zScore).slice(0, 3)
}

// ─── Feature 3: Cash Flow Forecast ───────────────────────────────────────────

function toDate(timestamp: unknown): Date {
  if (
    timestamp &&
    typeof timestamp === "object" &&
    "toDate" in timestamp &&
    typeof (timestamp as { toDate: () => Date }).toDate === "function"
  ) {
    return (timestamp as { toDate: () => Date }).toDate()
  }
  if (timestamp instanceof Date) return timestamp
  return new Date(timestamp as string | number)
}

export function generateCashFlowForecast(
  recurringTransactions: RecurringTransaction[],
  summary: FinancialSummaryDocument | null,
  startingBalance: number
): ForecastPoint[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const DAYS = 90

  // Require at least 1 active recurring transaction AND 2+ months of history
  const activeCheck = recurringTransactions.filter((r) => r.isActive)
  const currentKeyCheck = getCurrentMonthKey()
  const pastKeysCheck = summary?.months
    ? getLastNMonthKeys(summary.months, 3, currentKeyCheck)
    : []
  if (activeCheck.length === 0 || pastKeysCheck.length < 2) return []

  // Recurring expenses are applied below as discrete dated events, so they must
  // NOT also be baked into the "average daily spend" baseline or they'd be
  // double-counted (see review RP1). Subtract the monthly-equivalent recurring
  // expense from each historical month to leave only discretionary spend.
  const monthlyRecurringExpense = activeCheck
    .filter((r) => r.type === "expense")
    .reduce(
      (s, r) =>
        s +
        (r.frequency === "weekly"
          ? r.amount * 4.33
          : r.frequency === "yearly"
          ? r.amount / 12
          : r.amount),
      0
    )

  // Average daily DISCRETIONARY spend from last 3 months
  let avgDailySpend = 0
  let sdDailySpend = 0

  if (summary?.months) {
    const currentKey = getCurrentMonthKey()
    const pastKeys = getLastNMonthKeys(summary.months, 3, currentKey)
    if (pastKeys.length > 0) {
      const daysInMonth = (key: string) => {
        const [y, m] = key.split("-").map(Number)
        return new Date(y, m, 0).getDate()
      }
      const dailyDiscretionary = pastKeys.map((k) =>
        Math.max(0, summary.months[k].expenses - monthlyRecurringExpense) / daysInMonth(k)
      )
      avgDailySpend = mean(dailyDiscretionary)
      sdDailySpend = stdDev(dailyDiscretionary)
    }
  }

  // Build daily recurring cash-flow events
  const cashFlows = new Map<string, number>()
  const active = recurringTransactions.filter((r) => r.isActive)

  for (const r of active) {
    let next = toDate(r.nextDate)
    const sign = r.type === "income" ? 1 : -1
    const maxDate = new Date(today.getTime() + (DAYS + 1) * 86_400_000)

    for (let iter = 0; iter < 120; iter++) {
      if (next > maxDate) break
      if (next >= today) {
        const dk = next.toISOString().split("T")[0]
        cashFlows.set(dk, (cashFlows.get(dk) ?? 0) + sign * r.amount)
      }

      // Advance to next occurrence
      const advanced = new Date(next)
      if (r.frequency === "weekly") advanced.setDate(advanced.getDate() + 7)
      else if (r.frequency === "monthly") advanced.setMonth(advanced.getMonth() + 1)
      else {
        advanced.setFullYear(advanced.getFullYear() + 1)
        break // only one yearly event in 90 days
      }
      next = advanced
    }
  }

  // Generate points every 3 days
  let running = startingBalance
  const points: ForecastPoint[] = []

  for (let i = 0; i <= DAYS; i += 3) {
    // Apply 3-day discrete cash flows
    for (let j = 0; j < 3; j++) {
      const d = new Date(today.getTime() + (i + j) * 86_400_000)
      const dk = d.toISOString().split("T")[0]
      if (cashFlows.has(dk)) running += cashFlows.get(dk)!
    }
    // Subtract average discretionary spend for 3 days
    running -= avgDailySpend * 3

    const uncertainty = sdDailySpend * Math.sqrt(i + 1) * 1.2
    const dateKey = new Date(today.getTime() + i * 86_400_000)
      .toISOString()
      .split("T")[0]

    points.push({
      date: dateKey,
      balance: Math.round(running * 100) / 100,
      lower: Math.round((running - uncertainty) * 100) / 100,
      upper: Math.round((running + uncertainty) * 100) / 100,
    })
  }

  return points
}

// ─── AI Context Builder ───────────────────────────────────────────────────────

export function buildSpendingContext(
  summary: FinancialSummaryDocument | null,
  budgets: Budget[],
  goals: Goal[],
  anomalies: Anomaly[]
): SpendingContext | null {
  if (!summary?.months) return null

  const currentKey = getCurrentMonthKey()
  const prevDate = new Date()
  prevDate.setMonth(prevDate.getMonth() - 1)
  const previousKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`

  const cur = summary.months[currentKey] ?? { income: 0, expenses: 0, expensesByCategory: {} }
  const prev = summary.months[previousKey] ?? { income: 0, expenses: 0, expensesByCategory: {} }

  const savingsRateCur =
    cur.income > 0
      ? `${Math.round(((cur.income - cur.expenses) / cur.income) * 100)}%`
      : "0%"
  const savingsRatePrev =
    prev.income > 0
      ? `${Math.round(((prev.income - prev.expenses) / prev.income) * 100)}%`
      : "0%"

  const topCategories = Object.entries(cur.expensesByCategory ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, amount]) => ({
      name,
      amount: Math.round(amount),
      percentOfTotal:
        cur.expenses > 0 ? Math.round((amount / cur.expenses) * 100) : 0,
    }))

  const activeBudgets = budgets.filter((b) => b.isActive)
  const budgetsExceeded = activeBudgets.filter(
    (b) => (cur.expensesByCategory?.[b.category] ?? 0) > b.amount
  ).length
  const budgetSummary =
    activeBudgets.length > 0
      ? `${activeBudgets.length - budgetsExceeded} of ${activeBudgets.length} budgets within limit`
      : "No active budgets"

  const activeGoals = goals.filter((g) => g.isActive)
  const goalsSummary =
    activeGoals.length > 0
      ? activeGoals.map((g) => ({
          name: g.name,
          progress:
            g.targetAmount > 0
              ? `${Math.round((g.currentAmount / g.targetAmount) * 100)}%`
              : "0%",
        }))
      : "No active goals"

  const now = new Date()
  const monthName = now.toLocaleString("en-US", { month: "long" })

  return {
    month: `${monthName} ${now.getFullYear()}`,
    currentMonth: {
      totalIncome: Math.round(cur.income),
      totalExpenses: Math.round(cur.expenses),
      savingsRate: savingsRateCur,
    },
    previousMonth: {
      totalIncome: Math.round(prev.income),
      totalExpenses: Math.round(prev.expenses),
      savingsRate: savingsRatePrev,
    },
    topSpendingCategories: topCategories,
    budgetSummary,
    goalsSummary,
    unusualSpending: anomalies.map((a) => ({
      category: a.category,
      changePercent: `+${Math.round(a.changePercent)}%`,
      current: Math.round(a.current),
      average: Math.round(a.average),
    })),
  }
}
