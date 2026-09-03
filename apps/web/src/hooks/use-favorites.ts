'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, getAccessToken } from '@/lib/api-client'
import { toast } from '@/components/ui/toaster'

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFavorites = useCallback(async () => {
    const token = getAccessToken()
    if (token) {
      try {
        const res = await api.get<{ favorites: string[] }>('/profile/favorites')
        if (res && Array.isArray(res.favorites)) {
          setFavorites(res.favorites)
          localStorage.setItem('kb_favorites', JSON.stringify(res.favorites))
          return
        }
      } catch (e) {}
    }
    // Fallback to local storage if not logged in or offline
    try {
      const stored = localStorage.getItem('kb_favorites')
      if (stored) {
        setFavorites(JSON.parse(stored))
      }
    } catch (e) {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const toggleFavorite = useCallback(async (productId: string, productName?: string) => {
    const isFav = favorites.includes(productId)
    const nextFavorites = isFav
      ? favorites.filter((id) => id !== productId)
      : [...favorites, productId]

    // Optimistic UI update
    setFavorites(nextFavorites)
    try {
      localStorage.setItem('kb_favorites', JSON.stringify(nextFavorites))
    } catch (e) {}

    const token = getAccessToken()
    if (token) {
      try {
        if (isFav) {
          await api.delete(`/profile/favorites/${productId}`)
        } else {
          await api.post(`/profile/favorites/${productId}`, {})
        }
      } catch (e) {}
    }

    if (productName) {
      if (isFav) {
        toast.success(`Removed ${productName} from favorites ❤️`)
      } else {
        toast.success(`Added ${productName} to favorites! ❤️`)
      }
    }
  }, [favorites])

  const isFavorite = useCallback((productId: string) => {
    return favorites.includes(productId)
  }, [favorites])

  return { favorites, loading, toggleFavorite, isFavorite, refetch: fetchFavorites }
}
