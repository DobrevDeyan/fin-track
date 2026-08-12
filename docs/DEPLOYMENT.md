# Pocket — Deployment Guide

**Last Updated:** August 2026

Complete step-by-step guide to deploy the entire Pocket application. For local development setup and environment variables see [SETUP.md](SETUP.md).

---

## Components

| Component | Source | Deploys To |
|-----------|--------|------------|
| Frontend | `frontend/` | Firebase Hosting |
| Firestore Rules & Indexes | `firestore.rules`, `firestore.indexes.json` | Firebase Firestore |
| Storage Rules | `storage.rules` | Firebase Storage |
| Cloud Functions | `functions/` | Firebase Functions |
| ML Service | `ml-service/` | Google Cloud Run (`europe-west1`) |

---

## Step 1: Deploy Firestore Rules, Indexes & Storage Rules

No build step. Deploy this first — it has no dependencies.

```bash
firebase deploy --only firestore,storage
```

Deploys:
- `firestore.rules` — security rules for all collections
- `firestore.indexes.json` — composite indexes (entries by userId+receiptUrl+date, assets, recurring transactions)
- `storage.rules` — restricts `receipts/{userId}/**` to owner-only access

> **Note:** Firebase Storage must be initialised in the Firebase Console (Storage → Get Started) before storage rules can be deployed. One-time step per project. Choose `europe-west1` to match Cloud Run.

---

## Step 2: Deploy Firebase Functions

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

TypeScript is compiled automatically by the predeploy hook. Requires Blaze (pay-as-you-go) plan for scheduled functions.

