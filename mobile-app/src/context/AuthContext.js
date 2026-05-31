import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ⚠️ Replace with your machine's local IP when testing on a physical device
export const BASE_URL = 'http://192.168.29.47:8000'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on app launch
  useEffect(() => {
    ;(async () => {
      console.log("[AuthContext] Initializing session...")
      try {
        const [storedToken, storedUser] = await AsyncStorage.multiGet(['erp_token', 'erp_user'])
        const t = storedToken[1]
        const u = storedUser[1]
        console.log("[AuthContext] Loaded token:", t ? "FOUND" : "NOT FOUND", "Loaded user:", u)
        if (t && u) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${t}`
          setToken(t)
          setUser(JSON.parse(u))
        }
      } catch (err) {
        console.log("[AuthContext] Error reading AsyncStorage:", err.message)
      }
      setLoading(false)
      console.log("[AuthContext] Session initialization complete.")
    })()
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${BASE_URL}/auth/login`, { email, password })
    const { access_token, role, user_id, name } = res.data
    const userData = { id: user_id, name, role }

    await AsyncStorage.multiSet([
      ['erp_token', access_token],
      ['erp_user',  JSON.stringify(userData)],
    ])
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setToken(access_token)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['erp_token', 'erp_user'])
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated: !!token, login, logout, BASE_URL }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
