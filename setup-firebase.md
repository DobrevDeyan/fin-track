# Firebase Setup Guide

## 🚀 Quick Start

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase Project
```bash
cd /Users/deyandobrev/Repositories/fin-track
firebase init
```

**Select these services:**
- ✅ Firestore
- ✅ Functions
- ✅ Hosting
- ✅ Emulators

### 4. Install Dependencies
```bash
# Install frontend dependencies
cd frontend
npm install

# Install functions dependencies
cd ../functions
npm install
```

### 5. Configure Environment Variables

**Create `frontend/.env.local`:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 6. Start Development
```bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, start frontend
cd frontend
npm run dev
```

## 🔥 Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Authentication (Email/Password)
4. Enable Firestore Database
5. Get your config from Project Settings

## 📁 Project Structure

```
fin-track/
├── frontend/                 # Next.js app
│   ├── app/                 # App router pages
│   ├── contexts/            # Firebase auth context
│   ├── lib/                 # Firebase config
│   └── .env.local           # Environment variables
├── functions/               # Cloud Functions (Node.js)
│   ├── src/                # TypeScript source
│   └── package.json        # Dependencies
├── firebase.json           # Firebase config
├── firestore.rules         # Database security rules
└── firestore.indexes.json  # Database indexes
```

## 💰 Cost Benefits

| Service | Old (Railway) | New (Firebase) |
|---------|---------------|----------------|
| Database | $4.90/29 days | **FREE** |
| Backend | $0.17/day | **FREE** |
| Hosting | $0 | **FREE** |
| Auth | Custom built | **FREE** |
| **Total** | **~$5/month** | **$0/month** |

## 🎯 Next Steps

1. Set up Firebase project
2. Configure environment variables
3. Test with emulators
4. Deploy to production: `firebase deploy`
