/**
 * Central API base URL for Vite (Vercel) and local dev (Vite proxy → /api).
 */
function normalizeBaseUrl(url) {
  if (!url || typeof url !== 'string') return ''
  return url.trim().replace(/\/+$/, '')
}

export function getApiBaseUrl() {
  const fromEnv = normalizeBaseUrl(import.meta.env.VITE_API_URL)
  if (fromEnv) return fromEnv
  // Local dev: vite.config.js proxies /api → backend
  if (import.meta.env.DEV) return '/api'
  // Production build without env: same-origin /api (set VITE_API_URL on Vercel)
  return '/api'
}

export const API_BASE_URL = getApiBaseUrl()
