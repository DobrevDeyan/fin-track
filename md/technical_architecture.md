# Fin-Track - Technical Architecture

**Complete Technical Documentation**

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (PWA)                        │
├─────────────────────────────────────────────────────────────┤
│  Next.js 14 + TypeScript + React                            │
│  • App Router (Client Components)                            │
│  • Service Worker (Offline Support)                          │
│  • Web App Manifest (Installable)                            │
│  • Tailwind CSS + shadcn/ui                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  FIREBASE SERVICES                          │
├─────────────────────────────────────────────────────────────┤
│  🔐 Firebase Authentication                                  │
│  💾 Firestore Database (NoSQL)                              │
│  ⚡ Cloud Functions (Node.js/TypeScript)                     │
│  🌐 Firebase Hosting                                         │
│  💳 Stripe Extension (firestore-stripe-payments)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  CLOUD RUN (ML SERVICE)                     │
├─────────────────────────────────────────────────────────────┤
│  • Google Document AI — Receipt OCR                          │
│  • Gemini 2.5 Flash — AI digest + chat                       │
│  • Subscription quota enforcement                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend

**Framework**: Next.js 14
- App Router with client components (`"use client"`)
- TypeScript, strict mode

**Styling**: Tailwind CSS + shadcn/ui (Radix UI primitives)

**State Management**: React Context API
- `AuthContext`: Firebase Auth user state
- `CurrencyContext`: Currency selection and formatting
- `DashboardProvider`: Nested providers (FinancialSummary → Savings → Budgets → Goals → Recurring → **Insights**)
- `InsightsContext`: AI insights, health score, anomalies, cash flow forecast, AI digest + chat

**PWA Features**: Service Worker (`sw.js`), Web App Manifest, install prompt, offline support

### Backend

**Firebase Services**:
- **Authentication**: Firebase Auth (Email/Password, Google OAuth)
- **Database**: Firestore (NoSQL, real-time `onSnapshot` listeners)
- **Hosting**: Firebase Hosting (static Next.js export)
- **Functions**: Cloud Functions Gen 2 (Node.js/TypeScript)
- **Stripe Extension**: `firestore-stripe-payments` — manages checkout sessions, subscriptions, webhooks

**ML Service** (`ml-service/`): Express + Node.js on Cloud Run
- `europe-west1` region
- Google Document AI: Expense Parser processor
- Gemini 2.5 Flash via Google AI Studio API key
- JWT auth (Firebase ID tokens)
- Server-side subscription quota enforcement

---

## 📁 Project Structure

