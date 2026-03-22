# Pocket — Frontend

Next.js 14 PWA frontend for Pocket, a privacy-first personal finance app.

## Quick Start

```bash
npm install
cp .env.local.example .env.local   # then fill in your Firebase credentials
npm run dev                         # http://localhost:3001
```

## Environment Variables

All required variables for `frontend/.env.local`:

```env
# Firebase — get from Firebase Console > Project Settings > Your Apps
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# ML Service (local dev)
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:8000

# Stripe (use test keys for local dev)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=price_...
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server on port 3001 |
| `npm run dev:turbo` | Dev server with Turbopack |
| `npm run build` | Production build → `out/` (static export) |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Jest watch mode |
| `npm run test:coverage` | Coverage report |

## Tech Stack

- **Next.js 14** (App Router, static export)
- **TypeScript**, **Tailwind CSS**, **shadcn/ui**
- **Firebase** (Auth, Firestore, Storage)
- **Recharts** for charts
- **next-intl** for i18n (English + Bulgarian)

## Documentation

- [User Guide](../docs/USER_GUIDE.md)
- [Technical Docs](../docs/TECHNICAL.md)
- [Deployment Guide](../md/deployment.md)
- [Project README](../README.md)
