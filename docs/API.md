# Pocket — API & Component Reference

Quick reference for developers working with Pocket's APIs, hooks, components, and utilities.

**Last Updated:** April 2026

---

## Table of Contents

1. [ML Service HTTP API](#ml-service-http-api)
2. [Cloud Functions (Callable)](#cloud-functions-callable)
3. [Hooks](#hooks)
4. [Components](#components)
5. [Contexts](#contexts)
6. [Utilities](#utilities)
7. [Constants](#constants)
8. [Types](#types)
9. [Firestore Operations](#firestore-operations)

---

## ML Service HTTP API

Base URL (production): `https://ml-service-185936461123.europe-west1.run.app`

All endpoints except `/api/health` require `Authorization: Bearer <firebase-id-token>`.

### `GET /api/health`

Service health check. No auth required.

**Response:**
```json
{
  "status": "healthy",
  "environment": {
    "hasProjectId": true,
    "hasProcessorId": true,
    "authMode": "adc"
  }
}
```

---

### `POST /api/upload-bill`

Scan a receipt/bill via Google Document AI.

**Rate limit:** 10/day per user

**Request:** `multipart/form-data`
- `billFile` — image (JPEG, PNG, WebP, GIF) or PDF, max 10 MB
- `requestId` — unique request identifier
- `userId` — authenticated user ID

**Response:**
```json
{
  "success": true,
  "data": {
    "merchant": "Store Name",
    "amount": 42.50,
    "date": "2026-03-09",
    "items": [{ "description": "Item", "amount": 10.00 }],
    "rawText": "...",
    "confidence": 0.95
  }
}
```

---

### `POST /api/insights/digest`

Generate an AI monthly spending digest (Gemini 2.5 Flash).

**Rate limit:** 50/day per user

**Request:**
```json
{
  "context": {
    "currentMonth": {
      "income": 3000,
      "expenses": 2100,
      "expensesByCategory": { "Food & Dining": 450 }
    },
    "previousMonth": {
      "income": 3000,
      "expenses": 1800,
      "expensesByCategory": {}
    },
    "budgets": [],
    "currency": "EUR"
  }
}
```

**Response:**
```json
{
  "success": true,
  "digest": "Your spending increased by 17% this month..."
}
```

---

### `POST /api/insights/chat`

Multi-turn AI budget coaching (Gemini 2.5 Flash).

**Rate limit:** 50/day per user

**Request:**
```json
{
  "message": "How can I reduce my food spending?",
  "context": { /* same SpendingContext as digest */ },
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "response": "Based on your data, you spent..."
}
```

---

## Cloud Functions (Callable)

All callable functions use the Firebase SDK:

```typescript
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"

const fn = httpsCallable(functions, "functionName")
const result = await fn(payload)
```

Wrappers for household functions are in `frontend/lib/firestore-household.ts`.

### `createHousehold`

```typescript
await callCreateHousehold({ name: "Our Family" })
// Returns: { householdId: string }
```

### `sendHouseholdInvite`

```typescript
await callSendHouseholdInvite({ email: "partner@example.com" })
// Returns: { token: string, inviteLink: string }
```

Rate limited: 10 calls per 5 minutes.

### `acceptHouseholdInvite`

```typescript
await callAcceptHouseholdInvite({ token: "abc123" })
// Returns: { success: boolean }
```

### `getMyHousehold`

```typescript
const result = await callGetMyHousehold()
// Returns: { householdId: string | null, household: HouseholdDocument | null }
```

Uses Admin SDK — bypasses Firestore rules and cache. Backfills `memberUids` on the household document if missing.

### `getHouseholdEntries`

```typescript
const result = await callGetHouseholdEntries(householdId, { limit: 200 })
// Returns: { entries: HouseholdEntry[] }
```

### `leaveHousehold`

```typescript
await callLeaveHousehold()
// Returns: { success: boolean }
```

### `processMyRecurringTransactions`

```typescript
await callProcessMyRecurringTransactions()
// Returns: { processed: number }
```

Rate limited: 3 calls per 5 minutes.

---

## Hooks

### `useAuth()`

**Location:** `contexts/AuthContext.tsx`

```typescript
const {
  user,           // User | null
  loading,        // boolean
  signIn,         // (email, password) => Promise<void>
  signUp,         // (email, password) => Promise<void>
  signOut,        // () => Promise<void>
  resetPassword,  // (email) => Promise<void>
} = useAuth()
```

**Example:**
```typescript
const { user, loading } = useAuth()

if (loading) return <LoadingSpinner />
if (!user) {
  router.push('/auth/login')
  return null
}
```

---

### `useEntries()`

Transaction CRUD — not context-based, loaded per component.

**Location:** `lib/hooks/dashboard/useEntries.ts`

```typescript
const {
  entries,        // Entry[]
  loading,        // boolean
  error,          // Error | null
  addEntry,       // (entry: NewEntry) => Promise<void>
  updateEntry,    // (id, updates) => Promise<void>
  deleteEntry,    // (id) => Promise<void>
} = useEntries()
```

---

### `useBudgetsContext()`

**Location:** `contexts/dashboard/BudgetsContext.tsx`

```typescript
const {
  budgets,        // Budget[]
  loading,        // boolean
  openDialog,     // (budget?: Budget) => void
  closeDialog,    // () => void
  dialogOpen,     // boolean
  editingBudget,  // Budget | null
  addBudget,      // (budget: NewBudget) => Promise<void>
  updateBudget,   // (id, updates) => Promise<void>
  deleteBudget,   // (id) => Promise<void>
  renewBudget,    // (id, period) => Promise<void>
} = useBudgetsContext()
```

---

### `useGoalsContext()`

**Location:** `contexts/dashboard/GoalsContext.tsx`

```typescript
const {
  goals,           // SavingsGoal[]
  loading,         // boolean
  addGoal,         // (goal: NewGoal) => Promise<void>
  updateGoal,      // (id, updates) => Promise<void>
  deleteGoal,      // (id) => Promise<void>
  addContribution, // (id, amount) => Promise<void>
} = useGoalsContext()
```

---

### `useRecurringContext()`

**Location:** `contexts/dashboard/RecurringContext.tsx`

```typescript
const {
  recurring,       // RecurringTransaction[]
  loading,         // boolean
  addRecurring,    // (tx: NewRecurring) => Promise<void>
  updateRecurring, // (id, updates) => Promise<void>
  deleteRecurring, // (id) => Promise<void>
  toggleActive,    // (id, isActive) => Promise<void>
} = useRecurringContext()
```

---

### `useHousehold()`

**Location:** `contexts/HouseholdContext.tsx`

```typescript
const {
  household,               // HouseholdDocument | null
  householdId,             // string | null
  isHouseholdMode,         // boolean — true = showing family view
  setIsHouseholdMode,      // (v: boolean) => void
  householdEntries,        // HouseholdEntry[] — loaded when isHouseholdMode = true
  householdEntriesLoading, // boolean
  householdEntriesError,   // string | null
  refreshHouseholdEntries, // () => Promise<void>
  refreshHousehold,        // () => Promise<void> — re-calls getMyHousehold CF
  loading,                 // boolean — initial CF load
} = useHousehold()
```

---

### `useSubscription()`

**Location:** `lib/hooks/useSubscription.ts`

```typescript
const {
  tier,       // "free" | "pro" | "business"
  loading,    // boolean
  isActive,   // boolean
} = useSubscription()
```

---

## Components

### `AddTransactionDialog`

**Location:** `components/dashboard/AddTransactionDialog.tsx`

```typescript
interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (entry: NewEntry) => Promise<void>
  editingEntry: Entry | null
  savingsAccounts: SavingsAccount[]
  defaultDate?: string
}
```

Features: amount validation, receipt upload, tag management, edit vs create mode.

---

### `TransactionsTable`

**Location:** `components/dashboard/TransactionsTable.tsx`

```typescript
interface TransactionsTableProps {
  transactions: Entry[]
  onAdd: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onViewReceipt?: (url: string) => void
  useVirtualization?: boolean  // Auto-enabled for 100+ items
}
```

Switches to `VirtualizedTransactionTable` (react-window) automatically for 100+ entries.

---

### `BudgetCard`

**Location:** `components/dashboard/BudgetCard.tsx`

```typescript
interface BudgetCardProps {
  budget: Budget
  spent: number
  onEdit: (budget: Budget) => void
  onDelete: (id: string) => void
  onRenew: (id: string, period: Period) => Promise<void>
}
```

---

### `CollapsibleSection`

**Location:** `components/dashboard/CollapsibleSection.tsx`

```tsx
<CollapsibleSection title="Budgets" defaultOpen={true} icon={<DollarSign />}>
  <BudgetList />
</CollapsibleSection>
```

---

### shadcn/ui Components

All available: `accordion`, `avatar`, `badge`, `button`, `card`, `checkbox`, `collapsible-section`, `dialog`, `dropdown-menu`, `input`, `label`, `progress`, `select`, `sheet`, `skeleton`, `popover`, `table`, `tabs`, `textarea`, `toast`

```tsx
// Button
<Button variant="default" size="lg">Save</Button>
<Button variant="destructive" size="sm">Delete</Button>
<Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>

// Dialog
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Transaction</DialogTitle>
    </DialogHeader>
    {/* content */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleSubmit}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

All Sheets use `[&>button]:hidden` to suppress the default close button.

---

## Contexts

### `DashboardProvider`

**Location:** `contexts/dashboard/DashboardProvider.tsx`

Wraps all dashboard contexts (Budgets, Goals, Recurring, Savings). Entries use the `useEntries()` hook directly.

```tsx
export default function DashboardPage() {
  return (
    <DashboardProvider>
      <Dashboard />
    </DashboardProvider>
  )
}
```

---

## Utilities

### `formatCurrency()`

**Location:** `lib/currency-utils.ts`

```typescript
formatCurrency(1234.56, { currency: "EUR" })           // "€1,234.56"
formatCurrency(1234.56, { currency: "USD" })            // "$1,234.56"
formatCurrency(1234, { currency: "JPY", maximumFractionDigits: 0 }) // "¥1,234"
```

---

### `formatDateCompact()`

**Location:** `lib/date-utils.ts`

```typescript
formatDateCompact("2026-04-15T10:30:00Z")  // "Apr 15, 2026"
```

---

### `toISOString()`

Convert Firebase Timestamp (or Date/string/number) to ISO string.

**Location:** `lib/utils/timestamp.ts`

```typescript
toISOString(firestoreTimestamp)  // "2026-03-18T10:30:00.000Z"
toISOString(null)                // null
```

---

### `logger`

Structured logger with automatic PII redaction (emails, phone numbers, card numbers).

**Location:** `lib/utils/logger.ts`

```typescript
logger.info("User logged in", { userId: user.uid })
logger.error("Failed to fetch data", { error: error.message, collection: "entries" })
logger.firestore("Query", { collection: "entries" })
logger.api("/api/upload-bill", "POST", { status: 200, duration: 123 })
```

PII fields are redacted in production: `{ email: "[REDACTED:EMAIL]" }`

---

## Constants

**Location:** `lib/constants/`

```typescript
// Categories
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryColor } from "@/lib/constants/category.constants"

// Currencies
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/constants/currency.constants"

// Validation
import { AMOUNT_RULES, VALIDATION_MESSAGES } from "@/lib/constants/validation.constants"
// AMOUNT_RULES: { MIN: 0.01, MAX: 1000000, STEP: 0.01 }

// Subscription tiers
import { SUBSCRIPTION_TIERS } from "@/lib/constants/subscription.constants"
```

---

## Types

**Location:** `lib/firestore-types.ts`

```typescript
interface EntryDocument {
  userId: string
  type: "income" | "expense"
  amount: number
  category: string
  date: Timestamp
  description: string
  tags?: string[]
  notes?: string
  receiptUrl?: string
  recurring?: boolean
}

interface Budget {
  id: string
  userId: string
  name: string
  category: string
  amount: number
  currency: string
  period: "weekly" | "monthly" | "yearly"
  startDate: string   // ISO date
  endDate: string     // ISO date
  isActive: boolean
  alertThreshold: number  // 0–100
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface SavingsGoal {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  currency: string
  deadline: string
  isCompleted: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface RecurringTransaction {
  id: string
  userId: string
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  frequency: "daily" | "weekly" | "monthly" | "yearly"
  nextDate: Timestamp
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface HouseholdDocument {
  name: string
  ownerUid: string
  members: HouseholdMember[]
  memberUids: string[]   // flat UID list for Firestore rule checks
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface HouseholdMember {
  uid: string
  email: string
  displayName: string
  joinedAt: Timestamp
}
```

---

## Firestore Operations

Collections are **flat** — not subcollections. Each document has a `userId` field.

```typescript
// ✅ Correct — flat collection with userId filter
const q = query(
  collection(db, "entries"),
  where("userId", "==", userId),
  where("date", ">=", startTimestamp),
  orderBy("date", "desc"),
  limit(100)
)

// ❌ Wrong — entries are NOT subcollections of users
// collection(db, `users/${userId}/entries`)
```

### Common Patterns

**Query entries:**
```typescript
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

const q = query(
  collection(db, "entries"),
  where("userId", "==", userId),
  orderBy("date", "desc"),
  limit(100)
)
const snap = await getDocs(q)
const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as EntryDocument))
```

**Batch write (entry + summary update):**
```typescript
const batch = writeBatch(db)
batch.set(entryRef, entryData)
batch.update(summaryRef, {
  totalExpenses: increment(amount),
  [`months.${yyyyMM}.expenses`]: increment(amount),
  [`months.${yyyyMM}.expensesByCategory.${category}`]: increment(amount),
})
await batch.commit()
```

**Real-time listener:**
```typescript
const unsubscribe = onSnapshot(
  query(collection(db, "budgets"), where("userId", "==", userId)),
  (snap) => setBudgets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Budget)))
)
return () => unsubscribe()
```
