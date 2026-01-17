/**
 * Transaction categories constants
 */

export const TRANSACTION_CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transportation",
  "Bills & Utilities",
  "Taxes & Insurance",
  "Entertainment",
  "Salary",
  "Other",
] as const;

export type TransactionCategory = typeof TRANSACTION_CATEGORIES[number];

/**
 * Quick expense categories with icons and colors
 */
export interface QuickCategory {
  id: string;
  label: string;
  icon?: any; // Icon component type
  color?: string;
}

export const QUICK_EXPENSE_CATEGORIES: QuickCategory[] = [
  { id: "Food & Dining", label: "Food", color: "bg-red-500" },
  { id: "Shopping", label: "Shopping", color: "bg-blue-500" },
  { id: "Transportation", label: "Fuel", color: "bg-green-500" },
  { id: "Bills & Utilities", label: "Bills", color: "bg-yellow-500" },
  { id: "Taxes & Insurance", label: "Taxes", color: "bg-orange-500" },
  { id: "Entertainment", label: "Fun", color: "bg-purple-500" },
  { id: "Other", label: "Other", color: "bg-gray-500" },
];

/**
 * Get all unique categories from entries
 */
export function getUniqueCategories(entries: Array<{ category: string }>): string[] {
  return Array.from(new Set(entries.map((e) => e.category))).sort();
}

