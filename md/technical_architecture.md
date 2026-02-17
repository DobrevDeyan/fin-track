# Pocket - Technical Architecture

**Complete Technical Documentation**

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (PWA)                        │
├─────────────────────────────────────────────────────────────┤
│  Next.js 14 + TypeScript + React                            │
│  • App Router (React Server Components)                     │
│  • Service Worker (Offline Support)                          │
│  • Web App Manifest (Installable)                            │
│  • IndexedDB (Local Storage)                                 │
│  • Tailwind CSS + shadcn/ui                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  FIREBASE SERVICES                          │
├─────────────────────────────────────────────────────────────┤
│  🔐 Firebase Authentication                                  │
│  💾 Firestore Database (NoSQL)                              │
│  ⚡ Cloud Functions (Node.js/TypeScript)                     │
│  🌐 Firebase Hosting                                         │
│  📊 Analytics                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend

**Framework**: Next.js 14
- **Why Next.js**: Server-side rendering, App Router, built-in optimizations, excellent TypeScript support, PWA-ready
- **App Router**: Modern React patterns, better performance
- **TypeScript**: Type safety, better IDE support, easier refactoring

**Styling**: Tailwind CSS
- Utility-first CSS framework
- Responsive design built-in
- Custom theme configuration

**UI Components**: shadcn/ui
- Accessible component library
- Built on Radix UI primitives
- Fully customizable

**State Management**: React Context API
- `AuthContext`: User authentication state
- `CurrencyContext`: Currency selection and formatting

**PWA Features**:
- Service Worker (`sw.js`)
- Web App Manifest (`manifest.json`)
- Install prompt component
- Offline support

### Backend

**Firebase Services**:
- **Authentication**: Firebase Auth (Email/Password, Google OAuth)
- **Database**: Firestore (NoSQL, real-time updates)
- **Hosting**: Firebase Hosting (or Vercel)
- **Functions**: Cloud Functions (Node.js/TypeScript)

**Database**: Firestore
- NoSQL document database
- Real-time listeners
- Security rules for data access
- Composite indexes for queries

---

## 📁 Project Structure

```
fin-track/
├── frontend/                          # Next.js Frontend
│   ├── app/                           # App Router
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Landing page
│   │   ├── dashboard/                 # Dashboard pages
│   │   │   └── page.tsx              # Main dashboard
│   │   ├── reports/                  # Reports page
│   │   │   └── page.tsx              # Reports & Analytics
│   │   ├── auth/                     # Authentication
│   │   │   ├── login/                # Login page
│   │   │   └── register/             # Registration page
│   │   ├── globals.css               # Global styles
│   │   └── register-sw.tsx          # Service worker registration
│   │
│   ├── components/                    # React Components
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── dashboard/                # Dashboard components
│   │   │   ├── AddTransactionDialog.tsx
│   │   │   ├── BudgetCard.tsx
│   │   │   ├── BudgetDialog.tsx
│   │   │   ├── GoalCard.tsx
│   │   │   ├── GoalDialog.tsx
│   │   │   ├── QuickExpenseSheet.tsx
│   │   │   ├── RecurringTransactionDialog.tsx
│   │   │   ├── SavingsAccountDialog.tsx
│   │   │   ├── TransactionFilters.tsx
│   │   │   ├── TransactionsTable.tsx
│   │   │   └── ...
│   │   ├── Navbar.tsx                # Navigation
│   │   ├── Footer.tsx                # Footer
│   │   ├── Hero.tsx                  # Hero section
│   │   └── ...
│   │
│   ├── contexts/                     # React Contexts
│   │   ├── AuthContext.tsx           # Authentication context
│   │   └── CurrencyContext.tsx       # Currency context
│   │
│   ├── lib/                          # Utilities & Helpers
│   │   ├── firebase.ts               # Firebase configuration
│   │   ├── firestore-entries.ts      # Transaction CRUD
│   │   ├── firestore-budgets.ts      # Budget CRUD
│   │   ├── firestore-goals.ts        # Goals CRUD
│   │   ├── firestore-recurring.ts    # Recurring transactions
│   │   ├── firestore-savings.ts      # Savings accounts
│   │   ├── firestore-users.ts        # User management
│   │   ├── firestore-types.ts        # TypeScript types
│   │   ├── categories.ts             # Category definitions
│   │   ├── currency-utils.ts         # Currency formatting
│   │   ├── date-utils.ts             # Date utilities
│   │   ├── export-utils.ts           # CSV export
│   │   ├── pdf-export.ts             # PDF export
│   │   ├── metrics-utils.ts          # Financial calculations
│   │   ├── validation.ts             # Input validation
│   │   ├── quick-items.ts            # Quick expense items
│   │   └── utils.ts                  # General utilities
│   │
│   ├── public/                       # Static Assets
│   │   ├── manifest.json             # PWA manifest
│   │   ├── sw.js                     # Service worker
│   │   └── icons/                    # App icons
│   │
│   ├── package.json                  # Dependencies
│   ├── next.config.js                # Next.js config
│   ├── tailwind.config.js            # Tailwind config
│   └── tsconfig.json                 # TypeScript config
│
├── firebase.json                     # Firebase configuration
├── firestore.rules                    # Firestore security rules
└── firestore.indexes.json            # Firestore indexes
```

