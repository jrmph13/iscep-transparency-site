import type { Firestore } from 'firebase/firestore'
import type { Auth } from 'firebase/auth'

// Firebase web config for project "iscep-department". These values are NOT
// secret — they only identify the project; real protection is firestore.rules.
// Hard-coded so the Members roster works on deploy with no extra env setup;
// override any field with a VITE_FIREBASE_* env var to point at another project.
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCo-Uxgtf7iYgDy6jLzwroKUmacMZspLqg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'iscep-department.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'iscep-department',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '78066113215',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:78066113215:web:8c0b998410503c1041840a',
}

/** True when a Firebase project is configured (always true here). */
export const firebaseEnabled = Boolean(cfg.apiKey && cfg.projectId && cfg.appId)

let appPromise: Promise<import('firebase/app').FirebaseApp> | null = null
let dbPromise: Promise<Firestore> | null = null
let authPromise: Promise<Auth> | null = null

function getApp() {
  if (!appPromise) {
    appPromise = import('firebase/app').then(({ initializeApp }) => initializeApp(cfg))
  }
  return appPromise
}

/**
 * Lazily loads the Firestore SDK (a separate chunk) and returns the db.
 * The SDK is only downloaded once something actually calls this.
 */
export function getDb(): Promise<Firestore> | null {
  if (!firebaseEnabled) return null
  if (!dbPromise) {
    dbPromise = (async () => {
      const [app, { getFirestore }] = await Promise.all([getApp(), import('firebase/firestore')])
      return getFirestore(app)
    })()
  }
  return dbPromise
}

/**
 * Lazily loads the Firebase Auth SDK — only pulled in on the admin route.
 */
export function getAuthInstance(): Promise<Auth> | null {
  if (!firebaseEnabled) return null
  if (!authPromise) {
    authPromise = (async () => {
      const [app, { getAuth }] = await Promise.all([getApp(), import('firebase/auth')])
      return getAuth(app)
    })()
  }
  return authPromise
}
