'use client'

import { Search, X, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'

export function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const { t } = useI18n()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/menu?q=${encodeURIComponent(query.trim())}`)
    } else {
      router.push('/menu')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center">
      <Search className="absolute left-4 h-5 w-5 text-zinc-400 pointer-events-none" />
      <input
        type="search"
        inputMode="search"
        placeholder={t('home.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-12 w-full rounded-2xl border border-amber-200 bg-white pl-11 pr-12 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-[#F4BE2C] focus:outline-none focus:ring-2 focus:ring-[#F4BE2C]/50"
      />
      {query ? (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-amber-100"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="submit"
          className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#F4BE2C] text-zinc-950 shadow-xs hover:bg-amber-400 active:scale-95 transition-all"
        >
          <ArrowRight className="h-4 w-4 stroke-[3]" />
        </button>
      )}
    </form>
  )
}
