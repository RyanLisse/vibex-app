import { test, expect, describe, it, beforeEach, afterEach, mock } from "bun:test"
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/openai/callback/route'

// Mock the authentication utilities
mock('@/lib/auth/openai-codex', () => ({
  exchangeCodeForToken: mock(),
  validateOAuthState: mock(),
  sanitizeRedirectUrl: mock(),
  handleAuthError: mock(),
}))

// Mock NextResponse
mock('next/server', async () => {
  const actual = await mock.importActual('next/server')
  return {
    ...actual,
    NextResponse: {
      json: mock(),
      redirect: mock(),
    },
  }
})

// Mock environment variables
mock('@/lib/env', () => ({
  env: {
    OPENAI_CLIENT_ID: 'test-client-id',
    OPENAI_CLIENT_SECRET: 'test-client-secret',
    OPENAI_REDIRECT_URI: 'https://app.example.com/auth/openai/callback',
    OPENAI_TOKEN_URL: 'https://auth.openai.com/oauth/token',
    NEXTAUTH_URL: 'https://app.example.com',
  },
}))

const mockExchangeCodeForToken = mocked(
  await import('@/lib/auth/openai-codex')
).exchangeCodeForToken
const mockValidateOAuthState = mocked(await import('@/lib/auth/openai-codex')).validateOAuthState
const mockSanitizeRedirectUrl = mocked(
  await import('@/lib/auth/openai-codex')
).sanitizeRedirectUrl
const mockHandleAuthError = mocked(await import('@/lib/auth/openai-codex')).handleAuthError

const { NextResponse } = await import('next/server')
const mockNextResponse = mocked(NextResponse)

describe('GET /api/auth/openai/callback', () => {
  beforeEach(() => {
    mock.restore()
    mockValidateOAuthState.mockReturnValue(true)
    mockSanitizeRedirectUrl.mockImplementation((url) => url)
    mockHandleAuthError.mockImplementation((error: unknown) => error?.toString() || 'Unknown error')
  })

  it('should handle successful callback', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test-refresh-token',
      id_token: 'test-id-token',
    }

    mockExchangeCodeForToken.mockResolvedValue(mockToken)
    mockNextResponse.json.mockReturnValue({ success: true } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state'
    )

    const _response = await GET(request)

    expect(mockExchangeCodeForToken).toHaveBeenCalledWith({
      tokenUrl: 'https://auth.openai.com/oauth/token',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      code: 'test-code',
      redirectUri: 'https://app.example.com/auth/openai/callback',
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
      'https://app.example.com/api/auth/openai/callback?state=test-state'
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
      'https://app.example.com/api/auth/openai/callback?code=test-code'
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
      'https://app.example.com/api/auth/openai/callback?code=test-code&state=invalid-state'
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
      'https://app.example.com/api/auth/openai/callback?error=access_denied&error_description=User%20denied%20access'
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
      'https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state'
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
      'https://app.example.com/api/auth/openai/callback?error=invalid_grant&error_description=Invalid%20authorization%20code'
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
      id_token: 'test-id-token',
    }

    mockExchangeCodeForToken.mockResolvedValue(mockToken)
    mockNextResponse.redirect.mockReturnValue({ status: 302 } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state&redirect_uri=https://app.example.com/dashboard'
    )

    const _response = await GET(request)

    expect(mockSanitizeRedirectUrl).toHaveBeenCalledWith('https://app.example.com/dashboard')
    expect(mockNextResponse.redirect).toHaveBeenCalledWith('https://app.example.com/dashboard')
  })

  it('should handle user info extraction from id_token', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test-refresh-token',
      id_token:
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNjI0NTU2NDAwfQ.signature',
    }

    mockExchangeCodeForToken.mockResolvedValue(mockToken)
    mockNextResponse.json.mockReturnValue({ success: true } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state'
    )

    const _response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      success: true,
      token: mockToken,
    })
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
      'https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state'
    )

    const _response = await GET(request)

    expect(mockExchangeCodeForToken).toHaveBeenCalledWith({
      tokenUrl: 'https://auth.openai.com/oauth/token',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      code: 'test-code',
      redirectUri: 'https://app.example.com/auth/openai/callback',
      codeVerifier: expect.any(String),
    })
  })

  it('should handle missing environment variables', async () => {
    mock.doMock('@/lib/env', () => ({
      env: {
        OPENAI_CLIENT_ID: undefined,
        OPENAI_CLIENT_SECRET: undefined,
        OPENAI_REDIRECT_URI: undefined,
        OPENAI_TOKEN_URL: undefined,
        NEXTAUTH_URL: undefined,
      },
    }))

    mockNextResponse.json.mockReturnValue({ error: 'Missing configuration' } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state'
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
      'https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state'
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
      'https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state&redirect_uri=javascript:alert(1)'
    )

    const _response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid redirect URL' },
      { status: 400 }
    )
  })
})
