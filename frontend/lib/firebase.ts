// Import the functions you need from the SDKs you need
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import type { Analytics } from "firebase/analytics";
import { getFunctions, Functions } from "firebase/functions";

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
let functions: Functions;
let analytics: Analytics | null = null;

if (typeof window !== "undefined") {
  // Only initialize on client side
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  auth = getAuth(app);
  
  // Initialize Firestore with offline persistence
  import("firebase/firestore").then(({ initializeFirestore, persistentLocalCache, persistentMultipleTabManager }) => {
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch (err) {
      // If already initialized or other error, fallback to getFirestore
      console.warn("Firestore persistence init failed or already initialized:", err);
      if (!db) db = getFirestore(app);
    }
  });

  // Fallback if async init hasn't finished when exported (though typically safe due to module loading)
  // We initialize db synchronously with getFirestore for immediate use, 
  // but the above async call will configure persistence if it's the first call.
  // Actually, to be safe and synchronous for exports, we should use enableIndexedDbPersistence 
  // but that is deprecated in favor of initializeFirestore with cache settings.
  // Let's use the standard synchronous getFirestore first, then enable persistence.
  
  db = getFirestore(app);
  
  import("firebase/firestore").then(({ enableIndexedDbPersistence }) => {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open');
      } else if (err.code == 'unimplemented') {
        console.warn('Firestore persistence not supported in this browser');
      }
    });
  });

  storage = getStorage(app);
  functions = getFunctions(app);
  
  // Defer Analytics initialization - load after page becomes interactive
  setTimeout(async () => {
    try {
      const { getAnalytics } = await import("firebase/analytics");
      analytics = getAnalytics(app);
    } catch (error) {
      console.warn("Analytics initialization failed:", error);
    }
  }, 3000);
} else {
  // Server-side: create dummy objects
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
  functions = {} as Functions;
}

export { app, auth, db, storage, functions, analytics };

