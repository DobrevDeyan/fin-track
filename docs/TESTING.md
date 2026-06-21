# Pocket — Testing Guide

---

## Part 1: Feature Module Map

> Use this to work on one feature at a time without touching the rest of the app.
> Each module lists every file it owns, what's already tested, and what to test next.

### How to Run Tests

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

### Module 1 — Authentication

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

### Module 2 — Transactions (Core)

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
- `onEntryDeleted` — fires on entry delete, writes audit log
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

### Module 3 — Budgets

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
- `checkBudgetOnEntry` — sends FCM notification when budget threshold crossed

**Already tested:**
- `BudgetCard.test.tsx` ✅
- `sections/BudgetsSection.test.tsx` ✅

**Test targets (priority order):**
1. `BudgetProgressBar` — correct % fill, correct color at >80%, >100%
2. `BudgetsContext` — mock Firestore; budget CRUD lifecycle
3. `BudgetDialog` — form validation: amount must be positive, end date after start date

---

### Module 4 — Goals

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

### Module 5 — Recurring Transactions

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
- `processRecurringTransactionsScheduled` — daily 01:00 UTC; creates entries for due items
- `processMyRecurringTransactions` — user-callable; processes their overdue items on demand

**Test targets (priority order):**
1. `useRecurringTransactions` — mock Firestore; create/update/pause/delete lifecycle
2. `RecurringTransactionDialog` — frequency validation; nextDate must be in future
3. Subscriptions page filtering — only expenses shown, sorted correctly by cost

---

### Module 6 — Savings Accounts

**What it does:** Named savings pots with manual balance tracking.

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
2. `AddFundsDialog` — amount must be positive
3. `SavingsAccountCard` — displays balance with correct currency formatting

---

### Module 7 — Household / Family Budgeting

**What it does:** Shared workspace. Owner creates household, invites members by email, everyone sees merged transactions in Family view. Now includes shared household budgets and goals.

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

frontend/lib/firestore-household-budgets.ts — CRUD for shared budgets
frontend/lib/firestore-household-goals.ts   — CRUD for shared goals + contributions
frontend/contexts/dashboard/HouseholdBudgetsContext.tsx
frontend/contexts/dashboard/HouseholdGoalsContext.tsx

frontend/components/dashboard/
  HouseholdBudgetsSection.tsx
  HouseholdGoalsSection.tsx
  HouseholdGoalCard.tsx

functions/src/index.ts                  — createHousehold, sendHouseholdInvite, acceptHouseholdInvite,
                                           getHouseholdEntries, leaveHousehold, getMyHousehold
firestore.rules                         — households, householdBudgets, householdGoals
```

**Key invariants to preserve:**
- `memberUids` must stay in sync with `members` array — updated atomically in every CF
- Client never writes to `households` or `householdInvites` — Admin SDK only
- Shared budgets/goals are written directly by clients (rules allow membership-based writes)
- Invite token is 32-byte hex, expires in 7 days, single-use (status flipped to "accepted" on use)

**Test targets (priority order):**
1. `AcceptInviteContent` — all 5 status states render (idle, loading, success, error, wrong-email)
2. `HouseholdContext` — mock `callGetMyHousehold`; verify householdId/household populate; verify `isHouseholdMode` resets to false when householdId becomes null
3. Household Budgets — verify CRUD only visible in Family mode; verify edits sync for all members
4. Household Goals — verify contribution logic; verify progress updates for all members
5. Invite flow — unauthenticated user → sign in → `?returnUrl=` preserved → lands back on accept page after login
6. Settings household section — create form; invite form; leave button triggers confirmation dialog

---

### Module 8 — Reports & Analytics

**What it does:** Spending charts, year-over-year comparisons, cash flow forecasting.

**Files:**
```
frontend/app/(app)/reports/page.tsx
frontend/lib/firestore-summary.ts
frontend/lib/utils/metrics-utils.ts
frontend/lib/utils/date-range-utils.ts

frontend/components/dashboard/
  MetricsCards.tsx
  SpendingChart.tsx
  CategoryChart.tsx
  YearOverYearChart.tsx
  CashFlowForecast.tsx
  HealthScoreCard.tsx
  AchievementCard.tsx

frontend/contexts/dashboard/FinancialSummaryContext.tsx
```

**Already tested:**
- `metrics-utils.test.ts` ✅

**Test targets (priority order):**
1. `metrics-utils` — edge cases: zero income, negative net, 100% savings rate
2. `date-range-utils` — month boundary calculations, leap year handling
3. `CashFlowForecast` — projected balance formula with known inputs
4. `HealthScoreCard` — correct tier label per score range

---

### Module 9 — AI & Insights

**What it does:** AI-generated monthly digest, anomaly detection, cash flow forecast, AI chat drawer.

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
2. `AnomalyAlert` — renders when anomaly exists, hidden when none
3. `InsightsContext` — mock `insights-api`; test loading/error/cached states

---

### Module 10 — Receipts

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
2. `receipt-utils` — amount parsing from OCR output: decimals, currency symbols, edge cases
3. `ReceiptScannerDialog` — shows quota warning when limit approached; disables scan at limit

---

### Module 11 — Debt Payoff Planner

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
3. "Debt-free by" date — known inputs produce expected month/year
4. Interest calculation — total interest matches manual calculation for simple case

---

### Module 12 — Leaderboard

**What it does:** Anonymous opt-in leaderboard comparing financial health scores across users.

**Files:**
```
frontend/app/(app)/leaderboard/page.tsx
frontend/lib/firestore-leaderboard.ts
frontend/components/leaderboard/DistributionChart.tsx

