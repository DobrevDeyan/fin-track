# Pocket — Smart Financial Management

A privacy-first personal finance PWA with AI-powered insights, receipt scanning, and intelligent budgeting. Built with Next.js 14, Firebase, and Google Cloud AI.

**Live:** https://fin-track-adc2c.web.app

---

## Key Features

- **Privacy-first** — manual entry only, no bank linking required
- **AI insights** — health score, anomaly detection, cash flow forecast (client-side); AI digest & chat (Gemini 2.5 Flash)
- **Receipt scanning** — Google Document AI OCR with confidence scoring
- **Family budgeting** — household invite flow, merged family transaction view
- **PWA / Offline** — installable, works without internet
- **Multi-currency** — EUR, USD, BGN, GBP, CHF, JPY, CAD, AUD
- **i18n** — English + Bulgarian
- **Freemium** — Free / Pro (€7.99) / Business (€19.99) via Stripe

---

## Quick Start

```bash
# 1. Install
cd frontend && npm install

# 2. Configure (copy env vars from docs/SETUP.md)
cp frontend/.env.example frontend/.env.local

# 3. Run
cd frontend && npm run dev        # http://localhost:3001
cd ml-service && npm run dev      # http://localhost:8000 (optional)
```

---

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/SETUP.md](docs/SETUP.md) | Prerequisites, env vars, local dev, scripts |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Step-by-step deployment to Firebase + Cloud Run |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, tech stack, Firestore collections, security, troubleshooting |
| [docs/API.md](docs/API.md) | ML service endpoints, Cloud Functions, hooks, components, types |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | End-user feature documentation |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Feature status, Q3 2026 plans, competitive analysis |
| [docs/TESTING.md](docs/TESTING.md) | Manual functional test plan (20 modules) |
| [docs/LAUNCH.md](docs/LAUNCH.md) | Beta launch strategy — channels, retention, metrics |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui |
| Database | Cloud Firestore (`europe-west4`) |
| Auth | Firebase Authentication (Email + Google OAuth) |
| Backend | Firebase Cloud Functions (Node.js 20) |
| ML Service | Express.js on Google Cloud Run (`europe-west1`) |
| Receipt OCR | Google Document AI (Expense Parser) |
| AI | Google Gemini 2.5 Flash |
| Subscriptions | Stripe via Firebase Extension |
| Hosting | Firebase Hosting |

---

## License

Private — not licensed for redistribution.
