/**
 * Transaction categories constants
 *
 * SINGLE SOURCE OF TRUTH for category names. Every picker, validator, icon map
 * and color map must key off these lists — do not fork category name lists in
 * components. Icons live in the shared CATEGORY_ICONS maps, colors in
 * lib/constants/category.constants.ts (CATEGORY_COLORS covers every name here).
 */

export const EXPENSE_CATEGORIES = [
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
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Gift",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type TransactionCategory = ExpenseCategory | IncomeCategory;

/** Every known category name (expense + income), for type-agnostic lookups. */
export const TRANSACTION_CATEGORIES: readonly TransactionCategory[] = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES.filter(
    (c) => !(EXPENSE_CATEGORIES as readonly string[]).includes(c)
  ),
];

/** The valid category list for a given transaction type. */
export function getCategoriesForType(type: "income" | "expense"): readonly string[] {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

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

