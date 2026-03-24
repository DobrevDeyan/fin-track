export const SCAN_LIMITS = {
  free: 3,   // teaser: 3 free scans so users experience the feature
  pro: 10,   // 10 scans = $1.00 Doc AI cost, leaves margin at 2.99 EUR/month
  business: 50,
} as const

export const FREE_TIER_LIMITS = {
  transactions: 50, // per month
  budgets: 3,
  goals: 2,
  savingsAccounts: 1,
  recurringTransactions: 3,
} as const