functions/src/index.ts   — aggregateLeaderboard (scheduled), updateLeaderboardOptIn
```

**Test targets (priority order):**
1. Opt-in/out toggle — persists to Firestore, UI reflects state immediately
2. `DistributionChart` — renders without crash when no data; renders correctly with mock data

---

### Module 13 — Calendar View

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
1. `CalendarView` — correct number of cells for month; transactions on correct day
2. `CalendarDayCell` — income/expense indicators; clicking opens popover
3. Month navigation — previous/next month changes displayed entries

---

### Module 14 — Net Worth

**What it does:** Track total net worth across assets and liabilities.

**Files:**
```
frontend/app/(app)/net-worth/page.tsx
frontend/lib/firestore-networth.ts
```

**Test targets (priority order):**
1. Net worth calculation — assets minus liabilities equals displayed total
2. History chart — data points match Firestore records

---

### Module 15 — Notifications

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

functions/src/index.ts   — sendTestPush, deleteMyNotifications, checkBudgetOnEntry
```

**Test targets (priority order):**
1. `NotificationBell` — badge count increments with unread notifications
2. `NotificationPanel` — marks as read on click; empty state when no notifications
3. `useNotifications` — mock Firestore; permission states (granted/denied/default)

---

### Module 16 — Settings

**What it does:** Display name, currency, language, theme, Stripe billing, data reset, account deletion.

