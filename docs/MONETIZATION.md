# Pocket — Unit Economics & Monetization

**Last Updated:** August 2026
**Status:** Free-tier scanning removed (shipped). Paid-per-scan design below is **proposed, not implemented**.

---

## Table of Contents

1. [Unit Costs](#unit-costs)
2. [Tier Margins](#tier-margins)
3. [Change: Scanning Is Now Paid-Only](#change-scanning-is-now-paid-only)
4. [Proposed: Charging Per Scan](#proposed-charging-per-scan)
5. [AI Model Costs & Free-Tier Strategy](#ai-model-costs--free-tier-strategy)
6. [Decision Order](#decision-order)

---

## Unit Costs

Every variable cost per user, as of August 2026.

| Cost | Rate | Notes |
|---|---|---|
| **Document AI Expense parser** | **$0.10 / scan** | 1 count = 1–10 page document. A receipt image is 1 count. **No free tier.** |
| Gemini digest / chat | ~$0.001 / call | Currently absorbed by the AI Studio free tier |
| Cloud Run | ~$1–2 / month total | Fixed-ish, `min-instances 0` |
| Firestore | Within free tier | 50k reads/day |
| Firebase Storage | Within free tier | Receipt images, 5GB |
| Stripe | **1.5% + €0.25** per transaction (EEA cards) | The fixed €0.25 dominates small charges — see below |

**Document AI is confirmed empirically**, not just from the pricing page: the GCP Cost tab for `documentai.googleapis.com` showed May 2026 = **$0.10 for a single `ProcessDocument` call**.

Two properties of that cost matter:

- **100% variable.** The processor is pretrained, so there is no deployed-version hourly charge (the "$438/year" line on Google's pricing page applies to *custom* processors). Zero scans = zero cost.
- **No volume discount at our scale.** The 10,000th scan costs the same $0.10 as the first. Margin pressure grows linearly with success — growth does not fix this.

Observed latency: **3.71s avg, 4.17s p99.**

---

## Tier Margins

Prices from `frontend/messages/en.json` → `landing.pricing`. EUR→USD at ~1.09.

| Tier | Price | Scans | Doc AI cost | Net after Stripe | OCR as % of net |
|---|---|---|---|---|---|
| Free | €0 | ~~3~~ **0** | ~~$0.30~~ **$0** | $0 | ~~**pure loss**~~ **n/a** |
| Pro monthly | €2.99 | 10 | $1.00 | ~$2.88 | **~35%** |
| Pro annual | €24.99/yr | 10/mo | $1.00/mo | ~$2.18/mo | **~46%** |
| Business | €19.99 | 50 | $5.00 | ~$20.89 | ~24% |

**Business is healthy. Pro is tight, and Pro annual is tighter** — the annual discount shrinks net revenue while scan cost stays flat.

Add Gemini at scale (see below) and worst-case Pro reaches ~84% cost. Pro has no room for a second variable cost on top of Document AI.

---

## Change: Scanning Is Now Paid-Only

**Shipped.** Free tier scan quota went `3 → 0`.

Rationale: at $0.10/scan with zero revenue against it, three free scans is **$0.30/user/month of direct cash loss**. At 1,000 free users that is $300/month — an order of magnitude above the entire rest of the infrastructure bill. A free tier that loses money per active user gets *worse* as the app succeeds.

### Code changed

| File | Change |
|---|---|
| `ml-service/src/firestore-quota.ts:22` | `free: 3` → `free: 0` (authoritative) |
| `frontend/lib/constants/subscription.constants.ts:4` | same, mirrored for UI gating |
| `frontend/components/FAQ.tsx:19` | render new `q5`/`a5` |

No new server logic was required. `checkAndIncrementScanQuota` already returns `{ allowed: false }` on `limit === 0`, and `api-server.ts:150-157` already emits *"Receipt scanning requires a Pro or Business subscription."* — the path existed as a safety net and is now the free tier's normal flow. `receipt-scanner-api.ts:141` surfaces the server message directly, so the upsell copy comes from one place.

### Copy corrected

The landing page was also **contradicting the code in four places** — it advertised *less* than the app actually gives. Fixed in both `en.json` and `bg.json`:

| Claim | Was | Now (matches `FREE_TIER_LIMITS`) |
|---|---|---|
| Transactions | 50/month | **100/month** |
| Budgets | 3 | **5** |
| Savings goals | 2 | **3** |
| Savings accounts | 1 | **2** |
| Recurring transactions | 3 | **5** |
| Receipt scans | 3/month | **not included — Pro only** |

A new FAQ entry (`q5`/`a5`) states plainly *why* scanning is paid: a third party charges us per receipt, and we would rather charge a fair subscription than run ads or sell data. Being explicit about the reason converts better than silently removing a feature, and it is true.

### This also closed a server-side hole

`ReceiptScannerDialog.tsx:595` already hard-gated the scanner behind `!isPro`, so free users could never reach it **through the UI**. But `SCAN_LIMITS.free = 3` was live on the **server**, and `/api/upload-bill` is the real enforcement point. Any free user with a valid Firebase token calling the endpoint directly was granted 3 scans/month — $0.30 of real cost each, bypassing the paywall entirely.

So this was not only a pricing decision: the UI paywall and the server quota disagreed, and the server was the permissive one. **No migration notice is needed** — no free user was ever able to scan through the app.

Related fix: `ReceiptScannerDialog.tsx:98` computed `atLimit = limit > 0 && remaining <= 0`, where the `limit > 0` guard treated 0 as "unset". With `free: 0` now a real value meaning "not entitled", that guard would have read as *not* at-limit. Simplified to `remaining <= 0`. Unreachable for free users behind the `isPro` gate, but correct rather than accidentally correct.

---

## Proposed: Charging Per Scan

Goal: make each scan profitable rather than merely bounded, at ~€0.12–0.15/scan.

### The blocker: you cannot bill €0.12 as a transaction

Stripe charges **1.5% + €0.25** per transaction on EEA cards. The fixed fee alone is **twice** the proposed price.

| | Per-scan charge of €0.12 |
|---|---|
| Revenue | €0.12 |
| Stripe fee | −€0.25 |
| Document AI | −€0.092 |
| **Net** | **−€0.22 per scan** |

You would lose money on every scan, faster the more you sell. **Per-scan checkout is not viable at any price under roughly €2.** This is a hard constraint of card processing, not something to engineer around.

Anything that works must **amortize the fixed fee across many scans in one transaction.**

### Option A — Scan packs (prepaid credits) — recommended

Sell blocks of scans as a one-off purchase: *"+25 scans — €4.99"*.

| | 25-scan pack at €4.99 |
|---|---|
| Revenue | €4.99 |
| Stripe fee | −€0.32 |
| Document AI (25 × €0.092) | −€2.30 |
| **Net margin** | **€2.37 (48%)** |

Effective price €0.20/scan, of which you keep €0.095.

Why this one:

- **One transaction**, so the fixed fee is amortized.
- **Prepaid** — cash upfront, plus breakage on unused credits.
- **Predictable for the user.** This matters more than usual: Pocket is a *budgeting app*. Being the app that sends an unpredictable variable bill is brand poison. Users control spend explicitly.
- Simplest to build: a Stripe one-off Price, a `scanCredits` counter on the user, decrement in `checkAndIncrementScanQuota` after the tier quota is exhausted.

### Option B — Metered overage on the subscription

Stripe usage-based billing: scans past the included quota accrue during the period and land on the monthly invoice at €0.15/scan.

- Margin per overage scan: €0.15 − €0.092 = **€0.058 (39%)**
- One invoice per month, so fees amortize correctly.
- More billing code: meters, usage records, webhook reconciliation, proration edge cases.
- **Bill-shock risk.** Requires a hard monthly cap regardless.

### Option C — Do nothing, raise tier prices

No new billing code at all. Pro at €3.99 with 15 scans has better margin than Pro at €2.99 with 10, and nothing to build. **Worth seriously considering before building either A or B** — added billing surface is permanent maintenance for a solo project.

### Requirements if per-scan billing ships

1. **Never charge for a failed scan.** `refundScanQuota` (`firestore-quota.ts:187`) already handles the quota case; money makes this a billing-correctness issue, not a courtesy. Charge only on confirmed success.
2. **Hard monthly cap per account**, independent of credits held, as abuse and runaway-cost protection.
3. **Show remaining credits in the UI** before the scan, not after.
4. **One source of truth.** `SCAN_LIMITS` is already duplicated between `firestore-quota.ts` and `subscription.constants.ts`. Do not add a third copy for credits — the server must be authoritative.

### The margin depends entirely on a decision not yet made

At €0.15/scan:

| Backend | Cost/scan | Margin at €0.15 |
|---|---|---|
| Document AI | €0.092 | €0.058 — **39%** |
| Gemini vision | €0.0018 | €0.148 — **99%** |

**Do not lock in per-scan pricing before deciding the OCR backend.** Building a billing system around a 39% margin you could have at 99% is the wrong order of operations. That decision has its own document: **`docs/GEMINI_VISION_EVALUATION.md`**.

---

## AI Model Costs & Free-Tier Strategy

### Current state

`ml-service/src/gemini-handler.ts:23` now pins **`gemini-3.5-flash-lite`** (GA) on the AI Studio free tier, used only for the digest and chat (`insights-routes.ts`), never for images.

**Migrated August 2026** from `gemini-2.5-flash`, which Google shuts down 2026-10-16. Google names `gemini-3.5-flash-lite` as the recommended migration target from 2.5 Flash, specifically for document-extraction and data-parsing workloads.

The 3.x models dropped `temperature` / `top_p` / `top_k` and prefilled model turns. `gemini-handler.ts` used none of them — verified by grep across `ml-service/src` — so this was a model-string-only change with no API surface to rework.

> **Still verify** the model resolves on this project before trusting it in production. `ARCHITECTURE.md` records prior 404s and zero-quota surprises on Gemini model swaps:
> ```bash
> curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" \
>   | grep -o '"name": "models/[^"]*"'
> ```

### Is there still a free tier? Yes.

Google removed **Pro** models from the free tier in April 2026, but **Flash and Flash-Lite remain free**:

| Model | Free tier | Limits |
|---|---|---|
| Gemini 3 Flash | Yes | 10 RPM, 250k TPM, 1,500 RPD |
| Gemini 3.1 Flash-Lite | Yes | 15 RPM |
| Gemini 3.1 Pro | **No** | paid only since April 2026 |

So the migration is straightforward: **`gemini-2.5-flash` → `gemini-3-flash` or `gemini-3.1-flash-lite`**, one string at `gemini-handler.ts:23`, and the free tier continues.

### Three caveats that will eventually force a paid tier

1. **1,500 RPD is per *project*, shared across all users** — not per user. `INSIGHTS_DAILY_LIMITS` allows 50/day per Pro user, so roughly **30 active Pro users saturate the entire free quota** and everyone's AI features start failing. This breaks on success, silently.
2. **Free-tier content is used to improve Google's products** — confirmed on the official pricing page. Already uncomfortable for a finance app. A **hard blocker** if receipt *images* are ever sent to Gemini, since those carry names, addresses and card last-4.
3. **No SLA, no EU residency.** The rest of the stack is deliberately EU-resident (`ARCHITECTURE.md`, Document AI pinned to the `eu` endpoint).

### Alternatives when the free tier stops being enough

| Option | Cost | EU residency | Data used for training | Verdict |
|---|---|---|---|---|
| **Gemini 3 Flash-Lite, free tier** | €0 | No | Yes | **Now** — text-only insights, immediate 2.5 migration target |
| **Gemini, AI Studio paid** | ~$0.001/call | No | No | Removes the RPD ceiling; still no EU residency |
| **Vertex AI, `europe-west`** | same tokens, no free tier | **Yes** | **No** | **Required** for anything touching receipt images |
| Claude Haiku / other vendor | comparable | varies | No | Only if Google fails you — a second vendor means a second key, SDK and failure mode for a solo project |
| Self-hosted open model | GPU cost | Yes | No | No. Same argument that killed self-hosted OCR. |

### Recommended path

1. **Now:** migrate `gemini-handler.ts:23` to `gemini-3-flash` or `gemini-3.1-flash-lite`. Free tier, one-line change, removes the October deadline.
2. **Before ~30 concurrent Pro users:** move insights to paid Gemini. At ~$0.001/call this is cheap; the constraint is the RPD ceiling, not the price.
3. **Before any image ever goes to Gemini:** Vertex AI in `europe-west`. Non-negotiable — free-tier terms plus receipt PII is a GDPR problem, and it would silently break the EU-residency posture the rest of the stack maintains.

---

## Decision Order

These interact. Taking them out of order means rework.

1. ~~Remove free-tier scanning~~ — **done**
2. ~~Migrate off `gemini-2.5-flash`~~ — **done**, now `gemini-3.5-flash-lite`
3. **Decide the OCR backend** — Document AI at $0.10 vs Gemini vision at ~$0.002 via Vertex `europe-west`. Sets every margin below. **→ `docs/GEMINI_VISION_EVALUATION.md`**
4. **Then** decide per-scan pricing — Option A (packs), B (metered), or C (just raise prices)
5. Only then build billing code

Step 3 changes the answer to step 4 by a factor of 25. Do not invert them.

---

## Related Docs

- `docs/ARCHITECTURE.md` — GCP services, ML service, cost table
- `docs/ANALYTICS_SERVICE_PLAN.md` — Python analytics service; shares the action-item list
- `ml-service/src/firestore-quota.ts` — authoritative scan limits and tier resolution
- `frontend/lib/constants/subscription.constants.ts` — UI mirror of the above
