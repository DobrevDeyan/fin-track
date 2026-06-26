# Pocket — Analytics Service

**Language:** Python 3.11 + FastAPI  
**Status:** Implemented — Phase 1–3 complete  
**Cloud Run URL:** set after first deploy

---

## Table of Contents

1. [Architecture](#architecture)
2. [Project Structure](#project-structure)
3. [How It Works](#how-it-works)
4. [Local Setup](#local-setup)
5. [Environment Variables](#environment-variables)
6. [API Reference](#api-reference)
7. [Running Tests](#running-tests)
8. [Deploying to Cloud Run](#deploying-to-cloud-run)
9. [Connecting the Frontend](#connecting-the-frontend)
10. [Design Decisions](#design-decisions)

---

## Architecture

```
                    ┌────────────────────────────┐
                    │    Frontend (Next.js 14)    │
                    │     PWA / Static Export     │
                    │   Firebase Hosting (CDN)    │
                    └──────┬────────────┬─────────┘
                           │            │
              ┌────────────▼──┐   ┌─────▼──────────────────┐
              │  ML Service   │   │  Analytics Service      │
              │  (Node.js)    │   │  (Python / FastAPI)     │
              │  Cloud Run    │   │  Cloud Run              │
              │               │   │                         │
              │  - OCR        │   │  - Aggregations         │
              │  - Gemini AI  │   │  - Forecasting          │
              └───────────────┘   │  - Anomaly detection    │
                                  │  - Report generation    │
                                  └──────────┬──────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │         Firestore            │
                              │     (shared database)        │
                              └─────────────────────────────┘
```

- Same Google Cloud project (`fin-track-adc2c`) as the ML service
- Same Firebase Auth — the frontend sends a Firebase ID token in the `Authorization: Bearer <token>` header
- Reads from the same Firestore collections the frontend writes to (`entries`, `financialSummaries`, `budgets`, `goals`, `households`)
- Separate Cloud Run service URL, separate memory/CPU allocation

---

## Project Structure

```
analytics-service/
├── main.py                       # FastAPI app, CORS, router registration
├── Dockerfile                    # python:3.11-slim, single stage
├── requirements.txt              # pinned dependencies
├── deploy.sh                     # gcloud build + run deploy script
├── .env.example                  # required environment variables
│
├── routers/
│   ├── analytics.py              # /api/analytics/* — summary, categories, monthly, household
│   ├── forecast.py               # /api/forecast/* — cashflow, budget, savings
│   ├── anomaly.py                # /api/anomaly/* — scan, category
│   ├── reports.py                # /api/reports/* — excel export, tax summary
│   └── investments.py            # /api/investments/* — Phase 4 placeholder
│
├── services/
│   ├── auth.py                   # Firebase token verification (firebase-admin)
│   ├── firestore.py              # Firestore client, entry/summary/goal readers
│   ├── forecasting.py            # Linear trend + EMA cash flow forecasting
│   └── anomaly_detection.py      # Isolation Forest anomaly detection
│
└── models/
    ├── entry.py                  # Pydantic request models (DateRangeRequest)
    └── responses.py              # Typed response models
```

---

## How It Works

### Authentication

Every protected route uses `verify_token` as a FastAPI dependency injected via `Depends()`. It calls `firebase_admin.auth.verify_id_token()` synchronously. FastAPI runs sync route handlers in a thread pool, so this never blocks the event loop.

```
Request → Authorization: Bearer <Firebase ID token>
        → verify_token() decodes it → returns uid
        → uid is passed to the route handler
```

### Firestore reads

`services/firestore.py` uses the Firebase Admin SDK's Firestore client (same SDK, no extra package). It reads from:

| Collection | Used by |
|---|---|
| `entries` | all analytics, forecast, anomaly routes |
| `financialSummaries` | `/analytics/monthly` (pre-aggregated, fast) |
| `budgets` | future budget forecast improvements |
| `goals` | `/forecast/savings` |
| `households` | `/analytics/household` — reads member UIDs then fetches each member's entries |
| `users` | `/analytics/household` — to look up the caller's `householdId` |

Firestore timestamps are returned as timezone-aware `datetime` objects. `_normalize()` strips the timezone before any data reaches pandas, which does not handle tz-aware `Period` grouping well.

### Analytics (`/api/analytics/*`)

Pure pandas aggregations over the entries returned by Firestore:

- **`/summary`** — sums income/expense, computes savings rate, top-5 expense categories by amount
- **`/categories`** — full category breakdown + per-category monthly trend (numpy `polyfit` slope)
- **`/monthly`** — reads from `financialSummaries` directly (no entry scan needed, O(1))
- **`/household`** — fetches each household member's entries separately, then aggregates by member UID

### Forecasting (`/api/forecast/*`)

No Prophet or Stan. Uses two techniques that require only numpy/pandas:

1. **Linear regression** (`np.polyfit`) over monthly net cash flow to estimate the trend slope
2. **Exponential moving average** (α = 0.3) over the last few months to weight recent data more heavily

The predicted daily value combines both: `avg_daily = EMA / 30`, `trend = slope / 30`. Confidence bounds use `±1.96 × (monthly_std / √30)`.

Minimum 2 months of data required. Returns HTTP 422 if not met.

### Anomaly Detection (`/api/anomaly/*`)

- **`/scan`** — runs scikit-learn `IsolationForest` on expense entries. Features: `log(amount)`, category code, day of month. Requires ≥ 10 expense entries; returns empty list otherwise.
- **`/category`** — per-category monthly Z-score spike detection. Flags months where spend is > 1.5 standard deviations above the category mean.

### Reports (`/api/reports/*`)

- **`/excel`** — generates an `.xlsx` workbook with 4 sheets: Transactions, Summary, By Category, Monthly. Uses `openpyxl` with blue header styling. Returns as a streaming binary response with `Content-Disposition: attachment`.
- **`/tax-summary`** — returns income and expense totals broken down by category for a date range. JSON only — no file generated.

---

## Local Setup

### Prerequisites

- Python 3.11+
- A Firebase service account key for `fin-track-adc2c` (download from Firebase Console → Project Settings → Service Accounts)
- Google Cloud SDK (`gcloud`) only needed for deployment

### 1. Create virtualenv and install dependencies

```bash
cd analytics-service
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
FIREBASE_PROJECT_ID=fin-track-adc2c
GOOGLE_APPLICATION_CREDENTIALS=./keys/service-account.json
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
PORT=8080
```

Place your downloaded service account JSON at `analytics-service/keys/service-account.json`. The `keys/` folder is gitignored — do not commit it.

### 3. Run the dev server

```bash
uvicorn main:app --reload --port 8080
```

The service is now at `http://localhost:8080`.

Verify it is running:

```bash
curl http://localhost:8080/api/health
# → {"status":"ok","service":"pocket-analytics"}
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FIREBASE_PROJECT_ID` | Yes | GCP project ID (`fin-track-adc2c`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local only | Path to service account JSON. Not needed on Cloud Run — identity is attached automatically. |
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed CORS origins |
| `PORT` | No | Default `8080`. Cloud Run sets this automatically. |

---

## API Reference

All protected routes require:

```
Authorization: Bearer <Firebase ID token>
```

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Service health check |

### Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/analytics/summary` | Token | Spending summary for a date range |
| `POST` | `/api/analytics/categories` | Token | Category breakdown with monthly trends |
| `POST` | `/api/analytics/monthly` | Token | Month-by-month data from pre-aggregated summary |
| `POST` | `/api/analytics/household` | Token | Per-member spending breakdown for the caller's household |

**Request body for date-range routes:**

```json
{
  "from": "2026-01-01",
  "to": "2026-04-30",
  "currency": "EUR"
}
```

**`/summary` response:**

```json
{
  "totalIncome": 8400.00,
  "totalExpenses": 5230.50,
  "netSavings": 3169.50,
  "savingsRate": 37.7,
  "topCategories": [
    { "category": "Food & Dining", "amount": 980.00, "pct": 18.7, "count": 42 }
  ],
  "entryCount": 186
}
```

### Forecast

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/forecast/cashflow` | Token | 90-day daily cash flow forecast |
| `POST` | `/api/forecast/budget` | Token | Current month projected spend at current daily rate |
| `POST` | `/api/forecast/savings` | Token | Savings goal completion date estimate |

**`/cashflow` request:**

```json
{ "days": 90, "lookback_months": 6 }
```

**`/cashflow` response:**

```json
{
  "forecast": [
    { "date": "2026-05-01", "predicted": 48.20, "lower": 12.10, "upper": 84.30 }
  ],
  "model": "linear_trend_with_ema",
  "confidence": 0.95
}
```

**`/savings` request:**

```json
{ "goal_id": "<Firestore goal document ID>" }
```

### Anomaly Detection

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/anomaly/scan` | Token | Isolation Forest scan on recent entries |
| `POST` | `/api/anomaly/category` | Token | Monthly Z-score spike detection for one category |

**`/scan` request:**

```json
{ "lookback_days": 90, "contamination": 0.05 }
```

`contamination` is the expected fraction of outliers (0.01–0.5). Default `0.05` (5%).

**`/scan` response:**

```json
{
  "anomalies": [
    {
      "id": "abc123",
      "date": "2026-03-14",
      "description": "Electronics store",
      "category": "Shopping",
      "amount": 420.00,
      "currency": "EUR",
      "anomalyScore": 0.94,
      "reason": "Amount is 3.2x the average for Shopping"
    }
  ],
  "scannedCount": 87
}
```

**`/category` request:**

```json
{ "category": "Food & Dining", "lookback_months": 6 }
```

### Reports

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/reports/excel` | Token | Download `.xlsx` workbook (4 sheets) |
| `POST` | `/api/reports/tax-summary` | Token | Annual income/expense breakdown by category |

**`/excel` and `/tax-summary` request:**

```json
{ "from": "2026-01-01", "to": "2026-12-31" }
```

The Excel export returns a binary response with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. The frontend should trigger a file download.

### Investments

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/investments/` | Token | Placeholder — Phase 4 |

---

## Deploying to Cloud Run

```bash
cd analytics-service
bash deploy.sh
```

The script:
1. Enables Cloud Build, Cloud Run, and Artifact Registry APIs
2. Creates the `docker-repo` Artifact Registry repository if it does not exist
3. Builds the Docker image via Cloud Build and pushes it
4. Deploys to Cloud Run in `europe-west1` with 0–3 instances, 512 MB RAM
5. Prints the service URL

**On Cloud Run, `GOOGLE_APPLICATION_CREDENTIALS` is not set.** The service account attached to the Cloud Run revision provides credentials automatically via Workload Identity / ADC. The Firebase Admin SDK picks this up with no extra config.

### Manual deploy commands

```bash
PROJECT_ID=fin-track-adc2c
REGION=europe-west1
IMAGE=europe-west1-docker.pkg.dev/$PROJECT_ID/docker-repo/analytics-service

gcloud builds submit --tag $IMAGE --project $PROJECT_ID

gcloud run deploy analytics-service \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "FIREBASE_PROJECT_ID=$PROJECT_ID,ALLOWED_ORIGINS=https://fin-track-adc2c.web.app"
```

---

## Connecting the Frontend

After deploy, Cloud Run prints the service URL (e.g. `https://analytics-service-xxxx-ew.a.run.app`).

Add it to the frontend environment:

**`frontend/.env.local`**

```env
NEXT_PUBLIC_ANALYTICS_SERVICE_URL=https://analytics-service-xxxx-ew.a.run.app
```

**`frontend/.env.production`**

```env
NEXT_PUBLIC_ANALYTICS_SERVICE_URL=https://analytics-service-xxxx-ew.a.run.app
```

Then call it from the frontend the same way the ML service is called — Firebase ID token in the header:

```ts
const token = await getAuth().currentUser?.getIdToken()

const res = await fetch(`${process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL}/api/analytics/summary`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ from: "2026-01-01", to: "2026-04-30" }),
})
const data = await res.json()
```

---

## Design Decisions

**Why no Prophet?**  
Prophet requires Stan (a C++ probabilistic programming engine) which adds ~800 MB to the image and complicates the build. The implemented approach — linear regression over monthly net cash flow, corrected by exponential moving average — is accurate enough for a personal finance app and keeps the image under 300 MB.

**Why sync route handlers?**  
`firebase_admin.auth.verify_id_token()` and `google-cloud-firestore` are synchronous. FastAPI automatically runs `def` (non-async) route handlers in a thread pool executor, so there is no event loop blocking. Using `async def` with synchronous Firebase SDK calls would have been incorrect.

**Why read `financialSummaries` for `/monthly`?**  
The frontend already maintains this pre-aggregated document atomically on every entry write. Reading it for monthly data is O(1) regardless of how many entries the user has, versus scanning every entry with a full collection query.

**Why strip timezone from Firestore timestamps?**  
pandas `dt.to_period("M")` raises `TypeError` on timezone-aware datetimes. The Firestore Python SDK returns timestamps as UTC-aware `datetime` objects. Stripping the timezone in `_normalize()` before any data reaches pandas avoids this across all routes.

**Why IsolationForest over Z-score for anomaly scan?**  
Z-score detects magnitude outliers within a single dimension. IsolationForest jointly evaluates amount, category, and day-of-month — it catches unusual combinations (a large grocery bill on a Sunday at midnight) that Z-score misses. The `/category` route still uses Z-score because it is intentionally single-dimensional (monthly category totals).