**Files:**
```
frontend/app/(app)/settings/page.tsx
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
1. `useSubscription` — mock Firestore; free vs pro tier flags set correctly
2. Currency change — `CurrencyContext` updates, `useMoney()` reflects new currency everywhere
3. Display name save — calls `updateUserDisplayName`, shows success toast
4. Delete account flow — confirmation text must match exactly before button enables

---

### Module 17 — Utilities (shared)

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
| Household invite flow | High — multi-step, auth-dependent | High |
| Debt calculation (snowball/avalanche) | High — pure math, easy to get wrong | High |
| Transaction filters | High — used everywhere | High |
| useEntries hook | High — core data layer | High |
| Auth redirect (returnUrl) | Medium — fixed manually before | Medium |
| Budget threshold alerts | Medium — Cloud Function trigger | Medium |
| Category auto-detection | Medium — affects UX at entry creation | Medium |
| Recurring date calculations | Medium — used in scheduler | Medium |
| useScanQuota | Low — simple counter | Low |
| CalendarView layout | Low — visual only | Low |

---

## Part 2: Manual Functional Test Plan

> **Purpose:** Step-by-step guide to manually verify every feature end-to-end before shipping to users. Each section lists the files involved, the exact user actions to perform, the data flow triggered, and what to watch for.

---

## Table of Contents

1. [Authentication & Onboarding](#1-authentication--onboarding)
2. [Dashboard Overview & Metrics](#2-dashboard-overview--metrics)
3. [Transaction Management](#3-transaction-management)
4. [Budgets](#4-budgets)
5. [Savings Accounts](#5-savings-accounts)
6. [Recurring Transactions](#6-recurring-transactions)
7. [Cash Flow Forecast](#7-cash-flow-forecast)
8. [Financial Health Score](#8-financial-health-score)
9. [Anomaly Detection](#9-anomaly-detection)
10. [Calendar View](#10-calendar-view)
11. [Receipt Scanning](#11-receipt-scanning)
12. [Reports & Export](#12-reports--export)
13. [AI Features](#13-ai-features)
14. [Net Worth Tracking](#14-net-worth-tracking)
15. [Community Leaderboard](#15-community-leaderboard)
16. [Notifications](#16-notifications)
17. [Settings & Profile](#17-settings--profile)
18. [Navigation & Mobile UX](#18-navigation--mobile-ux)
19. [Subscription / Pro Gating](#19-subscription--pro-gating)
20. [Cross-Feature Consistency Checks](#20-cross-feature-consistency-checks)

---

## 1. Authentication & Onboarding

### Files Involved
- `app/auth/login/page.tsx`
- `app/auth/register/page.tsx`
- `app/auth/forgot-password/page.tsx`
- `contexts/AuthContext.tsx`
- `components/auth/AuthGuard.tsx`
- `components/onboarding/OnboardingScreen.tsx`
- `components/onboarding/OnboardingDialog.tsx`
- `lib/firestore-users.ts`

### Data Flow
Register/Login → Firebase Auth creates session → `AuthContext` sets `user` → `AuthGuard` allows route access → `useEffect` checks `users/{uid}` doc for `onboardingComplete` → if false, shows `OnboardingScreen`.

### Test Scenarios

#### 1.1 Registration
1. Go to `/auth/register`
2. Fill in email + password, submit
3. **Expect:** Redirected to dashboard; onboarding wizard appears
4. **Check:** Firestore `users/{uid}` document created with `onboardingComplete: false`
5. **Edge cases:**
   - Try registering with an already-used email → expect clear error message
   - Try weak password (< 6 chars) → expect validation error before submit
   - Leave fields empty → expect inline validation, no Firebase call

#### 1.2 Onboarding Wizard
1. Complete the wizard: set salary, choose currency, add first recurring transaction
2. **Expect:** `onboardingComplete: true` written to Firestore; wizard dismissed
3. **Check:** Dashboard metrics reflect the salary entered; recurring transaction appears in Recurring tab
4. **Edge case:** Close/refresh mid-wizard → wizard should reappear on next load

#### 1.3 Login
1. Go to `/auth/login`, enter correct credentials
2. **Expect:** Redirect to `/dashboard`
3. **Edge cases:**
   - Wrong password → clear error, no redirect
   - Non-existent email → clear error
   - Network offline → graceful error message, no crash

#### 1.4 Forgot Password
1. Enter registered email, submit
2. **Expect:** Firebase sends reset email; UI shows confirmation message
3. **Edge case:** Enter unknown email → Firebase may still show success (security best practice); verify no crash

#### 1.5 Auth Guard
1. While logged out, navigate to `/dashboard` directly
2. **Expect:** Redirected to `/auth/login`
3. Log in, navigate to `/auth/login` directly
4. **Expect:** Redirected to `/dashboard` (already authenticated)

#### 1.6 Logout
1. Go to Settings → log out
2. **Expect:** Session cleared, redirect to login
3. **Check:** Firestore listeners unsubscribed (no console errors after logout)

---

## 2. Dashboard Overview & Metrics

### Files Involved
- `app/(app)/dashboard/page.tsx`
- `components/dashboard/MetricsCards.tsx`
- `components/dashboard/HealthScoreCard.tsx`
- `components/dashboard/BudgetProgressBar.tsx`
- `contexts/dashboard/FinancialSummaryContext.tsx`
- `lib/firestore-summary.ts`
- `contexts/CurrencyContext.tsx`

### Data Flow
`FinancialSummaryContext` subscribes to `financialSummary/{uid}_{monthKey}` via `onSnapshot` → computes `totalBalance`, `income`, `expenses`, `netCashFlow` → passes to `MetricsCards` and `BudgetProgressBar`.

### Test Scenarios

#### 2.1 Metrics Cards
1. Add an income entry (e.g. €2,000 salary)
2. **Expect:** Balance and Income cards update immediately
3. Add an expense entry (e.g. €50 groceries)
4. **Expect:** Spending card increases; Balance decreases
5. **Check all four cards:** Balance, Income, Spending, Net Cash Flow — numbers are mathematically consistent: `Balance = Income - Spending` for the month

#### 2.2 Month-Over-Month Change Indicators
1. Ensure you have entries in the previous calendar month AND current month
2. **Expect:** Percentage change arrows on each metric card are correct and directionally accurate (green up = improvement, red down = worsening)
3. **Edge case:** First month ever (no prior month) → should show no percentage or "N/A", not crash or show NaN

#### 2.3 Currency Display
1. Go to Settings, change currency to USD
2. **Expect:** All metric cards, charts, and dialogs display `$` amounts
3. Change back to EUR
4. **Expect:** All amounts revert; no leftover `$` signs anywhere

#### 2.4 Salary Reminder Banner
1. Start a new month without entering a salary
2. **Expect:** `SalaryReminderNotification` banner appears on dashboard
3. Add a salary entry
4. **Expect:** Banner disappears

---

## 3. Transaction Management

### Files Involved
- `components/dashboard/TransactionsTable.tsx`
- `components/dashboard/AddTransactionDialog.tsx`
- `components/dashboard/QuickExpenseSheet.tsx`
- `components/dashboard/TransactionFilters.tsx`
- `lib/hooks/dashboard/useEntries.ts`
- `lib/firestore-entries.ts`
- `lib/category-detector.ts`
- Cloud Function: `checkBudgetOnEntry` (triggered on entry create)

### Data Flow
User submits form → `addEntry()` in `firestore-entries.ts` writes to `entries/{uid}/transactions/{id}` → `FinancialSummaryContext` recalculates → `checkBudgetOnEntry` Cloud Function fires → budget comparison → potential notification created.

### Test Scenarios

#### 3.1 Add Income Entry
1. Tap "+ Add Entry" → select type "Income"
2. Fill: amount, category (e.g. Salary), description, date
3. Submit
4. **Expect:** Entry appears in table; Balance and Income metrics update; no error toast

#### 3.2 Add Expense Entry
1. Add expense €200 in "Groceries" category
2. **Expect:** Spending metric increases by €200; Balance decreases

#### 3.3 Auto-Categorisation
1. Add an entry with description "Netflix subscription"
2. **Expect:** Category auto-selected as "Entertainment" or "Subscriptions"
3. **Check:** `category-detector.ts` ML categorisation fires before form submit

#### 3.4 Edit Entry
1. Click an existing entry → Edit dialog opens pre-filled
2. Change the amount, save
3. **Expect:** Table updates; metrics recalculate correctly (no double-counting)
4. **Edge case:** Change type from Income to Expense → verify metrics recalculate both sides

#### 3.5 Delete Entry
1. Delete an entry
2. **Expect:** Entry removed from table; metrics decrease accordingly
3. **Check:** Cloud Function `onEntryDeleted` fires; verify no orphaned notifications referencing the deleted entry

#### 3.6 Search & Filter
1. Search by description (partial match)
2. **Expect:** Table filters in real time; no flicker; empty state shown when no match
3. Filter by category
4. **Expect:** Only entries with that category shown
5. Filter by date range
6. **Expect:** Only entries within range shown; metrics do NOT change (filters are display-only)
7. Clear all filters
8. **Expect:** Full list restored

#### 3.7 CSV Import
1. Go to "Import CSV" → upload a valid CSV file
2. **Expect:** Entries parsed and shown in preview; confirm → entries added to Firestore
3. **Edge cases:**
   - Wrong file format (PDF, image) → clear error, no crash
   - CSV with missing required columns → show which columns are missing
   - Duplicate entries already in Firestore → check if duplicates are handled or flagged

#### 3.8 Receipt Attachment
1. Add entry, attach a receipt image
2. **Expect:** Image uploaded to Cloud Storage; entry shows receipt thumbnail
3. View the receipt
4. **Expect:** Full image visible in lightbox

---

## 4. Budgets

### Files Involved
- `components/dashboard/sections/BudgetsSection.tsx`
- `components/dashboard/BudgetList.tsx`
- `components/dashboard/BudgetCard.tsx`
- `components/dashboard/BudgetDialog.tsx`
- `components/dashboard/BudgetProgressBar.tsx`
- `contexts/dashboard/BudgetsContext.tsx`
- `lib/hooks/dashboard/useBudgets.ts`
- `lib/firestore-budgets.ts`
- Cloud Function: `checkBudgetOnEntry`

### Data Flow
`BudgetsContext` fetches all budgets for user → `BudgetCard` computes `spent / limit` from `FinancialSummaryContext` category totals → progress bar renders. On new entry: `checkBudgetOnEntry` compares running total against `budget.alertThreshold` and creates a notification if exceeded.

### Test Scenarios

#### 4.1 Create Budget
1. Go to Budgets tab → "Add Budget"
2. Select category (e.g. Dining), set limit €300, alert threshold 80%
3. Save
4. **Expect:** Budget card appears with €0 / €300 (0%); no alert

#### 4.2 Budget Progress Updates
1. Add expense in that budgeted category (e.g. €50 Dining)
2. **Expect:** Budget card updates to €50 / €300 (17%); progress bar matches
3. Add more until you hit 80% (€240)
4. **Expect:** Budget card turns amber/warning colour
5. Exceed 100% (€301)
6. **Expect:** Budget card turns red; over-budget state shown

#### 4.3 Budget Alert Notification
1. With a budget at threshold (80%), add a new expense in that category that crosses it
2. **Expect:** Cloud Function `checkBudgetOnEntry` triggers → notification created → bell icon shows unread badge → navigating to `/notifications` shows the budget alert

#### 4.4 Edit Budget
1. Edit existing budget: change limit to €500
2. **Expect:** Progress bar recalculates against new limit; colour/threshold recalculates

#### 4.5 Delete Budget
1. Delete a budget
2. **Expect:** Card removed; `BudgetProgressBar` on dashboard header updates

#### 4.6 Month Boundary
1. At start of new month (or simulate by changing date)
2. **Expect:** Budget spent resets to €0; previous month's overage doesn't carry over

---

## 5. Savings Accounts

### Files Involved
- `components/dashboard/sections/SavingsSection.tsx`
- `components/dashboard/SavingsAccountList.tsx`
- `components/dashboard/SavingsAccountCard.tsx`
- `components/dashboard/SavingsAccountDialog.tsx`
- `contexts/dashboard/SavingsContext.tsx`
- `lib/hooks/dashboard/useSavingsAccounts.ts`
- `lib/firestore-savings.ts`

### Data Flow
`SavingsContext` → `useSavingsAccounts` → Firestore `savingsAccounts/{uid}/accounts/{id}` → CRUD operations update context state → cards re-render.

### Test Scenarios

#### 5.1 Create Savings Account
1. Go to Savings tab → "Create Savings Account"
2. Enter name (e.g. "Holiday Fund"), initial balance €500, currency EUR
3. Save
4. **Expect:** Account card appears; balance shows €500; does NOT affect main spending balance

#### 5.2 Edit Account Balance
1. Edit an account, change balance to €750
2. **Expect:** Card updates; no effect on dashboard spending metrics

#### 5.3 Multiple Accounts
1. Create 3+ savings accounts with different currencies
2. **Expect:** All shown; no currency mixing; each independently tracked

#### 5.4 Delete Account
1. Delete a savings account
2. **Expect:** Removed immediately; total savings recalculates; no orphaned data

#### 5.5 Savings Does NOT Affect Metrics
1. Add a savings account with €10,000
2. **Expect:** Dashboard Balance, Income, Spending metrics are unchanged (savings are separate)

---

## 6. Recurring Transactions

### Files Involved
- `components/dashboard/sections/RecurringSection.tsx`
- `components/dashboard/RecurringTransactionList.tsx`
- `components/dashboard/RecurringTransactionCard.tsx`
- `components/dashboard/RecurringTransactionDialog.tsx`
- `contexts/dashboard/RecurringContext.tsx`
- `lib/hooks/dashboard/useRecurringTransactions.ts`
- `lib/firestore-recurring.ts` — includes `calculateNextDate()`
- Cloud Function: `processRecurringTransactionsScheduled` (daily)
- Cloud Function: `processMyRecurringTransactions` (on-demand)

### Data Flow
Recurring transaction stored in Firestore with `nextDate` → daily Cloud Function finds all items where `nextDate <= today` → creates real `entries` documents → advances `nextDate` to next occurrence using `calculateNextDate()` → summary recalculates.

### Test Scenarios

#### 6.1 Create Recurring Income
1. Go to Recurring tab → Add
2. Type: Income, amount €2,000, label "Salary", frequency Monthly, start date today
3. Save
4. **Expect:** Card appears with next expected date; Cash Flow Forecast updates (if 2+ months history)

#### 6.2 Create Recurring Expense
1. Add recurring expense: €15 "Netflix", monthly
2. **Expect:** Appears in list; forecast shows it recurring over next 90 days

#### 6.3 Toggle Active/Inactive
1. Toggle a recurring transaction off (inactive)
2. **Expect:** Card shows inactive state; Cloud Function will NOT process it; forecast excludes it
3. Toggle back on
4. **Expect:** Active again; next date recalculated from today if overdue

#### 6.4 Edit Recurring
1. Change amount or frequency
2. **Expect:** `nextDate` recalculates; forecast chart updates

#### 6.5 Delete Recurring
1. Delete a recurring transaction
2. **Expect:** Removed from list; future forecast no longer includes it; existing created entries remain

#### 6.6 Manual Processing (Cloud Function)
1. Set a recurring item's `nextDate` to yesterday (edit in Firestore console or via test)
2. Trigger `processMyRecurringTransactions` callable (via app or Firebase console)
3. **Expect:** A real entry created in the transactions list; `nextDate` advanced to next period

#### 6.7 Frequency Accuracy
1. Create weekly recurring (e.g. starts Monday)
2. After manual processing, verify `nextDate` is exactly 7 days later
3. Create monthly (e.g. starts Jan 31)
4. Verify next date is Feb 28 (not Feb 31 → should clamp to last day of month)
5. Create yearly
6. Verify next date is exactly 1 year later

---

## 7. Cash Flow Forecast

### Files Involved
- `components/dashboard/CashFlowForecast.tsx`
- `lib/insights-engine.ts` — `generateCashFlowForecast()`
- `contexts/dashboard/InsightsContext.tsx`
- `contexts/dashboard/RecurringContext.tsx`
- `contexts/dashboard/FinancialSummaryContext.tsx`

### Data Flow
`InsightsContext` memos `cashFlowData` from `generateCashFlowForecast(recurringTransactions, summary, totalBalance)`. This requires ≥1 active recurring transaction AND ≥2 months of spending history. Returns `[]` otherwise. Component renders `null` (placeholder card if empty).

### Test Scenarios

#### 7.1 Hidden State (Insufficient Data)
1. New account with 0 recurring transactions and < 2 months history
2. **Expect:** Dashed placeholder card shown: "Add a recurring transaction and 2+ months of history to unlock your forecast."
3. NOT the full forecast chart

#### 7.2 Forecast Appears When Criteria Met
1. Add ≥1 active recurring transaction
2. Ensure Firestore `financialSummary` has entries for at least 2 past months
3. **Expect:** Full chart appears; 30/60/90-day balance projections shown

#### 7.3 Forecast Accuracy
1. Add a recurring monthly income of €2,000 starting next month
2. Check the 30-day projection
3. **Expect:** Balance at day 30 ≈ `startBalance + €2,000 - avgDailySpend * 30`
4. Add recurring monthly expense of €500
5. **Expect:** Projection drops by €500 at the correct date

#### 7.4 Multiple Recurring Events
1. Add salary (€2,000 monthly), rent (€800 monthly), Netflix (€15 monthly)
2. **Expect:** Chart shows step changes at each event date; 90-day endpoint is reasonable

#### 7.5 Trend Icon
1. If 30-day projection > starting balance → expect green `TrendingUp` icon in card header
2. If 30-day projection < starting balance → expect red `TrendingDown` icon

---

## 8. Financial Health Score

### Files Involved
- `components/dashboard/HealthScoreCard.tsx`
- `lib/insights-engine.ts` — `computeHealthScore()`
- `contexts/dashboard/InsightsContext.tsx`
- Cloud Function: `aggregateLeaderboard` (server-side score for leaderboard)

### Data Flow
`InsightsContext` → `computeHealthScore(summary, budgets, goals)` → returns `{ score, tier, breakdown }` → `HealthScoreCard` renders ring chart + tier label.

### Test Scenarios

#### 8.1 Score With No Data
1. Brand-new account, no entries
2. **Expect:** Score shown (likely low/0 or neutral placeholder); no crash

#### 8.2 Score Improves With Good Habits
1. Add income, keep expenses below income
2. Stay within all budgets
3. **Expect:** Score increases; tier improves (Critical → Needs Work → Good → Excellent → Outstanding)

#### 8.3 Score Decreases
1. Exceed multiple budgets significantly
2. **Expect:** Score decreases; tier degrades

#### 8.4 Breakdown Sections
1. Inspect the health score breakdown (if visible in UI)
2. **Expect:** Sub-scores for savings rate, budget adherence, etc. are individually reasonable

---

## 9. Anomaly Detection

### Files Involved
- `components/dashboard/AnomalyAlert.tsx`
- `lib/insights-engine.ts` — `detectAnomalies()`
- `contexts/dashboard/InsightsContext.tsx`

### Data Flow
`InsightsContext` → `detectAnomalies(summary)` → compares current month category spending against historical average → returns anomalies where spending is significantly higher than normal.

### Test Scenarios

#### 9.1 No Anomaly Baseline
1. With consistent spending history, add normal-sized expenses
2. **Expect:** No anomaly alert shown

#### 9.2 Trigger Anomaly
1. In a category with consistent low spending (e.g. €50/month Dining), add €500 in one month
2. **Expect:** `AnomalyAlert` banner appears naming the category and the percentage spike
3. **Check:** Alert dismisses or persists appropriately

#### 9.3 Anomaly Requires History
1. Brand-new account with no prior months
2. Add a large expense
3. **Expect:** No anomaly shown (insufficient baseline); no crash

---

## 10. Calendar View

### Files Involved
- `app/(app)/calendar/page.tsx`
- `components/dashboard/CalendarView.tsx`
- `components/dashboard/CalendarDayCell.tsx`
- `components/dashboard/CalendarEventPopover.tsx`
- `lib/hooks/dashboard/useEntries.ts`
- `contexts/dashboard/RecurringContext.tsx`

### Data Flow
Calendar fetches all entries for the visible month via `useEntries` → maps by date → recurring items project their expected dates for the month → combined into day cells.

### Test Scenarios

#### 10.1 Navigate Months
1. Tap prev/next month arrows
2. **Expect:** Calendar re-renders for that month; entries shown on correct days
3. **Check:** No entries from the wrong month bleed in

#### 10.2 Tap a Day With Entries
1. Tap a day that has transactions
2. **Expect:** Popover shows all entries for that day with amount, category, description

#### 10.3 Add Transaction From Calendar
1. Tap a date → add entry from the popover/button
2. **Expect:** Dialog opens with that date pre-filled; saved entry appears on that day

#### 10.4 Recurring Events on Calendar
1. Add a monthly recurring transaction
2. **Expect:** Calendar marks the expected date(s) in the current month

#### 10.5 Empty Month
1. Navigate to a future month with no entries
2. **Expect:** Empty calendar grid; no errors; no phantom entries

---

## 11. Receipt Scanning

### Files Involved
- `components/dashboard/ReceiptScannerDialog.tsx`
- `components/dashboard/CameraCapture.tsx`
- `lib/receipt-scanner-api.ts`
- `lib/receipt-utils.ts`
- `lib/hooks/useScanQuota.ts`
- `lib/hooks/useSubscription.ts`
- Cloud Function: `resetMonthlyScanCounts` (monthly)

### Data Flow
User uploads image → sent to OCR API → parsed amount/merchant/date returned → pre-fills `AddTransactionDialog` → user confirms → entry saved with receipt URL.

### Test Scenarios

#### 11.1 Scan a Clear Receipt
1. Open ReceiptScannerDialog → upload a clear receipt photo
2. **Expect:** OCR extracts amount, merchant name, date → dialog pre-fills these fields
3. Verify amount matches receipt; correct if needed; save
4. **Expect:** Entry created with receipt image attached

#### 11.2 Scan Quota (Free Tier)
1. On a Free account, scan receipts until quota exceeded (check `useScanQuota`)
2. **Expect:** Scanner shows "quota reached" message; scanning disabled until next month reset

#### 11.3 Scan Quota (Pro Tier)
1. On Pro account, verify higher quota limit
2. **Expect:** Quota counter reflects Pro limits

#### 11.4 Poor Quality Image
1. Upload a blurry or low-res image
2. **Expect:** OCR returns partial data or empty; dialog shows what was parsed; user can manually fill the rest; no crash

#### 11.5 Non-Receipt Image
1. Upload an unrelated image (e.g. a selfie)
2. **Expect:** Graceful error or empty parse result; no crash; user can still manually enter data

---

## 12. Reports & Export

### Files Involved
- `app/(app)/reports/page.tsx`
- `components/dashboard/SpendingChart.tsx`
- `components/dashboard/CategoryChart.tsx`
- `components/dashboard/YearOverYearChart.tsx`
- `lib/pdf-export.ts`
- `lib/export-utils.ts`
- `lib/hooks/useSubscription.ts`

### Test Scenarios

#### 12.1 Spending Trend Chart
1. Add entries across 3+ months
2. Go to Reports
3. **Expect:** Line/bar chart shows monthly spending trend; months on X axis; amounts on Y axis are correct

#### 12.2 Category Breakdown Chart
1. Add entries in multiple categories
2. **Expect:** Pie/bar chart shows correct proportions per category; percentages sum to 100%

#### 12.3 Year-Over-Year Chart
1. Ensure data exists for 2 calendar years
2. **Expect:** Two series shown side by side; same months compared

#### 12.4 Date Range Filter
1. Select a custom date range in Reports
2. **Expect:** All charts update to reflect only that period; export buttons apply the same range

#### 12.5 CSV Export (Pro)
1. On Pro account, click "Export CSV"
2. **Expect:** File downloads with correct columns (date, description, category, amount, type); entries match what's shown
3. On Free account
4. **Expect:** Upgrade prompt shown instead

#### 12.6 PDF Export (Pro)
1. On Pro, click "Export PDF"
2. **Expect:** PDF generated with charts and summary table; file downloads
3. **Check:** PDF doesn't contain NaN, undefined, or broken layout

---

## 13. AI Features

### Files Involved
- `components/dashboard/AIDigest.tsx`
- `components/dashboard/AIChatDrawer.tsx`
- `lib/insights-api.ts`
- `lib/insights-engine.ts`
- `contexts/dashboard/InsightsContext.tsx`
- `lib/hooks/useSubscription.ts`

### Test Scenarios

#### 13.1 Monthly AI Digest (Pro)
1. On Pro account with ≥1 month of data, go to Reports
2. **Expect:** AI Digest card shows a human-readable summary of the month's spending patterns, category highlights, and recommendations
3. **Check:** No raw JSON, markdown artifacts, or placeholder text leaking through

#### 13.2 Digest Loading State
1. Trigger digest generation
2. **Expect:** Loading skeleton shown while fetching; replaced by content when done

#### 13.3 Digest on Free Tier
1. On Free account
2. **Expect:** Upgrade prompt instead of digest content

#### 13.4 AI Budget Coach Chat (if available)
1. Open AI chat drawer
2. Ask "Why did I overspend last month?"
3. **Expect:** Coherent, context-aware response referencing your actual spending data
4. **Check:** Chat history persists within session; doesn't hallucinate categories you don't have

---

## 14. Net Worth Tracking

### Files Involved
- `app/(app)/net-worth/page.tsx`
- `lib/firestore-networth.ts`

### Test Scenarios

#### 14.1 Add Asset
1. Go to `/net-worth` → Add Asset
2. Type: Bank Account, value €5,000, label "Main Checking"
3. Save
4. **Expect:** Asset card appears; Total Assets increases; Net Worth = Assets - Liabilities recalculates

#### 14.2 Add Liability
1. Add Liability: Mortgage, value €150,000
2. **Expect:** Total Liabilities increases; Net Worth decreases correctly

#### 14.3 Edit Asset
1. Change asset value
2. **Expect:** Net Worth recalculates immediately

#### 14.4 Delete
1. Delete an asset or liability
2. **Expect:** Removed; Net Worth recalculates

#### 14.5 Net Worth Is Independent of Spending
1. Add a €100,000 asset
2. **Expect:** Dashboard spending metrics are unchanged; net worth page shows the change

---

## 15. Community Leaderboard

### Files Involved
- `app/(app)/leaderboard/page.tsx`
- `components/leaderboard/DistributionChart.tsx`
- `lib/firestore-leaderboard.ts`
- `lib/firestore-types.ts` — `LeaderboardProfile`, `LeaderboardStats`, `HealthTier`
- Cloud Function: `aggregateLeaderboard` (daily 03:00 UTC)
- Cloud Function: `triggerLeaderboardAggregation` (on-demand)
- Cloud Function: `updateLeaderboardOptIn`
- `firestore.rules` — `leaderboardStats`, `leaderboardProfiles` rules

### Data Flow
User opts in → `users/{uid}.leaderboardOptIn = true` → daily Cloud Function runs `aggregateLeaderboard` → reads opted-in users' financial data server-side → computes scores → writes `leaderboardStats/current` and `leaderboardProfiles/{uid}` → page `onSnapshot` on `leaderboardStats/current` updates live.

### Test Scenarios

#### 15.1 Opt In
1. Go to `/leaderboard`, scroll to "Privacy & Participation" card
2. Click "Include my score"
3. **Expect:** Button changes to "Opted in — click to opt out"; `users/{uid}.leaderboardOptIn = true` in Firestore

#### 15.2 Trigger Aggregation
1. After opting in, click ↻ refresh button
2. **Expect:** `triggerLeaderboardAggregation` callable fires; returns `{ok: true, participants: N}`
3. After function completes, your score hero card appears with a score and tier

#### 15.3 Score Display
1. **Expect:** Score ring (SVG) fills proportionally to score/100
2. Progress bar below fills correctly
3. Tier label matches score (e.g. 80+ = Excellent)

#### 15.4 Leaderboard List
1. With multiple opted-in users, list shows ranked rows
2. **Expect:** Rank medals for #1, #2, #3; numbers for the rest
3. Your row highlighted with left border + "you" badge
4. Progress bar per user coloured by tier

#### 15.5 Opt Out
1. Click "Opted in — click to opt out"
2. **Expect:** `leaderboardOptIn = false`; your score hero card disappears; your row removed from list on next aggregation

#### 15.6 Privacy
1. Verify handle is opaque (e.g. `#04821`) — NOT your real name or email
2. Verify score page shows no personally identifiable information for other users

