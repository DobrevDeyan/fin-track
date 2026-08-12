# Pocket — Launch & Marketing Plan

**Last Updated:** August 2026

> Consolidates the former *Beta Launch Strategy* and *Public Launch & Marketing Plan*
> into one canonical doc. For what's built see [ROADMAP.md](ROADMAP.md); for what's
> deferred/next see [FUTURE_FEATURES.md](FUTURE_FEATURES.md).

---

## Product Summary

**Pocket** is a privacy-first personal finance PWA:
- Manual expense tracking — **no bank linking** (this is the pitch, not a weakness)
- AI insights: health score, anomaly detection, monthly digest, budget-coach chat
- AI receipt scanning (Gemini vision backend, alpha — see [GEMINI_VISION_EVALUATION.md](GEMINI_VISION_EVALUATION.md))
- Freemium tiers (Free / Pro / Business — exact prices in `MONETIZATION.md` / `subscription.constants.ts`)
- PWA with offline support, English + Bulgarian

**Core differentiator** vs Mint/YNAB/Revolut/Monarch: **privacy + no bank linking + AI insights.**

**Positioning sentence** (put it at the top of the landing page — specific converts 2–3× better than vague):
> "Pocket is a privacy-first budgeting app with an AI coach — snap a receipt, AI sorts it, see where your money goes. No bank login required, free to start."

> **Positioning note:** the strongest wedge candidate is *couples/roommates who split money* (Households + receipt scan + AI — most budget apps are single-user). **However, Household/Family budgeting is deferred for this launch** (see Launch Scope below), so lead with the privacy + AI-coach angle now and hold the "split money with your partner" wedge for when Family is re-enabled.

---

## Launch Scope (August 2026)

The app was deliberately narrowed for launch via the feature power-switch
(`frontend/lib/constants/features.ts`). Ship the core loop + AI differentiator;
defer the breadth until the core is proven. **Deferred (hidden, not deleted):**
Subscription Tracker, Debt Planner, Leaderboard, Family/Household, Savings-accounts
tab, Cash Flow Forecast — see [FUTURE_FEATURES.md](FUTURE_FEATURES.md) Tier 1 for
each feature's re-enable trigger.

Implication for marketing: **market the narrow product you're shipping**, not the
full feature list. A sharp "privacy-first AI expense tracker" story lands far better
on Product Hunt / HN / Reddit than a muddy "budgeting + debt + subscriptions + family
+ leaderboard" pitch.

---

## Guiding Principles (from 2026 launch research)

