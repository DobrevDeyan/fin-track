# Pocket — Python Analytics Service

**Last Updated:** May 2026
**Status:** Planned — ready to scaffold

---

## Table of Contents

1. [Overview](#overview)
2. [Why Python](#why-python)
3. [Architecture Integration](#architecture-integration)
4. [Project Structure](#project-structure)
5. [Setup Guide](#setup-guide)
6. [API Endpoints](#api-endpoints)
7. [Feature Roadmap](#feature-roadmap)
8. [What Else You Can Build with Python](#what-else-you-can-build-with-python)
9. [Deployment (Free)](#deployment-free)
10. [Environment Variables](#environment-variables)

---

## Overview

A second Cloud Run microservice written in **Python + FastAPI**, living alongside the existing Node.js ML service. It owns the data-heavy, computation-intensive work that Python does better: aggregations, forecasting, anomaly detection, and structured analytics.

The frontend calls it the same way it calls the ML service — Firebase ID token in `Authorization` header, JSON response.

---

## Why Python

| Task | Node.js ML Service | Python Analytics Service |
|---|---|---|
| Gemini chat / OCR | ✅ stays here | — |
| Spending aggregations | ❌ done on frontend | ✅ pandas |
| 90-day cash flow forecast | ❌ linear only | ✅ Prophet / ARIMA |
| Anomaly detection | ❌ Z-score only | ✅ Isolation Forest |
| Category ML classification | ❌ keyword matching | ✅ scikit-learn |
| Report generation (PDF/Excel) | ❌ basic | ✅ reportlab / openpyxl |
| Investment portfolio math | ❌ not planned | ✅ numpy / pandas |

---

## Architecture Integration

```
                    ┌────────────────────────────┐
                    │    Frontend (Next.js 14)    │
                    │     PWA / Static Export     │
                    │   Firebase Hosting (CDN)    │
                    └──────┬────────────┬─────────┘
                           │            │
              ┌────────────▼──┐   ┌─────▼──────────────────┐
              │  ML Service   │   │  Analytics Service      │
              │  (Node.js)    │   │  (Python / FastAPI) NEW │
              │  Cloud Run    │   │  Cloud Run              │
              │               │   │                         │
              │  - OCR        │   │  - Aggregations         │
              │  - Gemini AI  │   │  - Forecasting          │
              └───────────────┘   │  - Anomaly detection    │
                                  │  - Category ML          │
                                  │  - Report generation    │
                                  └──────────┬──────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │         Firestore            │
                              │     (shared database)        │
                              └─────────────────────────────┘
```

**Same Google Cloud project** (`fin-track-adc2c`), same Firebase auth, separate Cloud Run URL.

---

## Project Structure

```
fin-track/
└── analytics-service/
    ├── main.py                  # FastAPI app entry point
    ├── Dockerfile
    ├── requirements.txt
    ├── .env.example
    ├── routers/
    │   ├── analytics.py         # /api/analytics/*
    │   ├── forecast.py          # /api/forecast/*
    │   ├── anomaly.py           # /api/anomaly/*
    │   ├── reports.py           # /api/reports/*
    │   └── investments.py       # /api/investments/*
    ├── services/
    │   ├── firestore.py         # Firestore client + helpers
    │   ├── auth.py              # Firebase token verification
    │   ├── forecasting.py       # Prophet / ARIMA logic
    │   └── anomaly_detection.py # Isolation Forest logic
    ├── models/
    │   ├── entry.py             # Pydantic models matching Firestore schema
    │   └── responses.py         # Typed API response models
    └── tests/
        ├── test_analytics.py
        └── test_forecast.py
```

---

## Setup Guide

### Prerequisites

- Python 3.11+
- Google Cloud SDK (`gcloud`)
- Firebase project already configured (`fin-track-adc2c`)
- Docker (for local Cloud Run emulation)

### 1. Create the service directory

```bash
cd fin-track
mkdir analytics-service && cd analytics-service
python -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install fastapi uvicorn google-cloud-firestore firebase-admin \
  pandas prophet scikit-learn numpy python-dotenv pydantic
pip freeze > requirements.txt
```

### 3. Bootstrap `main.py`

```python
from fastapi import FastAPI
from routers import analytics, forecast, anomaly, reports

app = FastAPI(title="Pocket Analytics Service", version="1.0.0")

app.include_router(analytics.router, prefix="/api/analytics")
app.include_router(forecast.router, prefix="/api/forecast")
app.include_router(anomaly.router, prefix="/api/anomaly")
app.include_router(reports.router, prefix="/api/reports")

@app.get("/api/health")
def health():
    return {"status": "ok"}
```

### 4. Firebase auth middleware

```python
# services/auth.py
import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException, Header

firebase_admin.initialize_app()  # uses GOOGLE_APPLICATION_CREDENTIALS

async def verify_token(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        decoded = auth.verify_id_token(token)
        return decoded["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### 5. Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### 6. Run locally

```bash
uvicorn main:app --reload --port 8080
```

---

## API Endpoints

### Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Health check |
| `POST` | `/api/analytics/summary` | Token | Spending summary for a date range |
| `POST` | `/api/analytics/categories` | Token | Breakdown by category with trends |
| `POST` | `/api/analytics/monthly` | Token | Month-by-month comparison |
| `POST` | `/api/analytics/household` | Token | Household member spending attribution |

#### Example: `POST /api/analytics/summary`

```json
// Request
{
  "from": "2026-01-01",
  "to": "2026-04-30",
  "currency": "EUR"
}

// Response
{
  "totalIncome": 8400.00,
  "totalExpenses": 5230.50,
  "netSavings": 3169.50,
  "savingsRate": 37.7,
  "topCategories": [
    { "category": "Food", "amount": 980.00, "pct": 18.7 },
    { "category": "Transport", "amount": 420.00, "pct": 8.0 }
  ]
}
```

### Forecasting

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/forecast/cashflow` | Token | 90-day Prophet forecast |
| `POST` | `/api/forecast/budget` | Token | Predict month-end budget overspend |
| `POST` | `/api/forecast/savings` | Token | Project goal completion date |

### Anomaly Detection

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/anomaly/scan` | Token | Isolation Forest scan on recent entries |
| `POST` | `/api/anomaly/category` | Token | Per-category spike analysis |

### Reports

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/reports/excel` | Token | Excel workbook export (multi-sheet) |
| `POST` | `/api/reports/tax-summary` | Token | Annual income/expense tax summary |

---

## Feature Roadmap

### Phase 1 — Core Analytics (Week 1–2)
- [ ] FastAPI scaffold + Firebase auth middleware
- [ ] Firestore reader service (entries, budgets, goals)
- [ ] `/analytics/summary` and `/analytics/categories`
- [ ] Replace frontend Firestore aggregations with API calls
- [ ] Deploy to Cloud Run (same project)

### Phase 2 — Forecasting (Week 3–4)
- [ ] Prophet-based 90-day cash flow forecast
- [ ] Replace current linear forecast on dashboard
- [ ] Budget overspend predictor (warns mid-month)
- [ ] Savings goal completion date projection

### Phase 3 — ML Upgrades (Week 5–6)
- [ ] Train scikit-learn classifier on user's own transaction history
- [ ] Replace 100-keyword category detection with trained model
- [ ] Isolation Forest anomaly detection (more accurate than Z-score)
- [ ] Per-user model stored in Firebase Storage as `.pkl`

### Phase 4 — Advanced Features (Q3 2026)
- [ ] Investment portfolio tracker API
- [ ] Excel/multi-sheet report export
- [ ] Tax summary export (annual income vs expense by category)
- [ ] Household spending attribution (per member breakdown)
- [ ] Webhook system (transaction events → user-defined URLs)

---

## What Else You Can Build with Python

Beyond analytics for Pocket, Python opens these directions:

### Data & Automation
- **Bank statement parser** — detect CSV/PDF formats from any bank automatically (pdfplumber + pandas)
- **Scheduled digest emailer** — weekly spending report sent via SendGrid or Resend
- **Google Sheets sync** — two-way sync of transactions with a user's spreadsheet

### ML & AI
- **Spending personality classifier** — cluster users by behavior (saver / spender / balanced) using K-means
- **Receipt OCR fallback** — Tesseract-based local OCR when Document AI quota runs out
- **Smart savings suggestions** — analyze patterns and suggest specific cuts ("You spend 40% more on food on weekends")

### Fintech-Specific
- **GoCardless / Plaid connector** — when ready, Python SDK integrations are cleaner than Node.js
- **Currency hedging alerts** — watch EUR/BGN/USD rates, notify when favorable for conversion
- **Tax bracket estimator** — calculate estimated annual tax based on income entries (per-country rules)

### Developer Tools
- **Data migration scripts** — bulk backfill, schema migrations on Firestore
- **Load testing harness** — Locust-based load tests for Cloud Run services
- **Analytics dashboard** (internal) — Streamlit app for monitoring Pocket's own usage metrics

---

## Deployment (Free)

Uses the same Google Cloud project and free tier as the existing ML service.

### Deploy to Cloud Run

```bash
cd analytics-service

# Build and push
gcloud builds submit --tag gcr.io/fin-track-adc2c/analytics-service

# Deploy
gcloud run deploy analytics-service \
  --image gcr.io/fin-track-adc2c/analytics-service \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 3
```

### Free Tier Limits (Cloud Run)

| Resource | Free Tier | Expected Usage |
|---|---|---|
| Requests | 2M / month | ~50K (personal finance app) |
| CPU | 180K vCPU-seconds | Well within range |
| Memory | 360K GB-seconds | Well within range |
| Egress | 1GB / month | JSON responses are tiny |

**Estimated cost at scale:** $0/month until significant user growth.

---

## Environment Variables

```env
# .env.example
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
FIREBASE_PROJECT_ID=fin-track-adc2c
ALLOWED_ORIGINS=https://fin-track-adc2c.web.app,http://localhost:3000
PORT=8080
```

On Cloud Run, `GOOGLE_APPLICATION_CREDENTIALS` is not needed — the service account is attached automatically via the Cloud Run identity.
