import axios from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { getStoredRefreshToken, setStoredRefreshToken } from './refreshToken'

/**
 * Central Axios client for the app.
 *
 * Responsibilities:
 * - Base URL composition from env (host + /api + version)
 * - Multi-tenant header injection (X-Tenant-ID from hostname)
 * - Attach access token (Authorization: Bearer ...)
 * - Auto-refresh on 401 (single in-flight refresh + queue)
 */

export interface AxiosAuthHandlers {
  /** Current access token from app state. */
  getAccessToken: () => string | null
  /** Current user object from app state (not used by axios directly, but useful for debugging/extensibility). */
  getUser: () => unknown
  /** Update the access token in app state after refresh. */
  setAccessToken: (token: string) => void
  /** Clear auth state and send the user to the login page. */
  logoutAndRedirect: () => void
}

let authHandlers: AxiosAuthHandlers | null = null

export const initializeAxiosAuth = (handlers: AxiosAuthHandlers) => {
  // Injected from the Redux store once at startup (see src/store/store.ts).
  authHandlers = handlers
}

export const getApiAccessToken = (): string | null => {
  return authHandlers?.getAccessToken() ?? null
}

const getTenantIdFromHostname = (hostname: string): string | null => {
  const cleanHost = hostname.split(':')[0]
  const parts = cleanHost.split('.').filter(Boolean)

  // e.g. school-a.siksha.ai -> [school-a, siksha, ai]
  if (parts.length >= 3) return parts[0]

  // e.g. school-a.localhost -> [school-a, localhost]
  if (parts.length === 2 && parts[1] === 'localhost') return parts[0]

  return null
}

// Normalize a URL base by trimming whitespace and removing trailing slashes.
const normalizeBaseURL = (value: string): string => value.trim().replace(/\/+$/, '')

const normalizePathPart = (value: string): string => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return ''
  return trimmed.replace(/^\/+/, '').replace(/\/+$/, '')
}

const toSegments = (pathname: string): string[] =>
  pathname
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean)

const isPrefix = (prefix: string[], full: string[]): boolean => {
  if (prefix.length > full.length) return false
  for (let i = 0; i < prefix.length; i += 1) {
    if (prefix[i] !== full[i]) return false
  }
  return true
}

/**
 * Build Axios baseURL from env vars.
 *
 * - VITE_API_BASE_URL: origin (e.g. http://localhost:8080)
 * - VITE_API_PREFIX: usually /api
 * - VITE_API_VERSION: usually v1
 *
 * Result example: http://localhost:8080/api/v1
 */
const buildBaseURL = (raw: string): string => {
  const normalized = normalizeBaseURL(raw)
  const prefix = normalizePathPart(import.meta.env.VITE_API_PREFIX ?? '/api')
  const version = normalizePathPart(import.meta.env.VITE_API_VERSION ?? 'v1')

  const desiredSegments = [...toSegments(prefix), ...toSegments(version)]
  if (desiredSegments.length === 0) return normalized

  try {
    const url = new URL(normalized)
    const currentSegments = toSegments(url.pathname)

    // If the current pathname is empty or is a prefix of the desired path, replace it with the desired path.
    // Examples:
    // - http://localhost:8080 -> http://localhost:8080/api/v1
    // - http://localhost:8080/api -> http://localhost:8080/api/v1
    if (currentSegments.length === 0 || isPrefix(currentSegments, desiredSegments)) {
      url.pathname = `/${desiredSegments.join('/')}`
      return normalizeBaseURL(url.toString())
    }

    // If the desired path is already present (or current path is more specific), keep it.
    // Example: http://localhost:8080/api/v1 already set.
    if (isPrefix(desiredSegments, currentSegments)) {
      return normalizeBaseURL(url.toString())
    }

    // Otherwise, append the desired path to avoid breaking custom deployments.
    url.pathname = `/${[...currentSegments, ...desiredSegments].join('/')}`
    return normalizeBaseURL(url.toString())
  } catch {
    // If the URL isn't parseable, fall back to string-join.
    return normalizeBaseURL(`${normalized}/${desiredSegments.join('/')}`)
  }
}

const envBaseURL = import.meta.env.VITE_API_BASE_URL

// Vite reads `.env` only on server start. If the dev server wasn't restarted after adding `.env`,
// this falls back to Spring Boot's default local URL so API calls still work.
const baseURL = envBaseURL && envBaseURL.trim().length > 0
  ? buildBaseURL(envBaseURL)
  : (import.meta.env.DEV ? 'http://localhost:8080' : undefined)