```
fin-track/
├── frontend/                              # Next.js Frontend
│   ├── app/
│   │   ├── layout.tsx                     # Root layout
│   │   ├── (marketing)/                   # Public landing page group
│   │   │   ├── layout.tsx                 # Marketing navbar
│   │   │   └── page.tsx                   # Landing page (redirects auth users to /dashboard)
│   │   ├── (app)/                         # Authenticated app group
│   │   │   ├── layout.tsx                 # AuthGuard + AppNavbar
│   │   │   ├── dashboard/page.tsx         # Main dashboard
│   │   │   ├── reports/page.tsx           # Reports & Analytics
│   │   │   ├── calendar/page.tsx          # Calendar view
│   │   │   └── settings/page.tsx          # Settings + billing portal
│   │   └── auth/                          # Auth pages (login, register, forgot-password)
│   │
│   ├── components/
│   │   ├── ui/                            # shadcn/ui components
│   │   │   └── UpgradePrompt.tsx          # Reusable subscription gate UI
│   │   ├── dashboard/                     # Dashboard feature components
│   │   │   ├── ReceiptScannerDialog.tsx   # Pro-gated receipt scanner
│   │   │   ├── AIChatDrawer.tsx           # Pro-gated AI budget coach
│   │   │   ├── AIDigest.tsx               # Pro-gated AI monthly summary
│   │   │   ├── CashFlowForecast.tsx       # Pro-gated 90-day forecast
│   │   │   └── ...
│   │   ├── Pricing.tsx                    # Pricing cards + Stripe checkout flow
│   │   └── BillingPortalButton.tsx        # Stripe customer portal link
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── CurrencyContext.tsx
│   │   └── dashboard/
│   │       ├── DashboardProvider.tsx
│   │       └── InsightsContext.tsx
│   │
│   ├── lib/
│   │   ├── firebase.ts                    # Firebase SDK init
│   │   ├── hooks/
│   │   │   ├── useSubscription.ts         # Real-time subscription state
│   │   │   └── useScanQuota.ts            # Monthly scan quota counter
│   │   ├── constants/
│   │   │   └── subscription.constants.ts  # SCAN_LIMITS, FREE_TIER_LIMITS
│   │   ├── receipt-scanner-api.ts
│   │   └── ...
│   │
│   └── .env.local                         # Local env vars (never committed)
│
├── functions/                             # Firebase Cloud Functions
│   └── src/index.ts                       # processRecurringTransactions + resetMonthlyScanCounts
│
├── ml-service/                            # Cloud Run service
│   ├── src/
│   │   ├── api-server.ts                  # Express routes, quota enforcement
│   │   ├── firestore-quota.ts             # Server-side tier + quota logic
│   │   ├── gemini-handler.ts              # Gemini 2.5 Flash integration
│   │   └── insights-routes.ts             # /api/insights/digest + /api/insights/chat
│   └── deploy.sh
│
├── firestore.rules                        # Firestore security rules
├── firestore.indexes.json
└── firebase.json
```

---

## 💳 Subscription System

### Tiers

| Tier | Scan Quota | AI Features | Price |
|------|-----------|-------------|-------|
| Free | 0 scans/mo | ❌ | $0 |
| Pro | 30 scans/mo | ✅ | Monthly |
| Business | 150 scans/mo | ✅ | Monthly |

### Architecture

The subscription system uses the **Stripe Firebase Extension** (`firestore-stripe-payments`) which:
1. Listens to `customers/{uid}/checkout_sessions` → creates Stripe checkout sessions
2. Syncs Stripe webhook events → writes to `customers/{uid}/subscriptions`
3. Exposes `ext-firestore-stripe-payments-createPortalLink` callable function

### Frontend Flow

1. User clicks "Upgrade to Pro" (`UpgradePrompt`) → navigates to `/?landing#pricing`
2. User clicks "Get Started" on a plan (`Pricing.tsx`) → writes to `customers/{uid}/checkout_sessions`
3. Stripe extension processes and writes `url` back to the document
4. Frontend listener redirects to `window.location.assign(data.url)` (Stripe hosted checkout)
5. On success, Stripe redirects to `/dashboard?checkout=success`
6. `useSubscription` hook picks up the new active subscription via `onSnapshot`

### Subscription Hook (`useSubscription.ts`)

```typescript
// Queries customers/{uid}/subscriptions where status in ["active", "trialing"]
// Returns: { isPro, isBusiness, tier, subscription, loading, error }
// isPro = tier === "pro" || tier === "business"
// Tier resolved from subscription.role field: "pro"/"premium" → pro, "business"/"enterprise" → business
```

### Quota Enforcement

- **Frontend** (`useScanQuota.ts`): reads `scanUsage/{uid}` for UI display only
- **Backend** (`ml-service/src/firestore-quota.ts`): atomic Firestore transaction — check + increment before calling Document AI
- **Reset**: Cloud Function `resetMonthlyScanCounts` runs on 1st of each month at 00:05 UTC

### Feature Gates

All gated components use `useSubscription()` and render `<UpgradePrompt>` when `!isPro`:
- `ReceiptScannerDialog.tsx` — blocks upload/scan UI
- `CashFlowForecast.tsx` — blocks chart card
- `AIDigest.tsx` — overlay over digest card
- `AIChatDrawer.tsx` — opens upgrade dialog instead of chat

