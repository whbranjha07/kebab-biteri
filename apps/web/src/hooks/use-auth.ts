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
    const res = await api.post<{
      requiresOtp?: boolean
      email?: string
      message?: string
      user?: AuthUser
      tokens?: { accessToken: string; refreshToken: string }
    }>('/auth/login', { email, password }, { skipAuth: true })

    if (res?.tokens?.accessToken) {
      setAccessToken(res.tokens.accessToken)
    }
    if (res?.user) {
      setUser(res.user)
    }
    return res
  }, [])

  const verifyLoginOtp = useCallback(async (email: string, otp: string) => {
    const res = await api.post<{
      user: AuthUser
      tokens: { accessToken: string; refreshToken: string }
    }>('/auth/verify-login-otp', { email, otp }, { skipAuth: true })

    if (res?.tokens?.accessToken) {
      setAccessToken(res.tokens.accessToken)
    }
    if (res?.user) {
      setUser(res.user)
    }
    return res
  }, [])

  const resendLoginOtp = useCallback(async (email: string) => {
    const res = await api.post<{ success: boolean; message: string }>(
      '/auth/resend-login-otp',
      { email },
      { skipAuth: true },
    )
    return res
  }, [])

  const register = useCallback(async (data: {
    email?: string; phone?: string; password: string; firstName: string; lastName: string
  }) => {
    const res = await api.post<{ message: string; email: string }>(
      '/auth/register', data, { skipAuth: true },
    )
    return res
  }, [])

  const verifyRegistrationCode = useCallback(async (email: string, code: string) => {
    const res = await api.post<{
      user: AuthUser
      tokens: { accessToken: string; refreshToken: string }
    }>('/auth/verify-email', { email, code }, { skipAuth: true })

    if (res?.tokens?.accessToken) {
      setAccessToken(res.tokens.accessToken)
    }
    if (res?.user) {
      setUser(res.user)
    }
    return res
  }, [])

  const loginWithGoogle = useCallback(async (data: { credential?: string; idToken?: string; accessToken?: string }) => {
    const res = await api.post<{
      user: AuthUser
      tokens: { accessToken: string; refreshToken: string }
    }>('/auth/google', data, { skipAuth: true })

    if (res?.tokens?.accessToken) {
      setAccessToken(res.tokens.accessToken)
    }
    if (res?.user) {
      setUser(res.user)
    }
    return res
  }, [])

  const logout = useCallback(async () => {
    // Unregister FCM token before clearing auth
    const fcmToken = typeof window !== 'undefined' ? localStorage.getItem('kb_fcm_token') : null
    if (fcmToken) {
      await api.patch('/profile/fcm-token/remove', { token: fcmToken }).catch(() => {})
      localStorage.removeItem('kb_fcm_token')
    }

    setAccessToken(null)
    setUser(null)
  }, [])

  return { user, loading, login, verifyLoginOtp, resendLoginOtp, verifyRegistrationCode, loginWithGoogle, register, logout }
}
