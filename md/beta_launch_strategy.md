# Pocket — Beta Launch Strategy

## Product Summary

**Pocket** is a privacy-first personal finance PWA with:
- Manual expense tracking (no bank linking — this is the pitch, not a weakness)
- AI budget coach, receipt scanning, anomaly detection, health score
- Freemium model (Free → €7.99 Pro → €19.99 Business)
- PWA with offline support, English + Bulgarian

**Core differentiator** vs Mint/YNAB/Revolut: **Privacy + No bank linking + AI insights**

**Core Pitch:**
> "Pocket: Budget smarter without giving your bank password to anyone. Privacy-first expense tracking with AI insights — free to start, no bank linking required."

---

## Phase 1: Pre-Launch Prep (1–2 weeks)

### Must-Fix Before Going Public

**A. Enable the Cash Flow Forecast**
The 90-day forecast component is built but the toggle is commented out on the dashboard. Enable it — it's a key Pro differentiator that justifies the €7.99/month.

**B. Raise the Free Tier for Beta**
50 transactions/month is too tight for onboarding. Bump to 100 for beta or remove the limit temporarily. First impressions matter more than conversion rate at this stage. Tighten it later.

**C. Add a "Beta" Badge to the Landing Page**
Sets expectations and creates a sense of exclusivity.

