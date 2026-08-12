# Pocket — Future Features & Vision

**Last Updated:** August 2026
**Status:** Living document — proposals, not commitments.

This is the "what's next / what could be" doc. For **what's already built**, see
[ROADMAP.md](ROADMAP.md). For **how it goes to market**, see
[LAUNCH.md](LAUNCH.md) and [LAUNCH_MARKETING_PLAN.md](LAUNCH_MARKETING_PLAN.md).

Everything here is filtered through one test, the same one that set the launch
scope — a feature earns a place only if it:

1. **delivers the core pitch** (privacy-first, no bank linking, AI insights on manual tracking), **or**
2. **is on the path to activation** (5+ transactions, dashboard populates), **and**
3. does not produce a **silently-wrong number** that breaks trust, **and**
4. does not need **scale/other people** to avoid feeling empty at this stage.

Ideas that fail the test are still recorded (with the reason) so they aren't
re-litigated.

---

## Tier 1 — Deferred: built, switched off for launch

These already exist in code and are hidden behind the feature power-switch
(`frontend/lib/constants/features.ts`). They are **not** future work — they're
one boolean away. Re-enable each when its trigger is met, then rebuild + redeploy
the frontend.

| Feature | Flag | Why deferred | Re-enable when |
|---|---|---|---|
| Subscription Tracker | `subscriptions` | Overlaps Recurring; extra surface for launch | Recurring auto-detection ships (see Tier 2) |
| Debt Payoff Planner | `debt` | Separate mental model; not the pitch | Core loop proven; it's a strong SEO landing page |
| Community Leaderboard | `leaderboard` | Empty/embarrassing without a user base | You have enough opted-in users for real stats |
| Family / Household budgeting | `family` | Highest complexity + security surface; useless with 1 user | Single-player is rock-solid and users ask for sharing |
| Savings Accounts (dashboard tab) | `savingsAccounts` | "In my balance or not?" ambiguity | You've decided how accounts vs. goals should read |
| Cash Flow Forecast | `cashFlowForecast` | Renders empty without recurring data | Recurring auto-detection ships (see Tier 2) |

> **Sequencing note:** `cashFlowForecast` + `subscriptions` are one story with the
> Tier-2 analytics service — flip both back on the day auto-detection lands, so the
> narrative is "we found your subscriptions → here's your forecast," not an empty chart.

---

## Tier 2 — Planned: designed, not yet built

### Python analytics service (`fin-analytics`)

**Full design:** [ANALYTICS_SERVICE_PLAN.md](ANALYTICS_SERVICE_PLAN.md).

A separate Python/FastAPI service (strictly additive — never touches `ml-service`)
that does the numerically-hard work the client can't:

- **Recurring auto-detection** from raw history (merchant clustering + periodicity
  via median/MAD) — the missing piece that lights up the deferred forecast and
  subscription tracker. This is the single highest-leverage unbuilt feature.
- **Monte Carlo cash-flow forecast** (P10/P50/P90) replacing the browser's mean±SD.
- **Robust MAD anomaly detection** replacing the client Z-score.

**Current status (August 2026):** being pursued **offline-first as a Python
learning project** — the detection algorithm developed in a notebook + pytest
against exported personal history, *before* any deployed service. Deployment
(Cloud Run + Postgres) is **deferred to post-launch**, because:

1. Its payoff features (forecast, subscriptions) are deferred (Tier 1), and
2. Detection needs ≥3 months of history per user — brand-new launch users won't
   have it for months regardless.

So there is no product urgency; the learning value is the near-term driver.

> The plan doc predates the Gemini-vision OCR switch. Its "Rejected: Python OCR"
> analysis still holds, but Related Action Item #2 (replace Document AI with Gemini
> vision) is now **done** — see [GEMINI_VISION_EVALUATION.md](GEMINI_VISION_EVALUATION.md).

---

## Tier 3 — Proposals: extended & innovative functionality

Not committed. Grouped by theme, each tagged with rough **impact / effort** and
dependencies. Ordered roughly by "reinforces the wedge" first.

### A. Sharpen the core wedge (privacy-first manual tracking + AI)

