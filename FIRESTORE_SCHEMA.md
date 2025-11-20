# Firestore Collections Schema Design

## Overview
This document defines the Firestore database structure for the FinTrack application, including all collections, fields, data types, and relationships.

---

## Collection: `users`

**Purpose**: Store user profile and preferences

**Document ID**: User's Firebase Auth UID

**Fields**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `email` | string | ✅ | User's email address | `"user@example.com"` |
| `username` | string | ✅ | Username extracted from email | `"user"` |
| `firstName` | string | ❌ | User's first name | `"John"` |
| `lastName` | string | ❌ | User's last name | `"Doe"` |
| `avatarUrl` | string | ❌ | Profile picture URL | `"https://..."` |
| `currency` | string | ✅ | Default currency code | `"USD"` or `"EUR"` |
| `language` | string | ✅ | User's preferred language | `"en"` or `"bg"` |
| `timezone` | string | ✅ | User's timezone | `"Europe/Sofia"` |
| `providerId` | string | ✅ | Auth provider | `"password"` or `"google.com"` |
| `createdAt` | timestamp | ✅ | Account creation time | Server timestamp |
| `updatedAt` | timestamp | ✅ | Last update time | Server timestamp |

**Security Rules**: Users can only read/write their own document

**Indexes Needed**: None (queries by document ID only)

---

## Collection: `entries`

**Purpose**: Store all manually entered income and expense entries

**Document ID**: Auto-generated (Firestore ID)

**Fields**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `userId` | string | ✅ | Reference to user's UID | `"abc123..."` |
| `type` | string | ✅ | Transaction type | `"income"` or `"expense"` |
| `amount` | number | ✅ | Transaction amount (always positive) | `125.50` |
| `currency` | string | ✅ | Currency code | `"USD"` or `"EUR"` |
| `description` | string | ✅ | Transaction description | `"Grocery Shopping"` |
| `category` | string | ✅ | Category name | `"Food & Dining"` |
| `categoryId` | string | ❌ | Reference to custom category (if user-defined) | `"cat_123"` |
| `date` | timestamp | ✅ | Transaction date/time | Server timestamp |
| `createdAt` | timestamp | ✅ | When record was created | Server timestamp |
| `updatedAt` | timestamp | ✅ | Last update time | Server timestamp |
| `tags` | array<string> | ❌ | Optional tags for filtering | `["urgent", "business"]` |
| `notes` | string | ❌ | Additional notes | `"Monthly grocery run"` |
| `location` | object | ❌ | Location data (if available) | `{ lat: 42.697, lng: 23.321, name: "Store Name" }` |
| `receiptUrl` | string | ❌ | Receipt image URL | `"https://..."` |
| `recurring` | boolean | ❌ | Is this a recurring transaction? | `false` |
| `recurringId` | string | ❌ | Reference to recurring transaction template | `"recur_123"` |

**Security Rules**: Users can only access their own entries (`userId` matches auth.uid)

**Indexes Needed**:
- Composite index: `userId` (ASC) + `date` (DESC) - For listing user's entries
- Composite index: `userId` (ASC) + `type` (ASC) + `date` (DESC) - For filtering by type
- Composite index: `userId` (ASC) + `category` (ASC) + `date` (DESC) - For category filtering
- Composite index: `userId` (ASC) + `date` (ASC) - For date range queries

**Query Patterns**:
- Get all entries for user: `where('userId', '==', userId).orderBy('date', 'desc')`
- Get expenses only: `where('userId', '==', userId).where('type', '==', 'expense')`
- Get by category: `where('userId', '==', userId).where('category', '==', 'Food & Dining')`
- Get date range: `where('userId', '==', userId).where('date', '>=', startDate).where('date', '<=', endDate)`

---

## Collection: `categories`

**Purpose**: Store user-defined custom categories (optional - defaults exist)

**Document ID**: Auto-generated (Firestore ID)

**Fields**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `userId` | string | ✅ | Reference to user's UID | `"abc123..."` |
| `name` | string | ✅ | Category name | `"Custom Category"` |
| `icon` | string | ❌ | Icon identifier | `"shopping-cart"` |
| `color` | string | ❌ | Color code | `"#FF5733"` |
| `type` | string | ✅ | Category type | `"income"` or `"expense"` |
| `isDefault` | boolean | ✅ | Is this a default system category? | `false` |
| `parentCategory` | string | ❌ | Parent category for subcategories | `"Food & Dining"` |
| `createdAt` | timestamp | ✅ | Creation time | Server timestamp |
| `updatedAt` | timestamp | ✅ | Last update time | Server timestamp |

**Default Categories** (created on user registration):
- **Expense**: Food & Dining, Shopping, Transportation, Bills & Utilities, Entertainment, Other
- **Income**: Salary, Freelance, Investment, Gift, Other

**Security Rules**: Users can only access their own categories

**Indexes Needed**:
- Composite index: `userId` (ASC) + `type` (ASC) - For listing categories by type

---

## Collection: `budgets`

**Purpose**: Store user budget plans and limits

**Document ID**: Auto-generated (Firestore ID)

