/**
 * Error Handling Utilities
 *
 * Centralized utilities for consistent error handling across the codebase.
 * Provides type-safe error message extraction and common error patterns.
 */

/**
 * Extract a user-friendly error message from an unknown error
 *
 * @param error - The error to extract a message from
 * @param fallback - Optional fallback message if error cannot be parsed
 * @returns A string error message
 *
 * @example
 * catch (error: unknown) {
 *   const message = getErrorMessage(error, "Failed to save");
 *   showToast(message);
 * }
 */
export function getErrorMessage(
  error: unknown,
  fallback: string = "An unexpected error occurred"
): string {
  // Standard Error object
  if (error instanceof Error) {
    return error.message
  }

  // String error
  if (typeof error === "string") {
    return error
  }

  // Object with message property
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message
  }

  return fallback
}

/**
 * Check if an error is a Firebase/Firestore error with a specific code
 *
 * @param error - The error to check
 * @param code - The error code to match
 * @returns True if the error has the specified code
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: unknown }).code === code
  ) {
    return true
  }
  return false
}

/**
 * Check if an error is a Firestore index error
 *
 * @param error - The error to check
 * @returns True if this is a Firestore index error
 */
export function isFirestoreIndexError(error: unknown): boolean {
  if (hasErrorCode(error, "failed-precondition")) {
    return true
  }

  const message = getErrorMessage(error, "")
  return message.toLowerCase().includes("index")
}

/**
 * Check if an error is a network/connectivity error
 *
 * @param error - The error to check
 * @returns True if this appears to be a network error
 */
export function isNetworkError(error: unknown): boolean {
  const networkCodes = ["unavailable", "network-request-failed"]

  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code
    if (typeof code === "string" && networkCodes.includes(code)) {
      return true
    }
  }

  const message = getErrorMessage(error, "").toLowerCase()
  return (
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("connection")
  )
}

/**
 * Check if an error is an authentication error
 *
 * @param error - The error to check
 * @returns True if this is an auth-related error
 */
export function isAuthError(error: unknown): boolean {
  const authCodes = [
    "auth/user-not-found",
    "auth/wrong-password",
    "auth/invalid-email",
    "auth/user-disabled",
    "auth/email-already-in-use",
    "auth/weak-password",
    "auth/requires-recent-login",
    "unauthenticated",
    "permission-denied",
  ]

  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code
    if (typeof code === "string" && authCodes.includes(code)) {
      return true
    }
  }

  return false
}

/**
 * Check if an error indicates insufficient funds/balance
 *
 * @param error - The error to check
 * @returns True if this is an insufficient balance error
 */
export function isInsufficientBalanceError(error: unknown): boolean {
  const message = getErrorMessage(error, "").toLowerCase()
  return (
    message.includes("insufficient") ||
    message.includes("not enough") ||
    message.includes("balance")
  )
}

/**
 * Common error messages for consistency across the app
 */
export const ERROR_MESSAGES = {
  // General
  UNEXPECTED: "error.unexpected",
  NETWORK: "error.network",
  SAVE_FAILED: "error.saveFailed",
  DELETE_FAILED: "error.deleteFailed",
  LOAD_FAILED: "error.loadFailed",

  // Auth
  AUTH_FAILED: "error.authFailed",
  LOGIN_FAILED: "error.loginFailed",
  REGISTER_FAILED: "error.registerFailed",
  LOGOUT_FAILED: "error.logoutFailed",

  // Transactions
  TRANSACTION_SAVE_FAILED: "error.transactionSaveFailed",
  TRANSACTION_DELETE_FAILED: "error.transactionDeleteFailed",

  // Budgets
  BUDGET_SAVE_FAILED: "error.budgetSaveFailed",
  BUDGET_DELETE_FAILED: "error.budgetDeleteFailed",

  // Goals
  GOAL_SAVE_FAILED: "error.goalSaveFailed",
  GOAL_DELETE_FAILED: "error.goalDeleteFailed",
  GOAL_ADD_FUNDS_FAILED: "error.goalAddFundsFailed",

  // Savings
  SAVINGS_SAVE_FAILED: "error.savingsSaveFailed",
  SAVINGS_DELETE_FAILED: "error.savingsDeleteFailed",
  INSUFFICIENT_BALANCE: "error.insufficientBalance",
  DEPOSIT_FAILED: "error.depositFailed",
  WITHDRAW_FAILED: "error.withdrawFailed",

  // Recurring
  RECURRING_SAVE_FAILED: "error.recurringSaveFailed",
  RECURRING_DELETE_FAILED: "error.recurringDeleteFailed",
} as const

/**
 * Get appropriate error message based on error type and context
 *
 * @param error - The error that occurred
 * @param context - The context/operation that failed
 * @returns An appropriate user-friendly error message
 */
export function getContextualErrorMessage(
  error: unknown,
  context: "save" | "delete" | "load" | "auth" | "network"
): string {
  // Check for specific error types first
  if (isNetworkError(error)) {
    return ERROR_MESSAGES.NETWORK
  }

  if (isAuthError(error)) {
    return ERROR_MESSAGES.AUTH_FAILED
  }

  if (isInsufficientBalanceError(error)) {
    return ERROR_MESSAGES.INSUFFICIENT_BALANCE
  }

  // Fall back to context-based messages
  switch (context) {
    case "save":
      return ERROR_MESSAGES.SAVE_FAILED
    case "delete":
      return ERROR_MESSAGES.DELETE_FAILED
    case "load":
      return ERROR_MESSAGES.LOAD_FAILED
    case "auth":
      return ERROR_MESSAGES.AUTH_FAILED
    case "network":
      return ERROR_MESSAGES.NETWORK
    default:
      return ERROR_MESSAGES.UNEXPECTED
  }
}