---

## 🗄️ Database Schema (Firestore)

### Collection: `users`
**Document ID**: User's Firebase Auth UID

```typescript
{
  email: string
  username: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  currency: string              // Default: "EUR"
  language: string              // Default: "en"
  timezone: string
  providerId: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Collection: `entries`
**Document ID**: Auto-generated

```typescript
{
  userId: string
  type: "income" | "expense"
  amount: number               // Always positive
  currency: string
  description: string
  category: string
  categoryId?: string
  date: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
  tags?: string[]
  notes?: string
  location?: {
    lat: number
    lng: number
    name?: string
  }
  receiptUrl?: string
  recurring?: boolean
  recurringId?: string
}
```

**Indexes Required**:
- `userId` (ASC) + `date` (DESC)
- `userId` (ASC) + `type` (ASC) + `date` (DESC)
- `userId` (ASC) + `category` (ASC) + `date` (DESC)

### Collection: `budgets`
**Document ID**: Auto-generated

```typescript
{
  userId: string
  name: string
  category?: string
  amount: number
  currency: string
  period: "monthly" | "weekly" | "yearly"
  startDate: Timestamp
  endDate: Timestamp
  isActive: boolean
  alertThreshold?: number      // Percentage (0-100)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Indexes Required**:
- `userId` (ASC) + `isActive` (ASC) + `startDate` (DESC)
- `userId` (ASC) + `category` (ASC) + `startDate` (DESC)

### Collection: `goals`
**Document ID**: Auto-generated

```typescript
{
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  currency: string
  deadline?: Timestamp
  category?: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Collection: `recurringTransactions`
**Document ID**: Auto-generated

```typescript
{
  userId: string
  name: string
  amount: number
  type: "income" | "expense"
  category: string
  frequency: "monthly" | "weekly" | "yearly"
  nextDate: Timestamp
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Collection: `savingsAccounts`
**Document ID**: Auto-generated

```typescript
{
  userId: string
  name: string
  balance: number
  currency: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## 🔐 Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /{collection}/{document} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 🔄 Data Flow

### Transaction Creation Flow
```
1. User enters transaction in UI
   ↓
2. Frontend validates input
   ↓
3. Call firestore-entries.ts → createEntry()
   ↓
4. Firestore SDK → Firestore Database
   ↓
5. Real-time listener updates UI
```

### Budget Tracking Flow
```
1. User creates/updates budget
   ↓
2. Frontend calls firestore-budgets.ts
   ↓
3. Budget saved to Firestore
   ↓
4. Dashboard queries entries for budget category
   ↓
5. Calculate spending vs budget
   ↓
6. Display progress indicator
```

---

## 📦 Key Dependencies

### Frontend
```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "firebase": "^10.0.0",
  "tailwindcss": "^3.0.0",
  "@radix-ui/react-*": "Latest",
  "lucide-react": "Latest",
  "recharts": "Latest",
  "jspdf": "Latest",
  "jspdf-autotable": "Latest"
}
```

### Build Tools
- **Next.js**: Framework and build system
- **TypeScript**: Type checking
- **Tailwind CSS**: Styling
- **PostCSS**: CSS processing

---

## 🚀 Deployment

### Frontend Deployment

**Firebase Hosting**:
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

**Vercel** (Alternative):
```bash
cd frontend
vercel --prod
```

### Environment Variables
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## 🧪 Development

### Local Development Setup
```bash
# Install dependencies
cd frontend
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Firebase Emulators
```bash
# Start Firebase emulators
firebase emulators:start

# Access emulators
# Auth: http://localhost:9099
# Firestore: http://localhost:8080
# Functions: http://localhost:5001
```

---

## 📊 Performance Optimizations

### Frontend
- **Code Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js Image component
- **Lazy Loading**: Dynamic imports for heavy components
- **Service Worker**: Caching for offline support
- **Bundle Analysis**: Regular bundle size monitoring

### Database
- **Composite Indexes**: Optimized queries
- **Pagination**: Limit query results
- **Real-time Listeners**: Efficient updates
- **Query Optimization**: Minimal data fetching

---

## 🔧 Configuration Files

### `next.config.js`
- PWA configuration
- Image domains
- Environment variables
- Build optimizations

### `tailwind.config.js`
- Theme customization
- Color palette
- Font configuration
- Custom utilities

### `firebase.json`
- Hosting configuration
- Firestore rules deployment
- Functions configuration
- Emulator settings

### `firestore.rules`
- Security rules
- Data access control
- Validation rules

### `firestore.indexes.json`
- Composite indexes
- Query optimization
- Performance indexes

---

## 🎨 UI/UX Architecture

### Component Structure
- **Atomic Design**: Components organized by complexity
- **Reusable Components**: Shared UI components in `components/ui/`
- **Feature Components**: Feature-specific in `components/dashboard/`
- **Layout Components**: Navigation, footer, etc.

### Styling Approach
- **Tailwind CSS**: Utility-first styling
- **CSS Variables**: Theme customization
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Ready (currently light mode only)

### State Management
- **React Context**: Global state (Auth, Currency)
- **Local State**: Component-level state (useState)
- **Firestore Listeners**: Real-time data updates

---

## 📱 PWA Architecture

### Service Worker (`sw.js`)
- **Caching Strategy**: Network-first for API, cache-first for assets
- **Offline Support**: Queue requests when offline
- **Update Mechanism**: Automatic updates on new version
- **Cache Management**: Version-based cache invalidation

### Web App Manifest
- **Icons**: Multiple sizes for all platforms
- **Display Mode**: Standalone
- **Theme Color**: Brand colors
- **Start URL**: Dashboard

### Install Prompt
- **Custom Component**: `InstallPrompt.tsx`
- **Browser Detection**: Checks for installability
- **User Preference**: Respects user dismissal

---

## 🔍 Code Quality

### TypeScript
- **Strict Mode**: Enabled
- **Type Safety**: Full type coverage
- **Interfaces**: Well-defined data structures
- **Type Guards**: Runtime type checking

### Linting
- **ESLint**: Code quality rules
- **Stylelint**: CSS quality rules
- **Prettier**: Code formatting (if configured)

### Testing
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **Test Files**: Located in `__tests__/`

---

## 📈 Monitoring & Analytics

### Firebase Analytics
- User engagement tracking
- Feature usage analytics
- Performance monitoring

### Error Tracking
- Console logging
- Error boundaries
- User feedback collection

---

## 🔄 Version Control

### Git Workflow
- **Main Branch**: Production-ready code
- **Feature Branches**: New features
- **Commit Messages**: Conventional commits

### Versioning
- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **Current Version**: 2.1
- **Changelog**: Tracked in code comments

---

## 🎯 Future Technical Improvements

### Planned
- **Cloud Functions**: Recurring transaction auto-creation
- **Image Upload**: Receipt management with Firebase Storage
- **Push Notifications**: Budget alerts and reminders
- **Advanced Caching**: Improved offline support

### Considered
- **GraphQL**: Alternative to Firestore queries
- **State Management**: Redux or Zustand (if needed)
- **Testing**: E2E testing with Playwright
- **CI/CD**: Automated deployment pipeline

---

## 📚 Technical Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)

### Tools
- **Firebase Console**: Database management
- **Firebase CLI**: Deployment and emulators
- **Next.js DevTools**: Development tools
- **React DevTools**: Component inspection

---

**Last Updated**: January 2025  
**Architecture Version**: 2.0  
**Status**: Production Ready ✅
