/**
 * Financial metrics calculation utilities
 *
 * NOTE: calculateMetrics, filterEntriesByMonth, getCurrentMonthEntries,
 * getPreviousMonthEntries, and calculateMetricsWithComparison are deprecated.
 * Dashboard metrics now come from the FinancialSummaryContext which reads
 * from the per-user financialSummaries Firestore document.
 * These functions are kept for backward compatibility with tests.
 */

import { Entry, Metrics, ChangeMetrics } from "./types";

/**
 * @deprecated Use FinancialSummaryContext instead
 */
export function calculateMetrics(entries: Entry[]): Metrics {
  const totalIncome = entries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = entries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalBalance = totalIncome - totalExpenses;
  const savings = totalBalance;

  return {
    totalIncome,
    totalExpenses,
    totalBalance,
    savings,
  };
}

/**
 * Filter entries by month and year
 */
export function filterEntriesByMonth(
  entries: Entry[],
  month: number,
  year: number
): Entry[] {
  return entries.filter((e) => {
    const entryDate = new Date(e.date);
    return entryDate.getMonth() === month && entryDate.getFullYear() === year;
  });
}

/**
 * Get entries for current month
 */
export function getCurrentMonthEntries(entries: Entry[]): Entry[] {
  const now = new Date();
  return filterEntriesByMonth(entries, now.getMonth(), now.getFullYear());
}

/**
 * Get entries for previous month
 */
export function getPreviousMonthEntries(entries: Entry[]): Entry[] {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  return filterEntriesByMonth(entries, prevMonth, prevYear);
}

/**
 * Calculate percentage change between two values
 */
export function calculateChange(current: number, previous: number): ChangeMetrics {
  if (previous === 0) {
    if (current === 0) {
      return { change: "No change", trend: "neutral" };
    }
    // No baseline to compute a percentage against. Returning a fabricated
    // "±100%" falsely implies a doubling, so report the value as "new" instead.
    // The UI translates the "new" sentinel (TrendBadge); trend is neutral
    // because a missing baseline tells us nothing about good vs bad. (RA-12)
    return { change: "new", trend: "neutral" };
  }

  const percentChange = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.abs(percentChange).toFixed(1);

  if (percentChange > 0) {
    return { change: `+${rounded}%`, trend: "up" };
  } else if (percentChange < 0) {
    return { change: `-${rounded}%`, trend: "down" };
  } else {
    return { change: "No change", trend: "neutral" };
  }
}

/**
 * Format a savings rate for display, consistently across the reports page, the
 * shareable achievement card, and the PDF export. (RA-10)
 *  - No income → "—" (a rate can't be computed without income).
 *  - Overspent (negative rate) → "—" rather than a jarring value like "-400%".
 *  - Otherwise the rounded percentage, e.g. "23%".
 */
export function formatSavingsRate(income: number, expenses: number): string {
  if (!(income > 0)) return "—";
  const rate = Math.round(((income - expenses) / income) * 100);
  if (rate < 0) return "—";
  return `${rate}%`;
}

/**
 * Calculate all metrics with comparison to previous month
 */
export function calculateMetricsWithComparison(entries: Entry[]): {
  current: Metrics;
  previous: Metrics;
  changes: {
    balance: ChangeMetrics;
    income: ChangeMetrics;
    expenses: ChangeMetrics;
    savings: ChangeMetrics;
  };
} {
  const currentEntries = getCurrentMonthEntries(entries);
  const previousEntries = getPreviousMonthEntries(entries);

  const current = calculateMetrics(currentEntries);
  const previous = calculateMetrics(previousEntries);

  return {
    current,
    previous,
    changes: {
      balance: calculateChange(current.totalBalance, previous.totalBalance),
      income: calculateChange(current.totalIncome, previous.totalIncome),
      expenses: calculateChange(current.totalExpenses, previous.totalExpenses),
      savings: calculateChange(current.savings, previous.savings),
    },
  };
}