#### 15.7 Percentile Pill
1. With your score and total participants known
2. **Expect:** "You · top X%" pill is mathematically correct: if you rank 2nd of 10, you're top 20%

---

## 16. Notifications

### Files Involved
- `app/(app)/notifications/page.tsx`
- `components/notifications/NotificationPanel.tsx`
- `components/notifications/NotificationBell.tsx`
- `components/NotificationListener.tsx`
- `lib/hooks/useInAppNotifications.ts`
- `lib/firebase-messaging.ts`
- `public/sw.js`
- Cloud Function: `checkBudgetOnEntry`
- Cloud Function: `sendTestPush`

### Data Flow
Cloud Function creates document in `notifications/{uid}/items/{id}` → `useInAppNotifications` `onSnapshot` picks it up → bell badge count updates → user taps bell → `NotificationPanel` renders → clicking any notification navigates to `/notifications`.

### Test Scenarios

#### 16.1 Budget Alert Notification
1. Create a budget with 80% alert threshold
2. Add expenses until threshold is crossed
3. **Expect:** Within seconds, bell icon shows unread badge
4. Open notification panel → see budget alert with title and category
5. Click notification → navigates to `/notifications` page

#### 16.2 Mark All Read
1. With unread notifications, click "Mark all read"
2. **Expect:** All unread dots disappear; unread count resets to 0; bell badge clears

