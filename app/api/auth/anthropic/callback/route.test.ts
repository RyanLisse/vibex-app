import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import { vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/anthropic/callback/route'

// Mock the authentication utilities
vi.mock('@/lib/auth/anthropic', () => ({
  AuthAnthropic: {
    exchange: vi.fn(),
  },
}))

// Mock NextResponse
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn(),
    redirect: vi.fn(),
  },
}))

// Mock environment variables
vi.mock('@/lib/env', () => ({
  env: {
    ANTHROPIC_CLIENT_ID: 'test-client-id',
    ANTHROPIC_CLIENT_SECRET: 'test-client-secret',
    ANTHROPIC_REDIRECT_URI: 'https://app.example.com/auth/anthropic/callback',
    ANTHROPIC_TOKEN_URL: 'https://anthropic.com/oauth/token',
    NEXTAUTH_URL: 'https://app.example.com',
  },
}))

// Define mock functions for the test
const mockExchangeCodeForToken = vi.fn()
const mockValidateOAuthState = vi.fn()
const mockSanitizeRedirectUrl = vi.fn()
const mockHandleAuthError = vi.fn()

const mockNextResponse = (await import('next/server' as any)).NextResponse

describe('GET /api/auth/anthropic/callback', () => {
  beforeEach(() => {
    mock.restore()
    mockValidateOAuthState.mockReturnValue(true)
    mockSanitizeRedirectUrl.mockImplementation((url) => url)
    mockHandleAuthError.mockImplementation((error) => error.toString())
  })

  it('should handle successful callback', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test-refresh-token',
    }

    mockExchangeCodeForToken.mockResolvedValue(mockToken)
    mockNextResponse.json.mockReturnValue({ success: true } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state'
    )

    const _response = await GET(request)

    expect(mockExchangeCodeForToken).toHaveBeenCalledWith({
      tokenUrl: 'https://anthropic.com/oauth/token',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      code: 'test-code',
      redirectUri: 'https://app.example.com/auth/anthropic/callback',
      codeVerifier: expect.any(String),
    })

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      success: true,
      token: mockToken,
    })
  })

  it('should handle missing code parameter', async () => {
    mockNextResponse.json.mockReturnValue({ error: 'Missing code parameter' } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/anthropic/callback?state=test-state'
    )

    const _response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Missing code parameter' },
      { status: 400 }
    )
  })

  it('should handle missing state parameter', async () => {
    mockNextResponse.json.mockReturnValue({ error: 'Missing state parameter' } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/anthropic/callback?code=test-code'
    )

    const _response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Missing state parameter' },
      { status: 400 }
    )
  })

  it('should handle invalid state', async () => {
    mockValidateOAuthState.mockReturnValue(false)
    mockNextResponse.json.mockReturnValue({ error: 'Invalid state parameter' } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/anthropic/callback?code=test-code&state=invalid-state'
    )

    const _response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid state parameter' },
      { status: 400 }
    )
  })

  it('should handle error parameter', async () => {
    mockNextResponse.json.mockReturnValue({ error: 'access_denied' } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/anthropic/callback?error=access_denied&error_description=User%20denied%20access'
    )

    const _response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'access_denied', error_description: 'User denied access' },
      { status: 400 }
    )
  })

  it('should handle token exchange failure', async () => {
    mockExchangeCodeForToken.mockRejectedValue(new Error('Token exchange failed'))
    mockHandleAuthError.mockReturnValue('Token exchange failed')
    mockNextResponse.json.mockReturnValue({ error: 'Token exchange failed' } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state'
    )

    const _response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Token exchange failed' },
      { status: 500 }
    )
  })

  it('should handle OAuth error responses', async () => {
    mockNextResponse.json.mockReturnValue({ error: 'invalid_grant' } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/anthropic/callback?error=invalid_grant&error_description=Invalid%20authorization%20code'
    )

    const _response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'invalid_grant', error_description: 'Invalid authorization code' },
      { status: 400 }
    )
  })

  it('should handle redirect after successful auth', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test-refresh-token',
    }

    mockExchangeCodeForToken.mockResolvedValue(mockToken)
    mockNextResponse.redirect.mockReturnValue({ status: 302 } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state&redirect_uri=https://app.example.com/dashboard'
    )

    const _response = await GET(request)

    expect(mockSanitizeRedirectUrl).toHaveBeenCalledWith('https://app.example.com/dashboard')
    expect(mockNextResponse.redirect).toHaveBeenCalledWith('https://app.example.com/dashboard')
  })

  it('should handle code verifier from session', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test-refresh-token',
    }

    mockExchangeCodeForToken.mockResolvedValue(mockToken)
    mockNextResponse.json.mockReturnValue({ success: true } as any)

    // Mock session storage or cookies for code verifier
    const request = new NextRequest(
      'https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state'
    )

    const _response = await GET(request)

    expect(mockExchangeCodeForToken).toHaveBeenCalledWith({
      tokenUrl: 'https://anthropic.com/oauth/token',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      code: 'test-code',
      redirectUri: 'https://app.example.com/auth/anthropic/callback',
      codeVerifier: expect.any(String),
    })
  })

  it('should handle missing environment variables', async () => {
    mock.doMock('@/lib/env', () => ({
      env: {
        ANTHROPIC_CLIENT_ID: undefined,
        ANTHROPIC_CLIENT_SECRET: undefined,
        ANTHROPIC_REDIRECT_URI: undefined,
        ANTHROPIC_TOKEN_URL: undefined,
        NEXTAUTH_URL: undefined,
      },
    }))

    mockNextResponse.json.mockReturnValue({ error: 'Missing configuration' } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state'
    )

    const _response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Missing configuration' },
      { status: 500 }
    )
  })

  it('should handle network errors', async () => {
    mockExchangeCodeForToken.mockRejectedValue(new Error('Network error'))
    mockHandleAuthError.mockReturnValue('Network error')
    mockNextResponse.json.mockReturnValue({ error: 'Network error' } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state'
    )

    const _response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith({ error: 'Network error' }, { status: 500 })
  })

  it('should handle malformed URLs', async () => {
    mockSanitizeRedirectUrl.mockImplementation(() => {
      throw new Error('Invalid redirect URL')
    })
    mockNextResponse.json.mockReturnValue({ error: 'Invalid redirect URL' } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state&redirect_uri=javascript:alert(1)'
    )

    const _response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid redirect URL' },
      { status: 400 }
    )
  })
})
