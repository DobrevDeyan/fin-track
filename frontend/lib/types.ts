/**
 * Shared type definitions across the application
 */

import { Currency, BudgetPeriod, TransactionType } from "./constants";

/**
 * Transaction/Entry types
 */
export interface Entry {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: TransactionType;
  date: string;
  notes?: string;
  tags?: string[];
}

export interface TransactionData {
  description: string;
  amount: number;
  category: string;
  type: TransactionType;
  date: string;
  notes?: string;
}

/**
 * Budget types
 */
export interface Budget {
  id: string;
  name: string;
  category?: string;
  amount: number;
  currency: Currency;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  isActive: boolean;
  alertThreshold?: number;
}

export interface BudgetData {
  name: string;
  category?: string;
  amount: number;
  currency: Currency;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  isActive: boolean;
  alertThreshold?: number;
}

/**
 * Metrics types
 */
export interface Metrics {
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  savings: number;
}

export interface ChangeMetrics {
  change: string;
  trend: "up" | "down" | "neutral";
}

/**
 * Filter types
 */
export interface FilterOptions {
  searchQuery?: string;
  categoryFilter?: string;
  typeFilter?: string;
  dateFilter?: string;
  tagFilter?: string;
  customDateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface SortOptions {
  field: "date" | "amount" | "description" | "category";
  direction: "asc" | "desc";
}

