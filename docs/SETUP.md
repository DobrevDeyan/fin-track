# Pocket — Development Setup

**Last Updated:** April 2026

---

## Prerequisites

- **Node.js** 22+ LTS (`node --version` should show v22.x)
- **npm** 9+
- **Firebase CLI**: `npm install -g firebase-tools`
- **Google Cloud CLI** (optional — only needed for ML service deployment)
  - Windows: download the installer from cloud.google.com/sdk/docs/install, then use "Google Cloud SDK Shell" from the Start menu
  - Restart your terminal after install so `gcloud` is in PATH
- A **Firebase project** with Firestore, Authentication, and Hosting enabled (Blaze plan for Cloud Functions)
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com) (free tier, for AI features)

---

## Clone & Install

```bash
git clone <repo-url>
cd fin-track

# Frontend
cd frontend
npm install

# Cloud Functions
cd ../functions
npm install

# ML Service (optional — only for receipt scanning + AI locally)
cd ../ml-service
npm install
```

---

## Firebase Authentication

```bash
firebase login
firebase use --add   # Select your Firebase project (fin-track-adc2c)
```

Ensure these Firebase services are enabled in the console:
- Authentication (Email/Password + Google sign-in providers)
- Cloud Firestore (Native mode)
- Hosting
- Storage
- Cloud Functions (Blaze plan required for scheduled functions)

---

## Environment Variables

### Frontend (`frontend/.env.local`)

```env
# Firebase — get values from Firebase Console > Project Settings > Your Apps
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# ML Service (use Cloud Run URL in production)
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:8000

# Stripe (use test keys for local dev)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=price_...

# Sentry — DSN is hardcoded in sentry.*.config.ts (wizard-generated), but set
# this too so any legacy references resolve
NEXT_PUBLIC_SENTRY_DSN=https://a4558a37de4cd389bd289658df338449@o4511088583114752.ingest.de.sentry.io/4511088625713232

# Optional
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.com
```

For production builds, create `frontend/.env.production` with the live Cloud Run URL and live Stripe keys.

**Important:** Variables must start with `NEXT_PUBLIC_` to be available in the browser. Restart the dev server after any change to `.env.local`.

### ML Service (`ml-service/.env`)

```bash
cd ml-service
cp .env.example .env
```

```env
GCP_PROJECT_ID=fin-track-adc2c
GCP_PROCESSOR_ID=566b35e21d475435
GCP_LOCATION=eu
GOOGLE_APPLICATION_CREDENTIALS=./keys/your-service-account-key.json
GEMINI_API_KEY=your_gemini_api_key
PORT=8000
FRONTEND_URL=http://localhost:3001
```

`GOOGLE_APPLICATION_CREDENTIALS` is only needed for local dev. Cloud Run uses Application Default Credentials (ADC) automatically.

**Gemini key:** Create one at https://aistudio.google.com → Get API key → Create API key in new project. Use the free tier — model must be `gemini-2.5-flash`.

### Cloud Functions

No environment variables needed — Firebase Admin SDK auto-initializes in the Functions runtime.

### Full Frontend Environment Variables Reference

| Variable | Dev default | Production |
|----------|-------------|------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | *(your project key)* | same |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `your-project-id` | same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` | same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | *(sender ID)* | same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | *(app ID)* | same |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | *(G-XXXXXXX)* | same |
| `NEXT_PUBLIC_ML_SERVICE_URL` | `http://localhost:8000` | Cloud Run URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | test price ID | live price ID |
| `NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID` | test price ID | live price ID |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN from sentry.io (required) | same |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | *(optional)* | e.g. `pocket.app` |

---

## Running Locally

```bash
# Terminal 1 — Frontend (http://localhost:3001)
cd frontend && npm run dev

# Terminal 2 — ML Service (http://localhost:8000, optional)
cd ml-service && npm run dev

# Terminal 3 — Firebase Emulators (optional)
firebase emulators:start
```

Without the ML service running, AI features show "not configured" gracefully — all algorithmic features (health score, anomaly detection, forecast) still work.

---

## Deploy Firestore Rules & Indexes

After setup, deploy rules before testing locally with emulators off:

```bash
firebase deploy --only firestore,storage
```

---

## Sentry Error Monitoring

Sentry is already configured in the codebase (`sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `instrumentation-client.ts`). **You do not need to re-run the wizard on a new machine** — the DSN is hardcoded in those files.

### What you need on a new machine

1. Copy `.env.sentry-build-plugin` from the working machine (it contains the auth token for source map uploads at build time). This file is gitignored.

   Alternatively, generate a new token:
   - Go to [sentry.io](https://sentry.io) → Settings → Auth Tokens → Create token
   - Scopes needed: `project:read`, `project:releases`, `org:read`
   - Create `frontend/.env.sentry-build-plugin`:
     ```env
     SENTRY_AUTH_TOKEN=your_token_here
     ```

2. That's it — the rest is already in git.

### How it works

- **`instrumentation-client.ts`** — initializes Sentry in the browser (no dev guard, sends in all environments)
- **`sentry.server.config.ts`** — initializes Sentry on the server/API routes
- **`sentry.edge.config.ts`** — initializes Sentry on edge runtime
- **`lib/utils/logger.ts`** — `logger.error(..., { critical: true })` automatically calls `Sentry.captureException`

### Critical errors forwarded to Sentry automatically

| Location | Error |
|----------|-------|
| `firestore-entries.ts` | Create / update / delete entry |
| `firestore-recurring.ts` | Process recurring transactions |
| `firestore-summary.ts` | Initialize financial summary |
| `firestore-users.ts` | Complete onboarding |
| `AuthContext.tsx` | Create user document |
| `error.tsx` | Any unhandled React error boundary catch |
| `SectionErrorBoundary.tsx` | Any dashboard section crash |

### To test Sentry on a new machine

```bash
cd frontend && npm run dev
# Visit http://localhost:3001/sentry-example-page — page was deleted after initial test
# Alternatively trigger via browser console:
# import('@sentry/nextjs').then(s => s.captureException(new Error('test')))
```

---

## Stripe Test Credentials

For testing the subscription checkout locally:

| Field | Value |
|-------|-------|
| Card number | `4242 4242 4242 4242` |
| Expiry | Any future date (e.g. `12/34`) |
| CVC | Any 3 digits (e.g. `123`) |
| Name / ZIP | Any value |

Use `pk_test_` publishable key and test price IDs in `.env.local`. Test in incognito if browser extensions cause CSP errors on Stripe's hosted checkout page.

---

## Scripts Reference

### Frontend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server on port 3001 |
| `npm run dev:turbo` | Dev server with Turbopack |
| `npm run build` | Production build (syncs version + Next.js static export to `out/`) |
| `npm start` | Serve production build |
| `npm run lint` | Run ESLint |

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
