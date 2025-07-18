import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { ClaudeAuthClient } from '@/lib/auth/claude-auth'
import { useClaudeAuth } from '@/src/hooks/useClaudeAuth'

// Mock ClaudeAuthClient
mock('@/lib/auth/claude-auth')

// Mock window.location
const mockLocation = {
  href: 'https://app.example.com',
  search: '',
  origin: 'https://app.example.com',
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

// Mock sessionStorage
const mockSessionStorage = {
  getItem: mock(),
  setItem: mock(),
  removeItem: mock(),
  clear: mock(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
})

describe('useClaudeAuth', () => {
  const defaultProps = {
    clientId: 'test-client-id',
    redirectUri: 'https://app.example.com/callback',
  }

  let mockAuthClient: any
  const MockedClaudeAuthClient = ClaudeAuthClient as unknown as ReturnType<typeof mock>

  beforeEach(() => {
    mock.restore()
    mockAuthClient = {
      getAuthorizationUrl: mock(),
      exchangeCodeForToken: mock(),
      refreshToken: mock(),
    }
    MockedClaudeAuthClient.mockImplementation(() => mockAuthClient)

    // Reset window.location
    mockLocation.href = 'https://app.example.com'
    mockLocation.search = ''
  })

  afterEach(() => {
    mock.restore()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useClaudeAuth(defaultProps))

      expect(result.current.isAuthenticating).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.startLogin).toBe('function')
      expect(typeof result.current.refreshToken).toBe('function')
    })

    it('should create auth client with provided config', () => {
      renderHook(() => useClaudeAuth(defaultProps))

      expect(ClaudeAuthClient).toHaveBeenCalledWith({
        clientId: 'test-client-id',
        redirectUri: 'https://app.example.com/callback',
      })
    })
  })

  describe('OAuth callback handling', () => {
    it('should handle successful callback', async () => {
      const onSuccess = mock()
      mockLocation.href = 'https://app.example.com/callback?code=auth-code&state=test-state'
      mockLocation.search = '?code=auth-code&state=test-state'

      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'claude_auth_state') {
          return 'test-state'
        }
        if (key === 'claude_auth_verifier') {
          return 'test-verifier'
        }
        return null
      })

      const mockTokenResponse = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
      }
      mockAuthClient.exchangeCodeForToken.mockResolvedValue(mockTokenResponse)

      const { result } = renderHook(() =>
        useClaudeAuth({
          ...defaultProps,
          onSuccess,
        })
      )

      // Wait for effect to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(mockAuthClient.exchangeCodeForToken).toHaveBeenCalledWith('auth-code', 'test-verifier')
      expect(onSuccess).toHaveBeenCalledWith(mockTokenResponse)
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('claude_auth_state')
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('claude_auth_verifier')
      expect(result.current.error).toBeNull()
    })

    it('should handle error in callback URL', async () => {
      const onError = mock()
      mockLocation.href =
        'https://app.example.com/callback?error=access_denied&error_description=User+denied+access'
      mockLocation.search = '?error=access_denied&error_description=User+denied+access'

      const { result } = renderHook(() =>
        useClaudeAuth({
          ...defaultProps,
          onError,
        })
      )

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(result.current.error?.message).toBe('User denied access')
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User denied access',
        })
      )
    })

    it('should handle missing error description', async () => {
      mockLocation.href = 'https://app.example.com/callback?error=unknown_error'
      mockLocation.search = '?error=unknown_error'

      const { result } = renderHook(() => useClaudeAuth(defaultProps))

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(result.current.error?.message).toBe('Authentication failed')
    })

    it('should handle invalid state', async () => {
      const onError = mock()
      mockLocation.href = 'https://app.example.com/callback?code=auth-code&state=wrong-state'
      mockLocation.search = '?code=auth-code&state=wrong-state'

      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'claude_auth_state') {
          return 'test-state'
        }
        if (key === 'claude_auth_verifier') {
          return 'test-verifier'
        }
        return null
      })

      const { result } = renderHook(() =>
        useClaudeAuth({
          ...defaultProps,
          onError,
        })
      )

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(result.current.error?.message).toBe('Invalid state or missing verifier')
      expect(onError).toHaveBeenCalled()
      expect(mockAuthClient.exchangeCodeForToken).not.toHaveBeenCalled()
    })

    it('should handle missing verifier', async () => {
      mockLocation.href = 'https://app.example.com/callback?code=auth-code&state=test-state'
      mockLocation.search = '?code=auth-code&state=test-state'

      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'claude_auth_state') {
          return 'test-state'
        }
        return null // Missing verifier
      })

      const { result } = renderHook(() => useClaudeAuth(defaultProps))

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(result.current.error?.message).toBe('Invalid state or missing verifier')
    })

    it('should handle token exchange failure', async () => {
      mockLocation.href = 'https://app.example.com/callback?code=auth-code&state=test-state'
      mockLocation.search = '?code=auth-code&state=test-state'

      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'claude_auth_state') {
          return 'test-state'
        }
        if (key === 'claude_auth_verifier') {
          return 'test-verifier'
        }
        return null
      })

      mockAuthClient.exchangeCodeForToken.mockRejectedValue(new Error('Exchange failed'))

      const { result } = renderHook(() => useClaudeAuth(defaultProps))

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(result.current.error?.message).toBe('Exchange failed')
    })
  })

  describe('startLogin', () => {
    it('should start login flow successfully', () => {
      mockAuthClient.getAuthorizationUrl.mockReturnValue({
        url: 'https://claude.ai/oauth/authorize?params',
        verifier: 'generated-verifier',
        state: 'generated-state',
      })

      const { result } = renderHook(() => useClaudeAuth(defaultProps))

      act(() => {
        result.current.startLogin()
      })

      expect(mockAuthClient.getAuthorizationUrl).toHaveBeenCalled()
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'claude_auth_verifier',
        'generated-verifier'
      )
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'claude_auth_state',
        'generated-state'
      )
      expect(window.location.href).toBe('https://claude.ai/oauth/authorize?params')
    })

    it('should handle errors during login start', () => {
      const onError = mock()
      mockAuthClient.getAuthorizationUrl.mockImplementation(() => {
        throw new Error('Failed to generate URL')
      })

      const { result } = renderHook(() =>
        useClaudeAuth({
          ...defaultProps,
          onError,
        })
      )

      act(() => {
        result.current.startLogin()
      })

      expect(result.current.error?.message).toBe('Failed to generate URL')
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to generate URL',
        })
      )
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled()
    })

    it('should handle non-Error exceptions', () => {
      mockAuthClient.getAuthorizationUrl.mockImplementation(() => {
        throw 'String error'
      })

      const { result } = renderHook(() => useClaudeAuth(defaultProps))

      act(() => {
        result.current.startLogin()
      })

      expect(result.current.error?.message).toBe('Failed to start login')
    })

    it('should set and clear isAuthenticating state', () => {
      mockAuthClient.getAuthorizationUrl.mockReturnValue({
        url: 'https://claude.ai/oauth/authorize',
        verifier: 'verifier',
        state: 'state',
      })

      const { result } = renderHook(() => useClaudeAuth(defaultProps))

      expect(result.current.isAuthenticating).toBe(false)

      act(() => {
        result.current.startLogin()
      })

      // Since navigation happens synchronously, isAuthenticating goes back to false
      expect(result.current.isAuthenticating).toBe(false)
    })
  })

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockNewToken = {
        access_token: 'new-token',
        token_type: 'Bearer',
        expires_in: 7200,
        refresh_token: 'new-refresh-token',
      }
      mockAuthClient.refreshToken.mockResolvedValue(mockNewToken)

      const { result } = renderHook(() => useClaudeAuth(defaultProps))

      let tokenResult
      await act(async () => {
        tokenResult = await result.current.refreshToken('old-refresh-token')
      })

      expect(mockAuthClient.refreshToken).toHaveBeenCalledWith('old-refresh-token')
      expect(tokenResult).toEqual(mockNewToken)
      expect(result.current.error).toBeNull()
    })

    it('should handle refresh token errors', async () => {
      const onError = mock()
      mockAuthClient.refreshToken.mockRejectedValue(new Error('Refresh failed'))

      const { result } = renderHook(() =>
        useClaudeAuth({
          ...defaultProps,
          onError,
        })
      )

      await act(async () => {
        try {
          await result.current.refreshToken('expired-token')
        } catch (_e) {
          // Expected to throw
        }
      })

      expect(result.current.error?.message).toBe('Refresh failed')
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Refresh failed',
        })
      )
    })

    it('should handle non-Error exceptions during refresh', async () => {
      mockAuthClient.refreshToken.mockRejectedValue('String error')

      const { result } = renderHook(() => useClaudeAuth(defaultProps))

      await act(async () => {
        try {
          await result.current.refreshToken('token')
        } catch (_e) {
          // Expected to throw
        }
      })

      expect(result.current.error?.message).toBe('Failed to refresh token')
    })

    it('should manage isAuthenticating state during refresh', async () => {
      let resolveRefresh: (value: any) => void
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve
      })
      mockAuthClient.refreshToken.mockReturnValue(refreshPromise)

      const { result } = renderHook(() => useClaudeAuth(defaultProps))

      expect(result.current.isAuthenticating).toBe(false)

      let refreshTokenPromise: Promise<any>
      act(() => {
        refreshTokenPromise = result.current.refreshToken('token')
      })

      expect(result.current.isAuthenticating).toBe(true)

      await act(async () => {
        resolveRefresh?.({ access_token: 'new-token' })
        await refreshTokenPromise!
      })

      expect(result.current.isAuthenticating).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should clear error when starting new operation', () => {
      const { result } = renderHook(() => useClaudeAuth(defaultProps))

      // Set an error
      act(() => {
        result.current.startLogin()
      })
      mockAuthClient.getAuthorizationUrl.mockImplementation(() => {
        throw new Error('Initial error')
      })

      expect(result.current.error).toBeTruthy()

      // Try login again (successful this time)
      mockAuthClient.getAuthorizationUrl.mockReturnValue({
        url: 'https://claude.ai/oauth/authorize',
        verifier: 'verifier',
        state: 'state',
      })

      act(() => {
        result.current.startLogin()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('cleanup', () => {
    it('should not process callback after unmount', async () => {
      const onSuccess = mock()
      mockLocation.href = 'https://app.example.com/callback?code=auth-code&state=test-state'
      mockLocation.search = '?code=auth-code&state=test-state'

      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'claude_auth_state') {
          return 'test-state'
        }
        if (key === 'claude_auth_verifier') {
          return 'test-verifier'
        }
        return null
      })

      const { unmount } = renderHook(() =>
        useClaudeAuth({
          ...defaultProps,
          onSuccess,
        })
      )

      // Unmount immediately
      unmount()

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle URL without query parameters', async () => {
      mockLocation.href = 'https://app.example.com'
      mockLocation.search = ''

      const { result } = renderHook(() => useClaudeAuth(defaultProps))

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(result.current.error).toBeNull()
      expect(mockAuthClient.exchangeCodeForToken).not.toHaveBeenCalled()
    })

    it('should handle concurrent refresh requests', async () => {
      const mockToken1 = { access_token: 'token1' }
      const mockToken2 = { access_token: 'token2' }

      mockAuthClient.refreshToken
        .mockResolvedValueOnce(mockToken1)
        .mockResolvedValueOnce(mockToken2)

      const { result } = renderHook(() => useClaudeAuth(defaultProps))

      const [token1, token2] = await act(async () => {
        return Promise.all([
          result.current.refreshToken('refresh1'),
          result.current.refreshToken('refresh2'),
        ])
      })

      expect(token1).toEqual(mockToken1)
      expect(token2).toEqual(mockToken2)
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(2)
    })
  })
})
