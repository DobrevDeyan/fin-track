# Pocket — Python Analytics Service Plan (`fin-analytics`)

**Last Updated:** August 2026
**Status:** Planned — not started
**Owner:** Deyan Dobrev
**Service Name:** `fin-analytics`
**Runtime:** Python 3.12 / FastAPI on Cloud Run (`europe-west1`)

---

## Table of Contents

1. [Why This Exists](#why-this-exists)
2. [Goals & Non-Goals](#goals--non-goals)
3. [Architecture](#architecture)
4. [API Contracts](#api-contracts)
5. [Algorithms](#algorithms)
6. [Tech Stack](#tech-stack)
7. [Laravel to Python Mapping](#laravel-to-python-mapping)
8. [Data Model](#data-model)
9. [Build Phases](#build-phases)
10. [Testing Strategy](#testing-strategy)
11. [Deployment](#deployment)
12. [Risks & Open Questions](#risks--open-questions)
13. [Interview Talking Points](#interview-talking-points)

---

## Why This Exists

Two concrete problems in the current codebase justify a new service. Neither is hypothetical.

### Problem 1 — The cash-flow forecast is dark for most users

`frontend/lib/insights-engine.ts:347`:

```ts
if (activeCheck.length === 0 || pastKeysCheck.length < 2) return []
```

The 90-day forecast returns an empty array unless the user has **manually created** recurring transactions. `frontend/lib/firestore-recurring.ts` exposes only `createRecurringTransaction:65`, `updateRecurringTransaction:173`, `deleteRecurringTransaction:218` — there is **no auto-detection anywhere in the codebase**.

The result: a fully built forecast engine that renders nothing for any user who hasn't sat down and typed in their subscriptions by hand. Which is nearly all of them.

**Auto-detecting recurring transactions from history is the single highest-leverage unbuilt feature in the app.** It turns an existing, already-paid-for feature on.

### Problem 2 — All statistics run in the browser

`frontend/lib/insights-engine.ts` is 591 lines of hand-rolled statistics executing on the user's phone:

| Function | Line | Notes |
|---|---|---|
| `mean` | `:67` | hand-rolled |
| `stdDev` | `:72` | population SD |
| `sampleStdDev` | `:86` | |
| `calculateHealthScore` | `:121` | |
| `detectAnomalies` | `:259` | Z-score based — breaks on skewed data |
| `generateCashFlowForecast` | `:333` | mean ± SD projection |
| `buildSpendingContext` | `:463` | feeds the Gemini digest |

Consequences: the client must load full transaction history before computing anything (Firestore read cost + mobile battery), results cannot be cached across devices, and nothing can run on a schedule for push notifications.

### Problem 3 — Career transition (stated honestly)

This project is also a deliberate portfolio piece for a PHP/Laravel → Python mid-level transition.

**A CRUD FastAPI service would not serve that goal.** Routing, validation and ORM work transfer directly from Laravel and reviewers assume as much. The differentiator is the numerical stack — `pandas` / `numpy` / `scipy` applied to messy real-world time series, with tests. That is precisely what Problems 1 and 2 require, which is why this plan is worth building rather than a generic side project.

---

## Goals & Non-Goals

### Goals

1. Auto-detect recurring transactions from raw history, so the existing forecast lights up.
2. Move statistical computation off the client, with results cached server-side.
3. Improve forecast and anomaly quality with methods appropriate to skewed financial data.
4. Demonstrate production Python: FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, pytest, Docker, CI.

### Non-Goals

| Not doing | Why |
|---|---|
| Receipt OCR in Python | Evaluated and rejected — see analysis below. Self-hosted OCR loses to Gemini vision on both cost and accuracy. Note that **replacing Document AI with Gemini vision is separately worthwhile** and tracked as its own action item. |
| Porting the Gemini insights to Python | Rewriting working TypeScript teaches syntax, not engineering. `ml-service/src/gemini-handler.ts` stays as-is. |
| Replacing any existing `ml-service` endpoint | This service is **strictly additive**. `ml-service` keeps `/api/upload-bill` and `/api/insights/*`. |
| Bolting on sklearn for its own sake | Recurring detection is signal processing and robust statistics. Reaching for a classifier where arithmetic suffices is a negative signal. |
| Rewriting `insights-engine.ts` immediately | Keep it as the offline/fallback path until the service proves itself. |

#### Rejected: Python OCR to replace Document AI

Recorded so it is not relitigated:

- Python OCR libraries (Tesseract, PaddleOCR, docTR) provide OCR + layout only. Document AI's **entity labeling** (`supplier_name`, `total_amount`, `receipt_date`) and **per-entity confidence** are the actual value, and every extractor in `ml-service/src/document-ai-handler.ts:244-326` depends on them.
- Self-hosting PaddleOCR on Cloud Run needs ~2GB RAM and either 20–60s cold starts or ~$50–110/month of `min-instances=1` — against a current ML service bill of ~$1–2/month.
- Gemini vision beats self-hosted OCR on both cost and accuracy, so if Document AI is ever replaced, it is replaced by Gemini, not by Python.

#### Confirmed: Document AI receipt scanning is the app's dominant unit cost

Per the [official pricing page](https://cloud.google.com/document-ai/pricing), the **Expense parser is $0.10 per count**, where 1 count = a document of 1–10 pages. A single-image receipt is 1 page = 1 count = **$0.10 per scan**.

**Confirmed empirically** (August 2026): the GCP console Cost tab for `documentai.googleapis.com` shows May 2026 = **$0.10 total for a single `ProcessDocument` call**. Billing is 100% variable — the processor is pretrained, so there is no deployed-version hourly charge (the "$438/year per deployed version" line on the pricing page applies to **custom** processors only). There is also no volume discount at this scale: the 10,000th scan costs the same $0.10 as the first, so margin pressure grows linearly with success.

The `$0.01/page` figure in `docs/ARCHITECTURE.md:432` is **wrong and should be corrected**. The comment at `ml-service/src/firestore-quota.ts:22` (`10 scans = $1.00`) is correct.

Observed latency for comparison against any replacement: **3.71s avg, 4.17s p99**.

| Tier | Price | Scans | Doc AI cost | Net after Stripe | OCR as % of net |
|---|---|---|---|---|---|
| Free | €0 | 3 | **$0.30** | $0 | **pure loss** |
| Pro monthly | €2.99 | 10 | $1.00 | ~$2.88 | **~35%** |
| Pro annual | €24.99/yr | 10/mo | $1.00/mo | ~$2.18/mo | **~46%** |
| Business | €19.99 | 50 | $5.00 | ~$20.89 | ~24% |

Business is healthy. **Free and Pro are the problem.** This is tracked as a separate workstream from this service — see `Related Action Items` below.

---

## Architecture

```
┌──────────────┐
│  Next.js PWA │
└──────┬───────┘
       │ Firebase ID token
       ├────────────────────────┐
       ▼                        ▼
┌───────────────┐      ┌──────────────────┐
│  ml-service   │      │  fin-analytics   │
│  (Node/TS)    │      │  (Python/FastAPI)│
│  Cloud Run    │      │  Cloud Run       │
│  - Doc AI     │      │  - recurring     │
│  - Gemini     │      │  - forecast      │
└───────┬───────┘      │  - anomalies     │
        │              └────┬────────┬────┘
        │                   │        │
        ▼                   ▼        ▼
   ┌─────────┐      ┌──────────┐  ┌──────────┐
   │Firestore│◀─────│Firestore │  │ Postgres │
   └─────────┘      │  (read)  │  │ (cache)  │
                    └──────────┘  └──────────┘
```

**Boundaries:**

- Reads transaction history from Firestore via the Python `google-cloud-firestore` async client.
- Writes **nothing** to Firestore in Phase 1–2. Detected recurring candidates are returned to the client, which writes confirmed ones through the existing `createRecurringTransaction` path. This keeps `firestore.rules` untouched and the user in control.
- Owns its own Postgres for computed artifacts (detection runs, forecast snapshots, algorithm versions).
- Auth mirrors `ml-service/src/middleware/auth.ts` — verify the same Firebase ID token, use the verified `uid`, never trust a client-supplied user id.
- Region `europe-west1` and EU data residency, consistent with the rest of the stack (`docs/ARCHITECTURE.md:76`).

---

## API Contracts

All endpoints require `Authorization: Bearer <firebase-id-token>`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/health` | Health check, no auth |
| `POST` | `/api/v1/recurring/detect` | Detect subscription candidates from history |
| `POST` | `/api/v1/forecast` | Monte Carlo cash-flow forecast with bands |
| `POST` | `/api/v1/anomalies` | Robust per-category anomaly detection |

### `POST /api/v1/recurring/detect`

Request:

```json
{
  "lookback_months": 12,
  "min_occurrences": 3,
  "force_refresh": false
}
```

Response:

```json
{
  "generated_at": "2026-08-11T09:00:00Z",
  "algorithm_version": "recurring-v1",
  "cached": false,
  "candidates": [
    {
      "merchant": "Netflix",
      "raw_descriptions": ["NETFLIX.COM 4972", "Netflix Intl BV"],
      "category": "Entertainment",
      "type": "expense",
      "frequency": "monthly",
      "interval_days": 30,
      "amount": 15.99,
      "amount_variance": "fixed",
      "currency": "EUR",
      "occurrences": 11,
      "first_seen": "2025-09-14",
      "last_seen": "2026-07-14",
      "next_date": "2026-08-14",
      "confidence": 0.94
    }
  ]
}
```

`frequency` and `next_date` map directly onto the existing `RecurringTransaction` shape so the client can hand a confirmed candidate straight to `createRecurringTransaction`.

### `POST /api/v1/forecast`

Response returns `ForecastPoint`-compatible daily entries plus uncertainty bands:

```json
{
  "generated_at": "2026-08-11T09:00:00Z",
  "starting_balance": 2400.00,
  "currency": "EUR",
  "simulations": 1000,
  "points": [
    { "date": "2026-08-12", "p10": 2310.5, "p50": 2372.0, "p90": 2401.0, "recurring_events": [] }
  ]
}
```

### `POST /api/v1/anomalies`

```json
{
  "anomalies": [
    {
      "category": "Groceries",
      "current": 640.20,
      "baseline_median": 410.00,
      "mad": 38.50,
      "robust_z": 5.98,
      "severity": "high",
      "month": "2026-08"
    }
  ]
}
```

---

## Algorithms

### 1. Recurring detection (`recurring-v1`)

Four stages. Stage 1 and 2 carry the difficulty.

**Stage 1 — Merchant normalization**

Cluster `"NETFLIX.COM 4972"`, `"Netflix Intl BV"`, `"NETFLIX"` into a single entity.

- Uppercase, strip punctuation, strip trailing digit runs (transaction ids, store numbers), strip common noise tokens (`BV`, `LTD`, `EOOD`, `COM`, city names).
- Cluster the survivors with `rapidfuzz` token-set ratio above a tuned threshold.
- Keep the raw descriptions on the cluster for UI display and debuggability.

**Stage 2 — Periodicity detection**

For each cluster with `>= min_occurrences` transactions:

- Sort dates, compute consecutive gaps in days.
- Take the **median** gap and the **median absolute deviation** of the gaps. Mean and SD are wrong here — one skipped or double-charged month destroys the signal.
- Snap the median to a known period (7 / 14 / 30 / 90 / 365) within tolerance. Monthly needs a wider tolerance (±4 days) because of weekend and month-length drift.
- Reject clusters where MAD exceeds the tolerance — irregular spend at the same merchant is not a subscription.

**Stage 3 — Amount stability**

- Coefficient of variation over the cluster amounts.
- `fixed` (CV < 0.05) → Netflix, gym membership. Predictable.
- `variable` (CV >= 0.05) → utilities, phone bills. Genuinely recurring but the amount must be forecast from the trailing median, not the last value.
- Both are valid recurring transactions. Only one is predictable, and the forecast must treat them differently.

**Stage 4 — Confidence and next-date**

- Confidence combines: occurrence count, interval MAD relative to tolerance, amount CV, and recency (a subscription last seen 5 months ago is probably cancelled).
- `next_date = last_seen + median_interval`, snapped forward past today.
- Surface everything below ~0.6 as "possible" in the UI rather than auto-suggesting it.

### 2. Monte Carlo forecast (`forecast-v1`)

Replaces the `mean ± stdDev` projection at `insights-engine.ts:373-390`.

- Build the empirical distribution of **daily discretionary spend** from the trailing 3–6 months, with recurring amounts removed (the existing code already handles this double-counting correctly at `:355-370` — preserve that logic).
- Simulate 1,000 vectorized numpy paths over 90 days, sampling daily spend from the empirical distribution rather than assuming normality.
- Apply recurring events (detected + user-confirmed) as deterministic dated cash flows. Variable-amount recurring sample from their own trailing distribution.
- Return P10 / P50 / P90 per day.

Rationale: real spending is right-skewed and spiky. A normal approximation understates tail risk, and the P90 band answers "how bad could this month get" — the question users actually have and which mean ± SD cannot express.

### 3. Robust anomaly detection (`anomaly-v1`)

Replaces the Z-score at `insights-engine.ts:259`.

- Per category, compute the **median** and **MAD** of monthly totals rather than mean and SD.
- Robust Z: `0.6745 * (x - median) / MAD`.
- Flag on robust Z above threshold, with a minimum absolute delta so a €4 → €12 coffee month doesn't fire.

Rationale: with mean/SD, one December splurge inflates σ permanently and masks every genuine anomaly that follows. MAD has a 50% breakdown point and doesn't have that failure mode.

---

## Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Language | Python 3.12 | |
| Framework | FastAPI | async, Pydantic-native, OpenAPI for free |
| Validation | Pydantic v2 | |
| Package manager | **uv** | Not Poetry, not pip-tools |
| Data | pandas, numpy | `scipy` only if genuinely needed |
| Fuzzy matching | rapidfuzz | |
| ORM | SQLAlchemy 2.0 (async) | |
| Migrations | Alembic | both `upgrade` and `downgrade`, always |
| DB driver | asyncpg | |
| Auth | `firebase-admin` (Python) | mirrors `ml-service/src/middleware/auth.ts` |
| Firestore | `google-cloud-firestore` async client | |
| Testing | pytest, pytest-asyncio, pytest-cov | |
| Lint/format | ruff | replaces both linter and formatter |
| Types | mypy (strict on `app/`) | |
| Container | Docker, multi-stage | mirror `ml-service/Dockerfile` structure |
| CI | GitHub Actions | ruff + mypy + pytest on PR |

---

## Laravel to Python Mapping

Reference for the transition. Lean on the left column — the concepts transfer, only the syntax changes.

| Laravel / PHP | Python equivalent | Note |
|---|---|---|
| `FormRequest` validation | Pydantic v2 models | Strongest transfer; better typing than Laravel |
| Service container / DI | FastAPI `Depends()` | Simpler; no binding config |
| Middleware | FastAPI middleware + dependencies | Auth is a dependency, not middleware |
| Eloquent | SQLAlchemy 2.0 ORM | Data Mapper, not Active Record — the biggest mental shift |
| `php artisan make:migration` | `alembic revision --autogenerate` | |
| `php artisan migrate` / `migrate:rollback` | `alembic upgrade head` / `downgrade -1` | |
| PHPUnit | pytest | Fixtures ≈ `setUp` but composable and injectable |
| Mockery | `pytest-mock` / `unittest.mock` | |
| API Resources | FastAPI `response_model` | |
| Queues / Jobs | Celery + Redis | Phase 5 only |
| Artisan commands | Typer | |
| Composer | uv | `pyproject.toml` ≈ `composer.json` |
| PHP-CS-Fixer + PHPStan | ruff + mypy | ruff covers both lint and format |
| `.env` + `config()` | `pydantic-settings` | Typed config, validated at boot |

**Biggest adjustment:** SQLAlchemy is Data Mapper, not Active Record. There is no `$model->save()` on the entity itself — you add to a session and commit. Expect this to feel wrong for about a week.

---

## Data Model

Postgres, owned entirely by this service. No Firestore schema changes.

```
detection_runs
  id              uuid pk
  user_id         text        -- Firebase uid, indexed
  algorithm_ver   text
  lookback_months int
  tx_count        int         -- transactions examined
  created_at      timestamptz
  duration_ms     int

recurring_candidates
  id              uuid pk
  run_id          uuid fk -> detection_runs
  merchant        text
  raw_descriptions jsonb
  frequency       text
  interval_days   int
  amount          numeric(12,2)
  amount_variance text        -- 'fixed' | 'variable'
  currency        text
  occurrences     int
  first_seen      date
  last_seen       date
  next_date       date
  confidence      numeric(4,3)
  user_action     text null   -- 'confirmed' | 'dismissed' | null

forecast_snapshots
  id              uuid pk
  user_id         text indexed
  algorithm_ver   text
  starting_balance numeric(12,2)
  currency        text
  points          jsonb
  created_at      timestamptz
```

**Why Postgres and not Firestore:** these are analytical artifacts with time-series access patterns — "show me detection accuracy across algorithm versions", "expire snapshots older than N days". Firestore is genuinely poor and expensive at that. `user_action` on candidates also gives a feedback signal for tuning thresholds later.

**Hosting:** Neon or Supabase free tier. Cloud SQL is ~$10–25/month minimum, which is indefensible next to the current ~$1–2/month Cloud Run bill for a pocket project.

---

## Build Phases

Scoped so that **stopping after Phase 3 still ships a useful feature and a defensible portfolio piece.**

### Phase 1 — Skeleton (~1 week)

Prove the pipeline end to end before writing any business logic.

- [ ] `fin-analytics/` directory, `uv init`, `pyproject.toml`
- [ ] FastAPI app, `pydantic-settings` config, `/api/v1/health`
- [ ] Firebase auth dependency (port of `ml-service/src/middleware/auth.ts`)
- [ ] Firestore async read client, fetch a user's entries by verified uid
- [ ] Multi-stage Dockerfile
- [ ] pytest + ruff + mypy, GitHub Actions on PR
- [ ] Deploy to Cloud Run `europe-west1`, add to `deploy.sh` pattern
- [ ] CORS matching `ml-service/src/api-server.ts:20-38`, rate limiting

### Phase 2 — Recurring detection (~2 weeks)

Build it offline first. Export your own transaction history to CSV, develop in a notebook, then wrap as an endpoint. Do not develop an algorithm through an HTTP endpoint.

- [ ] CSV export of own history as a dev fixture
- [ ] Stage 1: merchant normalization + rapidfuzz clustering
- [ ] Stage 2: periodicity via median gap + MAD
- [ ] Stage 3: amount stability (CV, fixed vs variable)
- [ ] Stage 4: confidence scoring + next-date prediction
- [ ] `POST /api/v1/recurring/detect`
- [ ] Synthetic pytest fixtures: clean monthly, weekly, skipped month, cancelled, variable-amount, near-duplicate merchants, single-occurrence noise
- [ ] Tune thresholds against own real data, record chosen values and why

### Phase 3 — Wire into the app (~1 week)

This is where the forecast stops returning `[]`.

- [ ] `frontend/lib/analytics-api.ts` client (mirror `insights-api.ts`)
- [ ] "We found N subscriptions — confirm?" review UI
- [ ] Confirmed candidates route through existing `createRecurringTransaction:65`
- [ ] Dismissals recorded so they aren't re-suggested
- [ ] Verify `generateCashFlowForecast` now renders for a fresh account

### Phase 4 — Postgres + better math (~1 week)

- [ ] Neon/Supabase project, SQLAlchemy 2.0 models, Alembic baseline
- [ ] Persist detection runs and candidates; serve cached unless `force_refresh`
- [ ] Monte Carlo forecast, `POST /api/v1/forecast`
- [ ] MAD anomaly detection, `POST /api/v1/anomalies`
- [ ] Frontend reads server results, `insights-engine.ts` becomes offline fallback

### Phase 5 — Optional

- [ ] Celery + Redis worker, weekly scheduled re-detection
- [ ] Push notification on newly detected subscription (FCM already wired)
- [ ] Threshold tuning from accumulated `user_action` feedback

---

## Testing Strategy

Standard expectation applies: happy path plus key failure cases.

**Unit — the bulk of the value.** Detection is pure functions over dataframes; test it without HTTP or a database. Synthetic fixtures for each shape: clean monthly, weekly, annual, skipped month, mid-history cancellation, variable amount, near-duplicate merchant strings, single-occurrence noise that must **not** be flagged.

**Property-based** (`hypothesis`) for the parsers: any generated date sequence with a fixed interval plus jitter under tolerance must be detected; jitter above tolerance must not be.

**Integration** — `httpx.AsyncClient` against the app with a mocked Firestore client and a real test Postgres.

**No external calls in tests.** Firestore and Firebase auth are mocked, same rule as the existing PHP work.

Coverage target: 80%+ on `app/detection/`, less elsewhere. Coverage on the algorithm is what matters.

---

## Deployment

Mirrors the existing `ml-service` pattern.

```
Cloud Run: fin-analytics
Region:    europe-west1
Memory:    512 MB (1 GB if pandas proves tight)
CPU:       1
Instances: 0-3
```

- Service account with Firestore read + Firebase auth verification only. **No Document AI role.**
- Secrets (Postgres URL) via `--update-env-vars`, never `--set-env-vars` — the latter wipes existing vars (`docs/ARCHITECTURE.md`, Gemini setup notes).
- `FRONTEND_URL` CORS allowlist, same comma-separated pattern as `ml-service`.
- Add a `deploy.sh` alongside the existing one; do not merge the two services into one deploy script.

---

## Risks & Open Questions

| Risk | Mitigation |
|---|---|
| **Scope creep kills it** | Phases 1–3 are the real deliverable. Treat 4–5 as optional. |
| Detection accuracy is poor on real data | Build offline against own history first. If precision is bad, raise the confidence floor and show fewer, better candidates. A wrong subscription suggestion is worse than none. |
| pandas cold start on Cloud Run | Measure in Phase 1. If startup exceeds ~5s, consider polars, or keep `min-instances=0` and accept it for a non-interactive feature. |
| Free-tier Postgres cold starts | Neon scale-to-zero can add ~1s. Acceptable for cached reads; measure. |
| Two services to maintain solo | Strictly additive scope. `ml-service` is never touched. |
| Currency mixing | Entries carry currency (`document-ai-handler.ts:15-18` shows the convention). Detect per currency; do not sum across. |

**Open questions:**

1. Where does transaction history actually live — `entries` collection shape and whether 12 months is cheaply readable in one query. Resolve in Phase 1.
2. Should detection also run over household data (`firestore-household.ts`), or personal only? Personal only for v1.
3. Minimum history for useful detection — likely 3 months. Confirm empirically.

---

## Interview Talking Points

What this project demonstrates that a CRUD service does not:

- **Signal processing on real data** — inferred subscription schedules from unlabeled transaction history using interval clustering and median absolute deviation, chosen specifically because a single missed payment breaks mean/SD approaches.
- **Knowing why the textbook method fails** — replaced Z-score anomaly detection with MAD-based robust statistics because monthly spending is right-skewed and one outlier permanently inflates σ.
- **Uncertainty quantification** — Monte Carlo over an empirical distribution instead of a normal approximation, because the useful answer is P90, not the mean.
- **Architectural judgment** — moved computation off-client for cost and cacheability; explicitly *rejected* rewriting receipt OCR in Python after a cost/accuracy analysis showing it would be 500x more expensive and less accurate.
- **Production hygiene** — typed config, verified-token auth, migrations with rollbacks, 80%+ coverage on the algorithm, CI gates.

The strongest version of this project is the one where the algorithm is interesting and the infrastructure is boring.

---

## Related Action Items

Discovered while scoping this service. **Not part of this plan** — tracked here so they aren't lost.

| # | Item | Severity |
|---|---|---|
| 1 | ~~`gemini-handler.ts:23` pins `gemini-2.5-flash`, deprecated 2026-10-16.~~ **Done** — migrated to `gemini-3.5-flash-lite` (GA). | ~~Urgent~~ closed |
| 2 | Evaluate replacing Document AI with Gemini vision: ~$0.10 → ~$0.002/scan (~50x). **Open decision, own document: `docs/GEMINI_VISION_EVALUATION.md`.** Blocks per-scan pricing. | **High — margin** |
| 3 | ~~Free tier gives 3 scans = $0.30/user/month of pure loss.~~ **Done** — `free: 0`, scanning is Pro-only. See `docs/MONETIZATION.md`. | ~~High~~ closed |
| 4 | ~~`docs/ARCHITECTURE.md:432` states `~$0.01/page`.~~ **Done** — corrected to $0.10/scan. | ~~Medium~~ closed |
| 5 | `SCAN_LIMITS` is duplicated in `ml-service/src/firestore-quota.ts:20-24` and `frontend/lib/constants/subscription.constants.ts:1-5`, both carrying the same comment. Two sources of truth for a billing-relevant limit — they will drift. | Medium |
| 6 | ~~Marketing copy contradicts code in four places.~~ **Done** — `en.json` and `bg.json` corrected to match `FREE_TIER_LIMITS`. | ~~Low~~ closed |
| 7 | Gemini insights currently ride the AI Studio free tier (1,500 RPD **shared across all users**). At ~50 Pro users hitting the daily cap this breaks, and on the paid tier costs up to ~$1.43/user/month — which on top of item 2 would put Pro at ~84% cost. | Medium — scale |

---

## Related Docs

- `docs/ARCHITECTURE.md` — existing system, GCP services, ML service
- `docs/DEPLOYMENT.md` — Cloud Run deploy process
- `docs/ROADMAP.md` — product roadmap
- `ml-service/src/middleware/auth.ts` — auth pattern to port
- `frontend/lib/insights-engine.ts` — the logic being superseded