#### 16.3 "View All" Link
1. Open notification panel from nav (not already on `/notifications`)
2. **Expect:** "View all" link visible in panel header
3. Click it → navigates to `/notifications`; panel closes
4. On `/notifications` page, open panel again
5. **Expect:** "View all" link hidden (already on that page)

#### 16.4 Push Notification (Web)
1. Grant notification permission in browser
2. Trigger a budget alert
3. **Expect:** Browser push notification appears even when app is in background
4. Click the push notification
5. **Expect:** App opens at `/notifications`

#### 16.5 Push Notification (iOS / PWA)
1. Install app as PWA on iOS
2. Trigger a budget alert
3. **Expect:** Push arrives; tap it → app opens to `/notifications`

#### 16.6 Test Push (Settings)
1. Go to Settings → "Send test notification"
2. **Expect:** Push arrives within seconds; also appears in in-app panel

#### 16.7 Auth Race Condition
1. Hard refresh the app (Ctrl+R)
2. **Expect:** No `permission-denied` Firestore errors in console while Firebase Auth re-initialises
3. Notifications load correctly within a few seconds

---

## 17. Settings & Profile

### Files Involved
- `app/(app)/settings/page.tsx`
- `components/ThemeControls.tsx`
- `components/BillingPortalButton.tsx`
- `contexts/CurrencyContext.tsx`
- `contexts/ThemeContext.tsx`
- `lib/firestore-users.ts`
- Stripe billing portal integration

