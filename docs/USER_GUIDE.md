# Pocket — User Guide

**Version:** 1.0
**Last Updated:** March 2026

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Transactions](#managing-transactions)
4. [Budgets](#budgets)
5. [Savings Goals](#savings-goals)
6. [Recurring Transactions](#recurring-transactions)
7. [Savings Accounts](#savings-accounts)
8. [Reports & Analytics](#reports--analytics)
9. [AI Features](#ai-features)
10. [Settings & Preferences](#settings--preferences)
11. [Installing as a PWA](#installing-as-a-pwa)
12. [Tips & Best Practices](#tips--best-practices)
13. [FAQ](#faq)
14. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Creating Your Account

1. Visit **Pocket** at [fin-track-adc2c.web.app](https://fin-track-adc2c.web.app)
2. Click **"Get Started"** or **"Sign Up"** on the landing page
3. Choose your sign-up method:
   - **Email & Password** — enter your email and create a password
   - **Google Sign-In** — one-click sign-up using your Google account
4. Complete your profile — set your default currency and language (English or Bulgarian)

### First Steps

Once inside the app:

1. **Add your first transaction** — click **"+ Add Entry"** in the Recent Transactions section
2. **Create a budget** — set spending limits for your top categories (Food, Transport, etc.)
3. **Set a savings goal** — something you're working toward: emergency fund, vacation, new laptop
4. **Set up recurring transactions** — subscriptions and bills that repeat every month

---

## Dashboard Overview

The dashboard is your financial command center. Sections are **collapsible** — click any section header to expand or collapse it.

| Section | What It Shows |
|---------|--------------|
| **AI Insights** | Health score, anomaly alerts, cash flow forecast |
| **Recent Transactions** | Your latest income and expenses |
| **Budgets** | Spending limits with progress bars |
| **Savings Goals** | Progress toward financial targets |
| **Recurring Transactions** | Upcoming automated transactions |
| **Savings Accounts** | Balances across your virtual accounts |

### Navigation

- **Dashboard** — main view
- **Calendar** — month-view of all transactions
- **Reports** — charts, analytics, and AI digest
- **Settings** — account preferences and data management

---

## Managing Transactions

### Adding a Transaction

**Quick Add (floating "+" button)**
Best for fast mobile entry:
1. Tap the **"+"** button (bottom-right)
2. Select **Expense** or **Income**
3. Choose category → item → amount
4. Tap **Save**

**Full Entry ("+ Add Entry" in the Transactions section)**
For detailed entries:
1. Click **"+ Add Entry"**
2. Fill in:
   - **Description** — what was it? (e.g. "Weekly groceries")
   - **Amount** — how much?
   - **Category** — Food & Dining, Transport, Housing, etc.
   - **Type** — Income or Expense
   - **Date** — defaults to today
   - **Currency** — defaults to your preference
   - **Notes** — optional context
   - **Tags** — optional keywords for searching
3. Optionally **scan a receipt** (Pro/Business plan) using the camera icon
4. Click **"Add Entry"**

### Editing & Deleting

- Click the **pencil icon** on any transaction to edit it
- Click the **trash icon** to delete — confirm in the popup
- Deletions are permanent; edit instead if you're unsure

### Receipt Scanning (Pro & Business)

1. Click **"+ Add Entry"** → camera icon
2. Take a photo or upload an image/PDF (max 10 MB, JPG/PNG/PDF)
3. Google Document AI extracts the merchant, amount, and date automatically
4. Review and confirm the extracted data before saving

### Searching & Filtering

| Filter | Options |
|--------|---------|
| **Search** | Description, category, or notes |
| **Date** | Today, This Week, This Month, Last Month, This Year, Custom |
| **Category** | Any single category |
| **Type** | Income or Expense |
| **Sort** | Date, Amount, Description, Category (asc/desc) |

### Exporting

- **CSV** — export filtered or all transactions for spreadsheets or tax software
- **PDF** — generate a formatted report from the Reports page

---

## Budgets

Budgets let you set spending limits per category and track how close you are in real time.

### Creating a Budget

1. Go to the **Budgets** section on the dashboard
2. Click **"+ Create Budget"**
3. Fill in:
   - **Name** — e.g. "Monthly Groceries"
   - **Category** — what spending area?
   - **Amount** — your limit (e.g. €400)
   - **Period** — Weekly, Monthly, or Yearly
   - **Alert Threshold** — get a warning at X% (default: 80%)
4. Click **"Create Budget"**

### Budget Status

| Color | Meaning |
|-------|---------|
| Green | Under budget (0–79%) |
| Yellow | Approaching limit (80–99%) |
| Red | Over budget (100%+) |

### Tips

- Create a budget for your biggest spending categories first
- If you consistently go over, adjust the amount rather than ignoring the alerts
- Use the yearly period for irregular expenses like insurance or subscriptions

---

## Savings Goals

Goals track your progress toward financial targets — an emergency fund, a holiday, a new device.

### Creating a Goal

1. Go to the **Savings Goals** section
2. Click **"+ Add Goal"**
3. Enter:
   - **Name** — what are you saving for?
   - **Target Amount** — total you need
   - **Current Amount** — what you've saved so far
   - **Deadline** — optional target date
4. Click **"Create Goal"**

The goal card shows your progress as a percentage and, if you set a deadline, the monthly amount needed to reach it on time.

### Updating Progress

Click on the goal card and update the **Current Amount** as your savings grow.

---

## Recurring Transactions

Set up templates for regular income and expenses so they appear automatically each period.

### Setting Up a Recurring Transaction

1. Go to the **Recurring Transactions** section
2. Click **"+ Add Recurring"**
3. Configure:
   - **Description** — e.g. "Netflix"
   - **Amount** — e.g. €15.99
   - **Category** and **Type** (Income or Expense)
   - **Frequency** — Weekly, Monthly, or Yearly
   - **Next Date** — when should the next entry be created?
4. Click **"Save"**

### How Auto-Creation Works

A scheduled Cloud Function runs daily at **1:00 AM UTC** and creates an entry for every recurring transaction whose Next Date matches today. The Next Date then advances to the next occurrence automatically.

### Managing Recurring Transactions

- **Pause** — toggle the Active switch off to stop new entries without deleting the template
- **Skip** — edit the Next Date to skip an unwanted period
- **Edit** — update amount or frequency for future entries
- **Delete** — removes the template; past entries are kept

---

## Savings Accounts

Virtual savings accounts let you track money you've set aside — separate from your day-to-day spending.

### Creating a Savings Account

1. Go to the **Savings Accounts** section
2. Click **"+ Create Account"**
3. Enter account name, initial balance, and currency
4. Click **"Save"**

### Adding & Withdrawing

- **Add Money** — allocate income directly to a savings account
- **Withdraw** — move money out when you spend from savings

Each account shows its current balance in real time.

---

## Reports & Analytics

Navigate to **Reports** in the top navigation.

### Available Views

| Report | What It Shows |
|--------|--------------|
| **This Year** | Full-year income, expenses, savings rate |
| **This Month** | Current month summary |
| **Custom Range** | Pick any start and end date |

### Charts

- **Income vs Expenses** — bar chart by month
- **Spending by Category** — breakdown with percentages
- **Monthly Trends** — line chart over the selected period

### AI Monthly Digest (Pro & Business)

A Gemini-generated 3–5 sentence narrative that summarises your month's spending, highlights notable changes vs the previous month, and suggests one or two specific improvements. Cached so it loads instantly after the first generation.

### Exporting

- **PDF** — click "Export PDF" for a formatted report
- **CSV** — click "Export CSV" for raw transaction data

---

## AI Features

Pocket includes five AI-powered insights, visible on the dashboard.

### 1. Financial Health Score

A 0–100 score calculated entirely in your browser (no data leaves the app) from five components:

| Component | Weight |
|-----------|--------|
| Savings Rate | 30% |
| Budget Adherence | 25% |
| Goal Progress | 20% |
| Income Stability | 15% |
| Spending Regularity | 10% |

Click the score ring to see the full breakdown.

### 2. Anomaly Detection

If spending in a category is significantly higher than your historical average, a dismissible alert banner appears at the top of the dashboard. The detection uses a Z-score algorithm — it only fires when the spike is statistically unusual, not just slightly above average.

### 3. Cash Flow Forecast

A 90-day forward projection of your balance, based on your recurring transactions. Shows upper and lower confidence bands so you can see a range of likely outcomes.

### 4. AI Monthly Digest

Available on the Reports page. See [Reports & Analytics](#reports--analytics) above.

### 5. AI Budget Coach Chat (Pro & Business)

A floating chat button (bottom-left of the dashboard) opens a conversation with an AI coach that has context on your actual spending. Ask questions like:

- *"Where can I cut back this month?"*
- *"Am I on track to meet my savings goal?"*
- *"Why did my health score drop?"*

The coach only sees aggregated spending totals — never individual transaction descriptions.

---

## Settings & Preferences

Click **Settings** (gear icon, top-right) to manage your account.

### Display Preferences

| Setting | Options |
|---------|---------|
| **Currency** | EUR, USD, GBP, BGN, and 150+ others |
| **Language** | English, Bulgarian |
| **Theme** | Light, Dark, System |

### Subscription

View your current plan (Free, Pro, or Business) and upgrade or manage billing from the Settings page.

| Plan | Price | Receipt Scans/month | AI Features |
|------|-------|---------------------|-------------|
| Free | €0 | 0 | Health score, anomaly detection, forecast |
| Pro | €7.99/mo | 30 | + AI digest, AI chat |
| Business | €19.99/mo | 150 | + AI digest, AI chat |

### Data & Privacy

**Export your data:**
1. Settings → Data & Privacy → **Export All Data**
2. Download as CSV

**Delete your account:**
1. Settings → **Account Settings**
2. Scroll to the danger zone and type **DELETE** to confirm
3. All your data and your Firebase account are permanently removed

---

## Installing as a PWA

Pocket is a Progressive Web App — you can install it on any device without an app store.

**Desktop (Chrome / Edge):**
1. Open Pocket in your browser
2. Click the install icon in the address bar
3. Click **"Install"**

**Android (Chrome):**
1. Open Pocket in Chrome
2. Tap the menu → **"Add to Home Screen"**
3. Or tap the install prompt that appears at the bottom

**iOS (Safari):**
1. Open Pocket in Safari
2. Tap the **Share** button
3. Select **"Add to Home Screen"**

Once installed, Pocket works offline — recent data is cached locally and syncs automatically when you reconnect.

---

## Tips & Best Practices

**Log transactions regularly.** Even 2–3 minutes in the evening prevents backlog and keeps your reports accurate.

**Use categories consistently.** If you put coffee shops under "Food & Dining" one day and "Entertainment" the next, your reports become misleading. Pick a rule and stick to it.

**Set realistic budgets.** Look at your last 3 months of spending before setting a limit. Starting with a 10% reduction is more sustainable than a 50% cut.

**Use tags for seasonal or one-off spending.** Tag holiday shopping, moving expenses, or medical costs so you can filter them out of your regular analysis.

**Review Reports monthly.** The first weekend of each month takes 5 minutes and helps you spot trends before they become problems.

**Use the AI chat proactively.** It's grounded in your data — it can tell you things a generic finance article can't.

---

## FAQ

**Is my data private?**
Yes. All data is stored in your Firebase account, access-controlled so only you can read it. We do not link to your bank account, and no transaction descriptions are ever sent to AI services — only aggregated totals.

**Can I use Pocket offline?**
Yes. Recent data is cached locally via Firestore's offline persistence. Changes you make offline sync automatically when you reconnect.

**What currencies are supported?**
Over 150 currencies. Set your default in Settings — you can also override it per transaction.

**How do I handle a refund?**
Add it as an **Income** transaction in the same category as the original expense. For example, a €50 grocery refund → Income, Food & Dining, €50.

**Can I have multiple budgets for the same category?**
Yes — for example a weekly grocery budget alongside a monthly one.

**What happens when I exceed a budget?**
The budget card turns red and you receive a warning. Pocket doesn't block transactions — it's a tracking tool, not an enforcer.

**Is there a mobile app?**
Pocket is a PWA — install it from your browser on any device. It behaves like a native app once installed.

**What's the difference between Free and Pro?**
Free gives you full manual tracking with AI health score, anomaly detection, and cash flow forecast. Pro adds receipt scanning (30/month) and the AI digest and chat features. Business raises the scan quota to 150/month.

---

## Troubleshooting

**"Invalid API key" error on load**
Your `frontend/.env.local` is missing the Firebase configuration. See the [deployment guide](../md/deployment.md) for the required `NEXT_PUBLIC_FIREBASE_*` variables.

**App loading slowly**
1. Close unused browser tabs
2. Clear browser cache
3. Disable browser extensions (especially ad blockers) temporarily
4. Try an incognito window

**Transactions not appearing**
1. Check your internet connection
2. Hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R)
3. Check the active date filter — it may be set to a range with no data
4. Sign out and sign back in

**Receipt upload fails**
1. Check file size (max 10 MB) and format (JPG, PNG, PDF)
2. Verify you're on a Pro or Business plan
3. Check your scan quota in Settings

**AI features show "not configured"**
The ML service is either not running locally or the `GEMINI_API_KEY` is not set. See the [deployment guide](../md/deployment.md) for setup instructions.

**Stripe checkout CSP errors in browser console**
These come from browser extensions (password managers, ad blockers) trying to inject scripts into Stripe's hosted checkout page. They do not affect the checkout flow. Test in an incognito window with extensions disabled to confirm.

---

*For developer and deployment documentation, see [README.md](../README.md) and [md/deployment.md](../md/deployment.md).*