Gate pattern includes loading state to prevent flash:
```typescript
const { isPro, loading: subscriptionLoading } = useSubscription()
if (subscriptionLoading) return <Skeleton />
if (!isPro) return <UpgradePrompt />
```

---

## 🤖 ML Service & AI Layer

### Architecture
```
Frontend → POST /api/insights/digest  ┐
           POST /api/insights/chat    ├─ Cloud Run (ml-service) → Gemini 2.5 Flash
           POST /api/upload-bill      ┘                         → Google Document AI
```

### AI Insights Features
| Feature | Type | Details |
|---------|------|---------|
| Financial Health Score | Algorithmic | 0-100, 5 sub-scores, SVG ring card |
| Spending Anomaly Detector | Algorithmic | Z-score, dismissible banner |
| Cash Flow Forecast | Algorithmic | 90-day Recharts AreaChart |
| AI Monthly Digest | Gemini 2.5 Flash | Narrative summary, cached in `aiInsights/{userId}` |
| AI Budget Coach Chat | Gemini 2.5 Flash | Multi-turn, floating Sheet drawer |

### Key Files
- `frontend/lib/insights-engine.ts` — Pure algorithmic functions (client-side, zero cost)
- `frontend/lib/firestore-insights.ts` — Firestore cache (`aiInsights/{userId}`)
- `frontend/contexts/dashboard/InsightsContext.tsx` — Context for all 5 features
- `ml-service/src/gemini-handler.ts` — Gemini SDK integration
- `ml-service/src/insights-routes.ts` — Express routes
- `ml-service/src/firestore-quota.ts` — Server-side tier + quota enforcement

### Gemini Model Notes
- Use `gemini-2.5-flash` — only free-tier model available for new Google AI Studio projects
- `gemini-1.5-flash` → 404 on v1beta for new projects
- `gemini-2.0-flash` → quota limit:0 on new projects

---

## 🗄️ Database Schema (Firestore)

### Collection: `users`
**Document ID**: Firebase Auth UID

```typescript
{
  email: string
  username: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  currency: string              // Default: "EUR"
  language: string              // Default: "en"
  timezone: string
  providerId: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Collection: `entries`
**Document ID**: Auto-generated

```typescript
{
  userId: string
  type: "income" | "expense"
  amount: number
  currency: string
  description: string
  category: string
  date: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
  tags?: string[]
  notes?: string
  receiptUrl?: string
  recurring?: boolean
  recurringId?: string
}
```

### Collection: `budgets` / `goals` / `savingsAccounts` / `recurringTransactions`
Standard shape: `{ userId, ...fields, createdAt, updatedAt }`

### Collection: `financialSummaries`
**Document ID**: Firebase Auth UID — single source of truth for dashboard metrics.

```typescript
{
  userId: string
  totalBalance: number
  months: { "YYYY-MM": { totalIncome, totalExpenses, expensesByCategory, incomeByCategory } }
  updatedAt: Timestamp
}
```

### Collection: `aiInsights`
**Document ID**: Firebase Auth UID — Gemini digest cache.

```typescript
{ digests: { "YYYY-MM": "narrative text..." }, updatedAt: Timestamp }
```

### Collection: `scanUsage`
**Document ID**: Firebase Auth UID — monthly receipt scan quota counter. **Write-protected** (Admin SDK only).

```typescript
{
  count: number        // scans used this month
  month: string        // "YYYY-MM"
  updatedAt: Timestamp
  resetAt: Timestamp   // set by resetMonthlyScanCounts function
}
```

### Collection: `customers` (Stripe Extension)
**Document ID**: Firebase Auth UID

```
customers/{uid}/
  ├── subscriptions/{subscriptionId}
  │     status: "active" | "trialing" | "past_due" | "canceled" | ...
  │     role: "pro" | "business"      ← determines tier in useSubscription
  │     price: { id: "price_xxx" }
  │     items: [{ price: { id } }]
  │     current_period_end: Timestamp
  │     cancel_at_period_end: boolean
  │
  ├── checkout_sessions/{sessionId}
  │     price: "price_xxx"
  │     success_url / cancel_url
  │     url: "https://checkout.stripe.com/..."  ← written by extension
  │     error: {}                                ← written by extension on failure
  │
  └── payments/{paymentId}
        (read-only, written by Stripe extension)
