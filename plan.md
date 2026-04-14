Here's my assessment after reviewing the full codebase. I'll rank by acquisition impact, not technical complexity.

Top Features for User Acquisition
1. Bank Connectivity (Open Banking / Plaid)
Highest single impact. Manual entry is the primary reason people abandon personal finance apps before they see value. Every competitor that added automatic import saw massive conversion lift.

EU: Nordigen (now GoCardless) has a free tier with PSD2 bank feeds
US: Plaid
This collapses the time-to-value from weeks to minutes
2. Shared / Family Budgeting
Built-in viral loop — one user invites their partner. You currently have no household/shared mode. This is the fastest path to organic acquisition because every new user drags in at least one more.

Minimal MVP: shared workspace with separate auth, merged transaction view, per-person income tracking.

3. Subscription Tracker (Dedicated Page)
High virality. People post "I found €X/month in forgotten subscriptions" on social media. You already have recurring transactions — a dedicated subscriptions page with "you're paying X for Y, cancel?"-style nudges costs little to build and drives word-of-mouth.

4. Shareable Achievement Cards
You have a health score, savings goals, and a leaderboard. You're not letting users share these outside the app. A "I saved 25% of my income this month" card (PNG export, ready for Instagram/Twitter) is free advertising. Finance content performs strongly on social.

5. App Store Listing (TWA / Capacitor)
You're already a PWA. Submitting a Trusted Web Activity (TWA) to the Google Play Store is low effort and unlocks a completely different discovery channel. App Store (iOS) requires more work (Capacitor wrapper) but the addressable audience is large.

6. Debt Payoff Planner
Debt is emotionally urgent. People in debt search for tools actively. Snowball/avalanche calculators with a "you'll be debt-free by [date]" output convert strongly because the value is immediately tangible. You have nothing for this segment right now.

What I'd Deprioritize
Tax export — important for retention, not acquisition
Investment portfolio tracking — high complexity, niche at your scale
Advanced custom reports — power user feature, won't move the acquisition needle
Honest Assessment
The app is technically solid and has features (AI digest, receipt scanning, health score) that more established apps don't. The problem is time-to-value is too long because everything is manual entry. Bank connectivity would do more for acquisition than any other single feature. The second-best lever is the shared budgeting viral loop.

If you want I can dig into a specific one of these and map out what implementation would actually look like given the existing data model.