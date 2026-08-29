'use client'

import { useState, useEffect } from 'react'
import { Store, CreditCard, Bell, Globe, Shield, Save, DollarSign, Clock, Phone, Mail, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { api } from '@/lib/api-client'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    storeName: 'Kebab Biteri',
    tagline: 'Auténtico Kebab & Parrilla',
    logoUrl: '/icons/icon-512.png',
    phone1: '+34 943 00 00 00',
    phone2: '+34 600 00 00 00',
    email: 'info@kebabbiteri.com',
    address: 'Calle Gran Vía 45, Madrid',
    minOrderAmount: 11.0,
    deliveryFee: 2.5,
    freeDeliveryThreshold: 11.0,
    openingHours: '12:30 - 23:30',
    defaultLanguage: 'es-ES',
    currency: 'EUR',
    currencySymbol: '€',
    ordersEnabled: true,
    adminEmailNotifications: true,
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get<any>('/admin/settings')
        if (res) {
          setForm((prev) => ({ ...prev, ...res }))
        }
      } catch (e) {}
      setLoading(false)
    }
    fetchSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch('/admin/settings', form)
      toast.success('Admin settings saved successfully to MongoDB! ⚙️')
    } catch (err: any) {
      toast.error(err.message || 'Could not save admin settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#F4BE2C] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-sans text-2xl font-black text-zinc-950">Restaurant & Admin Settings</h1>
        <p className="mt-1 text-xs font-semibold text-zinc-500">
          Configure store identity, delivery rules, notifications, localization, and system security
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Restaurant General Info */}
        <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-sans text-base font-black text-zinc-950 flex items-center gap-2 border-b border-amber-100 pb-3">
            <Store className="h-5 w-5 text-[#D99F16]" /> Restaurant Identity & Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Store Name</label>
              <input
                type="text"
                required
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Tagline / Slogan</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-semibold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Contact Phone 1</label>
              <input
                type="text"
                value={form.phone1}
                onChange={(e) => setForm({ ...form, phone1: e.target.value })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-semibold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Contact Phone 2</label>
              <input
                type="text"
                value={form.phone2}
                onChange={(e) => setForm({ ...form, phone2: e.target.value })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-semibold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase text-zinc-950">Street Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-semibold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Ordering & Delivery Parameters */}
        <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-sans text-base font-black text-zinc-950 flex items-center gap-2 border-b border-amber-100 pb-3">
            <DollarSign className="h-5 w-5 text-[#D99F16]" /> Ordering & Delivery Rules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Minimum Order (€)</label>
              <input
                type="number"
                step="0.50"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Delivery Fee (€)</label>
              <input
                type="number"
                step="0.50"
                value={form.deliveryFee}
                onChange={(e) => setForm({ ...form, deliveryFee: Number(e.target.value) })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Free Delivery Over (€)</label>
              <input
                type="number"
                step="0.50"
                value={form.freeDeliveryThreshold}
                onChange={(e) => setForm({ ...form, freeDeliveryThreshold: Number(e.target.value) })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase text-zinc-950">Opening Hours</label>
              <input
                type="text"
                value={form.openingHours}
                onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
                placeholder="12:30 - 23:30"
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-semibold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <div>
                <p className="text-xs font-black text-zinc-950">Accepting Orders</p>
                <p className="text-[10px] font-semibold text-zinc-500">Toggle store online status</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, ordersEnabled: !form.ordersEnabled })}
                className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${form.ordersEnabled ? 'bg-[#F4BE2C]' : 'bg-zinc-300'}`}
              >
                <div className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${form.ordersEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* System & Localization Settings */}
        <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-sans text-base font-black text-zinc-950 flex items-center gap-2 border-b border-amber-100 pb-3">
            <Globe className="h-5 w-5 text-[#D99F16]" /> System & Localization
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Default System Language</label>
              <select
                value={form.defaultLanguage}
                onChange={(e) => setForm({ ...form, defaultLanguage: e.target.value })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              >
                <option value="es-ES">Spanish (Español 🇪🇸)</option>
                <option value="en-US">English (🇬🇧)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Currency Symbol</label>
              <input
                type="text"
                value={form.currencySymbol}
                onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <Button
            type="submit"
            size="xl"
            loading={saving}
            disabled={saving}
            className="w-full md:w-auto font-black px-8"
          >
            <Save className="h-5 w-5 stroke-[2.5]" /> Save All Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
