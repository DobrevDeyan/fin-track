# Pocket — Architecture & Technical Reference

**Last Updated:** April 2026
**Framework:** Next.js 14 (App Router)

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Core Concepts](#core-concepts)
5. [Component Architecture](#component-architecture)
6. [State Management](#state-management)
7. [Firebase Integration](#firebase-integration)
8. [Cloud Functions Inventory](#cloud-functions-inventory)
9. [Google Cloud Services](#google-cloud-services)
10. [ML Service](#ml-service)
11. [AI Features](#ai-features)
12. [Subscription System](#subscription-system)
13. [Performance Optimizations](#performance-optimizations)
14. [Security](#security)
15. [Troubleshooting](#troubleshooting)

---

## System Architecture

Pocket is a monorepo with three independently deployed services:

```
                    ┌────────────────────────────┐
                    │    Frontend (Next.js 14)    │
                    │     PWA / Static Export     │
                    │   Firebase Hosting (CDN)    │
                    └─────────┬──────────────────┘
                              │
               ┌──────────────┼──────────────────┐
               ▼              ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
    │   Firebase    │  │  Firestore   │  │   ML Service     │
    │   Auth        │  │  (Database)  │  │   (Cloud Run)    │
    └──────────────┘  └──────────────┘  │                  │
                             ▲          │  - Document AI   │
                             │          │  - Gemini 2.5    │
                      ┌──────────────┐  └──────────────────┘
                      │   Cloud      │
                      │   Functions  │
                      │ (Scheduled + │
                      │  Callable)   │
                      └──────────────┘
```

**Production URLs:**
- Frontend: https://fin-track-adc2c.web.app
- ML Service: https://ml-service-185936461123.europe-west1.run.app
- Firebase Project: `fin-track-adc2c`

### Design Principles

1. **Privacy-first** — no bank linking; only aggregated data sent to AI services
2. **Client-side computation** — health score, anomaly detection, and forecast run entirely in the browser
3. **Atomic writes** — all entry mutations update `financialSummaries` in the same batch write
4. **Single source of truth** — `financialSummaries/{userId}` is the aggregated state; raw entries are the audit log
5. **Type safety** — strict TypeScript throughout; no `any` without justification

### Region Strategy

| Service | Region | Reason |
|---------|--------|--------|
| Firestore database | `europe-west4` | Set at project creation — cannot change |
| Firestore-triggered functions | `europe-west4` | Must match database region |
| Callable/scheduled functions | `us-central1` | Default; Eventarc not required |
| ML Service (Cloud Run) | `europe-west1` | Lower EU latency, data residency |
| Document AI | `eu` | EU data residency |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui (Radix UI) |
| **Charts** | Recharts |
| **Auth** | Firebase Authentication (Email + Google OAuth) |
| **Database** | Cloud Firestore (NoSQL, `europe-west4`) |
| **Storage** | Firebase Storage (receipt images) |
| **Backend** | Firebase Cloud Functions (Node.js 20) |
| **ML Service** | Express.js on Google Cloud Run (`europe-west1`) |
| **Receipt Scanning** | Google Document AI (Expense Parser, `eu`) |
| **AI Digest & Chat** | Google Gemini 2.5 Flash (free tier) |
| **Subscriptions** | Stripe via `firestore-stripe-payments` Firebase Extension |
| **Hosting** | Firebase Hosting (CDN) |
| **i18n** | next-intl (English, Bulgarian) |
| **Export** | jsPDF, CSV |
| **Error Tracking** | Sentry (`@sentry/nextjs`) |
| **Testing** | Jest, React Testing Library |

---

## Project Structure

```
fin-track/
├── frontend/                       # Next.js 14 PWA
│   ├── app/
│   │   ├── (app)/                  # Authenticated routes (auth-gated)
│   │   │   ├── dashboard/          # Main dashboard
│   │   │   ├── reports/            # Reports & AI digest
│   │   │   ├── subscriptions/      # Subscription Tracker
│   │   │   ├── debt/               # Debt Payoff Planner
│   │   │   ├── leaderboard/        # Community Health Score leaderboard
│   │   │   ├── net-worth/          # Net Worth page
│   │   │   ├── receipts/           # Receipt gallery
│   │   │   └── settings/           # Account, subscription, household settings
│   │   ├── household/
│   │   │   └── accept/             # Public invite acceptance page (outside auth gate)
│   │   ├── auth/                   # Login / register / forgot-password
│   │   └── page.tsx                # Landing page
│   ├── components/
│   │   ├── dashboard/              # Feature components
│   │   │   ├── HealthScoreCard.tsx
│   │   │   ├── AnomalyAlert.tsx
│   │   │   ├── CashFlowForecast.tsx
│   │   │   ├── AIDigest.tsx
│   │   │   ├── AIChatDrawer.tsx
│   │   │   └── ...
│   │   ├── landing/                # Marketing / landing page
│   │   └── ui/                     # shadcn/ui base components
│   ├── contexts/
│   │   ├── HouseholdContext.tsx        # Family Budgeting state
│   │   └── dashboard/
│   │       ├── DashboardProvider.tsx   # Nested provider wrapper
│   │       ├── FinancialSummaryContext.tsx
│   │       ├── BudgetsContext.tsx
│   │       ├── GoalsContext.tsx
│   │       ├── RecurringContext.tsx
│   │       ├── SavingsContext.tsx
│   │       └── InsightsContext.tsx     # All 5 AI features
│   ├── lib/
│   │   ├── constants/              # Subscription tiers, categories, etc.
│   │   ├── hooks/                  # useEntries, useSubscription, etc.
│   │   ├── utils/                  # logger, timestamp, formatting
│   │   ├── firebase.ts             # Firebase initialization
│   │   ├── firestore-*.ts          # Firestore CRUD per collection
│   │   ├── firestore-household.ts  # Callable CF wrappers + household listener
│   │   ├── firestore-debt.ts       # getUserDebts / saveUserDebts
│   │   ├── insights-engine.ts      # Algorithmic AI (client-side)
│   │   ├── insights-api.ts         # ML service HTTP client
│   │   ├── firestore-insights.ts   # AI digest Firestore cache
│   │   └── receipt-scanner-api.ts  # Receipt upload HTTP client
│   ├── messages/
│   │   ├── en.json                 # English translations
│   │   └── bg.json                 # Bulgarian translations
│   └── public/                     # SW, manifest, icons
│
├── functions/                      # Firebase Cloud Functions
│   └── src/index.ts                # All 12 custom functions
│
├── ml-service/                     # AI/ML microservice (Cloud Run)
│   ├── src/
│   │   ├── api-server.ts           # Express entry point + rate limiting
│   │   ├── document-ai-handler.ts  # Receipt scanning
│   │   ├── gemini-handler.ts       # Digest + chat (Gemini 2.5 Flash)
│   │   ├── insights-routes.ts      # POST /api/insights/digest|chat
│   │   └── middleware/auth.ts      # Firebase Auth token verification
│   ├── Dockerfile
│   └── deploy.sh
│
├── docs/                           # All project documentation (this folder)
├── firestore.rules                 # Firestore security rules
├── firestore.indexes.json          # Composite indexes
├── storage.rules                   # Firebase Storage security rules
└── firebase.json                   # Firebase project config
```

---

## Core Concepts

### Financial Summary (Single Source of Truth)

Every entry mutation (add, edit, delete) atomically updates `financialSummaries/{userId}` in the same Firestore batch write:

```typescript
const batch = writeBatch(db)
batch.set(entryRef, entryData)
batch.update(summaryRef, {
  totalIncome: increment(amount),
  [`months.${yyyyMM}.income`]: increment(amount),
  [`months.${yyyyMM}.incomeByCategory.${category}`]: increment(amount),
})
await batch.commit()
```

Dashboard metrics are always in sync — no re-aggregation needed.

### Data Loading Pattern

No real-time listeners on the dashboard. Data is loaded once on mount via explicit `load*()` calls in each context. The provider hierarchy controls load order:

```
FinancialSummaryProvider
  └── SavingsProvider
        └── BudgetsProvider
              └── GoalsProvider
                    └── RecurringProvider
                          └── InsightsProvider
                                └── children
```

`InsightsContext` calls `loadGoals()` as a side effect — goals are not loaded elsewhere on the dashboard by default.

### Key Types

```typescript
// Flat collection, not subcollection
interface EntryDocument {
  userId: string
  type: "income" | "expense"
  amount: number
  category: string
  date: Timestamp
  description: string
  tags?: string[]
  notes?: string
  receiptUrl?: string
  recurring?: boolean
}

// Single doc per user, keyed by month
interface FinancialSummaryDocument {
  userId: string
  totalIncome: number
  totalExpenses: number
  months: {
    [yyyyMM: string]: {
      income: number
      expenses: number
      expensesByCategory: { [category: string]: number }
      incomeByCategory: { [category: string]: number }
    }
  }
  updatedAt: Timestamp
}

// Household — memberUids is a flat UID array for Firestore rule checks
interface HouseholdDocument {
  name: string
  ownerUid: string
  members: HouseholdMember[]
  memberUids: string[]   // flat UID list — used by Firestore Security Rules
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## Component Architecture

### Dashboard Section Pattern

```tsx
<CollapsibleSection title="Budgets" defaultOpen={true}>
  <BudgetList>
    <BudgetCard />
  </BudgetList>
  <BudgetDialog />  {/* Add/Edit modal */}
</CollapsibleSection>
```

Each dashboard section is wrapped in `SectionErrorBoundary` — a React class component that catches render errors and shows a graceful fallback.

### shadcn/ui Components Available

`accordion`, `avatar`, `badge`, `button`, `card`, `chart`, `checkbox`, `collapsible-section`, `dialog`, `dropdown-menu`, `input`, `label`, `navigation-menu`, `progress`, `select`, `sheet`, `skeleton`, `popover`, `table`, `tabs`, `textarea`, `toast`

All shadcn Sheets use `[&>button]:hidden` to suppress the default close button.

### Mobile UX Conventions

- **AppNavbar mobile Sheet** — swipe-right gesture closes it (>60px horizontal, more horizontal than vertical)
- **AIChatDrawer FAB** — positioned `bottom-6 left-6` (opposite the Quick Expense "+" at `bottom-6 right-6`)

---

## State Management

| Feature | Pattern | Reason |
|---------|---------|--------|
| Transactions | `useEntries()` hook | Used only in one section |
| Budgets | `BudgetsContext` | Shared across multiple components |
| Goals | `GoalsContext` | Shared across dashboard + insights |
| Recurring | `RecurringContext` | Shared state |
| Savings | `SavingsContext` | Shared state |
| Financial Summary | `FinancialSummaryContext` | Global — needed everywhere |
| Auth | `AuthContext` | Global user state |
| AI Insights | `InsightsContext` | Wraps all 5 AI features |
| Household | `HouseholdContext` | Family budgeting state |

---

## Firebase Integration

### Initialization

`frontend/lib/firebase.ts` reads all config from `NEXT_PUBLIC_FIREBASE_*` env vars and initializes on the client side only. Uses modern offline persistence API:

```typescript
db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
})
```

### Firestore Collections

| Collection | Document ID | Description |
|-----------|------------|-------------|
| `users` | Firebase UID | User profile (name, email, currency, language, `householdId`) |
| `entries` | Auto | Transactions (flat, not subcollection) |
| `budgets` | Auto | Budget limits per category |
| `goals` | Auto | Savings goals |
| `savingsAccounts` | Auto | Virtual savings accounts |
| `recurringTransactions` | Auto | Recurring transaction templates |
| `financialSummaries` | Firebase UID | Aggregated monthly data (single doc per user) |
| `aiInsights` | Firebase UID | Cached AI-generated monthly digests |
| `assets` | Auto | Net worth assets & liabilities |
| `households` | Auto | Household name, ownerUid, `members[]`, `memberUids[]` |
| `householdInvites` | Auto | 7-day email invite tokens |
| `userDebts` | Firebase UID | Debt Payoff Planner items (single doc per user) |
| `scanUsage` | Firebase UID | OCR scan quota (Admin SDK only) |
| `leaderboardProfiles` | Firebase UID | Opt-in anonymous leaderboard profile |
| `leaderboardStats` | `current` | Aggregated leaderboard (Admin SDK only) |
| `auditLog` | Auto | Security audit trail — large transactions, deletions (Admin SDK only) |
| `rateLimits` | Auto | Per-user rate limit tracking for callable functions (Admin SDK only) |
| `customers` | Firebase UID | Stripe customer data (managed by extension) |
| `products` | Stripe product ID | Stripe products with `firebaseRole` metadata |

### Security Rules Summary

```javascript
// All user-owned collections
allow read, write: if request.auth != null
  && resource.data.userId == request.auth.uid;

// Summary and insights (doc ID = UID)
match /financialSummaries/{userId} {
  allow read, write: if request.auth.uid == userId;
}

// Households — flat memberUids array for membership check
// (.map() is not a valid Firestore rule function — use flat array instead)
match /households/{householdId} {
  allow read: if request.auth != null
    && request.auth.uid in resource.data.memberUids;
  allow write: if false;  // All writes via Cloud Functions (Admin SDK)
}

// Debt planner (one doc per user)
match /userDebts/{userId} {
  allow read, write: if request.auth.uid == userId;
}

// Leaderboard (Admin SDK writes only)
match /leaderboardProfiles/{userId} {
  allow read: if request.auth.uid == userId;
  allow write: if false;
}
match /leaderboardStats/{docId} {
  allow read: if request.auth != null;
  allow write: if false;
}
```

---

## Cloud Functions Inventory

All custom functions are in `functions/src/index.ts`.

### Scheduled Functions

| Function | Region | Schedule | Purpose |
|----------|--------|----------|---------|
| `processRecurringTransactionsScheduled` | `us-central1` | Daily 01:00 UTC | Auto-process all due recurring transactions |
| `resetMonthlyScanCounts` | `us-central1` | 1st of month 00:05 UTC | Reset OCR scan quota for all users |
| `aggregateLeaderboard` | `us-central1` | 2nd of month 02:00 UTC | Rebuild anonymous leaderboard from opted-in users |

### Callable Functions (HTTPS)

| Function | Region | Rate Limit | Purpose |
|----------|--------|------------|---------|
| `processMyRecurringTransactions` | `us-central1` | 3 calls/5min | User-triggered recurring transaction processing |
| `createHousehold` | `europe-west4` | — | Creates household; caller becomes owner |
| `sendHouseholdInvite` | `europe-west4` | 10 calls/5min | Generates 7-day invite token |
| `acceptHouseholdInvite` | `europe-west4` | — | Validates token + email; adds caller to household |
| `getHouseholdEntries` | `europe-west4` | — | Returns merged entries for all household members |
| `leaveHousehold` | `europe-west4` | — | Removes caller; transfers ownership if needed |
| `getMyHousehold` | `europe-west4` | — | Returns household data via Admin SDK (bypasses rules/cache); backfills `memberUids` if missing |
| `updateLeaderboardOptIn` | `us-central1` | — | Opts user in/out of leaderboard; purges profile on opt-out |

### Firestore-Triggered Functions

| Function | Region | Trigger | Purpose |
|----------|--------|---------|---------|
| `checkBudgetOnEntry` | `europe-west4` | `entries` created | Sends FCM push notification at 80%/100% budget threshold |
| `onEntryDeleted` | `europe-west4` | `entries` deleted | Writes audit log entry |
| `onLargeEntryCreated` | `europe-west4` | `entries` created | Flags transactions ≥ €10,000 in audit log |

### Stripe Extension Functions (managed, v1)

6 functions managed by the `firestore-stripe-payments` Firebase Extension — upgrade via Firebase Console when available. Do not modify directly.

---

## Google Cloud Services

**Project ID:** `fin-track-adc2c`

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Firebase Authentication** | User login (Email + Google) | 50,000 MAU |
| **Cloud Firestore** | Primary database (`europe-west4`) | 1GB, 50k reads/day, 20k writes/day |
| **Firebase Hosting** | Frontend PWA | 10GB transfer/month |
| **Firebase Storage** | Receipt images | 5GB, 1GB/day download |
| **Cloud Functions v2** | Backend logic (Blaze required) | 2M invocations/month |
| **Firebase Cloud Messaging** | Push notifications | Free, unlimited |
| **Cloud Run** | ML service (`europe-west1`) | ~$1-2/month (EU not free) |
| **Document AI** | Receipt OCR (Expense Parser, `eu`) | ~$0.01/page |
| **Gemini AI** | AI digest + chat | Free tier via AI Studio (15 RPM, 1500 RPD) |
| **Cloud Scheduler** | Trigger scheduled functions | 3 free jobs/month |
| **Artifact Registry** | Docker images (30-day cleanup policy set) | 0.5 GB/month |
| **Cloud Build** | ML service Docker builds | 120 min/day |

**Document AI Processor:** `expense_parser` — ID `566b35e21d475435`, region `eu`

**Gemini Setup Notes:**
- Model must be `gemini-2.5-flash` — `gemini-1.5-flash` returns 404 on new projects, `gemini-2.0-flash` has 0 free quota
- API key in `ml-service/.env` and baked into `deploy.sh`
- Always use `--update-env-vars` on Cloud Run updates (not `--set-env-vars` — the latter wipes all env vars)

**Node.js Runtime:** Cloud Functions currently on Node.js 20. Deprecated 2026-04-30, decommissioned 2026-10-30. Upgrade `functions/package.json` `engines.node` to `"22"` before April 2026.

### Service Accounts

| Service Account | Purpose |
|----------------|---------|
| `firebase-adminsdk-fbsvc@fin-track-adc2c.iam.gserviceaccount.com` | Firebase Admin SDK (Cloud Functions) |
| `fin-track-adc2c@appspot.gserviceaccount.com` | App Engine / Cloud Run (Document AI access) |
| `bill-parser@fin-track-adc2c.iam.gserviceaccount.com` | ML service local dev |

---

## ML Service

Express.js server on Cloud Run (`europe-west1`, 512 MB RAM, 1 CPU, 0–3 instances).

### Endpoints

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| `GET` | `/api/health` | None | — | Service health check |
| `POST` | `/api/upload-bill` | Firebase token | 10/day/user | Receipt scanning via Document AI |
| `POST` | `/api/insights/digest` | Firebase token | 50/day/user | Generate AI monthly digest |
| `POST` | `/api/insights/chat` | Firebase token | 50/day/user | AI budget coach chat |

All sensitive endpoints require `Authorization: Bearer <firebase-id-token>`.

### Receipt Scan Flow

1. Frontend sends image via `POST /api/upload-bill` with Firebase ID token
2. ML service calls Document AI Expense Parser
3. Returns `{ merchant, amount, date, items, rawText, confidence }`
4. Frontend stores receipt in Firebase Storage (`receipts/{userId}/`) and saves URL on the entry

---

## AI Features

| File | Purpose |
|------|---------|
| `frontend/lib/insights-engine.ts` | Algorithmic functions (health score, anomaly Z-score, forecast) |
| `frontend/lib/firestore-insights.ts` | AI digest Firestore cache read/write |
| `frontend/lib/insights-api.ts` | HTTP client for ML service endpoints |
| `frontend/contexts/dashboard/InsightsContext.tsx` | Context wrapping all 5 features |
| `frontend/components/dashboard/HealthScoreCard.tsx` | SVG ring score + popover breakdown |
| `frontend/components/dashboard/AnomalyAlert.tsx` | Dismissible Z-score banner |
| `frontend/components/dashboard/CashFlowForecast.tsx` | 90-day Recharts AreaChart |
| `frontend/components/dashboard/AIDigest.tsx` | Gemini monthly narrative |
| `frontend/components/dashboard/AIChatDrawer.tsx` | Floating chat button + Sheet |
| `ml-service/src/gemini-handler.ts` | Gemini 2.5 Flash integration |
| `ml-service/src/insights-routes.ts` | POST /api/insights/digest + chat |

### Client-Side (Free, Zero Cost)
Health score, anomaly detection, and cash flow forecast run entirely in the browser. No data leaves the app.

### Gemini Features (Pro & Business)
AI digest and chat call the ML service → Gemini. Auth tokens retrieved via `auth.currentUser?.getIdToken()`. Only aggregated category totals are sent — raw transaction descriptions stay on the device.

---

## Subscription System

Pocket uses the `firestore-stripe-payments` Firebase Extension.

### Flow

1. User clicks upgrade → frontend creates a checkout session document in `customers/{uid}/checkout_sessions/`
2. Extension's Cloud Function creates Stripe Checkout Session
3. User completes checkout on Stripe's hosted page
4. Stripe webhook fires → extension writes subscription to `customers/{uid}/subscriptions`
5. `useSubscription` hook reads subscription from Firestore

### Tiers (defined in `frontend/lib/constants/subscription.constants.ts`)

| Role | Plan | Price | Receipt Scans/month |
|------|------|-------|---------------------|
| `free` | Free | €0 | 0 |
| `pro` | Pro | €7.99/mo | 30 |
| `business` | Business | €19.99/mo | 150 |

The `firebaseRole` metadata on Stripe Products (`pro` or `business`) maps to these roles.

---

## Performance Optimizations

- **Virtualisation** — lists with 100+ entries switch to `react-window` (~95% faster for 1000+ items)
- **Code splitting** — Next.js splits per route; heavy components use dynamic imports with `Skeleton` loading
- **Package import optimisation** — `next.config.js` uses `optimizePackageImports` for `lucide-react`, `@radix-ui/react-icons`, `firebase/firestore`, `firebase/auth`
- **Offline persistence** — Firestore `persistentLocalCache` + `persistentMultipleTabManager` caches data locally and syncs across tabs
- **Analytics lazy load** — Firebase Analytics initialised 3 seconds after page load

---

## Security

### Firestore
- All `allow list` queries use `resource.data.userId == request.auth.uid`
- `financialSummaries` and `aiInsights` use the user's UID as the document ID for access control
- Household writes go exclusively through Cloud Functions (Admin SDK) — client writes denied

### ML Service
- Firebase Auth token verification on all sensitive endpoints (`middleware/auth.ts`)
- `express-rate-limit`: uploads 10/day/user, insights 50/day/user, global 200/15min
- Prompt injection protection: `sanitizeInput`/`sanitizeLabel` strip special characters before Gemini calls
- CORS restricted to known origins via `FRONTEND_URL` env var

### Frontend
- All `NEXT_PUBLIC_FIREBASE_*` credentials in `.env.local` (gitignored)
- PII auto-redacted from structured logger (`frontend/lib/utils/logger.ts`)
- No `dangerouslySetInnerHTML`

### GDPR
Account deletion in Settings batch-deletes all Firestore collections for the user, then deletes the Firebase Auth account. Implemented in `frontend/lib/firestore-users.ts`.

---

## Troubleshooting

**`auth/invalid-api-key`**
Firebase env vars missing or blank in `frontend/.env.local`. Restart the dev server after setting them.

**`permission-denied` from Firestore**
User not authenticated, or rules don't match. Verify `request.auth.uid == resource.data.userId` in rules and that the user is signed in.

**`permission-denied` reading households**
Households rule uses `request.auth.uid in resource.data.memberUids`. If the document was created before April 2026, it may lack the `memberUids` field. Open Firebase Console → Firestore → `households/{id}` and add `memberUids` as an array of UID strings (one array, not multiple fields).

**AI chat returns "not configured"**
`GEMINI_API_KEY` not set on Cloud Run:
```bash
# Check
gcloud run services describe ml-service --region europe-west1 --project fin-track-adc2c \
  --format "yaml(spec.template.spec.containers[0].env)"

# Update without wiping other vars
gcloud run services update ml-service \
  --update-env-vars GEMINI_API_KEY=your_key \
  --region europe-west1 --project fin-track-adc2c
```

**Gemini 404 / quota errors**
- 404 on `gemini-1.5-flash` — deprecated on v1beta for new projects; use `gemini-2.5-flash`
- `limit:0` on `gemini-2.0-flash` — no free quota on new projects; use `gemini-2.5-flash`

**ML service CORS error**
Verify `FRONTEND_URL` on Cloud Run includes all required origins:
```
https://fin-track-adc2c.web.app,https://fin-track-adc2c.firebaseapp.com,http://localhost:3001,http://localhost:3000
```
Update: `gcloud run services update ml-service --update-env-vars "FRONTEND_URL=..." --region europe-west1 --project fin-track-adc2c`

**Frontend build TypeScript errors**
```bash
npx tsc --noEmit   # Check types without building
```

**Document AI 403**
```bash
gcloud projects add-iam-policy-binding fin-track-adc2c \
  --member='serviceAccount:fin-track-adc2c@appspot.gserviceaccount.com' \
  --role='roles/documentai.apiUser'
```

**Household settings shows "Create" after household exists**
`getMyHousehold` CF not deployed or user's `householdId` field missing. Redeploy:
```bash
firebase deploy --only functions:getMyHousehold,functions:createHousehold,functions:acceptHouseholdInvite
```

**Invite accepted but member not appearing**
1. Click "↻ Refresh" — re-calls `getMyHousehold` via CF
2. Verify `firestore.rules` deployed — household rule uses `memberUids` flat array
3. The `returnUrl` bug (pre-April 2026): invite token was silently dropped after login. Fixed — login/register now reads `?returnUrl=` and redirects there.

**Receipts page "Failed to load receipts"**
Query requires composite index (`userId + receiptUrl + date`):
```bash
firebase deploy --only firestore:indexes
```

**Firebase Storage rules deploy fails**
If "Firebase Storage has not been set up on project": Firebase Console → Storage → Get Started → choose region → Done. Then re-run `firebase deploy --only storage`.

**`getHouseholdEntries` prompts for a composite index on first run**
The query uses `where("userId", "in", [...]) + orderBy("date", "desc")` which requires a composite index. Firestore logs an error with a direct Firebase Console link to create it. Click it — one-time step per project.

---

## Development Conventions

### Currency Formatting

Always use `formatCurrency` from `@/lib/currency-utils`. Do not destructure `formatAmount` or `fmt` from `useCurrency()` — those do not exist.

```typescript
// Correct pattern
const { userCurrency } = useCurrency()
const fmt = (n: number) => formatCurrency(n, { currency: userCurrency })

// Wrong — will crash
const { formatAmount } = useCurrency()
```

### Exchange Rates

Frankfurter API is proxied through `/api/exchange-rate` (Next.js API route) to avoid CORS. Always call the internal route, not the external URL directly:

```typescript
// Correct
import { getExchangeRate } from "@/lib/exchange-rate"
// internally calls /api/exchange-rate

// Wrong — CORS error in browser
fetch("https://api.frankfurter.app/latest")
```

### Recurring Transaction Dates

`nextDate` is stored as a Firestore `Timestamp`, not an ISO string. Call `.toDate()` before any date arithmetic:

```typescript
// Correct
const next = recurringTx.nextDate.toDate()
const isPast = next < new Date()

// Wrong — Timestamp is not a Date
const isPast = recurringTx.nextDate < new Date()
```

Use `updateRecurringTransaction(id, patch)` for partial updates (e.g. pause/resume from the Subscription Tracker).
