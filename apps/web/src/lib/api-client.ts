'use client'

export function getApiBase(): string {
  let base = process.env.NEXT_PUBLIC_API_URL || ''
  if (!base) {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      base = 'http://localhost:3001/api'
    } else {
      base = 'https://kebab-biteri-api-alpha.vercel.app/api'
    }
  }
  // Ensure base ends with /api
  const cleaned = base.replace(/\/+$/, '')
  return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`
}

// Token storage — localStorage for PWA
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('kb_access_token', token)
    else localStorage.removeItem('kb_access_token')
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('kb_access_token')
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

  const timeoutMs = options?.timeout ?? 10000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const apiBase = getApiBase()
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  try {
    const res = await fetch(`${apiBase}${cleanPath}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      throw new ApiError(body.message ?? 'Something went wrong', res.status, body.details)
    }

    return res.status === 204 ? (undefined as T) : res.json()
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new ApiError('Conexión con el servidor superada por tiempo. / Server request timed out.', 408)
    }
    if (err.message === 'Failed to fetch' || err instanceof TypeError) {
      throw new ApiError('No se pudo conectar con el servidor API. Por favor comprueba que el servidor backend esté activo. / Could not connect to API backend.', 503)
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
