// Kebab Biteri — Firebase Cloud Messaging Service Worker
// Handles push notifications when the app is in background / minimized / PWA

// Firebase compat libraries (loaded via importScripts — standard Firebase pattern)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// ─── Public Firebase config ──────────────────────────
// These are public values (safe to expose — they identify the Firebase project,
// not secrets). In production, replace with your actual values from Firebase Console.
// Alternatively, fetch from /firebase-config.json at runtime (see below).
//
// To avoid caching stale config, we try to fetch from the app first,
// then fall back to the values below.

const FALLBACK_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "kebab-biteri.firebaseapp.com",
  projectId: "kebab-biteri",
  storageBucket: "kebab-biteri.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
}

// Try to load config dynamically from the app (so we don't hardcode)
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch('/firebase-config.json')
        if (res.ok) {
          const config = await res.json()
          self._firebaseConfig = config
        }
      } catch (e) {
        // Fall back to hardcoded values
      }
      self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Initialize Firebase with config (dynamic if available, fallback otherwise)
const config = self._firebaseConfig || FALLBACK_CONFIG

try {
  firebase.initializeApp(config)
  const messaging = firebase.messaging()

  // ─── Background message handler ──────────────────────
  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {}
    const data = payload.data || {}

    const title = notification.title || '🍢 Kebab Biteri'
    const body = notification.body || ''

    const notificationOptions = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192-maskable.png',
      tag: data.orderNumber || data.orderId || 'kebab-biteri',
      data: {
        type: data.type || 'ORDER_STATUS',
        orderId: data.orderId || '',
        orderNumber: data.orderNumber || '',
        status: data.status || '',
        ...data,
      },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    }

    self.registration.showNotification(title, notificationOptions)
  })
} catch (e) {
  // Firebase not configured — silently skip
  console.warn('[FCM SW] Initialization skipped:', e.message)
}

// ─── Notification click handler ───────────────────────
// Opens the relevant Kebab Biteri page when the notification is clicked.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  const orderId = data.orderId
  const orderNumber = data.orderNumber

  // Determine the target URL
  let targetUrl = '/'
  if (orderId) {
    targetUrl = `/orders/${orderId}`
  } else if (orderNumber) {
    targetUrl = `/orders`
  }

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // Focus an existing tab if one is open
      for (const client of allClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            orderId,
            orderNumber,
            url: targetUrl,
          })
          return
        }
      }

      // No existing tab — open a new one
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })(),
  )
})
