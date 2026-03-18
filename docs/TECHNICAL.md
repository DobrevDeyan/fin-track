# Fin-Track Technical Documentation

**Version:** 2.5
**Last Updated:** March 2026
**Framework:** Next.js 14.2.35 (App Router)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Development Setup](#development-setup)
5. [Core Concepts](#core-concepts)
6. [Component Architecture](#component-architecture)
7. [State Management](#state-management)
8. [Firebase Integration](#firebase-integration)
9. [Testing Strategy](#testing-strategy)
10. [Build & Deployment](#build--deployment)
11. [Performance Optimizations](#performance-optimizations)
12. [Security Best Practices](#security-best-practices)
13. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

Fin-Track is a modern, full-stack personal finance tracking application built with Next.js 14 using the App Router pattern. The application follows a modular, component-based architecture with clear separation of concerns.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Next.js UI  │  │   Contexts   │  │   Hooks      │      │
│  │  Components  │←─│  (State Mgmt)│←─│  (Business   │      │
│  │  (shadcn/ui) │  │              │  │   Logic)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                     Firebase Services                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Firestore   │  │     Auth     │  │   Storage    │      │
│  │  (Database)  │  │ (User Mgmt)  │  │  (Receipts)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Component Composition** - Small, reusable components over large monoliths
2. **Separation of Concerns** - UI, business logic, and data access are separated
3. **Type Safety** - Strict TypeScript with comprehensive type definitions
4. **Performance First** - Code splitting, lazy loading, and virtualization
5. **Accessibility** - WCAG 2.1 AA compliance with ARIA attributes
6. **Security** - Environment variables, PII redaction, input validation

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14.2.35 (App Router, React 18)
- **Language:** TypeScript 5.4.5
- **Styling:** Tailwind CSS 3.4.4 + CSS Modules
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Charts:** Recharts 3.4.1
- **Icons:** Lucide React
- **Forms:** Native React with controlled components
- **Internationalization:** next-intl 4.8.2
- **Theming:** next-themes 0.3.0

### Backend & Services
- **Database:** Firebase Firestore (NoSQL)
- **Authentication:** Firebase Auth (Email/Password, Google OAuth)
- **Storage:** Firebase Storage (Receipt images)
- **Functions:** Firebase Cloud Functions
- **Analytics:** Firebase Analytics
- **Monitoring:** Sentry 10.42.0

### Development Tools
- **Testing:** Jest 29.7.0 + React Testing Library 14.3.1
- **Linting:** ESLint 8.57.1
- **Type Checking:** TypeScript compiler
- **Package Manager:** npm
- **Version Control:** Git

### Performance
- **Virtualization:** react-window 2.2.7 (100+ items)
- **PDF Generation:** jsPDF 2.5.1 + jspdf-autotable
- **Image Capture:** html2canvas 1.4.1
- **Code Splitting:** Next.js automatic
- **Caching:** Firebase offline persistence

---

## Project Structure

```
fin-track/
├── frontend/
│   ├── app/                          # Next.js App Router pages
│   │   ├── (app)/                   # Authenticated routes
│   │   │   ├── dashboard/           # Main dashboard
│   │   │   ├── reports/             # Financial reports
│   │   │   ├── calendar/            # Calendar view
│   │   │   └── settings/            # User settings
│   │   ├── auth/                    # Authentication pages
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Global styles
│   │
│   ├── components/                   # React components
│   │   ├── ui/                      # Base UI components (shadcn)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   └── dashboard/               # Feature components
│   │       ├── AddTransactionDialog.tsx
│   │       ├── TransactionsTable.tsx
│   │       ├── BudgetCard.tsx
│   │       └── ...
│   │
│   ├── contexts/                     # React Context providers
│   │   └── dashboard/
│   │       ├── EntriesContext.tsx   # ❌ Not used (hook pattern)
│   │       ├── BudgetsContext.tsx
│   │       ├── GoalsContext.tsx
│   │       ├── RecurringContext.tsx
│   │       ├── SavingsContext.tsx
│   │       └── DashboardProvider.tsx # Wrapper provider
│   │
│   ├── lib/                          # Core utilities & logic
│   │   ├── constants/               # Application constants
│   │   │   ├── category.constants.ts
│   │   │   ├── currency.constants.ts
│   │   │   ├── transaction.constants.ts
│   │   │   ├── ui.constants.ts
│   │   │   └── validation.constants.ts
│   │   ├── hooks/                   # Custom React hooks
│   │   │   └── dashboard/
│   │   │       ├── useEntries.ts    # Transaction CRUD
│   │   │       ├── useBudgets.ts
│   │   │       └── types.ts
│   │   ├── utils/                   # Helper functions
│   │   │   ├── logger.ts            # Structured logging
│   │   │   └── timestamp.ts         # Date conversions
│   │   ├── firebase.ts              # Firebase initialization
│   │   ├── firestore-*.ts           # Firestore operations
│   │   ├── date-utils.ts            # Date formatting
│   │   └── currency-utils.ts        # Currency formatting
│   │
│   ├── __tests__/                    # Test files
│   │   ├── components/
│   │   │   ├── AddTransactionDialog.test.tsx
│   │   │   ├── TransactionsTable.test.tsx
│   │   │   └── sections/
│   │   └── utils/
│   │       └── test-utils.tsx       # Testing utilities
│   │
│   ├── public/                       # Static assets
│   │   ├── icons/
│   │   ├── images/
│   │   └── manifest.json
│   │
│   ├── .env.local                    # Environment variables (gitignored)
│   ├── .env.local.example            # Template for env vars
│   ├── next.config.js                # Next.js configuration
│   ├── tailwind.config.ts            # Tailwind CSS config
│   ├── tsconfig.json                 # TypeScript config
│   └── package.json                  # Dependencies
│
├── docs/                             # Documentation
│   ├── TECHNICAL.md                 # This file
│   ├── USER_GUIDE.md                # User documentation
│   └── API.md                       # API reference
│
└── README.md                         # Project overview
```

---

## Development Setup

### Prerequisites

- **Node.js:** >= 18.0.0 (LTS recommended)
- **npm:** >= 9.0.0
- **Git:** Latest version
- **Firebase Account:** Free tier sufficient for development

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/fin-track.git
   cd fin-track/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your Firebase credentials:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Start development server**
   ```bash
   npm run dev
   # Server runs at http://localhost:3001
   ```

### Development Commands

```bash
# Development
npm run dev              # Start dev server (port 3001)
npm run dev:turbo        # Start with Turbopack (experimental)

# Build
npm run build            # Production build
npm start                # Start production server

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # Run ESLint
npx tsc --noEmit         # Type check without build
```

### Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project
   - Enable Google Analytics (optional)

2. **Enable Services**
   - **Authentication:** Email/Password, Google OAuth
   - **Firestore Database:** Start in test mode, then configure rules
   - **Storage:** Enable for receipt uploads
   - **Analytics:** Optional

3. **Configure Firestore Security Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can only access their own data
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

---

## Core Concepts

### 1. Transactions (Entries)

Financial transactions are the core entity in Fin-Track.

**Type Definition:**
```typescript
interface Entry {
  id: string
  userId: string
  description: string
  amount: number              // Always positive
  currency: string            // ISO 4217 (EUR, USD, etc.)
  category: string
  type: "income" | "expense" | "transfer"
  date: string               // ISO 8601
  notes?: string
  tags?: string[]
  receiptUrl?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**CRUD Operations:**
- Managed by `useEntries()` hook (NOT context)
- Firestore path: `users/{userId}/entries/{entryId}`
- Real-time sync with Firestore listeners

### 2. Budgets

Monthly/weekly spending limits per category.

**Type Definition:**
```typescript
interface Budget {
  id: string
  userId: string
  name: string
  category: string
  amount: number
  currency: string
  period: "weekly" | "monthly" | "yearly"
  startDate: string
  endDate: string
  isActive: boolean
  alertThreshold: number     // Percentage (0-100)
  createdAt: Timestamp
}
```

**Features:**
- Alert when spending exceeds threshold (e.g., 80%)
- Progress visualization with color coding
- Renewal functionality

### 3. Savings Goals

Long-term financial targets.

**Type Definition:**
```typescript
interface SavingsGoal {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  currency: string
  deadline: string
  category: string
  isCompleted: boolean
  createdAt: Timestamp
}
```

### 4. Recurring Transactions

Automated regular transactions.

**Type Definition:**
```typescript
interface RecurringTransaction {
  id: string
  userId: string
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  frequency: "daily" | "weekly" | "monthly" | "yearly"
  nextDate: string
  isActive: boolean
  createdAt: Timestamp
}
```

**Auto-generation:**
- Cloud Function triggers daily
- Creates entries on `nextDate`
- Updates `nextDate` based on frequency

---

## Component Architecture

### Pattern: CollapsibleSection Wrapper

All dashboard sections follow this pattern:

```tsx
// Structure
<CollapsibleSection title="Section Title" defaultOpen={true}>
  <SectionHeader />           // Add button, filters
  <SectionList />            // Card grid
  <SectionDialog />          // Add/Edit modal
</CollapsibleSection>

// Example: BudgetsSection
<BudgetsSection>
  <BudgetList>
    <BudgetCard />           // Individual budget
  </BudgetList>
  <BudgetDialog />           // Add/Edit
</BudgetsSection>
```

### Component Hierarchy

```
Dashboard
├── DashboardProvider (Context wrapper)
│   ├── EntriesSection (uses useEntries hook)
│   │   └── TransactionsTable
│   │       └── VirtualizedTransactionTable (100+ items)
│   ├── BudgetsSection (uses BudgetsContext)
│   │   ├── BudgetList
│   │   │   └── BudgetCard
│   │   └── BudgetDialog
│   ├── GoalsSection (uses GoalsContext)
│   ├── RecurringSection (uses RecurringContext)
│   └── SavingsSection (uses SavingsContext)
```

### Key Design Patterns

1. **Controlled Components**
   - All form inputs use `value` + `onChange`
   - State lifted to parent dialog component

2. **Optimistic Updates**
   - UI updates immediately
   - Firestore sync happens in background
   - Error states trigger rollback

3. **Compound Components**
   - Related components share state via composition
   - Example: `<Dialog>` + `<DialogContent>` + `<DialogFooter>`

4. **Render Props (Limited Use)**
   - Used sparingly for complex conditional rendering
   - Prefer composition over render props

---

## State Management

### Pattern Overview

| Feature | State Management | Why |
|---------|-----------------|-----|
| Entries (Transactions) | `useEntries()` hook | Simple CRUD, no cross-component sharing needed |
| Budgets | Context (`BudgetsContext`) | Shared across multiple components |
| Goals | Context (`GoalsContext`) | Shared state |
| Recurring | Context (`RecurringContext`) | Shared state |
| Savings | Context (`SavingsContext`) | Shared state |
| Auth | Context (`AuthContext`) | Global user state |

### Hook Pattern: useEntries()

**Why not Context?**
- Entries are only used in one section
- Avoids unnecessary re-renders
- Simpler mental model

**Usage:**
```typescript
const {
  entries,
  loading,
  addEntry,
  updateEntry,
  deleteEntry,
  error
} = useEntries()

// Add transaction
await addEntry({
  description: "Groceries",
  amount: 50,
  category: "Food & Dining",
  type: "expense",
  date: new Date().toISOString()
})
```

### Context Pattern: Budgets

**Why Context?**
- Budget data needed in multiple components
- Alert calculations shared across UI
- Spending totals computed once

**Usage:**
```typescript
// Provider wraps dashboard
<BudgetsProvider>
  <BudgetsSection />
</BudgetsProvider>

// Consumer hook
const {
  budgets,
  loading,
  openDialog,
  addBudget,
  updateBudget,
  deleteBudget
} = useBudgetsContext()
```

### Authentication State

```typescript
const { user, loading, signIn, signOut, signUp } = useAuth()

// Protected route pattern
if (loading) return <LoadingSpinner />
if (!user) {
  router.push('/auth/login')
  return null
}
```

---

## Firebase Integration

### Initialization (Modern API)

**File:** `lib/firebase.ts`

```typescript
// Modern offline persistence (Firebase v10+)
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore"

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
})
```

**Features:**
- ✅ Offline persistence with multi-tab sync
- ✅ Environment variable configuration
- ✅ Structured logging with PII redaction
- ✅ Lazy analytics loading (3s delay)

### Firestore Operations

**Pattern: Collection Queries**
```typescript
// Real-time listener
const entriesRef = collection(db, `users/${userId}/entries`)
const q = query(
  entriesRef,
  where("date", ">=", startDate),
  orderBy("date", "desc"),
  limit(100)
)

const unsubscribe = onSnapshot(q, (snapshot) => {
  const entries = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
  setEntries(entries)
})

// Cleanup
return () => unsubscribe()
```

**Pattern: CRUD Operations**
```typescript
// Create
await addDoc(collection(db, `users/${userId}/entries`), {
  ...entryData,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
})

// Update
await updateDoc(doc(db, `users/${userId}/entries/${entryId}`), {
  ...updates,
  updatedAt: serverTimestamp()
})

// Delete
await deleteDoc(doc(db, `users/${userId}/entries/${entryId}`))
```

### Security Rules (Production)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    function hasValidAmount() {
      return request.resource.data.amount is number
        && request.resource.data.amount > 0
        && request.resource.data.amount <= 1000000;
    }

    // User data
    match /users/{userId} {
      allow read, write: if isOwner(userId);

      // Entries
      match /entries/{entryId} {
        allow read: if isOwner(userId);
        allow create: if isOwner(userId) && hasValidAmount();
        allow update: if isOwner(userId) && hasValidAmount();
        allow delete: if isOwner(userId);
      }

      // Budgets, Goals, etc.
      match /{document=**} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```

---

## Testing Strategy

### Test Coverage

```
Total Tests: 122
Passing: 115 (94%)
Coverage: 75%+ on critical paths
```

### Testing Pyramid

```
        ┌─────────────┐
        │   E2E (0)   │  Future: Playwright
        ├─────────────┤
        │ Integration │  Component + Context
        │    (37)     │
        ├─────────────┤
        │    Unit     │  Utilities, hooks
        │    (85)     │
        └─────────────┘
```

### Unit Tests

**File:** `__tests__/components/AddTransactionDialog.test.tsx`

```typescript
describe('AddTransactionDialog', () => {
  it('validates zero amount', async () => {
    const user = userEvent.setup()
    render(<AddTransactionDialog {...props} />)

    await user.type(screen.getByLabelText(/amount/i), '0')
    await user.click(screen.getByRole('button', { name: /add/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/greater than 0/i)
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })
})
```

### Integration Tests

**File:** `__tests__/components/sections/BudgetsSection.test.tsx`

```typescript
// Mock context
jest.mock('@/contexts/dashboard/BudgetsContext', () => ({
  useBudgetsContext: () => ({
    budgets: mockBudgets,
    loading: false,
    addBudget: mockAdd
  })
}))

it('displays budgets from context', () => {
  render(<BudgetsSection />)
  expect(screen.getByText('Groceries Budget')).toBeInTheDocument()
})
```

### Test Utilities

**File:** `__tests__/utils/test-utils.tsx`

```typescript
// Custom render with providers
export function render(ui: React.ReactElement) {
  return rtlRender(
    <IntlProvider locale="en" messages={{}}>
      {ui}
    </IntlProvider>
  )
}
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
# Opens: coverage/lcov-report/index.html

# Single file
npm test AddTransactionDialog

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## Build & Deployment

### Production Build

```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# Output
├── .next/
│   ├── static/           # Static assets
│   ├── server/           # Server bundles
│   └── standalone/       # Standalone server (optional)
```

### Build Optimization

**Automatic by Next.js:**
- Code splitting per route
- Image optimization (Sharp)
- Font optimization (next/font)
- CSS minification
- Tree shaking

**Manual Optimizations:**
- Dynamic imports for heavy components
- Virtualization for long lists (100+ items)
- Lazy loading for analytics (3s delay)

### Environment Variables

**Required for build:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

**Build-time validation:**
- Next.js validates all `NEXT_PUBLIC_*` vars at build time
- Missing vars cause build failure

### Deployment Options

#### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Production
vercel --prod
```

**Automatic:**
- Push to `main` branch
- Vercel auto-deploys
- Preview deployments for PRs

#### Self-Hosted

```bash
# Build standalone
npm run build

# Start server
npm start
# Or use PM2, Docker, etc.
```

**Docker example:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY .next .next
COPY public public
CMD ["npm", "start"]
```

### Performance Monitoring

**Metrics tracked:**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s
- Cumulative Layout Shift (CLS): < 0.1

**Tools:**
- Lighthouse CI
- Sentry Performance Monitoring
- Firebase Analytics

---

## Performance Optimizations

### 1. Virtualization

**When:** 100+ transactions displayed

**Implementation:**
```typescript
// Automatic activation
const THRESHOLD = 100
const shouldVirtualize = transactions.length >= THRESHOLD

{shouldVirtualize ? (
  <VirtualizedTransactionTable transactions={transactions} />
) : (
  <TransactionsTable transactions={transactions} />
)}
```

**Library:** react-window `List` component

**Performance gain:** ~95% faster rendering for 1000+ items

### 2. Code Splitting

**Route-based (automatic):**
```typescript
// Each route in app/ is a separate chunk
app/
├── dashboard/page.tsx    → dashboard-chunk.js
├── reports/page.tsx      → reports-chunk.js
└── settings/page.tsx     → settings-chunk.js
```

**Component-based (manual):**
```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false  // Client-only
})
```

### 3. Image Optimization

```typescript
import Image from 'next/image'

<Image
  src="/receipts/image.jpg"
  width={400}
  height={300}
  alt="Receipt"
  loading="lazy"
  quality={75}  // Balance size/quality
/>
```

**Benefits:**
- WebP/AVIF format conversion
- Responsive sizes generated
- Lazy loading by default
- Automatic blur placeholder

### 4. Firestore Query Optimization

**Compound indexes:**
```javascript
// Firestore indexes
collection: users/{userId}/entries
fields: [date DESC, category ASC]
```

**Pagination:**
```typescript
// Limit results
const q = query(entriesRef, limit(50))

// Cursor-based pagination
const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]
const next = query(entriesRef, startAfter(lastVisible), limit(50))
```

### 5. Caching Strategy

**Firestore offline persistence:**
- Recent data cached locally
- Works offline automatically
- Sync when connection restored

**Next.js caching:**
```typescript
// Static generation
export const revalidate = 3600  // 1 hour

// Dynamic with cache
fetch(url, { next: { revalidate: 60 } })
```

---

## Security Best Practices

### 1. Input Validation

**Client-side:**
```typescript
const validateAmount = (value: string): boolean => {
  const num = parseFloat(value)

  if (isNaN(num)) return false
  if (num <= 0) return false
  if (num > MAX_AMOUNT) return false

  return true
}
```

**Server-side (Firestore Rules):**
```javascript
function hasValidAmount() {
  return request.resource.data.amount is number
    && request.resource.data.amount > 0
    && request.resource.data.amount <= 1000000;
}
```

### 2. PII Redaction

**Structured logger:**
```typescript
import { logger } from "@/lib/utils/logger"

// Automatically redacts:
// - Email addresses
// - Phone numbers
// - Credit card numbers
// - SSNs

logger.info("User action", {
  userId: "abc123",         // ✅ Allowed
  email: "user@example.com" // ❌ Auto-redacted
})
```

### 3. Environment Variables

**Never commit:**
- API keys
- Firebase credentials
- Secret tokens

**Use .env.local:**
```bash
# .gitignore
.env.local
.env*.local
```

**Validation:**
```typescript
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  throw new Error("Missing Firebase API key")
}
```

### 4. XSS Prevention

**React escapes by default:**
```tsx
// Safe - React escapes HTML
<div>{userInput}</div>

// Dangerous - bypass escaping
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // ❌ Avoid
```

**Sanitize if needed:**
```typescript
import DOMPurify from 'dompurify'

const clean = DOMPurify.sanitize(dirtyHTML)
```

### 5. CSRF Protection

**Next.js built-in:**
- SameSite cookies
- CORS headers
- Origin validation

**Firebase Security Rules:**
- User-scoped data access
- Server-side validation

---

## Troubleshooting

### Common Issues

#### 1. Firebase "Permission Denied"

**Symptom:** Firestore queries fail with permission denied

**Cause:** Security rules not configured or user not authenticated

**Fix:**
```javascript
// Firestore rules
match /users/{userId}/{document=**} {
  allow read, write: if request.auth.uid == userId;
}
```

Verify authentication:
```typescript
const { user } = useAuth()
console.log("Authenticated:", !!user)
```

#### 2. Environment Variables Not Loading

**Symptom:** `process.env.NEXT_PUBLIC_*` is undefined

**Cause:** Missing `.env.local` or incorrect naming

**Fix:**
1. Copy `.env.local.example` to `.env.local`
2. Ensure variables start with `NEXT_PUBLIC_`
3. Restart dev server after changes

```bash
# Restart required
npm run dev
```

#### 3. Build Errors - Type Mismatches

**Symptom:** TypeScript errors during build

**Cause:** Strict mode catches issues missed in dev

**Fix:**
```bash
# Check types without build
npx tsc --noEmit

# Fix and re-run
npm run build
```

#### 4. "Module not found" Errors

**Symptom:** Import errors for valid modules

**Cause:** Path aliases not configured or cache issues

**Fix:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

#### 5. Virtualized List Not Rendering

**Symptom:** react-window List shows blank

**Cause:** Missing height prop or incorrect rowHeight

**Fix:**
```typescript
<List
  height={600}        // Required: container height
  rowHeight={80}      // Required: row height
  rowCount={items.length}
  rowComponent={Row}
  rowProps={{ items }}
  style={{ width: "100%" }}
/>
```

### Debug Tools

**TypeScript Check:**
```bash
npx tsc --noEmit
```

**Build Analysis:**
```bash
npm run build
# Check .next/build-manifest.json for chunk sizes
```

**Firestore Debug:**
```typescript
import { logger } from "@/lib/utils/logger"

logger.firestore("Query", { collection: "entries", filters })
```

**React DevTools:**
- Profiler tab for performance
- Components tab for state inspection

---

## Contributing Guidelines

### Code Standards

1. **TypeScript:** Strict mode, no `any` without justification
2. **Formatting:** Prettier with 2-space indent
3. **Naming:**
   - Components: PascalCase
   - Files: kebab-case or PascalCase (components)
   - Functions: camelCase
4. **Comments:** JSDoc for public APIs, inline for complex logic

### Pull Request Process

1. Create feature branch: `feature/description` or `fix/description`
2. Write tests for new features
3. Run checks:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm test
   npm run build
   ```
4. Update documentation if needed
5. Submit PR with clear description

### Commit Messages

Follow Conventional Commits:

```
feat: add budget renewal functionality
fix: correct amount validation for zero values
docs: update technical documentation
test: add tests for TransactionsTable
refactor: extract timestamp conversion to utility
```

---

## Resources

### Documentation
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

### Tools
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Firebase Console](https://console.firebase.google.com)
- [Vercel Dashboard](https://vercel.com/dashboard)

### Support
- GitHub Issues: [Report bugs](https://github.com/yourusername/fin-track/issues)
- Discussions: [Ask questions](https://github.com/yourusername/fin-track/discussions)

---

**Last Updated:** March 2026
**Maintained By:** Development Team
**License:** MIT
