// MUST stay in sync with ml-service/src/firestore-quota.ts SCAN_LIMITS —
// the server is authoritative; this copy only drives UI copy and gating.
// (They deploy as separate packages, so there's no shared module — keep values equal.)
export const SCAN_LIMITS = {
  free: 5,   // acquisition hook — Gemini vision is ~$0.0005/scan, so free scans are ~free
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
