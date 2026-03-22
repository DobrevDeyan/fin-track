# Pocket - Smart Financial Management

A privacy-first personal finance Progressive Web App (PWA) with AI-powered insights, receipt scanning, and intelligent budgeting. Built with Next.js 14, Firebase, and Google Cloud AI services.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication & Security](#authentication--security)
- [AI & ML Features](#ai--ml-features)
- [Deployment](#deployment)
- [Testing](#testing)
- [Scripts Reference](#scripts-reference)

---

## Architecture Overview

Pocket is a monorepo with three services:

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
    │   Firebase    │  │  Cloud       │  │   ML Service     │
    │   Auth        │  │  Firestore   │  │   (Cloud Run)    │
    │   (Auth)      │  │  (Database)  │  │                  │
    └──────────────┘  └──────────────┘  │  - Document AI   │
                             ▲          │  - Gemini 2.5    │
                             │          └──────────────────┘
                      ┌──────────────┐
                      │   Cloud      │
                      │   Functions  │
                      │  (Scheduled) │
                      └──────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui (Radix UI) |
| **Charts** | Recharts |
| **Auth** | Firebase Authentication (Email + Google OAuth) |
| **Database** | Cloud Firestore (NoSQL) |
| **Backend** | Firebase Cloud Functions (Node.js 20) |
| **ML Service** | Express.js on Google Cloud Run |
| **Receipt Scanning** | Google Document AI (Expense Parser) |
| **AI Chat & Digest** | Google Gemini 2.5 Flash |
| **Hosting** | Firebase Hosting |
| **Export** | jsPDF, CSV |
| **i18n** | next-intl (English, Bulgarian) |
| **Testing** | Jest, React Testing Library |

---

## Project Structure

```
fin-track/
├── frontend/                  # Next.js 14 PWA
│   ├── app/                   # App Router pages
│   │   ├── auth/              # Login & registration
│   │   ├── dashboard/         # Main app (protected)
│   │   │   ├── reports/       # Reports & AI digest
│   │   │   └── calendar/      # Calendar view
│   │   └── page.tsx           # Landing page
│   ├── components/            # 84+ React components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── landing/           # Marketing/landing page
│   │   └── ui/                # shadcn/ui base components
│   ├── contexts/              # React Context providers
│   ├── lib/                   # Utilities & API clients
│   │   ├── firestore-*.ts     # Firestore CRUD operations
│   │   ├── insights-engine.ts # Client-side AI algorithms
│   │   ├── insights-api.ts    # ML service HTTP client
│   │   └── categories.ts      # Category definitions
│   ├── messages/              # i18n translation files
│   └── public/                # Static assets, SW, manifest
│
├── functions/                 # Firebase Cloud Functions
│   └── src/
│       └── index.ts           # Recurring transaction processor
│
├── ml-service/                # AI/ML microservice
│   ├── src/
│   │   ├── api-server.ts      # Express server entry point
│   │   ├── document-ai-handler.ts  # Receipt scanning
│   │   └── gemini-handler.ts  # AI digest & chat
│   ├── Dockerfile             # Cloud Run container
│   └── deploy.sh              # Deployment script
│
├── firebase.json              # Firebase project config
├── firestore.rules            # Security rules
├── firestore.indexes.json     # Database indexes
└── md/                        # Internal documentation
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ LTS
- **npm** 9+
- **Firebase CLI**: `npm install -g firebase-tools`
- **Google Cloud CLI** (optional, for ML service deployment)
- A **Firebase project** with Firestore and Authentication enabled
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com) (free tier, for AI features)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/fin-track.git
cd fin-track

# Frontend
cd frontend
npm install

# Cloud Functions
cd ../functions
npm install

# ML Service (optional)
cd ../ml-service
npm install
```

### 2. Configure Firebase

```bash
firebase login
firebase use --add    # Select your Firebase project
```

Ensure your Firebase project has these services enabled:
- **Authentication** (Email/Password + Google sign-in providers)
- **Cloud Firestore** (Native mode)
- **Hosting**
- **Cloud Functions** (Blaze plan required)

### 3. Set Up Environment Variables

See [Environment Variables](#environment-variables) below for all required values.

### 4. Deploy Firestore Rules & Indexes

```bash
firebase deploy --only firestore
```

### 5. Run Locally

```bash
# Terminal 1 - Frontend (http://localhost:3001)
cd frontend
npm run dev

# Terminal 2 - ML Service (http://localhost:8000, optional)
cd ml-service
npm run dev

# Terminal 3 - Firebase Emulators (optional)
firebase emulators:start
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)

```env
# Firebase (required — get values from Firebase Console > Project Settings > Your Apps)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# ML Service
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:8000

# Stripe (use test keys for local dev)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=price_...
```

For production, set `NEXT_PUBLIC_ML_SERVICE_URL` to your Cloud Run URL and use live Stripe keys.

### ML Service (`ml-service/.env`)

```env
# Google Cloud Platform
GCP_PROJECT_ID=your-project-id
GCP_PROCESSOR_ID=your-document-ai-processor-id
GCP_LOCATION=eu

# Authentication (local dev only - Cloud Run uses default credentials)
GOOGLE_APPLICATION_CREDENTIALS=./keys/your-service-account-key.json

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Server
PORT=8000

# CORS
FRONTEND_URL=http://localhost:3001
```

Create a `.env` file by copying the example:

```bash
cd ml-service
cp .env.example .env
# Edit .env with your values
```

---

## Database Schema

All user data is scoped by `userId` with Firestore security rules enforcing ownership.

### Collections

| Collection | Document ID | Description |
|-----------|------------|-------------|
| `users` | Firebase UID | User profile (name, email, currency, language, timezone) |
| `entries` | Auto-generated | Transactions (income/expense with category, amount, date, tags) |
| `budgets` | Auto-generated | Budget limits per category with period and alert threshold |
| `goals` | Auto-generated | Savings goals with target amount, deadline, progress |
| `savingsAccounts` | Auto-generated | Virtual savings accounts with balances |
| `recurringTransactions` | Auto-generated | Recurring transaction templates (weekly/monthly/yearly) |
| `financialSummaries` | Firebase UID | Aggregated monthly income/expenses/categories (single doc per user) |
| `aiInsights` | Firebase UID | Cached AI-generated monthly digests |

### Key Document Structures

**Entry (Transaction)**
```typescript
{
  userId: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: Timestamp;
  description: string;
  tags?: string[];
  notes?: string;
  receiptUrl?: string;
  recurring?: boolean;
}
```

**Financial Summary**
```typescript
{
  userId: string;
  totalIncome: number;
  totalExpenses: number;
  months: {
    "YYYY-MM": {
      income: number;
      expenses: number;
      expensesByCategory: { [category: string]: number };
    }
  };
  updatedAt: Timestamp;
}
```

---

## API Reference

### ML Service Endpoints

#### `GET /api/health`
Health check for service status.

**Response:**
```json
{
  "status": "healthy",
  "environment": {
    "hasProjectId": true,
    "hasProcessorId": true,
    "authMode": "serviceAccount"
  }
}
```

#### `POST /api/upload-bill`
Scan a receipt/bill image using Document AI.

**Request:** `multipart/form-data`
- `billFile` - Image (JPEG, PNG, WebP, GIF) or PDF (max 10MB)
- `requestId` - Unique request identifier
- `userId` - Authenticated user ID

**Response:**
```json
{
  "success": true,
  "data": {
    "merchant": "Store Name",
    "amount": 42.50,
    "date": "2026-03-09",
    "items": [{ "description": "Item", "amount": 10.00 }],
    "rawText": "...",
    "confidence": 0.95
  }
}
```

#### `POST /api/insights/digest`
Generate an AI monthly spending digest.

**Request:**
```json
{
  "context": {
    "currentMonth": { "income": 3000, "expenses": 2100, "expensesByCategory": {} },
    "previousMonth": { "income": 3000, "expenses": 1800, "expensesByCategory": {} },
    "budgets": [],
    "currency": "EUR"
  }
}
```

**Response:**
```json
{
  "success": true,
  "digest": "Your spending increased by 17% this month..."
}
```

#### `POST /api/insights/chat`
Multi-turn AI budget coaching chat.

**Request:**
```json
{
  "message": "How can I reduce my food spending?",
  "context": { /* SpendingContext */ },
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "response": "Based on your data, you spent..."
}
```

### Firebase Cloud Functions

| Function | Trigger | Description |
|---------|---------|-------------|
| `processRecurringTransactionsScheduled` | Scheduled (daily 1:00 AM UTC) | Creates entries for due recurring transactions |
| `processMyRecurringTransactions` | Callable (authenticated) | On-demand recurring transaction processing |

---

## Authentication & Security

### Authentication Methods
- **Email/Password** via Firebase Authentication
- **Google OAuth** via Firebase Authentication

### Security Rules
All Firestore collections enforce user-scoped access:

```
allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
```

- Users can only read/write their own data
- Document creation requires matching `userId` field
- `financialSummaries` and `aiInsights` use the user's UID as the document ID

### Frontend Auth Flow
1. User authenticates via Firebase Auth
2. `AuthContext` stores auth state and user profile
3. `AuthGuard` component protects `/dashboard/*` routes
4. Session timeout with configurable inactivity warning

---

## AI & ML Features

### 1. Receipt Scanner (Google Document AI)
- Expense Parser processor extracts merchant, amount, date, and line items
- Supports image and PDF uploads
- Confidence scoring for extraction accuracy

### 2. Financial Health Score (Client-Side, Zero Cost)
- Algorithmic 0-100 score computed entirely in the browser
- Five weighted sub-components: Savings Rate (30), Budget Adherence (25), Goal Progress (20), Income Stability (15), Spending Regularity (10)
- Implementation: `frontend/lib/insights-engine.ts`

### 3. Spending Anomaly Detection (Client-Side)
- Z-score based detection of unusual spending spikes per category
- Dismissible alert banners on the dashboard

### 4. Cash Flow Forecast (Client-Side)
- 90-day balance projection based on recurring transactions
- Confidence interval bands (upper/lower bounds)
- Recharts AreaChart visualization

### 5. AI Monthly Digest (Gemini 2.5 Flash)
- 3-5 sentence narrative summary of monthly spending
- Highlights month-over-month changes and provides recommendations
- Cached in Firestore to avoid redundant API calls

### 6. AI Budget Coach Chat (Gemini 2.5 Flash)
- Multi-turn conversational AI grounded in the user's financial data
- Floating drawer interface with suggested prompts
- Privacy-aware: only sends aggregated data, not raw transaction descriptions

---

## Deployment

### Frontend (Firebase Hosting)

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

The frontend is exported as a static site to `frontend/out/` and served via Firebase Hosting CDN.

### Cloud Functions

```bash
firebase deploy --only functions
```

Requires the Firebase Blaze (pay-as-you-go) plan for scheduled functions.

### ML Service (Cloud Run)

```bash
cd ml-service
bash deploy.sh
```

The deployment script builds a Docker container and deploys to Cloud Run (europe-west1 region, 512MB RAM, 1 CPU, 0-3 instances).

After deploying, update the frontend's `NEXT_PUBLIC_ML_SERVICE_URL` with the Cloud Run URL.

### Firestore Rules & Indexes

```bash
firebase deploy --only firestore
```

---

## Testing

```bash
cd frontend

# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode
npm run test:ci
```

Tests use **Jest** and **React Testing Library**.

---

## Scripts Reference

### Frontend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server on port 3001 |
| `npm run dev:turbo` | Dev server with Turbopack |
| `npm run build` | Production build (syncs version + Next.js export) |
| `npm start` | Serve production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:coverage` | Generate coverage report |

### Cloud Functions

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript |
| `npm run build:watch` | Compile in watch mode |
| `npm run serve` | Build + start emulator |
| `npm run deploy` | Deploy to Firebase |
| `npm run logs` | View Cloud Functions logs |

### ML Service

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (ts-node, port 8000) |
| `npm run build` | Compile TypeScript |
| `npm start` | Start production server |

---

## License

This project is private and not licensed for redistribution.
