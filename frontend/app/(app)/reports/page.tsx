"use client"

import { useEffect, useState, useMemo } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { useMoney } from "@/contexts/CurrencyContext"
import { useFinancialSummary } from "@/contexts/dashboard/FinancialSummaryContext"
import { useBudgetsContext } from "@/contexts/dashboard/BudgetsContext"
import { useGoalsContext } from "@/contexts/dashboard/GoalsContext"
import { useInsightsContext } from "@/contexts/dashboard/InsightsContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getUserEntriesByDateRange } from "@/lib/firestore-entries"
import { formatDateForInput } from "@/lib/date-utils"
import { formatSavingsRate } from "@/lib/metrics-utils"
import { exportEntriesToCSV } from "@/lib/export-utils"
import { getAIDigest, saveAIDigest } from "@/lib/firestore-insights"
import { fetchAIDigest } from "@/lib/insights-api"
import { buildSpendingContext, computeDigestFingerprint, getCurrentMonthKey } from "@/lib/insights-engine"
import { auth } from "@/lib/firebase"
import { Sparkles, Calendar, FileText, FileSpreadsheet, Info, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import dynamic from "next/dynamic"
import { logger } from "@/lib/utils/logger"


// Lazy load charts
const ChartSkeleton = ({ height = 400 }: { height?: number }) => (
  <div className="rounded-xl border bg-card p-6 space-y-4" style={{ height }}>
    <Skeleton className="h-5 w-36" />
    <div className="flex items-end gap-2 h-[calc(100%-52px)]">
      {[55, 80, 45, 90, 65, 75, 50, 85, 60, 70, 40, 95].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
)

const SpendingChart = dynamic(() => import("@/components/dashboard/SpendingChart").then(mod => ({ default: mod.SpendingChart })), {
  loading: () => <ChartSkeleton height={400} />,
  ssr: false,
})
const CategoryChart = dynamic(() => import("@/components/dashboard/CategoryChart").then(mod => ({ default: mod.CategoryChart })), {
  loading: () => <ChartSkeleton height={400} />,
  ssr: false,
})
const YearOverYearChart = dynamic(() => import("@/components/dashboard/YearOverYearChart").then(mod => ({ default: mod.YearOverYearChart })), {
  loading: () => <ChartSkeleton height={340} />,
  ssr: false,
})

interface Entry {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: "income" | "expense"
  notes?: string
}

export default function ReportsPage() {
  const t = useTranslations("reports")
  const locale = useLocale()
  const { user, loading } = useAuth()
  const { isPro } = useSubscription()
  const { format, currency: userCurrency, fromBase, ratesReady } = useMoney()
  const { summary } = useFinancialSummary()
  const { budgets } = useBudgetsContext()
  const { goals } = useGoalsContext()
  const { anomalies } = useInsightsContext()
  const [entries, setEntries] = useState<Entry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reportType, setReportType] = useState<"yearly" | "monthly" | "custom">("yearly")
  const [digestText, setDigestText] = useState<string | null>(null)
  const [digestLoading, setDigestLoading] = useState(false)

  // Debounce date range — prevents a Firestore fetch on every keystroke
  // when the user types manually into the date inputs
  const [debouncedDates, setDebouncedDates] = useState({ start: "", end: "" })
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDates({ start: startDate, end: endDate })
    }, 400)
    return () => clearTimeout(timer)
  }, [startDate, endDate])

  // Load filtered entries whenever debounced dates change
  useEffect(() => {
    if (!loading && user && debouncedDates.start && debouncedDates.end) {
      loadEntries(debouncedDates.start, debouncedDates.end)
    }
  }, [user, loading, debouncedDates])

  // Load cached AI digest for the current month (display only — never generates)
  useEffect(() => {
    if (!user) return
    // Use the same local month key the dashboard writes with, so the read can't miss
    // a freshly-generated digest at a month boundary. (I9-2)
    const monthKey = getCurrentMonthKey()
    setDigestLoading(true)
    getAIDigest(user.uid, monthKey).then((text) => {
      setDigestText(text)
      setDigestLoading(false)
    })
  }, [user])

  const generateDigest = async () => {
    if (!user || digestLoading) return
    if (!isPro) {
      toast.error(t("proFeature"), {
        description: t("proFeatureAiDesc"),
        action: { label: t("upgrade"), onClick: () => (window.location.href = "/?landing#pricing") },
      })
      return
    }
    setDigestLoading(true)
    try {
      // Build the digest context from the server-maintained financial summary
      // (full history) rather than the range-limited reports entries — otherwise
      // a narrowed date range yields an empty 0/0 digest that gets cached. (RA-7)
      // Amounts are converted to the display currency + labelled so the AI doesn't
      // narrate raw EUR figures. (I9-1)
      const context = buildSpendingContext(summary, budgets, goals, anomalies, {
        convert: fromBase,
        currency: ratesReady ? userCurrency : "EUR",
      })
      if (!context) return

      const curMonth = getCurrentMonthKey()
      const fingerprint = computeDigestFingerprint(context)
      const token = await auth.currentUser?.getIdToken()
      const result = token ? await fetchAIDigest(context, token) : null
      if (result?.ok) {
        await saveAIDigest(user.uid, curMonth, result.data, fingerprint)
        setDigestText(result.data)
      } else if (result?.reason === "subscription_required") {
        toast.error(t("proFeature"), {
          description: t("proFeatureAiDesc"),
          action: { label: t("upgrade"), onClick: () => (window.location.href = "/?landing#pricing") },
        })
      }
    } finally {
      setDigestLoading(false)
    }
  }

  const loadEntries = async (start: string, end: string) => {
    if (!user) return
    try {
      setEntriesLoading(true)
      const firestoreEntries = await getUserEntriesByDateRange(user.uid, start, end)

      const convertedEntries: Entry[] = firestoreEntries.map((entry) => ({
        id: entry.id,
        description: entry.description,
        amount: entry.amount,
        category: entry.category,
        date: entry.date instanceof Date
          ? entry.date.toISOString()
          : entry.date.toDate().toISOString(),
        type: entry.type,
        notes: entry.notes,
      }))

      setEntries(convertedEntries)
    } catch (error) {
      logger.error("Error loading report entries", error)
      setEntries([])
    } finally {
      setEntriesLoading(false)
    }
  }

  // Set default date range based on report type
  useEffect(() => {
    const now = new Date()
    if (reportType === "yearly") {
      const start = new Date(now.getFullYear(), 0, 1)
      setStartDate(formatDateForInput(start))
      setEndDate(formatDateForInput(now))
    } else if (reportType === "monthly") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      setStartDate(formatDateForInput(start))
      setEndDate(formatDateForInput(now))
    }
  }, [reportType])

  // Calculate report metrics
  const metrics = useMemo(() => {
    const income = entries
      .filter((e) => e.type === "income")
      .reduce((sum, e) => sum + e.amount, 0)

    const expenses = entries
      .filter((e) => e.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0)

    const balance = income - expenses
    const savingsRate = income > 0 ? (balance / income) * 100 : 0

    const categoryBreakdown = entries
      .filter((e) => e.type === "expense")
      .reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + e.amount
        return acc
      }, {})

    const monthlyBreakdown = entries.reduce<Record<string, { income: number; expenses: number }>>((acc, e) => {
      const month = e.date.slice(0, 7) // "YYYY-MM"
      if (!acc[month]) acc[month] = { income: 0, expenses: 0 }
      if (e.type === "income") acc[month].income += e.amount
      else acc[month].expenses += e.amount
      return acc
    }, {})

    return {
      income,
      expenses,
      balance,
      savingsRate,
      totalTransactions: entries.length,
      categoryBreakdown,
      monthlyBreakdown,
    }
  }, [entries])

  const handleExportPDF = async () => {
    if (!isPro) {
      toast.error(t("proFeature"), {
        description: t("proFeaturePdfDesc"),
        action: { label: t("upgrade"), onClick: () => (window.location.href = "/?landing#pricing") },
      })
      return
    }
    try {
      if (!startDate || !endDate) {
        toast.error(t("selectDateRange"))
        return
      }

      const { exportReportToPDF } = await import("@/lib/pdf-export")
      await exportReportToPDF({
        entries: entries,
        metrics,
        startDate,
        endDate,
        reportType,
        userEmail: user?.email || undefined,
        currency: userCurrency,
        convertFromBase: fromBase,
        locale,
      })
    } catch (error) {
      logger.error("Error exporting PDF report", error)
      toast.error(t("exportPDFFailed"))
    }
  }

  const handleExportCSV = () => {
    if (!isPro) {
      toast.error(t("proFeature"), {
        description: t("proFeatureCsvDesc"),
        action: { label: t("upgrade"), onClick: () => (window.location.href = "/?landing#pricing") },
      })
      return
    }
    try {
      if (!startDate || !endDate) {
        toast.error(t("selectDateRange"))
        return
      }

      const filename = `fintrack-report-${startDate}-to-${endDate}.csv`
      exportEntriesToCSV(entries, filename, {
        convertFromBase: fromBase,
        currency: userCurrency,
        locale,
      })
    } catch (error) {
      logger.error("Error exporting CSV report", error)
      toast.error(t("exportCSVFailed"))
    }
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="container py-8 px-4 sm:px-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("description")}</p>
        </div>

        {/* 1. Controls — date filter + presets + export */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="pt-5 pb-5">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-4">
              <div className="col-span-2 md:col-span-1 space-y-2">
                <Label>{t("reportType")}</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as "yearly" | "monthly" | "custom")}
                >
                  <option value="yearly">{t("thisYear")}</option>
                  <option value="monthly">{t("thisMonth")}</option>
                  <option value="custom">{t("customRange")}</option>
                </select>
              </div>
              <div className="col-span-2 md:col-span-1 space-y-2 min-w-0">
                <Label htmlFor="startDate">{t("startDate")}</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="min-w-0 [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
              <div className="col-span-2 md:col-span-1 space-y-2 min-w-0">
                <Label htmlFor="endDate">{t("endDate")}</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="min-w-0 [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
              <div className="col-span-2 md:col-span-1 flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const now = new Date()
                    const start = new Date(now.getFullYear(), 0, 1)
                    setReportType("yearly")
                    setStartDate(formatDateForInput(start))
                    setEndDate(formatDateForInput(now))
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {t("reset")}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: t("thisMonth"),
                    action: () => {
                      const now = new Date()
                      setReportType("monthly")
                      setStartDate(formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 1)))
                      setEndDate(formatDateForInput(now))
                    },
                  },
                  {
                    label: t("last3Months"),
                    action: () => {
                      const now = new Date()
                      setReportType("custom")
                      setStartDate(formatDateForInput(new Date(now.getFullYear(), now.getMonth() - 2, 1)))
                      setEndDate(formatDateForInput(now))
                    },
                  },
                  {
                    label: t("thisYear"),
                    action: () => {
                      const now = new Date()
                      setReportType("yearly")
                      setStartDate(formatDateForInput(new Date(now.getFullYear(), 0, 1)))
                      setEndDate(formatDateForInput(now))
                    },
                  },
                ].map(({ label, action }) => (
                  <Button key={label} variant="outline" size="sm" onClick={action}>
                    {label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  {t("exportPDF")}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  {t("exportCSV")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Summary Metrics */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {entriesLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[0,1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("totalIncome")}</p>
                  <p className="text-xl font-bold text-green-600">
                    {format(metrics.income)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("totalExpenses")}</p>
                  <p className="text-xl font-bold text-red-600">
                    {format(metrics.expenses)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("netBalance")}</p>
                  <p className={`text-xl font-bold ${metrics.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {format(metrics.balance)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("savingsRate")}</p>
                  <p className="text-xl font-bold">
                    {formatSavingsRate(metrics.income, metrics.expenses)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. AI Monthly Digest */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                {t("aiMonthlySummary")} — {new Date().toLocaleString(locale, { month: "long", year: "numeric" })}
              </CardTitle>
              {digestText && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={generateDigest}
                  disabled={digestLoading}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${digestLoading ? "animate-spin" : ""}`} />
                  {t("refresh")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {digestLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : digestText ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed">{digestText}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {t("aiGeneratedBy")}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 text-sm text-muted-foreground py-1">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>{t("noAiSummary")}</p>
                </div>
                <Button
                  size="sm"
                  onClick={generateDigest}
                  disabled={digestLoading || entriesLoading}
                  className="flex-shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {t("generate")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Spending Over Time */}
        <div className="mb-6">
          <SpendingChart entries={entries} startDate={startDate} endDate={endDate} />
        </div>

        {/* 5. Spending by Category */}
        <div className="mb-6">
          <CategoryChart entries={entries} />
        </div>

        {/* 6. Year-over-Year Comparison */}
        <div className="mb-2">
          <YearOverYearChart months={summary?.months} />
        </div>

      </div>
    </div>
  )
}
