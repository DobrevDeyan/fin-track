# Pocket — Public Beta/Alpha Launch & Marketing Plan

Research date: 2026-07-08. Goal: get the app in front of real people, generate traffic, and find out if strangers will sign up and stick around — on ~$0 budget, solo.

## Executive summary

The 2026 playbook for a solo-built consumer app is: **build a waitlist + landing page first, spend 6-8 weeks building minimal public presence and validating messaging in niche communities, then launch simultaneously on Product Hunt + Hacker News + Reddit with a pre-warmed audience.** Cold "just post it and see" launches consistently underperform; 60%+ of a winning Product Hunt launch's traffic comes from a pre-built list, and successful indie pre-launches hit 500-1,000 engaged signups before day one ([LaunchList](https://getlaunchlist.com/blog/saas-pre-launch-marketing-playbook)). For a personal-finance app specifically, Reddit (r/personalfinance, r/ynab, r/budgeting) is the highest-intent, highest-trust channel — 70% of finance-app shoppers use Reddit as their research layer ([ALM Corp](https://almcorp.com/blog/reddit-financial-services-research-trends-2026/)), and the current wave of budget-app interest is driven by Mint refugees and people who dislike sharing bank credentials — both angles Pocket can use. Because this is a *financial* app, trust/privacy messaging is not optional — it's the top predictor of whether a stranger will connect real transaction data to an unknown alpha product. This plan assumes you skip paid ads entirely until organic conversion is proven.

## Where Pocket stands today (context for the plan)

- Already differentiated: AI receipt scanning (Document AI), AI insights/health score/forecasting (Gemini), Households (shared budgets/goals), a leaderboard (built-in gamification/virality hook), debt planner, tiered pricing (free/pro/business).
- Not yet true of the market-standard "privacy-first" pitch: Pocket likely still needs manual entry/receipt scan rather than a "no bank login" pitch — confirm this before using that angle, since it's currently the single biggest Reddit-approved differentiator against Mint/YNAB/Monarch ([Finny case study](https://getfinny.app/blog/best-budget-apps-reddit-recommends-2026)).
- No existing audience, no email list, no social following — start from zero. That changes the channel order below (community-first, not audience-led).

## Phase 0 (this week): positioning + trust groundwork

Do these before touching any channel — they're the highest-leverage, cheapest fixes and everything downstream depends on them.

