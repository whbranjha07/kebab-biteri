'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api-client'
import { firebaseConfig, vapidKey, isFirebaseConfigured } from '@/lib/firebase/config'

// ─── Types ──────────────────────────────────────

interface FcmState {
  supported: boolean
  configured: boolean
  permission: NotificationPermission
  enabled: boolean
  loading: boolean
  error: string | null
}

interface UseFcmResult extends FcmState {
  enable: () => Promise<boolean>
  disable: () => Promise<boolean>
}

// ─── Singleton messaging instance ───────────────

let messagingInstance: any = null
let firebaseApp: any = null

async function getMessaging() {
  if (messagingInstance) return { messaging: messagingInstance }
  if (typeof window === 'undefined') return null

  const { initializeApp } = await import('firebase/app')
  const { getMessaging } = await import('firebase/messaging')

  firebaseApp = initializeApp(firebaseConfig)
  messagingInstance = getMessaging(firebaseApp)

  return { messaging: messagingInstance }
}

let currentFcmToken: string | null = null

// ─── Helper: ensure service worker is registered ───
// This prevents the hang on navigator.serviceWorker.ready when no SW exists.

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null

  try {
    // First check if there's already a registration
    const existing = await navigator.serviceWorker.getRegistrations()
    if (existing.length > 0) return existing[0]

    // No SW registered — register the FCM service worker now
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
    // Wait for it to become active
    if (reg.active) return reg

    // Wait for activation with a timeout (don't hang forever)
    return await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(reg), 5000)
      reg.addEventListener('activate', () => {
        clearTimeout(timeout)
        resolve(reg)
      })
      // Also listen for installation completion
      if (reg.installing) {
        reg.installing.addEventListener('statechange', () => {
          if (reg.active) {
            clearTimeout(timeout)
            resolve(reg)
          }
        })
      }
    })
  } catch {
    return null
  }
}

// ─── Helper: wait for navigator.serviceWorker.ready with timeout ───

async function waitForServiceWorkerReady(timeoutMs = 5000): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null

  // Try to ensure a SW is registered first
  const reg = await ensureServiceWorker()
  if (!reg) return null

  // Now wait for .ready (should resolve quickly since we just ensured registration)
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<ServiceWorkerRegistration | null>((resolve) =>
        setTimeout(() => resolve(reg), timeoutMs),
      ),
    ])
  } catch {
    return reg
  }
}

// ─── Hook ───────────────────────────────────────

export function useFcm(onForegroundMessage?: (payload: any) => void): UseFcmResult {
  const [state, setState] = useState<FcmState>({
    supported: false,
    configured: false,
    permission: 'default',
    enabled: false,
    loading: false,
    error: null,
  })

  const onMessageRef = useRef(onForegroundMessage)
  onMessageRef.current = onForegroundMessage

  // ─── Init ───
  useEffect(() => {
    const checkSupport = () => {
      const hasNotification = typeof window !== 'undefined' && 'Notification' in window
      const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      const hasPushManager = typeof window !== 'undefined' && 'PushManager' in window
      return hasNotification && hasServiceWorker && hasPushManager
    }

    const supported = checkSupport()
    const configured = isFirebaseConfigured()

    setState((prev) => ({
      ...prev,
      supported,
      configured,
      permission: supported ? Notification.permission : 'denied',
    }))

    if (supported && configured) {
      const storedToken = localStorage.getItem('kb_fcm_token')
      if (storedToken) {
        currentFcmToken = storedToken
        setState((prev) => ({ ...prev, enabled: true }))
      }
    }
  }, [])

  // ─── Foreground message listener ──────────────
  useEffect(() => {
    if (!state.supported || !state.configured) return

    let unsubscribe: (() => void) | null = null

    getMessaging()
      .then(async ({ messaging }: any) => {
        if (onMessageRef.current) {
          const { onMessage } = await import('firebase/messaging')
          unsubscribe = onMessage(messaging, (payload: any) => {
            onMessageRef.current?.(payload)
          })
        }
      })
      .catch(() => {})

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [state.supported, state.configured])

  // ─── Enable ───
  const enable = useCallback(async (): Promise<boolean> => {
    if (!state.supported) {
      setState((prev) => ({ ...prev, error: 'Push notifications are not supported on this device.' }))
      return false
    }
    if (!state.configured) {
      setState((prev) => ({ ...prev, error: 'Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* env vars.' }))
      return false
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      // 1. Request notification permission
      const permission = await Notification.requestPermission()
      setState((prev) => ({ ...prev, permission }))

      if (permission !== 'granted') {
        setState((prev) => ({ ...prev, loading: false, enabled: false }))
        return false
      }

      // 2. Ensure service worker is registered (with timeout — no hanging)
      const swReg = await waitForServiceWorkerReady(5000)
      if (!swReg) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Service worker could not be registered. Try refreshing the page.',
        }))
        return false
      }

      // 3. Get FCM token
      const { getToken } = await import('firebase/messaging')
      const { messaging } = await getMessaging()

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swReg,
      })

      if (!token) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Failed to get notification token. Check your Firebase and VAPID key configuration.',
        }))
        return false
      }

      // 4. Register token with backend
      const oldToken = currentFcmToken
      if (oldToken && oldToken !== token) {
        await api.patch('/profile/fcm-token/remove', { token: oldToken }).catch(() => {})
      }

      currentFcmToken = token
      localStorage.setItem('kb_fcm_token', token)

      const deviceInfo = navigator.userAgent.slice(0, 100)
      await api.patch('/profile/fcm-token', { token, deviceInfo })

      setState((prev) => ({
        ...prev,
        loading: false,
        enabled: true,
        error: null,
      }))

      return true
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to enable notifications.'
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }))
      return false
    }
  }, [state.supported, state.configured])

  // ─── Disable ───
  const disable = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const token = currentFcmToken ?? localStorage.getItem('kb_fcm_token')

      if (token) {
        await api.patch('/profile/fcm-token/remove', { token }).catch(() => {})
        localStorage.removeItem('kb_fcm_token')
        currentFcmToken = null
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        enabled: false,
      }))

      return true
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to disable notifications.'
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }))
      return false
    }
  }, [])

  return {
    ...state,
    enable,
    disable,
  }
}

// ─── Token refresh on app focus ─────────────────

export async function initFcmTokenRefresh() {
  if (typeof window === 'undefined') return
  if (!isFirebaseConfigured()) return

  const checkAndRefreshToken = async () => {
    try {
      const storedToken = localStorage.getItem('kb_fcm_token')
      if (!storedToken) return

      const swReg = await waitForServiceWorkerReady(3000)
      if (!swReg) return

      const { getToken } = await import('firebase/messaging')
      const { messaging } = await getMessaging()

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swReg,
      })

      if (token && token !== storedToken) {
        await api.patch('/profile/fcm-token/remove', { token: storedToken }).catch(() => {})
        const deviceInfo = navigator.userAgent.slice(0, 100)
        await api.patch('/profile/fcm-token', { token, deviceInfo }).catch(() => {})
        localStorage.setItem('kb_fcm_token', token)
        currentFcmToken = token
      }
    } catch {
      // Silently fail
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkAndRefreshToken()
    }
  })
}
