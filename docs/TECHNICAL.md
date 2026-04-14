# Pocket — Technical Documentation

**Version:** 2.0
**Last Updated:** April 2026
**Framework:** Next.js 14 (App Router)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Development Setup](#development-setup)
5. [Core Concepts](#core-concepts)
6. [Component Architecture](#component-architecture)
7. [State Management](#state-management)
8. [Firebase Integration](#firebase-integration)
9. [ML Service](#ml-service)
10. [AI Features](#ai-features)
11. [Subscription System](#subscription-system)
12. [Security](#security)
13. [Testing](#testing)
14. [Build & Deployment](#build--deployment)
15. [Performance Optimizations](#performance-optimizations)
16. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

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
                      │ (Scheduled)  │
                      └──────────────┘
```

### Design Principles

1. **Privacy-first** — no bank linking; only aggregated data is sent to AI services
2. **Client-side computation** — algorithmic AI features (health score, anomaly detection, forecast) run entirely in the browser
3. **Atomic writes** — all entry mutations update the `financialSummaries` document in the same batch write
4. **Single source of truth** — `financialSummaries/{userId}` is the aggregated financial state; raw entries are the audit log
5. **Type safety** — strict TypeScript throughout; no `any` without justification
6. **Component composition** — small, reusable components; context shared only where needed

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui (Radix UI) |
| **Charts** | Recharts |
| **Auth** | Firebase Authentication (Email + Google OAuth) |
| **Database** | Cloud Firestore (NoSQL) |
| **Storage** | Firebase Storage (receipt images) |
| **Backend** | Firebase Cloud Functions (Node.js 20) |
| **ML Service** | Express.js on Google Cloud Run (europe-west1) |
| **Receipt Scanning** | Google Document AI (Expense Parser) |
| **AI Digest & Chat** | Google Gemini 2.5 Flash |
| **Subscriptions** | Stripe via `firestore-stripe-payments` Firebase Extension |
| **Hosting** | Firebase Hosting |
| **i18n** | next-intl (English, Bulgarian) |
| **Export** | jsPDF, CSV |
| **Monitoring** | Sentry |
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
│   │   │   ├── net-worth/          # Net Worth page (nav link disabled)
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
│   └── src/index.ts                # Recurring tx processor + scan quota reset
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
├── docs/                           # Documentation
├── md/                             # Internal docs (deployment, strategy)
├── firestore.rules                 # Security rules
├── firestore.indexes.json
└── firebase.json
```

---

## Development Setup

### Prerequisites

- **Node.js** 20+ LTS
- **npm** 9+
- **Firebase CLI**: `npm install -g firebase-tools`
- **Google Cloud CLI** (optional — only needed for ML service deployment)

### Initial Setup

```bash
git clone <repo-url>
cd fin-track

# Frontend
cd frontend
npm install

# Cloud Functions
cd ../functions
npm install

# ML Service (optional — AI features only)
cd ../ml-service
npm install
```

### Environment Variables

Create `frontend/.env.local`:

```env
# Firebase (required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# ML Service
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:8000

# Stripe (test keys for local dev)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=price_...
```

### Running Locally

```bash
# Terminal 1 — Frontend (http://localhost:3001)
cd frontend && npm run dev

# Terminal 2 — ML Service (http://localhost:8000, optional)
cd ml-service && npm run dev

# Terminal 3 — Firebase Emulators (optional)
firebase emulators:start
```

---

## Core Concepts

### Financial Summary (Single Source of Truth)

Every entry mutation (add, edit, delete) atomically updates `financialSummaries/{userId}` in the same Firestore batch write:

```typescript
// All mutations batch-update the summary
const batch = writeBatch(db)
batch.set(entryRef, entryData)
batch.update(summaryRef, {
  totalIncome: increment(amount),
  [`months.${yyyyMM}.income`]: increment(amount),
  [`months.${yyyyMM}.incomeByCategory.${category}`]: increment(amount),
})
await batch.commit()
```

This means dashboard metrics are always in sync — no re-aggregation needed.

### Data Loading Pattern

No real-time listeners. Data is loaded once on mount via explicit `load*()` calls in each context. The provider hierarchy controls load order:

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

// ISO date strings (not Timestamps)
interface Budget {
  id: string
  userId: string
  name: string
  category: string
  amount: number
  period: "weekly" | "monthly" | "yearly"
  startDate: string   // ISO
  endDate: string     // ISO
  alertThreshold: number
  isActive: boolean
}

// nextDate is a Firestore Timestamp
type RecurringTransaction = RecurringEntryDocument & { id: string }

type Goal = GoalDocument & { id: string }
```

---

## Component Architecture

### Dashboard Section Pattern

All dashboard sections follow this structure:

```tsx
<CollapsibleSection title="Budgets" defaultOpen={true}>
  <BudgetList>
    <BudgetCard />
  </BudgetList>
  <BudgetDialog />  {/* Add/Edit modal */}
</CollapsibleSection>
```

### Error Boundaries

Each dashboard section is wrapped in `SectionErrorBoundary` — a React class component that catches render errors and shows a graceful fallback instead of crashing the whole dashboard.

### shadcn/ui Components Available

`accordion`, `avatar`, `badge`, `button`, `card`, `chart`, `checkbox`, `collapsible-section`, `dialog`, `dropdown-menu`, `input`, `label`, `navigation-menu`, `progress`, `select`, `sheet`, `skeleton`, `popover`, `table`, `tabs`, `textarea`, `toast`

All shadcn Sheets use `[&>button]:hidden` to suppress the default close button (replaced with custom close logic).

### Mobile UX Conventions

- **AppNavbar mobile Sheet** — swipe-right gesture closes it (>60px horizontal, more horizontal than vertical)
- **AIChatDrawer FAB** — positioned `bottom-6 left-6` (opposite the Quick Expense "+" at `bottom-6 right-6`)

---

## State Management

| Feature | Pattern | Reason |
|---------|---------|--------|
| Transactions (entries) | `useEntries()` hook | Used only in one section |
| Budgets | `BudgetsContext` | Shared across multiple components |
| Goals | `GoalsContext` | Shared across dashboard + insights |
| Recurring | `RecurringContext` | Shared state |
| Savings | `SavingsContext` | Shared state |
| Financial Summary | `FinancialSummaryContext` | Global — needed everywhere |
| Auth | `AuthContext` | Global user state |
| AI Insights | `InsightsContext` | Wraps all 5 AI features |

### Context Consumer Pattern

```typescript
const { budgets, loading, addBudget, updateBudget, deleteBudget } = useBudgetsContext()
```

### Auth Guard

```typescript
const { user, loading } = useAuth()

if (loading) return <LoadingSpinner />
if (!user) {
  router.push('/auth/login')
  return null
}
```

---

## Firebase Integration

### Initialization

`frontend/lib/firebase.ts` reads all config from `NEXT_PUBLIC_FIREBASE_*` env vars and initializes on the client side only:

```typescript
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore"

// Modern offline persistence API (non-deprecated)
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
| `households` | Auto | Household doc: name, ownerUid, members[], memberUids[] |
| `householdInvites` | Auto | 7-day email invite tokens |
| `userDebts` | Firebase UID | Debt Payoff Planner items array (single doc per user) |
| `customers` | Firebase UID | Stripe customer data (managed by extension) |
| `products` | Stripe product ID | Stripe products with `firebaseRole` metadata |

### Security Rules

All user data is scoped by `userId`. Key rules:

```javascript
// All collections with a userId field
allow read, write: if request.auth != null
  && resource.data.userId == request.auth.uid;

// Summary and insights (doc ID = UID)
match /financialSummaries/{userId} {
  allow read, write: if request.auth.uid == userId;
}
match /aiInsights/{userId} {
  allow read, write: if request.auth.uid == userId;
}

// Households — members check via flat memberUids array
// (nested object map() queries have CLI warnings; flat array is reliable)
match /households/{householdId} {
  allow read: if request.auth != null && request.auth.uid in resource.data.memberUids;
  allow write: if false;  // All writes via Cloud Functions (Admin SDK)
}

// Debt planner (one doc per user)
match /userDebts/{userId} {
  allow read, write: if request.auth.uid == userId;
}

// Stripe collections (managed by extension)
match /customers/{uid} {
  allow read: if request.auth.uid == uid;
}
```

---

## ML Service

The ML service is an Express.js server deployed to Cloud Run (`europe-west1`). It handles two capabilities that cannot run client-side: receipt OCR and Gemini AI calls.

### Endpoints

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| `GET` | `/api/health` | None | — | Service health check |
| `POST` | `/api/upload-bill` | Firebase token | 10/day/user | Receipt scanning via Document AI |
| `POST` | `/api/insights/digest` | Firebase token | 50/day/user | Generate AI monthly digest |
| `POST` | `/api/insights/chat` | Firebase token | 50/day/user | AI budget coach chat |

### Authentication

All sensitive endpoints require a valid Firebase Auth ID token in the `Authorization: Bearer <token>` header. The middleware verifies this with `firebase-admin`.

### Gemini Setup

- **Model**: `gemini-2.5-flash` (the only model available on the free tier for new Google AI Studio projects)
- `gemini-1.5-flash` returns 404 (deprecated on v1beta for new projects)
- `gemini-2.0-flash` has zero quota on new projects' free tier
- Input sanitization (`sanitizeInput`/`sanitizeLabel`) applied to all user data before Gemini prompts

### Local Development

```bash
cd ml-service
cp .env.example .env
# Fill in GCP_PROJECT_ID, GCP_PROCESSOR_ID, GEMINI_API_KEY
npm run dev   # Starts on port 8000
```

Without `GEMINI_API_KEY`, AI features show "AI not configured" gracefully — algorithmic features still work.

### Deployment

```bash
cd ml-service
bash deploy.sh   # Builds Docker image via Cloud Build, deploys to Cloud Run
```

See [md/deployment.md](../md/deployment.md) for the full deployment guide.

---

## AI Features

All five AI features are implemented across these files:

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

### Client-Side Features (Free, Zero Cost)

The health score, anomaly detection, and cash flow forecast run entirely in the browser. No data leaves the app for these features.

### Gemini Features (Pro & Business)

The AI digest and chat call the ML service, which calls Gemini. Auth tokens are retrieved via `auth.currentUser?.getIdToken()` before each call.

---

## Subscription System

Pocket uses the **`firestore-stripe-payments` Firebase Extension** for all Stripe integration.

### How It Works

1. User clicks upgrade → frontend creates a Stripe Checkout Session via the extension's Firestore-triggered Cloud Function
2. User completes checkout on Stripe's hosted page
3. Stripe webhook fires → extension writes subscription data to `customers/{uid}/subscriptions`
4. `useSubscription` hook reads the subscription from Firestore to determine the user's tier

### Subscription Tiers

Defined in `frontend/lib/constants/subscription.constants.ts`:

| Role | Plan | Receipt Scans/month |
|------|------|---------------------|
| `free` | Free | 0 |
| `pro` | Pro (€7.99/mo) | 30 |
| `business` | Business (€19.99/mo) | 150 |

The `firebaseRole` metadata on Stripe Products (`pro` or `business`) maps directly to these roles.

### Scan Quota

The `resetMonthlyScanCounts` Cloud Function runs on the 1st of each month at 00:05 UTC and resets all users' `monthlyScanCount` to 0 in the `users` collection.

### Testing Subscriptions

Use Stripe test mode with these card details:

| Field | Value |
|-------|-------|
| Card number | `4242 4242 4242 4242` |
| Expiry | Any future date (e.g. `12/34`) |
| CVC | Any 3 digits (e.g. `123`) |
| Name / ZIP | Any value |

---

## Security

### Firestore Rules

- All `allow list` queries use `resource.data.userId == request.auth.uid`
- `financialSummaries` and `aiInsights` use the user's UID as the document ID for access control
- Stripe extension collections (`customers`, `products`) have their own rules

### ML Service

- Firebase Auth token verification on all sensitive endpoints (`middleware/auth.ts`)
- `express-rate-limit`: uploads 10/day/user, insights 50/day/user, global 200/15min
- Prompt injection protection: `sanitizeInput`/`sanitizeLabel` strip special characters before Gemini calls
- CORS restricted to known origins via `FRONTEND_URL` env var

### Frontend

- All `NEXT_PUBLIC_FIREBASE_*` credentials in `.env.local` (gitignored)
- PII auto-redacted from structured logger (`frontend/lib/utils/logger.ts`)
- React escapes all rendered values by default — no `dangerouslySetInnerHTML`

### GDPR

Account deletion (Settings → Account Settings) batch-deletes all Firestore collections for the user and then deletes the Firebase Auth account. Implemented in `frontend/lib/firestore-users.ts`.

---

## Testing

```bash
cd frontend

npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report (opens coverage/lcov-report/index.html)
npm test AddTransaction # Single file
```

Tests use **Jest** and **React Testing Library**. Contexts are mocked in integration tests — no real Firestore connections in tests.

---

## Build & Deployment

### Frontend Build

```bash
cd frontend
npm run build
```

The build script:
1. Runs `sync-version` — updates cache-busting version in `sw.js`, `manifest.json`, and `layout.tsx`
2. Runs `next build` — static export to `frontend/out/`

```bash
firebase deploy --only hosting   # Deploy to Firebase Hosting CDN
```

### Cloud Functions

```bash
firebase deploy --only functions
```

Requires the Firebase Blaze (pay-as-you-go) plan for scheduled functions.

### ML Service

```bash
cd ml-service && bash deploy.sh
```

Builds a Docker container via Cloud Build and deploys to Cloud Run (`europe-west1`, 512 MB RAM, 1 CPU, 0–3 instances).

### Full Deploy (after initial setup)

```bash
# ML service (only if ml-service code changed)
cd ml-service && bash deploy.sh && cd ..

# Everything Firebase
cd frontend && npm run build && cd ..
firebase deploy
```

For detailed step-by-step instructions, see [md/deployment.md](../md/deployment.md).

---

## Performance Optimizations

### Virtualization

Lists with 100+ entries automatically switch to `react-window` virtualised rendering (~95% faster for 1000+ items).

### Code Splitting

Next.js automatically splits code per route. Heavy components use dynamic imports:

```typescript
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false
})
```

### Package Import Optimization

`next.config.js` uses `optimizePackageImports` for `lucide-react`, `@radix-ui/react-icons`, `firebase/firestore`, and `firebase/auth` to reduce bundle size.

### Firebase Offline Persistence

Firestore's `persistentLocalCache` with `persistentMultipleTabManager` caches data locally and syncs across tabs. The app works fully offline for cached data.

### Analytics Lazy Load

Firebase Analytics is initialised 3 seconds after page load to avoid blocking the critical path.

---

## Troubleshooting

**`auth/invalid-api-key`**
Firebase env vars are missing or blank in `frontend/.env.local`. Ensure all `NEXT_PUBLIC_FIREBASE_*` vars are set and restart the dev server.

**`permission-denied` from Firestore**
The user is not authenticated or the security rules don't match. Verify `request.auth.uid` matches `resource.data.userId` in your rules, and check that the user is signed in.

**AI chat returns "not configured"**
`GEMINI_API_KEY` is not set on the ML service. Check with:
```bash
gcloud run services describe ml-service --region europe-west1 --project fin-track-adc2c \
  --format "yaml(spec.template.spec.containers[0].env)"
```
Update without wiping other vars:
```bash
gcloud run services update ml-service \
  --update-env-vars GEMINI_API_KEY=your_key \
  --region europe-west1 --project fin-track-adc2c
```

**Gemini 404 / quota errors**
- 404 on `gemini-1.5-flash` — deprecated on v1beta for new projects; use `gemini-2.5-flash`
- quota `limit:0` on `gemini-2.0-flash` — not on free tier for new projects; use `gemini-2.5-flash`

**Frontend build fails with TypeScript errors**
```bash
npx tsc --noEmit   # Check types without building
```

**Environment variable not loading**
Env vars must start with `NEXT_PUBLIC_` to be available in the browser. Always restart the dev server after changing `.env.local`.

**ML service CORS error**
Verify `FRONTEND_URL` on Cloud Run includes all required origins:
```
https://fin-track-adc2c.web.app,https://fin-track-adc2c.firebaseapp.com,http://localhost:3001,http://localhost:3000
```
