/**
 * Application Constants
 * 
 * App-wide constants (timeouts, defaults, configuration, etc.)
 */

/**
 * Session timeout configuration
 */
export const SESSION_CONFIG = {
  TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  WARNING_TIME_MS: 5 * 60 * 1000, // 5 minutes before timeout
} as const;

/**
 * Default sort option
 */
export const DEFAULT_SORT_BY = "date-desc";

/**
 * Default locale for formatting
 */
export const DEFAULT_LOCALE = "en-US";

/**
 * Date filter options
 */
export const DATE_FILTER_OPTIONS = [
  "all",
  "today",
  "thisWeek",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "custom",
] as const;

export type DateFilterOption = typeof DATE_FILTER_OPTIONS[number];

/**
 * Sort fields
 */
export const SORT_FIELDS = ["date", "amount", "description", "category"] as const;

export type SortField = typeof SORT_FIELDS[number];

/**
 * Sort directions
 */
export const SORT_DIRECTIONS = ["asc", "desc"] as const;

export type SortDirection = typeof SORT_DIRECTIONS[number];

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * File upload limits
 */
export const FILE_LIMITS = {
  MAX_SIZE_MB: 10, // Maximum file size in MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ALLOWED_DOCUMENT_TYPES: ["application/pdf"],
} as const;

