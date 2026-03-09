# Pocket - User Guide

A complete guide to managing your personal finances with Pocket.

## Table of Contents

- [What is Pocket?](#what-is-pocket)
- [Getting Started](#getting-started)
- [Dashboard Overview](#dashboard-overview)
- [Managing Transactions](#managing-transactions)
- [Budgets](#budgets)
- [Financial Goals](#financial-goals)
- [Savings Accounts](#savings-accounts)
- [Recurring Transactions](#recurring-transactions)
- [Receipt Scanner](#receipt-scanner)
- [Reports & Analytics](#reports--analytics)
- [AI Features](#ai-features)
- [Calendar View](#calendar-view)
- [Settings & Preferences](#settings--preferences)
- [Installing as an App (PWA)](#installing-as-an-app-pwa)
- [Tips & Best Practices](#tips--best-practices)
- [FAQ](#faq)

---

## What is Pocket?

Pocket is a privacy-first personal finance app that helps you:

- **Track income and expenses** with full control over your data
- **Set budgets** by category and get alerts when you're close to limits
- **Define savings goals** and track your progress
- **Scan receipts** with AI to auto-fill transaction details
- **Get AI-powered insights** about your spending habits
- **View reports** with charts and export them as PDF or CSV
- **Work offline** and sync when you're back online

No bank account linking required. Your financial data stays private and under your control.

---

## Getting Started

### Creating Your Account

1. Open Pocket in your browser
2. Click **Sign Up** on the landing page
3. Choose your sign-up method:
   - **Email & Password** - Enter your name, email, and create a password
   - **Google** - Sign in with your Google account for one-click setup
4. Complete the onboarding steps:
   - Set your **preferred currency** (EUR, USD)
   - Set your **language** (English or Bulgarian)
   - Choose your **timezone**

### Signing In

1. Go to the login page
2. Enter your email and password, or click **Sign in with Google**
3. You'll be redirected to your dashboard

---

## Dashboard Overview

The dashboard is your financial command center. Here's what you'll find:

### Metrics Cards (Top)
Four summary cards showing your current financial snapshot:
- **Total Balance** - Your net balance (income minus expenses)
- **Total Income** - All income for the current period
- **Total Expenses** - All expenses for the current period
- **Savings Rate** - What percentage of income you're saving

Each card shows a comparison arrow (up/down) against the previous month.

### Budget Progress
A visual overview of your active budgets with color-coded progress bars:
- **Green** - Under 75% of budget used
- **Yellow** - Between 75-90% of budget used
- **Red** - Over 90% or exceeded

### Recent Transactions
A table of your latest transactions with filters for category, date range, and type (income/expense).

### Quick Add Button
The floating **+** button at the bottom right lets you quickly add a new transaction from anywhere on the dashboard.

---

## Managing Transactions

### Adding a Transaction

1. Click the **+** button or the **Add Transaction** button
2. Fill in the details:
   - **Type** - Income or Expense
   - **Amount** - The transaction amount
   - **Category** - Select from predefined categories (the app auto-suggests based on the description)
   - **Date** - When the transaction occurred
   - **Description** - A short note about the transaction
   - **Tags** (optional) - Add custom tags for extra organization
   - **Notes** (optional) - Any additional details
3. Click **Save**

### Smart Category Detection
When you type a description, Pocket automatically suggests a category based on common merchant keywords. For example, typing "Lidl" will auto-suggest "Groceries".

### Editing a Transaction
1. Find the transaction in the table
2. Click on it to open the edit dialog
3. Modify any field
4. Click **Save**

### Deleting a Transaction
1. Open the transaction edit dialog
2. Click **Delete**
3. Confirm the deletion

### Filtering Transactions
Use the filter controls above the transaction table to narrow your view:
- **Category** - Show only specific categories
- **Date Range** - Pick a start and end date
- **Type** - Show only income or only expenses

---

## Budgets

Budgets help you set spending limits for specific categories.

### Creating a Budget

1. Navigate to the Budgets section on your dashboard
2. Click **Add Budget**
3. Configure your budget:
   - **Name** - Give it a descriptive name (e.g., "Monthly Groceries")
   - **Category** - Which spending category to track
   - **Amount** - Your spending limit
   - **Period** - Weekly, Monthly, or Yearly
   - **Alert Threshold** - Get warned when you reach this percentage (e.g., 80%)
4. Click **Save**

### Monitoring Budgets
- Each budget shows a progress bar with current spending vs. the limit
- Color coding indicates how close you are to the limit
- You'll see alert banners when approaching your threshold

### Editing or Deactivating Budgets
- Click on a budget card to edit its details
- Toggle the **Active** switch to deactivate a budget without deleting it

---

## Financial Goals

Goals help you save toward specific targets.

### Creating a Goal

1. Go to the Goals section
2. Click **Add Goal**
3. Set your goal:
   - **Name** - What you're saving for (e.g., "Vacation Fund")
   - **Target Amount** - How much you need
   - **Current Amount** - How much you've already saved
   - **Deadline** - When you want to reach the goal
4. Click **Save**

### Tracking Progress
- Each goal shows a visual progress indicator (current vs. target)
- The percentage completed is displayed
- You can update the current amount as you save

---

## Savings Accounts

Virtual savings accounts let you organize and track multiple savings pools.

### Creating a Savings Account

1. Navigate to the Savings section
2. Click **Add Savings Account**
3. Enter:
   - **Name** - Account label (e.g., "Emergency Fund", "Travel")
   - **Currency** - The account currency
4. Click **Save**

### Managing Balances
- View each account's current balance
- Allocate transaction amounts to specific savings accounts
- Activate or deactivate accounts as needed

---

## Recurring Transactions

Set up templates for transactions that repeat on a schedule (rent, subscriptions, salary).

### Creating a Recurring Transaction

1. Click **Add Recurring Transaction**
2. Fill in:
   - **Name** - Description of the recurring item
   - **Amount** - The recurring amount
   - **Type** - Income or Expense
   - **Category** - Transaction category
   - **Frequency** - Weekly, Monthly, or Yearly
   - **Next Date** - When the next occurrence is due
3. Click **Save**

### How It Works
- A scheduled Cloud Function runs daily and automatically creates transactions for any recurring items that are due
- You can also trigger processing manually from the dashboard
- The next occurrence date updates automatically after each creation

---

## Receipt Scanner

Use AI to scan receipts and auto-fill transaction details.

### Scanning a Receipt

1. Click the **Scan Receipt** button on the dashboard
2. Upload a receipt:
   - **Take a Photo** - Use your device camera (mobile)
   - **Upload File** - Select an image (JPEG, PNG, WebP) or PDF from your device
3. Wait for the AI to process the receipt
4. Review the extracted data:
   - Merchant name
   - Total amount
   - Date
   - Individual line items
5. Confirm or edit the details
6. The transaction is automatically populated in the Add Transaction form

### Tips for Best Results
- Ensure the receipt is well-lit and in focus
- Flat, unwrinkled receipts scan better
- The full receipt should be visible in the image
- PDFs from digital receipts give the best accuracy

---

## Reports & Analytics

### Accessing Reports
Navigate to **Reports** from the dashboard navigation.

### Available Charts
- **Spending by Category** - Pie or bar chart showing where your money goes
- **Monthly Trends** - Line chart showing income and expense patterns over time

### Custom Date Ranges
Use the date picker to select any time period for your reports.

### Exporting Reports
- **PDF Export** - Download a formatted PDF report with charts and summary tables
- **CSV Export** - Download raw transaction data as a spreadsheet-compatible file

### AI Monthly Digest
At the top of the Reports page, you'll find an AI-generated summary of your monthly spending. This includes:
- A narrative overview of your financial activity
- Month-over-month comparisons
- Actionable recommendations

The digest is generated once per month and cached so it loads instantly on return visits.

---

## AI Features

Pocket includes several AI-powered features to help you understand and improve your finances.

### Financial Health Score
A score from 0 to 100 that rates your overall financial health based on five factors:

| Factor | Weight | What It Measures |
|--------|--------|-----------------|
| Savings Rate | 30 points | How much of your income you save |
| Budget Adherence | 25 points | How well you stick to your budgets |
| Goal Progress | 20 points | How on-track you are with savings goals |
| Income Stability | 15 points | Consistency of your income |
| Spending Regularity | 10 points | Predictability of your spending |

Click on the score card to see a detailed breakdown of each component.

### Spending Anomaly Alerts
When the app detects an unusual spending spike in any category compared to your historical average, a dismissible alert banner appears on the dashboard. This helps you catch unexpected charges or lifestyle creep.

### Cash Flow Forecast
A 90-day projection of your expected balance based on your recurring transactions. The chart shows:
- **Projected balance line** - Your expected trajectory
- **Confidence bands** - Upper and lower bounds accounting for variability

### AI Budget Coach (Chat)
A conversational AI assistant that understands your financial data. Access it via the chat icon on the dashboard.

**What you can ask:**
- "Why am I running out of money mid-month?"
- "Which category should I cut back on?"
- "Am I on track with my savings?"
- "How does this month compare to last month?"

The chat provides personalized advice based on your actual income, expenses, budgets, and goals. Suggested prompts are provided to get you started.

**Privacy note:** The AI only receives aggregated financial summaries (totals by category), never raw transaction descriptions or personal details.

---

## Calendar View

The Calendar page shows your transactions plotted on a monthly calendar, giving you a day-by-day view of your spending and income patterns. This is useful for:
- Spotting spending clusters
- Seeing which days you tend to spend the most
- Reviewing transactions by date

---

## Settings & Preferences

### Profile Settings
- **Name** - Update your display name
- **Currency** - Change your default currency (EUR, USD)
- **Language** - Switch between English and Bulgarian
- **Timezone** - Set your local timezone

### Theme
Toggle between **Light Mode** and **Dark Mode** using the theme switch in the navigation bar.

### Session Security
The app includes an auto-logout feature that warns you after a period of inactivity. This protects your financial data on shared or public devices.

---

## Installing as an App (PWA)

Pocket is a Progressive Web App, which means you can install it on any device for a native app-like experience.

### Desktop (Chrome / Edge)
1. Visit Pocket in your browser
2. Look for the **install icon** in the address bar (or the install prompt)
3. Click **Install**
4. Pocket will open in its own window and appear in your taskbar/dock

### Android (Chrome)
1. Visit Pocket in Chrome
2. Tap the **menu** (three dots) and select **Add to Home Screen**
3. Or accept the install prompt that appears automatically
4. The app icon will appear on your home screen

### iOS (Safari)
1. Visit Pocket in Safari
2. Tap the **Share** button
3. Select **Add to Home Screen**
4. The app will appear on your home screen

### Benefits of Installing
- Opens in its own window (no browser UI)
- Works offline
- Faster access from your home screen or taskbar
- Push notification support (where available)

---

## Tips & Best Practices

### Getting the Most Out of Pocket

1. **Log transactions daily** - The sooner you record expenses, the less you'll forget. Use the quick-add button for speed.

2. **Set realistic budgets** - Start with your actual spending patterns, then gradually tighten. Overly strict budgets are hard to maintain.

3. **Use categories consistently** - Stick with the auto-suggested categories when possible. Consistent categorization makes reports more meaningful.

4. **Review your Health Score weekly** - It's a quick way to check if your financial habits are improving.

5. **Check anomaly alerts** - When you see a spending spike alert, investigate it. Sometimes it's expected (holiday shopping), sometimes it reveals a problem.

6. **Set up recurring transactions** - For regular bills and income, recurring transactions save time and help the cash flow forecast be more accurate.

7. **Export reports monthly** - Keep PDF or CSV records for your own archives or tax purposes.

8. **Use the AI Coach** - Don't hesitate to ask the budget coach questions. It can spot patterns you might miss.

9. **Scan receipts immediately** - Scanning receipts right after a purchase prevents data entry backlogs.

10. **Review the Cash Flow Forecast** - The 90-day forecast helps you plan ahead and avoid surprises.

---

## FAQ

### Is my financial data secure?
Yes. All data is stored in Google Cloud Firestore with security rules that ensure only you can access your data. Authentication is handled by Firebase Auth. No bank accounts are ever linked.

### Does Pocket connect to my bank?
No. Pocket is a manual-entry app by design. This gives you full control and privacy over your data. You enter transactions yourself or scan receipts.

### Can I use Pocket offline?
Yes. Pocket is a PWA with a service worker that caches the app for offline use. You can view your data and add transactions offline. Changes will sync when you're back online.

### How much does the AI cost?
The AI features use Google Gemini 2.5 Flash on the free tier (1,500 requests/day). Client-side features like the Health Score, anomaly detection, and cash flow forecast run entirely in your browser at zero cost.

### Can I export my data?
Yes. The Reports page lets you export your financial data as PDF (formatted with charts) or CSV (raw data for spreadsheets).

### What currencies are supported?
Currently EUR and USD. The architecture supports adding more currencies.

### What languages are available?
English and Bulgarian. The app uses next-intl for internationalization and can be extended with additional languages.

### Can I use Pocket on my phone?
Yes. Pocket is fully responsive and optimized for mobile. You can install it as a PWA for the best mobile experience (see [Installing as an App](#installing-as-an-app-pwa)).

### How do I delete my account?
Contact the administrator to request account deletion. All your data in Firestore will be removed.
