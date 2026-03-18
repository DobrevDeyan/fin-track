# Fin-Track API & Component Reference

Quick reference for developers working with Fin-Track components, hooks, and utilities.

**Version:** 2.5
**Last Updated:** March 2026

---

## Table of Contents

1. [Hooks](#hooks)
2. [Components](#components)
3. [Contexts](#contexts)
4. [Utilities](#utilities)
5. [Constants](#constants)
6. [Types](#types)
7. [Firestore Operations](#firestore-operations)

---

## Hooks

### useAuth()

Authentication state and operations.

**Location:** `lib/hooks/useAuth.ts`

```typescript
const {
  user,           // User | null
  loading,        // boolean
  signIn,         // (email: string, password: string) => Promise<void>
  signUp,         // (email: string, password: string) => Promise<void>
  signOut,        // () => Promise<void>
  resetPassword,  // (email: string) => Promise<void>
} = useAuth()
```

**Example:**
```typescript
function ProtectedPage() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user) {
    router.push('/auth/login')
    return null
  }

  return <Dashboard />
}
```

---

### useEntries()

Transaction CRUD operations (NOT context-based).

**Location:** `lib/hooks/dashboard/useEntries.ts`

```typescript
const {
  entries,        // Entry[]
  loading,        // boolean
  error,          // Error | null
  addEntry,       // (entry: NewEntry) => Promise<void>
  updateEntry,    // (id: string, updates: Partial<Entry>) => Promise<void>
  deleteEntry,    // (id: string) => Promise<void>
} = useEntries()
```

**Types:**
```typescript
interface Entry {
  id: string
  userId: string
  description: string
  amount: number
  currency: string
  category: string
  type: "income" | "expense" | "transfer"
  date: string              // ISO 8601
  notes?: string
  tags?: string[]
  receiptUrl?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

type NewEntry = Omit<Entry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
```

**Example:**
```typescript
const { entries, addEntry } = useEntries()

const handleAdd = async () => {
  await addEntry({
    description: "Groceries",
    amount: 50.00,
    currency: "EUR",
    category: "Food & Dining",
    type: "expense",
    date: new Date().toISOString()
  })
}
```

---

### useBudgetsContext()

Budget state and operations (context-based).

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
  updateBudget,   // (id: string, updates: Partial<Budget>) => Promise<void>
  deleteBudget,   // (id: string) => Promise<void>
  renewBudget,    // (id: string, period: Period) => Promise<void>
} = useBudgetsContext()
```

**Types:**
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
  alertThreshold: number    // 0-100
  createdAt: Timestamp
}
```

**Example:**
```typescript
const { budgets, addBudget } = useBudgetsContext()

const handleCreate = async () => {
  await addBudget({
    name: "Groceries Budget",
    category: "Food & Dining",
    amount: 400,
    currency: "EUR",
    period: "monthly",
    startDate: "2026-04-01",
    endDate: "2026-04-30",
    alertThreshold: 80
  })
}
```

---

### useGoalsContext()

Savings goals state and operations.

**Location:** `contexts/dashboard/GoalsContext.tsx`

```typescript
const {
  goals,          // SavingsGoal[]
  loading,        // boolean
  addGoal,        // (goal: NewGoal) => Promise<void>
  updateGoal,     // (id: string, updates: Partial<SavingsGoal>) => Promise<void>
  deleteGoal,     // (id: string) => Promise<void>
  addContribution,// (id: string, amount: number) => Promise<void>
} = useGoalsContext()
```

---

### useRecurringContext()

Recurring transactions state and operations.

**Location:** `contexts/dashboard/RecurringContext.tsx`

```typescript
const {
  recurring,      // RecurringTransaction[]
  loading,        // boolean
  addRecurring,   // (transaction: NewRecurring) => Promise<void>
  updateRecurring,// (id: string, updates: Partial<RecurringTransaction>) => Promise<void>
  deleteRecurring,// (id: string) => Promise<void>
  toggleActive,   // (id: string, isActive: boolean) => Promise<void>
} = useRecurringContext()
```

---

## Components

### AddTransactionDialog

Modal for adding/editing transactions.

**Location:** `components/dashboard/AddTransactionDialog.tsx`

**Props:**
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

**Usage:**
```tsx
<AddTransactionDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  onSubmit={handleSubmit}
  editingEntry={selectedEntry}
  savingsAccounts={accounts}
/>
```

**Features:**
- ✅ Amount validation (no zero, negative, or invalid)
- ✅ Real-time error feedback with accessibility
- ✅ Receipt upload
- ✅ Tag management
- ✅ Edit mode vs. Create mode

---

### TransactionsTable

Display list of transactions with actions.

**Location:** `components/dashboard/TransactionsTable.tsx`

**Props:**
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

**Usage:**
```tsx
<TransactionsTable
  transactions={entries}
  onAdd={openAddDialog}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

**Features:**
- Pagination (2 items initially, expandable)
- Delete confirmation dialog
- Receipt preview
- Automatic virtualization for 100+ items
- Empty state with CTA

---

### VirtualizedTransactionTable

High-performance list for 100+ transactions using react-window.

**Location:** `components/dashboard/VirtualizedTransactionTable.tsx`

**Props:**
```typescript
interface VirtualizedTransactionTableProps {
  transactions: Entry[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onViewReceipt?: (url: string) => void
  height?: number          // Default: 600px
  itemSize?: number        // Default: 80px per row
}
```

**Usage:**
```tsx
<VirtualizedTransactionTable
  transactions={largeList}
  onEdit={handleEdit}
  onDelete={handleDelete}
  height={800}
  itemSize={100}
/>
```

**Performance:**
- Only renders visible rows
- ~95% faster than regular table for 1000+ items
- Smooth scrolling

---

### BudgetCard

Display single budget with progress bar.

**Location:** `components/dashboard/BudgetCard.tsx`

**Props:**
```typescript
interface BudgetCardProps {
  budget: Budget
  spent: number
  onEdit: (budget: Budget) => void
  onDelete: (id: string) => void
  onRenew: (id: string, period: Period) => Promise<void>
}
```

**Usage:**
```tsx
<BudgetCard
  budget={budget}
  spent={320}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onRenew={handleRenew}
/>
```

**Features:**
- Color-coded progress bar
- Status indicators (under, warning, over)
- Remaining amount calculation
- Renew button

---

### CollapsibleSection

Wrapper for dashboard sections.

**Location:** `components/dashboard/CollapsibleSection.tsx`

**Props:**
```typescript
interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  icon?: React.ReactNode
}
```

**Usage:**
```tsx
<CollapsibleSection title="Budgets" defaultOpen={true} icon={<DollarSign />}>
  <BudgetList />
</CollapsibleSection>
```

---

### UI Components (shadcn/ui)

#### Button

**Location:** `components/ui/button.tsx`

**Variants:**
- `default` - Primary action
- `destructive` - Delete, remove actions
- `outline` - Secondary action
- `ghost` - Minimal, icon buttons
- `link` - Text link style

**Sizes:**
- `default` - Standard size
- `sm` - Small
- `lg` - Large
- `icon` - Square icon button

**Example:**
```tsx
<Button variant="default" size="lg" onClick={handleClick}>
  Save Changes
</Button>

<Button variant="destructive" size="sm">
  Delete
</Button>

<Button variant="ghost" size="icon">
  <Edit className="h-4 w-4" />
</Button>
```

#### Dialog

**Location:** `components/ui/dialog.tsx`

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Transaction</DialogTitle>
      <DialogDescription>
        Enter transaction details below.
      </DialogDescription>
    </DialogHeader>

    {/* Form content */}

    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSubmit}>
        Save
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Input

**Location:** `components/ui/input.tsx`

```tsx
<Input
  type="number"
  placeholder="0.00"
  value={amount}
  onChange={(e) => setAmount(e.target.value)}
  min="0.01"
  step="0.01"
  required
  aria-invalid={!!error}
  aria-describedby={error ? "amount-error" : undefined}
/>
{error && (
  <p id="amount-error" className="text-sm text-destructive" role="alert">
    {error}
  </p>
)}
```

---

## Contexts

### DashboardProvider

Wraps all dashboard contexts.

**Location:** `contexts/dashboard/DashboardProvider.tsx`

**Usage:**
```tsx
// app/(app)/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <DashboardProvider>
      <Dashboard />
    </DashboardProvider>
  )
}
```

**Provides:**
- BudgetsContext
- GoalsContext
- RecurringContext
- SavingsContext

**Note:** EntriesContext is NOT included (uses hook pattern instead).

---

## Utilities

### formatCurrency()

Format number as currency with locale support.

**Location:** `lib/currency-utils.ts`

```typescript
formatCurrency(
  amount: number,
  options?: CurrencyFormatOptions
): string

interface CurrencyFormatOptions {
  currency?: string          // Default: "EUR"
  locale?: string            // Default: "en-US"
  minimumFractionDigits?: number  // Default: 2
  maximumFractionDigits?: number  // Default: 2
}
```

**Examples:**
```typescript
formatCurrency(1234.56, { currency: "EUR" })
// "€1,234.56"

formatCurrency(1234.56, { currency: "USD", locale: "en-US" })
// "$1,234.56"

formatCurrency(1234, { currency: "JPY", maximumFractionDigits: 0 })
// "¥1,234"
```

---

### formatDateCompact()

Format date for display.

**Location:** `lib/date-utils.ts`

```typescript
formatDateCompact(date: string | Date): string
```

**Examples:**
```typescript
formatDateCompact("2026-04-15T10:30:00Z")
// "Apr 15, 2026"

formatDateCompact(new Date())
// "Mar 18, 2026"
```

---

### toISOString()

Convert Firebase Timestamp to ISO string.

**Location:** `lib/utils/timestamp.ts`

```typescript
toISOString(
  value: Timestamp | string | Date | number | null | undefined
): string | null
```

**Examples:**
```typescript
// Firebase Timestamp
toISOString(firestoreTimestamp)
// "2026-03-18T10:30:00.000Z"

// Already string
toISOString("2026-03-18T10:30:00Z")
// "2026-03-18T10:30:00Z"

// Date object
toISOString(new Date())
// "2026-03-18T10:30:00.000Z"

// Null/undefined
toISOString(null)
// null
```

**Use case:** Converting Firestore timestamps before display.

---

### logger

Structured logging with PII redaction.

**Location:** `lib/utils/logger.ts`

```typescript
logger.info(message: string, context?: LogContext)
logger.error(message: string, context?: LogContext)
logger.warn(message: string, context?: LogContext)
logger.debug(message: string, context?: LogContext)

// Specialized
logger.firestore(action: string, details?: object)
logger.api(endpoint: string, method: string, details?: object)
```

**Examples:**
```typescript
// Basic logging
logger.info("User logged in", { userId: user.uid })

// Error logging
logger.error("Failed to fetch data", {
  error: error.message,
  collection: "entries"
})

// Firestore operations
logger.firestore("Query", {
  collection: "entries",
  filters: { date: ">= 2026-01-01" }
})

// API calls
logger.api("/api/transactions", "POST", {
  status: 200,
  duration: 123
})
```

**PII Redaction:**
Automatically redacts:
- Email addresses
- Phone numbers
- Credit card numbers
- Social Security Numbers

```typescript
logger.info("User action", {
  email: "user@example.com"  // Redacted in production
})
// Output: { email: "[REDACTED:EMAIL]" }
```

---

## Constants

### Categories

**Location:** `lib/constants/category.constants.ts`

```typescript
export const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Housing",
  "Utilities",
  // ... more
] as const

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investments",
  // ... more
] as const

// Get color for category badge
export function getCategoryColor(category: string): string {
  // Returns Tailwind classes
  // Example: "bg-green-100 text-green-800"
}
```

---

### Currencies

**Location:** `lib/constants/currency.constants.ts`

```typescript
export const CURRENCIES = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  // ... 150+ more
] as const

export const DEFAULT_CURRENCY = "EUR"
```

---

### Validation

**Location:** `lib/constants/validation.constants.ts`

```typescript
export const AMOUNT_RULES = {
  MIN: 0.01,
  MAX: 1000000,
  STEP: 0.01
} as const

export const VALIDATION_MESSAGES = {
  AMOUNT_REQUIRED: "Amount is required",
  AMOUNT_INVALID: "Amount must be a valid number",
  AMOUNT_TOO_SMALL: "Amount must be greater than 0",
  AMOUNT_TOO_LARGE: (max: number) => `Amount cannot exceed ${max}`,
  // ... more
} as const
```

---

### Transaction

**Location:** `lib/constants/transaction.constants.ts`

```typescript
export const TRANSACTION_TYPES = [
  "income",
  "expense",
  "transfer"
] as const

export type TransactionType = typeof TRANSACTION_TYPES[number]

// Get color for transaction type
export function getTransactionTypeColor(type: TransactionType): string {
  // Returns Tailwind classes
  // income: "text-green-600"
  // expense: "text-red-600"
  // transfer: "text-blue-600"
}
```

---

## Types

### Core Types

**Location:** `lib/firestore-types.ts`

```typescript
import { Timestamp } from "firebase/firestore"

export interface Entry {
  id: string
  userId: string
  description: string
  amount: number
  currency: string
  category: string
  type: "income" | "expense" | "transfer"
  date: string
  notes?: string
  tags?: string[]
  receiptUrl?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Budget {
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
  alertThreshold: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface SavingsGoal {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  currency: string
  deadline: string
  category?: string
  isCompleted: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface RecurringTransaction {
  id: string
  userId: string
  description: string
  amount: number
  currency: string
  category: string
  type: "income" | "expense"
  frequency: "daily" | "weekly" | "monthly" | "yearly"
  nextDate: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface SavingsAccount {
  id: string
  userId: string
  name: string
  balance: number
  currency: string
  type: "savings" | "checking" | "investment"
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## Firestore Operations

### Collection Paths

```typescript
// User data structure
users/
├── {userId}/
│   ├── entries/
│   │   └── {entryId}
│   ├── budgets/
│   │   └── {budgetId}
│   ├── goals/
│   │   └── {goalId}
│   ├── recurring/
│   │   └── {recurringId}
│   └── savings/
│       └── {savingsId}
```

### Common Queries

**Get user's transactions:**
```typescript
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

const entriesRef = collection(db, `users/${userId}/entries`)
const q = query(
  entriesRef,
  where("date", ">=", startDate),
  where("date", "<=", endDate),
  orderBy("date", "desc"),
  limit(100)
)

const unsubscribe = onSnapshot(q, (snapshot) => {
  const entries = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Entry))

  setEntries(entries)
})

// Cleanup
return () => unsubscribe()
```

**Add transaction:**
```typescript
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

await addDoc(collection(db, `users/${userId}/entries`), {
  description: "Groceries",
  amount: 50.00,
  currency: "EUR",
  category: "Food & Dining",
  type: "expense",
  date: new Date().toISOString(),
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
})
```

**Update transaction:**
```typescript
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

await updateDoc(doc(db, `users/${userId}/entries/${entryId}`), {
  amount: 75.00,
  updatedAt: serverTimestamp()
})
```

**Delete transaction:**
```typescript
import { doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

await deleteDoc(doc(db, `users/${userId}/entries/${entryId}`))
```

---

## Quick Reference Cards

### Adding a Transaction (Code Flow)

```typescript
// 1. User clicks "+ Add Entry"
const handleAdd = () => {
  setDialogOpen(true)
}

// 2. Dialog renders with form
<AddTransactionDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  onSubmit={handleSubmit}
/>

// 3. User fills form and submits
const handleSubmit = async (entry: NewEntry) => {
  // 4. Validate
  if (!validateAmount(entry.amount)) return

  // 5. Add to Firestore
  await addEntry(entry)

  // 6. Close dialog
  setDialogOpen(false)

  // 7. Show success toast
  toast.success("Transaction added!")
}
```

### Budget Alert Flow

```typescript
// 1. User adds expense
await addEntry({ amount: 350, category: "Food & Dining" })

// 2. Firestore listener fires
onSnapshot(entriesRef, (snapshot) => {
  // 3. Calculate spending
  const spent = calculateSpent(snapshot, "Food & Dining")

  // 4. Check budget
  const budget = budgets.find(b => b.category === "Food & Dining")
  const percentage = (spent / budget.amount) * 100

  // 5. Alert if threshold exceeded
  if (percentage >= budget.alertThreshold) {
    sendNotification({
      title: "Budget Alert",
      message: `You've spent ${percentage}% of your Groceries budget`
    })
  }
})
```

---

**Last Updated:** March 2026
**Version:** 2.5
**For:** Developers
