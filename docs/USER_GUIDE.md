# Fin-Track User Guide

**Welcome to Fin-Track** - Your Personal Finance Management Solution

**Version:** 2.5
**Last Updated:** March 2026

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Transactions](#managing-transactions)
4. [Budgets](#budgets)
5. [Savings Goals](#savings-goals)
6. [Recurring Transactions](#recurring-transactions)
7. [Reports & Analytics](#reports--analytics)
8. [Settings & Preferences](#settings--preferences)
9. [Tips & Best Practices](#tips--best-practices)
10. [FAQ](#faq)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Creating Your Account

1. **Visit Fin-Track** at [your-domain.com](https://your-domain.com)

2. **Click "Sign Up"** on the homepage

3. **Choose registration method:**
   - **Email & Password:** Enter your email and create a strong password
   - **Google Sign-In:** Quick setup using your Google account

4. **Verify your email** (if using email/password)
   - Check your inbox for verification link
   - Click to activate your account

5. **Complete your profile**
   - Set your default currency (EUR, USD, GBP, etc.)
   - Choose your preferred date format
   - Select language preference

### First Login

Upon first login, you'll see:
- **Welcome Dashboard** - Your financial command center
- **Quick Tutorial** - 5-minute walkthrough (optional)
- **Sample Data** - Demo transactions to explore (can be deleted)

---

## Dashboard Overview

Your dashboard is divided into **6 main sections**, each collapsible for a cleaner view:

```
┌─────────────────────────────────────────────────────┐
│  📊 Recent Transactions                             │
│  Track daily income and expenses                    │
├─────────────────────────────────────────────────────┤
│  💰 Budgets                                         │
│  Monitor spending limits by category                │
├─────────────────────────────────────────────────────┤
│  🎯 Savings Goals                                   │
│  Work toward financial milestones                   │
├─────────────────────────────────────────────────────┤
│  🔁 Recurring Transactions                          │
│  Automate regular income/expenses                   │
├─────────────────────────────────────────────────────┤
│  🏦 Savings Accounts                                │
│  Track balances across accounts                     │
├─────────────────────────────────────────────────────┤
│  📈 Quick Stats                                     │
│  Summary cards: Total Income, Expenses, Net Worth   │
└─────────────────────────────────────────────────────┘
```

### Navigation Bar

Located at the top of every page:

- **🏠 Dashboard** - Main view with all sections
- **📅 Calendar** - Visual month view of transactions
- **📊 Reports** - Charts, graphs, and analytics
- **⚙️ Settings** - Preferences and account management
- **👤 Profile** - User menu with logout option

---

## Managing Transactions

Transactions are the foundation of Fin-Track. Every purchase, payment, or income is recorded here.

### Adding a Transaction

**Method 1: Quick Add (Dashboard)**

1. Click **"+ Add Entry"** button in Recent Transactions section
2. Fill in the form:
   - **Description:** What was the transaction? (e.g., "Grocery Shopping")
   - **Amount:** How much? (e.g., 45.50)
   - **Category:** Select from dropdown (Food & Dining, Transportation, etc.)
   - **Type:** Income, Expense, or Transfer
   - **Date:** When did it occur? (defaults to today)
   - **Currency:** EUR, USD, etc. (defaults to your preference)
3. **Optional fields:**
   - **Notes:** Additional details (e.g., "Bought items for dinner party")
   - **Tags:** Keywords for searching (e.g., "groceries", "urgent")
   - **Receipt:** Upload photo of receipt (tap camera icon)
4. Click **"Add Entry"** to save

**Method 2: Import from Bank (Future Feature)**

### Editing a Transaction

1. Find the transaction in Recent Transactions list
2. Click the **✏️ Edit** icon
3. Modify any field
4. Click **"Save Changes"**

**Note:** You can only edit transactions you created. Changes are instant.

### Deleting a Transaction

1. Find the transaction
2. Click the **🗑️ Delete** icon
3. Confirm deletion in popup
4. Transaction is permanently removed

**⚠️ Warning:** Deleted transactions cannot be recovered. Consider editing instead if you're unsure.

### Uploading Receipts

Keep digital records of your purchases:

1. When adding/editing a transaction, click **"Upload Receipt"**
2. Choose photo from:
   - **Camera:** Take photo now
   - **Gallery:** Select existing image
3. Image is uploaded and attached to transaction
4. Click **receipt icon** on transaction to view later

**Supported formats:** JPG, PNG, PDF (max 5MB)

### Using Tags

Tags help organize and find transactions:

**Adding tags:**
```
Tags: groceries, weekly-shopping, costco
```

**Searching by tag:**
- Type `#groceries` in search bar
- All transactions with "groceries" tag appear

**Common tag ideas:**
- `#tax-deductible` - Business expenses
- `#shared` - Split with roommate
- `#subscription` - Monthly services
- `#emergency` - Unexpected costs

### Transaction Types Explained

| Type | Use Case | Example |
|------|----------|---------|
| **Income** | Money received | Salary, freelance payment, gifts |
| **Expense** | Money spent | Rent, food, entertainment |
| **Transfer** | Moving money between accounts | Savings → Checking, ATM withdrawal |

**Color coding:**
- 🟢 Income - Green (positive)
- 🔴 Expense - Red (negative)
- 🔵 Transfer - Blue (neutral)

---

## Budgets

Budgets help you control spending by setting limits for specific categories.

### Creating a Budget

1. Navigate to **Budgets** section on dashboard
2. Click **"+ Create Budget"**
3. Fill in budget details:
   - **Name:** Descriptive title (e.g., "Monthly Groceries")
   - **Category:** What spending area? (Food & Dining, Transportation)
   - **Amount:** Spending limit (e.g., 400)
   - **Period:** Weekly, Monthly, or Yearly
   - **Start Date:** When does budget begin?
   - **Alert Threshold:** Warning % (default: 80%)
4. Click **"Create Budget"**

### Budget Status Indicators

Your budget card shows:

```
┌──────────────────────────────────────┐
│  🍔 Monthly Groceries                │
│  Food & Dining                       │
│                                      │
│  $320.00 / $400.00                   │
│  ████████░░ 80%                      │
│                                      │
│  $80.00 remaining                    │
│  Status: ⚠️ Warning (80%+ spent)     │
└──────────────────────────────────────┘
```

**Status colors:**
- 🟢 **Green (0-79%):** Under budget - you're good!
- 🟡 **Yellow (80-99%):** Warning - approaching limit
- 🔴 **Red (100%+):** Over budget - exceeded limit

### Budget Alerts

When you reach your alert threshold (default 80%):
- 📧 Email notification sent
- 🔔 In-app notification badge
- Budget card turns yellow

**Customizing alerts:**
1. Edit budget
2. Change "Alert Threshold" (0-100%)
3. Examples:
   - 90% for stricter control
   - 50% for early warnings

### Renewing Budgets

At the end of each period, you can:

**Option 1: Auto-Renew**
1. Click "Renew" on budget card
2. New period starts with same amount
3. Spending resets to $0

**Option 2: Adjust & Renew**
1. Click "Edit" before renewing
2. Modify amount based on last period
3. Click "Renew" with new settings

**Option 3: Archive**
- Click "Delete" if budget is no longer needed
- Historical data is preserved in Reports

---

## Savings Goals

Track progress toward financial milestones like vacations, emergency funds, or big purchases.

### Creating a Savings Goal

1. Go to **Savings Goals** section
2. Click **"+ Add Goal"**
3. Enter goal details:
   - **Name:** What are you saving for? (e.g., "Europe Vacation")
   - **Target Amount:** How much do you need? (e.g., 3000)
   - **Current Amount:** How much have you saved already? (e.g., 500)
   - **Deadline:** When do you need it? (e.g., June 2027)
   - **Category:** Optional grouping (Travel, Emergency, etc.)
4. Click **"Create Goal"**

### Goal Progress Visualization

```
┌─────────────────────────────────────┐
│  ✈️ Europe Vacation                 │
│  Target: $3,000 by June 2027        │
│                                     │
│  ████████░░░░░░░░░░░░ 33%           │
│  $1,000 / $3,000                    │
│                                     │
│  $2,000 remaining                   │
│  Recommended: $167/month            │
└─────────────────────────────────────┘
```

**Smart calculations:**
- Monthly savings needed
- Days remaining
- On-track status

### Adding to a Goal

**Method 1: Manual Contribution**
1. Click goal card
2. Click "Add Contribution"
3. Enter amount saved
4. Progress bar updates

**Method 2: Link to Savings Account**
1. Edit goal
2. Select "Link Account"
3. Choose savings account
4. Balance syncs automatically

### Goal Milestones

Celebrate progress with automatic milestones:
- 🎯 25% - First quarter saved!
- 🎯 50% - Halfway there!
- 🎯 75% - Final stretch!
- 🎉 100% - Goal achieved!

**Notification sent at each milestone.**

---

## Recurring Transactions

Automate regular income and expenses so you never forget to log them.

### Setting Up Recurring Transactions

1. Navigate to **Recurring Transactions** section
2. Click **"+ Add Recurring"**
3. Configure transaction:
   - **Description:** What is it? (e.g., "Netflix Subscription")
   - **Amount:** How much each time? (e.g., 15.99)
   - **Category:** Select category
   - **Type:** Income or Expense
   - **Frequency:** How often?
     - Daily
     - Weekly (specify day)
     - Monthly (specify date)
     - Yearly (specify date)
   - **Start Date:** When should it begin?
4. Click **"Save Recurring"**

### How Auto-Generation Works

Every day at midnight:
1. System checks all active recurring transactions
2. If `nextDate` matches today, creates transaction
3. Updates `nextDate` to next occurrence
4. You receive notification

**Example:**
```
Recurring: Netflix - $15.99 on 1st of month
Next Date: April 1, 2026

On April 1:
✅ Transaction created: "Netflix - $15.99"
📅 Next Date updated: May 1, 2026
```

### Managing Recurring Transactions

**Pause temporarily:**
1. Click recurring transaction
2. Toggle "Active" switch to OFF
3. No new transactions created until re-enabled

**Skip next occurrence:**
1. Edit recurring transaction
2. Change "Next Date" to skip unwanted month
3. Save

**Edit amount (e.g., price increase):**
1. Click Edit
2. Update amount
3. Future transactions use new amount

**Delete:**
- Removes recurring rule
- Keeps historical transactions already created

---

## Reports & Analytics

Visualize your financial health with charts, graphs, and insights.

### Accessing Reports

Click **📊 Reports** in navigation bar

### Available Reports

#### 1. Spending by Category (Pie Chart)

Shows where your money goes:

```
        Other
         12%
                    Food & Dining
  Utilities          28%
    15%
             Rent
             30%
     Transport
       15%
```

**Filters:**
- Date range (Last 30 days, This month, Custom)
- Transaction type (Expense, Income)
- Specific categories

#### 2. Income vs Expenses (Bar Chart)

Monthly comparison:

```
Jan  ████████ $3,200  ██████ $2,800 | +$400
Feb  █████████ $3,500  ███████ $3,100 | +$400
Mar  ████████ $3,200  ████████ $3,300 | -$100
```

- Green bars: Income
- Red bars: Expenses
- Net shown on right

#### 3. Spending Trends (Line Chart)

Track changes over time:

```
$4000│                    ╱
     │                  ╱
$3000│        ╱──╲    ╱
     │      ╱      ╲╱
$2000│    ╱
     │  ╱
$1000│╱
     └──────────────────────
     Jan Feb Mar Apr May Jun
```

**Insights highlighted:**
- 📈 Increasing trend
- 📉 Decreasing trend
- ⚠️ Unusual spikes

#### 4. Budget Performance

See how you're doing against all budgets:

| Budget | Limit | Spent | Remaining | Status |
|--------|-------|-------|-----------|--------|
| Groceries | $400 | $320 | $80 | ⚠️ 80% |
| Gas | $150 | $95 | $55 | ✅ 63% |
| Dining Out | $200 | $245 | -$45 | ❌ Over |

**Export options:**
- 📄 PDF Report
- 📊 Excel Spreadsheet
- 📧 Email to yourself

### Custom Date Ranges

For all reports:
1. Click "Date Range" dropdown
2. Select preset:
   - Last 7 days
   - Last 30 days
   - This month
   - Last month
   - This year
   - Custom range
3. For custom: pick start and end dates
4. Click "Apply"

---

## Settings & Preferences

Customize Fin-Track to work the way you want.

### Accessing Settings

Click **⚙️ Settings** in navigation bar

### Profile Settings

**Personal Information:**
- Name
- Email (requires re-verification if changed)
- Profile photo

**Security:**
- Change password
- Enable 2-factor authentication (2FA)
- View active sessions
- Sign out all devices

### Display Preferences

**Currency:**
- Default currency for new transactions
- Options: EUR, USD, GBP, JPY, etc.
- Can override per-transaction

**Date Format:**
- MM/DD/YYYY (US)
- DD/MM/YYYY (EU)
- YYYY-MM-DD (ISO)

**Language:**
- English
- Spanish
- German
- French
- (More coming soon)

**Theme:**
- ☀️ Light mode
- 🌙 Dark mode
- 🔄 Auto (matches system)

### Notification Preferences

Control what alerts you receive:

**Email notifications:**
- [ ] Budget alerts (80% threshold reached)
- [ ] Goal milestones (25%, 50%, 75%, 100%)
- [ ] Recurring transaction created
- [ ] Weekly summary email
- [ ] Monthly report email

**In-app notifications:**
- [ ] Budget warnings
- [ ] Goal progress updates
- [ ] Large transactions (over $X)

**Notification frequency:**
- Instant
- Daily digest
- Weekly summary

### Data & Privacy

**Export your data:**
1. Go to Settings > Data & Privacy
2. Click "Export All Data"
3. Choose format: JSON or CSV
4. Receive download link via email (within 24 hours)

**Delete your account:**
1. Settings > Data & Privacy
2. Click "Delete Account"
3. Confirm with password
4. ⚠️ All data permanently deleted (cannot be undone)

---

## Tips & Best Practices

### Getting the Most from Fin-Track

#### 1. Log Transactions Daily

**Why:** Prevents forgotten expenses and keeps data accurate

**How:**
- Set daily reminder (9 PM)
- Review receipts each evening
- Takes only 2-3 minutes

#### 2. Use Categories Consistently

**Why:** Better reports and insights

**How:**
- "Food & Dining" for ALL food (groceries + restaurants)
- "Transportation" for gas, parking, public transit
- Don't create too many categories (10-15 is ideal)

#### 3. Set Realistic Budgets

**Why:** Unrealistic budgets demotivate

**How:**
- Review last 3 months of spending
- Start with 10% reduction, not 50%
- Adjust monthly based on performance

**Example:**
```
Average groceries last 3 months: $450
First budget: $400 (12% reduction)
After 2 months: $350 if going well
```

#### 4. Upload Receipts for Big Purchases

**Why:** Proof for returns, warranties, and taxes

**How:**
- Any purchase over $50
- All tax-deductible expenses
- Electronics, appliances, major items

#### 5. Review Reports Monthly

**Why:** Spot trends and adjust behavior

**How:**
- First Sunday of each month
- Review all reports
- Adjust budgets if needed
- Celebrate wins!

#### 6. Use Tags for Seasonal Spending

**Why:** Understand holiday impacts

**Examples:**
- `#holiday-shopping` (December)
- `#back-to-school` (August)
- `#tax-prep` (April)
- `#vacation` (Summer)

#### 7. Link Goals to Accounts

**Why:** Automatic progress tracking

**How:**
- Create savings goal
- Link to dedicated savings account
- Balance updates automatically

### Common Mistakes to Avoid

❌ **Don't:**
- Log lump sums ("Spent $200 this week")
- Skip small transactions ("Only $5, doesn't matter")
- Create overly complex category systems
- Forget to renew budgets
- Ignore budget warnings

✅ **Do:**
- Log each transaction individually
- Track every expense, even $1
- Keep categories simple
- Set calendar reminders for budget renewals
- Adjust budgets when warnings occur

---

## FAQ

### General Questions

**Q: Is my financial data secure?**
A: Yes. We use bank-level encryption (256-bit SSL), and all data is stored in secure Firebase servers. We never share your data with third parties.

**Q: Can I access Fin-Track offline?**
A: Yes! Recent data is cached locally. Changes sync automatically when you reconnect to the internet.

**Q: Is there a mobile app?**
A: The web version works great on mobile browsers. Native iOS/Android apps are coming in Q3 2026.

**Q: How much does it cost?**
A: Currently free during beta. Pricing will be announced before official launch.

### Transactions

**Q: Can I import transactions from my bank?**
A: This feature is coming soon. Currently, transactions must be added manually.

**Q: What's the maximum transaction amount?**
A: €1,000,000 per transaction for security reasons.

**Q: Can I split a transaction across categories?**
A: Not yet. For now, choose the primary category or create separate transactions.

**Q: How do I handle refunds?**
A: Add as an income transaction with the original category. Example: If you return $50 groceries, add $50 income in "Food & Dining."

### Budgets

**Q: Can I have multiple budgets for the same category?**
A: Yes! For example: "Groceries - Weekly" ($100) and "Groceries - Monthly" ($400).

**Q: What happens when I exceed a budget?**
A: You receive a warning notification, but Fin-Track doesn't block transactions. It's a tracking tool, not enforcement.

**Q: Can I share budgets with family?**
A: Family sharing is planned for a future update. Currently, each user has separate budgets.

### Data & Sync

**Q: How often does data sync?**
A: Real-time! Changes appear instantly on all your devices.

**Q: What if I accidentally delete something?**
A: Currently, deletions are permanent. An "undo" feature is planned. For now, edit instead of delete when uncertain.

**Q: Can I export data for taxes?**
A: Yes! Go to Settings > Data & Privacy > Export Data. Download as CSV for Excel or your tax software.

---

## Troubleshooting

### Login Issues

**Problem:** "Invalid email or password"
**Solution:**
1. Check for typos (email is case-sensitive)
2. Click "Forgot Password" to reset
3. Check spam folder for reset email
4. Clear browser cache and try again

**Problem:** "Email not verified"
**Solution:**
1. Check inbox for verification email
2. Click verification link
3. If expired, request new verification email
4. Check spam/promotions folders

### Data Not Showing

**Problem:** Transactions not appearing
**Solution:**
1. Check internet connection
2. Refresh page (Ctrl+R or Cmd+R)
3. Sign out and sign back in
4. Clear browser cache
5. Try different browser

**Problem:** Reports showing "No data"
**Solution:**
1. Verify date range (not set to future)
2. Check that transactions exist in that period
3. Ensure category filter isn't too restrictive
4. Try changing to "All Categories"

### Upload Issues

**Problem:** Receipt upload fails
**Solution:**
1. Check file size (max 5MB)
2. Verify format (JPG, PNG, PDF only)
3. Check internet connection
4. Try compressing image
5. Use mobile browser for camera uploads

### Performance Issues

**Problem:** App loading slowly
**Solution:**
1. Close unnecessary browser tabs
2. Clear browser cache
3. Check internet speed
4. Disable browser extensions temporarily
5. Try incognito/private mode

**Problem:** Charts not rendering
**Solution:**
1. Update browser to latest version
2. Enable JavaScript
3. Disable ad blockers for Fin-Track
4. Try different browser

### Getting Help

**Can't find your answer?**

1. **Check documentation:**
   - [Technical Docs](docs/TECHNICAL.md) for developers
   - This User Guide for features

2. **Contact support:**
   - Email: support@fin-track.com
   - Response time: 24-48 hours

3. **Community:**
   - GitHub Discussions: Ask questions
   - Feature requests: Submit on GitHub Issues

4. **Emergency issues:**
   - Security concerns: security@fin-track.com
   - Data loss: contact support immediately

---

## Appendix

### Keyboard Shortcuts

Speed up your workflow:

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` / `Cmd+N` | New transaction |
| `Ctrl+B` / `Cmd+B` | New budget |
| `Ctrl+G` / `Cmd+G` | New goal |
| `Ctrl+F` / `Cmd+F` | Search transactions |
| `Ctrl+,` / `Cmd+,` | Open settings |
| `Esc` | Close dialog/modal |

### Supported Currencies

Over 150 currencies including:

- EUR (€) - Euro
- USD ($) - US Dollar
- GBP (£) - British Pound
- JPY (¥) - Japanese Yen
- CAD - Canadian Dollar
- AUD - Australian Dollar
- CHF - Swiss Franc
- CNY - Chinese Yuan
- INR - Indian Rupee
- BRL - Brazilian Real

### Category List

**Income:**
- Salary
- Freelance
- Investments
- Gifts
- Other Income

**Expenses:**
- Food & Dining
- Transportation
- Housing (Rent/Mortgage)
- Utilities
- Healthcare
- Entertainment
- Shopping
- Education
- Travel
- Subscriptions
- Insurance
- Personal Care
- Gifts & Donations
- Business Expenses
- Other

---

**Need more help?** Visit our [Support Center](https://fin-track.com/support) or email support@fin-track.com

**Stay updated:** Follow [@FinTrackApp](https://twitter.com/FinTrackApp) for tips and feature announcements

---

**Last Updated:** March 2026
**Version:** 2.5
**License:** Proprietary - All rights reserved
