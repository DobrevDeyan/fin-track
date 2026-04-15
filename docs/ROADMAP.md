# Pocket — Roadmap & Competitive Position

**Last Updated:** April 2026

---

## Current Status: Beta-Ready

| Category | Completion |
|----------|-----------|
| Core Features | 100% |
| Financial Features | 100% |
| Technical / PWA | 100% |
| UI/UX | 99% |
| Analytics/Reporting | 100% |
| AI/ML Features | 100% |
| Security | 100% |
| Social / Viral Features | 100% |

---

## Completed Features

### Authentication & Onboarding
- [x] Email/Password + Google OAuth
- [x] Onboarding wizard (salary, currency, first recurring transaction)
- [x] Session timeout with inactivity warning
- [x] GDPR account deletion (type "DELETE" to confirm, batch-deletes all data)

### Transactions
- [x] Manual expense/income entry — full CRUD with filtering and search
- [x] Transaction tags — input, badges in table, filter dropdown
- [x] CSV import — 3-step wizard (upload → column mapping → preview); multi-format date auto-detect

### Financial Features
- [x] Budgets — weekly/monthly/yearly with 80%/100% FCM push alerts
- [x] Financial Goals — target tracking with progress
- [x] Savings Accounts — multiple named accounts with deposits/withdrawals
- [x] Recurring Transactions — full UI + Cloud Function auto-creation (daily 01:00 UTC)
- [x] Reports — PDF/CSV export, custom date ranges, Year-over-Year comparison chart
- [x] Net Worth Tracking — assets & liabilities CRUD, summary cards (`/net-worth`)
- [x] Debt Payoff Planner — Snowball vs Avalanche, balance chart, debt-free date (`/debt`)

### AI & ML Features
- [x] Smart Category Detection — 100+ merchant keywords
- [x] Receipt Scanner — Google Document AI (Expense Parser `566b35e21d475435`, `eu`)
- [x] Financial Health Score — algorithmic 0–100 (SVG ring + 5 sub-score breakdown)
- [x] Spending Anomaly Detection — Z-score based category spike detection, dismissible banner
- [x] Cash Flow Forecast — 90-day Recharts AreaChart *(component intact; toggle on in `dashboard/page.tsx`)*
- [x] AI Monthly Digest — Gemini 2.5 Flash narrative, Firestore-cached per month
- [x] AI Budget Coach Chat — floating drawer, multi-turn, aggregated data only

### Subscriptions & Payments
- [x] Stripe freemium tiers: Free / Pro (€7.99) / Business (€19.99) via Firebase Extension
- [x] Subscription Tracker page — recurring expense costs, category breakdown, pause/resume (`/subscriptions`)
- [x] In-app upgrade prompts on all Pro-gated features (blur + lock icon)
- [x] Scan quota indicator (progress bar for paid, upgrade prompt for free)

### Household / Family Budgeting
- [x] `createHousehold`, `sendHouseholdInvite`, `acceptHouseholdInvite`, `leaveHousehold` Cloud Functions
- [x] `getMyHousehold` CF — Admin SDK bypass of Firestore rules; backfills `memberUids` if missing
- [x] Invite link flow — `household/accept` public page; `returnUrl` preserved across auth
- [x] Personal / Family toggle on dashboard — merged household transaction view
- [x] Firestore rule: `uid in memberUids` flat array check (`.map()` not valid in rules)

### Technical
- [x] PWA — installable, service worker, offline support
- [x] Dark mode — full theme support
- [x] Multi-currency — EUR/USD/BGN/GBP/CHF/JPY/CAD/AUD
- [x] i18n — English + Bulgarian (next-intl)
- [x] Push notifications — FCM, budget alerts, salary reminders
- [x] Error tracking — Sentry (`NEXT_PUBLIC_SENTRY_DSN`)
- [x] Analytics — Plausible opt-in (`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`)
- [x] Double-submit protection on all form dialogs
- [x] React Error Boundaries (`SectionErrorBoundary`) on every dashboard section
- [x] Mobile UX — swipe-to-close Sheet, stacked FABs

### Social
- [x] Community Leaderboard — anonymous opt-in, health score ranking (`/leaderboard`)
- [x] Shareable Achievement Cards — PNG export via `html2canvas`, native share sheet

---

## Q3 2026 Planned

| Feature | Effort | Priority |
|---------|--------|----------|
| Calendar View | 1 week | High |
| Bill Tracking & Reminders | 1 week | High |
| Basic Investment Tracking (manual) | 2–3 weeks | Very High |
| Custom Report Builder | 2 weeks | Medium |
| Bank Connectivity (GoCardless / Plaid) | Deferred | Awaiting API keys |

### Calendar View
- `react-big-calendar` or FullCalendar
- Display transactions on calendar; show recurring on future dates
- Click date to add transaction; color-code by type; month/week/day views

### Bill Tracking & Reminders
New `bills` collection:
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

### Basic Investment Tracking
- Manual portfolio value entry (privacy-first, no broker linking)
- Asset allocation pie chart
- Link to net worth

### Bank Connectivity (Open Banking)
**Status:** Deferred — awaiting API keys
**Impact:** Highest single acquisition lever. Manual entry is the primary reason people abandon personal finance apps before they see value. Every competitor that added automatic import saw massive conversion lift.
- EU: GoCardless (formerly Nordigen) — free tier, PSD2 bank feeds
- US: Plaid

### App Store Listing (TWA)
**Status:** Deferred — non-code task
Already a PWA. Trusted Web Activity (TWA) submission to Google Play is low effort. iOS (Capacitor) requires more work.

---

## What to Deprioritize

These are valuable features but won't move the acquisition needle at the current scale:
- **Tax export** — important for retention, not acquisition
- **Investment portfolio tracking** — high complexity, niche audience at this stage
- **Advanced custom reports** — power user feature

