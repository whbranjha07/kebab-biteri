'use client'

import { Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useI18n } from '@/lib/i18n'
import { products } from '@/data/menu-data'
import { formatPrice } from '@kebab-biteri/config'
import Image from 'next/image'

export function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const { t } = useI18n()

  // Live search results (max 6)
  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q),
      )
      .slice(0, 6)
  }, [query])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      router.push(`/menu?q=${encodeURIComponent(query.trim())}`)
      setShowResults(false)
    } else {
      router.push('/menu')
    }
  }, [query, router])

  const handleSelectProduct = useCallback(
    (slug: string) => {
      router.push(`/product/${slug}`)
      setShowResults(false)
      setQuery('')
    },
    [router],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (focusedIndex >= 0 && searchResults[focusedIndex]) {
        handleSelectProduct(searchResults[focusedIndex].slug)
      } else {
        handleSearch()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => Math.min(prev + 1, searchResults.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => Math.max(prev - 1, -1))
      return
    }
    if (e.key === 'Escape') {
      setShowResults(false)
      return
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 z-10" />
      <input
        type="search"
        inputMode="search"
        placeholder={t('home.searchPlaceholder')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setShowResults(true)
          setFocusedIndex(-1)
        }}
        onFocus={() => setShowResults(true)}
        onKeyDown={handleKeyDown}
        className="h-12 w-full rounded-2xl border border-amber-200 bg-white pl-11 pr-10 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-[#F4BE2C] focus:outline-none focus:ring-2 focus:ring-[#F4BE2C]/50"
      />
      {query && (
        <button
          onClick={() => {
            setQuery('')
            setShowResults(false)
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Live Search Dropdown */}
      {showResults && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-amber-200 bg-white shadow-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
          {searchResults.length > 0 ? (
            <>
              {searchResults.map((product, idx) => (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product.slug)}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    idx === focusedIndex ? 'bg-amber-50' : 'bg-white'
                  } ${idx > 0 ? 'border-t border-amber-100' : ''}`}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-amber-50">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-zinc-900">{product.name}</p>
                    <p className="truncate text-xs text-zinc-500">{product.category}</p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-zinc-950">
                    {formatPrice(product.basePrice)}
                  </span>
                </button>
              ))}
              {/* View all results */}
              <button
                onClick={handleSearch}
                className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-sm font-bold text-[#D99F16] bg-amber-50/50 border-t border-amber-100 hover:bg-amber-50 transition-colors"
              >
                <Search className="h-4 w-4" />
                {locale_search_all(t)}
              </button>
            </>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-zinc-400">
                {typeof t === 'function' ? 'No results found' : 'No results found'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper to get "view all results" text based on locale
function locale_search_all(t: (key: any) => string): string {
  try {
    const val = t('home.seeAll')
    return val || 'View all results'
  } catch {
    return 'View all results'
  }
}