**Fields**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `userId` | string | ✅ | Reference to user's UID | `"abc123..."` |
| `name` | string | ✅ | Budget name | `"Monthly Groceries"` |
| `category` | string | ❌ | Category this budget applies to | `"Food & Dining"` |
| `amount` | number | ✅ | Budget limit | `500.00` |
| `currency` | string | ✅ | Currency code | `"USD"` |
| `period` | string | ✅ | Budget period | `"monthly"`, `"weekly"`, `"yearly"` |
| `startDate` | timestamp | ✅ | Budget period start | Server timestamp |
| `endDate` | timestamp | ✅ | Budget period end | Server timestamp |
| `isActive` | boolean | ✅ | Is budget currently active? | `true` |
| `alertThreshold` | number | ❌ | Alert when spending reaches this % | `80` (80%) |
| `createdAt` | timestamp | ✅ | Creation time | Server timestamp |
| `updatedAt` | timestamp | ✅ | Last update time | Server timestamp |

**Security Rules**: Users can only access their own budgets

**Indexes Needed**:
- Composite index: `userId` (ASC) + `isActive` (ASC) + `startDate` (DESC) - For active budgets
- Composite index: `userId` (ASC) + `category` (ASC) + `startDate` (DESC) - For category budgets

---

## Collection: `recurringTransactions` (Future Feature)

**Purpose**: Store templates for recurring transactions

**Document ID**: Auto-generated (Firestore ID)

**Fields**:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `userId` | string | ✅ | Reference to user's UID | `"abc123..."` |
| `name` | string | ✅ | Transaction name | `"Monthly Netflix"` |
| `amount` | number | ✅ | Transaction amount | `15.99` |
| `type` | string | ✅ | Transaction type | `"expense"` |
| `category` | string | ✅ | Category | `"Entertainment"` |
| `frequency` | string | ✅ | Frequency | `"monthly"`, `"weekly"`, `"yearly"` |
| `nextDate` | timestamp | ✅ | Next occurrence date | Server timestamp |
| `isActive` | boolean | ✅ | Is recurring active? | `true` |
| `createdAt` | timestamp | ✅ | Creation time | Server timestamp |
| `updatedAt` | timestamp | ✅ | Last update time | Server timestamp |

---

## Data Relationships

```
users (1) ──< (many) entries
users (1) ──< (many) categories
users (1) ──< (many) budgets
categories (1) ──< (many) entries (via category field)
```

---

## Best Practices

### 1. **Timestamps**
- Always use `serverTimestamp()` for `createdAt` and `updatedAt`
- Use Firestore Timestamp type, not JavaScript Date objects
- Store transaction `date` as timestamp for efficient querying

### 2. **Amounts**
- Store amounts as numbers (not strings)
- Always store positive values (use `type` field to indicate income/expense)
- Consider storing in smallest currency unit (cents) for precision, or use decimals

### 3. **Currency**
- Store currency code (ISO 4217): `USD`, `EUR`, `BGN`, etc.
- Default to user's currency from `users` collection

### 4. **Indexes**
- Create composite indexes before deploying to production
- Firestore will suggest indexes when you run queries, but plan ahead

### 5. **Security**
- Always validate `userId` matches `auth.uid` in security rules
- Never trust client-side data - validate on backend if using Cloud Functions

### 6. **Performance**
- Use pagination for large transaction lists (limit to 20-50 per page)
- Consider using subcollections for very large datasets
- Cache frequently accessed data on client side

### 7. **Data Migration**
- When adding new required fields, use default values for existing documents
- Consider migration scripts for bulk updates

---

## Example Document Structures

### Example Entry Document
```json
{
  "userId": "abc123xyz",
  "type": "expense",
  "amount": 125.50,
  "currency": "EUR",
  "description": "Grocery Shopping",
  "category": "Food & Dining",
  "date": "2025-11-20T10:30:00Z",
  "createdAt": "2025-11-20T10:30:15Z",
  "updatedAt": "2025-11-20T10:30:15Z",
  "tags": ["groceries", "weekly"],
  "notes": "Weekly shopping at Lidl"
}
```

### Example User Document
```json
{
  "email": "user@example.com",
  "username": "user",
  "firstName": "John",
  "lastName": "Doe",
  "avatarUrl": "https://...",
  "currency": "EUR",
  "language": "en",
  "timezone": "Europe/Sofia",
  "providerId": "google.com",
  "createdAt": "2025-11-17T20:08:03Z",
  "updatedAt": "2025-11-20T10:30:00Z"
}
```

### Example Category Document
```json
{
  "userId": "abc123xyz",
  "name": "Food & Dining",
  "icon": "utensils",
  "color": "#EF4444",
  "type": "expense",
  "isDefault": true,
  "createdAt": "2025-11-17T20:08:03Z",
  "updatedAt": "2025-11-17T20:08:03Z"
}
```

---

## Required Firestore Indexes

Create these composite indexes in Firebase Console:

1. **entries collection**:
   - `userId` (Ascending) + `date` (Descending)
   - `userId` (Ascending) + `type` (Ascending) + `date` (Descending)
   - `userId` (Ascending) + `category` (Ascending) + `date` (Descending)

2. **categories collection**:
   - `userId` (Ascending) + `type` (Ascending)

3. **budgets collection**:
   - `userId` (Ascending) + `isActive` (Ascending) + `startDate` (Descending)

---

## Migration Notes

When implementing:
1. Create default categories for existing users
2. Migrate any existing entry data
3. Set up indexes before going live
4. Test security rules thoroughly