if (import.meta.env.DEV && (!envBaseURL || envBaseURL.trim().length === 0)) {
  console.warn('VITE_API_BASE_URL is not set; falling back to http://localhost:8080. Restart `npm run dev` after creating/updating .env.')
}

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
})

refreshClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tenantId = getTenantIdFromHostname(window.location.hostname)
  config.headers = config.headers ?? {}
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId
  }
  return config
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Multi-tenancy: tenant is derived from the subdomain/hostname and passed as a header.
  const tenantId = getTenantIdFromHostname(window.location.hostname)

  config.headers = config.headers ?? {}

  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId
  }

  const token = authHandlers?.getAccessToken() ?? null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

let isRefreshing = false
let refreshPromise: Promise<string> | null = null

type QueuedRequest = {
  resolve: (value: unknown) => void
  reject: (reason?: any) => void
  config: InternalAxiosRequestConfig & { _retry?: boolean }
}

let queue: QueuedRequest[] = []

const flushQueueSuccess = (token: string) => {
  const pending = queue
  queue = []
  pending.forEach(({ resolve, config }) => {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
    resolve(api(config))
  })
}

const flushQueueFailure = (error: unknown) => {
  const pending = queue
  queue = []
  pending.forEach(({ reject }) => reject(error))
}

const extractAccessToken = (data: any): string => {
  const token = data?.accessToken ?? data?.access_token ?? data?.token ?? data?.data?.accessToken ?? data?.data?.access_token
  if (!token || typeof token !== 'string') {
    throw new Error('Refresh failed: missing access token')
  }
  return token
}

const extractRefreshToken = (data: any): string | null => {
  const token = data?.refreshToken ?? data?.refresh_token ?? data?.data?.refreshToken ?? data?.data?.refresh_token
  return typeof token === 'string' && token.length > 0 ? token : null
}

const refreshAccessTokenOnce = async (): Promise<string> => {
  // Ensure only one refresh call is in-flight at a time.
  if (!refreshPromise) {
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) {
      throw new Error('NO_REFRESH_TOKEN')
    }

    // DO NOT send the Authorization header here.
    // The access token is expired at this point — Spring Security's JWT filter
    // would reject the request with 401 before it reaches the refresh endpoint.
    // The refresh token in the request body is the only credential needed.
    refreshPromise = refreshClient
      .post('/auth/refresh-token', { refreshToken }, {
        headers: { 'Content-Type': 'application/json' },
      })
      .then((res) => {
        const rotated = extractRefreshToken(res.data)
        if (rotated) setStoredRefreshToken(rotated)
        return extractAccessToken(res.data)
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const originalConfig = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (!originalConfig || status !== 401) {
      return Promise.reject(error)
    }

    const url = String(originalConfig.url ?? '')

    // Pass authentication errors from the login endpoint directly back to the component
    // without triggering the global "Session Expired" logout flow.
    if (url.includes('/login')) {
      return Promise.reject(error)
    }

    // Safety net: if an explicit refresh call was made and failed with 401
    if (url.includes('/refresh')) {
      authHandlers?.logoutAndRedirect()
      return Promise.reject(error)
    }

    if (originalConfig._retry) {
      return Promise.reject(error)
    }

    originalConfig._retry = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject, config: originalConfig })
      })
    }

    isRefreshing = true

    try {
      const newToken = await refreshAccessTokenOnce()
      authHandlers?.setAccessToken(newToken)

      flushQueueSuccess(newToken)

      originalConfig.headers = originalConfig.headers ?? {}
      originalConfig.headers.Authorization = `Bearer ${newToken}`
      return api(originalConfig)
    } catch (refreshError) {
      flushQueueFailure(refreshError)

      // Only force logout if there is NO refresh token available,
      // OR if the refresh endpoint itself returned a 4xx error (e.g., 401, 403, 404).
      // A 500 on the refresh endpoint is a backend bug, so don't punish the user.
      const isMissingToken = refreshError instanceof Error && refreshError.message === 'NO_REFRESH_TOKEN'
      const refreshStatus = (refreshError as AxiosError)?.response?.status
      const isClientError = refreshStatus !== undefined && refreshStatus >= 400 && refreshStatus < 500
      
      if (isMissingToken || isClientError) {
        authHandlers?.logoutAndRedirect()
      }

      return Promise.reject(error) // Re-throw the original error, not the refresh error
    } finally {
      isRefreshing = false
    }
  },
)
