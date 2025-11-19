# FinTrack - Complete Architecture & Implementation Guide

## 🎯 Business Model

### Freemium SaaS Model
- **Free Tier**: 
  - Up to 100 transactions/month
  - Basic categorization (manual)
  - Basic dashboard
  - Mobile app access
  
- **Pro Tier ($9.99/month)**:
  - Unlimited transactions
  - **AI-powered auto-categorization** (ML microservice)
  - Advanced analytics & insights
  - Budget alerts & notifications
  - Data export (CSV/JSON)
  - Priority support

- **Business Tier ($29.99/month)**:
  - Everything in Pro
  - Multi-user accounts
  - Team collaboration
  - API access
  - Custom reports
  - White-label options

### Revenue Projections
- **Year 1**: 1,000-5,000 users → $10K-50K ARR
- **Year 2**: 10,000-50,000 users → $100K-500K ARR
- **Year 3**: 100,000+ users → $1M+ ARR

---

## 🏗️ Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (PWA)                          │
├─────────────────────────────────────────────────────────────────────┤
│  📱 Next.js 14 + TypeScript + PWA                                  │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  • App Router (React Server Components)                      │ │
│  │  • Service Worker (Offline Support)                          │ │
│  │  • Web App Manifest (Installable)                            │ │
│  │  • IndexedDB (Local Storage)                                 │ │
│  │  • Push Notifications                                         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                          ↓ HTTP/HTTPS                              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐
│   FIREBASE SERVICES           │  │   GOOGLE CLOUD RUN            │
│   (Primary Backend)           │  │   (ML Microservice)          │
├───────────────────────────────┤  ├───────────────────────────────┤
│  🔐 Firebase Auth             │  │  🤖 Python ML Service         │
│  💾 Firestore Database         │  │  ┌─────────────────────────┐ │
│  ⚡ Cloud Functions (Node.js)  │  │  │ FastAPI + scikit-learn   │ │
│  🌐 Firebase Hosting           │  │  │ + sentence-transformers  │ │
│  📊 Analytics                  │  │  │ + joblib (model cache)  │ │
│                                │  │  └─────────────────────────┘ │
│  Services:                     │  │                              │
│  • User Management             │  │  Endpoints:                 │
│  • Transaction CRUD            │  │  • POST /classify           │
│  • Category Management         │  │  • POST /batch-classify     │
│  • Budget Tracking             │  │  • GET /health              │
│  • Analytics Queries           │  │  • GET /model-info          │
│                                │  │                              │
│  Cost: FREE (Spark Plan)      │  │  Cost: FREE (2M requests/mo) │
└───────────────────────────────┘  └───────────────────────────────┘
                │                               │
                └───────────────┬───────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   ML MODEL STORAGE    │
                    ├───────────────────────┤
                    │  Google Cloud Storage │
                    │  (Model artifacts)    │
                    │  • classifier.pkl     │
                    │  • vectorizer.pkl     │
                    │  • embeddings.bin     │
                    │                       │
                    │  Cost: FREE (5GB)     │
                    └───────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend: Next.js 14 + TypeScript ✅
**Why Next.js (not Svelte or plain React)?**
- ✅ **Server-Side Rendering (SSR)**: Better SEO, faster initial load
- ✅ **App Router**: Modern React patterns, better performance
- ✅ **Built-in Optimizations**: Image optimization, code splitting
- ✅ **TypeScript Support**: Native, excellent DX
- ✅ **PWA Support**: Easy integration with next-pwa
- ✅ **Industry Standard**: Huge ecosystem, long-term support
- ✅ **Firebase Integration**: Excellent SDK support
- ✅ **Vercel Deployment**: Seamless (but you can use Firebase Hosting too)

**Why TypeScript?**
- Type safety reduces bugs
- Better IDE support
- Easier refactoring
- Industry standard

**Webpack vs Vite?**
- Next.js uses **Webpack** (and Turbopack in newer versions)
- You don't need Vite - Next.js handles everything
- Next.js optimizations are better than manual Vite setup

### Backend: Firebase + Google Cloud Run
**Firebase Services (Primary Backend):**
- **Auth**: Firebase Authentication (Google, Email/Password)
- **Database**: Firestore (NoSQL, real-time)
- **Functions**: Cloud Functions (Node.js/TypeScript)
- **Hosting**: Firebase Hosting (or Vercel)
- **Cost**: FREE tier covers most use cases

**ML Microservice (Google Cloud Run):**
- **Framework**: FastAPI (Python)
- **ML Libraries**: 
  - `scikit-learn` - Classification models
  - `sentence-transformers` - MiniLM embeddings
  - `joblib` - Model serialization
- **Deployment**: Google Cloud Run (serverless containers)
- **Cost**: FREE tier (2M requests/month, 360K GB-seconds)

---

## 📁 Repository Structure

