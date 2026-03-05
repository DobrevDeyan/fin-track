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
  "Health & Pharmacy",
  "Education",
  "Travel & Vacation",
  "Gifts & Donations",
  "Goal Contribution",
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
  { id: "Food & Dining", label: "Food & Dining", color: "bg-red-500" },
  { id: "Shopping", label: "Shopping", color: "bg-blue-500" },
  { id: "Transportation", label: "Transportation", color: "bg-green-500" },
  { id: "Bills & Utilities", label: "Bills & Utilities", color: "bg-yellow-500" },
  { id: "Taxes & Insurance", label: "Taxes & Insurance", color: "bg-orange-600" },
  { id: "Entertainment", label: "Entertainment", color: "bg-purple-500" },
  { id: "Health & Pharmacy", label: "Health & Pharmacy", color: "bg-pink-500" },
  { id: "Education", label: "Education", color: "bg-indigo-500" },
  { id: "Travel & Vacation", label: "Travel & Vacation", color: "bg-teal-500" },
  { id: "Gifts & Donations", label: "Gifts & Donations", color: "bg-rose-500" },
  { id: "Other", label: "Other", color: "bg-gray-500" },
];

/**
 * Get all unique categories from entries
 */
export function getUniqueCategories(entries: Array<{ category: string }>): string[] {
  return Array.from(new Set(entries.map((e) => e.category))).sort();
}

/**
 * Get all expense category names from the predefined quick expense categories
 */
export function getExpenseCategories(): string[] {
  return QUICK_EXPENSE_CATEGORIES.map((cat) => cat.id);
}

