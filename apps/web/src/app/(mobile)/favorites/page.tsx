'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, Heart, Plus, Star, ShoppingBag, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import { useMenu } from '@/hooks/use-menu'
import { useFavorites } from '@/hooks/use-favorites'
import { useCartStore } from '@/lib/cart-store'
import { useI18n } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/language-switcher'
import { toast } from '@/components/ui/toaster'
import type { CartItem, Product } from '@kebab-biteri/types'

export default function FavoritesPage() {
  const { data, isLoading } = useMenu()
  const { favorites, toggleFavorite } = useFavorites()
  const addItem = useCartStore((s) => s.addItem)
  const { t } = useI18n()

  const allProducts = (data?.products ?? []) as Product[]
  const favoriteProducts = allProducts.filter((p) => favorites.includes(p.id))

  const handleQuickAdd = (product: Product) => {
    const item: CartItem = {
      id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      variantId: null,
      variantName: null,
      unitPrice: product.basePrice,
      quantity: 1,
      modifiers: [],
      lineTotal: product.basePrice,
      notes: '',
    }
    addItem(item)
    toast.success(`${product.name} added to cart! 🛒`)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#FFFDF2]">
      {/* Header */}
      <header className="safe-top sticky top-0 lg:top-[65px] z-20 bg-white/95 px-4 pb-3 pt-3 backdrop-blur-lg border-b border-amber-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="touch-target -ml-2 flex items-center justify-center rounded-full">
              <ChevronLeft className="h-6 w-6 text-zinc-950" />
            </Link>
            <h1 className="font-sans text-xl font-black text-zinc-950">{t('profile.favorites')}</h1>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-28">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#F4BE2C] border-t-transparent" />
          </div>
        ) : favoriteProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 border border-red-200 mb-4">
              <Heart className="h-10 w-10 text-[#E50909] fill-[#E50909]/20" />
            </div>
            <p className="text-xl font-black text-zinc-950">No Favorites Saved</p>
            <p className="mt-1 text-xs font-semibold text-zinc-500 max-w-xs">
              Tap the heart icon on any kebab or dish to save it here for instant reordering!
            </p>
            <Link href="/menu" className="mt-6">
              <Button size="lg" className="font-black">
                Explore Menu <ArrowRight className="h-5 w-5 stroke-[2.5]" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              {favoriteProducts.length} Saved {favoriteProducts.length === 1 ? 'Item' : 'Items'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favoriteProducts.map((product) => (
                <div
                  key={product.id}
                  className="relative flex items-center gap-3.5 rounded-3xl bg-white p-3.5 border border-amber-200 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-amber-50">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-zinc-950 text-base leading-tight truncate">
                          {product.name}
                        </h3>
                        <button
                          onClick={() => toggleFavorite(product.id, product.name)}
                          className="touch-target -mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-[#E50909] hover:bg-red-50"
                        >
                          <Heart className="h-5 w-5 fill-[#E50909]" />
                        </button>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 font-medium">{product.description}</p>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-sans text-base font-black text-zinc-950">
                        {formatPrice(product.basePrice)}
                      </span>
                      <button
                        onClick={() => handleQuickAdd(product)}
                        className="flex h-9 items-center gap-1 px-3 rounded-xl bg-[#F4BE2C] text-zinc-950 font-black text-xs shadow-xs active:scale-95 transition-all hover:bg-amber-400"
                      >
                        <Plus className="h-4 w-4 stroke-[3]" /> Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