```
fin-track/
├── README.md                    # Project overview
├── ARCHITECTURE.md              # This file - complete architecture
├── ROADMAP.md                   # Development roadmap
├── SETUP.md                     # Setup instructions
├── DEPLOYMENT.md                # Deployment guide
│
├── frontend/                    # Next.js Frontend (Firebase Hosting)
│   ├── app/                     # App Router pages
│   │   ├── layout.tsx           # Root layout with PWA
│   │   ├── page.tsx             # Landing page
│   │   ├── dashboard/           # Dashboard pages
│   │   ├── transactions/        # Transaction pages
│   │   └── auth/                # Auth pages
│   ├── components/              # React components
│   ├── lib/                     # Utilities
│   │   ├── firebase.ts          # Firebase config
│   │   ├── ml-service.ts        # ML service client
│   │   └── api.ts               # API helpers
│   ├── contexts/                # React contexts
│   ├── public/                  # Static assets
│   │   ├── manifest.json        # PWA manifest
│   │   └── icons/               # PWA icons
│   ├── package.json
│   ├── next.config.js           # Next.js + PWA config
│   └── tsconfig.json
│
├── functions/                   # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts             # Cloud Functions code
│   ├── package.json
│   └── tsconfig.json
│
├── ml-service/                  # 🆕 Python ML Microservice
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── models/
│   │   │   ├── classifier.py    # ML model logic
│   │   │   └── embeddings.py    # Embedding generation
│   │   ├── routers/
│   │   │   └── classify.py     # Classification endpoints
│   │   └── utils/
│   │       └── model_loader.py  # Model loading/caching
│   ├── models/                  # Trained model files
│   │   ├── classifier.pkl      # Scikit-learn model
│   │   ├── vectorizer.pkl      # Text vectorizer
│   │   └── embeddings.bin       # Pre-computed embeddings
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile               # Cloud Run deployment
│   ├── .dockerignore
│   ├── .env.example
│   └── README.md                # ML service docs
│
├── firebase.json                # Firebase config
├── firestore.rules              # Database security rules
└── firestore.indexes.json      # Database indexes
```

---

## 🤖 ML Microservice Details

### Technology Stack
- **FastAPI**: Modern Python web framework (async, auto-docs)
- **scikit-learn**: Machine learning library
  - Models: `RandomForestClassifier`, `SGDClassifier`, or `LogisticRegression`
  - Vectorizers: `TfidfVectorizer` or `CountVectorizer`
- **sentence-transformers**: For MiniLM embeddings
  - Model: `all-MiniLM-L6-v2` (free, lightweight, 80MB)
- **joblib**: Model serialization (faster than pickle for sklearn)
- **numpy**, **pandas**: Data processing

### Model Architecture

```
Transaction Description
        │
        ▼
┌───────────────────────┐
│ Text Preprocessing    │
│ • Lowercase           │
│ • Remove special chars│
│ • Tokenize            │
└───────────────────────┘
        │
        ├─────────────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│ TF-IDF       │  │ MiniLM           │
│ Vectorizer   │  │ Embeddings       │
│ (scikit)     │  │ (384-dim vector) │
└──────────────┘  └──────────────────┘
        │                 │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ Feature          │
        │ Concatenation    │
        └─────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ Classifier      │
        │ (Random Forest) │
        └─────────────────┘
                 │
                 ▼
        Category Prediction
        (Food, Transport, etc.)
```

### Model Training Pipeline
1. **Data Collection**: User-labeled transactions (from Firestore)
2. **Feature Engineering**: 
   - TF-IDF vectors from descriptions
   - MiniLM embeddings (semantic understanding)
   - Amount, date features
3. **Training**: scikit-learn classifier
4. **Serialization**: Save with joblib
5. **Deployment**: Upload to Cloud Storage, load in Cloud Run

### API Endpoints

```python
POST /classify
Body: {
  "description": "Starbucks Coffee",
  "amount": 5.50,
  "merchant": "Starbucks"
}
Response: {
  "category": "Food & Dining",
  "confidence": 0.95,
  "subcategory": "Coffee"
}

POST /batch-classify
Body: {
  "transactions": [
    {"description": "Uber ride", "amount": 15.00},
    {"description": "Whole Foods", "amount": 45.00}
  ]
}
Response: {
  "results": [
    {"category": "Transport", "confidence": 0.92},
    {"category": "Groceries", "confidence": 0.88}
  ]
}

GET /health
Response: {
  "status": "healthy",
  "model_loaded": true,
  "version": "1.0.0"
}

GET /model-info
Response: {
  "model_type": "RandomForestClassifier",
  "training_date": "2024-01-15",
  "accuracy": 0.89,
  "categories": ["Food", "Transport", "Groceries", ...]
}
```

---

## 🚀 Deployment Architecture

### Frontend Deployment
**Option 1: Firebase Hosting (Recommended for Firebase projects)**
```bash
cd frontend
npm run build
firebase deploy --only hosting
```
- **URL**: `https://your-project.web.app`
- **Cost**: FREE (10GB storage, 360MB/day transfer)

**Option 2: Vercel (Alternative)**
```bash
cd frontend
vercel --prod
```
- **URL**: `https://your-project.vercel.app`
- **Cost**: FREE (100GB bandwidth)

