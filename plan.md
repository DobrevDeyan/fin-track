# Pocket — Product Plan & Implementation Log

## Feature Priority Assessment

Ranked by user acquisition impact, not technical complexity.

### 1. Bank Connectivity (Open Banking / Plaid) — NOT YET BUILT
Highest single impact. Manual entry is the primary reason people abandon personal finance apps before they see value. Every competitor that added automatic import saw massive conversion lift.
- EU: GoCardless (formerly Nordigen) — free tier, PSD2 bank feeds
- US: Plaid
- Collapses time-to-value from weeks to minutes
- **Status**: Deferred — awaiting API keys from user

### 2. Shared / Family Budgeting — ✅ IMPLEMENTED
Built-in viral loop: one user invites their partner. Fastest path to organic acquisition.

**What's built:**
- `HouseholdDocument`, `HouseholdMember`, `HouseholdInviteDocument` types in `firestore-types.ts`
- Firestore rules: `households` (read by `memberUids` flat array), `householdInvites` (owner-only read)
- Cloud Functions (`europe-west4`):
  - `createHousehold` — creates household, sets owner as first member (email from auth token, lowercased)
  - `sendHouseholdInvite` — creates 7-day invite token, expires old pending invites for same email
  - `acceptHouseholdInvite` — validates token + email match, adds member via `arrayUnion`, sets `householdId` on user doc
  - `getHouseholdEntries` — returns merged entries for all household members
  - `leaveHousehold` — removes member, transfers ownership if owner leaves, deletes household if last member
  - `getMyHousehold` — Admin SDK lookup by user doc pointer → ownerUid fallback → members fallback; backfills `memberUids` if missing
- `firestore-household.ts` — callable wrappers + `subscribeToHousehold` listener
- `HouseholdContext.tsx` — loads via `getMyHousehold` CF on mount; `onSnapshot` for live member updates; exposes `refreshHousehold()` for manual refresh
- `settings/page.tsx` — household card: create, invite by email, copy link, send via email app, leave; "↻ Refresh" button to pull latest members
- `household/accept/page.tsx` — public page (outside `(app)` auth group), handles unauthenticated users with login redirect using `?returnUrl=` param
- `dashboard/page.tsx` — Personal / Family toggle in header; merged family transactions view

**Known gotcha:** `getHouseholdEntries` uses `where("userId", "in", [...]) + orderBy("date", "desc")` — Firestore will prompt for a composite index the first time it runs. Follow the Firebase Console link in the error.

**Bugs fixed post-launch:**
- `onSnapshot` error callback was clearing household state on permission errors → changed to no-op; CF-loaded data preserved
- `createHousehold` stored email from user doc (could be empty) → now uses `request.auth?.token?.email` (verified auth token)
- `AcceptInviteContent` redirect used `?redirect=` param but login page reads `?returnUrl=` → invite token was silently lost after login
- Firestore rules used `members.map(m, m.uid)` (CLI warnings) → replaced with flat `memberUids` string array

### 3. Subscription Tracker (/subscriptions) — ✅ IMPLEMENTED

**What's built** (`frontend/app/(app)/subscriptions/page.tsx`):
- Loads all recurring transactions, filters to expenses only
- Monthly + annual cost summary cards
- Category breakdown with progress bars (proportional to total monthly spend)
- Sort by cost / name / next charge date
- Pause/resume any subscription with one tap (calls `updateRecurringTransaction`)
- ⚠ Flags subscriptions taking >30% of total spend (AlertTriangle icon)
- Savings tip: shows how much you'd save cancelling the top active item
- Navigation entry added to AppNavbar (desktop + mobile)

### 4. Shareable Achievement Cards — ✅ IMPLEMENTED

**What's built** (`frontend/components/dashboard/AchievementCard.tsx`):
- Share icon overlaid on the Health Score card on the dashboard
- Opens a dialog with a gradient card (color-coded by health tier) showing: health score + tier label, income, expenses, savings rate %, net savings
- Download as PNG — `html2canvas` at 3× resolution for crisp social sharing
- Native Share Sheet on mobile (`navigator.share`) — falls back to download on desktop
- Background decoration circles, Pocket branding, and current month in the card