1. **Write one positioning sentence.** Format: "Pocket is [category] for [specific person] who [specific pain], without [the thing competitors force you to do]." Vague AI-productivity-style pitches convert badly; specific ones convert 2-3x better ([LaunchList](https://getlaunchlist.com/blog/saas-pre-launch-marketing-playbook)). Candidate: *"Pocket is a budgeting app for couples and roommates who split money but hate spreadsheets — snap a receipt, AI sorts it, everyone sees the same numbers."* (Households + receipt scan + AI is your real wedge — most budget apps are single-user.)
2. **Trust page, not just a landing page.** Since this touches real money data, publish (even a simple markdown page under `/legal` or `/trust`) in plain language: what data you store, that you're in beta and things may break, how to delete your account/data (you already have `deleteUserData`), and — critically — say **"alpha/beta, use with real data at your own risk, back up important records"**. Radical transparency about limitations beats polished marketing copy for fintech trust in 2026 ([FinTech Weekly](https://www.fintechweekly.com/magazine/articles/build-trust-fintech-app-security-compliance-user-experience), [Influencers Time](https://www.influencers-time.com/radical-transparency-boosts-fintech-trust-and-growth/)).
3. **Decide the honest label**: "alpha" implies expect bugs/data loss; "beta" implies mostly stable. Given Stripe billing is live, call it **beta** publicly (alpha scares away everyone except developers) but say explicitly "new features are still rolling out and we'd love your feedback."
4. **Add a feedback loop before launch**: an in-app feedback button or a simple Google Form link. You cannot learn anything from strangers if you can't hear from them.

## Phase 1 (weeks 1-2): landing page + waitlist

Even though the product already exists, treat the *public launch* like a fresh pre-launch — you want a controlled ramp, not an uncontrolled Reddit pile-on to a Firebase project with no rate limits tested at scale.

- Ship a single landing page (can be the existing marketing/home route) with **one above-the-fold CTA** ("Join the beta" or "Try it now" if you're comfortable with immediate signups), 3 screenshots/GIF of the actual product (receipt scan → AI category → dashboard), and one line of trust copy ("Your data, exportable/deletable anytime").
- Target landing-page conversion: **20-35% visitor→signup**. Below 20%, the fix is almost always the headline/positioning, not the design ([Unicorn Platform](https://unicornplatform.com/blog/waitlist-page-strategy-in-2026/), [LaunchList](https://getlaunchlist.com/blog/saas-pre-launch-marketing-playbook)).
- If you want a ramp instead of an instant flood: gate real signup behind a waitlist for 1-2 weeks while you finish Phase 0/2, or just let people in — given you already have tier gating (free = 3 scans, no AI) the free tier acts as a natural throttle on your Gemini/Document AI costs.
- Basic anti-abuse: confirm Firebase App Check / rate limiting on signup and the receipt-scan endpoint before any public post — a single viral Reddit thread can send a spike of new accounts hitting Document AI/Gemini within minutes.

## Phase 2 (weeks 2-5): community-first validation (no launch yet)

This is the step most solo builders skip and it's the one that determines whether launch day is 5 signups or 500.

- **Reddit — the single highest-value channel for this product.** Target subreddits: r/personalfinance (21.5M members), r/ynab (200K+), r/budgeting, r/povertyfinance, r/personalfinanceindia or country-specific ones if relevant, r/CreditCards (debt-planner angle). Rule for all of them: **spend 2+ weeks being a genuinely helpful commenter before ever mentioning Pocket**, and check each subreddit's self-promotion rules first — most enforce a 90/10 rule and some (e.g. r/eupersonalfinance) ban self-promo outright ([Reddit rules research](https://redship.io/blog/reddit-self-promotion-rules)). When you do mention it, do it as "I built this to solve X, here's what it does, happy to answer questions" in a thread that's already asking for app recommendations — not a top-level promo post.
- **Build-in-public on X (or a dev/finance-adjacent platform you actually enjoy).** Weekly posts: real screenshots, one metric, one lesson learned. This is what fills the "first 200 supporters" bucket for launch day — audience-led launches convert far better than cold ones ([Smol Launch](https://smollaunch.com/guides/launching-on-product-hunt)).
- **IndieHackers** — post milestones with real numbers (even small ones), ask genuine questions. Pure promotion gets downvoted; numbers + honesty do not ([LaunchList](https://getlaunchlist.com/blog/saas-pre-launch-marketing-playbook)).
- **Short-form video (TikTok/Reels/Shorts) is optional but high-upside** for a consumer finance app — "FinTok" rewards plain-language educational content (e.g. "why splitting bills with roommates never works — here's what fixed it for us") over polished ads, and posting from zero followers can still get algorithmic reach if the first 3 seconds hook ([StackMatix](https://www.stackmatix.com/blog/tiktok-growth-strategies-2026), [Vested](https://fullyvested.com/insights/tik-tok-for-finance-brands/)). Only take this on if you'll actually post 4-6x/week for 8+ weeks — inconsistent posting is worse than not starting ([StackMatix](https://www.stackmatix.com/blog/tiktok-marketing-strategy-2026)).
- Directories are low-effort, do them once, regardless of timing: BetaList, Product Hunt "Coming Soon" page (do this now, not launch day), Indie Hackers Products, SaaS Hub — 20-100 signups each plus SEO backlinks ([LaunchList](https://getlaunchlist.com/blog/saas-pre-launch-marketing-playbook)).

## Phase 3 (week 6): launch day

- **Pick Tuesday or Wednesday.** Product Hunt momentum peaks 12:01am PT that day; Hacker News favors Tue-Thu 9am-12pm ET ([Smol Launch](https://smollaunch.com/guides/launching-on-product-hunt), [HN launch research](https://syften.com/blog/hacker-news-marketing/)).
- **Product Hunt**: reserve your maker profile 30 days ahead (post/comment on other products so it's not a brand-new account on launch day), prep a 30-60s demo video/GIF, one-paragraph positioning, and a "first-hour supporters" list of ~30-50 people you personally ask to check it out and comment (not just upvote — PH's algorithm weighs engagement).
- **Hacker News (Show HN)**: title format "Show HN: Pocket — a budgeting app for splitting money with roommates/couples." Keep it factual, no hype words, no exclamation points. First 30-60 minutes matter most — be ready to answer every comment personally, including criticism ([HN guide](https://dev.to/dfarrell/how-to-crush-your-hacker-news-launch-10jk)). Expect and welcome technical/skeptical questions about data handling — answer them directly and calmly; that thread is often more valuable for trust-building than the traffic itself.
- **Reddit on launch day**: only post directly in the subreddits where you've already built standing from Phase 2, in a thread format ("I built X, ama/feedback welcome"), not a copy-paste of the PH post.
- **Email your waitlist** with the launch link the morning of, plus a small nudge to comment on PH/HN (concentrated early engagement in the first 6 hours matters more than total volume, per Smol Launch).

## Phase 4 (weeks 7-10): post-launch — this is where product-market signal actually shows up

Launch-day traffic tells you almost nothing about whether people want the product; it validates curiosity, not retention ([HN research](https://dev.to/dfarrell/how-to-crush-your-hacker-news-launch-10jk)). What matters next:

- **Week 1 after launch**: triage feedback, fix the loudest bugs, personally thank/respond to everyone who signed up (a personal email from the founder to new users massively increases activation for tiny-scale launches).
- **Track these numbers weekly, not daily**:
  - Landing page visitor → signup rate (target 20%+)
  - Signup → activation (first entry logged / first receipt scanned) — target 50%+
  - Day-7 retention (came back and logged something again) — target 40%+ is the "ready to scale" signal ([mean.ceo retention guide](https://blog.mean.ceo/retention-metrics-startup-guide/))
  - Free → paid conversion once past a small sample (don't over-index on this yet at low volume)
- 500 engaged users who activate and come back beats 5,000 who sign up and vanish — resist the urge to chase raw signup counts from this point on.
- Write a short public "launch retro" post (what worked, what broke, what you learned) in week 3-4 — this itself is a second, smaller distribution moment on the same channels.

## Trade-offs / open questions

- **Alpha/demo vs beta framing**: calling it "alpha" sets safer expectations for a solo project but drives away non-technical users who are your actual target (couples/roommates budgeting, not developers). Recommendation: call it beta, but be explicit about known rough edges.
- **Reddit self-promotion risk**: several of the highest-value subreddits (r/eupersonalfinance, some regional ones) ban self-promotion outright and moderators check poster history — verify each subreddit's current rules before posting; getting banned pre-launch burns the relationship for good.
- **Cost exposure**: Document AI (receipt scanning) and Gemini calls both cost money per user; a successful Reddit/HN spike could generate real cloud spend before you have paying users. Confirm your free-tier quota gates (3 scans, no AI) and Cloud Run/Document AI billing alerts are actually in place before Phase 3 — this wasn't verified in this research pass.
- **TikTok/short-form is the least certain-value channel here** — high upside but 60-90 days to show results and real time investment; treat as optional, not core path.
- Could not verify current exact Product Hunt algorithm weighting or Reddit's live current self-promotion enforcement for every subreddit listed — these are seasonally adjusted; check each subreddit's sidebar rules directly before posting.

## Concrete first 3 actions to take today

1. Write the one-sentence positioning statement (Phase 0, item 1) and put it at the top of the landing page.
2. Add a plain-language trust/limitations note to the signup flow or a `/trust` page (Phase 0, item 2-3).
3. Create Product Hunt "Coming Soon" page + submit to BetaList — both take under an hour and start compounding immediately (Phase 2, directories).

## Sources

- [Smol Launch — How to Launch on Product Hunt in 2026](https://smollaunch.com/guides/launching-on-product-hunt)
- [LaunchList — SaaS Pre-Launch Marketing Playbook: 0→1,000 Beta Users in 90 Days](https://getlaunchlist.com/blog/saas-pre-launch-marketing-playbook)
- [LaunchList — How to Launch on Product Hunt in 2026](https://getlaunchlist.com/blog/how-to-launch-on-product-hunt-2026)
- [Unicorn Platform — Waitlist Page Strategy in 2026](https://unicornplatform.com/blog/waitlist-page-strategy-in-2026/)
- [ALM Corp — 70% of Finance Shoppers Use Reddit for Research](https://almcorp.com/blog/reddit-financial-services-research-trends-2026/)
- [Finny Blog — Best Budget Apps Reddit Recommends in 2026](https://getfinny.app/blog/best-budget-apps-reddit-recommends-2026)
- [Redship — Reddit Self-Promotion Rules (2026)](https://redship.io/blog/reddit-self-promotion-rules)
- [StackMatix — TikTok Growth Strategies for Brands in 2026](https://www.stackmatix.com/blog/tiktok-growth-strategies-2026)
- [Vested — TikTok for Finance Brands: A 2026 Marketing Guide](https://fullyvested.com/insights/tik-tok-for-finance-brands/)
- [Prems AI — Indie Hacker Marketing Playbook: 7 Channels That Actually Work in 2026](https://prems.ai/blog/indie-hacker-marketing-playbook-2026)
- [mean.ceo — Retention Metrics: What to Track and Why (2026)](https://blog.mean.ceo/retention-metrics-startup-guide/)
- [FinTech Weekly — How to Build Trust in Your FinTech App](https://www.fintechweekly.com/magazine/articles/build-trust-fintech-app-security-compliance-user-experience)
- [Influencers Time — Radical Transparency in Fintech](https://www.influencers-time.com/radical-transparency-boosts-fintech-trust-and-growth/)
- [dev.to — How to crush your Hacker News launch](https://dev.to/dfarrell/how-to-crush-your-hacker-news-launch-10jk)
- [Syften — Hacker News Posting Guide: Rules, Show HN, and Timing](https://syften.com/blog/hacker-news-marketing/)
