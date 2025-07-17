import { useState, useEffect } from 'react'

interface OpenAIAuthStatus {
  authenticated: boolean
  user?: {
    email?: string
    organization_id?: string
    credits_granted?: number
    created_at?: number
  }
  expires_at?: number
  hasRefreshToken?: boolean
  loading: boolean
  error?: string
}

export function useOpenAIAuth() {
  const [authStatus, setAuthStatus] = useState<OpenAIAuthStatus>({
    authenticated: false,
    loading: true,
  })

  const checkAuthStatus = async () => {
    try {
      setAuthStatus((prev) => ({ ...prev, loading: true, error: undefined }))
      const response = await fetch('/api/auth/openai/status')

      if (!response.ok) {
        throw new Error('Failed to check auth status')
      }

      const data = await response.json()
      setAuthStatus({
        authenticated: data.authenticated,
        user: data.user,
        expires_at: data.expires_at,
        hasRefreshToken: data.hasRefreshToken,
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

  const login = async () => {
    try {
      setAuthStatus((prev) => ({ ...prev, loading: true, error: undefined }))

      const response = await fetch('/api/auth/openai/login', {
        method: 'POST',
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || data.message)
      }

      await checkAuthStatus()
      return data
    } catch (error) {
      setAuthStatus((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }))
      throw error
    }
  }

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/openai/logout', {
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

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/auth/openai/refresh', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }

      await checkAuthStatus()
    } catch (error) {
      setAuthStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      }))
    }
  }

  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    if (authStatus.authenticated && authStatus.expires_at && authStatus.hasRefreshToken) {
      const timeUntilExpiry = authStatus.expires_at - Date.now()
      const refreshTime = Math.max(0, timeUntilExpiry - 60000) // Refresh 1 minute before expiry

      if (refreshTime > 0) {
        const timeout = setTimeout(() => {
          refreshToken()
        }, refreshTime)

        return () => clearTimeout(timeout)
      }
    }
  }, [authStatus.authenticated, authStatus.expires_at, authStatus.hasRefreshToken])

  return {
    ...authStatus,
    login,
    logout,
    refreshToken,
    refresh: checkAuthStatus,
  }
}
