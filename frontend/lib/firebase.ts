// Import the functions you need from the SDKs you need
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAj_TioYX7kZsDm9uuKPVrf8BwuOmaN1hA",
  authDomain: "fin-track-adc2c.firebaseapp.com",
  projectId: "fin-track-adc2c",
  storageBucket: "fin-track-adc2c.firebasestorage.app",
  messagingSenderId: "185936461123",
  appId: "1:185936461123:web:90b48701c1a520457383f6",
  measurementId: "G-YRYCTR1THT"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | null = null;

if (typeof window !== "undefined") {
  // Only initialize on client side
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  // Initialize Analytics only in browser
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    // Analytics might fail if already initialized
    console.warn("Analytics initialization failed:", error);
  }
} else {
  // Server-side: create dummy objects
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
}

export { app, auth, db, storage, analytics };

