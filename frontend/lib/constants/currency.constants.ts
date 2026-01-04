/**
 * Currency Constants
 * 
 * Centralized currency configuration for the application.
 * To change supported currencies, modify the CURRENCIES array below.
 */

/**
 * Supported currencies in the application
 * Currently limited to USD and EUR
 */
export const SUPPORTED_CURRENCIES = ["EUR", "USD"] as const;

/**
 * Currency type derived from supported currencies
 */
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/**
 * Default currency
 */
export const DEFAULT_CURRENCY: SupportedCurrency = "EUR";

/**
 * Currency display names (optional, for UI display)
 */
export const CURRENCY_DISPLAY_NAMES: Record<SupportedCurrency, string> = {
  EUR: "Euro",
  USD: "US Dollar",
} as const;

/**
 * Check if a currency is supported
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency);
}

/**
 * Get currency display name
 */
export function getCurrencyDisplayName(currency: SupportedCurrency): string {
  return CURRENCY_DISPLAY_NAMES[currency] || currency;
}

