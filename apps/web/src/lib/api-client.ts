'use client'

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
    const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

    if (envUrl && (!envUrl.includes('localhost') || isLocalhost)) {
      const cleanUrl = envUrl.replace(/\/+$/, '')
      return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`
    }

    if (!isLocalhost) {
      return 'https://kebab-biteri-api-alpha.vercel.app/api'
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
  const baseUrl = envUrl || 'http://localhost:3001'
  const cleanUrl = baseUrl.replace(/\/+$/, '')
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`
}

// Token storage — localStorage for PWA
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
  if (typeof window !== 'undefined') {
    try {
      if (token) localStorage.setItem('kb_access_token', token)
      else localStorage.removeItem('kb_access_token')
    } catch {}
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken
  if (typeof window !== 'undefined') {
    try {
      accessToken = localStorage.getItem('kb_access_token')
    } catch {}
  }
  return accessToken
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean; timeout?: number },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  if (!options?.skipAuth) {
    const token = getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  // Add timeout via AbortController — default 10 seconds
  const timeoutMs = options?.timeout ?? 10000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const apiBaseUrl = getApiBase()

  try {
    const res = await fetch(`${apiBaseUrl}${normalizedPath}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      const rawMessage = Array.isArray(body.message) ? body.message.join(', ') : body.message
      throw new ApiError(rawMessage || body.error || 'Something went wrong', res.status, body.details || body)
    }

    return res.status === 204 ? (undefined as T) : res.json()
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please try again.', 408)
    }
    if (err.name === 'TypeError' && (err.message?.includes('Load failed') || err.message?.includes('Failed to fetch') || err.message?.includes('network'))) {
      throw new ApiError('Unable to connect to authentication server. Please check your network connection and try again.', 0)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  get: <T>(path: string, opts?: { skipAuth?: boolean; timeout?: number }) =>
    request<T>(path, { method: 'GET', skipAuth: opts?.skipAuth, timeout: opts?.timeout }),
  post: <T>(path: string, body?: unknown, opts?: { skipAuth?: boolean; timeout?: number }) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, skipAuth: opts?.skipAuth, timeout: opts?.timeout }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
}