### 5. App Store Listing (TWA) — NOT YET BUILT
Already a PWA. TWA submission to Google Play is low effort; iOS (Capacitor) requires more work.
- **Status**: Deferred — non-code task

### 6. Debt Payoff Planner (/debt) — ✅ IMPLEMENTED

**What's built** (`frontend/app/(app)/debt/page.tsx`):
- Add any number of debts: credit card, personal loan, mortgage, student loan, other
- Debts persist to Firestore at `userDebts/{userId}` via `getUserDebts` / `saveUserDebts`
- Snowball vs Avalanche strategy toggle with explanations
- Extra monthly payment input (on top of minimums)
- "Debt-free by [Month Year]" headline card
- Total interest to pay summary
- Recharts `AreaChart` showing balance declining over time (quarterly data points, 50-year cap)
- Side-by-side strategy comparison: which is faster / cheaper
- Add/Edit/Delete debts via Dialog forms
- Saving indicator (bottom-right toast-style indicator while persisting)
- Firestore rule: `userDebts/{userId}` read/write by owner only
- Navigation entry added to AppNavbar (desktop + mobile)
- `DebtItem`, `DebtType`, `UserDebtsDocument` types added to `firestore-types.ts`

---

## What to Deprioritize
- **Tax export** — important for retention, not acquisition
- **Investment portfolio tracking** — high complexity, niche at this scale
- **Advanced custom reports** — power user feature, won't move the acquisition needle

---

## Architecture Notes

### Security
- All Firestore writes for household data go through Cloud Functions (Admin SDK) — client never writes directly
- `memberUids` flat string array used for Firestore `in` checks (nested object `.map()` queries had CLI warnings and reliability issues)
- ML service endpoints protected by Firebase Auth token verification + `express-rate-limit`
- All user-originated strings sanitized (`sanitizeInput`/`sanitizeLabel`) before Gemini prompts

### Currency Formatting
- Use `formatCurrency(amount, { currency: userCurrency })` from `@/lib/currency-utils`
- Do NOT destructure `formatAmount` or `fmt` from `useCurrency()` — those don't exist
- Pattern: `const { userCurrency } = useCurrency(); const fmt = (n: number) => formatCurrency(n, { currency: userCurrency })`

### Exchange Rates
- Frankfurter API is proxied through `/api/exchange-rate` (Next.js API route) to avoid CORS
- `frontend/lib/exchange-rate.ts` calls `/api/exchange-rate` not the external URL directly

### Recurring Transactions
- `nextDate` is a Firestore `Timestamp` — call `.toDate()` before date math
- `updateRecurringTransaction(id, patch)` for partial updates (used by subscription pause/resume)

---

---

# Feature Module Map — Testing & Development Guide

> Use this section to work on one feature at a time without touching the rest of the app.
> Each module lists every file it owns, what's already tested, and what to test next.

---

## How to Run Tests

```bash
cd frontend
npm test                  # run all tests once
npm run test:watch        # watch mode — re-runs on save
npm run test:coverage     # coverage report in /coverage
npm run test:ci           # CI mode (no watch, exits with code)
```

Test files live in `frontend/__tests__/` mirroring the source tree:
- `__tests__/components/` → component tests
- `__tests__/lib/` → utility/hook tests

---

## Module 1 — Authentication

**What it does:** Sign in, register, forgot password, Google OAuth, session management, route protection.

**Files:**
```
frontend/app/auth/
  login/page.tsx          — email/password + Google sign-in, reads ?returnUrl for post-login redirect
  register/page.tsx       — registration, reads ?returnUrl for post-register redirect
  forgot-password/page.tsx

frontend/contexts/AuthContext.tsx   — user state, signIn, signUp, signOut, signInWithGoogle
frontend/components/auth/AuthGuard.tsx  — wraps protected routes, redirects unauthenticated users
frontend/lib/firestore-users.ts     — createUserDocument, updateUserDisplayName, deleteUserData, etc.
```

**Already tested:** None

**Test targets (priority order):**
1. `AuthContext` — mock `firebase/auth`; test signIn sets user, signOut clears it, Google flow works
2. `AuthGuard` — renders children when user exists, redirects to `/auth/login` when not
3. Login page — `returnUrl` param survives login and redirects correctly after auth
4. Register page — same `returnUrl` handling; password validation edge cases

---

