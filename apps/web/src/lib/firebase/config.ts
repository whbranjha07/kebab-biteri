/**
 * Kebab Biteri — Firebase browser configuration
 *
 * All values come from NEXT_PUBLIC_ env vars (safe to expose in the browser).
 * Firebase Messaging is only initialized in the browser — this file is
 * imported dynamically from client components, never from server code.
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
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId &&
      vapidKey,
  )
}
