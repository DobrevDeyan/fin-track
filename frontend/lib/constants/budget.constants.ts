/**
 * Budget Constants
 * 
 * Constants related to budgets (periods, thresholds, etc.)
 */

/**
 * Budget periods
 */
export const BUDGET_PERIODS = ["weekly", "monthly", "yearly"] as const;

/**
 * Budget period type
 */
export type BudgetPeriod = typeof BUDGET_PERIODS[number];

/**
 * Budget period display labels
 */
export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
} as const;

/**
 * Default budget period
 */
export const DEFAULT_BUDGET_PERIOD: BudgetPeriod = "monthly";

/**
 * Default alert threshold (percentage)
 */
export const DEFAULT_ALERT_THRESHOLD = 80; // Percentage (0-100)

/**
 * Minimum alert threshold
 */
export const MIN_ALERT_THRESHOLD = 0;

/**
 * Maximum alert threshold
 */
export const MAX_ALERT_THRESHOLD = 100;

/**
 * Get budget period label
 */
export function getBudgetPeriodLabel(period: BudgetPeriod): string {
  return BUDGET_PERIOD_LABELS[period];
}

/**
 * Check if value is a valid budget period
 */
export function isBudgetPeriod(value: string): value is BudgetPeriod {
  return BUDGET_PERIODS.includes(value as BudgetPeriod);
}

