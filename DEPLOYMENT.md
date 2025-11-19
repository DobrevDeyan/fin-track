# FinTrack Deployment Guide

## 🚀 Complete Deployment Guide

This guide covers deploying all components of FinTrack:
1. **Frontend** (Next.js) → Firebase Hosting
2. **Backend** (Firebase Functions) → Firebase
3. **ML Service** (Python/FastAPI) → Google Cloud Run

---

## 📋 Prerequisites

### Required Accounts
1. **Google Cloud Platform** (GCP)
   - Sign up: https://cloud.google.com
   - Free tier: $300 credit for 90 days
   - Enable billing (won't charge if you stay in free tier)

2. **Firebase** (part of GCP)
   - Go to: https://console.firebase.google.com
   - Create project (or use existing GCP project)

### Required Tools
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Install Google Cloud SDK
# Windows: Download from https://cloud.google.com/sdk/docs/install
# Mac: brew install google-cloud-sdk
# Linux: https://cloud.google.com/sdk/docs/install

# Install Docker (for local testing)
# Download from: https://www.docker.com/products/docker-desktop
```

### Authentication
```bash
# Login to Firebase
firebase login

# Login to Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

---

## 1️⃣ Deploy ML Microservice to Google Cloud Run

### Step 1: Prepare ML Service

```bash
cd ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Test locally first
uvicorn app.main:app --reload --port 8001
# Visit: http://localhost:8001/docs
```

### Step 2: Build and Deploy

**Option A: Deploy from Source (Recommended)**
```bash
# From ml-service directory
gcloud run deploy ml-service \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 60 \
  --set-env-vars "MODEL_PATH=/app/models"
```

**Option B: Build Docker Image First**
```bash
# Build image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ml-service

# Deploy
gcloud run deploy ml-service \
  --image gcr.io/YOUR_PROJECT_ID/ml-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1
```

### Step 3: Get Service URL

After deployment, you'll get a URL like:
```
https://ml-service-xxxxx-uc.a.run.app
```

Save this URL - you'll need it for the frontend!

### Step 4: Test Deployment

```bash
# Test health endpoint
curl https://ml-service-xxxxx-uc.a.run.app/health

# Test classification
curl -X POST https://ml-service-xxxxx-uc.a.run.app/classify \
  -H "Content-Type: application/json" \
  -d '{"description": "Starbucks Coffee", "amount": 5.50}'
```

### Step 5: Configure CORS (if needed)

The ML service should already have CORS configured, but verify:
```python
# In app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 2️⃣ Deploy Frontend to Firebase Hosting

### Step 1: Build Next.js App

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
# Create .env.production
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_ML_SERVICE_URL=https://ml-service-xxxxx-uc.a.run.app

# Build
npm run build
```

### Step 2: Configure Firebase Hosting

Ensure `firebase.json` has hosting config:
```json
{
  "hosting": {
    "public": "frontend/.next",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/service-worker.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=0, must-revalidate"
          }
        ]
      }
    ]
  }
}
```

### Step 3: Deploy

```bash
# From project root
firebase deploy --only hosting
```

Your app will be live at:
```
https://YOUR_PROJECT_ID.web.app
```

---

## 3️⃣ Deploy Firebase Functions

### Step 1: Build Functions

```bash
cd functions
npm install
npm run build
```

### Step 2: Deploy

```bash
# From project root
firebase deploy --only functions
```

Functions will be available at:
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api
```

---

## 4️⃣ Configure Environment Variables

### Frontend Environment Variables

**For Production (Firebase Hosting):**
```bash
# Set in Firebase Console
# Go to: Firebase Console > Project Settings > Hosting > Environment Variables

# Or use .env.production (for build time)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_ML_SERVICE_URL=https://ml-service-xxxxx-uc.a.run.app
```

### Cloud Run Environment Variables

```bash
# Update ML service environment
gcloud run services update ml-service \
  --set-env-vars "MODEL_PATH=/app/models,LOG_LEVEL=info"
```

---

## 5️⃣ Set Up Firestore Security Rules

Deploy security rules:
```bash
firebase deploy --only firestore:rules
```

Example rules in `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    match /categories/{categoryId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 6️⃣ Set Up Firestore Indexes

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

---

## 🔍 Verify Deployment

### Check All Services

1. **Frontend**: Visit `https://YOUR_PROJECT_ID.web.app`
2. **ML Service**: `curl https://ml-service-xxxxx-uc.a.run.app/health`
3. **Firebase Functions**: Check Firebase Console > Functions
4. **Firestore**: Check Firebase Console > Firestore

### Test End-to-End

1. Register a new user
2. Add a transaction
3. Verify ML classification works
4. Check Firestore for data

---

## 🔄 Update Deployment

### Update ML Service

```bash
cd ml-service
# Make changes...
gcloud run deploy ml-service --source .
```

### Update Frontend

```bash
cd frontend
# Make changes...
npm run build
firebase deploy --only hosting
```

### Update Functions

```bash
cd functions
# Make changes...
npm run build
firebase deploy --only functions
```

---

## 🐛 Troubleshooting

### ML Service Issues

**Cold Start Too Slow?**
```bash
# Set min-instances to 1 (costs more but no cold starts)
gcloud run services update ml-service --min-instances 1
```

**Out of Memory?**
```bash
# Increase memory
gcloud run services update ml-service --memory 2Gi
```

**CORS Errors?**
- Check CORS configuration in `app/main.py`
- Verify allowed origins include your frontend domain

### Frontend Issues

**Build Fails?**
- Check `next.config.js` for errors
- Verify all environment variables are set
- Clear `.next` folder: `rm -rf .next`

**PWA Not Working?**
- Check `manifest.json` exists
- Verify service worker is registered
- Check browser console for errors

### Firebase Issues

**Functions Not Deploying?**
- Check `functions/package.json` for correct Node version
- Verify `firebase.json` has functions config
- Check Firebase Console for error logs

---

## 📊 Monitoring

### Cloud Run Logs
```bash
gcloud run services logs read ml-service --limit 50
```

### Firebase Logs
```bash
firebase functions:log
```

### Cloud Console
- **Cloud Run**: https://console.cloud.google.com/run
- **Firebase**: https://console.firebase.google.com
- **Cloud Logging**: https://console.cloud.google.com/logs

---

## 💰 Cost Monitoring

### Check Usage
```bash
# Cloud Run usage
gcloud billing accounts list
gcloud billing projects describe YOUR_PROJECT_ID

# Firebase usage
# Check in Firebase Console > Usage and Billing
```

### Set Budget Alerts
1. Go to: https://console.cloud.google.com/billing
2. Create budget
3. Set alert threshold (e.g., $5/month)
4. Get email notifications

---

## ✅ Deployment Checklist

- [ ] Google Cloud project created
- [ ] Firebase project created
- [ ] ML service deployed to Cloud Run
- [ ] ML service URL saved
- [ ] Frontend environment variables set
- [ ] Frontend deployed to Firebase Hosting
- [ ] Firebase Functions deployed
- [ ] Firestore rules deployed
- [ ] Firestore indexes deployed
- [ ] End-to-end testing completed
- [ ] Monitoring set up
- [ ] Budget alerts configured

---

## 🎯 Next Steps

1. **Monitor Performance**: Check Cloud Run metrics
2. **Optimize Costs**: Review usage, adjust min-instances
3. **Scale**: Increase max-instances if needed
4. **Update Models**: Retrain and redeploy ML service
5. **Add Features**: Deploy updates incrementally

---

**Your app is now live and ready for users! 🚀**

