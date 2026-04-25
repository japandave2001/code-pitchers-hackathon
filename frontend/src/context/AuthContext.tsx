import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import api from '../api/axios'

export type Vendor = {
  id: string
  email: string
  companyName: string
  apiKey: string
  phone?: string
}

type AuthContextValue = {
  vendor: Vendor | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (data: { email: string; password: string; companyName: string; phone: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/auth/me')
      .then((res) => setVendor(res.data))
      .catch(() => {
        localStorage.removeItem('token')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', res.data.token)
    setVendor(res.data.vendor)
  }

  const signup = async (data: { email: string; password: string; companyName: string; phone: string }) => {
    const res = await api.post('/auth/signup', data)
    localStorage.setItem('token', res.data.token)
    setVendor(res.data.vendor)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setVendor(null)
  }

  return (
    <AuthContext.Provider value={{ vendor, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
