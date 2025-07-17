'use client'

import { useState, useEffect } from 'react'
import { GitHubUser } from '@/lib/github'
import { checkAuthStatus, parseCookieValue, clearAuthCookies, getAuthUrl } from '@/lib/github-api'

interface UseGitHubUserReturn {
  isAuthenticated: boolean
  user: GitHubUser | null
  isLoading: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => void
}

export function useGitHubUser(): UseGitHubUserReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check authentication status on mount
  useEffect(() => {
    const abortController = new AbortController()

    const checkAuth = async () => {
      try {
        setIsLoading(true)
        const userCookie = parseCookieValue('github_user')

        if (userCookie) {
          const userData = JSON.parse(userCookie)
          const isValid = await checkAuthStatus(abortController.signal)

          if (isValid) {
            setUser(userData)
            setIsAuthenticated(true)
          } else {
            clearAuthCookies()
            setIsAuthenticated(false)
            setUser(null)
          }
        } else {
          setIsAuthenticated(false)
          setUser(null)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        console.error('Error checking auth status:', error)
        setIsAuthenticated(false)
        setUser(null)
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    checkAuth()
    return () => abortController.abort('Component unmounted')
  }, [])

  // Listen for auth success from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'GITHUB_AUTH_SUCCESS') {
        setTimeout(() => {
          const userCookie = parseCookieValue('github_user')
          if (userCookie) {
            try {
              const userData = JSON.parse(userCookie)
              setUser(userData)
              setIsAuthenticated(true)
              setIsLoading(false)
            } catch (error) {
              console.error('Error parsing user data:', error)
              setIsAuthenticated(false)
              setUser(null)
              setIsLoading(false)
            }
          }
        }, 1000)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const login = async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      const url = await getAuthUrl()

      // Open popup window for OAuth (centered on screen)
      const width = 600
      const height = 700
      const left = (window.screen.width - width) / 2
      const top = (window.screen.height - height) / 2

      const popup = window.open(
        url,
        'github-oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Wait for popup to close
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          setIsLoading(false)
        }
      }, 1000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed')
      setIsLoading(false)
    }
  }

  const logout = (): void => {
    clearAuthCookies()
    setIsAuthenticated(false)
    setUser(null)
  }

  return {
    isAuthenticated,
    user,
    isLoading,
    error,
    login,
    logout,
  }
}
