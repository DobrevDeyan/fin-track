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
  "Food & Dining": "bg-red-100 text-red-800",
  "Shopping": "bg-blue-100 text-blue-800",
  "Transportation": "bg-green-100 text-green-800",
  "Bills & Utilities": "bg-yellow-100 text-yellow-800",
  "Taxes & Insurance": "bg-orange-100 text-orange-800",
  "Entertainment": "bg-purple-100 text-purple-800",
  "Health & Pharmacy": "bg-pink-100 text-pink-800",
  "Education": "bg-indigo-100 text-indigo-800",
  "Travel & Vacation": "bg-teal-100 text-teal-800",
  "Gifts & Donations": "bg-rose-100 text-rose-800",
  "Goal Contribution": "bg-violet-100 text-violet-800",
  "Salary": "bg-emerald-100 text-emerald-800",
  "Other": "bg-gray-100 text-gray-800",
} as const;

/**
 * Default category color (for unknown categories)
 */
export const DEFAULT_CATEGORY_COLOR = "bg-gray-100 text-gray-800";

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

