# Feature Implementation Roadmap

**Based on Competitive Analysis - Updated March 4, 2026**

---

## Current App Status: **95% Complete**

| Category | Status | Completion |
|----------|--------|------------|
| Core Features | Fully Implemented | 100% |
| Financial Features | Fully Implemented | 100% |
| Technical Features | Strong | 90% |
| UI/UX | Excellent | 95% |
| Analytics/Reporting | Good | 85% |
| AI/ML | **Fully Implemented** | **100%** |
| Advanced Features | Started | 25% |

---

## Completed Features

### Core Features
- [x] **Authentication** - Email/Password + Google OAuth
- [x] **Manual Expense/Income Entry** - Full CRUD with filtering
- [x] **Categories** - Default + Custom categories, smart detection
- [x] **Dashboard** - Metrics, charts, category breakdown
- [x] **Transaction History** - Filtering, sorting, search, export

### Financial Features
- [x] **Budgets** - Weekly/Monthly/Yearly with alerts
- [x] **Financial Goals** - Target tracking with progress
- [x] **Savings Accounts** - Multiple accounts with deposits/withdrawals
- [x] **Recurring Transactions** - Full UI + Cloud Function auto-creation
- [x] **Reports** - PDF/CSV export, custom date ranges

### Technical Features
- [x] **PWA Support** - Installable, manifest configured
- [x] **Offline Support** - Service worker, caching
- [x] **Cloud Functions** - Recurring transaction processor (daily 1 AM UTC)
- [x] **Dark Mode** - Full theme support
- [x] **Multi-Currency** - EUR/USD with extensible architecture
- [x] **Push Notifications** - Salary reminders implemented
- [x] **GCP Infrastructure** - Cloud Run, Document AI, IAM reviewed and cleaned up
- [x] **Mobile UX** - Swipe-to-close Sheet gestures, stacked FABs, responsive layout
- [x] **i18n** - Internationalization via next-intl

### AI/ML Features ✅ (Completed March 2026)
- [x] **Smart Category Detection** - 100+ merchant keywords
- [x] **Receipt Scanner** - Google Document AI (Expense Parser `566b35e21d475435`, `eu` region)
- [x] **ML Service API** - Express server on Cloud Run (`europe-west1`), with `/api/insights/digest` + `/api/insights/chat`
- [x] **Financial Health Score** - Algorithmic 0-100 score (SVG ring card + popover breakdown with 5 sub-scores)
- [x] **Spending Anomaly Detector** - Z-score based category spike detection, dismissible banner
- [x] **Cash Flow Forecast** - 90-day Recharts AreaChart projection from recurring transactions
- [x] **AI Monthly Digest** - Gemini 2.5 Flash narrative, cached in Firestore `aiInsights/{userId}` per month
- [x] **AI Budget Coach Chat** - Floating drawer, multi-turn chat grounded in aggregated financial data

---

## In Progress / Remaining

### Near-term

| Feature | Status | Notes |
|---------|--------|-------|
| Receipt Gallery & Management | 70% complete | Backend done, camera done; gallery page not built |
| Transaction Tags UI | Schema ready | Tag input + filter not built |
| Year-over-Year Analytics | Schema ready | Comparison charts not built |

### Medium-term

| Feature | Priority | Effort |
|---------|----------|--------|
| Net Worth Tracking | High | 3-5 days |
| Calendar View | Medium | 1 week |
| Bill Tracking & Reminders | Medium | 1 week |

---

## Detailed Feature Specifications

### Receipt Management (70% Complete)

**Completed:**
- [x] ML Service with Google Document AI
- [x] Receipt OCR extraction (merchant, amount, date, items)
- [x] Camera capture component with front/back switching
- [x] File upload validation (images, PDFs up to 10MB)
- [x] Confidence scoring for extracted data

**Remaining:**
- [ ] Receipt gallery page
- [ ] Filter receipts by date/category
- [ ] Link receipts to transactions in UI
- [ ] Receipt thumbnail in transaction list

**Technical Details:**
```
ML Service: /ml-service/src/api-server.ts (port 8000 local, 8080 on Cloud Run)
Cloud Run URL: https://ml-service-185936461123.europe-west1.run.app
Document AI Processor: expense_parser (566b35e21d475435, eu region)
Frontend: /frontend/components/receipt/ReceiptScanner.tsx
Storage: Firebase Storage receipts/{userId}/{transactionId}/
```

---

### Transaction Tags

**Status**: Schema ready, UI needed
**Effort**: 2-3 days
**Impact**: Medium

**Implementation:**
- [ ] Add tags field to transaction form (multi-select)
- [ ] Tag autocomplete/input component
- [ ] Display tags in transaction table (badges)
- [ ] Filter transactions by tags
- [ ] Tag-based reports

---

### Net Worth Tracking

**Status**: Not started
**Effort**: 3-5 days
**Impact**: High

**Implementation:**
- [ ] New collection: `assets`
- [ ] Asset types: Bank Account, Investment, Property, Vehicle, Other
- [ ] Asset CRUD operations
- [ ] Calculate net worth = Total Assets - Total Liabilities
- [ ] Display on dashboard
- [ ] Track net worth over time (chart)