### ML Microservice Deployment (Google Cloud Run)

**Step 1: Build Docker Image**
```bash
cd ml-service
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ml-service
```

**Step 2: Deploy to Cloud Run**
```bash
gcloud run deploy ml-service \
  --image gcr.io/YOUR_PROJECT_ID/ml-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

**Step 3: Get Service URL**
```bash
# Output: https://ml-service-xxxxx.run.app
```

**Configuration:**
- **Memory**: 1GB (enough for MiniLM model)
- **CPU**: 1 vCPU
- **Min Instances**: 0 (scale to zero when idle)
- **Max Instances**: 10 (auto-scale)
- **Timeout**: 60 seconds
- **Cost**: FREE tier (2M requests/month)

### Firebase Functions Deployment
```bash
cd functions
npm run build
firebase deploy --only functions
```

---

## 💰 Cost Breakdown (All FREE Tier)

| Service | Usage | Cost |
|---------|-------|------|
| **Firebase Hosting** | 10GB storage, 360MB/day | **$0/month** |
| **Firestore** | 1GB storage, 50K reads/day | **$0/month** |
| **Firebase Auth** | Unlimited users | **$0/month** |
| **Cloud Functions** | 2M invocations/month | **$0/month** |
| **Cloud Run (ML)** | 2M requests, 360K GB-seconds | **$0/month** |
| **Cloud Storage** | 5GB storage | **$0/month** |
| **Total** | | **$0/month** |

**When you scale beyond free tier:**
- Cloud Run: $0.40 per million requests
- Firestore: $0.06 per 100K reads
- Still very affordable!

---

## 🔄 Data Flow

### Transaction Classification Flow

```
1. User adds transaction in Next.js app
   └─> Description: "Starbucks Coffee", Amount: $5.50

2. Frontend sends to Firebase Cloud Function
   POST /api/transactions
   └─> Stored in Firestore (with category: null)

3. Cloud Function triggers ML classification
   POST https://ml-service.run.app/classify
   Body: {
     "description": "Starbucks Coffee",
     "amount": 5.50
   }

4. ML Service processes:
   - Loads pre-trained model (from memory cache)
   - Generates embeddings (MiniLM)
   - Runs classifier
   - Returns: {"category": "Food & Dining", "confidence": 0.95}

5. Cloud Function updates Firestore
   transaction.category = "Food & Dining"
   transaction.autoCategorized = true

6. Frontend receives real-time update (Firestore listener)
   └─> UI updates with category badge
```

### Offline Support (PWA)
- Transactions stored in IndexedDB when offline
- Service Worker queues API calls
- Syncs when connection restored
- ML classification happens on next sync

---

## 🧪 Development Workflow

### Local Development

**1. Frontend (Next.js)**
```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

**2. Firebase Emulators**
```bash
firebase emulators:start
# Auth: http://localhost:9099
# Firestore: http://localhost:8080
# Functions: http://localhost:5001
```

**3. ML Service (Local)**
```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
# http://localhost:8001
```

**4. Update Frontend to use local ML service**
```env
# frontend/.env.local
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:8001
```

### Production Deployment

**1. Deploy ML Service to Cloud Run**
```bash
cd ml-service
gcloud run deploy ml-service --source .
```

**2. Update Frontend environment**
```env
# frontend/.env.production
NEXT_PUBLIC_ML_SERVICE_URL=https://ml-service-xxxxx.run.app
```

**3. Deploy Frontend**
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

---

## 📊 Why This Architecture?

### ✅ Advantages
1. **Cost-Effective**: Everything free tier to start
2. **Scalable**: Auto-scales with usage
3. **Modern**: Latest tech stack
4. **Separation of Concerns**: ML service isolated
5. **PWA Ready**: Offline support built-in
6. **Type-Safe**: TypeScript everywhere
7. **Fast Development**: Firebase handles infrastructure

### ⚠️ Considerations
1. **Vendor Lock-in**: Firebase-specific (but migration possible)
2. **Cold Starts**: Cloud Run may have 1-2s cold start (min-instances: 1 fixes this)
3. **Model Updates**: Need to redeploy ML service for model updates

---

## 🎯 Next Steps

1. **Set up ML Service**: Create `ml-service/` directory structure
2. **Train Initial Model**: Use sample transaction data
3. **Deploy ML Service**: Deploy to Cloud Run
4. **Integrate Frontend**: Connect Next.js to ML service
5. **Add PWA**: Configure service worker and manifest
6. **Test End-to-End**: Full transaction flow

---

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Cloud Run](https://cloud.google.com/run/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [scikit-learn](https://scikit-learn.org/)
- [sentence-transformers](https://www.sbert.net/)

---

**This architecture gives you:**
- ✅ Free hosting (Firebase + Cloud Run)
- ✅ Modern tech stack (Next.js + TypeScript)
- ✅ ML-powered features (Python microservice)
- ✅ PWA capabilities (offline support)
- ✅ Scalable infrastructure (auto-scaling)
- ✅ Production-ready setup

Ready to build! 🚀

