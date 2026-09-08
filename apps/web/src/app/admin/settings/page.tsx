'use client'

import { useState, useEffect } from 'react'
import { Store, Bell, CreditCard, Globe, Shield, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { api } from '@/lib/api-client'

const settingsSections = [
  { icon: Store, title: 'Restaurant info', desc: 'Name, logo, brand colors' },
  { icon: CreditCard, title: 'Payments', desc: 'Stripe, Redsys, Bizum configuration' },
  { icon: Bell, title: 'Notifications', desc: 'Firebase Cloud Messaging, templates' },
  { icon: Globe, title: 'Language & region', desc: 'English (default), Spanish' },
  { icon: Shield, title: 'Security & privacy', desc: 'GDPR, consent, data management' },
]

export default function AdminSettingsPage() {
  const [form, setForm] = useState<any>({
    defaultLanguage: 'es-ES',
    currencySymbol: '€',
    printerName: 'Kebab Biteri Counter Printer',
    printerConnectionType: 'BRIDGE',
    printerPaperSize: '80mm',
    printerBridgeUrl: 'http://localhost:9123',
    printerIp: '192.168.1.100',
    receiptPrefix: 'KB-',
    autoPrintReceipt: true,
    openCashDrawerOnCash: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<any>('/admin/settings')
      .then((data) => {
        if (data) setForm((prev: any) => ({ ...prev, ...data }))
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch('/admin/settings', form)
      toast.success('Settings saved successfully')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal">Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage your restaurant configuration</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
        {settingsSections.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.title} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-charcoal">{s.title}</p>
                <p className="text-sm text-muted">{s.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Real Thermal Printer Configuration */}
        <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3">
            <h2 className="font-sans text-base font-black text-zinc-950 flex items-center gap-2">
              <Store className="h-5 w-5 text-[#D99F16]" /> Thermal Receipt Printer Settings
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const bridgeUrl = form.printerBridgeUrl || 'http://localhost:9123'
                    const res = await fetch(`${bridgeUrl}/status`).catch(() => null)
                    if (res && res.ok) {
                      toast.success('🟢 Kebab Biteri Counter Printer Connected & Ready')
                    } else {
                      toast.error('🔴 Printer / Print Bridge Disconnected')
                    }
                  } catch (e) {
                    toast.error('🔴 Printer / Print Bridge Disconnected')
                  }
                }}
                className="rounded-xl bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900 hover:bg-amber-200"
              >
                Check Connection Status
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const testRes = await api.post<any>('/admin/billing/print-test', {})
                    if (testRes && testRes.testReceipt) {
                      const bridgeUrl = form.printerBridgeUrl || 'http://localhost:9123'
                      const printRes = await fetch(`${bridgeUrl}/print`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          connectionType: form.printerConnectionType || 'BRIDGE',
                          printerIp: form.printerIp,
                          printerPort: form.printerPort,
                          rawBuffer: [27, 64, 27, 97, 1, 27, 33, 16, 75, 69, 66, 65, 66, 32, 66, 73, 84, 69, 82, 73, 10],
                          receiptNumber: 'TEST-000',
                        }),
                      }).catch(() => null)

                      if (printRes && printRes.ok) {
                        toast.success('Physical printer test command dispatched!')
                      } else {
                        toast.error('Test receipt generated on server, but local Print Bridge was unreachable.')
                      }
                    }
                  } catch (err: any) {
                    toast.error('Could not initiate test print')
                  }
                }}
                className="rounded-xl bg-[#F4BE2C] px-3 py-1 text-xs font-black text-zinc-950 hover:bg-amber-400"
              >
                Print Test Receipt
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Printer Name</label>
              <input
                type="text"
                value={form.printerName || 'Kebab Biteri Counter Printer'}
                onChange={(e) => setForm({ ...form, printerName: e.target.value })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Connection Type</label>
              <select
                value={form.printerConnectionType || 'BRIDGE'}
                onChange={(e) => setForm({ ...form, printerConnectionType: e.target.value })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              >
                <option value="BRIDGE">Local Print Bridge (HTTP daemon on PC)</option>
                <option value="LAN">Network LAN / Ethernet Printer (TCP Direct)</option>
                <option value="USB">Direct USB Thermal Printer</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Paper Width Size</label>
              <select
                value={form.printerPaperSize || '80mm'}
                onChange={(e) => setForm({ ...form, printerPaperSize: e.target.value })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              >
                <option value="80mm">80mm Standard Thermal Paper (48 cols)</option>
                <option value="58mm">58mm Compact Thermal Paper (32 cols)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Local Print Bridge URL</label>
              <input
                type="text"
                value={form.printerBridgeUrl || 'http://localhost:9123'}
                onChange={(e) => setForm({ ...form, printerBridgeUrl: e.target.value })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Network Printer IP (for LAN)</label>
              <input
                type="text"
                value={form.printerIp || '192.168.1.100'}
                onChange={(e) => setForm({ ...form, printerIp: e.target.value })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Receipt Prefix</label>
              <input
                type="text"
                value={form.receiptPrefix || 'KB-'}
                onChange={(e) => setForm({ ...form, receiptPrefix: e.target.value })}
                className="mt-1 h-11 w-full rounded-2xl border border-amber-300 bg-amber-50/20 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <div>
                <p className="text-xs font-black text-zinc-950">Auto-Print Receipts</p>
                <p className="text-[10px] font-semibold text-zinc-500">Automatically print on completed bills</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, autoPrintReceipt: !form.autoPrintReceipt })}
                className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${form.autoPrintReceipt !== false ? 'bg-[#F4BE2C]' : 'bg-zinc-300'}`}
              >
                <div className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${form.autoPrintReceipt !== false ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <div>
                <p className="text-xs font-black text-zinc-950">Open Cash Drawer</p>
                <p className="text-[10px] font-semibold text-zinc-500">Send kick pulse on cash payment</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, openCashDrawerOnCash: !form.openCashDrawerOnCash })}
                className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${form.openCashDrawerOnCash !== false ? 'bg-[#F4BE2C]' : 'bg-zinc-300'}`}
              >
                <div className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${form.openCashDrawerOnCash !== false ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
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
