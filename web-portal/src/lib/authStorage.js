/**
 * Per-tab auth persistence (sessionStorage).
 * Each browser tab/window has its own session — log in separately per tab.
 */

const TOKEN_KEY = 'erp_token'
const USER_KEY = 'erp_user'

/** Remove legacy localStorage keys so old builds do not share one login across tabs. */
export function clearLegacyAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    // private mode / blocked storage
  }
}

export function getStoredToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getStoredUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveSession(token, user) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  clearLegacyAuth()
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
  clearLegacyAuth()
}
