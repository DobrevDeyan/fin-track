# Pocket — Feature Implementation Roadmap

**Based on Competitive Analysis - Updated March 2026**

---

## Current App Status: **100% Complete (beta-ready)**

| Category | Status | Completion |
|----------|--------|------------|
| Core Features | Fully Implemented | 100% |
| Financial Features | Fully Implemented | 100% |
| Technical Features | Complete | 100% |
| UI/UX | Excellent | 99% |
| Analytics/Reporting | Complete | 100% |
| AI/ML | **Fully Implemented** | **100%** |
| Advanced Features | Complete | 100% |
| Security | Hardened | 100% |
| Social/Viral Features | **Implemented** | **100%** |

---

## Completed Features

### Core Features
- [x] **Authentication** - Email/Password + Google OAuth
- [x] **Manual Expense/Income Entry** - Full CRUD with filtering
- [x] **Categories** - Default + Custom categories, smart detection
- [x] **Dashboard** - Metrics, charts, category breakdown
- [x] **Transaction History** - Filtering, sorting, search, export
- [x] **Transaction Tags** - Tag input, badges in table, filter dropdown in TransactionFilters
- [x] **CSV Import** - 3-step wizard: upload → column mapping → preview & import; auto-detects columns, handles multiple date formats

### Financial Features
- [x] **Budgets** - Weekly/Monthly/Yearly with alerts
- [x] **Financial Goals** - Target tracking with progress
- [x] **Savings Accounts** - Multiple accounts with deposits/withdrawals
- [x] **Recurring Transactions** - Full UI + Cloud Function auto-creation
- [x] **Reports** - PDF/CSV export, custom date ranges, Year-over-Year comparison chart
- [x] **Net Worth Tracking** - Assets & liabilities CRUD (`assets` Firestore collection), summary cards, dedicated `/net-worth` page

### Technical Features
- [x] **PWA Support** - Installable, manifest configured
- [x] **Offline Support** - Service worker, caching
- [x] **Cloud Functions** - Recurring transaction processor (daily 1 AM UTC)
- [x] **Dark Mode** - Full theme support
- [x] **Multi-Currency** - EUR/USD/BGN/GBP/CHF/JPY/CAD/AUD with extensible architecture
- [x] **Push Notifications** - Salary reminders implemented
- [x] **GCP Infrastructure** - Cloud Run, Document AI, IAM reviewed and cleaned up
- [x] **Mobile UX** - Swipe-to-close Sheet gestures, stacked FABs, responsive layout
- [x] **i18n** - Internationalization via next-intl (English + Bulgarian)
- [x] **Error Tracking** - Sentry (DSN in `NEXT_PUBLIC_SENTRY_DSN`, `SentryProvider` in layout)
- [x] **Analytics** - Plausible opt-in via `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` env var
- [x] **Double-submit protection** - All form dialogs guard against duplicate submissions

### Receipt Management ✅ (Completed March 2026)
- [x] ML Service with Google Document AI
- [x] Receipt OCR extraction (merchant, amount, date, items)
- [x] Camera capture component with front/back switching
- [x] File upload validation (images, PDFs up to 10MB)
- [x] Confidence scoring for extracted data
- [x] **Receipt uploaded to Firebase Storage** (`receipts/{userId}/`) and URL saved to entry
- [x] **Receipt Gallery page** (`/receipts`) — responsive grid, lightbox with prev/next navigation
- [x] **Scan quota indicator** on receipts page (progress bar for Pro/Business, upgrade prompt for free tier)
- [x] Receipt thumbnail in transaction list (FileImage icon linking to receipt)
- [x] Noisy OCR items filtered before saving (pure numbers, bank codes, short tokens removed)
- [x] "Unknown Merchant" treated as blank — user prompted to fill in

