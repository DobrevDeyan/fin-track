# Fin-Track Deployment Guide

Complete step-by-step guide to deploy the entire Fin-Track application from scratch.

## Architecture Overview

```
Phone/Browser
     |
     v
Firebase Hosting (Static Next.js)     ── https://fin-track-adc2c.web.app
     |
     ├── Firestore (Database)          ── entries, categories, budgets, goals, etc.
     ├── Firebase Auth                 ── Google/email sign-in
     ├── Firebase Functions            ── recurring transaction processing (daily cron)
     |
     └── Cloud Run (ML Service)       ── https://ml-service-qcggwwshpa-ew.a.run.app
              |
              ├── Google Document AI   ── Receipt/bill OCR parsing (EU processor)
              └── Google Gemini AI     ── AI digest + chat (gemini-2.5-flash, free tier)
```

## Components

| Component | Location | Deploys To |
|-----------|----------|------------|
| Frontend | `frontend/` | Firebase Hosting |
| Firestore Rules & Indexes | `firestore.rules`, `firestore.indexes.json` | Firebase Firestore |
| Cloud Functions | `functions/` | Firebase Functions |
| ML Service (Receipt Scanner + AI Insights) | `ml-service/` | Google Cloud Run |

---

## Prerequisites

### 1. Install Tools

```bash
# Node.js 20 (LTS)
node --version  # should be v20.x

# Firebase CLI
npm install -g firebase-tools

# Google Cloud CLI
# Download from: https://cloud.google.com/sdk/docs/install
# On Windows: run the installer, then use "Google Cloud SDK Shell" from the Start menu
# IMPORTANT: After install, restart your terminal/IDE so gcloud is in PATH
gcloud --version
```

### 2. Authenticate

```bash
# Firebase
firebase login

# Google Cloud (use Google Cloud SDK Shell on Windows if gcloud is not in PATH)
gcloud init
gcloud auth login
gcloud config set project fin-track-adc2c
```

### 3. Verify Project

```bash
firebase projects:list
# Should show fin-track-adc2c

gcloud projects describe fin-track-adc2c
```

---

## Deployment Steps (In Order)

### Step 1: Deploy Firestore Rules & Indexes

This has no build step and no dependencies. Deploy first.

```bash
firebase deploy --only firestore
```

This deploys:
- `firestore.rules` — Security rules for all collections
- `firestore.indexes.json` — Composite indexes for recurring transactions and savings accounts

### Step 2: Deploy Firebase Functions

Three functions are deployed:
- `processRecurringTransactionsScheduled` — Runs daily at 1:00 AM UTC, processes recurring transactions
- `processMyRecurringTransactions` — HTTPS callable, lets a user manually trigger their recurring transactions
- `resetMonthlyScanCounts` — Runs on the 1st of each month at 00:05 UTC, resets receipt scan quotas to 0 for all users

```bash
# Install dependencies (if not done)
cd functions && npm install && cd ..

# Deploy (TypeScript is compiled automatically by the predeploy hook)
firebase deploy --only functions
```

### Step 3: Deploy ML Service to Cloud Run

The receipt scanning API must be deployed before the frontend so you have the Cloud Run URL.

#### 3a. Grant Document AI Permission (One-Time)

```bash
gcloud projects add-iam-policy-binding fin-track-adc2c \
  --member='serviceAccount:fin-track-adc2c@appspot.gserviceaccount.com' \
  --role='roles/documentai.apiUser'
```

#### 3b. Install Dependencies & Deploy

```bash
cd ml-service
npm install
bash deploy.sh
```

The script will:
1. Enable required GCP APIs (Cloud Build, Cloud Run, Artifact Registry, Document AI)
2. Create an Artifact Registry Docker repository (if needed)
3. Build the Docker image via Cloud Build
4. Deploy to Cloud Run in `europe-west1`

After deployment, it prints the **Service URL** — copy it, you need it for the next step.

```
Service URL: https://ml-service-xxxxxxxxxx-ew.a.run.app
```

#### 3c. Verify ML Service

```bash
curl https://ml-service-xxxxxxxxxx-ew.a.run.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "environment": {
    "hasProjectId": true,
    "hasProcessorId": true,
    "authMode": "adc"
  }
}
```