### Test Scenarios

#### 17.1 Change Display Name
1. Edit display name → save
2. **Expect:** Name updates in Firestore; shown correctly throughout app (navbar, settings)

#### 17.2 Change Currency
1. Switch from EUR to GBP
2. **Expect:** All amounts across dashboard, dialogs, charts show £ sign
3. **Edge case:** Verify no mixed-currency display anywhere

#### 17.3 Theme Toggle
1. Switch dark ↔ light
2. **Expect:** Theme changes immediately; persists after page reload
3. **Check:** No unthemed white flash on load (dark mode users)

#### 17.4 Notification Preferences
1. Toggle push notifications on/off
2. **Expect:** FCM token registered/unregistered; system notification prompt fires if first time

#### 17.5 Billing / Subscription
1. Click "Manage Subscription" (Pro users)
2. **Expect:** Stripe billing portal opens in new tab
3. On Free tier: Upgrade CTA shown, no billing portal

#### 17.6 Data Reset
1. Trigger "Reset all financial data" (destructive action)
2. **Expect:** Confirmation dialog appears; on confirm, all entries/budgets/recurring/savings wiped; metrics reset to €0

#### 17.7 Leaderboard Opt-In from Settings
1. Toggle leaderboard participation from Settings
2. **Expect:** Same effect as toggling from Leaderboard page; state is consistent between both

