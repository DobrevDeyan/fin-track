"use client"

/**
 * Dashboard Provider
 *
 * Combines all dashboard feature contexts into a single provider
 * for easy usage in the dashboard page
 */

import { ReactNode } from "react"
import { FinancialSummaryProvider } from "./FinancialSummaryContext"
import { SavingsProvider } from "./SavingsContext"
import { BudgetsProvider } from "./BudgetsContext"
import { GoalsProvider } from "./GoalsContext"
import { RecurringProvider } from "./RecurringContext"
import { InsightsProvider } from "./InsightsContext"

interface DashboardProviderProps {
  children: ReactNode
  userId: string | undefined
}

/**
 * DashboardProvider wraps all feature-specific contexts
 *
 * This eliminates the need to manually nest providers and ensures
 * all dashboard features have access to their respective contexts.
 *
 * @example
 * <DashboardProvider userId={user?.uid}>
 *   <DashboardContent />
 * </DashboardProvider>
 */
export function DashboardProvider({ children, userId }: DashboardProviderProps) {
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