### Step 4: Build & Deploy Frontend

#### 4a. Set environment variables

Create `frontend/.env.production` with the Cloud Run URL from Step 3 and your Stripe keys:

```bash
cat > frontend/.env.production << 'EOF'
NEXT_PUBLIC_ML_SERVICE_URL=https://ml-service-xxxxxxxxxx-ew.a.run.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=price_...
EOF
```

For **sandbox/test** use `pk_test_` keys and the corresponding test price IDs from the Stripe dashboard.

These env vars are baked into the static bundle at build time (`NEXT_PUBLIC_` prefix).

#### 4b. Build the Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

This runs:
1. `sync-version` — Updates cache-busting version numbers in `sw.js`, `manifest.json`, and `layout.tsx`
2. `next build` — Produces a static export in `frontend/out/`

#### 4c. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

The app is now live at: **https://fin-track-adc2c.web.app**

---

## Deploy Everything at Once (After Initial Setup)

Once you've done the initial setup above, for subsequent deploys:

```bash
# 1. ML Service (only if ml-service code changed)
cd ml-service && bash deploy.sh && cd ..

# 2. Frontend + Functions + Firestore (all Firebase services)
cd frontend && npm run build && cd ..
firebase deploy
```

Or deploy only what changed:
```bash
firebase deploy --only hosting           # Frontend only
firebase deploy --only functions         # Functions only
firebase deploy --only firestore         # Rules & indexes only
firebase deploy --only hosting,functions # Frontend + functions
```

---

## Environment Variables Reference

### Frontend (build-time, baked into static bundle)

| Variable | Dev default | Where |
|----------|-------------|-------|
| `NEXT_PUBLIC_ML_SERVICE_URL` | `http://localhost:8000` | `frontend/.env.local` / `.env.production` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `frontend/.env.local` / `.env.production` |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | *(test price ID)* | `frontend/.env.local` / `.env.production` |
| `NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID` | *(test price ID)* | `frontend/.env.local` / `.env.production` |

Firebase config (API key, project ID, etc.) is hardcoded in `frontend/lib/firebase.ts`.

> **Test vs Production**: Use `pk_test_` / test price IDs for sandbox. Use `pk_live_` / live price IDs for production. The Stripe Firebase Extension must also be configured with the matching secret key (`sk_test_` or `sk_live_`).

### ML Service (set automatically by `deploy.sh`)

| Variable | Production Value | Purpose |
|----------|-----------------|---------|
| `GCP_PROJECT_ID` | `fin-track-adc2c` | GCP project ID |
| `GCP_LOCATION` | `eu` | Document AI region |
| `GCP_PROCESSOR_ID` | `566b35e21d475435` | Document AI processor |
| `FRONTEND_URL` | `https://fin-track-adc2c.web.app,https://fin-track-adc2c.firebaseapp.com,http://localhost:3001,http://localhost:3000` | CORS allowed origins |
| `GEMINI_API_KEY` | (set in deploy.sh) | Gemini AI free tier key |
| `PORT` | `8080` (set by Cloud Run) | Express server port |

**Important**: Use `--update-env-vars` when updating a single var on Cloud Run — `--set-env-vars` replaces ALL vars.

```bash
# Safe: update one var without wiping others
gcloud run services update ml-service --update-env-vars GEMINI_API_KEY=new_key --region europe-west1 --project fin-track-adc2c
```

**Gemini AI setup (free tier):**
1. Create API key at https://aistudio.google.com (new project → free tier)
2. Model must be `gemini-2.5-flash` — `gemini-1.5-flash` returns 404, `gemini-2.0-flash` has zero quota on new projects
3. Key is baked into `deploy.sh` as default; override by setting `GEMINI_API_KEY` env var before running

### ML Service — Local Development

Copy `.env.example` to `.env` and fill in your values:
```bash
cd ml-service
cp .env.example .env
```

Required for local dev:
```
GCP_PROJECT_ID=fin-track-adc2c
GCP_PROCESSOR_ID=566b35e21d475435
GCP_LOCATION=eu
GOOGLE_APPLICATION_CREDENTIALS=./keys/<your-service-account-key>.json
PORT=8000
FRONTEND_URL=http://localhost:3001
```

