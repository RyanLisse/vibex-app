import { afterEach, beforeEach, describe, expect, it, type mock, spyOn, test } from 'bun:test'
import { vi } from 'vitest'
import { ClaudeAuthClient } from '@/src/lib/auth/claude-auth'
import * as pkce from '@/src/lib/auth/pkce'

// Mock PKCE module
vi.mock('./pkce')

// Mock fetch
global.fetch = vi.fn()

describe('ClaudeAuthClient', () => {
  let client: ClaudeAuthClient
  const mockGenerateCodeVerifier = pkce.generateCodeVerifier as ReturnType<typeof mock>
  const mockGenerateCodeChallenge = pkce.generateCodeChallenge as ReturnType<typeof mock>

  beforeEach(() => {
    vi.clearAllMocks()
    client = new ClaudeAuthClient({
      clientId: 'test-client-id',
      redirectUri: 'https://app.example.com/callback',
    })
  })

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      const customClient = new ClaudeAuthClient({
        clientId: 'custom-client',
        redirectUri: 'https://custom.app/callback',
        scopes: ['custom:scope'],
        authorizeUrl: 'https://custom.auth/authorize',
        tokenUrl: 'https://custom.auth/token',
      })

      // We can't directly access private config, so we test through behavior
      const authData = customClient.getAuthorizationUrl()
      expect(authData.url).toContain('https://custom.auth/authorize')
      expect(authData.url).toContain('custom:scope')
      expect(authData.url).toContain('client_id=custom-client')
    })

    it('should use default values when not provided', () => {
      const authData = client.getAuthorizationUrl()

      expect(authData.url).toContain('https://claude.ai/oauth/authorize')
      expect(authData.url).toContain('org:create_api_key')
      expect(authData.url).toContain('user:profile')
      expect(authData.url).toContain('user:inference')
    })
  })

  describe('getAuthorizationUrl', () => {
    beforeEach(() => {
      mockGenerateCodeVerifier.mockReturnValue('test-verifier')
      mockGenerateCodeChallenge.mockReturnValue('test-challenge')
    })

    it('should generate authorization URL with all required parameters', () => {
      const authData = client.getAuthorizationUrl()

      expect(mockGenerateCodeVerifier).toHaveBeenCalled()
      expect(mockGenerateCodeChallenge).toHaveBeenCalledWith('test-verifier')

      const url = new URL(authData.url)
      expect(url.origin + url.pathname).toBe('https://claude.ai/oauth/authorize')
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('client_id')).toBe('test-client-id')
      expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/callback')
      expect(url.searchParams.get('code_challenge')).toBe('test-challenge')
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
      expect(url.searchParams.get('state')).toBeDefined()
      expect(url.searchParams.get('scope')).toBe('org:create_api_key user:profile user:inference')
    })

    it('should return verifier and state', () => {
      const authData = client.getAuthorizationUrl()

      expect(authData.verifier).toBe('test-verifier')
      expect(authData.state).toBeDefined()
      expect(authData.state.length).toBe(16)
    })

    it('should use provided state parameter', () => {
      const customState = 'custom-state-value'
      const authData = client.getAuthorizationUrl(customState)

      expect(authData.state).toBe(customState)
      const url = new URL(authData.url)
      expect(url.searchParams.get('state')).toBe(customState)
    })

    it('should generate random state when not provided', () => {
      const authData1 = client.getAuthorizationUrl()
      const authData2 = client.getAuthorizationUrl()

      expect(authData1.state).not.toBe(authData2.state)
    })

    it('should properly encode scopes', () => {
      const customClient = new ClaudeAuthClient({
        clientId: 'test',
        redirectUri: 'https://test.com',
        scopes: ['scope:one', 'scope:two', 'scope:three'],
      })

      const authData = customClient.getAuthorizationUrl()
      const url = new URL(authData.url)

      expect(url.searchParams.get('scope')).toBe('scope:one scope:two scope:three')
    })
  })

  describe('exchangeCodeForToken', () => {
    it('should successfully exchange code for token', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        scope: 'org:create_api_key user:profile',
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response)

      const result = await client.exchangeCodeForToken('auth-code', 'code-verifier')

      expect(fetch).toHaveBeenCalledWith('https://console.anthropic.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: expect.any(URLSearchParams),
      })

      const callArgs = (fetch as any).mock.calls[0]
      const body = callArgs[1]?.body as URLSearchParams
      expect(body.get('grant_type')).toBe('authorization_code')
      expect(body.get('client_id')).toBe('test-client-id')
      expect(body.get('redirect_uri')).toBe('https://app.example.com/callback')
      expect(body.get('code')).toBe('auth-code')
      expect(body.get('code_verifier')).toBe('code-verifier')

      expect(result).toEqual(mockTokenResponse)
    })

    it('should handle token exchange errors', async () => {
      const errorResponse = {
        error: 'invalid_grant',
        error_description: 'Invalid authorization code',
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => errorResponse,
      } as Response)

      await expect(client.exchangeCodeForToken('invalid-code', 'verifier')).rejects.toThrow(
        'Failed to exchange code for token: 400 Bad Request - {"error":"invalid_grant","error_description":"Invalid authorization code"}'
      )
    })

    it('should handle network errors', async () => {
      ;(fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(client.exchangeCodeForToken('code', 'verifier')).rejects.toThrow('Network error')
    })

    it('should handle non-JSON error responses', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as Response)

      await expect(client.exchangeCodeForToken('code', 'verifier')).rejects.toThrow(
        'Failed to exchange code for token: 500 Internal Server Error - {}'
      )
    })

    it('should use custom token URL', async () => {
      const customClient = new ClaudeAuthClient({
        clientId: 'test',
        redirectUri: 'https://test.com',
        tokenUrl: 'https://custom.token.url',
      })

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      } as Response)

      await customClient.exchangeCodeForToken('code', 'verifier')

      expect(fetch).toHaveBeenCalledWith('https://custom.token.url', expect.any(Object))
    })
  })

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      const mockRefreshResponse = {
        access_token: 'new-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'new-refresh-token',
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRefreshResponse,
      } as Response)

      const result = await client.refreshToken('old-refresh-token')

      expect(fetch).toHaveBeenCalledWith('https://console.anthropic.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: expect.any(URLSearchParams),
      })

      const callArgs = (fetch as any).mock.calls[0]
      const body = callArgs[1]?.body as URLSearchParams
      expect(body.get('grant_type')).toBe('refresh_token')
      expect(body.get('client_id')).toBe('test-client-id')
      expect(body.get('refresh_token')).toBe('old-refresh-token')

      expect(result).toEqual(mockRefreshResponse)
    })

    it('should handle refresh token errors', async () => {
      const errorResponse = {
        error: 'invalid_grant',
        error_description: 'Refresh token expired',
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => errorResponse,
      } as Response)

      await expect(client.refreshToken('expired-token')).rejects.toThrow(
        'Failed to refresh token: 401 Unauthorized - {"error":"invalid_grant","error_description":"Refresh token expired"}'
      )
    })

    it('should handle network errors during refresh', async () => {
      ;(fetch as any).mockRejectedValueOnce(new Error('Connection timeout'))

      await expect(client.refreshToken('token')).rejects.toThrow('Connection timeout')
    })

    it('should handle non-JSON error responses during refresh', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => {
          throw new Error('HTML response')
        },
      } as Response)

      await expect(client.refreshToken('token')).rejects.toThrow(
        'Failed to refresh token: 503 Service Unavailable - {}'
      )
    })
  })

  describe('generateRandomString', () => {
    it('should generate URL-safe random strings', () => {
      // We can't directly test private methods, but we can test through getAuthorizationUrl
      const states = new Set<string>()

      // Generate multiple states to check randomness and format
      for (let i = 0; i < 100; i++) {
        const authData = client.getAuthorizationUrl()
        states.add(authData.state)

        // Check format
        expect(authData.state).toMatch(/^[A-Za-z0-9\-._~]+$/)
        expect(authData.state.length).toBe(16)
      }

      // Check randomness (should have generated different states)
      expect(states.size).toBeGreaterThan(90) // Allow for some unlikely collisions
    })
  })

  describe('edge cases', () => {
    it('should handle empty scopes array', () => {
      const client = new ClaudeAuthClient({
        clientId: 'test',
        redirectUri: 'https://test.com',
        scopes: [],
      })

      const authData = client.getAuthorizationUrl()
      const url = new URL(authData.url)

      expect(url.searchParams.get('scope')).toBe('')
    })

    it('should handle special characters in redirect URI', () => {
      const client = new ClaudeAuthClient({
        clientId: 'test',
        redirectUri: 'https://test.com/callback?param=value&other=123',
      })

      const authData = client.getAuthorizationUrl()
      const url = new URL(authData.url)

      expect(url.searchParams.get('redirect_uri')).toBe(
        'https://test.com/callback?param=value&other=123'
      )
    })

    it('should handle concurrent token exchanges', async () => {
      const responses = [{ access_token: 'token1' }, { access_token: 'token2' }]

      ;(fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => responses[0],
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => responses[1],
        } as Response)

      const [result1, result2] = await Promise.all([
        client.exchangeCodeForToken('code1', 'verifier1'),
        client.exchangeCodeForToken('code2', 'verifier2'),
      ])

      expect(result1.access_token).toBe('token1')
      expect(result2.access_token).toBe('token2')
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })
})
