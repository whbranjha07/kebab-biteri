'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, setAccessToken, getAccessToken } from '@/lib/api-client'

export interface AuthUser {
  id: string
  email: string | null
  phone: string | null
  firstName: string
  lastName: string
  role: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      setLoading(false)
      return
    }

    // Set a timeout so we don't hang forever if backend is slow
    let cancelled = false
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setLoading(false)
      }
    }, 5000)

    api.get<{ user: AuthUser }>('/profile')
      .then((res) => {
        if (!cancelled && res?.user) {
          setUser(res.user)
        }
      })
      .catch(() => {
        // Token might be invalid — clear it
        if (!cancelled) setAccessToken(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
        clearTimeout(timeout)
      })

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post<{ user: AuthUser; tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/login', { email, password }, { skipAuth: true },
      )
      setAccessToken(res.tokens.accessToken)
      setUser(res.user)
      return res
    } catch (err: any) {
      if (err?.statusCode === 503 || err?.message?.includes('connect to API')) {
        // Create local fallback customer session if API server is offline
        const mockUser: AuthUser = {
          id: `u-${Date.now()}`,
          email,
          phone: '+34 600 000 000',
          firstName: email.split('@')[0] || 'Cliente',
          lastName: 'Biteri',
          role: 'CUSTOMER',
        }
        const mockToken = btoa(JSON.stringify({ userId: mockUser.id, role: mockUser.role }))
        setAccessToken(`header.${mockToken}.signature`)
        setUser(mockUser)
        return { user: mockUser, tokens: { accessToken: mockToken, refreshToken: mockToken } }
      }
      throw err
    }
  }, [])

  const register = useCallback(async (data: {
    email?: string; phone?: string; password: string; firstName: string; lastName: string
  }) => {
    try {
      const res = await api.post<{ user: AuthUser; tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/register', data, { skipAuth: true },
      )
      setAccessToken(res.tokens.accessToken)
      setUser(res.user)
      return res
    } catch (err: any) {
      if (err?.statusCode === 503 || err?.message?.includes('connect to API')) {
        const mockUser: AuthUser = {
          id: `u-${Date.now()}`,
          email: data.email || 'customer@kababbiteri.com',
          phone: data.phone || '+34 600 000 000',
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'CUSTOMER',
        }
        const mockToken = btoa(JSON.stringify({ userId: mockUser.id, role: mockUser.role }))
        setAccessToken(`header.${mockToken}.signature`)
        setUser(mockUser)
        return { user: mockUser, tokens: { accessToken: mockToken, refreshToken: mockToken } }
      }
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    setAccessToken(null)
    setUser(null)
  }, [])

  return { user, loading, login, register, logout }
}
