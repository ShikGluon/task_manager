import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import client from '../api/client'

interface AuthUser {
  email: string
}

/** Values exposed on the auth context. */
interface AuthContextValue {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Provides authentication state and actions to the component tree.
 * On mount, pings `/auth/me` to validate any stored token and logs out silently on failure.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const login = async (email: string, password: string) => {
    const { data } = await client.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify({ email: data.email }))
    setUser({ email: data.email })
  }

  const register = async (email: string, password: string) => {
    const { data } = await client.post('/auth/register', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify({ email: data.email }))
    setUser({ email: data.email })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  // Verify the stored token still maps to a real user (e.g. after a DB reset)
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    client.get('/auth/me').catch(() => logout())
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is intentionally co-located with its provider
/** Consume the auth context. Throws if called outside of `AuthProvider`. */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
