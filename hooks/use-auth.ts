import { useCallback, useEffect, useState } from 'react'

// Generic auth status interface
interface BaseAuthStatus {
  authenticated: boolean
  loading: boolean
  error?: string
}

// Generic auth configuration
interface AuthConfig<T extends BaseAuthStatus> {
  provider: string
  statusEndpoint: string
  loginEndpoint?: string
  logoutEndpoint: string
  refreshEndpoint?: string
  initialState: T
  loginHandler?: (mode?: string) => void | Promise<void>
  refreshHandler?: () => Promise<void>
  autoRefreshConfig?: {
    enabled: boolean
    expiryField: keyof T
    hasRefreshTokenField: keyof T
    refreshBuffer: number
  }
}

// Generic auth hook
export function useAuth<T extends BaseAuthStatus>(config: AuthConfig<T>) {
  const [authStatus, setAuthStatus] = useState<T>(config.initialState)

  const updateAuthStatus = useCallback((updates: Partial<T>) => {
    setAuthStatus((prev) => ({ ...prev, ...updates }))
  }, [])

  const setError = useCallback(
    (error?: string) => {
      updateAuthStatus({ error, loading: false } as Partial<T>)
    },
    [updateAuthStatus]
  )

  const setLoading = useCallback(
    (loading: boolean) => {
      updateAuthStatus({ loading, error: undefined } as Partial<T>)
    },
    [updateAuthStatus]
  )

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(config.statusEndpoint)

      if (!response.ok) {
        throw new Error('Failed to check auth status')
      }

      const data = await response.json()
      setAuthStatus({
        ...config.initialState,
        ...data,
        loading: false,
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    }
  }, [config.statusEndpoint, config.initialState, setLoading, setError])

  const login = useCallback(
    async (mode?: string) => {
      try {
        setLoading(true)

        if (config.loginHandler) {
          await config.loginHandler(mode)
        } else if (config.loginEndpoint) {
          const response = await fetch(config.loginEndpoint, {
            method: 'POST',
          })

          const data = await response.json()

          if (!data.success) {
            throw new Error(data.error || data.message)
          }

          await checkAuthStatus()
          return data
        } else {
          // Default redirect-based login
          window.location.href = `/api/auth/${config.provider}/authorize${mode ? `?mode=${mode}` : ''}`
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Login failed')
        throw error
      }
    },
    [
      config.loginHandler,
      config.loginEndpoint,
      config.provider,
      setLoading,
      setError,
      checkAuthStatus,
      config,
    ]
  )

  const logout = useCallback(async () => {
    try {
      const response = await fetch(config.logoutEndpoint, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to logout')
      }

      await checkAuthStatus()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Logout failed')
    }
  }, [config.logoutEndpoint, setError, checkAuthStatus])

  const refreshToken = useCallback(async () => {
    if (!config.refreshEndpoint) {
      return
    }

    try {
      const response = await fetch(config.refreshEndpoint, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }

      await checkAuthStatus()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Token refresh failed')
    }
  }, [config.refreshEndpoint, setError, checkAuthStatus])

  // Auto-refresh effect
  useEffect(() => {
    if (!(config.autoRefreshConfig?.enabled && authStatus.authenticated)) {
      return
    }

    const { expiryField, hasRefreshTokenField, refreshBuffer } = config.autoRefreshConfig
    const expiryTime = authStatus[expiryField] as number
    const hasRefreshToken = authStatus[hasRefreshTokenField] as boolean

    if (expiryTime && hasRefreshToken) {
      const timeUntilExpiry = expiryTime - Date.now()
      const refreshTime = Math.max(0, timeUntilExpiry - refreshBuffer)

      if (refreshTime > 0) {
        const timeout = setTimeout(refreshToken, refreshTime)
        return () => clearTimeout(timeout)
      }
    }
  }, [authStatus, config.autoRefreshConfig, refreshToken])

  // Initial auth check
  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  return {
    ...authStatus,
    login,
    logout,
    refreshToken,
    refresh: checkAuthStatus,
  }
}
