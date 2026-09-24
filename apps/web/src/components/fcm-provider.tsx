'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useFcm, initFcmTokenRefresh } from '@/hooks/use-fcm'
import { toast } from '@/components/ui/toaster'

/**
 * FCM Provider — mounted once in the mobile layout.
 *
 * Responsibilities:
 * 1. Listen for foreground FCM messages and show a toast notification.
 * 2. Initialize token refresh listener.
 * 3. Listen for postMessage from the service worker (notification click).
 */
export function FcmProvider() {
  const router = useRouter()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const handleForegroundMessage = useCallback(
    (payload: any) => {
      const notification = payload?.notification || {}
      const data = payload?.data || {}

      const title = notification.title || '🍢 Kebab Biteri'
      const body = notification.body || ''

      // Use the existing toast system for foreground notifications
      toastRef.current.info(`${title} — ${body}`)
    },
    [],
  )

  // Initialize FCM hook (handles foreground messages + state)
  useFcm(handleForegroundMessage)

  useEffect(() => {
    // Initialize token refresh listener (runs once at app level)
    initFcmTokenRefresh()
  }, [])

  useEffect(() => {
    // Listen for notification click messages from the service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const url = event.data.url || '/'
        router.push(url)
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage)
    }
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
    }
  }, [router])

  return null
}
