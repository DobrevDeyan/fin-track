"use client"

/**
 * Dashboard Provider
 *
 * Combines all dashboard feature contexts into a single provider
 * for easy usage in the dashboard page
 */

import { ReactNode } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { FinancialSummaryProvider } from "./FinancialSummaryContext"
import { SavingsProvider } from "./SavingsContext"
import { BudgetsProvider } from "./BudgetsContext"
import { GoalsProvider } from "./GoalsContext"
import { RecurringProvider } from "./RecurringContext"
import { InsightsProvider } from "./InsightsContext"

interface DashboardProviderProps {
  children: ReactNode
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const { user } = useAuth()
  const userId = user?.uid

  return (
    <FinancialSummaryProvider userId={userId}>
      <SavingsProvider userId={userId}>
        <BudgetsProvider userId={userId}>
          <GoalsProvider userId={userId}>
            <RecurringProvider userId={userId}>
              <InsightsProvider>
                {children}
              </InsightsProvider>
            </RecurringProvider>
          </GoalsProvider>
        </BudgetsProvider>
      </SavingsProvider>
    </FinancialSummaryProvider>
  )
}
