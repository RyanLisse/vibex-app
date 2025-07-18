import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

// Mock the authentication utilities
vi.mock('@/lib/auth', () => ({
  exchangeCodeForToken: vi.fn(),
  validateOAuthState: vi.fn(),
  sanitizeRedirectUrl: vi.fn(),
  handleAuthError: vi.fn()
}))

// Mock NextResponse
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  return {
    ...actual,
    NextResponse: {
      json: vi.fn(),
      redirect: vi.fn()
    }
  }
})

// Mock environment variables
vi.mock('@/lib/env', () => ({
  env: {
    ANTHROPIC_CLIENT_ID: 'test-client-id',
    ANTHROPIC_CLIENT_SECRET: 'test-client-secret',
    ANTHROPIC_REDIRECT_URI: 'https://app.example.com/auth/anthropic/callback',
    ANTHROPIC_TOKEN_URL: 'https://anthropic.com/oauth/token',
    NEXTAUTH_URL: 'https://app.example.com'
  }
}))

const mockExchangeCodeForToken = vi.mocked(await import('@/lib/auth')).exchangeCodeForToken
const mockValidateOAuthState = vi.mocked(await import('@/lib/auth')).validateOAuthState
const mockSanitizeRedirectUrl = vi.mocked(await import('@/lib/auth')).sanitizeRedirectUrl
const mockHandleAuthError = vi.mocked(await import('@/lib/auth')).handleAuthError

const { NextResponse } = await import('next/server')
const mockNextResponse = vi.mocked(NextResponse)

describe('GET /api/auth/anthropic/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateOAuthState.mockReturnValue(true)
    mockSanitizeRedirectUrl.mockImplementation(url => url)
    mockHandleAuthError.mockImplementation(error => error.toString())
  })

  it('should handle successful callback', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test-refresh-token'
    }

    mockExchangeCodeForToken.mockResolvedValue(mockToken)
    mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ success: true })))

    const request = new NextRequest('https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state')
    
    const response = await GET(request)

    expect(mockExchangeCodeForToken).toHaveBeenCalledWith({
      tokenUrl: 'https://anthropic.com/oauth/token',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      code: 'test-code',
      redirectUri: 'https://app.example.com/auth/anthropic/callback',
      codeVerifier: expect.any(String)
    })

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      success: true,
      token: mockToken
    })
  })

  it('should handle missing code parameter', async () => {
    mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Missing code parameter' })))

    const request = new NextRequest('https://app.example.com/api/auth/anthropic/callback?state=test-state')
    
    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Missing code parameter' },
      { status: 400 }
    )
  })

  it('should handle missing state parameter', async () => {
    mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Missing state parameter' })))

    const request = new NextRequest('https://app.example.com/api/auth/anthropic/callback?code=test-code')
    
    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Missing state parameter' },
      { status: 400 }
    )
  })

  it('should handle invalid state', async () => {
    mockValidateOAuthState.mockReturnValue(false)
    mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Invalid state parameter' })))

    const request = new NextRequest('https://app.example.com/api/auth/anthropic/callback?code=test-code&state=invalid-state')
    
    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid state parameter' },
      { status: 400 }
    )
  })

  it('should handle error parameter', async () => {
    mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'access_denied' })))

    const request = new NextRequest('https://app.example.com/api/auth/anthropic/callback?error=access_denied&error_description=User%20denied%20access')
    
    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'access_denied', error_description: 'User denied access' },
      { status: 400 }
    )
  })

  it('should handle token exchange failure', async () => {
    mockExchangeCodeForToken.mockRejectedValue(new Error('Token exchange failed'))
    mockHandleAuthError.mockReturnValue('Token exchange failed')
    mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Token exchange failed' })))

    const request = new NextRequest('https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state')
    
    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Token exchange failed' },
      { status: 500 }
    )
  })

  it('should handle OAuth error responses', async () => {
    mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'invalid_grant' })))

    const request = new NextRequest('https://app.example.com/api/auth/anthropic/callback?error=invalid_grant&error_description=Invalid%20authorization%20code')
    
    const response = await GET(request)

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
      refresh_token: 'test-refresh-token'
    }

    mockExchangeCodeForToken.mockResolvedValue(mockToken)
    mockNextResponse.redirect.mockReturnValue(new Response(null, { status: 302 }))

    const request = new NextRequest('https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state&redirect_uri=https://app.example.com/dashboard')
    
    const response = await GET(request)

    expect(mockSanitizeRedirectUrl).toHaveBeenCalledWith('https://app.example.com/dashboard')
    expect(mockNextResponse.redirect).toHaveBeenCalledWith('https://app.example.com/dashboard')
  })

  it('should handle code verifier from session', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test-refresh-token'
    }

    mockExchangeCodeForToken.mockResolvedValue(mockToken)
    mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ success: true })))

    // Mock session storage or cookies for code verifier
    const request = new NextRequest('https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state')
    
    const response = await GET(request)

    expect(mockExchangeCodeForToken).toHaveBeenCalledWith({
      tokenUrl: 'https://anthropic.com/oauth/token',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      code: 'test-code',
      redirectUri: 'https://app.example.com/auth/anthropic/callback',
      codeVerifier: expect.any(String)
    })
  })

  it('should handle missing environment variables', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        ANTHROPIC_CLIENT_ID: undefined,
        ANTHROPIC_CLIENT_SECRET: undefined,
        ANTHROPIC_REDIRECT_URI: undefined,
        ANTHROPIC_TOKEN_URL: undefined,
        NEXTAUTH_URL: undefined
      }
    }))

    mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Missing configuration' })))

    const request = new NextRequest('https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state')
    
    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Missing configuration' },
      { status: 500 }
    )
  })

  it('should handle network errors', async () => {
    mockExchangeCodeForToken.mockRejectedValue(new Error('Network error'))
    mockHandleAuthError.mockReturnValue('Network error')
    mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Network error' })))

    const request = new NextRequest('https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state')
    
    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Network error' },
      { status: 500 }
    )
  })

  it('should handle malformed URLs', async () => {
    mockSanitizeRedirectUrl.mockImplementation(() => {
      throw new Error('Invalid redirect URL')
    })
    mockNextResponse.json.mockReturnValue(new Response(JSON.stringify({ error: 'Invalid redirect URL' })))

    const request = new NextRequest('https://app.example.com/api/auth/anthropic/callback?code=test-code&state=test-state&redirect_uri=javascript:alert(1)')
    
    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid redirect URL' },
      { status: 400 }
    )
  })
})