'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, Flame, Sparkles, Plus, ShoppingBag, Check } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/lib/cart-store'
import { specialOffers } from '@/data/menu-data'
import { useI18n } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/language-switcher'
import { toast } from '@/components/ui/toaster'
import type { CartItem } from '@kebab-biteri/types'

export default function SpecialOffersPage() {
  const { t } = useI18n()
  const addItem = useCartStore((s) => s.addItem)
  const [offersList, setOffersList] = useState(specialOffers)

  const handleAddOffer = (offer: any, option: { label: string; price: number }) => {
    const item: CartItem = {
      id: `ci-offer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: offer.id,
      productName: `${offer.title} (${option.label})`,
      productImage: offer.imageUrl,
      variantId: null,
      variantName: option.label,
      unitPrice: option.price,
      quantity: 1,
      modifiers: [],
      lineTotal: option.price,
      notes: `Base: ${offer.base}`,
    }
    addItem(item)
    toast.success(`🎉 ${offer.title} (${option.label}) added to cart!`)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#FFFDF2]">
      {/* Header */}
      <header className="safe-top sticky top-0 lg:top-[65px] z-20 bg-white/95 px-4 pb-3 pt-3 backdrop-blur-lg border-b border-amber-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="touch-target -ml-2 flex items-center justify-center rounded-full">
              <ChevronLeft className="h-6 w-6 text-zinc-950" />
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="font-sans text-xl font-black text-zinc-950">Special Offers</h1>
              <span className="rounded-full bg-[#E50909] px-2.5 py-0.5 text-[10px] font-black text-white uppercase tracking-wider animate-pulse">
                HOT DEALS 🔥
              </span>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-28 space-y-5">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#E50909] via-amber-500 to-[#F4BE2C] p-6 text-white shadow-md">
          <div className="relative z-10 max-w-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-950/40 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-300 backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5" /> Exclusive Discounts
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight leading-tight">
              Best Kebab & Dürüm Combos
            </h2>
            <p className="mt-1 text-xs font-bold text-amber-100/90">
              Save up to 30% with our signature family and combo deals!
            </p>
          </div>
        </div>

        {/* Special Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {offersList.map((offer) => (
            <div
              key={offer.id}
              className="group overflow-hidden rounded-3xl bg-white border border-amber-200 shadow-sm hover:shadow-md transition-all"
            >
              <div className="relative h-48 md:h-52 w-full bg-amber-50">
                <Image
                  src={offer.imageUrl}
                  alt={offer.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/30 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <span className="inline-block rounded-full bg-[#E50909] px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-xs mb-1">
                    SPECIAL DEAL
                  </span>
                  <h3 className="text-xl font-black text-[#F4BE2C] leading-tight">{offer.title}</h3>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-xs font-bold text-zinc-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[#D99F16] font-black">Includes:</span> {offer.base}
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {offer.options.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleAddOffer(offer, opt)}
                      className="flex items-center justify-between rounded-2xl bg-amber-50/70 p-3 border border-amber-200 hover:border-[#F4BE2C] hover:bg-[#FFFDF0] active:scale-95 transition-all"
                    >
                      <div className="text-left">
                        <p className="text-xs font-black text-zinc-950">{opt.label}</p>
                        <p className="text-sm font-black text-[#D99F16]">{formatPrice(opt.price)}</p>
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#F4BE2C] text-zinc-950 font-black shadow-xs">
                        <Plus className="h-4 w-4 stroke-[3]" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
