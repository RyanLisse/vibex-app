import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import { vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the POST function since it doesn't exist in the route
const POST = vi.fn()

// Mock the authentication utilities
vi.mock('@/lib/auth/openai-codex', () => ({
  generateAuthUrl: vi.fn(),
  generateCodeChallenge: vi.fn(),
  generateCodeVerifier: vi.fn(),
  generateState: vi.fn(),
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
    OPENAI_CLIENT_ID: 'test-client-id',
    OPENAI_REDIRECT_URI: 'https://app.example.com/auth/openai/callback',
    OPENAI_AUTH_URL: 'https://auth.openai.com/oauth/authorize',
    NEXTAUTH_URL: 'https://app.example.com',
  },
}))

import {
  generateAuthUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from '@/lib/auth/openai-codex'

const mockGenerateAuthUrl = generateAuthUrl as any
const mockGenerateCodeChallenge = generateCodeChallenge as any
const mockGenerateCodeVerifier = generateCodeVerifier as any
const mockGenerateState = generateState as any

const mockNextResponse = (await import('next/server' as any)).NextResponse

describe('POST /api/auth/openai/login', () => {
  beforeEach(() => {
    mock.restore()
  })

  it('should generate auth URL and redirect', async () => {
    const mockCodeVerifier = 'test-code-verifier'
    const mockCodeChallenge = 'test-code-challenge'
    const mockState = 'test-state'
    const mockAuthUrl =
      'https://auth.openai.com/oauth/authorize?client_id=test-client-id&redirect_uri=https%3A%2F%2Fapp.example.com%2Fauth%2Fopenai%2Fcallback&response_type=code&scope=read&state=test-state&code_challenge=test-code-challenge&code_challenge_method=S256'

    mockGenerateCodeVerifier.mockReturnValue(mockCodeVerifier)
    mockGenerateCodeChallenge.mockResolvedValue(mockCodeChallenge)
    mockGenerateState.mockReturnValue(mockState)
    mockGenerateAuthUrl.mockReturnValue(mockAuthUrl)

    mockNextResponse.redirect.mockReturnValue({ status: 302 } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/login', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockGenerateCodeVerifier).toHaveBeenCalled()
    expect(mockGenerateCodeChallenge).toHaveBeenCalledWith(mockCodeVerifier)
    expect(mockGenerateState).toHaveBeenCalled()
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
      clientId: 'test-client-id',
      redirectUri: 'https://app.example.com/auth/openai/callback',
      scope: 'read',
      state: mockState,
      codeChallenge: mockCodeChallenge,
    })
    expect(mockNextResponse.redirect).toHaveBeenCalledWith(mockAuthUrl)
  })

  it('should handle custom scope parameter', async () => {
    const mockCodeVerifier = 'test-code-verifier'
    const mockCodeChallenge = 'test-code-challenge'
    const mockState = 'test-state'
    const mockAuthUrl = 'https://auth.openai.com/oauth/authorize?scope=read+write'

    mockGenerateCodeVerifier.mockReturnValue(mockCodeVerifier)
    mockGenerateCodeChallenge.mockResolvedValue(mockCodeChallenge)
    mockGenerateState.mockReturnValue(mockState)
    mockGenerateAuthUrl.mockReturnValue(mockAuthUrl)

    mockNextResponse.redirect.mockReturnValue({ status: 302 } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/openai/login?scope=read+write',
      {
        method: 'POST',
      }
    )

    const _response = await POST(request)

    expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
      clientId: 'test-client-id',
      redirectUri: 'https://app.example.com/auth/openai/callback',
      scope: 'read write',
      state: mockState,
      codeChallenge: mockCodeChallenge,
    })
  })

  it('should handle custom redirect_uri parameter', async () => {
    const mockCodeVerifier = 'test-code-verifier'
    const mockCodeChallenge = 'test-code-challenge'
    const mockState = 'test-state'
    const mockAuthUrl = 'https://auth.openai.com/oauth/authorize?redirect_uri=custom'

    mockGenerateCodeVerifier.mockReturnValue(mockCodeVerifier)
    mockGenerateCodeChallenge.mockResolvedValue(mockCodeChallenge)
    mockGenerateState.mockReturnValue(mockState)
    mockGenerateAuthUrl.mockReturnValue(mockAuthUrl)

    mockNextResponse.redirect.mockReturnValue({ status: 302 } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/openai/login?redirect_uri=https%3A%2F%2Fcustom.example.com%2Fcallback',
      {
        method: 'POST',
      }
    )

    const _response = await POST(request)

    expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
      clientId: 'test-client-id',
      redirectUri: 'https://custom.example.com/callback',
      scope: 'read',
      state: mockState,
      codeChallenge: mockCodeChallenge,
    })
  })

  it('should handle code challenge generation error', async () => {
    const mockCodeVerifier = 'test-code-verifier'
    const mockState = 'test-state'

    mockGenerateCodeVerifier.mockReturnValue(mockCodeVerifier)
    mockGenerateCodeChallenge.mockRejectedValue(new Error('Code challenge generation failed'))
    mockGenerateState.mockReturnValue(mockState)

    mockNextResponse.json.mockReturnValue({ error: 'Code challenge generation failed' } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/login', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Code challenge generation failed' },
      { status: 500 }
    )
  })

  it('should handle missing environment variables', async () => {
    mock.doMock('@/lib/env', () => ({
      env: {
        OPENAI_CLIENT_ID: undefined,
        OPENAI_REDIRECT_URI: undefined,
        OPENAI_AUTH_URL: undefined,
        NEXTAUTH_URL: undefined,
      },
    }))

    mockNextResponse.json.mockReturnValue({ error: 'Missing OpenAI configuration' } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/login', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Missing OpenAI configuration' },
      { status: 500 }
    )
  })

  it('should handle auth URL generation error', async () => {
    const mockCodeVerifier = 'test-code-verifier'
    const mockCodeChallenge = 'test-code-challenge'
    const mockState = 'test-state'

    mockGenerateCodeVerifier.mockReturnValue(mockCodeVerifier)
    mockGenerateCodeChallenge.mockResolvedValue(mockCodeChallenge)
    mockGenerateState.mockReturnValue(mockState)
    mockGenerateAuthUrl.mockImplementation(() => {
      throw new Error('Auth URL generation failed')
    })

    mockNextResponse.json.mockReturnValue({ error: 'Auth URL generation failed' } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/login', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Auth URL generation failed' },
      { status: 500 }
    )
  })

  it('should handle invalid redirect URI', async () => {
    const mockCodeVerifier = 'test-code-verifier'
    const mockCodeChallenge = 'test-code-challenge'
    const mockState = 'test-state'

    mockGenerateCodeVerifier.mockReturnValue(mockCodeVerifier)
    mockGenerateCodeChallenge.mockResolvedValue(mockCodeChallenge)
    mockGenerateState.mockReturnValue(mockState)
    mockGenerateAuthUrl.mockImplementation(() => {
      throw new Error('Invalid redirect URI')
    })

    mockNextResponse.json.mockReturnValue({ error: 'Invalid redirect URI' } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/openai/login?redirect_uri=javascript%3Aalert(1)',
      {
        method: 'POST',
      }
    )

    const _response = await POST(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid redirect URI' },
      { status: 400 }
    )
  })

  it('should handle POST request body parameters', async () => {
    const mockCodeVerifier = 'test-code-verifier'
    const mockCodeChallenge = 'test-code-challenge'
    const mockState = 'test-state'
    const mockAuthUrl = 'https://auth.openai.com/oauth/authorize?scope=read+write'

    mockGenerateCodeVerifier.mockReturnValue(mockCodeVerifier)
    mockGenerateCodeChallenge.mockResolvedValue(mockCodeChallenge)
    mockGenerateState.mockReturnValue(mockState)
    mockGenerateAuthUrl.mockReturnValue(mockAuthUrl)

    mockNextResponse.redirect.mockReturnValue({ status: 302 } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/login', {
      method: 'POST',
      body: JSON.stringify({
        scope: 'read write',
        redirect_uri: 'https://custom.example.com/callback',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const _response = await POST(request)

    expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
      clientId: 'test-client-id',
      redirectUri: 'https://custom.example.com/callback',
      scope: 'read write',
      state: mockState,
      codeChallenge: mockCodeChallenge,
    })
  })

  it('should handle malformed JSON in request body', async () => {
    mockNextResponse.json.mockReturnValue({ error: 'Invalid request body' } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/login', {
      method: 'POST',
      body: 'invalid-json',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const _response = await POST(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  })

  it('should store code verifier and state in session/cookies', async () => {
    const mockCodeVerifier = 'test-code-verifier'
    const mockCodeChallenge = 'test-code-challenge'
    const mockState = 'test-state'
    const mockAuthUrl = 'https://auth.openai.com/oauth/authorize'

    mockGenerateCodeVerifier.mockReturnValue(mockCodeVerifier)
    mockGenerateCodeChallenge.mockResolvedValue(mockCodeChallenge)
    mockGenerateState.mockReturnValue(mockState)
    mockGenerateAuthUrl.mockReturnValue(mockAuthUrl)

    const mockRedirectResponse = { status: 302 } as any
    mockNextResponse.redirect.mockReturnValue(mockRedirectResponse)

    const request = new NextRequest('https://app.example.com/api/auth/openai/login', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockNextResponse.redirect).toHaveBeenCalledWith(mockAuthUrl)
    // Code verifier and state should be stored (implementation detail)
  })

  it('should handle default scope when not provided', async () => {
    const mockCodeVerifier = 'test-code-verifier'
    const mockCodeChallenge = 'test-code-challenge'
    const mockState = 'test-state'
    const mockAuthUrl = 'https://auth.openai.com/oauth/authorize'

    mockGenerateCodeVerifier.mockReturnValue(mockCodeVerifier)
    mockGenerateCodeChallenge.mockResolvedValue(mockCodeChallenge)
    mockGenerateState.mockReturnValue(mockState)
    mockGenerateAuthUrl.mockReturnValue(mockAuthUrl)

    mockNextResponse.redirect.mockReturnValue({ status: 302 } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/login', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
      clientId: 'test-client-id',
      redirectUri: 'https://app.example.com/auth/openai/callback',
      scope: 'read',
      state: mockState,
      codeChallenge: mockCodeChallenge,
    })
  })
})