---

## 18. Navigation & Mobile UX

### Files Involved
- `components/navigation/AppNavbar.tsx`
- `components/navigation/BottomNav.tsx`
- `components/navigation/SwipeBackNavigator.tsx`
- `components/PullToRefresh.tsx`

### Test Scenarios

#### 18.1 Bottom Navigation (Mobile)
1. On mobile, verify bottom nav pills: Dashboard, Calendar, Reports, Settings, Add
2. Tap each — **Expect:** Correct route loads; active tab highlighted
3. **Check:** No double-navigation (tapping current tab shouldn't push a duplicate history entry)

#### 18.2 Side Nav Drawer
1. Swipe right or tap pull handle from dashboard
2. **Expect:** Nav drawer slides in with all routes including Leaderboard, Net Worth, Notifications
3. Tap a route → drawer closes → route loads

#### 18.3 Pull Handle Appearance
1. Verify pill handle on right edge of screen
2. **Expect:** Frosted glass pill with chevron icon; not a garish shape

#### 18.4 Pull to Refresh (Mobile)
1. Pull down on dashboard
2. **Expect:** Data re-fetches; loading indicator shown; summary refreshes

#### 18.5 Swipe Back (iOS)
1. Navigate to a sub-page (e.g. `/notifications`)
2. Swipe from left edge
3. **Expect:** Navigate back to previous screen (native iOS behaviour preserved in PWA)

#### 18.6 Active Route Highlighting
1. Navigate to each page
2. **Expect:** Correct nav item highlighted in bottom nav AND in side drawer

---

## 19. Subscription / Pro Gating

### Files Involved
- `lib/hooks/useSubscription.ts`
- `components/ui/UpgradePrompt.tsx`
- `lib/firestore-users.ts` — subscription tier field
- Stripe webhooks

### Test Scenarios

#### 19.1 Free Tier Restrictions
Test each Pro-gated feature on a Free account and expect an `UpgradePrompt`:
- [ ] Cash Flow Forecast card → UpgradePrompt
- [ ] PDF Export button → UpgradePrompt
- [ ] CSV Export button → UpgradePrompt
- [ ] AI Monthly Digest → UpgradePrompt
- [ ] AI Chat Coach → UpgradePrompt
- [ ] Receipt scanning beyond free quota → quota message

#### 19.2 Pro Tier Access
On a Pro account, verify ALL the above features are fully accessible with no UpgradePrompt shown.

#### 19.3 Subscription State Consistency
1. Subscription status stored in `users/{uid}.subscriptionTier`
2. Downgrade a user manually in Firestore
3. **Expect:** Pro features immediately blocked (no stale cache unlocking features)

---

## 20. Cross-Feature Consistency Checks

These verify that multiple features stay logically in sync with each other.

### 20.1 Balance Consistency
- Dashboard Balance card = sum of all income entries − sum of all expense entries for the active month
- Verify manually: add 3 incomes and 4 expenses, sum them yourself, compare to Balance card
- **No rounding errors or double-counting**

### 20.2 Budget ↔ Transaction Category Sync
- Add an expense of €100 in "Dining"
- Budget for Dining should show €100 spent
- Delete that expense
- Budget should reset to €0 spent
- **Verify: no phantom spending left in budget after deletion**

### 20.3 Recurring → Entry → Summary Chain
1. Manually trigger `processMyRecurringTransactions` callable
2. **Expect:** A real entry appears in the Transactions table
3. **Expect:** Monthly summary metrics (balance, income/expenses) reflect that new entry
4. **Expect:** If entry triggers a budget threshold → notification created

### 20.4 Notification ↔ Budget ↔ Entry Chain
1. Create budget (Dining, €200, 80% alert)
2. Add Dining expense of €161 (crosses 80%)
3. Cloud Function fires
4. **Expect:** Notification appears in bell within ~10 seconds
5. Mark notification as read → unread count drops
6. Delete the €161 expense
7. **Expect:** Budget card drops below threshold; no new notification for the drop

### 20.5 Cash Flow Forecast ↔ Recurring Sync
1. Add a monthly income recurring €3,000
2. Forecast shows steady upward slope
3. Toggle that recurring OFF
4. **Expect:** Forecast immediately recomputes (no more income slope)

### 20.6 Health Score ↔ Budget Adherence
1. Stay within all budgets → health score should be relatively high
2. Exceed 3+ budgets significantly → score should drop
3. **Verify:** Score change is directionally sensible (can't easily verify exact maths, but direction must be right)

### 20.7 Leaderboard Score ↔ Real Score
1. Compute health score locally visible on dashboard
2. Trigger leaderboard aggregation
3. **Expect:** Leaderboard score (server-computed) is in the same ballpark as dashboard health score

### 20.8 Settings Currency ↔ All Displays
1. Change currency to JPY (no decimal)
2. **Expect:** All amounts shown as whole numbers; no `¥3.14` rounding artifacts

### 20.9 Theme ↔ Charts
1. Switch to dark mode
2. **Expect:** All Recharts charts use dark-mode-appropriate colours; tooltips readable; no white-on-white text

### 20.10 Auth State ↔ Firestore Listeners
1. Log out
2. **Expect:** All `onSnapshot` listeners unsubscribed; no Firestore errors in console
3. Log back in
4. **Expect:** Listeners re-attach; data loads correctly

---

## Appendix: Quick Smoke Test Checklist

Run this after every significant deploy:

- [ ] Can register a new account
- [ ] Onboarding wizard completes without error
- [ ] Can add an income and an expense entry
- [ ] Dashboard metrics update correctly
- [ ] Can create, edit, delete a budget
- [ ] Budget alert notification fires when threshold crossed
- [ ] Can create a recurring transaction
- [ ] Recurring tab shows the item
- [ ] Cash Flow Forecast hidden when no history; shows when criteria met
- [ ] Can navigate to all pages (Calendar, Reports, Net Worth, Leaderboard, Notifications, Settings)
- [ ] Notifications bell updates on new notification
- [ ] Can mark all notifications as read
- [ ] Theme toggle works and persists
- [ ] No console errors on any page load
- [ ] No `permission-denied` Firestore errors after login

---

## Appendix: Known Edge Cases to Watch

| Scenario | What to Check |
|----------|--------------|
| Month boundary (last day → 1st) | Summary resets; budgets reset; recurring not double-processed |
| Leap year (Feb 29) | Monthly recurring from Jan 31 goes to Feb 29, not crash |
| Very large amounts (€1,000,000+) | No layout overflow in metric cards |
| Zero amounts | No division-by-zero in percentage calculations |
| All entries deleted | Metrics show €0; no NaN; health score still renders |
| Offline (no network) | Graceful error; cached Firestore data used if available |
| Rapid button tapping | No duplicate entries created (debounce / disable-on-submit) |
| Multiple browser tabs | Firestore `onSnapshot` keeps both tabs in sync |
| Session timeout (idle) | SessionTimeout handler fires; user prompted to re-auth |
