/**
 * Mock Firebase for testing
 */

/// <reference types="jest" />

// Mock Firestore
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date(),
      toMillis: () => Date.now(),
    })),
    fromDate: jest.fn((date) => ({
      toDate: () => date,
      toMillis: () => date.getTime(),
    })),
  },
  serverTimestamp: jest.fn(() => ({
    toDate: () => new Date(),
    toMillis: () => Date.now(),
  })),
}

// Mock Auth
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: jest.fn((callback: (user: any) => void) => {
    callback(null)
    return jest.fn() // unsubscribe function
  }),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}

// Mock Firebase App
const mockApp = {
  auth: () => mockAuth,
  firestore: () => mockFirestore,
}

// Mock Firebase module
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => mockApp),
  getApps: jest.fn(() => []),
}))

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => mockAuth),
  onAuthStateChanged: jest.fn((auth: any, callback: (user: any) => void) => {
    callback(null)
    return jest.fn()
  }),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}))

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => mockFirestore),
  collection: jest.fn((db: any, path: string) => mockFirestore.collection(path)),
  doc: jest.fn((db: any, path: string, id?: string) => mockFirestore.doc(id)),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  limit: jest.fn(() => ({})),
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date(),
      toMillis: () => Date.now(),
    })),
    fromDate: jest.fn((date) => ({
      toDate: () => date,
      toMillis: () => date.getTime(),
    })),
  },
  serverTimestamp: jest.fn(() => ({
    toDate: () => new Date(),
    toMillis: () => Date.now(),
  })),
}))

export { mockFirestore, mockAuth, mockApp }

