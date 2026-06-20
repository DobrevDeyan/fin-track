"use client"

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  AuthError,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getAuthErrorMessage } from "@/lib/utils";
import { useSessionTimeout } from "@/lib/session-timeout"
import { logger } from "@/lib/utils/logger";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to create or update user document in Firestore
const createUserDocument = async (user: User, isNewUser: boolean = false) => {
  if (!user || typeof window === "undefined") return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  // Extract user data
  const displayName = user.displayName || "";
  const nameParts = displayName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  const email = user.email || "";
  const username = email.split("@")[0] || "";
  const avatarUrl = user.photoURL || "";
  
  // Get provider info
  const providerData = user.providerData[0];
  const providerId = providerData?.providerId || "password";

  const userData = {
    email,
    username,
    firstName,
    lastName,
    avatarUrl,
    currency: "EUR",
    language: "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    providerId,
    updatedAt: serverTimestamp(),
  };

  if (!userSnap.exists() || isNewUser) {
    // Create new user document — onboardingCompleted: false triggers the onboarding flow
    await setDoc(userRef, {
      ...userData,
      onboardingCompleted: false,
      createdAt: serverTimestamp(),
    });
  } else {
    // Existing user: only refresh auth-derived fields. Do NOT write currency,
    // language, username, or names here — those are user-editable in Settings and
    // would otherwise be reset to their defaults ("EUR"/"en") on every login/refresh.
    await setDoc(
      userRef,
      {
        email,
        avatarUrl,
        providerId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Use session timeout service
  useSessionTimeout(!!user, {
    onWarning: (timeLeftMinutes) => {
      if (typeof window !== "undefined" && window.confirm(
        `You've been inactive for a while. You'll be logged out in ${timeLeftMinutes} minute${timeLeftMinutes !== 1 ? 's' : ''} due to inactivity. Click OK to stay logged in.`
      )) {
        return true; // User clicked OK, reset timer
      }
      return false; // User cancelled, don't reset
    },
    onTimeout: async () => {
      await signOut(auth);
      // The onAuthStateChanged listener will set user to null
      // Components watching the user state will handle navigation
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      // Create or update user document in Firestore when auth state changes.
      // Pass isNewUser=true when the doc doesn't exist yet so onboardingCompleted is initialised.
      if (user) {
        try {
          const { doc: _doc, getDoc: _getDoc } = await import("firebase/firestore");
          const snap = await _getDoc(_doc(db, "users", user.uid));
          await createUserDocument(user, !snap.exists());
        } catch (error) {
          logger.error("Error creating user document", error, { critical: true });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Ensure user document exists (in case it wasn't created before)
      if (userCredential.user) {
        await createUserDocument(userCredential.user);
      }
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(getAuthErrorMessage(authError.code));
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create user document for new user
      if (userCredential.user) {
        await createUserDocument(userCredential.user, true);
      }
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(getAuthErrorMessage(authError.code));
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      // Check if this is a new user or existing user
      const isNewUser = userCredential.user.metadata.creationTime === userCredential.user.metadata.lastSignInTime;
      if (userCredential.user) {
        await createUserDocument(userCredential.user, isNewUser);
      }
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(getAuthErrorMessage(authError.code));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // The onAuthStateChanged listener will set user to null
      // Components watching the user state will handle navigation
    } catch (error) {
      logger.error("Logout error", error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

