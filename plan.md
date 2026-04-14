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


What was implemented
8 files created or modified:

File	Change
firestore-types.ts	Added HouseholdDocument, HouseholdMember, HouseholdInviteDocument types
firestore.rules	Added households and householdInvites collection rules
functions/src/index.ts	5 new Cloud Functions: createHousehold, sendHouseholdInvite, acceptHouseholdInvite, getHouseholdEntries, leaveHousehold
firestore-household.ts	New — client callable wrappers + subscribeToHousehold listener
HouseholdContext.tsx	New — React context managing household state and mode toggle
layout.tsx	Wrapped app in HouseholdProvider
settings/page.tsx	Household card: create, invite by email, copy invite link, leave
household/accept/page.tsx	New public page — validates token, joins household
dashboard/page.tsx	Personal/Family toggle in header + merged family transactions view
One thing to be aware of before deploying: the getHouseholdEntries function queries entries with where("userId", "in", [...]) + orderBy("date", "desc"). Firestore will prompt you to create a composite index the first time it runs — follow the Firebase Console link it provides in the error message.




Subscription Tracker (/subscriptions)

Loads all your recurring expenses
Monthly + annual cost summary cards
Category breakdown with progress bars
Sort by cost / name / next charge date
Pause/resume any subscription with one click
Flags subscriptions taking >30% of your total spend
Savings tip showing how much you'd save cancelling the top item
Debt Payoff Planner (/debt)

Add any number of debts (credit cards, loans, mortgage, etc.)
Snowball vs Avalanche strategy toggle with explanation
Extra monthly payment input
"Debt-free by [Month Year]" headline
Recharts area chart showing balance declining over time
Side-by-side strategy comparison (months + interest saved)
Debts persist to Firestore (userDebts/{userId})
Shareable Achievement Cards

Share icon on the Health Score card on the dashboard
Opens a dialog with a gradient card showing: health score + tier, income, expenses, savings rate
Download as PNG (html2canvas, 3× resolution for crisp social sharing)
Native Share Sheet on mobile (falls back to download on desktop)