'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Bell, Tag, Sparkles, Mail, Smartphone, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, getAccessToken } from '@/lib/api-client'
import { toast } from '@/components/ui/toaster'
import { useI18n } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/language-switcher'

export default function NotificationSettingsPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [prefs, setPrefs] = useState({
    orderUpdates: true,
    promotional: true,
    specialOffers: true,
    push: true,
    email: true,
  })

  useEffect(() => {
    const fetchPrefs = async () => {
      const token = getAccessToken()
      if (token) {
        try {
          const res = await api.get<{ user: any }>('/profile')
          if (res?.user?.notificationPreferences) {
            setPrefs(res.user.notificationPreferences)
          }
        } catch (e) {}
      }
      setLoading(false)
    }
    fetchPrefs()
  }, [])

  const handleToggle = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = getAccessToken()
      if (token) {
        await api.patch('/profile', { notificationPreferences: prefs })
      }
      toast.success('Notification preferences saved successfully! 🔔')
    } catch (e: any) {
      toast.error(e.message || 'Could not save notification preferences')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#FFFDF2]">
      <header className="safe-top sticky top-0 lg:top-[65px] z-20 bg-white/95 px-4 pb-3 pt-3 backdrop-blur-lg border-b border-amber-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="touch-target -ml-2 flex items-center justify-center rounded-full">
              <ChevronLeft className="h-6 w-6 text-zinc-950" />
            </Link>
            <h1 className="font-sans text-xl font-black text-zinc-950">{t('profile.notifications')}</h1>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-28 space-y-5">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#F4BE2C] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Category 1: Activity Notifications */}
            <div className="rounded-3xl bg-white p-5 border border-amber-200 shadow-sm space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#D99F16]">Activity & Orders</h2>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D99F16] border border-amber-200">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-zinc-950">Order Updates</p>
                    <p className="text-xs font-semibold text-zinc-500">Real-time status of your food preparation & delivery</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('orderUpdates')}
                  className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${prefs.orderUpdates ? 'bg-[#F4BE2C]' : 'bg-zinc-300'}`}
                >
                  <div className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${prefs.orderUpdates ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="border-t border-amber-100 pt-3 flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D99F16] border border-amber-200">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-zinc-950">Special Offers & Deals</p>
                    <p className="text-xs font-semibold text-zinc-500">Exclusive weekend coupons and combo discounts</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('specialOffers')}
                  className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${prefs.specialOffers ? 'bg-[#F4BE2C]' : 'bg-zinc-300'}`}
                >
                  <div className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${prefs.specialOffers ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="border-t border-amber-100 pt-3 flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D99F16] border border-amber-200">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-zinc-950">Promotional Marketing</p>
                    <p className="text-xs font-semibold text-zinc-500">New menu items and seasonal specials</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('promotional')}
                  className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${prefs.promotional ? 'bg-[#F4BE2C]' : 'bg-zinc-300'}`}
                >
                  <div className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${prefs.promotional ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Category 2: Notification Channels */}
            <div className="rounded-3xl bg-white p-5 border border-amber-200 shadow-sm space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#D99F16]">Delivery Channels</h2>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D99F16] border border-amber-200">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-zinc-950">Push Notifications</p>
                    <p className="text-xs font-semibold text-zinc-500">Alerts delivered directly to your device</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('push')}
                  className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${prefs.push ? 'bg-[#F4BE2C]' : 'bg-zinc-300'}`}
                >
                  <div className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${prefs.push ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="border-t border-amber-100 pt-3 flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D99F16] border border-amber-200">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-zinc-950">Email Receipts & Updates</p>
                    <p className="text-xs font-semibold text-zinc-500">Itemized invoices sent to your registered email</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('email')}
                  className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${prefs.email ? 'bg-[#F4BE2C]' : 'bg-zinc-300'}`}
                >
                  <div className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${prefs.email ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <Button
              size="lg"
              fullWidth
              onClick={handleSave}
              loading={saving}
              disabled={saving}
              className="mt-6 font-black"
            >
              <Save className="h-5 w-5 stroke-[2.5]" /> Save Preferences
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