```

---

## 🔐 Security Rules (Firestore)

Key rules (see `firestore.rules` for full file):

```javascript
// scanUsage — read-only for owner, write-only by Admin SDK
match /scanUsage/{userId} {
  allow read: if request.auth.uid == userId;
  allow write: if false;
}

// customers — Stripe extension collections
match /customers/{uid} {
  allow read: if request.auth.uid == uid;
  match /checkout_sessions/{id} { allow read, write: if request.auth.uid == uid; }
  match /subscriptions/{id}     { allow read: if request.auth.uid == uid; }
  match /payments/{id}          { allow read: if request.auth.uid == uid; }
}

// products/prices — read-only for all authenticated users
match /products/{productId} {
  allow read: if request.auth != null;
  match /prices/{priceId} { allow read: if request.auth != null; }
}
```

---

## 🔄 Subscription Data Flow

### Checkout Flow
```
1. User opens Pricing page (/?landing#pricing)
2. Clicks "Get Started" → handleSubscribe(planKey)
3. Writes to customers/{uid}/checkout_sessions
4. Stripe Extension creates Stripe session → writes url back
5. onSnapshot fires → window.location.assign(data.url)
6. User completes Stripe checkout
7. Stripe webhook → Extension writes to customers/{uid}/subscriptions
8. useSubscription onSnapshot fires → isPro = true
9. Redirect to /dashboard?checkout=success
```

### Receipt Scan Quota Flow
```
1. User uploads file in ReceiptScannerDialog
2. POST /api/upload-bill with Firebase ID token
3. ml-service: checkSubscriptionTier(uid) → reads customers/{uid}/subscriptions
4. ml-service: checkAndIncrementScanQuota(uid, tier) → Firestore transaction on scanUsage/{uid}
5. If allowed: calls Document AI → returns extracted data
6. If denied: 402 QuotaExceeded → frontend shows error
```

---

## 📦 Key Dependencies

### Frontend
```json
{
  "next": "14.x",
  "react": "18.x",
  "typescript": "5.x",
  "firebase": "10.x",
  "tailwindcss": "3.x",
  "sonner": "latest",
  "recharts": "latest",
  "next-intl": "latest",
  "lucide-react": "latest",
  "jspdf + jspdf-autotable": "latest"
}
```

### ML Service
```json
{
  "express": "4.x",
  "firebase-admin": "12.x",
  "@google-cloud/documentai": "8.x",
  "@google/generative-ai": "latest",
  "express-rate-limit": "latest",
  "multer": "latest"
}
```

---

## 🚀 Deployment

See `md/deployment.md` for full step-by-step deployment guide.

**Quick reference**:
```bash
# All Firebase services
cd frontend && npm run build && cd ..
firebase deploy

# ML Service only (when ml-service code changes)
cd ml-service && bash deploy.sh
```

---

## 📱 PWA Architecture

- Service Worker (`sw.js`): caching, offline support, auto-updates
- Web App Manifest: standalone display, brand icons
- Install prompt component (`InstallPrompt.tsx`)

---

## 🔧 Cloud Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `processRecurringTransactionsScheduled` | Cron: daily 01:00 UTC | Auto-creates due recurring transactions |
| `processMyRecurringTransactions` | HTTPS callable | Manual trigger for user's recurring transactions |
| `resetMonthlyScanCounts` | Cron: 1st of month 00:05 UTC | Resets `scanUsage.count` to 0 for all users |

---

## 🔍 Code Quality

- TypeScript strict mode
- ESLint
- All user-facing errors shown via `sonner` toast, not just `console.error`

---

**Last Updated**: March 12, 2026
**Architecture Version**: 3.1
**Status**: Production Ready ✅
