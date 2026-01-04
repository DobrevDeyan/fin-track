# Currency Implementation Guide

## Overview

This document explains how the currency switcher works and how it affects existing and future entries.

---

## How Currency Switching Works

### 1. **User Currency Preference**
- Stored in Firestore `users` collection as `currency` field
- Can be changed via dropdown in Navbar (next to Dashboard button)
- Only supports **USD** and **EUR** (defined in `frontend/lib/constants/currency.constants.ts`)

### 2. **Currency Context**
- `CurrencyContext` provides user's currency preference throughout the app
- Automatically loads from Firestore when user logs in
- Available via `useCurrency()` hook

### 3. **New Entries (Expenses/Income)**
- **Automatically uses user's current currency preference**
- When you create a new expense/income, it uses the currency selected in the navbar
- Currency is stored with each entry in Firestore

### 4. **Existing Entries**
- **Display in their original currency** (the currency they were created with)
- Each entry stores its own currency in the database
- This preserves historical accuracy - you see what currency was actually used

### 5. **Dashboard Metrics**
- **Display in user's preferred currency**
- Total Balance, Income, Expenses, Savings all show in your preferred currency
- Note: If you have mixed currencies (some EUR, some USD), the totals are shown in your preference but may not be accurate conversions

### 6. **Budgets & Goals**
- **Default to user's currency preference** when creating new ones
- Can still be changed manually in the form
- Existing budgets/goals keep their original currency

---

## User Experience Considerations

### ✅ Current Implementation

1. **New Entries**: Use your preferred currency automatically
2. **Existing Entries**: Show in their original currency (preserves accuracy)
3. **Dashboard Summary**: Shows in your preferred currency
4. **Currency Dropdown**: Easy access in navbar, saves immediately

### ⚠️ Current Limitations

1. **No Currency Conversion**: 
   - If you have entries in EUR and USD, totals are just summed (not converted)
   - Example: €100 + $50 = shown as €150 or $150 (incorrect)

2. **Mixed Currency Display**:
   - Transaction table shows each entry in its original currency
   - Dashboard metrics show in your preference (may be inaccurate with mixed currencies)

### 💡 Recommended UX Improvements

#### Option 1: Show Currency Indicator (Current Approach - Good)
- ✅ Each transaction shows its currency
- ✅ Preserves historical accuracy
- ✅ Simple and transparent

#### Option 2: Currency Conversion (Future Enhancement)
- Convert all entries to user's preferred currency for display
- Requires exchange rate API (e.g., ExchangeRate-API, Fixer.io)
- More complex but provides accurate totals

#### Option 3: Currency Filtering (Future Enhancement)
- Filter transactions by currency
- Show separate totals per currency
- Useful for users with multiple currencies

---

## Technical Implementation

### Files Modified

1. **`frontend/contexts/CurrencyContext.tsx`** - Currency context provider
2. **`frontend/app/layout.tsx`** - Added CurrencyProvider
3. **`frontend/app/dashboard/page.tsx`** - Uses user currency for new entries
4. **`frontend/components/dashboard/MetricsCards.tsx`** - Accepts userCurrency prop
5. **`frontend/components/dashboard/TransactionsTable.tsx`** - Displays entry currency
6. **`frontend/components/dashboard/BudgetDialog.tsx`** - Defaults to user currency
7. **`frontend/components/dashboard/GoalDialog.tsx`** - Defaults to user currency
8. **`frontend/components/Navbar.tsx`** - Currency dropdown with context integration

### Data Flow

```
User selects currency in Navbar
    ↓
Saves to Firestore (users collection)
    ↓
CurrencyContext refreshes
    ↓
Page reloads (to update all components)
    ↓
New entries use user's currency
    ↓
Existing entries display in their stored currency
```

---

## Best Practices for Users

1. **Set Your Currency First**: Change currency preference before adding entries
2. **Be Consistent**: Use the same currency for related transactions
3. **Check Currency**: Each transaction shows its currency in the table
4. **Mixed Currencies**: Be aware that totals may not be accurate if mixing EUR and USD

---

## Future Enhancements

### High Priority
1. **Currency Conversion**: Add exchange rate API to convert between currencies
2. **Currency Filter**: Filter transactions by currency
3. **Multi-Currency Totals**: Show separate totals per currency

### Medium Priority
4. **Currency Badge**: Visual indicator showing which currency is active
5. **Currency History**: Track currency changes over time
6. **Bulk Currency Update**: Convert all entries to new currency (with conversion)

### Low Priority
7. **More Currencies**: Add GBP, BGN, etc. (currently limited to USD/EUR)
8. **Auto-Detect Currency**: Based on location or bank account

---

## Testing Checklist

- [x] Currency dropdown saves to Firestore
- [x] New expenses use user's currency
- [x] New budgets default to user's currency
- [x] New goals default to user's currency
- [x] Existing entries display in their original currency
- [x] Dashboard metrics use user's currency
- [x] Transaction table shows entry currency
- [ ] Currency change reflects immediately (currently requires page reload)
- [ ] Mixed currency totals are handled correctly

---

**Last Updated**: December 2024