## Module 2 — Transactions (Core)

**What it does:** The financial data backbone. Add, edit, delete, filter, and list income/expense entries.

**Files:**
```
frontend/lib/firestore-entries.ts       — addEntry, updateEntry, deleteEntry, getEntries, subscribeToEntries
frontend/lib/hooks/dashboard/useEntries.ts
frontend/lib/utils/transaction-filters.ts
frontend/lib/utils/categories.ts
frontend/lib/utils/category-detector.ts  — ML-based auto-category from description

frontend/components/dashboard/
  AddTransactionDialog.tsx
  TransactionsTable.tsx
  VirtualizedTransactionTable.tsx
  TransactionFilters.tsx
  QuickExpenseFAB.tsx
  QuickExpenseSheet.tsx

frontend/contexts/dashboard/FinancialSummaryContext.tsx
```

**Cloud Functions triggered:**
- `checkBudgetOnEntry` — fires on entry create, checks budget violations
- `onEntryDeleted` — fires on entry delete, cleans up related data
- `onLargeEntryCreated` — fires on large entry create

**Already tested:**
- `AddTransactionDialog.test.tsx` ✅
- `TransactionsTable.test.tsx` ✅

**Test targets (priority order):**
1. `transaction-filters.ts` — filter by date range, category, type, amount range
2. `category-detector.ts` — known descriptions map to correct categories
3. `useEntries` hook — mock Firestore; test add/delete/subscribe flow
4. `QuickExpenseSheet` — amount input, category select, submit

---

## Module 3 — Budgets

**What it does:** Create monthly/weekly/yearly budgets per category. Track spend vs limit. Alert when over threshold.

**Files:**
```
frontend/lib/firestore-budgets.ts
frontend/lib/hooks/dashboard/useBudgets.ts
frontend/contexts/dashboard/BudgetsContext.tsx

frontend/components/dashboard/
  BudgetCard.tsx
  BudgetDialog.tsx
  BudgetList.tsx
  BudgetProgressBar.tsx
  sections/BudgetsSection.tsx
```

**Cloud Functions triggered:**
- `checkBudgetOnEntry` — sends notification when budget threshold crossed

**Already tested:**
- `BudgetCard.test.tsx` ✅
- `sections/BudgetsSection.test.tsx` ✅

**Test targets (priority order):**
1. `BudgetProgressBar` — renders correct % fill, correct color at >80%, >100%
2. `BudgetsContext` — mock Firestore; budget CRUD lifecycle
3. `BudgetDialog` — form validation: amount must be positive, end date after start date

---

## Module 4 — Goals

**What it does:** Financial savings goals with target amounts and deadlines.

**Files:**
```
frontend/lib/firestore-goals.ts
frontend/lib/hooks/dashboard/useGoals.ts
frontend/contexts/dashboard/GoalsContext.tsx

frontend/components/dashboard/
  GoalCard.tsx
  GoalDialog.tsx
  GoalList.tsx
  sections/GoalsSection.tsx
```

**Already tested:**
- `GoalCard.test.tsx` ✅

**Test targets (priority order):**
1. `GoalsContext` — mock Firestore; add/update/delete goal lifecycle
2. `GoalDialog` — deadline in the past should be rejected; target ≤ 0 should be rejected
3. `GoalCard` — progress bar reflects currentAmount / targetAmount correctly

---

## Module 5 — Recurring Transactions

**What it does:** Scheduled income/expense entries that auto-generate on their due date.

**Files:**
```
frontend/lib/firestore-recurring.ts
frontend/lib/hooks/dashboard/useRecurringTransactions.ts
frontend/contexts/dashboard/RecurringContext.tsx

frontend/components/dashboard/
  RecurringTransactionCard.tsx
  RecurringTransactionDialog.tsx
  RecurringTransactionList.tsx
  sections/RecurringSection.tsx

frontend/app/(app)/subscriptions/page.tsx   — Subscription Tracker view over recurring data
```

**Cloud Functions:**
- `processRecurringTransactionsScheduled` — runs daily 01:00 UTC; creates entries for due items
- `processMyRecurringTransactions` — user-callable; processes their overdue items on demand
- `resetMonthlyScanCounts` — unrelated to recurring logic; just shares the scheduler