---

## Completed Feature Details

### Subscription Tracker (`/subscriptions`)
- Loads all recurring transactions, filters to expenses only
- Monthly + annual cost summary cards
- Category breakdown with proportional progress bars
- Sort by cost / name / next charge date
- Pause/resume with one click (calls `updateRecurringTransaction`)
- Flags subscriptions taking >30% of total spend (AlertTriangle icon)
- Savings tip: shows how much you'd save cancelling the top active item

### Shareable Achievement Cards
- Share icon overlaid on the Health Score card on the dashboard
- Gradient card (color-coded by health tier): score, tier label, income, expenses, savings rate, net savings
- Download PNG via `html2canvas` at 3× resolution
- Native Share Sheet on mobile (`navigator.share`); falls back to download on desktop

### Debt Payoff Planner (`/debt`)
- Add any number of debts: credit card, personal loan, mortgage, student loan, other
- Persisted to `userDebts/{userId}` via `getUserDebts` / `saveUserDebts`
- Snowball vs Avalanche strategy toggle; extra monthly payment input
- "Debt-free by [Month Year]" headline; total interest card
- Recharts `AreaChart` balance over time (quarterly samples, 50-year cap)
- Side-by-side strategy comparison

### Household / Family Budgeting — Known Gotchas
- `getHouseholdEntries` query (`userId in [...] + orderBy date`) requires a composite Firestore index — Firebase Console will prompt with a direct link on first run
- Bugs fixed post-launch:
  - `onSnapshot` error callback was clearing household state → changed to no-op; CF-loaded data preserved
  - `createHousehold` stored email from user doc (could be empty) → now uses `request.auth?.token?.email`
  - `AcceptInviteContent` used `?redirect=` but login reads `?returnUrl=` → invite token silently dropped after login (fixed April 2026)
  - Firestore rules used `members.map(m, m.uid)` → replaced with flat `memberUids` string array

---

## Competitive Position

### Feature Comparison

| Feature | Pocket | Monarch | Simplifi | Empower |
|---------|--------|---------|----------|---------|
| Manual Entry | ✅ | ✅ | ✅ | ✅ |
| Auto Bank Sync | ❌ | ✅ | ✅ | ✅ |
| PWA / Offline | ✅ | ❌ | ❌ | ❌ |
| Privacy (no bank linking) | ✅ | ❌ | ❌ | ❌ |
| Multi-Currency | ✅ | ✅ | ❌ | ❌ |
| i18n | ✅ (EN+BG) | ❌ | ❌ | ❌ |
| AI Features (count) | 5 | 2 | 1 | 0 |
| Receipt OCR | ✅ | ✅ | ❌ | ❌ |
| Financial Health Score | ✅ | ❌ | ❌ | ❌ |
| Cash Flow Forecast | ✅ | ✅ | ❌ | ❌ |
| AI Monthly Digest | ✅ | ❌ | ❌ | ❌ |
| AI Budget Coach Chat | ✅ | ✅ | ❌ | ❌ |
| Multiple Savings Accounts | ✅ | ❌ | ❌ | ❌ |
| Recurring Transactions | ✅ | ✅ | ✅ | ✅ |
| YoY Analytics | ✅ | ✅ | ✅ | ✅ |
| Household / Couple View | ✅ | ✅ | ❌ | ❌ |
| Shared Budgets | ❌ | ✅ | ❌ | ❌ |
| Investment Tracking | ❌ | ✅ | ✅ | ✅ |
| Net Worth | ✅ | ✅ | ✅ | ✅ |

### Pricing

| App | Price | Bank Linking | AI Features | Privacy |
|-----|-------|-------------|-------------|---------|
| YNAB | $14.99/mo | Optional | None | Medium |
| Monarch Money | $14.99/mo | Required | Good | Medium |
| Empower | Free | Required | Basic | Low |
| Rocket Money | $3–12/mo | Required | Basic | Low |
| **Pocket** | **€0–€19.99/mo** | **Not required** | **Strong (5 features)** | **High** |

Pocket tiers:

| Plan | Price | Receipt Scans/mo | Notes |
|------|-------|-----------------|-------|
| Free | €0 | 0 | Health score, anomaly detection, forecast |
| Pro | €7.99/mo | 30 | + AI digest, AI chat |
| Business | €19.99/mo | 150 | + AI digest, AI chat |

### Where We Excel (Best in Class)
- Privacy — no bank linking, GDPR-compliant, data never leaves user control
- PWA / Offline — only finance app in this category with a proper PWA
- AI features — 5 implemented (3 client-side, 2 Gemini); competitors have 0–2
- Multiple savings accounts — genuine differentiator (most apps: one savings concept)
- Multi-currency — EUR/USD/BGN/GBP/CHF/JPY/CAD/AUD; competitors are USD-centric

### Where We're Competitive
- Core budgeting, recurring transactions, reports/export, AI categorisation

### Gaps to Address
- Investment tracking — **Major Gap** (planned Q3 2026)
- Shared budgets / expense splitting — **Minor Gap** (household merging done; per-budget sharing is future work)
- Sankey diagrams — **Minor Gap** (YoY now implemented)

### Overall Competitive Score: 9.5/10

---

## Market Positioning

**Primary pitch:** "Privacy-first financial management with AI insights — no bank linking required."

**Target users:**
1. Privacy-conscious individuals who won't share bank credentials
2. International users / expats (multi-currency, Bulgarian i18n)
3. Users who prefer manual control (no auto-categorisation errors)
4. Users who want offline / cross-platform access (PWA)
5. Couples / households tracking finances together

**Core differentiator** vs Mint/YNAB/Monarch: Privacy + No bank linking + AI insights that run without sending raw transactions to any server.
