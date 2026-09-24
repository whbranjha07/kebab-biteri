'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, X } from 'lucide-react'
import { useFcm } from '@/hooks/use-fcm'

const DISMISS_KEY = 'kb_admin_fcm_banner_dismissed_at'
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export function AdminNotificationBanner() {
  const fcm = useFcm()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY)
      if (!raw) { setDismissed(false); return }
      const at = Number(raw)
      setDismissed(Date.now() - at < DISMISS_TTL_MS)
    } catch { setDismissed(false) }
  }, [])

  if (!fcm.supported) {
    return (
      <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900">
        <BellOff className="mr-1 inline h-3.5 w-3.5" />
        This browser doesn't support push notifications. Install the PWA (iOS 16.4+) or use Chrome/Edge on Android/desktop.
      </div>
    )
  }

  if (!fcm.configured) {
    return (
      <div className="border-b border-danger/40 bg-danger/10 px-4 py-2 text-xs text-danger">
        Push not configured — missing <code>NEXT_PUBLIC_FIREBASE_*</code> env vars.
      </div>
    )
  }

  if (fcm.permission === 'denied') {
    return (
      <div className="border-b border-danger/40 bg-danger/10 px-4 py-2 text-xs text-danger">
        <BellOff className="mr-1 inline h-3.5 w-3.5" />
        Notifications blocked. Enable them in your browser settings for this site, then reload.
      </div>
    )
  }

  if (fcm.enabled || dismissed) return null

  const handleEnable = async () => {
    const ok = await fcm.enable()
    if (!ok && fcm.error) alert(fcm.error)
  }

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    setDismissed(true)
  }

  return (
    <div className="flex items-center gap-3 border-b border-amber-300 bg-[#FFF7DB] px-4 py-2 text-sm text-charcoal">
      <Bell className="h-4 w-4 shrink-0 text-amber-700" />
      <p className="flex-1">
        <span className="font-semibold">Enable order alerts</span> — get a push notification when a new order arrives, even when this tab isn't open.
      </p>
      <button
        onClick={handleEnable}
        disabled={fcm.loading}
        className="flex items-center gap-1 rounded-lg bg-charcoal px-3 py-1.5 text-xs font-bold text-white hover:bg-charcoal-900 disabled:opacity-50"
      >
        {fcm.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
        Enable
      </button>
      <button onClick={handleDismiss} aria-label="Dismiss" className="rounded p-1 hover:bg-amber-100">
        <X className="h-4 w-4 text-charcoal/60" />
      </button>
    </div>
  )
}
