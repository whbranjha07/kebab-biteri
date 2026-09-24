'use client'

import { useState, useEffect } from 'react'
import type { MenuResponse, Product, Category } from '@kebab-biteri/types'
import { menuData, getProductBySlug, getPopularProducts } from '@/data/menu-data'
import { api } from '@/lib/api-client'

// Mongo returns `_id`; the app's types use `id`. Normalize.
function normalizeId<T extends { _id?: string; id?: string }>(doc: T): T & { id: string } {
  const id = doc.id ?? doc._id ?? ''
  return { ...doc, id }
}

function normalizeMenu(raw: {
  categories: any[]
  products: any[]
  promotions?: any[]
}): MenuResponse {
  return {
    categories: (raw.categories ?? []).map(normalizeId) as Category[],
    products: (raw.products ?? []).map(normalizeId) as Product[],
    promotions: (raw.promotions ?? []).map(normalizeId) as any,
  }
}

function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = [], options?: { enabled?: boolean }) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (options?.enabled === false) return
    let cancelled = false
    setIsLoading(true)
    fn()
      .then((result: T) => { if (!cancelled) { setData(result); setIsLoading(false) } })
      .catch((err: unknown) => { if (!cancelled) { setError(err as Error); setIsLoading(false) } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, isLoading, error }
}

export function useMenu() {
  const [data, setData] = useState<MenuResponse | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const raw = await api.get<{ categories: any[]; products: any[]; promotions?: any[] }>('/menu', { skipAuth: true })
        if (cancelled) return
        const normalized = normalizeMenu(raw)
        // If API returned nothing useful, fall back to static menu.
        if (normalized.products.length === 0 && normalized.categories.length === 0) {
          setData(menuData)
        } else {
          setData(normalized)
        }
      } catch {
        if (!cancelled) setData(menuData) // offline / API down → static
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return { data, isLoading }
}

export function useProduct(slug: string) {
  return useAsync<Product>(
    async () => {
      try {
        const raw = await api.get<any>(`/menu/products/${slug}`, { skipAuth: true })
        if (raw) return normalizeId(raw) as Product
      } catch {}
      return (getProductBySlug(slug) as unknown as Product) ?? (null as unknown as Product)
    },
    ['product', slug],
    { enabled: !!slug },
  )
}

export function usePopularProducts() {
  return useAsync<Product[]>(
    async () => {
      try {
        const raw = await api.get<any[]>('/menu/products/popular', { skipAuth: true })
        if (Array.isArray(raw) && raw.length > 0) return raw.map(normalizeId) as Product[]
      } catch {}
      return getPopularProducts() as unknown as Product[]
    },
    ['products', 'popular'],
  )
}

export function useCategories() {
  return useAsync<Category[]>(
    async () => {
      try {
        const raw = await api.get<any[]>('/menu/categories', { skipAuth: true })
        if (Array.isArray(raw) && raw.length > 0) return raw.map(normalizeId) as Category[]
      } catch {}
      return menuData.categories as Category[]
    },
    ['categories'],
  )
}

export function useBranches() {
  return useAsync<unknown[]>(
    () => Promise.resolve([]),
    ['branches'],
  )
}
