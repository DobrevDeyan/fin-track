"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useCurrency } from "@/contexts/CurrencyContext"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { CalendarView } from "@/components/dashboard/CalendarView"
import { AddTransactionDialog } from "@/components/dashboard/AddTransactionDialog"
import { Toast } from "@/components/ui/toast"

import {
  DashboardProvider,
  useRecurringContext,
} from "@/contexts/dashboard"

import { useEntries, type ToastState } from "@/lib/hooks/dashboard"

/**
 * Inner content that uses the dashboard contexts
 */
function CalendarInnerContent() {
  const { user } = useAuth()
  const { userCurrency } = useCurrency()
  const { recurringTransactions, loadRecurringTransactions } = useRecurringContext()

  const [toast, setToast] = useState<ToastState | null>(null)
  const showToast = useCallback((t: ToastState) => setToast(t), [])
  const clearToast = useCallback(() => setToast(null), [])

  const hasLoadedRef = useRef(false)

  // Pre-filled date for add dialog
  const [prefilledDate, setPrefilledDate] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const entriesHook = useEntries({
    userId: user?.uid,
    userCurrency,
    onToast: showToast,
  })

  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      entriesHook.loadEntries()
      loadRecurringTransactions()
    }
  }, [user, entriesHook.loadEntries, loadRecurringTransactions])

  const handleAddTransaction = useCallback((dateStr: string) => {
    setPrefilledDate(dateStr)
    setDialogOpen(true)
  }, [])

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setPrefilledDate("")
    }
  }, [])

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <div className="container py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground mt-2">
              View your transactions and upcoming bills
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" asChild className="flex-1 md:flex-initial">
              <a href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </a>
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {entriesHook.loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading calendar...</p>
            </div>
          </div>
        ) : (
          <CalendarView
            entries={entriesHook.entries}
            recurringTransactions={recurringTransactions}
            userCurrency={userCurrency}
            onAddTransaction={handleAddTransaction}
          />
        )}

        {/* Add Transaction Dialog */}
        <AddTransactionDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          onSubmit={async (data) => {
            await entriesHook.handleAdd(data)
            setDialogOpen(false)
          }}
          editingEntry={null}
          savingsAccounts={[]}
          defaultDate={prefilledDate}
        />

        {/* Toast */}
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={clearToast} />
        )}
      </div>
    </div>
  )
}

/**
 * Calendar page with auth guard
 */
function CalendarContent() {
  const { user, loading: authLoading } = useAuth()

  const [toast, setToast] = useState<ToastState | null>(null)
  const showToast = useCallback((t: ToastState) => setToast(t), [])
  const clearToast = useCallback(() => setToast(null), [])

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!authLoading && !user) {
      window.location.href = "/auth/login"
    }
  }, [user, authLoading])

  if (!mounted || authLoading) {
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

  return (
    <DashboardProvider userId={user.uid} onToast={showToast}>
      <CalendarInnerContent />
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}
    </DashboardProvider>
  )
}

export default function CalendarPage() {
  return <CalendarContent />
}
