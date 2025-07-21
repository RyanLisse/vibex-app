import { afterEach, beforeEach, describe, expect, it, spyOn, test } from 'vitest'
import { vi } from 'vitest'
import {
  exchangeCodexToken,
  generateCodexAuthUrl,
  generateCodexHeaders,
  getCodexScopes,
  getCodexUserInfo,
  isCodexTokenExpired,
  parseCodexError,
  refreshCodexToken,
  revokeCodexToken,
  validateCodexToken,
} from './openai-codex'

// Mock fetch
global.fetch = vi.fn()

// Mock environment variables
vi.mock('@/lib/env', () => ({
  env: {
    OPENAI_CODEX_CLIENT_ID: 'test-codex-client-id',
    OPENAI_CODEX_CLIENT_SECRET: 'test-codex-secret',
    OPENAI_CODEX_REDIRECT_URI: 'https://app.example.com/auth/codex/callback',
    OPENAI_CODEX_API_URL: 'https://api.openai.com/codex/v1',
  },
}))

describe('OpenAI Codex Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateCodexAuthUrl', () => {
    it('should generate a valid Codex authorization URL', () => {
      const params = {
        state: 'test-state',
        scope: 'code:read code:write',
        codeChallenge: 'test-challenge',
      }

      const url = generateCodexAuthUrl(params)
      const urlObj = new URL(url)

      expect(urlObj.origin).toBe('https://api.openai.com')
      expect(urlObj.pathname).toBe('/codex/v1/oauth/authorize')
      expect(urlObj.searchParams.get('client_id')).toBe('test-codex-client-id')
      expect(urlObj.searchParams.get('redirect_uri')).toBe(
        'https://app.example.com/auth/codex/callback'
      )
      expect(urlObj.searchParams.get('response_type')).toBe('code')
      expect(urlObj.searchParams.get('scope')).toBe('code:read code:write')
      expect(urlObj.searchParams.get('state')).toBe('test-state')
      expect(urlObj.searchParams.get('code_challenge')).toBe('test-challenge')
      expect(urlObj.searchParams.get('code_challenge_method')).toBe('S256')
    })

    it('should include default Codex scopes', () => {
      const url = generateCodexAuthUrl()
      const urlObj = new URL(url)

      expect(urlObj.searchParams.get('scope')).toBe('code:read code:write code:execute')
    })

    it('should handle custom parameters', () => {
      const params = {
        prompt: 'consent',
        maxAge: 0,
        loginHint: 'user@example.com',
      }

      const url = generateCodexAuthUrl(params)
      const urlObj = new URL(url)

      expect(urlObj.searchParams.get('prompt')).toBe('consent')
      expect(urlObj.searchParams.get('max_age')).toBe('0')
      expect(urlObj.searchParams.get('login_hint')).toBe('user@example.com')
    })
  })

  describe('exchangeCodexToken', () => {
    it('should exchange authorization code for Codex token', async () => {
      const mockTokenResponse = {
        access_token: 'codex-access-token',
        refresh_token: 'codex-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'code:read code:write code:execute',
        model_permissions: ['davinci-codex', 'cushman-codex'],
      }

      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as unknown)

      const result = await exchangeCodexToken({
        code: 'test-code',
        codeVerifier: 'test-verifier',
      })

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/codex/v1/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: expect.stringMatching(/^Basic /),
          }),
          body: expect.stringContaining('grant_type=authorization_code'),
        })
      )

      expect(result).toEqual(mockTokenResponse)
      expect(result.model_permissions).toContain('davinci-codex')
    })

    it('should handle token exchange errors with specific Codex error codes', async () => {
      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'The provided authorization code is invalid or expired',
          error_code: 'CODEX_AUTH_001',
        }),
      } as unknown)

      await expect(
        exchangeCodexToken({
          code: 'invalid-code',
          codeVerifier: 'test-verifier',
        })
      ).rejects.toThrow('Codex token exchange failed: CODEX_AUTH_001')
    })
  })

  describe('refreshCodexToken', () => {
    it('should refresh a Codex access token', async () => {
      const mockRefreshResponse = {
        access_token: 'new-codex-token',
        refresh_token: 'new-codex-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'code:read code:write code:execute',
        model_permissions: ['davinci-codex', 'cushman-codex', 'ada-codex'],
      }

      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRefreshResponse,
      } as unknown)

      const result = await refreshCodexToken('test-refresh-token')

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/codex/v1/oauth/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('grant_type=refresh_token'),
        })
      )

      expect(result.model_permissions).toContain('ada-codex')
    })
  })

  describe('validateCodexToken', () => {
    it('should validate a Codex token and return permissions', async () => {
      const mockValidationResponse = {
        active: true,
        scope: 'code:read code:write code:execute',
        client_id: 'test-codex-client-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        model_permissions: ['davinci-codex', 'cushman-codex'],
        rate_limits: {
          requests_per_minute: 60,
          tokens_per_minute: 150_000,
        },
      }

      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidationResponse,
      } as unknown)

      const result = await validateCodexToken('test-codex-token')

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/codex/v1/oauth/introspect',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-codex-token',
          }),
        })
      )

      expect(result.active).toBe(true)
      expect(result.model_permissions).toContain('davinci-codex')
      expect(result.rate_limits.requests_per_minute).toBe(60)
    })
  })

  describe('getCodexUserInfo', () => {
    it('should retrieve Codex user information', async () => {
      const mockUserInfo = {
        sub: 'codex-user-123',
        email: 'developer@example.com',
        name: 'Codex Developer',
        organization_id: 'org-codex-456',
        codex_access: {
          models: ['davinci-codex', 'cushman-codex'],
          features: ['completions', 'edits', 'embeddings'],
          usage_tier: 'professional',
        },
      }

      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserInfo,
      } as unknown)

      const result = await getCodexUserInfo('test-codex-token')

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/codex/v1/oauth/userinfo',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-codex-token',
          }),
        })
      )

      expect(result.codex_access.models).toContain('davinci-codex')
      expect(result.codex_access.usage_tier).toBe('professional')
    })
  })

  describe('revokeCodexToken', () => {
    it('should revoke a Codex token', async () => {
      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as unknown)

      await revokeCodexToken('test-codex-token')

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/codex/v1/oauth/revoke',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
          body: expect.stringContaining('token=test-codex-token'),
        })
      )
    })

    it('should handle revocation with hint', async () => {
      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as unknown)

      await revokeCodexToken('test-refresh-token', 'refresh_token')

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('token_type_hint=refresh_token'),
        })
      )
    })
  })

  describe('generateCodexHeaders', () => {
    it('should generate proper headers for Codex API requests', () => {
      const headers = generateCodexHeaders('test-token')

      expect(headers).toEqual({
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
        'OpenAI-Organization': undefined,
        'OpenAI-Beta': 'codex-api-v1',
      })
    })

    it('should include organization ID if provided', () => {
      const headers = generateCodexHeaders('test-token', 'org-123')

      expect(headers['OpenAI-Organization']).toBe('org-123')
    })

    it('should include custom headers', () => {
      const headers = generateCodexHeaders('test-token', undefined, {
        'X-Custom-Header': 'custom-value',
      })

      expect(headers['X-Custom-Header']).toBe('custom-value')
    })
  })

  describe('parseCodexError', () => {
    it('should parse Codex-specific error responses', () => {
      const errorResponse = {
        error: {
          type: 'invalid_request_error',
          code: 'model_not_available',
          message: 'The requested Codex model is not available for your account',
          param: 'model',
          internal_code: 'CODEX_MODEL_001',
        },
      }

      const parsed = parseCodexError(errorResponse)

      expect(parsed.type).toBe('invalid_request_error')
      expect(parsed.code).toBe('model_not_available')
      expect(parsed.internalCode).toBe('CODEX_MODEL_001')
    })

    it('should handle non-standard error formats', () => {
      const errorResponse = {
        message: 'Generic error message',
      }

      const parsed = parseCodexError(errorResponse)

      expect(parsed.type).toBe('unknown_error')
      expect(parsed.message).toBe('Generic error message')
    })
  })

  describe('isCodexTokenExpired', () => {
    it('should correctly identify expired tokens', () => {
      const expiredToken = {
        access_token: 'test-token',
        expires_at: Date.now() - 1000, // 1 second ago
      }

      expect(isCodexTokenExpired(expiredToken)).toBe(true)
    })

    it('should correctly identify valid tokens', () => {
      const validToken = {
        access_token: 'test-token',
        expires_at: Date.now() + 3_600_000, // 1 hour from now
      }

      expect(isCodexTokenExpired(validToken)).toBe(false)
    })

    it('should handle tokens with buffer time', () => {
      const soonToExpireToken = {
        access_token: 'test-token',
        expires_at: Date.now() + 60_000, // 1 minute from now
      }

      // With 5 minute buffer
      expect(isCodexTokenExpired(soonToExpireToken, 300_000)).toBe(true)

      // With 30 second buffer
      expect(isCodexTokenExpired(soonToExpireToken, 30_000)).toBe(false)
    })
  })

  describe('getCodexScopes', () => {
    it('should parse scope string into array', () => {
      const scopeString = 'code:read code:write code:execute model:davinci-codex'
      const scopes = getCodexScopes(scopeString)

      expect(scopes).toEqual(['code:read', 'code:write', 'code:execute', 'model:davinci-codex'])
    })

    it('should handle empty scope string', () => {
      expect(getCodexScopes('')).toEqual([])
    })

    it('should validate Codex-specific scopes', () => {
      const scopeString = 'code:read invalid:scope code:write'
      const scopes = getCodexScopes(scopeString, true)

      expect(scopes).toEqual(['code:read', 'code:write'])
    })
  })

  describe('Codex-specific Features', () => {
    it('should handle model-specific permissions in token', async () => {
      const mockTokenResponse = {
        access_token: 'test-token',
        model_permissions: {
          'davinci-codex': {
            max_tokens: 4000,
            temperature_range: [0, 2],
            features: ['completions', 'edits'],
          },
          'cushman-codex': {
            max_tokens: 2048,
            temperature_range: [0, 1],
            features: ['completions'],
          },
        },
      }

      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as unknown)

      const result = await exchangeCodexToken({
        code: 'test-code',
        codeVerifier: 'test-verifier',
      })

      expect(result.model_permissions['davinci-codex'].max_tokens).toBe(4000)
    })

    it('should handle rate limit headers in responses', async () => {
      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => {
            const headers: Record<string, string> = {
              'X-RateLimit-Limit-Requests': '60',
              'X-RateLimit-Remaining-Requests': '59',
              'X-RateLimit-Reset-Requests': '1234567890',
            }
            return headers[name]
          },
        },
        json: async () => ({ active: true }),
      } as unknown)

      const result = await validateCodexToken('test-token')

      expect(result).toBeTruthy()
    })
  })
})
