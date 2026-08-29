'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Star, Plus, ChevronLeft, Sparkles, X } from 'lucide-react'
import { useMenu } from '@/hooks/use-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatPrice, cn } from '@/lib/utils'
import { useCartStore } from '@/lib/cart-store'
import { toast } from '@/components/ui/toaster'
import { specialOffers as initialSpecialOffers, categories as defaultCategories } from '@/data/menu-data'
import { useI18n } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/language-switcher'
import { CategoryIcon } from '@/components/category-icons'
import type { CartItem, Product } from '@kebab-biteri/types'

interface MenuClientProps {
  initialCategory: string
  initialQuery: string
}

export function MenuClient({ initialCategory, initialQuery }: MenuClientProps) {
  const { data, isLoading } = useMenu()
  const { t } = useI18n()
  const [activeCat, setActiveCat] = useState(initialCategory)
  const [query, setQuery] = useState(initialQuery)
  const [customProducts, setCustomProducts] = useState<any[]>([])
  const [offersList, setOffersList] = useState(initialSpecialOffers)
  const [isAdding, setIsAdding] = useState(false)
  const [addMode, setAddMode] = useState<'product' | 'offer'>('product')

  const categories = data?.categories ?? []
  const products = (data?.products ?? []) as Array<Product & { isNew?: boolean; number?: number; priceUnit?: string }>

  const allProducts = useMemo(() => [...customProducts, ...products], [customProducts, products])

  const filtered = useMemo(() => {
    return allProducts.filter((p) => {
      const catMatch = activeCat === 'all' || p.categoryId === activeCat
      const queryMatch =
        !query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description?.toLowerCase().includes(query.toLowerCase())
      return catMatch && queryMatch
    })
  }, [allProducts, activeCat, query])

  const addItem = useCartStore((s) => s.addItem)

  const handleQuickAdd = useCallback(
    (product: Product) => {
      const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0]
      const price = defaultVariant?.price ?? product.basePrice

      const item: CartItem = {
        id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl,
        variantId: defaultVariant?.id ?? null,
        variantName: defaultVariant?.name ?? null,
        unitPrice: price,
        quantity: 1,
        modifiers: [],
        lineTotal: price,
        notes: null,
      }
      addItem(item)
      toast.success(`${product.name} added`)
    },
    [addItem],
  )

  // Group products by category for "all" view
  const grouped = useMemo(() => {
    if (activeCat !== 'all') return null
    const groups: Record<string, typeof products> = {}
    for (const p of filtered) {
      const cat = categories.find((c) => c.id === p.categoryId)
      const key = cat?.name ?? 'Otros'
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    }
    return groups
  }, [filtered, activeCat, categories])

  const showOffers = activeCat === 'all' || activeCat === 'offers'

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="safe-top sticky top-0 lg:top-[65px] z-20 bg-white/95 px-4 pb-3 pt-3 backdrop-blur-lg border-b border-amber-200">
        <div className="flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-3">
            <Link href="/" className="touch-target -ml-2 flex items-center justify-center rounded-full">
              <ChevronLeft className="h-6 w-6 text-zinc-950" />
            </Link>
            <h1 className="font-sans text-xl font-black text-zinc-950">{t('nav.menu')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAddMode('product'); setIsAdding(true) }}
              className="flex items-center gap-1 rounded-xl bg-[#F4BE2C] px-2.5 py-1 text-[11px] font-black text-zinc-950 shadow-2xs active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" /> Product
            </button>
            <button
              onClick={() => { setAddMode('offer'); setIsAdding(true) }}
              className="flex items-center gap-1 rounded-xl bg-[#E50909] px-2.5 py-1 text-[11px] font-black text-white shadow-2xs active:scale-95 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" /> Offer 🔥
            </button>
            <LanguageSwitcher />
          </div>
        </div>
        {/* Search */}
        <div className="relative mt-3 lg:hidden">
          <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            inputMode="search"
            placeholder={t('home.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 w-full rounded-2xl border border-amber-200 bg-white pl-11 pr-4 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-[#F4BE2C] focus:outline-none focus:ring-2 focus:ring-[#F4BE2C]/40 shadow-sm"
          />
        </div>
        {/* Category tabs */}
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 py-1">
          <button
            onClick={() => setActiveCat('all')}
            className={cn(
              'shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black transition-all shadow-xs',
              activeCat === 'all' ? 'bg-[#F4BE2C] text-zinc-950 shadow-sm' : 'bg-white border border-amber-200 text-zinc-700 hover:text-zinc-950',
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all shadow-xs',
                activeCat === cat.id ? 'bg-[#F4BE2C] text-zinc-950 shadow-sm' : 'bg-white border border-amber-200 text-zinc-700 hover:text-zinc-950',
              )}
            >
              <CategoryIcon slug={cat.slug} className="h-4 w-4" />
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Products */}
      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 && !showOffers ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-bold text-zinc-900">No products found</p>
            <p className="mt-1 text-sm text-zinc-500">Try another search or category</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Special Offers */}
            {showOffers && (
              <div>
                <h2 className="mb-3 font-sans text-lg font-black text-zinc-900">🔥 Special Offers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {offersList.map((offer: any) => (
                    <div key={offer.id} className="card-app overflow-hidden border border-amber-200 shadow-sm hover:shadow-md transition-all">
                      <div className="relative h-44 md:h-52 w-full bg-amber-50">
                        <Image src={offer.imageUrl} alt={offer.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" priority />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4">
                          <span className="inline-block rounded-full bg-[#E50909] px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-xs mb-1">HOT DEAL</span>
                          <h3 className="text-xl font-black text-[#F4BE2C] leading-tight">{offer.title}</h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="mb-3 text-xs font-semibold text-zinc-600">Base: {offer.base}</p>
                        <div className="grid grid-cols-2 gap-2.5">
                          {offer.options.map((opt: any) => (
                            <button
                              key={opt.label}
                              onClick={() => {
                                const item: CartItem = {
                                  id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                                  productId: offer.id,
                                  productName: `${offer.title} ${opt.label}`,
                                  productImage: offer.imageUrl,
                                  variantId: null,
                                  variantName: opt.label,
                                  unitPrice: opt.price,
                                  quantity: 1,
                                  modifiers: [],
                                  lineTotal: opt.price,
                                  notes: null,
                                }
                                addItem(item)
                                toast.success(`${offer.title} ${opt.label} added`)
                              }}
                              className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50/50 px-3 py-2.5 text-xs font-bold transition-all hover:bg-[#F4BE2C] hover:text-zinc-950 active:scale-95 group shadow-2xs"
                            >
                              <span className="font-bold text-zinc-900 group-hover:text-zinc-950">{opt.label}</span>
                              <span className="font-black text-zinc-950">{formatPrice(opt.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product list */}
            {grouped ? (
              Object.entries(grouped).map(([catName, items]) => (
                <div key={catName}>
                  <h2 className="mb-3 font-sans text-lg font-black text-zinc-900">{catName}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        onAdd={() => handleQuickAdd(product)}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onAdd={() => handleQuickAdd(product)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Add Product / Special Offer Modal */}
      {isAdding && (
        <QuickAddModal
          mode={addMode}
          categories={categories.length > 0 ? categories : defaultCategories}
          onAddProduct={(p) => {
            setCustomProducts((prev) => [p, ...prev])
            setIsAdding(false)
            toast.success(`${p.name} added to menu!`)
          }}
          onAddOffer={(off) => {
            setOffersList((prev) => [off, ...prev])
            setIsAdding(false)
            toast.success(`${off.title} added to special offers!`)
          }}
          onClose={() => setIsAdding(false)}
        />
      )}
    </div>
  )
}

function ProductRow({
  product,
  onAdd,
}: {
  product: Product & { isNew?: boolean; number?: number; priceUnit?: string }
  onAdd: () => void
}) {
  const hasCustomization = product.variants.length > 0 || product.modifiers.length > 0

  return (
    <Link href={`/product/${product.slug}`} className="card-app flex gap-3 p-2 hover:border-amber-400 transition-all shadow-sm">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-amber-50">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover"
          sizes="96px"
        />
      </div>
      <div className="flex flex-1 flex-col py-1">
        <div className="flex items-center gap-2">
          {product.number && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-black text-[#F4BE2C]">
              {product.number}
            </span>
          )}
          <h3 className="text-sm font-black text-zinc-900">{product.name}</h3>
          {product.isNew && (
            <Badge variant="default" className="shrink-0 bg-[#E50909] px-1.5 py-0.5 text-[10px] font-black text-white">
              NUEVO
            </Badge>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-zinc-950">
              {formatPrice(product.basePrice)}{product.priceUnit ? `/${product.priceUnit}` : ''}
            </span>
            {product.rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-[#F4BE2C] text-[#F4BE2C]" />
                <span className="text-xs font-bold text-zinc-700">{product.rating}</span>
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault()
              if (hasCustomization) {
                window.location.href = `/product/${product.slug}`
              } else {
                onAdd()
              }
            }}
            className="touch-target flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4BE2C] text-zinc-950 font-black shadow-sm transition-transform active:scale-90 hover:bg-amber-400"
            aria-label={`Add ${product.name}`}
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </Link>
  )
}

function QuickAddModal({
  mode,
  categories,
  onAddProduct,
  onAddOffer,
  onClose,
}: {
  mode: 'product' | 'offer'
  categories: any[]
  onAddProduct: (p: any) => void
  onAddOffer: (off: any) => void
  onClose: () => void
}) {
  const isOffer = mode === 'offer'
  const [form, setForm] = useState({
    name: '',
    categoryId: isOffer ? 'offers' : 'doner-kebab',
    description: '',
    price: isOffer ? 14.00 : 5.00,
    imageUrl: isOffer ? '/images/menu/durum_real.jpg' : '/images/menu/kebab_pita_real.jpg',
    offerBase: '1 Patatas + 1L Bebida',
    opt1Label: '+2 unidades',
    opt1Price: 14.00,
    opt2Label: '+3 unidades',
    opt2Price: 17.00,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (isOffer) {
      const newOffer = {
        id: `offer-${Date.now()}`,
        title: form.name.trim(),
        base: form.offerBase.trim() || '1 Patatas + 1L Bebida',
        imageUrl: form.imageUrl.trim() || '/images/menu/durum_real.jpg',
        options: [
          { label: form.opt1Label.trim() || '+2 unidades', price: Number(form.opt1Price) || 14.00 },
          { label: form.opt2Label.trim() || '+3 unidades', price: Number(form.opt2Price) || 17.00 },
        ],
      }
      onAddOffer(newOffer)
    } else {
      const catObj = categories.find((c) => c.id === form.categoryId)
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const newProd = {
        id: `p-quick-${Date.now()}`,
        name: form.name.trim(),
        slug,
        category: catObj?.name ?? 'Otros',
        categoryId: form.categoryId,
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim() || '/images/menu/kebab_pita_real.jpg',
        basePrice: Number(form.price) || 0,
        rating: 5.0,
        reviewCount: 1,
        isPopular: true,
        isActive: true,
        isNew: true,
        isFeatured: false,
        variants: [],
        modifiers: [],
        allergens: ['gluten'],
        calories: 500,
      }
      onAddProduct(newProd)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs" />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-amber-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-amber-100 pb-3">
          <div>
            <h2 className="font-sans text-xl font-black text-zinc-950 flex items-center gap-2">
              {isOffer ? <Sparkles className="h-5 w-5 text-[#E50909]" /> : <Plus className="h-5 w-5 text-[#D99F16]" />}
              {isOffer ? 'Add Special Offer 🔥' : 'Add New Product'}
            </h2>
            <p className="text-xs font-semibold text-zinc-500">Quickly publish to menu page</p>
          </div>
          <button onClick={onClose} className="touch-target flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-zinc-600 hover:bg-amber-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-black uppercase text-zinc-950">{isOffer ? 'Offer Title' : 'Product Name'}</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={isOffer ? 'e.g. Oferta Especial Dürüm Extra' : 'e.g. Dürüm Especial Casa'}
              className="mt-1 h-11 w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3.5 text-sm font-semibold text-zinc-950 placeholder:text-zinc-400 focus:border-[#F4BE2C] focus:outline-none"
            />
          </div>

          {!isOffer ? (
            <>
              <div>
                <label className="text-xs font-black uppercase text-zinc-950">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-zinc-950">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Ingredients or details..."
                  className="mt-1 w-full resize-none rounded-xl border border-amber-300 bg-amber-50/30 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase text-zinc-950">Price (€)</label>
                  <input
                    type="number"
                    step="0.10"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="mt-1 h-11 w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-zinc-950">Image URL</label>
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3.5 text-sm font-semibold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-black uppercase text-zinc-950">Combo Base Included</label>
                <input
                  type="text"
                  value={form.offerBase}
                  onChange={(e) => setForm({ ...form, offerBase: e.target.value })}
                  placeholder="1 Patatas + 1L Bebida"
                  className="mt-1 h-11 w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3.5 text-sm font-semibold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
                />
              </div>

              <div className="space-y-3 rounded-2xl bg-amber-50/80 p-3.5 border border-amber-200">
                <p className="text-xs font-black text-zinc-950 uppercase">Offer Tier Options</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={form.opt1Label}
                    onChange={(e) => setForm({ ...form, opt1Label: e.target.value })}
                    placeholder="Option 1 label"
                    className="h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-zinc-950"
                  />
                  <input
                    type="number"
                    step="0.50"
                    value={form.opt1Price}
                    onChange={(e) => setForm({ ...form, opt1Price: Number(e.target.value) })}
                    placeholder="Price 1"
                    className="h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs font-black text-zinc-950"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={form.opt2Label}
                    onChange={(e) => setForm({ ...form, opt2Label: e.target.value })}
                    placeholder="Option 2 label"
                    className="h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-zinc-950"
                  />
                  <input
                    type="number"
                    step="0.50"
                    value={form.opt2Price}
                    onChange={(e) => setForm({ ...form, opt2Price: Number(e.target.value) })}
                    placeholder="Price 2"
                    className="h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs font-black text-zinc-950"
                  />
                </div>
              </div>
            </>
          )}

          <div className="mt-6 flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-[#F4BE2C] py-3.5 text-sm font-black text-zinc-950 shadow-md hover:bg-amber-400 active:scale-95 transition-all"
            >
              {isOffer ? 'Publish Special Offer 🔥' : 'Publish Product'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-sm font-bold text-zinc-900 hover:bg-amber-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