Deployed functions (see [ARCHITECTURE.md](ARCHITECTURE.md#cloud-functions-inventory) for the full list):
- 3 scheduled functions (recurring transactions, scan quota reset, leaderboard aggregation)
- 8 callable functions (household management, recurring transactions, leaderboard opt-in)
- 3 Firestore-triggered functions (budget alerts, audit log)

---

## Step 3: Deploy ML Service to Cloud Run

The ML service URL is needed for the frontend build in Step 4 — deploy this first.

### 3a. Choose the OCR backend

Receipt scanning has two interchangeable backends, selected by the `OCR_BACKEND` env
var (read once at startup). Both ship in every image, so switching is an env-var flip
+ redeploy — no code change.

| `OCR_BACKEND` | Backend | Cost/scan | Notes |
|---|---|---|---|
| `document-ai` (default) | Google Document AI Expense parser | ~$0.10 | Calibrated per-field confidence, EU-resident |
| `gemini-vision` | Gemini vision (`gemini-3.5-flash-lite`) | ~$0.0005 | ~200× cheaper; confidence computed by grounding the total against the model's `rawText`. **Uses the AI Studio key — not EU-resident; alpha only until moved to Vertex AI.** See [GEMINI_VISION_EVALUATION.md](GEMINI_VISION_EVALUATION.md). |

**Current production setting:** `gemini-vision` (alpha).

### 3b. Grant Document AI Permission (One-Time)

Needed for the `document-ai` backend (harmless to grant even when running `gemini-vision`,
so you can switch back without re-granting):

```bash
gcloud projects add-iam-policy-binding fin-track-adc2c \
  --member='serviceAccount:fin-track-adc2c@appspot.gserviceaccount.com' \
  --role='roles/documentai.apiUser'
```

### 3c. Configure `ml-service/.env.deploy` (gitignored, local deploy helper)

`deploy.sh` sources this file. It is **not** committed and **not** read at runtime:

```bash
GEMINI_API_KEY=AIza...                 # required (also used by the gemini-vision backend)
OCR_BACKEND=gemini-vision              # optional; defaults to document-ai if unset
CLOUDSDK_PYTHON="C:/.../google-cloud-sdk/platform/bundledpython/python.exe"  # Windows/Git Bash only
```

> `CLOUDSDK_PYTHON` must be **quoted** if the path contains a space (e.g. `Cloud SDK`),
> or sourcing the file will fail with "No such file or directory".

### 3d. Deploy

On Windows, run this under **Git Bash** (MINGW64) — *not* WSL. In Cmder/PowerShell the
bare `bash` resolves to WSL, which fails with `Logon failure … 0x80070569`. Open a Git
Bash terminal (or call `"…/Git/bin/bash.exe" deploy.sh`) and run from the directory:

```bash
cd ml-service
npm install
./deploy.sh          # or: bash deploy.sh
```

Override the backend for a one-off deploy without editing `.env.deploy`:

```bash
OCR_BACKEND=document-ai ./deploy.sh   # switch prod back to Document AI
```

The script:
1. Enables required GCP APIs (Cloud Build, Cloud Run, Artifact Registry, Document AI)
2. Creates Artifact Registry Docker repository (if needed)
3. Builds Docker image via Cloud Build (runs `npm run build` inside the container — no local build needed)
4. Deploys to Cloud Run (`europe-west1`) with `OCR_BACKEND`, `GEMINI_API_KEY`, and Document AI config set

After deployment it prints the **Service URL** — copy it for Step 4.

```
Service URL: https://ml-service-xxxxxxxxxx-ew.a.run.app
```

### 3e. Verify

```bash
curl https://ml-service-xxxxxxxxxx-ew.a.run.app/api/health
```

Expected (`ocrBackend` reflects the active backend):
```json
{
  "status": "healthy",
  "environment": {
    "ocrBackend": "gemini-vision",
    "hasProjectId": true,
    "hasProcessorId": true,
    "hasGeminiKey": true,
    "authMode": "adc"
  }
}
```

---

## Step 4: Build & Deploy Frontend

### 4a. Set Environment Variables

Create `frontend/.env.production`:

```bash
cat > frontend/.env.production << 'EOF'
NEXT_PUBLIC_ML_SERVICE_URL=https://ml-service-xxxxxxxxxx-ew.a.run.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=price_...
EOF
```

For **sandbox/test**: use `pk_test_` keys and test price IDs from the Stripe dashboard.

Firebase config (`NEXT_PUBLIC_FIREBASE_*`) is typically the same in `.env.local` and `.env.production` — it's already set in `.env.local` and Next.js merges both files.

### 4b. Build

```bash
cd frontend
npm install
npm run build
cd ..
```

The build script:
1. `sync-version` — updates cache-busting version numbers in `sw.js`, `manifest.json`, `layout.tsx`
2. `next build` — static export to `frontend/out/`

### 4c. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

App is live at: **https://fin-track-adc2c.web.app**

---

## Subsequent Deploys (After Initial Setup)

```bash
# ML service (only if ml-service/ code changed)
cd ml-service && bash deploy.sh && cd ..

# Everything Firebase
cd frontend && npm run build && cd ..
firebase deploy
```

Or selectively:

```bash
firebase deploy --only hosting           # Frontend only
firebase deploy --only functions         # Functions only
firebase deploy --only firestore         # Rules & indexes only
firebase deploy --only hosting,functions # Frontend + functions
```

---

## Stripe Extension Setup (One-Time)

1. Firebase Console → Extensions → "Run Payments with Stripe"
2. Set Stripe secret key (`sk_test_...` or `sk_live_...`)
3. Set webhook secret (from Stripe Dashboard → Webhooks)
4. Set **Products and prices collection**: `products`
5. Set **Customer details and subscriptions collection**: `customers`
6. Set **Sync new users to Stripe**: `Sync`

### Product/Price Setup in Stripe

For each plan, create a Product in Stripe with a recurring Price. Set **metadata** on the **Product** (not the price):
- Key: `firebaseRole` — Value: `pro` (Pro plan) or `business` (Business plan)

This becomes the `role` field on Firestore subscription documents, which `useSubscription.ts` uses to gate features.

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

# Update a single Cloud Run env var without wiping others
gcloud run services update ml-service \
  --update-env-vars GEMINI_API_KEY=new_key \
  --region europe-west1 --project fin-track-adc2c

# Switch OCR backend on the live service without a rebuild (new revision restarts)
gcloud run services update ml-service \
  --update-env-vars OCR_BACKEND=document-ai \
  --region europe-west1 --project fin-track-adc2c

# Test receipt scanning endpoint
curl -X POST https://ml-service-xxx-ew.a.run.app/api/upload-bill \
  -F "billFile=@receipt.jpg" \
  -F "requestId=test-123"

# Clear frontend build cache and rebuild
cd frontend && rm -rf .next out node_modules && npm install && npm run build
```

For troubleshooting deployment issues see [ARCHITECTURE.md — Troubleshooting](ARCHITECTURE.md#troubleshooting).
