export const SCAN_LIMITS = {
  free: 3,   // teaser: 3 free scans so users experience the feature
  pro: 10,   // 10 scans = $1.00 Doc AI cost, leaves margin at 2.99 EUR/month
  business: 50,
} as const

export const FREE_TIER_LIMITS = {
  transactions: 100, // raised to 100 for beta (was 50)
  budgets: 5,
  goals: 3,
  savingsAccounts: 2,
  recurringTransactions: 5,
} as const