**Technical Details:**
```
ML Service: /ml-service/src/api-server.ts (port 8000 local, 8080 on Cloud Run)
Cloud Run URL: https://ml-service-185936461123.europe-west1.run.app
Document AI Processor: expense_parser (566b35e21d475435, eu region)
Frontend scanner: /frontend/components/dashboard/ReceiptScannerDialog.tsx
Receipt upload util: /frontend/lib/receipt-utils.ts
Storage rules: storage.rules → receipts/{userId}/**
Gallery page: /frontend/app/(app)/receipts/page.tsx
```

### Security Hardening ✅ (Completed March 2026)
- [x] **Firestore rules** — all `allow list` use `resource.data.userId == request.auth.uid`; `aiInsights/{userId}` rule added; `assets` collection rules added
- [x] **Firebase Storage rules** (`storage.rules`) — restricts `receipts/{userId}/**` to owner only
- [x] **ML service auth middleware** — Firebase Auth token verification on all sensitive endpoints
- [x] **Rate limiting** — `express-rate-limit` on upload (10/day), insights (50/day), global (200/15min)
- [x] **Input sanitization** — `sanitizeInput`/`sanitizeLabel` applied before all Gemini prompts
- [x] **Idempotency guard** — `processRecurringTransaction` checks for existing entry before creating
- [x] **Auth tokens on API calls** — receipt scanner and AI features pass Firebase ID tokens
- [x] **GDPR account deletion** — Settings page, type "DELETE" to confirm, batch-deletes all Firestore collections + Firebase Auth account
- [x] **React Error Boundaries** — `SectionErrorBoundary` wraps each dashboard section

### AI/ML Features ✅ (Completed March 2026)
- [x] **Smart Category Detection** - 100+ merchant keywords
- [x] **Receipt Scanner** - Google Document AI (Expense Parser `566b35e21d475435`, `eu` region)
- [x] **ML Service API** - Express server on Cloud Run (`europe-west1`), with `/api/insights/digest` + `/api/insights/chat`
- [x] **Financial Health Score** - Algorithmic 0-100 score (SVG ring card + popover breakdown with 5 sub-scores)
- [x] **Spending Anomaly Detector** - Z-score based category spike detection, dismissible banner
- [x] **Cash Flow Forecast** - 90-day Recharts AreaChart projection *(temporarily disabled on dashboard — component intact, re-enable by uncommenting in `dashboard/page.tsx`)*
- [x] **AI Monthly Digest** - Gemini 2.5 Flash narrative, cached in Firestore `aiInsights/{userId}` per month
- [x] **AI Budget Coach Chat** - Floating drawer, multi-turn chat grounded in aggregated financial data

### In-App Upgrade Prompts ✅ (Completed March 2026)
- [x] **AIDigest** — overlay for free users (blur + lock icon + "Upgrade to Pro" button)
- [x] **CashFlowForecast** — card for free users
- [x] **AIChatDrawer** — gates on Pro before opening chat
- [x] **ReceiptScannerDialog** — shows UpgradePrompt card for free tier (scan limit = 0)
- [x] **Receipts page** — scan quota progress bar for Pro/Business; UpgradePrompt card for free

### Account Settings ✅ (Completed March 2026)
- [x] Settings page (`/settings`) with display name edit
- [x] Subscription / billing section with Stripe checkout
- [x] Scan usage display
- [x] GDPR account deletion (type "DELETE" to confirm)
- [x] "Account Settings" link in mobile Sheet and desktop dropdown

### Family Budgeting ✅ (Completed April 2026)
- [x] `HouseholdDocument`, `HouseholdMember`, `HouseholdInviteDocument` types in `firestore-types.ts`
- [x] Firestore rules: `households` (read by `memberUids` flat array), `householdInvites` (owner-only), `userDebts` (owner-only)
- [x] Cloud Functions (`europe-west4`): `createHousehold`, `sendHouseholdInvite`, `acceptHouseholdInvite`, `getHouseholdEntries`, `leaveHousehold`, `getMyHousehold`
- [x] `firestore-household.ts` — callable wrappers + `subscribeToHousehold`
- [x] `HouseholdContext.tsx` — CF-first load, `onSnapshot` for live updates, `refreshHousehold()` for manual refresh
- [x] Settings card: create household, invite by email, copy link, send via mailto, "↻ Refresh" members, leave
- [x] `household/accept/page.tsx` — public page, redirects to `/auth/login?returnUrl=...` for unauthenticated users
- [x] Dashboard Personal/Family toggle; merged family transactions view

