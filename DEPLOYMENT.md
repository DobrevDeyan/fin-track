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
     └── Cloud Run (ML Service)       ── https://ml-service-xxxxx-ew.a.run.app
              |
              └── Google Document AI   ── Receipt/bill OCR parsing (EU processor)
```

## Components

| Component | Location | Deploys To |
|-----------|----------|------------|
| Frontend | `frontend/` | Firebase Hosting |
| Firestore Rules & Indexes | `firestore.rules`, `firestore.indexes.json` | Firebase Firestore |
| Cloud Functions | `functions/` | Firebase Functions |
| ML Service (Receipt Scanner) | `ml-service/` | Google Cloud Run |

---

## Prerequisites

### 1. Install Tools

```bash
# Node.js 20 (LTS)
node --version  # should be v20.x

# Firebase CLI
npm install -g firebase-tools

# Google Cloud CLI
# https://cloud.google.com/sdk/docs/install
gcloud --version
```

### 2. Authenticate

```bash
# Firebase
firebase login

# Google Cloud
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

Two functions are deployed:
- `processRecurringTransactionsScheduled` — Runs daily at 1:00 AM UTC, processes recurring transactions
- `processMyRecurringTransactions` — HTTPS callable, lets a user manually trigger their recurring transactions

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

#### 4a. Set the ML Service URL

Create `frontend/.env.production` with the Cloud Run URL from Step 3:

```bash
echo "NEXT_PUBLIC_ML_SERVICE_URL=https://ml-service-xxxxxxxxxx-ew.a.run.app" > frontend/.env.production
```

This env var is baked into the static bundle at build time (it's a `NEXT_PUBLIC_` variable).

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
firebase deploy --only hosting          # Frontend only
firebase deploy --only functions         # Functions only
firebase deploy --only firestore         # Rules & indexes only
firebase deploy --only hosting,functions # Frontend + functions
```

---

## Environment Variables Reference

### Frontend (build-time)

| Variable | Default | Where |
|----------|---------|-------|
| `NEXT_PUBLIC_ML_SERVICE_URL` | `http://localhost:8000` | `frontend/.env.production` |

Firebase config (API key, project ID, etc.) is hardcoded in `frontend/lib/firebase.ts`.

### ML Service (set automatically by `deploy.sh`)

| Variable | Production Value | Purpose |
|----------|-----------------|---------|
| `GCP_PROJECT_ID` | `fin-track-adc2c` | GCP project ID |
| `GCP_LOCATION` | `eu` | Document AI region |
| `GCP_PROCESSOR_ID` | `47581562c79b2653` | Document AI processor |
| `FRONTEND_URL` | `https://fin-track-adc2c.web.app` | CORS allowed origin |
| `PORT` | `8080` (set by Cloud Run) | Express server port |

### ML Service — Local Development

Copy `.env.example` to `.env` and fill in your values:
```bash
cd ml-service
cp .env.example .env
```

Required for local dev:
```
GCP_PROJECT_ID=fin-track-adc2c
GCP_PROCESSOR_ID=47581562c79b2653
GCP_LOCATION=eu
GOOGLE_APPLICATION_CREDENTIALS=./keys/<your-service-account-key>.json
PORT=8000
FRONTEND_URL=http://localhost:3001
```

### Firebase Functions

No environment variables needed — Firebase Admin auto-initializes in the Functions runtime.

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
If the frontend gets CORS errors when scanning receipts:
- Verify `FRONTEND_URL` is set correctly on Cloud Run (must match exactly, including `https://`)
- Check Cloud Run logs for `CORS blocked request from origin:` messages
- You can set multiple origins: `FRONTEND_URL=https://fin-track-adc2c.web.app,https://fin-track-adc2c.firebaseapp.com`

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
