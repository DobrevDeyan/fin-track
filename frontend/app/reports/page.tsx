"use client"

import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/Navbar"
import { getUserEntries } from "@/lib/firestore-entries"
import { formatCurrency } from "@/lib/currency-utils"
import { getDateRange, getCustomDateRange } from "@/lib/date-utils"
import { exportReportToPDF } from "@/lib/pdf-export"
import { Download, Calendar } from "lucide-react"
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
  const { user, loading } = useAuth()
  const [entries, setEntries] = useState<Entry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reportType, setReportType] = useState<"yearly" | "monthly" | "custom">("yearly")

  // Load entries
  useEffect(() => {
    if (!loading && user) {
      loadEntries()
    }
  }, [user, loading])

  const loadEntries = async () => {
    if (!user) return

    try {
      setEntriesLoading(true)
      const firestoreEntries = await getUserEntries(user.uid)
      
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
    try {
      if (!startDate || !endDate) {
        alert("Please select a date range before exporting.")
        return
      }

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
      alert("Failed to export PDF. Please try again.")
    }
  }

  if (loading || entriesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8 px-4 sm:px-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading reports...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <div className="container py-8 px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Analyze your spending patterns and financial trends
            </p>
          </div>
          <Button onClick={handleExportPDF} variant="outline" className="w-full md:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {/* Date Range Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Report Period</CardTitle>
            <CardDescription>Select the time period for your report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as "yearly" | "monthly" | "custom")}
                >
                  <option value="yearly">This Year</option>
                  <option value="monthly">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
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
                    setStartDate(start.toISOString().split("T")[0])
                    setEndDate(now.toISOString().split("T")[0])
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.income, { currency: "EUR" })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(metrics.expenses, { currency: "EUR" })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(metrics.balance, { currency: "EUR" })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.savingsRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <SpendingChart entries={filteredEntries} />
          <CategoryChart entries={filteredEntries} />
        </div>

        {/* Category Breakdown Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Spending by category for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(metrics.categoryBreakdown).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No expense data for this period</p>
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
                            {formatCurrency(amount, { currency: "EUR" })} ({percentage.toFixed(1)}%)
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

        {/* Monthly Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Income vs expenses by month</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(metrics.monthlyBreakdown).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No data for this period</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(metrics.monthlyBreakdown)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([monthKey, data]) => {
                    const [year, month] = monthKey.split("-")
                    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                    const net = data.income - data.expenses
                    return (
                      <div key={monthKey} className="border-b pb-4 last:border-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">{monthName}</span>
                          <span className={`font-semibold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(net, { currency: "EUR" })}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Income: </span>
                            <span className="text-green-600 font-medium">
                              {formatCurrency(data.income, { currency: "EUR" })}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Expenses: </span>
                            <span className="text-red-600 font-medium">
                              {formatCurrency(data.expenses, { currency: "EUR" })}
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

