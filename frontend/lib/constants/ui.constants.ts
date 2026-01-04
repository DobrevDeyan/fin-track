/**
 * UI Constants
 * 
 * Constants for UI elements (colors, status indicators, trends, etc.)
 */

/**
 * Status colors for UI elements
 */
export const STATUS_COLORS = {
  success: "text-green-600",
  error: "text-red-600",
  warning: "text-yellow-600",
  info: "text-blue-600",
  neutral: "text-muted-foreground",
} as const;

/**
 * Status background colors
 */
export const STATUS_BG_COLORS = {
  success: "bg-green-50",
  error: "bg-red-50",
  warning: "bg-yellow-50",
  info: "bg-blue-50",
  neutral: "bg-gray-50",
} as const;

/**
 * Trend colors (for metrics, charts, etc.)
 */
export const TREND_COLORS = {
  up: "text-green-600",
  down: "text-red-600",
  neutral: "text-muted-foreground",
} as const;

/**
 * Trend background colors
 */
export const TREND_BG_COLORS = {
  up: "bg-green-50",
  down: "bg-red-50",
  neutral: "bg-gray-50",
} as const;

/**
 * Badge status colors (for status indicators)
 */
export const BADGE_STATUS_COLORS = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
} as const;

/**
 * Get status color class
 */
export function getStatusColor(status: keyof typeof STATUS_COLORS): string {
  return STATUS_COLORS[status];
}

/**
 * Get trend color class
 */
export function getTrendColor(trend: keyof typeof TREND_COLORS): string {
  return TREND_COLORS[trend];
}

/**
 * Get badge status color class
 */
export function getBadgeStatusColor(status: keyof typeof BADGE_STATUS_COLORS): string {
  return BADGE_STATUS_COLORS[status];
}

