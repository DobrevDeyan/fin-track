import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts Firebase authentication error codes to user-friendly messages
 */
export function getAuthErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    // Authentication errors
    "auth/invalid-credential": "Invalid email or password. Please check your credentials and try again.",
    "auth/user-not-found": "No account found with this email address. Please sign up to create an account.",
    "auth/wrong-password": "Incorrect password. Please try again or reset your password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled. Please contact support for assistance.",
    "auth/too-many-requests": "Too many failed login attempts. Please try again later or reset your password.",
    "auth/operation-not-allowed": "This sign-in method is not enabled. Please contact support.",
    
    // Registration errors
    "auth/email-already-in-use": "An account with this email already exists. Please sign in instead.",
    "auth/weak-password": "Password is too weak. Please use at least 6 characters with a mix of letters and numbers.",
    "auth/invalid-password": "Password must be at least 6 characters long.",
    
    // Network and general errors
    "auth/network-request-failed": "Network error. Please check your internet connection and try again.",
    "auth/internal-error": "An internal error occurred. Please try again in a moment.",
    "auth/popup-closed-by-user": "Sign-in popup was closed. Please try again.",
    "auth/cancelled-popup-request": "Sign-in was cancelled. Please try again.",
    "auth/popup-blocked": "Pop-up was blocked by your browser. Please allow pop-ups and try again.",
    "auth/account-exists-with-different-credential": "An account already exists with the same email but different sign-in method.",
  };

  return errorMessages[errorCode] || "An unexpected error occurred. Please try again.";
}

