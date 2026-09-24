'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ChevronLeft, Bell, BellOff, Loader2, Send, CheckCircle2, XCircle, Smartphone, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { useFcm } from '@/hooks/use-fcm'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-client'

export default function NotificationsTestPage() {
  const { user, loading: authLoading } = useAuth()
  const fcm = useFcm()
  const [sending, setSending] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [swRegistered, setSwRegistered] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        setSwRegistered(regs.length > 0)
      })
    }
  }, [])

  const handleEnable = async () => {
    if (!user) {
      toast.info('Please log in first to enable notifications')
      return
    }
    const ok = await fcm.enable()
    if (ok) {
      toast.success('Notifications enabled')
      setTestResult(null)
    } else if (fcm.error) {
      toast.error(fcm.error)
    }
  }

  const handleDisable = async () => {
    const ok = await fcm.disable()
    if (ok) {
      toast.success('Notifications disabled')
      setTestResult(null)
    }
  }

  const sendTestNotification = async () => {
    if (!user) {
      toast.info('Please log in first')
      return
    }
    if (!fcm.enabled) {
      toast.info('Enable notifications first')
      return
    }

    setSending(true)
    setTestResult(null)

    try {
      const order = await api.post('/orders', {
        items: [{ productName: 'Test Kebab', unitPrice: 10, quantity: 1 }],
        orderType: 'PICKUP',
        paymentMethod: 'CASH',
      }) as any

      if (!order?._id) throw new Error('Failed to create test order')

      setTestResult('Test order #' + order.orderNumber + ' created. Login as admin at /admin and change the status to trigger a push notification.')
      toast.success('Order #' + order.orderNumber + ' created!')
    } catch (err: any) {
      setTestResult('Error: ' + err.message)
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const sendForegroundTest = () => {
    toast.info('Kebab Biteri — Test notification: your order #TEST001 is being prepared.')
    setTestResult('Foreground toast notification shown. In production, this would come from FCM.')
  }

  const sendBrowserNotification = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      toast.info('Enable notifications first')
      return
    }
    new Notification('Kebab Biteri', {
      body: 'Test notification — your order #TEST001 has been confirmed.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192-maskable.png',
      tag: 'TEST001',
    })
    setTestResult('Browser notification sent! Check your system notification center.')
  }

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="safe-top sticky top-0 z-20 bg-surface/95 px-4 pb-3 pt-3 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="touch-target -ml-2 flex items-center justify-center rounded-full">
            <ChevronLeft className="h-6 w-6 text-charcoal" />
          </Link>
          <h1 className="font-display text-xl font-extrabold text-charcoal">Notification Testing</h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-6">
        {/* Status Dashboard */}
        <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-subtle">Status</h2>

          <div className="flex items-center gap-3">
            {user ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-danger" />}
            <span className="text-sm font-medium text-charcoal">Logged in</span>
            <span className="ml-auto text-xs text-subtle">{user ? user.firstName + ' ' + user.lastName : 'Not logged in'}</span>
          </div>

          <div className="flex items-center gap-3">
            {fcm.supported ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-danger" />}
            <span className="text-sm font-medium text-charcoal">Browser supports push</span>
            <span className="ml-auto text-xs text-subtle">{fcm.supported ? 'Yes' : 'No'}</span>
          </div>

          <div className="flex items-center gap-3">
            {fcm.configured ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-danger" />}
            <span className="text-sm font-medium text-charcoal">Firebase configured</span>
            <span className="ml-auto text-xs text-subtle">{fcm.configured ? 'Yes' : 'No'}</span>
          </div>

          <div className="flex items-center gap-3">
            {swRegistered ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-danger" />}
            <span className="text-sm font-medium text-charcoal">Service worker</span>
            <span className="ml-auto text-xs text-subtle">{swRegistered ? 'Registered' : 'Not registered'}</span>
          </div>

          <div className="flex items-center gap-3">
            <Bell className={cn('h-5 w-5', fcm.permission === 'granted' ? 'text-success' : 'text-muted')} />
            <span className="text-sm font-medium text-charcoal">Permission</span>
            <span className="ml-auto text-xs text-subtle">{fcm.permission}</span>
          </div>

          <div className="flex items-center gap-3">
            {fcm.enabled ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-muted" />}
            <span className="text-sm font-medium text-charcoal">FCM token registered</span>
            <span className="ml-auto text-xs text-subtle">{fcm.enabled ? 'Yes' : 'No'}</span>
          </div>
        </div>

        {/* Enable/Disable */}
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-4">
            {fcm.enabled ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted" />}
            <div className="flex-1">
              <span className="block text-sm font-bold text-charcoal">Push Notifications</span>
              <span className="block text-xs text-subtle">{fcm.loading ? 'Working...' : fcm.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            {fcm.loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            ) : (
              <button
                onClick={fcm.enabled ? handleDisable : handleEnable}
                disabled={!fcm.supported || !fcm.configured || fcm.permission === 'denied'}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  fcm.enabled ? 'bg-primary' : 'bg-border',
                  (!fcm.supported || !fcm.configured || fcm.permission === 'denied') && 'opacity-50 cursor-not-allowed',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  fcm.enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
                )} />
              </button>
            )}
          </div>
          {!user && (
            <div className="px-4 py-2.5 border-t border-border bg-amber-50/50">
              <p className="text-xs text-muted">
                <Link href="/profile/login" className="font-bold text-primary underline">Log in</Link> to register your device token.
              </p>
            </div>
          )}
          {fcm.error && (
            <div className="px-4 py-2.5 border-t border-border bg-red-50/50">
              <p className="text-xs text-danger">{fcm.error}</p>
            </div>
          )}
        </div>

        {/* Test Actions */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-subtle">Test Notifications</h2>

          <Button fullWidth onClick={sendBrowserNotification} disabled={fcm.permission !== 'granted'}>
            <Bell className="h-4 w-4" />
            Test Browser Notification
          </Button>

          <Button fullWidth variant="outline" onClick={sendForegroundTest}>
            <Send className="h-4 w-4" />
            Test Foreground Toast
          </Button>

          <Button fullWidth variant="outline" onClick={sendTestNotification} disabled={!user || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            Create Test Order
          </Button>
        </div>

        {/* Result */}
        {testResult && (
          <div className="rounded-2xl border border-border bg-amber-50/50 p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-charcoal">{testResult}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-2xl border border-border bg-white p-4 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-subtle">How to test end-to-end</h2>
          <ol className="space-y-1.5 text-xs text-muted">
            <li><span className="font-bold text-charcoal">1.</span> Log in as a customer</li>
            <li><span className="font-bold text-charcoal">2.</span> Toggle Push Notifications ON</li>
            <li><span className="font-bold text-charcoal">3.</span> Allow browser notification permission</li>
            <li><span className="font-bold text-charcoal">4.</span> FCM token is generated and saved to MongoDB</li>
            <li><span className="font-bold text-charcoal">5.</span> Place an order or use Create Test Order</li>
            <li><span className="font-bold text-charcoal">6.</span> Login as admin at /admin</li>
            <li><span className="font-bold text-charcoal">7.</span> Change the order status to trigger push</li>
          </ol>
        </div>

        <p className="text-center text-xs text-subtle">Kebab Biteri - Notification Testing</p>
      </div>
    </div>
  )
}
