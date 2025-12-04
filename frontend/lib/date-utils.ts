/**
 * Date formatting and manipulation utilities
 */

export interface DateFormatOptions {
  month?: "numeric" | "2-digit" | "short" | "long" | "narrow";
  day?: "numeric" | "2-digit";
  year?: "numeric" | "2-digit";
  locale?: string;
}

/**
 * Format a date string or Date object to a readable string
 * @param date - Date string or Date object
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  options: DateFormatOptions = {}
): string {
  const {
    month = "short",
    day = "numeric",
    year = "numeric",
    locale = "en-US",
  } = options;

  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale, {
    month,
    day,
    year,
  });
}

/**
 * Format a date to a compact string (e.g., "Jan 15")
 * @param date - Date string or Date object
 * @returns Compact formatted date string
 */
export function formatDateCompact(date: string | Date): string {
  return formatDate(date, { month: "short", day: "numeric" });
}

/**
 * Format a date to ISO string (YYYY-MM-DD) for date inputs
 * @param date - Date string or Date object
 * @returns ISO date string (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toISOString().split("T")[0];
}

/**
 * Get the start and end of a date range for filtering
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Get date range for common filter options
 */
export function getDateRange(filter: string): DateRange | null {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  switch (filter) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "thisWeek": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "thisMonth": {
      const start = new Date(currentYear, currentMonth, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentYear, currentMonth + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "lastMonth": {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const start = new Date(lastMonthYear, lastMonth, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(lastMonthYear, lastMonth + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "thisYear": {
      const start = new Date(currentYear, 0, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentYear, 11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    default:
      return null;
  }
}

/**
 * Get date range for custom date filter
 */
export function getCustomDateRange(startDate: string, endDate: string): DateRange | null {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Check if a date is within a date range
 */
export function isDateInRange(date: string | Date, range: DateRange): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj >= range.start && dateObj <= range.end;
}

/**
 * Get month name from date
 */
export function getMonthName(date: Date | string, locale: string = "en-US"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString(locale, { month: "long" });
}

/**
 * Get previous month and year
 */
export function getPreviousMonth(month: number, year: number): { month: number; year: number } {
  if (month === 0) {
    return { month: 11, year: year - 1 };
  }
  return { month: month - 1, year };
}