**Schema:**
```typescript
{
  userId: string
  name: string
  type: "bank" | "investment" | "property" | "vehicle" | "other"
  value: number
  currency: string
  isLiability: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

### Calendar View

**Status**: Not started
**Effort**: 1 week
**Impact**: High UX improvement

**Implementation:**
- [ ] Install calendar library (react-big-calendar or fullcalendar)
- [ ] Display transactions on calendar
- [ ] Show recurring transactions on future dates
- [ ] Click date to add transaction
- [ ] Color-code by type (income/expense)
- [ ] Month/Week/Day views

---

### Bill Tracking & Reminders

**Status**: Not started
**Effort**: 1 week
**Impact**: High

**Implementation:**
- [ ] New collection: `bills`
- [ ] Bill CRUD operations
- [ ] Due date tracking
- [ ] Upcoming bills widget on dashboard
- [ ] Push notifications for due dates
- [ ] Mark as paid (links to transaction)

**Schema:**
```typescript
{
  userId: string
  name: string
  amount: number
  dueDate: Timestamp
  frequency: "monthly" | "weekly" | "yearly" | "one-time"
  category: string
  isPaid: boolean
  paidDate?: Timestamp
  linkedTransactionId?: string
  reminderDaysBefore: number
}
```

---

### Enhanced Analytics

**Status**: Partially implemented
**Effort**: 1-2 weeks
**Impact**: Medium-High

**Current:**
- [x] Basic reports with date ranges
- [x] Category breakdown charts
- [x] Monthly trends
- [x] PDF/CSV export

**To Add:**
- [ ] Year-over-Year comparison
- [ ] Spending forecasting
- [ ] Sankey diagram (money flow)
- [ ] Custom report builder

---

### Basic Investment Tracking

**Status**: Not started
**Effort**: 2-3 weeks
**Impact**: Very High

**Phase 1: Manual Tracking**
- [ ] Investment account management
- [ ] Manual portfolio value entry
- [ ] Track performance over time
- [ ] Asset allocation pie chart
- [ ] Link to net worth

**Schema:**
```typescript
{
  userId: string
  accountName: string
  type: "brokerage" | "retirement" | "crypto" | "other"
  holdings: [{
    name: string
    symbol?: string
    quantity: number
    purchasePrice: number
    currentPrice: number
  }]
  totalValue: number
  currency: string
  updatedAt: Timestamp
}
```

**Note**: Manual entry only (privacy-first approach)

---

### AI Insights (Completed March 2026)

**Status**: Fully implemented
**Model**: Gemini 2.5 Flash (free tier, `@google/generative-ai` SDK)

**Files:**
- `frontend/lib/insights-engine.ts` — Pure algorithmic functions (zero API calls)
- `frontend/lib/firestore-insights.ts` — Firestore cache for AI digest (`aiInsights/{userId}`)
- `frontend/lib/insights-api.ts` — ML service HTTP calls
- `frontend/contexts/dashboard/InsightsContext.tsx` — Context wrapping all 5 features
- `ml-service/src/gemini-handler.ts` — Gemini 2.5 Flash integration
- `ml-service/src/insights-routes.ts` — POST `/api/insights/digest` + `/api/insights/chat`

**Gemini Notes:**
- Use model `gemini-2.5-flash` — `gemini-1.5-flash` is 404 on new projects, `gemini-2.0-flash` has 0 free quota
- API key stored in `ml-service/.env` and `ml-service/deploy.sh`
- Use `--update-env-vars` on Cloud Run (not `--set-env-vars`) to avoid wiping other vars

---

## Implementation Timeline (Revised)

### Q1 2026 (Jan-Mar) ✅
- [x] Financial Health Score (algorithmic)
- [x] Spending Anomaly Detection (Z-score)
- [x] Cash Flow Forecast (90-day, Recharts)
- [x] AI Monthly Digest (Gemini 2.5 Flash, Firestore cached)
- [x] AI Budget Coach Chat (Gemini 2.5 Flash, floating Sheet drawer)
- [x] Mobile UX: swipe gestures, FAB stacking, Sheet close button fixes

### Q2 2026 (Apr-Jun)
- [ ] Receipt gallery & management UI
- [ ] Net worth tracking
- [ ] Transaction tags UI
- [ ] Bill tracking & reminders
- [ ] Year-over-Year analytics

### Q3 2026 (Jul-Sep)
- [ ] Calendar view
- [ ] Basic investment tracking
- [ ] Custom report builder
- [ ] Enhanced AI recommendations

---

## Tech Stack

**Frontend:**
- Next.js 14.2.5 (React 18, TypeScript)
- Tailwind CSS + shadcn/ui
- Recharts (visualization)
- jsPDF (PDF export)

**Backend:**
- Firebase (Auth, Firestore, Storage, Hosting)
- Cloud Functions (Node.js 20)
- Google Document AI

**Current Version:** 3.0

---

## Notes

### Privacy-First Approach
- All features support manual entry
- No automatic bank syncing
- User controls all data
- Export capability for all features

### PWA Compatibility
- All features work offline
- Service worker caching
- IndexedDB for offline storage
- Sync when online

### International Support
- Multi-currency (EUR, USD, extensible)
- Timezone handling
- Locale-aware formatting

---

**Document Version**: 3.0
**Last Updated**: March 4, 2026
**Next Review**: Monthly
