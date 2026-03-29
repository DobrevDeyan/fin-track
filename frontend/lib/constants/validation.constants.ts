/**
 * Validation Constants
 * 
 * Constants for form validation (error messages, rules, patterns, etc.)
 */

/**
 * Email validation regex pattern
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password validation rules
 */
export const PASSWORD_RULES = {
  MIN_LENGTH: 6,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: false,
  REQUIRE_LOWERCASE: false,
  REQUIRE_NUMBERS: false,
  REQUIRE_SPECIAL_CHARS: false,
} as const;

/**
 * Special characters pattern for passwords
 */
export const PASSWORD_SPECIAL_CHARS_PATTERN = /[!@#$%^&*(),.?":{}|<>]/;

/**
 * Amount validation rules
 */
export const AMOUNT_RULES = {
  MIN: 0.01, // Minimum amount (greater than 0)
  MAX: 1_000_000, // Maximum amount for personal finance
  DECIMAL_PLACES: 2, // Maximum decimal places
} as const;

/**
 * Common validation error messages
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: (fieldName: string = "Field") => `${fieldName} is required`,
  EMAIL_REQUIRED: "Email is required",
  EMAIL_INVALID: "Please enter a valid email address",
  PASSWORD_REQUIRED: "Password is required",
  PASSWORD_TOO_SHORT: (minLength: number) => `Password must be at least ${minLength} characters long`,
  PASSWORD_UPPERCASE: "Password must contain at least one uppercase letter",
  PASSWORD_LOWERCASE: "Password must contain at least one lowercase letter",
  PASSWORD_NUMBERS: "Password must contain at least one number",
  PASSWORD_SPECIAL_CHARS: "Password must contain at least one special character",
  PASSWORDS_DO_NOT_MATCH: "Passwords do not match",
  CONFIRM_PASSWORD_REQUIRED: "Please confirm your password",
  AMOUNT_REQUIRED: "Amount is required",
  AMOUNT_INVALID: "Please enter a valid amount",
  AMOUNT_TOO_SMALL: "Amount must be greater than 0",
  AMOUNT_TOO_LARGE: (max: number) => `Amount cannot exceed ${max}`,
} as const;

/**
 * Toast/Success messages
 */
export const SUCCESS_MESSAGES = {
  ENTRY_ADDED: (type: "income" | "expense") => `${type === "income" ? "Income" : "Expense"} entry added successfully!`,
  ENTRY_UPDATED: "Entry updated successfully!",
  ENTRY_DELETED: "Entry deleted successfully!",
  BUDGET_CREATED: "Budget created successfully!",
  BUDGET_UPDATED: "Budget updated successfully!",
  BUDGET_DELETED: "Budget deleted successfully!",
  GOAL_CREATED: "Goal created successfully!",
  GOAL_UPDATED: "Goal updated successfully!",
  GOAL_DELETED: "Goal deleted successfully!",
  RECURRING_CREATED: "Recurring transaction created successfully!",
  RECURRING_UPDATED: "Recurring transaction updated successfully!",
  RECURRING_DELETED: "Recurring transaction deleted successfully!",
  CSV_EXPORTED: "Transactions exported successfully!",
  CURRENCY_UPDATED: "Currency preference updated successfully!",
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  GENERIC: "An error occurred. Please try again.",
  NETWORK: "Network error. Please check your connection.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION_FAILED: "Please check your input and try again.",
  SAVE_FAILED: "Failed to save. Please try again.",
  DELETE_FAILED: "Failed to delete. Please try again.",
  LOAD_FAILED: "Failed to load data. Please try again.",
  EXPORT_FAILED: "Failed to export. Please try again.",
  CURRENCY_UPDATE_FAILED: "Failed to update currency. Please try again.",
  GOAL_SAVE_FAILED: "Failed to save goal. Please try again.",
  GOAL_DELETE_FAILED: "Failed to delete goal. Please try again.",
  GOAL_ADD_FUNDS_FAILED: "Failed to add funds to goal. Please try again.",
} as const;

