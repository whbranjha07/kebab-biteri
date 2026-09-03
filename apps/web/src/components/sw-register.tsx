'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Allow SW registration in both dev and production for FCM testing
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        // Register the Firebase Messaging service worker first.
        // Firebase needs this SW to be registered and active to handle
        // background push notifications.
        const fcmReg = await navigator.serviceWorker
          .register('/firebase-messaging-sw.js', { scope: '/' })
          .catch(() => null)

        // Also register the app-shell service worker for offline caching.
        // If both SWs have the same scope, the browser keeps the last one
        // registered as the controlling SW. To avoid conflicts, we register
        // the app SW only if FCM SW registration failed (different scope).
        if (!fcmReg) {
          await navigator.serviceWorker.register('/sw.js').catch(() => {})
        }
      } catch {
        // Silently fail — SW is progressive enhancement
      }
    }

    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