| Idea | What it is | Impact/Effort | Notes |
|---|---|---|---|
| **"Safe-to-spend" number** | One figure: today's discretionary allowance after bills, goals, and recurring are reserved | High / Low | The number users actually want daily. Simple math once recurring exists. |
| **Natural-language entry** | "spent 20 on lunch yesterday" → parsed transaction via Gemini | High / Med | Kills the friction of manual entry — directly serves activation. Reuses the insights Gemini key. |
| **Receipt → multi-category split** | One receipt's line items split across categories (groceries + household in one Lidl trip) | Med / Med | The gemini-vision backend already extracts line items — this consumes them. |
| **Sinking funds / envelopes** | Allocate to categories for irregular expenses (insurance, gifts) | Med / Med | YNAB-style; on-brand for the manual-budgeting crowd you're targeting. |
| **Bill due-date reminders** | Calendar of upcoming bills + FCM nudge before due | Med / Low | Push is already wired. Builds on recurring detection. |

### B. AI that's proactive, not just on-demand

| Idea | What it is | Impact/Effort | Notes |
|---|---|---|---|
| **Weekly proactive nudge** | Push: "you're trending 20% over on dining this month" | High / Med | Needs server-side scheduled stats → **depends on Tier 2**. |
| **Recurring price-hike alerts** | "Netflix went €12.99 → €15.99" | Med / Low | Falls out of recurring detection almost for free. |
| **Subscription cancel assistant** | Surface likely-unused subscriptions (no recent related spend) + cancellation info | Med / Med | "I found €X in forgotten subscriptions" is proven virality. Depends on Tier 2. |
| **"What-if" in AI chat** | "What if I cut dining 30%?" → projected effect on goals | Med / Med | Extends the existing chat; grounded in real numbers. |

### C. Trust & privacy (turn the pitch into product)

| Idea | What it is | Impact/Effort | Notes |
|---|---|---|---|
| **Privacy report** | In-app page showing exactly what leaves the device (only aggregates) | Med / Low | A marketing asset as much as a feature — screenshots itself for Reddit/HN. |
| **OFX/QIF export** | Export to tax-software formats (CSV exists today) | Low / Low | Reinforces "your data is yours." |
| **Client-side field encryption** | Encrypt sensitive fields before Firestore | High / High | Huge privacy flex; significant work + key-management UX. Long-horizon. |

### D. Growth & social (defer until single-player is proven)

| Idea | What it is | Impact/Effort | Notes |
|---|---|---|---|
| **Split expenses (Splitwise-style)** | Household members split a bill, settle up | High / High | Directly matches the marketing doc's "couples/roommates" wedge. Depends on Family (Tier 1) being solid. |
| **Referral program** | Invite → both get Pro time | Med / Med | Only worth it once activation/retention are healthy. |
| **Streaks / achievement expansion** | Extend the shareable achievement cards into a streak system | Low / Med | Cheap virality; don't over-gamify a finance app. |

---

## Explicitly parked (fails the test — recorded so it's not re-proposed)

| Idea | Why parked |
|---|---|
| **Real bank linking / open banking** | Directly contradicts the "no bank linking, privacy-first" pitch that is your entire differentiator. If ever added, it must be strictly opt-in and *never* the default — and even then it dilutes the story. Not now. |
| **Python receipt OCR** | Rejected on cost/accuracy in [ANALYTICS_SERVICE_PLAN.md](ANALYTICS_SERVICE_PLAN.md). Gemini vision won that decision. |
| **Full crypto/investment portfolio tracking** | Different product. Scope-creep magnet; would blur the budgeting focus. |

---

## Related Docs

- [ROADMAP.md](ROADMAP.md) — what's already built
- [ANALYTICS_SERVICE_PLAN.md](ANALYTICS_SERVICE_PLAN.md) — the Python service design
- [GEMINI_VISION_EVALUATION.md](GEMINI_VISION_EVALUATION.md) — OCR backend decision (implemented)
- [LAUNCH.md](LAUNCH.md) / [LAUNCH_MARKETING_PLAN.md](LAUNCH_MARKETING_PLAN.md) — go-to-market
- `frontend/lib/constants/features.ts` — the power switch that gates Tier-1 features