**Test targets (priority order):**
1. `useRecurringTransactions` — mock Firestore; create/update/pause/delete lifecycle
2. `RecurringTransactionDialog` — frequency validation; nextDate must be in future
3. Subscriptions page filtering logic — only expenses shown, sorted correctly by cost

---

## Module 6 — Savings Accounts

**What it does:** Named savings pots. Manual balance tracking with fund allocation from transactions.

**Files:**
```
frontend/lib/firestore-savings.ts
frontend/lib/hooks/dashboard/useSavingsAccounts.ts
frontend/contexts/dashboard/SavingsContext.tsx

frontend/components/dashboard/
  SavingsAccountCard.tsx
  SavingsAccountDialog.tsx
  SavingsAccountList.tsx
  AddFundsDialog.tsx
  sections/SavingsSection.tsx
```

**Test targets (priority order):**
1. `SavingsContext` — mock Firestore; create/update/delete accounts
2. `AddFundsDialog` — amount must be positive; cannot exceed available balance (if applicable)
3. `SavingsAccountCard` — displays balance with correct currency formatting

---

## Module 7 — Household / Family Budgeting

**What it does:** Shared workspace. Owner creates household, invites members by email, everyone sees merged transactions in Family view.

**Files:**
```
frontend/lib/firestore-household.ts     — callable wrappers, subscribeToHousehold
frontend/lib/firestore-types.ts         — HouseholdDocument, HouseholdMember, HouseholdInviteDocument
frontend/contexts/HouseholdContext.tsx  — state: householdId, household, isHouseholdMode, entries, error

frontend/app/household/accept/
  page.tsx                  — public page, Suspense wrapper
  AcceptInviteContent.tsx   — invite flow: idle → loading → success/error/wrong-email

frontend/app/(app)/settings/page.tsx    — household card section (~lines 118–560)
frontend/app/(app)/dashboard/page.tsx   — Personal/Family toggle + merged entries view

functions/src/index.ts                  — createHousehold, sendHouseholdInvite, acceptHouseholdInvite,
                                           getHouseholdEntries, leaveHousehold, getMyHousehold
firestore.rules                         — households (memberUids-based read), householdInvites
```

**Key invariants to preserve:**
- `memberUids` must always stay in sync with `members` array — updated atomically in every CF
- Client never writes to `households` or `householdInvites` — Admin SDK only
- Invite token is 32 bytes hex, expires in 7 days, single-use (status flipped to "accepted" on use)

**Test targets (priority order):**
1. `AcceptInviteContent` — all 5 status states render correctly (idle, loading, success, error, wrong-email)
2. `HouseholdContext` — mock `callGetMyHousehold`; verify householdId/household populate correctly; verify `isHouseholdMode` resets to false when householdId becomes null
3. Invite flow — unauthenticated user → sign in button → `?returnUrl=` param is preserved → after login lands back on accept page
4. Settings household section — create form; invite form; leave button triggers confirmation dialog

---

## Module 8 — Reports & Analytics

**What it does:** Spending charts, year-over-year comparisons, cash flow forecasting.

**Files:**
```
frontend/app/(app)/reports/page.tsx
frontend/lib/firestore-summary.ts
frontend/lib/utils/metrics-utils.ts       — financial health score, savings rate, etc.
frontend/lib/utils/date-range-utils.ts

frontend/components/dashboard/
  MetricsCards.tsx
  SpendingChart.tsx
  CategoryChart.tsx
  YearOverYearChart.tsx
  CashFlowForecast.tsx
  HealthScoreCard.tsx
  AchievementCard.tsx                     — shareable PNG card

frontend/contexts/dashboard/FinancialSummaryContext.tsx
```

**Already tested:**
- `metrics-utils.test.ts` ✅

**Test targets (priority order):**
1. `metrics-utils` — edge cases: zero income, negative net, 100% savings rate
2. `date-range-utils` — month boundary calculations, leap year handling
3. `CashFlowForecast` — verify projected balance formula with known inputs
4. `HealthScoreCard` — correct tier label per score range

---

## Module 9 — AI & Insights

**What it does:** AI-generated monthly digest, anomaly detection, AI chat drawer.

