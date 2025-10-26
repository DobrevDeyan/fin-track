'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

interface FirebaseAuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    username: string
  }) => Promise<void>
  logout: () => Promise<void>
  updateUserProfile: (data: any) => Promise<void>
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined)

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext)
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider')
  }
  return context
}

interface FirebaseAuthProviderProps {
  children: ReactNode
}

export const FirebaseAuthProvider: React.FC<FirebaseAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user profile exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (!userDoc.exists()) {
          // Create user profile if it doesn't exist
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ')[1] || '',
            username: user.email?.split('@')[0] || '',
            timezone: 'UTC',
            currency: 'USD',
            language: 'en',
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      }
      setUser(user)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Login failed:', error)
      throw new Error(error.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    username: string
  }) => {
    try {
      setIsLoading(true)
      const { user } = await createUserWithEmailAndPassword(auth, userData.email, userData.password)
      
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: `${userData.firstName} ${userData.lastName}`
      })

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        timezone: 'UTC',
        currency: 'USD',
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      router.push('/dashboard')
    } catch (error: any) {
      console.error('Registration failed:', error)
      throw new Error(error.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      router.push('/auth/login')
    } catch (error: any) {
      console.error('Logout failed:', error)
      throw new Error(error.message || 'Logout failed')
    }
  }

  const updateUserProfile = async (data: any) => {
    if (!user) throw new Error('No user logged in')
    
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...data,
        updatedAt: new Date()
      }, { merge: true })
    } catch (error: any) {
      console.error('Profile update failed:', error)
      throw new Error(error.message || 'Profile update failed')
    }
  }

  const value: FirebaseAuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUserProfile
  }

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  )
}
