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
   * Snap a reference date to the natural start boundary of a period:
   *  - weekly  → Monday of that week
   *  - monthly → 1st of that month
   *  - yearly  → Jan 1 of that year
   * Mirrors the alignment used by renewBudget() so create and renew agree.
   */
  static getPeriodStart(periodType: BudgetPeriod, ref: Date): Date {
    const d = new Date(ref);
    switch (periodType) {
      case "weekly": {
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Monday as week start
        return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
      }
      case "monthly":
        return new Date(d.getFullYear(), d.getMonth(), 1);
      case "yearly":
        return new Date(d.getFullYear(), 0, 1);
      default:
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }

  /**
   * Calculate date range for a budget period.
   * The end is the last day of a FULL period measured from `start`, so a
   * budget starting mid-period still spans a complete period (e.g. a monthly
   * budget starting on the 1st ends on the last day of the month; starting on
   * the 26th ends on the 25th of the next month).
   * @param periodType - The budget period (weekly, monthly, yearly)
   * @param start - The start date
   * @returns Object with start and end dates
   */
  static calculatePeriodRange(
    periodType: BudgetPeriod,
    start: Date
  ): { start: Date; end: Date } {
    let end: Date;

    switch (periodType) {
      case "weekly":
        end = new Date(start);
        end.setDate(start.getDate() + 6); // 7 days total (including start day)
        break;
      case "monthly":
        // Day before the same day-of-month next month, clamped for short months.
        end = endOfFullPeriod(start, start.getFullYear(), start.getMonth() + 1);
        break;
      case "yearly":
        // Day before the same day-of-month next year, clamped (Feb 29 → Feb 28).
        end = endOfFullPeriod(start, start.getFullYear() + 1, start.getMonth());
        break;
      default:
        end = new Date(start);
    }

    return { start, end };
  }

  /**
   * Format a Date as a local YYYY-MM-DD string.
   * NOTE: uses LOCAL calendar parts — not toISOString() — so users in positive
   * UTC offsets don't get the date shifted back a day.
   */
  static toLocalISODate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Calculate date range and return as local YYYY-MM-DD strings (for form inputs)
   */
  static calculatePeriodRangeISO(
    periodType: BudgetPeriod,
    start: Date
  ): { start: string; end: string } {
    const range = this.calculatePeriodRange(periodType, start);
    return {
      start: this.toLocalISODate(range.start),
      end: this.toLocalISODate(range.end),
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
      default:
        // Defensive: never return undefined for an unexpected period. (RA-9)
        return 30;
    }
  }
}

/**
 * The last day of a "full" period that began on `start`: the day before the
 * same day-of-month recurs in the target month. When the target month is
 * shorter than start's day-of-month (e.g. a monthly period starting Jan 31, or
 * a yearly one starting Feb 29), the anniversary day doesn't exist, so the
 * period ends on the last day of that month instead of spilling into the next
 * one. (RA-8)
 */
function endOfFullPeriod(
  start: Date,
  targetYear: number,
  targetMonthIndex: number
): Date {
  // Normalise month index so December + 1 wraps into the next January.
  const year = targetYear + Math.floor(targetMonthIndex / 12);
  const month = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startDay = start.getDate();
  if (startDay > lastDay) {
    return new Date(year, month, lastDay);
  }
  return new Date(year, month, startDay - 1);
}