**Files:**
```
frontend/lib/insights-api.ts            — calls ML service
frontend/lib/insights-engine.ts         — local insight processing (no AI)
frontend/lib/firestore-insights.ts      — cache read/write
frontend/contexts/dashboard/InsightsContext.tsx

frontend/components/dashboard/
  AIDigest.tsx
  AnomalyAlert.tsx
  AIChatDrawer.tsx
```

**Test targets (priority order):**
1. `insights-engine.ts` — anomaly detection logic with mocked transaction data
2. `AnomalyAlert` — renders when anomaly exists, hides when none
3. `InsightsContext` — mock `insights-api`; test loading/error/cached states

---

## Module 10 — Receipts

**What it does:** Scan receipts via camera or upload. OCR extracts amount/merchant/date and pre-fills the transaction form.

**Files:**
```
frontend/app/(app)/receipts/page.tsx
frontend/lib/receipt-scanner-api.ts
frontend/lib/receipt-utils.ts
frontend/lib/hooks/useScanQuota.ts

frontend/components/dashboard/
  ReceiptScannerDialog.tsx
  CameraCapture.tsx
```

**Test targets (priority order):**
1. `useScanQuota` — mock Firestore; quota increments, resets at month boundary
2. `receipt-utils` — amount parsing from OCR output: handles decimals, currency symbols, edge cases
3. `ReceiptScannerDialog` — shows quota warning when limit approached; disables scan at limit

---

## Module 11 — Debt Payoff Planner

**What it does:** Snowball vs Avalanche debt payoff calculator with timeline chart.

**Files:**
```
frontend/app/(app)/debt/page.tsx
frontend/lib/firestore-debt.ts          — getUserDebts, saveUserDebts
frontend/lib/firestore-types.ts         — DebtItem, DebtType, UserDebtsDocument
```

**Test targets (priority order):**
1. Snowball calculation — pays smallest balance first; verify payoff order with 3 debts
2. Avalanche calculation — pays highest interest first; verify payoff order with 3 debts
3. "Debt-free by" date — known inputs produce expected month/year output
4. Interest calculation — total interest matches manual calculation for simple case

---

## Module 12 — Leaderboard

**What it does:** Anonymous opt-in leaderboard comparing financial health scores across users.

**Files:**
```
frontend/app/(app)/leaderboard/page.tsx
frontend/lib/firestore-leaderboard.ts
frontend/components/leaderboard/DistributionChart.tsx

functions/src/index.ts   — aggregateLeaderboard (scheduled), updateLeaderboardOptIn, triggerLeaderboardAggregation
```

**Test targets (priority order):**
1. Opt-in/out toggle — persists to Firestore, UI reflects state immediately
2. `DistributionChart` — renders without crash when no data; renders correctly with mock data

---

## Module 13 — Calendar View

**What it does:** Monthly calendar showing transactions on their dates.

**Files:**
```
frontend/app/(app)/calendar/page.tsx
frontend/components/dashboard/
  CalendarView.tsx
  CalendarDayCell.tsx
  CalendarEventPopover.tsx
```

**Test targets (priority order):**
1. `CalendarView` — correct number of cells for month; transactions appear on correct day
2. `CalendarDayCell` — shows income/expense indicators; clicking opens popover
3. Month navigation — previous/next month changes displayed entries

---

## Module 14 — Net Worth

**What it does:** Track total net worth over time across assets and accounts.

**Files:**
```
frontend/app/(app)/net-worth/page.tsx
frontend/lib/firestore-networth.ts
```

**Test targets (priority order):**
1. Net worth calculation — assets minus liabilities equals displayed total
2. History chart — data points match Firestore records

---

## Module 15 — Notifications

**What it does:** In-app notification bell + push notifications. Budget alerts, salary reminders.

**Files:**
```
frontend/app/(app)/notifications/page.tsx
frontend/lib/hooks/useNotifications.ts
frontend/lib/hooks/useInAppNotifications.ts
frontend/lib/notification-service.ts
frontend/lib/firebase-messaging.ts

frontend/components/notifications/
  NotificationBell.tsx
  NotificationPanel.tsx
  NotificationListener.tsx
  SalaryReminderNotification.tsx

functions/src/index.ts   — sendTestPush, deleteMyNotifications, checkBudgetOnEntry (sends alert)
```