### Firebase Functions

No environment variables needed — Firebase Admin auto-initializes in the Functions runtime.

---

## Stripe Extension Setup

The `firestore-stripe-payments` Firebase Extension handles all Stripe integration (checkout sessions, webhooks, subscription syncing).

### One-Time Extension Configuration

1. In Firebase Console → Extensions → "Run Payments with Stripe"
2. Set the Stripe secret key (`sk_test_...` or `sk_live_...`)
3. Set the webhook secret (from Stripe Dashboard → Webhooks)
4. Set **Products and prices collection**: `products`
5. Set **Customer details and subscriptions collection**: `customers`
6. Set **Sync new users to Stripe**: `Sync`

### Product/Price Setup in Stripe

For each plan, create a Product in Stripe Dashboard with a recurring Price, then set the **metadata** on the **Product**:
- Key: `firebaseRole` — Value: `pro` (for Pro plan) or `business` (for Business plan)

This `firebaseRole` value becomes the `role` field on subscription documents in Firestore, which `useSubscription.ts` uses to determine the tier.

### Quota Limits (defined in `frontend/lib/constants/subscription.constants.ts`)

| Role | Scan Quota/month |
|------|-----------------|
| free | 0 |
| pro | 30 |
| business | 150 |

---

## Local Development

Run all services locally:

```bash
# Terminal 1: Frontend (port 3001)
cd frontend && npm run dev

# Terminal 2: ML Service (port 8000)
cd ml-service && npm run dev
```

The frontend defaults to `http://localhost:8000` for the ML service, and the ML service defaults to allowing CORS from `http://localhost:3001`.

---

## Useful Commands

```bash
# Check Cloud Run logs
gcloud run services logs read ml-service --region europe-west1 --project fin-track-adc2c

# Check Firebase Functions logs
firebase functions:log

# List Cloud Run services
gcloud run services list --project fin-track-adc2c

# Check deployment status
firebase hosting:channel:list
gcloud run services describe ml-service --region europe-west1 --project fin-track-adc2c

# Test receipt scanning endpoint
curl -X POST https://ml-service-xxx-ew.a.run.app/api/upload-bill \
  -F "billFile=@receipt.jpg" \
  -F "requestId=test-123"
```

---

## Troubleshooting

### CORS Errors
If the frontend gets CORS errors from the ML service:
- Verify `FRONTEND_URL` includes all origins (Firebase + localhost for dev)
- Current correct value: `https://fin-track-adc2c.web.app,https://fin-track-adc2c.firebaseapp.com,http://localhost:3001,http://localhost:3000`
- Update without wiping other vars: `gcloud run services update ml-service --update-env-vars "FRONTEND_URL=..." --region europe-west1 --project fin-track-adc2c`

### AI Chat Returns "not configured"
- Check `GEMINI_API_KEY` is set: `gcloud run services describe ml-service --region europe-west1 --project fin-track-adc2c --format "yaml(spec.template.spec.containers[0].env)"`
- Verify model is `gemini-2.5-flash` in `ml-service/src/gemini-handler.ts` (code change requires full `bash deploy.sh`)

### Gemini 404 / Quota errors
- 404 `gemini-1.5-flash`: deprecated on v1beta for new projects — use `gemini-2.5-flash`
- 429 `limit: 0` on `gemini-2.0-flash`: no free tier quota on new projects — use `gemini-2.5-flash`

### Document AI Permission Denied
If receipt scanning returns 403/permission errors:
```bash
gcloud projects add-iam-policy-binding fin-track-adc2c \
  --member='serviceAccount:fin-track-adc2c@appspot.gserviceaccount.com' \
  --role='roles/documentai.apiUser'
```

### ML Service Health Check Fails
```bash
# Check if the service is running
gcloud run services describe ml-service --region europe-west1

# Check logs for startup errors
gcloud run services logs read ml-service --region europe-west1 --limit 50
```

### Frontend Build Fails
```bash
# Clear build cache and rebuild
cd frontend
rm -rf .next out node_modules
npm install
npm run build
```