**Bug fixes post-launch:**
- `createHousehold` now stores email from auth token (not user doc) to prevent owner self-invite
- `AcceptInviteContent` used `?redirect=` but login reads `?returnUrl=` — invite token was silently lost after login (fixed)
- `onSnapshot` error callback changed to no-op to preserve CF-loaded state on permission errors

### Subscription Tracker ✅ (Completed April 2026)
- [x] `/subscriptions` page — `frontend/app/(app)/subscriptions/page.tsx`
- [x] Loads recurring expenses only; monthly + annual cost summary cards
- [x] Category breakdown with proportional progress bars
- [x] Sort by cost / name / next charge date
- [x] Pause/resume with one click; ⚠ flag for >30% spend share
- [x] Savings tip card
- [x] Nav entry in AppNavbar (desktop + mobile, `Repeat` icon)

### Debt Payoff Planner ✅ (Completed April 2026)
- [x] `/debt` page — `frontend/app/(app)/debt/page.tsx`
- [x] `DebtItem`, `DebtType`, `UserDebtsDocument` types; `userDebts/{userId}` Firestore collection
- [x] `getUserDebts` / `saveUserDebts` in `frontend/lib/firestore-debt.ts`
- [x] Snowball vs Avalanche strategy toggle; extra monthly payment input
- [x] "Debt-free by [Month Year]" headline; total interest card
- [x] Recharts `AreaChart` balance-over-time (quarterly samples, 50-year cap)
- [x] Side-by-side strategy comparison; add/edit/delete debts via Dialogs
- [x] Nav entry in AppNavbar (`TrendingDown` icon)

### Shareable Achievement Cards ✅ (Completed April 2026)
- [x] `AchievementCard` component — `frontend/components/dashboard/AchievementCard.tsx`
- [x] Share icon overlaid on HealthScoreCard on dashboard
- [x] Gradient card color-coded by health tier; shows score, income, expenses, savings rate
- [x] Download PNG via `html2canvas` (3× DPI); native Share Sheet on mobile

---

## In Progress / Remaining

### Near-term

| Feature | Status | Notes |
|---------|--------|-------|
| Calendar View | Not started | `react-big-calendar` or FullCalendar |
| Bill Tracking & Reminders | Not started | New `bills` collection |
| Bank Connectivity | Deferred | GoCardless (EU) / Plaid (US) — awaiting API keys |

---

## Detailed Feature Specifications

### Calendar View

**Status**: Not started
**Effort**: 1 week
**Impact**: High UX improvement

**Implementation:**
- [ ] Install calendar library (react-big-calendar or fullcalendar)
- [ ] Display transactions on calendar
- [ ] Show recurring transactions on future dates
- [ ] Click date to add transaction
- [ ] Color-code by type (income/expense)
- [ ] Month/Week/Day views

---

### Bill Tracking & Reminders

**Status**: Not started
**Effort**: 1 week
**Impact**: High

**Implementation:**
- [ ] New collection: `bills`
- [ ] Bill CRUD operations
- [ ] Due date tracking
- [ ] Upcoming bills widget on dashboard
- [ ] Push notifications for due dates
- [ ] Mark as paid (links to transaction)

**Schema:**
```typescript
{
  userId: string
  name: string
  amount: number
  dueDate: Timestamp
  frequency: "monthly" | "weekly" | "yearly" | "one-time"
  category: string
  isPaid: boolean
  paidDate?: Timestamp
  linkedTransactionId?: string
  reminderDaysBefore: number
}
```

---

### Basic Investment Tracking

**Status**: Not started
**Effort**: 2-3 weeks
**Impact**: Very High

