'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAnthropicAuth } from '@/hooks/use-anthropic-auth'

interface AuthContextType {
  authenticated: boolean
  loading: boolean
  accessToken: string | null
  login: (mode?: 'max' | 'console') => void
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AnthropicAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAnthropicAuth()
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Auto-refresh token when needed
  useEffect(() => {
    if (auth.authenticated && auth.expires) {
      const timeUntilExpiry = auth.expires - Date.now()
      const refreshTime = Math.max(0, timeUntilExpiry - 60000) // Refresh 1 minute before expiry

      const timeout = setTimeout(() => {
        auth.refresh()
      }, refreshTime)

      return () => clearTimeout(timeout)
    }
  }, [auth.authenticated, auth.expires, auth.refresh, auth])

  // Get access token when authenticated
  useEffect(() => {
    if (auth.authenticated) {
      fetch('/api/auth/anthropic/token')
        .then((res) => res.json())
        .then((data) => setAccessToken(data.access_token))
        .catch(() => setAccessToken(null))
    } else {
      setAccessToken(null)
    }
  }, [auth.authenticated])

  const contextValue: AuthContextType = {
    authenticated: auth.authenticated,
    loading: auth.loading,
    accessToken,
    login: auth.login,
    logout: auth.logout,
    refresh: auth.refresh,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AnthropicAuthProvider')
  }
  return context
}
