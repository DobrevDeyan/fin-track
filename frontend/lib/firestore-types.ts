/**
 * Firestore Type Definitions
 * 
 * TypeScript interfaces matching the Firestore schema
 */

import { Timestamp } from "firebase/firestore"

// User Document
export interface UserDocument {
  email: string
  username: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  currency: string // ISO 4217 code: USD, EUR, BGN, etc.
  language: string // ISO 639-1 code: en, bg, etc.
  timezone: string // IANA timezone: Europe/Sofia, America/New_York, etc.
  providerId: string // password, google.com, etc.
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Entry Document (manual expense/income entries)
export interface EntryDocument {
  userId: string
  type: "income" | "expense"
  amount: number // Always positive, use type to indicate direction
  currency: string
  description: string
  category: string
  categoryId?: string // Reference to custom category if user-defined
  date: Timestamp // Entry date/time
  createdAt: Timestamp
  updatedAt: Timestamp
  tags?: string[]
  notes?: string
  location?: {
    lat: number
    lng: number
    name?: string
  }
  receiptUrl?: string
  recurring?: boolean
  recurringId?: string
}

// Category Document
export interface CategoryDocument {
  userId: string
  name: string
  icon?: string
  color?: string
  type: "income" | "expense"
  isDefault: boolean
  parentCategory?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Budget Document
export interface BudgetDocument {
  userId: string
  name: string
  category?: string
  amount: number
  currency: string
  period: "weekly" | "monthly" | "yearly"
  startDate: Timestamp
  endDate: Timestamp
  isActive: boolean
  alertThreshold?: number // Percentage (0-100)
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Recurring Entry Document
export interface RecurringEntryDocument {
  userId: string
  name: string
  amount: number
  type: "income" | "expense"
  category: string
  frequency: "weekly" | "monthly" | "yearly"
  nextDate: Timestamp
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Financial Goal Document
export interface GoalDocument {
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  currency: string
  deadline?: Timestamp
  category?: string
  description?: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Savings Account Document
export interface SavingsAccountDocument {
  userId: string
  name: string
  balance: number
  currency: string
  description?: string
  color?: string
  icon?: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Default Categories
export const DEFAULT_EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transportation",
  "Bills & Utilities",
  "Entertainment",
  "Other",
]

export const DEFAULT_INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Gift",
  "Other",
]

// Helper type for creating new documents (without timestamps)
export type CreateEntryInput = Omit<
  EntryDocument,
  "userId" | "createdAt" | "updatedAt" | "date"
> & {
  userId: string
  date: string | Date | Timestamp // Allow string, Date, or Timestamp for input
}

export type CreateCategoryInput = Omit<
  CategoryDocument,
  "userId" | "createdAt" | "updatedAt"
> & {
  userId: string
}

export type CreateBudgetInput = Omit<
  BudgetDocument,
  "userId" | "createdAt" | "updatedAt"
> & {
  userId: string
}

export type CreateGoalInput = Omit<
  GoalDocument,
  "userId" | "createdAt" | "updatedAt"
> & {
  userId: string
  deadline?: string | Date | Timestamp
}

export type CreateSavingsAccountInput = Omit<
  SavingsAccountDocument,
  "userId" | "createdAt" | "updatedAt"
> & {
  userId: string
}

