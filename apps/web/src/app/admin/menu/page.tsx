'use client'

import { useState } from 'react'
import { Search, X, Edit2, Star, Eye, EyeOff, Plus, Sparkles, Tag } from 'lucide-react'
import { formatPrice, cn } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { products as initialProducts, categories, type MenuItem } from '@/data/menu-data'

export default function AdminMenuPage() {
  const [products, setProducts] = useState<MenuItem[]>(initialProducts)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null)
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [isSpecialOfferMode, setIsSpecialOfferMode] = useState(false)

  const filtered = products.filter(p => {
    const catMatch = filter === 'all' || p.categoryId === filter
    const queryMatch = !query || p.name.toLowerCase().includes(query.toLowerCase())
    return catMatch && queryMatch
  })

  const handleSave = (updated: MenuItem) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
    setEditingProduct(null)
    toast.success('Product updated successfully')
  }

  const handleAddProduct = (newProduct: MenuItem) => {
    setProducts(prev => [newProduct, ...prev])
    setIsAddingProduct(false)
    toast.success(`${newProduct.name} added to menu!`)
  }

  const toggleActive = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p))
  }

  const togglePopular = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isPopular: !p.isPopular } : p))
  }

  const toggleNew = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isNew: !p.isNew } : p))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal">Menu Management</h1>
          <p className="mt-1 text-sm text-muted">{products.length} products in {categories.length} categories</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setIsSpecialOfferMode(false); setIsAddingProduct(true) }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F4BE2C] px-4 py-2.5 text-xs font-black text-zinc-950 shadow-sm hover:bg-amber-400 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4 stroke-[3]" /> Add New Product
          </button>
          <button
            onClick={() => { setIsSpecialOfferMode(true); setIsAddingProduct(true) }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#E50909] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-red-700 active:scale-95 transition-all"
          >
            <Sparkles className="h-4 w-4" /> Add Special Offer 🔥
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input type="search" placeholder="Search products..." value={query} onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-sm text-charcoal placeholder:text-subtle focus:border-primary focus:outline-none" />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button onClick={() => setFilter('all')} className={cn('shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold', filter === 'all' ? 'bg-primary text-white' : 'bg-surface-alt text-muted')}>All</button>
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => setFilter(cat.id)} className={cn('shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold', filter === cat.id ? 'bg-primary text-white' : 'bg-surface-alt text-muted')}>{cat.name}</button>
        ))}
      </div>

      {/* Product cards with edit */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <div key={p.id} className={cn('rounded-xl border border-border bg-surface p-4', !p.isActive && 'opacity-60')}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-charcoal">{p.name}</p>
                  {p.isNew && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">NEW</span>}
                  {p.isPopular && <Star className="h-3.5 w-3.5 fill-saffron text-saffron" />}
                </div>
                <p className="text-xs text-muted">{p.category}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{p.description}</p>
                <p className="mt-2 text-sm font-bold text-primary">{formatPrice(p.basePrice)}{p.priceUnit ? `/${p.priceUnit}` : ''}</p>
              </div>
              {/* Product image */}
              <div className="relative ml-3 h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <button onClick={() => setEditingProduct(p)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-charcoal hover:bg-surface-alt">
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={() => toggleActive(p.id)} className={cn('flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold', p.isActive ? 'text-success hover:bg-success/10' : 'text-muted hover:bg-surface-alt')}>
                {p.isActive ? <><Eye className="h-3.5 w-3.5" /> Visible</> : <><EyeOff className="h-3.5 w-3.5" /> Hidden</>}
              </button>
              <button onClick={() => togglePopular(p.id)} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', p.isPopular ? 'text-saffron hover:bg-saffron/10' : 'text-muted hover:bg-surface-alt')}>
                ★
              </button>
              <button onClick={() => toggleNew(p.id)} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', p.isNew ? 'text-primary hover:bg-primary/10' : 'text-muted hover:bg-surface-alt')}>
                NEW
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product / Special Offer Modal */}
      {isAddingProduct && (
        <AddProductModal
          isSpecialOffer={isSpecialOfferMode}
          onAdd={handleAddProduct}
          onClose={() => setIsAddingProduct(false)}
        />
      )}

      {/* Edit modal */}
      {editingProduct && (
        <EditProductModal product={editingProduct} onSave={handleSave} onClose={() => setEditingProduct(null)} />
      )}
    </div>
  )
}

