/**
 * Category Constants
 * 
 * Constants related to transaction categories (colors, mappings, etc.)
 */

/**
 * Category color mappings for badges/indicators
 * Maps category name to Tailwind CSS classes
 */
export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining":    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  "Shopping":         "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "Transportation":   "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "Bills & Utilities":"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Taxes & Insurance":"bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "Entertainment":    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  "Health & Pharmacy":"bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  "Education":        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  "Travel & Vacation":"bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  "Gifts & Donations":"bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  "Goal Contribution":"bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  "Salary":           "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Other":            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
} as const;

/**
 * Default category color (for unknown categories)
 */
export const DEFAULT_CATEGORY_COLOR = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";

/**
 * Get category color classes
 * Returns the color classes for a given category, or default if not found
 */
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
}

/**
 * Check if category has a defined color
 */
export function hasCategoryColor(category: string): boolean {
  return category in CATEGORY_COLORS;
}

