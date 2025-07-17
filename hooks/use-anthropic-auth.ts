import { useState, useEffect } from 'react'

interface AuthStatus {
  authenticated: boolean
  type?: 'oauth' | 'api'
  expires?: number
  loading: boolean
  error?: string
}

export function useAnthropicAuth() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    authenticated: false,
    loading: true,
  })

  const checkAuthStatus = async () => {
    try {
      setAuthStatus((prev) => ({ ...prev, loading: true, error: undefined }))
      const response = await fetch('/api/auth/anthropic/status')

      if (!response.ok) {
        throw new Error('Failed to check auth status')
      }

      const data = await response.json()
      setAuthStatus({
        authenticated: data.authenticated,
        type: data.type,
        expires: data.expires,
        loading: false,
      })
    } catch (error) {
      setAuthStatus({
        authenticated: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const login = (mode: 'max' | 'console' = 'max') => {
    window.location.href = `/api/auth/anthropic/authorize?mode=${mode}`
  }

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/anthropic/logout', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to logout')
      }

      await checkAuthStatus()
    } catch (error) {
      setAuthStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Logout failed',
      }))
    }
  }

  useEffect(() => {
    checkAuthStatus()
  }, [])

  return {
    ...authStatus,
    login,
    logout,
    refresh: checkAuthStatus,
  }
}