**Test targets (priority order):**
1. `NotificationBell` — badge count increments with unread notifications
2. `NotificationPanel` — marks as read on click; empty state when no notifications
3. `useNotifications` — mock Firestore; permission states (granted/denied/default)

---

## Module 16 — Settings

**What it does:** Display name, currency, language, theme, Stripe billing, data reset, account deletion.

**Files:**
```
frontend/app/(app)/settings/page.tsx   — all settings in one page
frontend/contexts/CurrencyContext.tsx
frontend/contexts/LanguageContext.tsx
frontend/contexts/ThemeContext.tsx
frontend/lib/firestore-users.ts
frontend/components/ThemeControls.tsx
frontend/components/BillingPortalButton.tsx
frontend/components/ui/UpgradePrompt.tsx
frontend/lib/hooks/useSubscription.ts
frontend/lib/stripe.ts
```

**Test targets (priority order):**
1. `useSubscription` — mock Firestore; free tier vs pro tier flags set correctly
2. Currency change — `CurrencyContext` updates, `formatCurrency` uses new currency everywhere
3. Display name save — calls `updateUserDisplayName`, shows success toast
4. Delete account flow — confirmation text must match exactly before button enables

---

## Module 17 — Utilities (shared across all modules)

**What it does:** Pure functions used across the app. No Firebase, no React.

**Files:**
```
frontend/lib/utils/
  date-utils.ts
  currency-utils.ts
  metrics-utils.ts
  export-utils.ts
  validation.ts
  transaction-filters.ts
  date-range-utils.ts
  color-utils.ts
  error.ts
  logger.ts
  timestamp.ts
```

**Already tested:**
- `date-utils.test.ts` ✅
- `currency-utils.test.ts` ✅
- `metrics-utils.test.ts` ✅
- `export-utils.test.ts` ✅
- `validation.test.ts` ✅

**Test targets (remaining gaps):**
1. `date-range-utils` — month boundary edge cases, leap years
2. `transaction-filters` — combined filter conditions, empty results
3. `color-utils` — color interpolation at 0%, 50%, 100%

---

## Testing Cheat Sheet

### Mock Firebase in a test
```ts
// jest.setup.js already mocks firebase — use this pattern in any test:
import { getFirestore } from 'firebase/firestore'
jest.mock('firebase/firestore')
const mockGet = jest.fn().mockResolvedValue({ data: () => ({...}), exists: () => true })
;(getFirestore as jest.Mock).mockReturnValue({ collection: () => ({ doc: () => ({ get: mockGet }) }) })
```

### Mock a Cloud Function callable
```ts
import { httpsCallable } from 'firebase/functions'
jest.mock('firebase/functions')
;(httpsCallable as jest.Mock).mockReturnValue(() => Promise.resolve({ data: { householdId: 'h1' } }))
```

### Render a component that uses a context
```ts
import { render } from '@testing-library/react'
import { HouseholdProvider } from '@/contexts/HouseholdContext'

const wrapper = ({ children }) => <HouseholdProvider>{children}</HouseholdProvider>
render(<MyComponent />, { wrapper })
```

### Test a hook directly
```ts
import { renderHook, act } from '@testing-library/react'
import { useBudgets } from '@/lib/hooks/dashboard/useBudgets'

const { result } = renderHook(() => useBudgets(), { wrapper })
act(() => result.current.addBudget({ ... }))
expect(result.current.budgets).toHaveLength(1)
```

---

## Current Test Coverage Gaps (by risk)

| Module | Risk if Untested | Priority |
|--------|-----------------|----------|
| Household invite flow | High — multi-step, auth-dependent | 🔴 High |
| Debt calculation (snowball/avalanche) | High — pure math, easy to get wrong | 🔴 High |
| Transaction filters | High — used everywhere | 🔴 High |
| useEntries hook | High — core data layer | 🔴 High |
| Auth redirect (returnUrl) | Medium — fixed manually before | 🟡 Medium |
| Budget threshold alerts | Medium — Cloud Function trigger | 🟡 Medium |
| Category auto-detection | Medium — affects UX at entry creation | 🟡 Medium |
| Recurring date calculations | Medium — used in scheduler | 🟡 Medium |
| useScanQuota | Low — simple counter | 🟢 Low |
| CalendarView layout | Low — visual only | 🟢 Low |
