"use client"

import { useEffect, useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { useCurrency } from "@/contexts/CurrencyContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getUserEntries } from "@/lib/firestore-entries"
import { formatCurrency } from "@/lib/currency-utils"
import { getCustomDateRange } from "@/lib/date-utils"
import { exportEntriesToCSV } from "@/lib/export-utils"
import { getAIDigest, saveAIDigest } from "@/lib/firestore-insights"
import { fetchAIDigest } from "@/lib/insights-api"
import { auth } from "@/lib/firebase"
import type { SpendingContext } from "@/lib/insights-engine"
import { Sparkles, Calendar, FileText, FileSpreadsheet, Info, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import dynamic from "next/dynamic"

// Lazy load charts
const SpendingChart = dynamic(() => import("@/components/dashboard/SpendingChart").then(mod => ({ default: mod.SpendingChart })), {
  loading: () => <div className="flex items-center justify-center h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
  ssr: false,
})
const CategoryChart = dynamic(() => import("@/components/dashboard/CategoryChart").then(mod => ({ default: mod.CategoryChart })), {
  loading: () => <div className="flex items-center justify-center h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
  ssr: false,
})
const YearOverYearChart = dynamic(() => import("@/components/dashboard/YearOverYearChart").then(mod => ({ default: mod.YearOverYearChart })), {
  loading: () => <div className="flex items-center justify-center h-[340px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
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
  const tCommon = useTranslations("common")
  const { locale } = useLanguage()
  const { user, loading } = useAuth()
  const { isPro } = useSubscription()
  const { userCurrency } = useCurrency()
  const [entries, setEntries] = useState<Entry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reportType, setReportType] = useState<"yearly" | "monthly" | "custom">("yearly")
  const [digestText, setDigestText] = useState<string | null>(null)
  const [digestLoading, setDigestLoading] = useState(false)

  // Load entries
  useEffect(() => {
    if (!loading && user) {
      loadEntries()
    }
  }, [user, loading])

  // Load cached AI digest
  useEffect(() => {
    if (!user) return
    const monthKey = new Date().toISOString().slice(0, 7)
    setDigestLoading(true)
    getAIDigest(user.uid, monthKey).then((text) => {
      setDigestText(text)
      setDigestLoading(false)
    })
  }, [user])

  const generateDigest = async () => {
    if (!user || digestLoading) return
    if (!isPro) {
      toast.error("Pro feature", { description: "AI Monthly Summary requires a Pro or Business subscription.", action: { label: "Upgrade", onClick: () => window.location.href = "/?landing#pricing" } })
      return
    }
    setDigestLoading(true)
    try {
      const now = new Date()
      const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`

      const filterByMonth = (key: string) =>
        entries.filter((e) => e.date.slice(0, 7) === key)

      const curEntries = filterByMonth(curMonth)
      const prevEntries = filterByMonth(prevMonth)

      const sumIncome = (arr: typeof entries) => arr.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0)
      const sumExpenses = (arr: typeof entries) => arr.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0)

      const curInc = sumIncome(curEntries)
      const curExp = sumExpenses(curEntries)
      const prevInc = sumIncome(prevEntries)
      const prevExp = sumExpenses(prevEntries)

      const categoryTotals: Record<string, number> = {}
      curEntries.filter(e => e.type === "expense").forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + e.amount
      })
      const topSpendingCategories = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, amount]) => ({
          name,
          amount,
          percentOfTotal: curExp > 0 ? Math.round((amount / curExp) * 100) : 0,
        }))

      const context: SpendingContext = {
        month: curMonth,
        currentMonth: {
          totalIncome: curInc,
          totalExpenses: curExp,
          savingsRate: curInc > 0 ? `${Math.round(((curInc - curExp) / curInc) * 100)}%` : "0%",
        },
        previousMonth: {
          totalIncome: prevInc,
          totalExpenses: prevExp,
          savingsRate: prevInc > 0 ? `${Math.round(((prevInc - prevExp) / prevInc) * 100)}%` : "0%",
        },
        topSpendingCategories,
        budgetSummary: "No budget data available on reports page",
        goalsSummary: "No goals data available on reports page",
        unusualSpending: [],
      }

      const token = await auth.currentUser?.getIdToken()
      const text = token ? await fetchAIDigest(context, token) : null
      if (text) {
        await saveAIDigest(user.uid, curMonth, text)
        setDigestText(text)
      }
    } finally {
      setDigestLoading(false)
    }
  }

  const loadEntries = async () => {
    if (!user) return

    try {
      setEntriesLoading(true)
      // Fetch more entries for reports (limit 1000)
      const { entries: firestoreEntries } = await getUserEntries(user.uid, null, 1000)

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
      console.error("Error loading entries:", error)
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
      setStartDate(start.toISOString().split("T")[0])
      setEndDate(now.toISOString().split("T")[0])
    } else if (reportType === "monthly") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      setStartDate(start.toISOString().split("T")[0])
      setEndDate(now.toISOString().split("T")[0])
    }
  }, [reportType])

  // Filter entries by date range
  const filteredEntries = useMemo(() => {
    if (!startDate || !endDate) return entries

    const range = getCustomDateRange(startDate, endDate)
    if (!range) return entries

    return entries.filter((entry) => {
      const entryDate = new Date(entry.date)
      return entryDate >= range.start && entryDate <= range.end
    })
  }, [entries, startDate, endDate])

  // Calculate report metrics
  const metrics = useMemo(() => {
    const income = filteredEntries
      .filter((e) => e.type === "income")
      .reduce((sum, e) => sum + e.amount, 0)

    const expenses = filteredEntries
      .filter((e) => e.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0)

    const balance = income - expenses
    const savingsRate = income > 0 ? (balance / income) * 100 : 0

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {}
    filteredEntries
      .filter((e) => e.type === "expense")
      .forEach((e) => {
        categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount
      })

    // Monthly breakdown
    const monthlyBreakdown: Record<string, { income: number; expenses: number }> = {}
    filteredEntries.forEach((e) => {
      const date = new Date(e.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      if (!monthlyBreakdown[monthKey]) {
        monthlyBreakdown[monthKey] = { income: 0, expenses: 0 }
      }
      if (e.type === "income") {
        monthlyBreakdown[monthKey].income += e.amount
      } else {
        monthlyBreakdown[monthKey].expenses += e.amount
      }
    })

    return {
      income,
      expenses,
      balance,
      savingsRate,
      categoryBreakdown,
      monthlyBreakdown,
      totalTransactions: filteredEntries.length,
    }
  }, [filteredEntries])

  const handleExportPDF = async () => {
    if (!isPro) {
      toast.error("Pro feature", { description: "PDF export requires a Pro or Business subscription.", action: { label: "Upgrade", onClick: () => window.location.href = "/?landing#pricing" } })
      return
    }
    try {
      if (!startDate || !endDate) {
        toast.error(t("selectDateRange"))
        return
      }

      const { exportReportToPDF } = await import("@/lib/pdf-export")
      await exportReportToPDF({
        entries: filteredEntries,
        metrics,
        startDate,
        endDate,
        reportType,
        userEmail: user?.email || undefined,
      })
    } catch (error) {
      console.error("Error exporting PDF:", error)
      toast.error(t("exportPDFFailed"))
    }
  }

  const handleExportCSV = () => {
    if (!isPro) {
      toast.error("Pro feature", { description: "CSV export requires a Pro or Business subscription.", action: { label: "Upgrade", onClick: () => window.location.href = "/?landing#pricing" } })
      return
    }
    try {
      if (!startDate || !endDate) {
        toast.error(t("selectDateRange"))
        return
      }

      const filename = `fintrack-report-${startDate}-to-${endDate}.csv`
      exportEntriesToCSV(filteredEntries, filename)
    } catch (error) {
      console.error("Error exporting CSV:", error)
      toast.error(t("exportCSVFailed"))
    }
  }

  if (loading || entriesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8 px-4 sm:px-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">{t("loadingReports")}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="container py-8 px-4 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("description")}</p>
        </div>

        {/* 1. AI Monthly Digest */}
        <Card className="mb-8">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  AI Monthly Summary — {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
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
                    Refresh
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
                    Generated by Gemini AI · Based on your transaction history
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 text-sm text-muted-foreground py-1">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p>No AI summary for this month yet.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={generateDigest}
                    disabled={digestLoading || entriesLoading}
                    className="flex-shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Generate
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

        {/* 2. Spending by Category */}
        <div className="mb-8">
          <CategoryChart entries={filteredEntries} userCurrency={userCurrency} />
        </div>

        {/* 3. Summary Metrics — combined card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("totalIncome")}</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(metrics.income, { currency: userCurrency })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("totalExpenses")}</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(metrics.expenses, { currency: userCurrency })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("netBalance")}</p>
                <p className={`text-xl font-bold ${metrics.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(metrics.balance, { currency: userCurrency })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("savingsRate")}</p>
                <p className="text-xl font-bold">
                  {metrics.savingsRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Spending Over Time */}
        <div className="mb-8">
          <SpendingChart entries={filteredEntries} />
        </div>

        {/* 4b. Year-over-Year Comparison */}
        <div className="mb-8">
          <YearOverYearChart entries={entries} userCurrency={userCurrency} />
        </div>

        {/* 5. Category Breakdown Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t("categoryBreakdown")}</CardTitle>
            <CardDescription>{t("categoryBreakdownDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(metrics.categoryBreakdown).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("noExpenseData")}</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(metrics.categoryBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => {
                    const percentage = (amount / metrics.expenses) * 100
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{category}</span>
                          <span className="font-semibold">
                            {formatCurrency(amount, { currency: userCurrency })} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 6. Export + Report Period (before Monthly Trends) */}
        <div className="flex gap-2 w-full mb-4">
          <Button variant="outline" onClick={handleExportPDF} className="flex-1">
            <FileText className="mr-2 h-4 w-4" />
            {t("exportPDF")}
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="flex-1">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t("exportCSV")}
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t("reportPeriod")}</CardTitle>
            <CardDescription>{t("reportPeriodDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="startDate">{t("startDate")}</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">{t("endDate")}</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const now = new Date()
                    const start = new Date(now.getFullYear(), 0, 1)
                    setReportType("yearly")
                    setStartDate(start.toISOString().split("T")[0])
                    setEndDate(now.toISOString().split("T")[0])
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {t("reset")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7. Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>{t("monthlyTrends")}</CardTitle>
            <CardDescription>{t("monthlyTrendsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(metrics.monthlyBreakdown).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("noDataPeriod")}</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(metrics.monthlyBreakdown)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([monthKey, data]) => {
                    const [year, month] = monthKey.split("-")
                    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(locale === "bg" ? "bg-BG" : "en-US", { month: "long", year: "numeric" })
                    const net = data.income - data.expenses
                    return (
                      <div key={monthKey} className="border-b pb-4 last:border-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">{monthName}</span>
                          <span className={`font-semibold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(net, { currency: userCurrency })}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">{tCommon("income")}: </span>
                            <span className="text-green-600 font-medium">
                              {formatCurrency(data.income, { currency: userCurrency })}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{tCommon("expense")}: </span>
                            <span className="text-red-600 font-medium">
                              {formatCurrency(data.expenses, { currency: userCurrency })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
