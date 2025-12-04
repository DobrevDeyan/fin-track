/**
 * Application-wide constants
 */

/**
 * Supported currencies
 */
export const CURRENCIES = ["EUR", "USD", "BGN", "GBP"] as const;

export type Currency = typeof CURRENCIES[number];

/**
 * Budget periods
 */
export const BUDGET_PERIODS = ["weekly", "monthly", "yearly"] as const;

export type BudgetPeriod = typeof BUDGET_PERIODS[number];

/**
 * Transaction types
 */
export const TRANSACTION_TYPES = ["income", "expense"] as const;

export type TransactionType = typeof TRANSACTION_TYPES[number];

/**
 * Date filter options
 */
export const DATE_FILTER_OPTIONS = [
  "all",
  "today",
  "thisWeek",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "custom",
] as const;

export type DateFilterOption = typeof DATE_FILTER_OPTIONS[number];

/**
 * Sort options
 */
export const SORT_FIELDS = ["date", "amount", "description", "category"] as const;
export const SORT_DIRECTIONS = ["asc", "desc"] as const;

export type SortField = typeof SORT_FIELDS[number];
export type SortDirection = typeof SORT_DIRECTIONS[number];

/**
 * Default values
 */
export const DEFAULTS = {
  CURRENCY: "EUR" as Currency,
  BUDGET_PERIOD: "monthly" as BudgetPeriod,
  TRANSACTION_TYPE: "expense" as TransactionType,
  SORT_BY: "date-desc" as string,
  ALERT_THRESHOLD: 80, // Percentage
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  WARNING_TIME: 5 * 60 * 1000, // 5 minutes
} as const;