The playbook for a solo-built consumer app: **build a waitlist + landing page first,
spend ~6–8 weeks building minimal public presence and validating messaging in niche
communities, then launch simultaneously on Product Hunt + Hacker News + Reddit with a
pre-warmed audience.** Cold "post it and see" launches underperform; 60%+ of a winning
PH launch's traffic comes from a pre-built list, and successful indie pre-launches hit
500–1,000 engaged signups before day one ([LaunchList](https://getlaunchlist.com/blog/saas-pre-launch-marketing-playbook)).

For a *financial* app, **trust/privacy messaging is not optional** — it's the top
predictor of whether a stranger connects real transaction data to an unknown alpha
product ([FinTech Weekly](https://www.fintechweekly.com/magazine/articles/build-trust-fintech-app-security-compliance-user-experience)).
Reddit is the highest-intent channel: 70% of finance-app shoppers use it as their
research layer ([ALM Corp](https://almcorp.com/blog/reddit-financial-services-research-trends-2026/)),
and the current wave of budget-app interest is driven by Mint refugees and people who
dislike sharing bank credentials — both angles Pocket owns. Skip paid ads entirely
until organic conversion is proven.

**Honest label:** call it **beta** publicly (Stripe billing is live; "alpha" scares
off everyone except developers), but be explicit that features are still rolling out
and feedback is wanted.

---

## Phase 0 — Positioning & Trust Groundwork (this week)

Highest-leverage, cheapest fixes. Everything downstream depends on them.

1. **Write the one-sentence positioning** (above) and put it above the fold.
2. **Trust page, not just a landing page.** Publish a plain-language `/trust` page: what
   data you store, that you're in beta and things may break, how to delete your
   account/data (`deleteUserData` exists), and "beta — we'd love your feedback."
   Radical transparency about limitations beats polished copy for fintech trust.
3. **Feedback loop before launch** — an in-app "Send Feedback" button (Tally.so/Canny)
   or a Google Form. You can't learn from strangers you can't hear from.

### Pre-Launch Must-Fix — Status (updated Aug 2026)

| Item | Status | Note |
|---|---|---|
| Error tracking (Sentry) | ✅ Done | `@sentry/nextjs`, `SentryProvider` in layout, DSN in `NEXT_PUBLIC_SENTRY_DSN` (set in `.env.production` too) |
| Privacy analytics (Plausible) | ✅ Done | Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` in `.env.production` to activate |
| In-app feedback widget | ⬜ Pending | Core feedback mechanism — do before public posts (~2h) |
| "Beta" badge on landing page | ⬜ Pending | Sets expectations, adds exclusivity |
| Raise free tier for beta | ⬜ Pending | Bump `FREE_TIER_LIMITS.transactions` (in `subscription.constants.ts`) to 100 for a better first impression |
| ~~Enable Cash Flow Forecast~~ | ⏸ Deferred | Now intentionally off — renders empty without recurring data; re-enable with the analytics service ([FUTURE_FEATURES.md](FUTURE_FEATURES.md) Tier 2) |
| Confirm billing alerts + rate limits | ⬜ Pending | A viral thread can spike new accounts hitting Gemini within minutes — verify Cloud Run / Gemini quota gates and billing alerts before Phase 3 |

---

## Phase 1 — Landing Page + Waitlist (weeks 1–2)

Treat the *public launch* like a fresh pre-launch — a controlled ramp, not an
uncontrolled Reddit pile-on to a Firebase project untested at scale.

- Single landing page, **one above-the-fold CTA** ("Join the beta" / "Try it now"),
  3 screenshots or a GIF of the real flow (receipt scan → AI category → dashboard),
  and one line of trust copy ("Your data — exportable and deletable anytime").
- Target **20–35% visitor→signup**. Below 20%, fix the headline/positioning, not the
  design ([Unicorn Platform](https://unicornplatform.com/blog/waitlist-page-strategy-in-2026/)).
- Ramp option: gate signup behind a waitlist for 1–2 weeks while finishing Phase 0/2,
  or let people in — the **Pro-only receipt scanning** (free tier = 0 scans) already
  caps your Gemini cost exposure from a signup flood.
- Basic anti-abuse: confirm Firebase App Check / rate limiting on signup and the
  scan endpoint before any public post.

---

## Phase 2 — Community-First Validation (weeks 2–5, no launch yet)

The step most solo builders skip — it decides whether launch day is 5 signups or 500.

### Reddit — the single highest-value channel

Post authentically; **spend 2+ weeks being a genuinely helpful commenter before ever
mentioning Pocket**, and check each subreddit's self-promo rules first (most enforce a
90/10 rule; some, e.g. r/eupersonalfinance, ban self-promo outright — [rules research](https://redship.io/blog/reddit-self-promotion-rules)).
Mention it only in threads already asking for app recommendations, as "I built this to
solve X, happy to answer questions."

| Subreddit | Members | Angle |
|---|---|---|
| r/personalfinance | 17M+ | General budgeting |
| r/ynab | 200K+ | Already doing manual budgeting — your perfect user |
| r/budgeting / r/Frugal | large | Budget-conscious |
| r/financialindependence, r/FIRE | 1.5M+/300K+ | FIRE crowd love manual tracking |
| r/privacy | 1M+ | "I didn't want to give Mint my bank login" |
| r/selfhosted | 300K+ | Tech-savvy, appreciate the Firebase architecture |
| r/bulgaria | niche | Localization + trust advantage (BG/Cyrillic support) |

### Other channels

- **Build-in-public on X** — weekly posts: real screenshots, one metric, one lesson.
  This fills the "first 200 supporters" bucket that makes launch day convert.
- **Indie Hackers** — post milestones with real numbers; pure promotion gets downvoted,
  honesty + numbers do not.
- **Short-form video (TikTok/Reels/Shorts)** — optional, high-upside for consumer finance
  ("why splitting bills with roommates never works"). Only commit if you'll post 4–6×/week
  for 8+ weeks; inconsistent posting is worse than none.
- **Directories (do once, now):** BetaList, Product Hunt "Coming Soon" page, Indie Hackers
  Products, SaaS Hub — 20–100 signups each plus SEO backlinks.

---

## Phase 3 — Launch Day (week 6)

- **Pick Tuesday or Wednesday.** PH momentum peaks 12:01am PT that day; HN favors
  Tue–Thu 9am–12pm ET.
- **Product Hunt:** reserve your maker profile ~30 days ahead (comment on other products
  so it's not a brand-new account), prep a 30–60s demo GIF (add transaction → AI receipt
  scan → budget coach chat), one-paragraph positioning, and a "first-hour supporters" list
  of ~30–50 people you personally ask to *comment* (not just upvote — engagement is
  weighted). Offer a PH exclusive (e.g. first 100 get 3 months Pro).
- **Hacker News (Show HN):** title `Show HN: Pocket – privacy-first expense tracker with an
  AI budget coach (no bank linking)`. Factual, no hype, no exclamation points. First 30–60
  min matter most — answer every comment personally, including skeptical data-handling
  questions (that thread builds more trust than the traffic).
- **Reddit on launch day:** only in subreddits where you built standing in Phase 2, as an
  "I built X, feedback welcome" thread — not a copy-paste of the PH post.
- **Email your waitlist** the morning of, with a nudge to comment on PH/HN (concentrated
  early engagement in the first ~6 hours matters more than total volume).

---

## Phase 4 — Post-Launch: Retention & Feedback (weeks 7–10)

Launch-day traffic validates curiosity, not retention. What matters next:

- **Week 1:** triage feedback, fix the loudest bugs, personally thank/respond to every
  signup (a founder email massively increases activation at tiny scale).
- **Activation hypothesis:** users who add **5+ transactions** and see the dashboard
  populate are the ones who stick. Instrument the funnel:
  1. Signup → onboarding completion
  2. Onboarding → first transaction
  3. First transaction → 5 transactions (activation gate)
  4. Activation → 30-day retention

### Weekly drip email (Resend — integrates cleanly with Firebase)

| Day | Email | Goal |
|---|---|---|
| 1 | Welcome + add your first transaction | Activation |
| 3 | "Have you tried the AI Budget Coach?" | Feature discovery / Pro teaser |
| 7 | 1-question NPS (0–10) | Feedback signal |
| 14 | "You've tracked X transactions this month" | Engagement |
| 30 | Upgrade-to-Pro pitch tied to their actual usage | Conversion |

### In-app feedback form (Tally.so)
1. What brought you to Pocket? 2. What's the one thing you wish it did better?
3. Would you pay for Pro? Why / why not?

Write a public **launch retro** in week 3–4 (what worked, what broke) — a second, smaller
distribution moment on the same channels.

---

## Phase 5 — Content Marketing (medium-term)

**SEO posts** targeting alternative-seekers (rank for months/years):
1. "Best Mint alternatives in 2026 (no bank linking required)"
2. "How to track expenses without linking your bank account"
3. "Privacy-first budgeting apps compared: 2026 edition"
4. "AI expense tracker: smarter insights from your spending"
5. "YNAB vs manual budgeting — is it worth it?"

**Demo video (3 min):** add a transaction → AI receipt scan → budget coach → health
score. Post to YouTube (searchable), reuse on PH and the landing page.

---

## Success Metrics for Beta

| Metric | Target | 30 days | 90 days |
|---|---|---|---|
| Landing visitor → signup | 20%+ | — | — |
| Registered users | — | 100 | 500 |
| Activation (5+ tx / first scan) | 40–50% of signups | 40% | 50% |
| Day-7 retention | 40%+ = ready to scale | — | — |
| 30-day retention | — | 25% | 35% |
| NPS | — | > 30 | > 40 |
| Free → Pro conversion | don't over-index early | 3% | 5% |
| MRR | — | €25 | €200 |

500 engaged users who activate and return beats 5,000 who sign up and vanish — resist
chasing raw signup counts.

---

## Launch Checklist

| Priority | Action | Status |
|---|---|---|
| 🔴 Critical | Sentry error tracking | ✅ Done |
| 🔴 Critical | Plausible analytics | ✅ Done (env-var opt-in) |
| 🔴 Critical | In-app feedback button | ⬜ Pending |
| 🟠 High | Trust/`/trust` page | ⬜ Pending |
| 🟠 High | Beta badge on landing page | ⬜ Pending |
| 🟠 High | Raise free tier to 100 tx for beta | ⬜ Pending |
| 🟠 High | Confirm billing alerts + scan rate limits | ⬜ Pending |
| 🟠 High | Product Hunt "Coming Soon" page + BetaList | ⬜ Pending |
| 🟠 High | Reddit standing (helpful comments, 2+ weeks) | ⬜ Pending |
| 🟠 High | DM 10 people personally for feedback | ⬜ Pending |
| 🟡 Medium | Build-in-public X thread | ⬜ Pending |
| 🟡 Medium | Show HN post | ⬜ Pending |
| 🟢 Later | Drip email sequence (Resend) | ⬜ Pending |
| 🟢 Later | 3 SEO blog posts | ⬜ Pending |
| 🟢 Later | 3-min demo video | ⬜ Pending |
| ⏸ Deferred | Family, Subscriptions, Debt, Leaderboard, Forecast | Hidden via power switch — [FUTURE_FEATURES.md](FUTURE_FEATURES.md) |

---

## Competitive Positioning

| App | Bank Linking | AI Features | Price | Privacy |
|---|---|---|---|---|
| Mint | Required | Basic | Free (ads) | Low |
| YNAB | Optional | None | $14.99/mo | Medium |
| Revolut | Required | Basic | Free–€45/mo | Low |
| Copilot | Required | Good | $13/mo | Medium |
| **Pocket** | **Not required** | **Strong (Gemini)** | **Free–Business** | **High** |

**Own the privacy angle.** Users who care about it will seek you out — they just need to
know you exist.

---

## Trade-offs & Open Questions

- **Beta vs alpha framing:** "alpha" sets safer expectations but drives away the
  non-technical users who are the actual target. Call it beta, be explicit about rough edges.
- **Reddit self-promo risk:** several high-value subreddits ban self-promo and mods check
  history — verify each subreddit's live rules before posting; a pre-launch ban burns the
  relationship for good.
- **Cost exposure:** the Gemini vision scan backend is on a **free-tier key** (1,500 req/day
  per project, shared with insights) — a Reddit/HN spike could hit that ceiling. Confirm
  quota gates + billing alerts before Phase 3, and plan the paid-key/rotation move.
- **Short-form video** is the least certain-value channel: 60–90 days to show results, real
  time cost. Optional, not core path.
- **PH algorithm / Reddit enforcement** shift seasonally — check current rules directly
  before launch day.

---

## Concrete First 3 Actions (today)

1. Write the one-sentence positioning and put it above the fold on the landing page.
2. Add a plain-language trust/limitations note (signup flow or `/trust` page).
3. Create the Product Hunt "Coming Soon" page + submit to BetaList (each < 1 hour, compounds immediately).

---

## Sources

- [Smol Launch — Launching on Product Hunt in 2026](https://smollaunch.com/guides/launching-on-product-hunt)
- [LaunchList — SaaS Pre-Launch Playbook: 0→1,000 Beta Users in 90 Days](https://getlaunchlist.com/blog/saas-pre-launch-marketing-playbook)
- [LaunchList — How to Launch on Product Hunt in 2026](https://getlaunchlist.com/blog/how-to-launch-on-product-hunt-2026)
- [Unicorn Platform — Waitlist Page Strategy in 2026](https://unicornplatform.com/blog/waitlist-page-strategy-in-2026/)
- [ALM Corp — 70% of Finance Shoppers Use Reddit for Research](https://almcorp.com/blog/reddit-financial-services-research-trends-2026/)
- [Finny — Best Budget Apps Reddit Recommends in 2026](https://getfinny.app/blog/best-budget-apps-reddit-recommends-2026)
- [Redship — Reddit Self-Promotion Rules (2026)](https://redship.io/blog/reddit-self-promotion-rules)
- [StackMatix — TikTok Growth Strategies for Brands in 2026](https://www.stackmatix.com/blog/tiktok-growth-strategies-2026)
- [Vested — TikTok for Finance Brands: A 2026 Guide](https://fullyvested.com/insights/tik-tok-for-finance-brands/)
- [Prems AI — Indie Hacker Marketing Playbook 2026](https://prems.ai/blog/indie-hacker-marketing-playbook-2026)
- [mean.ceo — Retention Metrics (2026)](https://blog.mean.ceo/retention-metrics-startup-guide/)
- [FinTech Weekly — Build Trust in Your FinTech App](https://www.fintechweekly.com/magazine/articles/build-trust-fintech-app-security-compliance-user-experience)
- [Influencers Time — Radical Transparency in Fintech](https://www.influencers-time.com/radical-transparency-boosts-fintech-trust-and-growth/)
- [dev.to — How to Crush Your Hacker News Launch](https://dev.to/dfarrell/how-to-crush-your-hacker-news-launch-10jk)
- [Syften — Hacker News Posting Guide](https://syften.com/blog/hacker-news-marketing/)

---

## Related Docs

- [FUTURE_FEATURES.md](FUTURE_FEATURES.md) — deferred features + roadmap
- [ROADMAP.md](ROADMAP.md) — what's built
- [MONETIZATION.md](MONETIZATION.md) — pricing & unit economics
- [GEMINI_VISION_EVALUATION.md](GEMINI_VISION_EVALUATION.md) — receipt OCR backend
