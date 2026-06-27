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
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Get the start and end of a date range for filtering
 */
export interface DateRange {
  start: Date;
  end: Date;
}

// Build a UTC instant at the start/end of a calendar day. Entry dates are
// stored at UTC midnight of the user's picked day, so range bounds must also be
// UTC-anchored — otherwise users west of UTC lose first-of-period entries and
// users east of UTC pull in neighbour days (see review M2). `Date.UTC`
// normalizes overflow (e.g. day 0 = last day of previous month).
function utcStartOfDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}
function utcEndOfDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
}

/**
 * Get date range for common filter options.
 *
 * The period is anchored to the viewer's LOCAL calendar (their "today"/"this
 * month"), but the returned bounds are UTC instants of those calendar days to
 * match how entry dates are stored.
 */
export function getDateRange(filter: string): DateRange | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (filter) {
    case "today":
      return { start: utcStartOfDay(y, m, d), end: utcEndOfDay(y, m, d) };
    case "thisWeek":
      // Week starts on Sunday (now.getDay() === 0); Date.UTC normalizes the
      // possibly-negative day-of-month back into the correct month/year.
      return { start: utcStartOfDay(y, m, d - now.getDay()), end: utcEndOfDay(y, m, d) };
    case "thisMonth":
      return { start: utcStartOfDay(y, m, 1), end: utcEndOfDay(y, m + 1, 0) };
    case "lastMonth": {
      const lastMonth = m === 0 ? 11 : m - 1;
      const lastMonthYear = m === 0 ? y - 1 : y;
      return {
        start: utcStartOfDay(lastMonthYear, lastMonth, 1),
        end: utcEndOfDay(lastMonthYear, lastMonth + 1, 0),
      };
    }
    case "thisYear":
      return { start: utcStartOfDay(y, 0, 1), end: utcEndOfDay(y, 11, 31) };
    default:
      return null;
  }
}

/**
 * Get date range for custom date filter. Inputs are "YYYY-MM-DD" calendar days;
 * bounds are UTC instants of those days (see getDateRange / review M2).
 */
export function getCustomDateRange(startDate: string, endDate: string): DateRange | null {
  if (!startDate || !endDate) return null;

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
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

// ── Calendar Helpers ────────────────────────────────────────────────

/**
 * Get number of days in a given month (0-indexed month)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the weekday of the first day of the month (0=Sun, 6=Sat)
 */
export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * Compare two dates ignoring time portion
 */
export function isSameDay(a: Date | string, b: Date | string): boolean {
  const da = typeof a === "string" ? new Date(a) : a;
  const db = typeof b === "string" ? new Date(b) : b;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Generate a full calendar grid for a given month.
 * Returns 35 or 42 CalendarDay objects (5 or 6 rows of 7).
 */
export function generateCalendarDays(year: number, month: number): CalendarDay[] {
  const today = new Date();
  const firstDay = getFirstDayOfWeek(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(
    month === 0 ? year - 1 : year,
    month === 0 ? 11 : month - 1
  );

  const days: CalendarDay[] = [];

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = new Date(
      month === 0 ? year - 1 : year,
      month === 0 ? 11 : month - 1,
      day
    );
    days.push({ date, isCurrentMonth: false, isToday: isSameDay(date, today) });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push({ date, isCurrentMonth: true, isToday: isSameDay(date, today) });
  }

  // Next month padding (fill to 35 or 42)
  const totalCells = days.length <= 35 ? 35 : 42;
  let nextDay = 1;
  while (days.length < totalCells) {
    const date = new Date(
      month === 11 ? year + 1 : year,
      month === 11 ? 0 : month + 1,
      nextDay++
    );
    days.push({ date, isCurrentMonth: false, isToday: isSameDay(date, today) });
  }

  return days;
}

