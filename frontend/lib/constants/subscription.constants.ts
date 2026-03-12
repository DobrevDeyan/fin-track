export const SCAN_LIMITS = {
  free: 0,
  pro: 30,
  business: 150,
} as const

export const FREE_TIER_LIMITS = {
  transactions: 50, // per month
  budgets: 3,
  goals: 2,
  savingsAccounts: 1,
  recurringTransactions: 3,
} as const
