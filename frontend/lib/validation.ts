/**
 * Form validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Email validation
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true };
}

/**
 * Password validation
 */
export interface PasswordValidationOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

export function validatePassword(
  password: string,
  options: PasswordValidationOptions = {}
): ValidationResult {
  const {
    minLength = 6,
    requireUppercase = false,
    requireLowercase = false,
    requireNumbers = false,
    requireSpecialChars = false,
  } = options;

  if (!password) {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < minLength) {
    return {
      isValid: false,
      error: `Password must be at least ${minLength} characters long`,
    };
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }

  if (requireNumbers && !/[0-9]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one number",
    };
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one special character",
    };
  }

  return { isValid: true };
}

/**
 * Confirm password validation
 */
export function validateConfirmPassword(
  confirmPassword: string,
  password: string
): ValidationResult {
  if (!confirmPassword) {
    return { isValid: false, error: "Please confirm your password" };
  }

  if (confirmPassword !== password) {
    return { isValid: false, error: "Passwords do not match" };
  }

  return { isValid: true };
}

/**
 * Amount validation
 */
export function validateAmount(amount: string | number): ValidationResult {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return { isValid: false, error: "Please enter a valid amount" };
  }

  if (numAmount <= 0) {
    return { isValid: false, error: "Amount must be greater than 0" };
  }

  return { isValid: true };
}

/**
 * Required field validation
 */
export function validateRequired(value: string, fieldName: string = "Field"): ValidationResult {
  if (!value || value.trim() === "") {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true };
}

