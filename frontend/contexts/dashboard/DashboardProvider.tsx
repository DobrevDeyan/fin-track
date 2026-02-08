"use client"

/**
 * Dashboard Provider
 *
 * Combines all dashboard feature contexts into a single provider
 * for easy usage in the dashboard page
 */

import { ReactNode } from "react"
import { SavingsProvider } from "./SavingsContext"
import { BudgetsProvider } from "./BudgetsContext"
import { GoalsProvider } from "./GoalsContext"
import { RecurringProvider } from "./RecurringContext"

interface ToastState {
  message: string
  type: "success" | "error"
}

interface DashboardProviderProps {
  children: ReactNode
  userId: string | undefined
  onToast: (toast: ToastState) => void
}

/**
 * DashboardProvider wraps all feature-specific contexts
 *
 * This eliminates the need to manually nest providers and ensures
 * all dashboard features have access to their respective contexts.
 *
 * @example
 * <DashboardProvider userId={user?.uid} onToast={showToast}>
 *   <DashboardContent />
 * </DashboardProvider>
 */
export function DashboardProvider({ children, userId, onToast }: DashboardProviderProps) {
  return (
    <SavingsProvider userId={userId} onToast={onToast}>
      <BudgetsProvider userId={userId} onToast={onToast}>
        <GoalsProvider userId={userId} onToast={onToast}>
          <RecurringProvider userId={userId} onToast={onToast}>
            {children}
          </RecurringProvider>
        </GoalsProvider>
      </BudgetsProvider>
    </SavingsProvider>
  )
}