function EditProductModal({ product, onSave, onClose }: { product: MenuItem; onSave: (p: MenuItem) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl,
    basePrice: product.basePrice,
    calories: product.calories ?? 0,
  })

  const handleSave = () => {
    onSave({
      ...product,
      name: form.name,
      description: form.description,
      imageUrl: form.imageUrl,
      basePrice: Number(form.basePrice),
      calories: Number(form.calories) || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-charcoal-900/50" />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="font-display text-xl font-bold text-charcoal">Edit Product</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-alt">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image preview + URL */}
        <div className="mt-4">
          <label className="text-sm font-semibold text-charcoal">Product image</label>
          <div className="mt-2 flex gap-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border">
              <img src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" />
            </div>
            <div className="flex-1">
              <input type="text" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="Image URL"
                className="h-10 w-full rounded-lg border border-border bg-surface-alt px-3 text-sm text-charcoal focus:border-primary focus:outline-none" />
              <p className="mt-1 text-xs text-muted">Paste any image URL. The preview updates automatically.</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="mt-4">
          <label className="text-sm font-semibold text-charcoal">Product name</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-alt px-3 text-sm text-charcoal focus:border-primary focus:outline-none" />
        </div>

        {/* Description */}
        <div className="mt-4">
          <label className="text-sm font-semibold text-charcoal">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
            className="mt-1 w-full resize-none rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none" />
        </div>

        {/* Price + Calories */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-charcoal">Price (€)</label>
            <input type="number" step="0.01" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-alt px-3 text-sm text-charcoal focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-semibold text-charcoal">Calories</label>
            <input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: Number(e.target.value) })}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-alt px-3 text-sm text-charcoal focus:border-primary focus:outline-none" />
          </div>
        </div>

        {/* Save */}
        <div className="mt-6 flex gap-3">
          <button onClick={handleSave} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-600">
            Save changes
          </button>
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-charcoal hover:bg-surface-alt">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function AddProductModal({
  isSpecialOffer = false,
  onAdd,
  onClose,
}: {
  isSpecialOffer?: boolean
  onAdd: (p: MenuItem) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: '',
    categoryId: isSpecialOffer ? 'offers' : 'doner-kebab',
    description: '',
    imageUrl: isSpecialOffer ? '/images/menu/durum_real.jpg' : '/images/menu/kebab_pita_real.jpg',
    basePrice: isSpecialOffer ? 14.00 : 5.00,
    isSpecialOffer: isSpecialOffer,
    isNew: true,
    isPopular: false,
    isFeatured: isSpecialOffer,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Please enter a product name')
      return
    }

    const catObj = categories.find((c) => c.id === form.categoryId)
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const id = `p-custom-${Date.now()}`

    const newProduct: MenuItem = {
      id,
      name: form.name.trim(),
      slug,
      category: catObj?.name ?? 'Otros',
      categoryId: form.categoryId,
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim() || '/images/menu/kebab_pita_real.jpg',
      basePrice: Number(form.basePrice) || 0,
      rating: 5.0,
      reviewCount: 1,
      isPopular: form.isPopular,
      isActive: true,
      isNew: form.isNew,
      isFeatured: form.isFeatured || form.isSpecialOffer,
      variants: [],
      modifiers: [],
      allergens: ['gluten'],
      calories: 500,
    }

    onAdd(newProduct)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs" />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-amber-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-amber-100 pb-3">
          <div>
            <h2 className="font-sans text-xl font-black text-zinc-950 flex items-center gap-2">
              {form.isSpecialOffer ? <Sparkles className="h-5 w-5 text-[#E50909]" /> : <Plus className="h-5 w-5 text-[#D99F16]" />}
              {form.isSpecialOffer ? 'Add Special Offer 🔥' : 'Add New Product'}
            </h2>
            <p className="text-xs font-semibold text-zinc-500">Add a new item to the customer menu</p>
          </div>
          <button onClick={onClose} className="touch-target flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-zinc-600 hover:bg-amber-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Special Offer Toggle */}
          <div className="rounded-2xl bg-amber-50/90 p-3.5 border border-amber-300 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-zinc-950">Special Offer Option (Oferta Especial)</p>
              <p className="text-xs text-zinc-600 font-medium">Display under Hot Deals / Special Combos</p>
            </div>
            <input
              type="checkbox"
              checked={form.isSpecialOffer}
              onChange={(e) => setForm({ ...form, isSpecialOffer: e.target.checked, categoryId: e.target.checked ? 'offers' : form.categoryId })}
              className="h-5 w-5 rounded border-amber-400 text-[#E50909] focus:ring-[#E50909]"
            />
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-black uppercase text-zinc-950">Product Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={form.isSpecialOffer ? 'e.g. Combo Oferta 3 Dürüm + Bebida' : 'e.g. Kebab Supreme'}
              className="mt-1 h-11 w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3.5 text-sm font-semibold text-zinc-950 placeholder:text-zinc-400 focus:border-[#F4BE2C] focus:outline-none"
            />
          </div>

          {/* Category */}
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

          {/* Description */}
          <div>
            <label className="text-xs font-black uppercase text-zinc-950">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Describe ingredients, combo options, or details..."
              className="mt-1 w-full resize-none rounded-xl border border-amber-300 bg-amber-50/30 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 placeholder:text-zinc-400 focus:border-[#F4BE2C] focus:outline-none"
            />
          </div>

          {/* Price + Image URL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Price (€)</label>
              <input
                type="number"
                step="0.10"
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                className="mt-1 h-11 w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3.5 text-sm font-bold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-zinc-950">Image URL</label>
              <input
                type="text"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="/images/menu/durum_real.jpg"
                className="mt-1 h-11 w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3.5 text-sm font-semibold text-zinc-950 focus:border-[#F4BE2C] focus:outline-none"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-900 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isNew}
                onChange={(e) => setForm({ ...form, isNew: e.target.checked })}
                className="h-4 w-4 rounded border-amber-300 text-[#F4BE2C]"
              />
              Mark as NEW
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-900 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPopular}
                onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
                className="h-4 w-4 rounded border-amber-300 text-[#F4BE2C]"
              />
              Popular ★
            </label>
          </div>

          {/* Buttons */}
          <div className="mt-6 flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-[#F4BE2C] py-3.5 text-sm font-black text-zinc-950 shadow-md hover:bg-amber-400 active:scale-95 transition-all"
            >
              {form.isSpecialOffer ? 'Add Special Offer 🔥' : 'Save Product'}
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
