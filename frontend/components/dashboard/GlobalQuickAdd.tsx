"use client"

/**
 * Global host for the quick-add expense sheet.
 *
 * Mounted once in the (app) layout so the BottomNav "+" button works on EVERY
 * page — previously only the dashboard listened for "pocket:openQuickAdd", so
 * the button silently did nothing anywhere else.
 *
 * After a successful add it broadcasts "pocket:entriesChanged" so any mounted
 * page holding its own entries list (e.g. the dashboard table) can refresh.
 */

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useCurrency } from "@/contexts/CurrencyContext"
import { useSavingsContext } from "@/contexts/dashboard/SavingsContext"
import { useFinancialSummary } from "@/contexts/dashboard/FinancialSummaryContext"
import { useEntries } from "@/lib/hooks/dashboard"
import { QuickExpenseSheet } from "@/components/dashboard/QuickExpenseSheet"

export function GlobalQuickAdd() {
  const { user } = useAuth()
  const { userCurrency } = useCurrency()
  const { savingsAccounts, loadSavingsAccounts, ensureSavingsLoaded } = useSavingsContext()
  const { refreshSummary } = useFinancialSummary()
  const [open, setOpen] = useState(false)

  const entriesHook = useEntries({
    userId: user?.uid,
    userCurrency,
    onSavingsReload: loadSavingsAccounts,
    onSummaryRefresh: refreshSummary,
  })

  useEffect(() => {
    const openSheet = () => {
      // Savings accounts feed the sheet's savings-transfer options and may not
      // be loaded yet on non-dashboard pages
      ensureSavingsLoaded()
      setOpen(true)
    }

    const handleEvent = () => openSheet()

    // Desktop shortcut: plain "N" opens the sheet, unless the user is typing
    // or another dialog/sheet is already open
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "n" && e.key !== "N") return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      e.preventDefault()
      openSheet()
    }

    window.addEventListener("pocket:openQuickAdd", handleEvent)
    window.addEventListener("keydown", handleKey)
    return () => {
      window.removeEventListener("pocket:openQuickAdd", handleEvent)
      window.removeEventListener("keydown", handleKey)
    }
  }, [ensureSavingsLoaded])

  const activeSavingsAccounts = useMemo(
    () =>
      savingsAccounts
        .filter((acc) => acc.isActive)
        .map((acc) => ({
          id: acc.id,
          name: acc.name,
          balance: acc.balance,
          currency: acc.currency,
        })),
    [savingsAccounts]
  )

  const handleSubmit = async (data: Parameters<typeof entriesHook.handleAdd>[0]) => {
    await entriesHook.handleAdd(data)
    window.dispatchEvent(new CustomEvent("pocket:entriesChanged"))
  }

  return (
    <QuickExpenseSheet
      open={open}
      onOpenChange={setOpen}
      onSubmit={handleSubmit}
      savingsAccounts={activeSavingsAccounts}
    />
  )
}