**Phase 1: Manual Tracking**
- [ ] Investment account management
- [ ] Manual portfolio value entry
- [ ] Track performance over time
- [ ] Asset allocation pie chart
- [ ] Link to net worth

---

### AI Insights (Completed March 2026)

**Status**: Fully implemented
**Model**: Gemini 2.5 Flash (free tier, `@google/generative-ai` SDK)

**Files:**
- `frontend/lib/insights-engine.ts` — Pure algorithmic functions (zero API calls)
- `frontend/lib/firestore-insights.ts` — Firestore cache for AI digest (`aiInsights/{userId}`)
- `frontend/lib/insights-api.ts` — ML service HTTP calls
- `frontend/contexts/dashboard/InsightsContext.tsx` — Context wrapping all 5 features
- `ml-service/src/gemini-handler.ts` — Gemini 2.5 Flash integration
- `ml-service/src/insights-routes.ts` — POST `/api/insights/digest` + `/api/insights/chat`

**Gemini Notes:**
- Use model `gemini-2.5-flash` — `gemini-1.5-flash` is 404 on new projects, `gemini-2.0-flash` has 0 free quota
- API key stored in `ml-service/.env` and `ml-service/deploy.sh`
- Use `--update-env-vars` on Cloud Run (not `--set-env-vars`) to avoid wiping other vars

---

## Implementation Timeline (Revised)

### Q1 2026 (Jan-Mar) ✅
- [x] Financial Health Score (algorithmic)
- [x] Spending Anomaly Detection (Z-score)
- [x] Cash Flow Forecast (90-day, Recharts) *(temporarily disabled)*
- [x] AI Monthly Digest (Gemini 2.5 Flash, Firestore cached)
- [x] AI Budget Coach Chat (Gemini 2.5 Flash, floating Sheet drawer)
- [x] Mobile UX: swipe gestures, FAB stacking, Sheet close button fixes
- [x] Security hardening: Firestore rules, Storage rules, ML auth middleware, rate limits, input sanitization
- [x] GDPR: account deletion, Settings page
- [x] Error tracking: Sentry integration
- [x] Plausible analytics (opt-in env var)

### Q2 2026 (Apr-Jun) ✅ (Completed early — March/April 2026)
- [x] Receipt gallery & management UI
- [x] Net worth tracking (assets/liabilities CRUD)
- [x] Transaction tags filter UI
- [x] Year-over-Year analytics chart
- [x] CSV import wizard
- [x] In-app upgrade prompts across all Pro features
- [x] Double-submit protection on all form dialogs
- [x] Firebase Storage receipt upload pipeline (end-to-end)
- [x] Family Budgeting (household invite flow, merged view, Personal/Family toggle)
- [x] Subscription Tracker page (/subscriptions)
- [x] Debt Payoff Planner (/debt) with Snowball/Avalanche
- [x] Shareable Achievement Cards (PNG export, native share)

### Q3 2026 (Jul-Sep)
- [ ] Calendar view
- [ ] Bill tracking & reminders
- [ ] Basic investment tracking
- [ ] Custom report builder
- [ ] Bank connectivity (GoCardless / Plaid)

---

## Tech Stack

**Frontend:**
- Next.js 14 (React 18, TypeScript)
- Tailwind CSS + shadcn/ui
- Recharts (visualization)
- jsPDF (PDF export)
- next-intl (English + Bulgarian)
- Sentry (`@sentry/nextjs`)

**Backend:**
- Firebase (Auth, Firestore, Storage, Hosting, Cloud Functions Node.js 20)
- Stripe via `firestore-stripe-payments` extension (subscriptions)

**ML Service (Cloud Run):**
- Express.js on Google Cloud Run (`europe-west1`)
- Google Document AI — Expense Parser (`566b35e21d475435`, `eu` region)
- Google Gemini 2.5 Flash — AI digest + chat

