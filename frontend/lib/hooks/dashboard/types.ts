/**
 * Dashboard Types
 *
 * Shared type definitions for dashboard hooks and components
 */

import { Timestamp } from "firebase/firestore"
import type {
  RecurringEntryDocument,
  GoalDocument,
  SavingsAccountDocument
} from "@/lib/firestore-types"

// Entry types
export interface Entry {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: "income" | "expense"
  currency?: string
  notes?: string
  tags?: string[]
  receiptUrl?: string
}

export interface EntryFormData {
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  date: string
  notes?: string
  tags?: string[]
  receiptUrl?: string
  categoryId?: string
}

// Budget types
export interface Budget {
  id: string
  name: string
  category?: string
  amount: number
  currency: string
  period: "weekly" | "monthly" | "yearly"
  startDate: string
  endDate: string
  isActive: boolean
  alertThreshold?: number
}

export interface BudgetFormData {
  name: string
  category?: string
  amount: number
  currency: string
  period: "weekly" | "monthly" | "yearly"
  startDate: string
  endDate: string
  isActive: boolean
  alertThreshold?: number
}

// Recurring transaction types
export type RecurringTransaction = RecurringEntryDocument & { id: string }

export interface RecurringFormData {
  name: string
  amount: number
  type: "income" | "expense"
  category: string
  frequency: "weekly" | "monthly" | "yearly"
  nextDate: string
  isActive: boolean
}

// Goal types
export type Goal = GoalDocument & { id: string }

export interface GoalFormData {
  name: string
  targetAmount: number
  currentAmount: number
  currency: string
  deadline?: string
  category?: string
  description?: string
  isActive: boolean
}

// Savings account types
export type SavingsAccount = SavingsAccountDocument & { id: string }

export interface SavingsAccountFormData {
  name: string
  balance: number
  currency: string
  description?: string
  color?: string
  icon?: string
  isActive: boolean
}

// Toast types (for compatibility with existing Toast component)
export interface ToastState {
  message: string
  type: "success" | "error"
}

// Utility function to convert Timestamp to ISO string
export function timestampToISO(value: Timestamp | string | Date | unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString()
  }
  if (typeof value === "string") {
    return value
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  // Fallback for unknown types
  return new Date(value as string | number | Date).toISOString()
}
