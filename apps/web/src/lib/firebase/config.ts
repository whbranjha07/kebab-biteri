/**
 * Kebab Biteri — Firebase browser configuration
 *
 * All values come from NEXT_PUBLIC_ env vars (safe to expose in the browser).
 * Firebase Messaging + Firestore are only initialized in the browser — this
 * file is imported dynamically from client components, never from server code.
 */

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
}

export const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? ''

/**
 * Check whether all required Firebase config values are present.
 * Used to decide whether to show the "Enable Notifications" UI.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.projectId ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      (typeof window !== 'undefined' && 'Notification' in window)
  )
}

/**
 * True when we have enough config to talk to Firestore/Auth — used by the
 * realtime client to decide whether to attempt a subscription at all.
 */
export function isFirebaseCoreConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
}

// ─── Lazy-initialised singletons (browser only) ────────────────────────

let appPromise: Promise<any> | null = null
let firestorePromise: Promise<any> | null = null
let authPromise: Promise<any> | null = null

async function getFirebaseApp(): Promise<any | null> {
  if (typeof window === 'undefined') return null
  if (!isFirebaseCoreConfigured()) return null
  if (!appPromise) {
    appPromise = (async () => {
      const { initializeApp, getApps, getApp } = await import('firebase/app' as any)
      return getApps().length ? getApp() : initializeApp(firebaseConfig)
    })()
  }
  return appPromise
}

export async function getFirestoreClient(): Promise<any | null> {
  const app = await getFirebaseApp()
  if (!app) return null
  if (!firestorePromise) {
    firestorePromise = (async () => {
      const { getFirestore } = await import('firebase/firestore' as any)
      return getFirestore(app)
    })()
  }
  return firestorePromise
}

export async function getFirebaseAuth(): Promise<any | null> {
  const app = await getFirebaseApp()
  if (!app) return null
  if (!authPromise) {
    authPromise = (async () => {
      const { getAuth } = await import('firebase/auth' as any)
      return getAuth(app)
    })()
  }
  return authPromise
}