---

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| `users` | User profiles, currency, language preferences, `householdId` pointer |
| `entries` | Income/expense transactions |
| `categories` | Custom user categories |
| `budgets` | Monthly/weekly/yearly budgets |
| `goals` | Financial savings goals |
| `savingsAccounts` | Named savings pools |
| `recurringTransactions` | Scheduled recurring entries |
| `financialSummaries` | Aggregated monthly summary (single source of truth) |
| `aiInsights` | Cached Gemini digest (one doc per user, refreshed monthly) |
| `scanUsage` | Receipt scan quota (written by Admin SDK only) |
| `assets` | Net worth assets & liabilities |
| `households` | Household name, owner, `members[]`, `memberUids[]` |
| `householdInvites` | 7-day invite tokens for family budgeting |
| `userDebts` | Debt items for the Debt Payoff Planner (one doc per user) |
| `customers` | Stripe customer data (managed by Stripe extension) |
| `products` | Stripe products/prices (synced from Stripe) |

---

## Notes

### Privacy-First Approach
- All features support manual entry
- No automatic bank syncing
- User controls all data
- Export capability for all features
- GDPR-compliant account deletion

### PWA Compatibility
- All features work offline
- Service worker caching
- IndexedDB for offline storage
- Sync when online

### International Support
- Multi-currency (EUR, USD, BGN, GBP, CHF, JPY, CAD, AUD)
- Timezone handling
- Locale-aware formatting

---

---

## Community Leaderboard — Financial Health Scores

**Status**: Implemented (March 2026)

An anonymous, opt-in community leaderboard that aggregates financial health scores across all members for entertainment and benchmarking.

### What is shared
- A numerical health score (0–100) derived from savings rate, budget adherence, goal progress, income stability, and spending regularity
- A score tier: Critical / Needs Work / Good / Excellent / Outstanding
- A stable anonymous handle (e.g. `#04821`) — hash-derived from user ID, never reversible
- Your rank/percentile among opted-in participants

### What is NEVER shared
- Name, email, or any personally identifiable information
- Raw income or expense amounts
- Category-level spending breakdown
- Any value that could identify or be attributed to a specific person

### Privacy design
- **Opt-in only** (default: off) — users explicitly consent in Settings → Community Leaderboard or on the `/leaderboard` page
- **Instant opt-out** — opting out immediately deletes the user's `leaderboardProfiles/{uid}` document via Cloud Function
- GDPR-aligned: the aggregation function skips users who have not opted in

### Architecture
| Layer | Detail |
|-------|--------|
| Firestore | `leaderboardProfiles/{uid}` (owner-read, Admin SDK write), `leaderboardStats/current` (auth-read, Admin SDK write) |
| Cloud Function | `aggregateLeaderboard` — scheduled 2nd of each month at 02:00 UTC |
| Opt-out cleanup | `updateLeaderboardOptIn` callable function purges profile on opt-out |
| Score algorithm | Server-side port of `calculateHealthScore()` from `insights-engine.ts`; requires ≥ 2 months of data |
| Frontend | `/leaderboard` page with stat cards, score ring, distribution chart, top-10 table |
| Navigation | Desktop nav (`AppNavbar`) + mobile sheet nav; Trophy icon |

### Files added / modified
- `frontend/lib/firestore-types.ts` — `LeaderboardProfile`, `LeaderboardStats`, `HealthTier` types; `leaderboardOptIn` field on `UserDocument`
- `frontend/lib/firestore-leaderboard.ts` — client-side read/write helpers
- `frontend/app/(app)/leaderboard/page.tsx` — leaderboard page
- `frontend/components/leaderboard/DistributionChart.tsx` — Recharts tier distribution bar chart
- `frontend/components/navigation/AppNavbar.tsx` — Trophy nav entry
- `frontend/app/(app)/settings/page.tsx` — opt-in toggle card
- `functions/src/index.ts` — `aggregateLeaderboard` scheduled function + `updateLeaderboardOptIn` callable
- `firestore.rules` — rules for `leaderboardProfiles` and `leaderboardStats`

---

**Document Version**: 4.1
**Last Updated**: March 30, 2026
**Next Review**: Monthly