**D. Set Up Error Tracking (Sentry)**
Add [Sentry](https://sentry.io) (free tier) before going public. You'll receive crash reports automatically without users having to report them manually. Without this, you're flying blind.

**E. Add an In-App Feedback Widget**
Embed [Tally.so](https://tally.so) or [Canny.io](https://canny.io) (both free) directly in the app — a "Send Feedback" button in the sidebar. Frictionless feedback is critical in beta.

**F. Set Up Privacy-Respecting Analytics**
You market "zero tracking" as a feature, but you still need to understand your own funnel. Use [Plausible](https://plausible.io) (privacy-first, you can honestly mention it to users) or self-hosted [Umami](https://umami.is).

Track these funnel events:
- Signup
- Onboarding completion
- First transaction added
- 5 transactions added (activation hypothesis)
- Subscription upgrade

---

## Phase 2: Getting Your First 100 Beta Users

### Channel 1: Reddit (Highest ROI, Free)

Personal finance Reddit communities are massive and love privacy-first tools. Post authentically, not as spam.

**Target subreddits:**
| Subreddit | Members | Angle |
|-----------|---------|-------|
| r/personalfinance | 17M+ | General budgeting |
| r/financialindependence | 1.5M+ | FIRE crowd, love manual tracking |
| r/FIRE | 300K+ | Hardcore savers |
| r/Frugal | 2M+ | Budget-conscious |
| r/privacy | 1M+ | "I didn't want to give Mint my bank login" |
| r/selfhosted | 300K+ | Tech-savvy, appreciate Firebase architecture |
| r/bulgaria | Niche | Localization angle, loyal community |

**Post strategy:**
Write a "Show HN" style personal story — *"I built a privacy-first expense tracker because I was uncomfortable linking my bank account to Mint. Here's what I made."*
- Tell the story, include screenshots
- Ask for brutal feedback
- Do NOT open with a promo link — share it only when asked or in comments
- Engage every single comment in the first 2 hours (Reddit algorithm rewards early engagement)

---

### Channel 2: Product Hunt

A well-executed Product Hunt launch can generate 200–500 beta signups in a single day.

**Steps:**
1. Create a **Ship page** now (beta waitlist) to build an audience before launch day
2. Schedule launch for **Tuesday–Thursday** (highest traffic days)
3. Coordinate 5–10 people to upvote within the first hour — early momentum is critical
4. Prepare a **60-second demo GIF** showing: add transaction → AI receipt scan → budget coach chat
5. Offer a **PH exclusive**: first 100 users get 3 months Pro free
6. Write a genuine maker comment explaining the privacy motivation

---

### Channel 3: Hacker News (Show HN)

Post title: `Show HN: Pocket – Privacy-first expense tracker with AI budget coach (no bank linking)`

HN users respond to:
- Technical choices (Firebase, Gemini, Document AI — explain the architecture briefly)
- Privacy motivation (your core pitch)
- Business model transparency (freemium with clearly stated limits)

Can drive 100–500 unique visits in a day if it hits the front page.

---

### Channel 4: Twitter/X & LinkedIn

**Twitter/X — Build in Public:**
- Start a weekly thread: *"Day 1 of launching my finance app in public"*
- Share metrics, screenshots, user feedback every week
- Hashtags: `#buildinpublic` `#indiedev` `#personalfinance` `#privacy`
- Engage with finance influencers' posts (don't cold pitch, add value to their threads)

**LinkedIn:**
Write a post: *"I quit using Mint because I didn't want them reading my bank statements. So I built my own privacy-first alternative. It's live. Here's the link."*
- Works especially well for Bulgarian/Eastern European professional networks where privacy concerns are high
- Professional networks share this kind of story

---

### Channel 5: Niche Communities (High Quality Users)

| Community | Why |
|-----------|-----|
| r/ynab + YNAB Facebook groups | Users already doing manual budgeting — your perfect customer |
| Telegram personal finance groups (Bulgaria, Eastern Europe) | Your localization gives a trust advantage |
| Indie Hackers Discord | Supportive early adopter community |
| Personal finance Facebook Groups | Large, active, share-friendly |

---

### Channel 6: Direct Outreach — Your First 10 Design Partners

DM 10–15 people you know personally who:
- Are budget-conscious or talk about money
- Have expressed privacy concerns about apps
- Are tech-savvy enough to give useful feedback

These first 10 users are your **design partners**. Treat them like gold:
- Hop on a 30-min Zoom with each
- Watch them use the app (screen share)
- Ask: *"Where did you get confused?"* not *"What do you think?"*

This feedback is worth more than 1,000 survey responses.

---

## Phase 3: Retention & Feedback Loop

### Activation Hypothesis

Your "aha moment" hypothesis: users who add **5+ transactions** and see their **dashboard populate** are the ones who stick.

Track and optimize:
1. Signup → Onboarding completion
2. Onboarding → First transaction added
3. First transaction → 5 transactions (activation gate)
4. Activation → 30-day retention

### Weekly Drip Email Sequence

Use [Resend](https://resend.com) (integrates cleanly with Firebase):

| Day | Email | Goal |
|-----|-------|------|
| Day 1 | Welcome + how to add your first transaction | Activation |
| Day 3 | "Have you tried the AI Budget Coach?" | Feature discovery / Pro teaser |
| Day 7 | 1-question NPS: "How likely are you to recommend Pocket?" (0–10) | Feedback signal |
| Day 14 | Personalized: "You've tracked X transactions this month" | Engagement / stickiness |
| Day 30 | Upgrade to Pro pitch, tied to their specific usage | Conversion |

### In-App Feedback Form

Add a persistent feedback button in the sidebar routing to a Tally.so form:
1. What brought you to Pocket?
2. What's the one thing you wish it did better?
3. Would you pay €7.99/month for the Pro features? Why / why not?

---

## Phase 4: Content Marketing (Medium-term)

### SEO Blog Posts

Write 5 posts targeting users who are searching for alternatives. These rank in Google and send warm traffic for months/years:

1. *"Best Mint alternatives in 2025 (no bank linking required)"*
2. *"How to track expenses without linking your bank account"*
3. *"Privacy-first budgeting apps compared: 2025 edition"*
4. *"AI expense tracker: how to get smarter insights from your spending"*
5. *"YNAB vs manual budgeting — is it worth it?"*

### Demo Video (High Impact)

A 3-minute app tour showing:
1. Adding a transaction
2. AI receipt scanning
3. Budget coach conversation
4. Dashboard health score

Post to YouTube (searchable), include on Product Hunt page and landing page.

---

## Launch Checklist

| Priority | Action | Status | Effort | Impact |
|----------|--------|--------|--------|--------|
| 🔴 Critical | Add Sentry error tracking | ✅ Done | — | Catch bugs before users complain |
| 🔴 Critical | Add in-app feedback button | ⬜ Pending | 2 hours | Core feedback mechanism |
| 🔴 Critical | Set up Plausible/Umami analytics | ✅ Done (opt-in via env var) | — | Understand your funnel |
| 🟠 High | Enable cash flow forecast | ⏸ Built, temporarily disabled | 5 min | Justifies Pro upgrade |
| 🟠 High | Raise free tier to 100 tx for beta | ⬜ Pending | 5 min | Better first impression |
| 🟠 High | Post on Reddit r/personalfinance | ⬜ Pending | 1 hour | First wave of real users |
| 🟠 High | DM 10 people personally for feedback | ⬜ Pending | 2 hours | Highest quality early feedback |
| 🟡 Medium | Product Hunt Ship page (waitlist) | ⬜ Pending | 1 hour | Build audience before launch day |
| 🟡 Medium | "Build in public" Twitter/X thread | ⬜ Pending | 30 min | Low-cost community building |
| 🟡 Medium | Show HN post | ⬜ Pending | 1 hour | Tech-savvy early adopters |
| 🟢 Later | Drip email sequence (Resend) | ⬜ Pending | 4 hours | Retention |
| 🟢 Later | 3 SEO blog posts | ⬜ Pending | 6 hours | Long-term organic traffic |
| 🟢 Later | 3-minute YouTube demo video | ⬜ Pending | 3 hours | Product Hunt + landing page asset |

### Pre-Launch Must-Fix — Status Update (March 22, 2026)

**A. ~~Enable the Cash Flow Forecast~~** — Built and functional. Temporarily disabled on dashboard while UX is reviewed. Re-enable: uncomment `CashFlowForecast` in `frontend/app/(app)/dashboard/page.tsx`.

**B. Raise the Free Tier for Beta** — Still pending. Change `FREE_TIER_LIMITS.transactions` in `frontend/lib/constants/subscription.constants.ts`.

**C. Beta Badge on Landing Page** — Pending.

**D. ~~Set Up Error Tracking (Sentry)~~** ✅ — `@sentry/nextjs` installed, `SentryProvider` in layout, DSN in `NEXT_PUBLIC_SENTRY_DSN`. Set the same var in Firebase Hosting env / `.env.production` for prod.

**E. In-App Feedback Widget** — Pending. Add Tally.so or Canny embed.

**F. ~~Set Up Privacy-Respecting Analytics~~** ✅ — Plausible script added to `layout.tsx`. Activate by setting `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.com` in `.env.production`. No code changes needed.

---

## Competitive Positioning

| App | Bank Linking | AI Features | Price | Privacy |
|-----|-------------|-------------|-------|---------|
| Mint | Required | Basic | Free (ads) | Low |
| YNAB | Optional | None | $14.99/month | Medium |
| Revolut | Required | Basic | Free–€45/month | Low |
| Copilot | Required | Good | $13/month | Medium |
| **Pocket** | **Not required** | **Strong (Gemini)** | **Free–€19.99/month** | **High** |

**Own the privacy angle.** Users who care about it will seek you out — they just need to know you exist.

---

## Success Metrics for Beta

| Metric | Target at 30 days | Target at 90 days |
|--------|-------------------|-------------------|
| Registered users | 100 | 500 |
| Activated users (5+ tx) | 40% of signups | 50% of signups |
| 30-day retention | 25% | 35% |
| NPS score | > 30 | > 40 |
| Pro conversion rate | 3% | 5% |
| MRR | €25 | €200 |
