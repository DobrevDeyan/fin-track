/**
 * Date Range Utilities
 * 
 * Utilities for calculating date ranges (budget periods, etc.)
 */

import type { BudgetPeriod } from "@/lib/constants/budget.constants";

/**
 * Date range calculator class
 */
export class DateRangeCalculator {
  /**
   * Calculate date range for a budget period
   * @param periodType - The budget period (weekly, monthly, yearly)
   * @param start - The start date
   * @returns Object with start and end dates
   */
  static calculatePeriodRange(
    periodType: BudgetPeriod,
    start: Date
  ): { start: Date; end: Date } {
    const end = new Date(start);

    switch (periodType) {
      case "weekly":
        end.setDate(start.getDate() + 6); // 7 days total (including start day)
        break;
      case "monthly":
        end.setMonth(start.getMonth() + 1);
        end.setDate(0); // Last day of the month
        break;
      case "yearly":
        end.setFullYear(start.getFullYear() + 1);
        end.setMonth(0, 0); // Last day of the year (Jan 0 = Dec 31 of previous year)
        break;
    }

    return { start, end };
  }

  /**
   * Calculate date range and return as ISO strings (for form inputs)
   */
  static calculatePeriodRangeISO(
    periodType: BudgetPeriod,
    start: Date
  ): { start: string; end: string } {
    const range = this.calculatePeriodRange(periodType, start);
    return {
      start: range.start.toISOString().split("T")[0],
      end: range.end.toISOString().split("T")[0],
    };
  }

  /**
   * Get number of days in a period
   */
  static getPeriodDays(periodType: BudgetPeriod): number {
    switch (periodType) {
      case "weekly":
        return 7;
      case "monthly":
        return 30; // Approximate
      case "yearly":
        return 365;
    }
  }
}

