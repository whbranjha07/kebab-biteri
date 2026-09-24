'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Edit2, Star, Eye, EyeOff, Plus, Trash2, Upload, Loader2, AlertCircle } from 'lucide-react'
import { formatPrice, cn } from '@/lib/utils'
import { api, ApiError } from '@/lib/api-client'
import { uploadImageToCloudinary, cloudinaryConfigured } from '@/lib/cloudinary'

interface AdminProduct {
  _id?: string
  id?: string
  name: string
  slug?: string
  description: string
  imageUrl: string
  categoryId: string
  basePrice: number
  isPopular?: boolean
  isActive?: boolean
  allergens?: string[]
  calories?: number | null
  isNew?: boolean
  priceUnit?: string
}

interface AdminCategory {
  _id?: string
  id?: string
  name: string
  slug?: string
  iconUrl?: string | null
  sortOrder?: number
  isActive?: boolean
}

const pid = (p: { _id?: string; id?: string }) => p._id ?? p.id ?? ''

export default function AdminMenuPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [managingCategories, setManagingCategories] = useState(false)

  useEffect(() => {
    void reload()
  }, [])

  const reload = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [prods, cats] = await Promise.all([
        api.get<AdminProduct[]>('/admin/products'),
        api.get<AdminCategory[]>('/admin/categories'),
      ])
      setProducts(prods)
      setCategories(cats)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load menu')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => products.filter(p => {
    const catMatch = filter === 'all' || p.categoryId === filter
    const q = query.trim().toLowerCase()
    const queryMatch = !q || p.name.toLowerCase().includes(q)
    return catMatch && queryMatch
  }), [products, filter, query])

  const categoryName = (id: string) => categories.find(c => pid(c) === id)?.name ?? '—'

  const handleSaveProduct = async (updated: AdminProduct) => {
    const id = pid(updated)
    try {
      const saved = await api.patch<AdminProduct>(`/admin/products/${id}`, {
        name: updated.name,
        description: updated.description,
        imageUrl: updated.imageUrl,
        basePrice: updated.basePrice,
        calories: updated.calories,
        categoryId: updated.categoryId,
      })
      setProducts(prev => prev.map(p => (pid(p) === id ? { ...p, ...saved } : p)))
      setEditingProduct(null)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Update failed')
    }
  }

  const handleCreateProduct = async (draft: NewProductInput) => {
    try {
      const created = await api.post<AdminProduct>('/admin/products', draft)
      setProducts(prev => [created, ...prev])
      setCreatingProduct(false)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Create failed')
    }
  }

  const handleDeleteProduct = async (p: AdminProduct) => {
    if (!confirm(`Delete "${p.name}"? This can't be undone from here.`)) return
    const id = pid(p)
    try {
      await api.delete(`/admin/products/${id}`)
      setProducts(prev => prev.filter(x => pid(x) !== id))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Delete failed')
    }
  }

  const toggleFlag = async (p: AdminProduct, patch: Partial<AdminProduct>) => {
    const id = pid(p)
    // optimistic
    setProducts(prev => prev.map(x => pid(x) === id ? { ...x, ...patch } : x))
    try {
      await api.patch(`/admin/products/${id}`, patch)
    } catch (err) {
      // revert
      setProducts(prev => prev.map(x => pid(x) === id ? p : x))
      alert(err instanceof ApiError ? err.message : 'Update failed')
    }
  }

  const handleCreateCategory = async (draft: { name: string; sortOrder: number }) => {
    try {
      const created = await api.post<AdminCategory>('/admin/categories', draft)
      setCategories(prev => [...prev, created].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
      setCreatingCategory(false)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Create failed')
    }
  }

  const handleDeleteCategory = async (c: AdminCategory) => {
    if (!confirm(`Delete category "${c.name}"? It must have no products.`)) return
    const id = pid(c)
    try {
      await api.delete(`/admin/categories/${id}`)
      setCategories(prev => prev.filter(x => pid(x) !== id))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal">Menu Management</h1>
          <p className="mt-1 text-sm text-muted">
            {loading ? 'Loading…' : `${products.length} products in ${categories.length} categories`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setManagingCategories(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-charcoal hover:bg-surface-alt"
          >
            Manage categories
          </button>
          <button
            onClick={() => setCreatingCategory(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-charcoal hover:bg-surface-alt"
          >
            <Plus className="h-4 w-4" /> Category
          </button>
          <button
            onClick={() => setCreatingProduct(true)}
            disabled={categories.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> New product
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4" /> {loadError}
          <button onClick={reload} className="ml-auto text-xs font-semibold underline">Retry</button>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input
          type="search"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-sm text-charcoal placeholder:text-subtle focus:border-primary focus:outline-none"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button onClick={() => setFilter('all')} className={cn('shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold', filter === 'all' ? 'bg-primary text-white' : 'bg-surface-alt text-muted')}>All</button>
        {categories.map((cat) => (
          <button key={pid(cat)} onClick={() => setFilter(pid(cat))} className={cn('shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold', filter === pid(cat) ? 'bg-primary text-white' : 'bg-surface-alt text-muted')}>{cat.name}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading menu…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={pid(p)} className={cn('rounded-xl border border-border bg-surface p-4', !p.isActive && 'opacity-60')}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-charcoal">{p.name}</p>
                    {p.isPopular && <Star className="h-3.5 w-3.5 fill-saffron text-saffron" />}
                  </div>
                  <p className="text-xs text-muted">{categoryName(p.categoryId)}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{p.description}</p>
                  <p className="mt-2 text-sm font-bold text-primary">{formatPrice(p.basePrice)}{p.priceUnit ? `/${p.priceUnit}` : ''}</p>
                </div>
                <div className="relative ml-3 h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-alt">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-subtle">No image</div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <button onClick={() => setEditingProduct(p)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-charcoal hover:bg-surface-alt">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => toggleFlag(p, { isActive: !p.isActive })} className={cn('flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold', p.isActive ? 'text-success hover:bg-success/10' : 'text-muted hover:bg-surface-alt')}>
                  {p.isActive ? <><Eye className="h-3.5 w-3.5" /> Visible</> : <><EyeOff className="h-3.5 w-3.5" /> Hidden</>}
                </button>
                <button onClick={() => toggleFlag(p, { isPopular: !p.isPopular })} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', p.isPopular ? 'text-saffron hover:bg-saffron/10' : 'text-muted hover:bg-surface-alt')}>
                  ★ Popular
                </button>
                <button onClick={() => handleDeleteProduct(p)} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="col-span-full rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted">
              No products match.
            </div>
          )}
        </div>
      )}

      {editingProduct && (
        <ProductModal
          title="Edit product"
          initial={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSubmit={(v) => handleSaveProduct({ ...editingProduct, ...v })}
        />
      )}
      {creatingProduct && (
        <ProductModal
          title="New product"
          categories={categories}
          onClose={() => setCreatingProduct(false)}
          onSubmit={(v) => handleCreateProduct(v)}
        />
      )}
      {creatingCategory && (
        <CategoryModal
          nextSort={(categories[categories.length - 1]?.sortOrder ?? 0) + 1}
          onClose={() => setCreatingCategory(false)}
          onSubmit={handleCreateCategory}
        />
      )}
      {managingCategories && (
        <ManageCategoriesModal
          categories={categories}
          onClose={() => setManagingCategories(false)}
          onDelete={handleDeleteCategory}
        />
      )}
    </div>
  )
}

// ─── Product modal (create + edit) ───────────────────────────

interface NewProductInput {
  name: string
  description: string
  imageUrl: string
  categoryId: string
  basePrice: number
  calories: number | null
}

function ProductModal({
  title,
  initial,
  categories,
  onSubmit,
  onClose,
}: {
  title: string
  initial?: AdminProduct
  categories: AdminCategory[]
  onSubmit: (v: NewProductInput) => void | Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<NewProductInput>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    imageUrl: initial?.imageUrl ?? '',
    categoryId: initial?.categoryId ?? (categories[0] ? pid(categories[0]) : ''),
    basePrice: initial?.basePrice ?? 0,
    calories: initial?.calories ?? null,
  })
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = form.name.trim() && form.description.trim() && form.categoryId && form.basePrice > 0

  const submit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        ...form,
        basePrice: Number(form.basePrice),
        calories: form.calories === null || (form.calories as any) === '' ? null : Number(form.calories),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <ImageField value={form.imageUrl} onChange={(v) => setForm({ ...form, imageUrl: v })} />

      <div className="mt-4">
        <label className="text-sm font-semibold text-charcoal">Product name</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-alt px-3 text-sm text-charcoal focus:border-primary focus:outline-none" />
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold text-charcoal">Category</label>
        <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-alt px-3 text-sm text-charcoal focus:border-primary focus:outline-none">
          <option value="">Select category…</option>
          {categories.map(c => (
            <option key={pid(c)} value={pid(c)}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold text-charcoal">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
          className="mt-1 w-full resize-none rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold text-charcoal">Price (€)</label>
          <input type="number" step="0.01" min="0" value={form.basePrice}
            onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-alt px-3 text-sm text-charcoal focus:border-primary focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-semibold text-charcoal">Calories</label>
          <input type="number" min="0" value={form.calories ?? ''}
            onChange={(e) => setForm({ ...form, calories: e.target.value === '' ? null : Number(e.target.value) })}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-alt px-3 text-sm text-charcoal focus:border-primary focus:outline-none" />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onClose} className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-charcoal hover:bg-surface-alt">
          Cancel
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Category modals ─────────────────────────────────────

function CategoryModal({
  nextSort,
  onSubmit,
  onClose,
}: {
  nextSort: number
  onSubmit: (v: { name: string; sortOrder: number }) => void | Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState(nextSort)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!name.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), sortOrder: Number(sortOrder) || 0 })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell title="New category" onClose={onClose}>
      <div className="mt-2">
        <label className="text-sm font-semibold text-charcoal">Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
          className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-alt px-3 text-sm text-charcoal focus:border-primary focus:outline-none" />
      </div>
      <div className="mt-4">
        <label className="text-sm font-semibold text-charcoal">Sort order</label>
        <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))}
          className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-alt px-3 text-sm text-charcoal focus:border-primary focus:outline-none" />
      </div>
      <div className="mt-6 flex gap-3">
        <button onClick={submit} disabled={!name.trim() || submitting}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-600 disabled:opacity-50">
          {submitting ? 'Saving…' : 'Create'}
        </button>
        <button onClick={onClose} className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-charcoal hover:bg-surface-alt">
          Cancel
        </button>
      </div>
    </ModalShell>
  )
}

function ManageCategoriesModal({
  categories,
  onDelete,
  onClose,
}: {
  categories: AdminCategory[]
  onDelete: (c: AdminCategory) => void | Promise<void>
  onClose: () => void
}) {
  return (
    <ModalShell title="Categories" onClose={onClose}>
      <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
        {categories.map((c) => (
          <li key={pid(c)} className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-charcoal">{c.name}</p>
              <p className="text-xs text-muted">sort: {c.sortOrder ?? 0}</p>
            </div>
            <button onClick={() => onDelete(c)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/10">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </li>
        ))}
        {categories.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted">No categories yet.</li>
        )}
      </ul>
      <div className="mt-6 flex">
        <button onClick={onClose} className="ml-auto rounded-xl border border-border px-4 py-2 text-sm font-semibold text-charcoal hover:bg-surface-alt">
          Close
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Shared bits ────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-charcoal-900/50" />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="font-display text-xl font-bold text-charcoal">{title}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-alt">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const configured = cloudinaryConfigured()

  const handleFile = async (file: File) => {
    setErr(null)
    setUploading(true)
    setProgress(0)
    try {
      const res = await uploadImageToCloudinary(file, {
        folder: 'kebab-biteri/menu',
        onProgress: setProgress,
      })
      onChange(res.secureUrl)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="text-sm font-semibold text-charcoal">Product image</label>
      <div className="mt-2 flex gap-3">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-alt">
          {value ? (
            <img src={value} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-subtle">No image</div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!configured || uploading}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-charcoal hover:bg-surface-alt disabled:opacity-50"
              title={configured ? 'Upload from device' : 'Cloudinary not configured'}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? `Uploading ${progress}%` : 'Upload image'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
                e.target.value = ''
              }}
            />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="or paste image URL"
            className="mt-2 h-9 w-full rounded-lg border border-border bg-surface-alt px-3 text-xs text-charcoal focus:border-primary focus:outline-none"
          />
          {err && <p className="mt-1 text-xs text-danger">{err}</p>}
          {!configured && (
            <p className="mt-1 text-[11px] text-subtle">
              Set <code>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code> and{' '}
              <code>NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</code> to enable uploads.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
