import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import {
  clearLegacyAuth,
  getStoredToken,
  getStoredUser,
  saveSession,
  clearSession,
} from '../lib/authStorage'
import { getApiBaseUrl } from '../lib/apiConfig'

const BASE_URL = getApiBaseUrl()

const AuthContext = createContext(null)

function applyAuthHeader(token) {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete axios.defaults.headers.common['Authorization']
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => {
    clearLegacyAuth()
    const t = getStoredToken()
    applyAuthHeader(t)
    return t
  })
  const [loading, setLoading] = useState(true)

  // Restore session from this tab's sessionStorage
  useEffect(() => {
    const storedUser = getStoredUser()
    if (token && storedUser) {
      setUser(storedUser)
    } else if (!token) {
      setUser(null)
    }
    setLoading(false)
  }, [token])

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${BASE_URL}/auth/login`, { email, password })
    const { access_token, role, user_id, name } = res.data
    const userData = { id: user_id, name, role }

    saveSession(access_token, userData)
    applyAuthHeader(access_token)
    setToken(access_token)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    clearSession()
    applyAuthHeader(null)
    setToken(null)
    setUser(null)
  }, [])

  // Attach this tab's token on every request (sessionStorage is per-tab)
  useEffect(() => {
    const reqInterceptor = axios.interceptors.request.use(config => {
      const t = getStoredToken()
      if (t) {
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${t}`
      }
      return config
    })
    return () => axios.interceptors.request.eject(reqInterceptor)
  }, [])

  // Configure Axios Response Interceptor
  useEffect(() => {
    const resInterceptor = axios.interceptors.response.use(
      response => response,
      error => {
        let errorMsg = 'An unexpected error occurred.'

        if (error && error.response) {
          const { status, data } = error.response
          if (status === 401) {
            logout()
            errorMsg = 'Session expired or invalid credentials. Please log in again.'
          } else if (status === 422) {
            errorMsg = 'Form validation error.'
            if (data && data.detail) {
              if (Array.isArray(data.detail)) {
                errorMsg = data.detail
                  .map(err => {
                    if (typeof err === 'string') return err
                    if (err && typeof err === 'object') {
                      const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : ''
                      return `${field ? `'${field}'` : 'Field'} ${err.msg || 'is invalid'}`
                    }
                    return String(err)
                  })
                  .join('. ')
              } else if (typeof data.detail === 'string') {
                errorMsg = data.detail
              } else if (typeof data.detail === 'object') {
                errorMsg = JSON.stringify(data.detail)
              }
            }
          } else if (status === 500) {
            errorMsg = 'An internal server error occurred on the backend. Please try again later.'
          } else if (data && typeof data.detail === 'string') {
            errorMsg = data.detail
          } else if (data && typeof data.message === 'string') {
            errorMsg = data.message
          }
        } else if (error && (error.message === 'Network Error' || !error.status)) {
          errorMsg = 'Connection failed. Please check if your backend server is active and running.'
        } else if (error && error.message) {
          errorMsg = error.message
        }

        if (error) {
          error.message = errorMsg
        } else {
          error = new Error(errorMsg)
        }

        return Promise.reject(error)
      }
    )

    return () => {
      axios.interceptors.response.eject(resInterceptor)
    }
  }, [logout])

  const isAuthenticated = Boolean(token && user)

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, login, logout, BASE_URL }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
