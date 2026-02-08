/**
 * Timestamp Conversion Utilities
 *
 * Centralized utilities for converting between different date/time formats
 * and Firebase Timestamps. This eliminates duplicate conversion code across
 * the codebase.
 */

import { Timestamp } from "firebase/firestore"

/**
 * Type for values that can be converted to a Timestamp
 */
export type TimestampInput = Timestamp | Date | string | number | undefined | null

/**
 * Convert any date-like value to a Firebase Timestamp
 *
 * @param value - The value to convert (Timestamp, Date, string, or number)
 * @returns A Firebase Timestamp, or undefined if input is null/undefined
 *
 * @example
 * toTimestamp(new Date()) // Returns Timestamp
 * toTimestamp("2024-01-15") // Returns Timestamp from ISO string
 * toTimestamp(1705276800000) // Returns Timestamp from milliseconds
 */
export function toTimestamp(value: TimestampInput): Timestamp | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  // Already a Timestamp
  if (value instanceof Timestamp) {
    return value
  }

  // Check for Timestamp-like object (has toMillis method) - handles Firestore SDK edge cases
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: unknown }).toMillis === "function"
  ) {
    return value as unknown as Timestamp
  }

  // Date object
  if (value instanceof Date) {
    return Timestamp.fromDate(value)
  }

  // Number (milliseconds since epoch)
  if (typeof value === "number") {
    return Timestamp.fromMillis(value)
  }

  // String (ISO date string or other parseable format)
  if (typeof value === "string") {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return Timestamp.fromDate(date)
    }
  }

  return undefined
}

/**
 * Convert any date-like value to a Firebase Timestamp (throws if invalid)
 *
 * @param value - The value to convert
 * @returns A Firebase Timestamp
 * @throws Error if value cannot be converted
 */
export function toTimestampRequired(value: TimestampInput): Timestamp {
  const result = toTimestamp(value)
  if (!result) {
    throw new Error(`Cannot convert value to Timestamp: ${value}`)
  }
  return result
}

/**
 * Convert a Timestamp or date-like value to an ISO string
 *
 * @param value - The value to convert
 * @returns An ISO date string, or undefined if input is null/undefined
 *
 * @example
 * toISOString(Timestamp.now()) // Returns "2024-01-15T12:00:00.000Z"
 * toISOString(new Date()) // Returns ISO string
 */
export function toISOString(value: TimestampInput): string | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  // Timestamp
  if (value instanceof Timestamp) {
    return value.toDate().toISOString()
  }

  // Check for Timestamp-like object
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }

  // Date object
  if (value instanceof Date) {
    return value.toISOString()
  }

  // String - return as-is if valid ISO, otherwise try to parse
  if (typeof value === "string") {
    // Check if it's already a valid ISO string
    const isoPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/
    if (isoPattern.test(value)) {
      return value
    }
    // Try to parse and convert
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }
  }

  // Number (milliseconds)
  if (typeof value === "number") {
    return new Date(value).toISOString()
  }

  return undefined
}

/**
 * Convert a Timestamp or date-like value to an ISO string (throws if invalid)
 *
 * @param value - The value to convert
 * @returns An ISO date string
 * @throws Error if value cannot be converted
 */
export function toISOStringRequired(value: TimestampInput): string {
  const result = toISOString(value)
  if (!result) {
    throw new Error(`Cannot convert value to ISO string: ${value}`)
  }
  return result
}

/**
 * Convert a Timestamp or date-like value to a Date object
 *
 * @param value - The value to convert
 * @returns A Date object, or undefined if input is null/undefined
 */
export function toDate(value: TimestampInput): Date | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  // Timestamp
  if (value instanceof Timestamp) {
    return value.toDate()
  }

  // Check for Timestamp-like object
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate()
  }

  // Already a Date
  if (value instanceof Date) {
    return value
  }

  // String or number
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  return undefined
}

/**
 * Get milliseconds from a Timestamp or date-like value
 *
 * @param value - The value to convert
 * @returns Milliseconds since epoch, or undefined if input is null/undefined
 */
export function toMillis(value: TimestampInput): number | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  // Timestamp
  if (value instanceof Timestamp) {
    return value.toMillis()
  }

  // Check for Timestamp-like object
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis()
  }

  // Date
  if (value instanceof Date) {
    return value.getTime()
  }

  // Number - assume already milliseconds
  if (typeof value === "number") {
    return value
  }

  // String
  if (typeof value === "string") {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.getTime()
    }
  }

  return undefined
}
