/**
 * Transaction Constants
 * 
 * Constants related to transactions (income/expense types, statuses, etc.)
 */

/**
 * Transaction types
 */
export const TRANSACTION_TYPES = ["income", "expense"] as const;

/**
 * Transaction type derived from types array
 */
export type TransactionType = typeof TRANSACTION_TYPES[number];

/**
 * Transaction type display labels
 */
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
} as const;

/**
 * Transaction type colors (for UI display)
 */
export const TRANSACTION_TYPE_COLORS = {
  income: "text-green-600",
  expense: "text-red-600",
} as const;

/**
 * Transaction type background colors
 */
export const TRANSACTION_TYPE_BG_COLORS = {
  income: "bg-green-50",
  expense: "bg-red-50",
} as const;

/**
 * Get transaction type label
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  return TRANSACTION_TYPE_LABELS[type];
}

/**
 * Get transaction type color class
 */
export function getTransactionTypeColor(type: TransactionType): string {
  return TRANSACTION_TYPE_COLORS[type];
}

/**
 * Get transaction type background color class
 */
export function getTransactionTypeBgColor(type: TransactionType): string {
  return TRANSACTION_TYPE_BG_COLORS[type];
}

/**
 * Check if value is a valid transaction type
 */
export function isTransactionType(value: string): value is TransactionType {
  return TRANSACTION_TYPES.includes(value as TransactionType);
}

