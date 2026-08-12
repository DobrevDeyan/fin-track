/**
 * Feature power-switch — launch scope control.
 *
 * Flip a flag to `false` to HIDE a feature everywhere it is surfaced — nav entry,
 * dashboard section, and direct route access — WITHOUT deleting any code. The
 * routes, components, contexts, and data all still exist; they are simply not
 * shown. Set a flag back to `true` to re-enable instantly.
 *
 * Rationale for the current launch scope: keep the core loop + AI differentiator,
 * defer the standalone breadth until the core is proven. See the keep/cut analysis
 * in the launch discussion.
 */
export const FEATURES = {
  // ── Deferred for a focused launch (OFF) ──────────────────────────────────
  subscriptions: false,    // /subscriptions — Subscription Tracker
  debt: false,             // /debt — Debt Payoff Planner
  leaderboard: false,      // /leaderboard — community leaderboard (needs scale to not feel empty)
  family: false,           // Family Budgeting / households (high complexity, empty with 1 user)
  savingsAccounts: false,  // dashboard "Savings" tab — virtual savings accounts
  cashFlowForecast: false, // dashboard 90-day forecast (needs solid recurring data first)

  // ── Core loop + differentiator (ON) — listed for a single source of truth ─
  transactions: true,
  budgets: true,
  goals: true,
  recurring: true,
  reports: true,
  calendar: true,
  receiptScanning: true,
  healthScore: true,
  anomalyDetection: true,
  aiInsights: true,        // AI digest + budget coach chat
  achievementCards: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export const isFeatureEnabled = (key: FeatureKey): boolean => FEATURES[key];

/**
 * Route path → feature flag. Used to hide nav entries and to redirect direct
 * navigation to a disabled feature's URL back to the dashboard.
 */
export const ROUTE_FEATURE: Partial<Record<string, FeatureKey>> = {
  "/subscriptions": "subscriptions",
  "/debt": "debt",
  "/leaderboard": "leaderboard",
};
