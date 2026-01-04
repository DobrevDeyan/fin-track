/**
 * Color Utilities
 * 
 * Utility functions for working with colors, themes, and styling
 */

import { getCategoryColor } from "@/lib/constants/category.constants";
import { getTransactionTypeColor } from "@/lib/constants/transaction.constants";
import { getStatusColor, getTrendColor, getBadgeStatusColor } from "@/lib/constants/ui.constants";
import type { TransactionType } from "@/lib/constants/transaction.constants";

/**
 * Color utility class for common color operations
 */
export class ColorUtils {
  /**
   * Get category color classes
   */
  static getCategoryColor(category: string): string {
    return getCategoryColor(category);
  }

  /**
   * Get transaction type color class
   */
  static getTransactionTypeColor(type: TransactionType): string {
    return getTransactionTypeColor(type);
  }

  /**
   * Get status color class
   */
  static getStatusColor(status: "success" | "error" | "warning" | "info" | "neutral"): string {
    return getStatusColor(status);
  }

  /**
   * Get trend color class
   */
  static getTrendColor(trend: "up" | "down" | "neutral"): string {
    return getTrendColor(trend);
  }

  /**
   * Get badge status color class
   */
  static getBadgeStatusColor(status: "active" | "inactive" | "pending" | "error"): string {
    return getBadgeStatusColor(status);
  }

  /**
   * Determine trend color based on numeric value
   * Positive = up (green), Negative = down (red), Zero = neutral
   */
  static getTrendColorFromValue(value: number): "up" | "down" | "neutral" {
    if (value > 0) return "up";
    if (value < 0) return "down";
    return "neutral";
  }

  /**
   * Get trend color class from numeric value
   */
  static getTrendColorClassFromValue(value: number): string {
    return this.getTrendColor(this.getTrendColorFromValue(value));
  }
}

