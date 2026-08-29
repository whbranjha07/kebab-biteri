'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, MapPin, Home, Briefcase, Star, Trash2, Edit3, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { AddressPicker, type SelectedAddress } from '@/components/address/address-picker'
import { useAddresses, type Address } from '@/hooks/use-addresses'
import { useI18n } from '@/lib/i18n'
import { toast } from '@/components/ui/toaster'
import { LanguageSwitcher } from '@/components/language-switcher'

const labelIcons: Record<string, typeof Home> = { Casa: Home, Home: Home, Trabajo: Briefcase, Work: Briefcase }

export default function AddressesPage() {
  const { addresses, loading, create, update, remove } = useAddresses()
  const { t } = useI18n()
  const [showAdd, setShowAdd] = useState(false)
  const [editingAddr, setEditingAddr] = useState<Address | null>(null)

  const handleAdd = async (addr: SelectedAddress) => {
    try {
      await create({
        label: addr.label,
        street: addr.street,
        city: addr.city,
        postalCode: addr.postalCode,
        country: 'España',
        lat: addr.lat,
        lng: addr.lng,
        isDefault: addresses.length === 0,
      })
      setShowAdd(false)
      toast.success(t('addresses.created') || 'Address added successfully!')
    } catch (e: any) {
      toast.error(e.message || 'Could not save address')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await update(id, { isDefault: true })
      toast.success(t('addresses.defaultSet') || 'Set as default address!')
    } catch (e: any) {
      toast.error(e.message || 'Could not set default address')
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await remove(id)
      toast.success(t('addresses.deleted') || 'Address deleted')
    } catch (e: any) {
      toast.error(e.message || 'Could not delete address')
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
            <h1 className="font-sans text-xl font-black text-zinc-950">{t('profile.myAddresses')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowAdd(true)} className="font-black">
              <Plus className="h-4 w-4 stroke-[3]" /> Add Address
            </Button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-28">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#F4BE2C] border-t-transparent" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F4BE2C]/20 border border-amber-300 mb-4">
              <MapPin className="h-10 w-10 text-[#D99F16]" />
            </div>
            <p className="text-xl font-black text-zinc-950">{t('addresses.empty') || 'No Saved Addresses'}</p>
            <p className="mt-1 text-xs font-semibold text-zinc-500 max-w-xs">
              {t('addresses.emptyDesc') || 'Add a delivery address to complete your orders faster!'}
            </p>
            <Button size="lg" onClick={() => setShowAdd(true)} className="mt-6 font-black">
              <Plus className="h-5 w-5 stroke-[2.5]" /> Add New Address
            </Button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {addresses.map((addr) => {
              const Icon = labelIcons[addr.label] ?? MapPin
              return (
                <div
                  key={addr._id}
                  className={`relative overflow-hidden rounded-3xl bg-white p-4 border transition-all shadow-sm ${
                    addr.isDefault ? 'border-2 border-[#F4BE2C] shadow-md' : 'border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-zinc-900 border border-amber-200">
                      <Icon className="h-5 w-5 text-[#D99F16]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-zinc-950 text-base">{addr.label}</p>
                        {addr.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F4BE2C]/20 px-2.5 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300">
                            <Star className="h-3 w-3 fill-[#F4BE2C] text-[#F4BE2C]" /> Default
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-bold text-zinc-800 truncate">{addr.street}</p>
                      <p className="text-xs font-semibold text-zinc-500">{addr.city} · {addr.postalCode}</p>

                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefault(addr._id)}
                          className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-black text-[#D99F16] hover:underline"
                        >
                          <Check className="h-3.5 w-3.5" /> Set as Default
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRemove(addr._id)}
                        className="touch-target flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete address"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="New Address">
        <AddressPicker onSelect={handleAdd} />
      </Sheet>
    </div>
  )
}
