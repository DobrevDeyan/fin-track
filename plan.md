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
