/**
 * Transaction filtering and sorting utilities
 */

import { getDateRange, getCustomDateRange, isDateInRange } from "./date-utils";
import { Entry, FilterOptions, SortOptions } from "./types";

/**
 * Filter transactions based on provided options
 */
export function filterTransactions(
  transactions: Entry[],
  options: FilterOptions
): Entry[] {
  let filtered = [...transactions];

  const {
    searchQuery = "",
    categoryFilter = "all",
    typeFilter = "all",
    dateFilter = "all",
    customDateRange,
  } = options;

  // Search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        (t.notes && t.notes.toLowerCase().includes(query))
    );
  }

  // Category filter
  if (categoryFilter !== "all") {
    filtered = filtered.filter((t) => t.category === categoryFilter);
  }

  // Type filter
  if (typeFilter !== "all") {
    filtered = filtered.filter((t) => t.type === typeFilter);
  }

  // Date filter
  if (dateFilter !== "all") {
    if (dateFilter === "custom" && customDateRange) {
      const range = getCustomDateRange(
        customDateRange.startDate,
        customDateRange.endDate
      );
      if (range) {
        filtered = filtered.filter((t) => isDateInRange(t.date, range));
      }
    } else {
      const range = getDateRange(dateFilter);
      if (range) {
        filtered = filtered.filter((t) => isDateInRange(t.date, range));
      }
    }
  }

  return filtered;
}

/**
 * Sort transactions based on field and direction
 */
export function sortTransactions(
  transactions: Entry[],
  sortBy: string
): Entry[] {
  const [field, direction] = sortBy.split("-") as [SortOptions["field"], SortOptions["direction"]];
  const ascending = direction === "asc";

  return [...transactions].sort((a, b) => {
    switch (field) {
      case "date": {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return ascending ? dateA - dateB : dateB - dateA;
      }
      case "amount": {
        return ascending ? a.amount - b.amount : b.amount - a.amount;
      }
      case "description": {
        const descA = a.description.toLowerCase();
        const descB = b.description.toLowerCase();
        if (ascending) {
          return descA.localeCompare(descB);
        } else {
          return descB.localeCompare(descA);
        }
      }
      case "category": {
        const catA = a.category.toLowerCase();
        const catB = b.category.toLowerCase();
        if (ascending) {
          return catA.localeCompare(catB);
        } else {
          return catB.localeCompare(catA);
        }
      }
      default:
        return 0;
    }
  });
}

/**
 * Filter and sort transactions in one operation
 */
export function filterAndSortTransactions(
  transactions: Entry[],
  filterOptions: FilterOptions,
  sortBy: string
): Entry[] {
  const filtered = filterTransactions(transactions, filterOptions);
  return sortTransactions(filtered, sortBy);
}

