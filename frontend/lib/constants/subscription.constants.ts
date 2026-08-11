// MUST stay in sync with ml-service/src/firestore-quota.ts SCAN_LIMITS —
// the server is authoritative; this copy only drives UI copy and gating.
export const SCAN_LIMITS = {
  free: 0,   // paid feature — Document AI costs $0.10/scan, see firestore-quota.ts
  pro: 10,
  business: 50,
} as const

export const FREE_TIER_LIMITS = {
  transactions: 100, // raised to 100 for beta (was 50)
  budgets: 5,
  goals: 3,
  savingsAccounts: 2,
  recurringTransactions: 5,
} as const
