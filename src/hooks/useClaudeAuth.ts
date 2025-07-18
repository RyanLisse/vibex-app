import { useCallback, useEffect, useState } from 'react'
import { ClaudeAuthClient, type TokenResponse } from '@/lib/auth/claude-auth'

interface UseClaudeAuthProps {
  clientId: string
  redirectUri: string
  onSuccess?: (token: TokenResponse) => void
  onError?: (error: Error) => void
}

export function useClaudeAuth({ clientId, redirectUri, onSuccess, onError }: UseClaudeAuthProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [authClient] = useState(
    () =>
      new ClaudeAuthClient({
        clientId,
        redirectUri,
      })
  )

  // Handle the OAuth callback when the component mounts
  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      const errorMessage = url.searchParams.get('error_description') || 'Authentication failed'
      handleError(new Error(errorMessage))
      return
    }

    if (code && state) {
      handleCallback(code, state)
    }
  }, [handleCallback, handleError])

  const handleError = useCallback(
    (err: Error) => {
      setError(err)
      onError?.(err)
      setIsAuthenticating(false)
    },
    [onError]
  )

  const handleCallback = useCallback(
    async (code: string, state: string) => {
      try {
        setIsAuthenticating(true)
        setError(null)

        // Retrieve the code verifier from session storage
        const storedState = sessionStorage.getItem('claude_auth_state')
        const verifier = sessionStorage.getItem('claude_auth_verifier')

        if (!verifier || state !== storedState) {
          throw new Error('Invalid state or missing verifier')
        }

        // Exchange the code for a token
        const tokenResponse = await authClient.exchangeCodeForToken(code, verifier)

        // Clean up
        sessionStorage.removeItem('claude_auth_state')
        sessionStorage.removeItem('claude_auth_verifier')

        // Notify success
        onSuccess?.(tokenResponse)
        return tokenResponse
      } catch (err) {
        handleError(err instanceof Error ? err : new Error('Authentication failed'))
        throw err
      } finally {
        setIsAuthenticating(false)
      }
    },
    [authClient, handleError, onSuccess]
  )

  const startLogin = useCallback(() => {
    try {
      setIsAuthenticating(true)
      setError(null)

      // Generate authorization URL
      const { url, verifier, state } = authClient.getAuthorizationUrl()

      // Store the verifier and state in session storage
      sessionStorage.setItem('claude_auth_verifier', verifier)
      sessionStorage.setItem('claude_auth_state', state)

      // Redirect to the authorization URL
      window.location.href = url
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to start login'))
    } finally {
      setIsAuthenticating(false)
    }
  }, [authClient, handleError])

  const refreshToken = useCallback(
    async (refreshToken: string) => {
      try {
        setIsAuthenticating(true)
        setError(null)
        return await authClient.refreshToken(refreshToken)
      } catch (err) {
        handleError(err instanceof Error ? err : new Error('Failed to refresh token'))
        throw err
      } finally {
        setIsAuthenticating(false)
      }
    },
    [authClient, handleError]
  )

  return {
    startLogin,
    refreshToken,
    isAuthenticating,
    error,
  }
}

export default useClaudeAuth
