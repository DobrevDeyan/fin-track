"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { MetricsCards } from "@/components/dashboard/MetricsCards"
import { SpendingChart } from "@/components/dashboard/SpendingChart"
import { CategoryChart } from "@/components/dashboard/CategoryChart"
import { TransactionsTable } from "@/components/dashboard/TransactionsTable"
import { AddTransactionDialog } from "@/components/dashboard/AddTransactionDialog"
import { QuickExpenseFAB } from "@/components/dashboard/QuickExpenseFAB"
import { Navbar } from "@/components/Navbar"

interface Entry {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: "income" | "expense"
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [entries, setEntries] = useState<Entry[]>([
    {
      id: "1",
      description: "Grocery Shopping",
      amount: 125.50,
      category: "Food & Dining",
      date: new Date().toISOString(),
      type: "expense",
    },
    {
      id: "2",
      description: "Salary",
      amount: 3500.00,
      category: "Salary",
      date: new Date(Date.now() - 86400000).toISOString(),
      type: "income",
    },
    {
      id: "3",
      description: "Uber Ride",
      amount: 25.00,
      category: "Transportation",
      date: new Date(Date.now() - 172800000).toISOString(),
      type: "expense",
    },
    {
      id: "4",
      description: "Netflix Subscription",
      amount: 15.99,
      category: "Entertainment",
      date: new Date(Date.now() - 259200000).toISOString(),
      type: "expense",
    },
    {
      id: "5",
      description: "Electric Bill",
      amount: 85.00,
      category: "Bills & Utilities",
      date: new Date(Date.now() - 345600000).toISOString(),
      type: "expense",
    },
  ])
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Failed to logout:", error)
    }
  }

  const handleAddEntry = (data: {
    description: string
    amount: number
    category: string
    type: "income" | "expense"
    date: string
  }) => {
    const newEntry: Entry = {
      id: Date.now().toString(),
      ...data,
    }
    setEntries([newEntry, ...entries])
  }

  const handleEditEntry = (id: string) => {
    // TODO: Implement edit functionality
    console.log("Edit entry:", id)
  }

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id))
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Calculate metrics
  const totalIncome = entries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0)
  const totalExpenses = entries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0)
  const totalBalance = totalIncome - totalExpenses
  const savings = totalBalance

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {user.email?.split("@")[0]}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="mb-8">
          <MetricsCards
            totalBalance={totalBalance}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            savings={savings}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <SpendingChart />
          <CategoryChart />
        </div>

        {/* Transactions Table */}
        <TransactionsTable
          transactions={entries}
          onAdd={() => setDialogOpen(true)}
          onEdit={handleEditEntry}
          onDelete={handleDeleteEntry}
        />

        {/* Add Transaction Dialog */}
        <AddTransactionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleAddEntry}
        />

        {/* Quick Expense FAB */}
        <QuickExpenseFAB onSubmit={handleAddEntry} />
      </div>
    </div>
  )
}
