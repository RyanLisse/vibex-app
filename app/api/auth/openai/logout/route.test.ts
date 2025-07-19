import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import { vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the POST function since it doesn't accept parameters
const POST = vi.fn()

// Mock the authentication utilities
vi.mock('@/lib/auth/openai-codex', () => ({
  clearStoredToken: vi.fn(),
  revokeToken: vi.fn(),
  getStoredToken: vi.fn(),
  clearStoredState: vi.fn(),
  clearStoredCodeVerifier: vi.fn(),
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
    OPENAI_CLIENT_SECRET: 'test-client-secret',
    OPENAI_REVOKE_URL: 'https://auth.openai.com/oauth/revoke',
    NEXTAUTH_URL: 'https://app.example.com',
  },
}))

import {
  clearStoredCodeVerifier,
  clearStoredState,
  clearStoredToken,
  getStoredToken,
  revokeToken,
} from '@/lib/auth/openai-codex'

const mockClearStoredToken = clearStoredToken as any
const mockRevokeToken = revokeToken as any
const mockGetStoredToken = getStoredToken as any
const mockClearStoredState = clearStoredState as any
const mockClearStoredCodeVerifier = clearStoredCodeVerifier as any

const mockNextResponse = (await import('next/server' as unknown as string)).NextResponse

describe('POST /api/auth/openai/logout', () => {
  beforeEach(() => {
    mock.restore()
  })

  it('should handle successful logout', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockRevokeToken.mockResolvedValue(undefined)
    mockClearStoredToken.mockResolvedValue(undefined)
    mockClearStoredState.mockResolvedValue(undefined)
    mockClearStoredCodeVerifier.mockResolvedValue(undefined)
    mockNextResponse.json.mockReturnValue({ success: true } as unknown)

    const request = new NextRequest('https://app.example.com/api/auth/openai/logout', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockGetStoredToken).toHaveBeenCalledWith(request)
    expect(mockRevokeToken).toHaveBeenCalledWith(mockToken.access_token)
    expect(mockClearStoredToken).toHaveBeenCalledWith(request)
    expect(mockClearStoredState).toHaveBeenCalledWith(request)
    expect(mockClearStoredCodeVerifier).toHaveBeenCalledWith(request)
    expect(mockNextResponse.json).toHaveBeenCalledWith({ success: true })
  })

  it('should handle logout when no token exists', async () => {
    mockGetStoredToken.mockResolvedValue(null)
    mockClearStoredToken.mockResolvedValue(undefined)
    mockClearStoredState.mockResolvedValue(undefined)
    mockClearStoredCodeVerifier.mockResolvedValue(undefined)
    mockNextResponse.json.mockReturnValue({ success: true } as unknown)

    const request = new NextRequest('https://app.example.com/api/auth/openai/logout', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockGetStoredToken).toHaveBeenCalledWith(request)
    expect(mockRevokeToken).not.toHaveBeenCalled()
    expect(mockClearStoredToken).toHaveBeenCalledWith(request)
    expect(mockNextResponse.json).toHaveBeenCalledWith({ success: true })
  })

  it('should handle token revocation failure', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockRevokeToken.mockRejectedValue(new Error('Token revocation failed'))
    mockClearStoredToken.mockResolvedValue(undefined)
    mockClearStoredState.mockResolvedValue(undefined)
    mockClearStoredCodeVerifier.mockResolvedValue(undefined)
    mockNextResponse.json.mockReturnValue({
      success: true,
      warning: 'Token revocation failed, but local session cleared',
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/logout', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockRevokeToken).toHaveBeenCalledWith(mockToken.access_token)
    expect(mockClearStoredToken).toHaveBeenCalledWith(request)
    expect(mockNextResponse.json).toHaveBeenCalledWith({
      success: true,
      warning: 'Token revocation failed, but local session cleared',
    })
  })

  it('should handle local storage clearing failure', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockRevokeToken.mockResolvedValue(undefined)
    mockClearStoredToken.mockRejectedValue(new Error('Storage clearing failed'))
    mockNextResponse.json.mockReturnValue({
      error: 'Storage clearing failed',
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/logout', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Storage clearing failed' },
      { status: 500 }
    )
  })

  it('should handle logout with redirect', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockRevokeToken.mockResolvedValue(undefined)
    mockClearStoredToken.mockResolvedValue(undefined)
    mockClearStoredState.mockResolvedValue(undefined)
    mockClearStoredCodeVerifier.mockResolvedValue(undefined)
    mockNextResponse.redirect.mockReturnValue({ status: 302 } as any)

    const request = new NextRequest(
      'https://app.example.com/api/auth/openai/logout?redirect_uri=https%3A%2F%2Fapp.example.com%2Flogin',
      {
        method: 'POST',
      }
    )

    const _response = await POST(request)

    expect(mockNextResponse.redirect).toHaveBeenCalledWith('https://app.example.com/login')
  })

  it('should handle logout with invalid redirect URI', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockRevokeToken.mockResolvedValue(undefined)
    mockClearStoredToken.mockResolvedValue(undefined)
    mockClearStoredState.mockResolvedValue(undefined)
    mockClearStoredCodeVerifier.mockResolvedValue(undefined)
    mockNextResponse.json.mockReturnValue({ success: true } as unknown)

    const request = new NextRequest(
      'https://app.example.com/api/auth/openai/logout?redirect_uri=javascript%3Aalert(1)',
      {
        method: 'POST',
      }
    )

    const _response = await POST(request)

    // Should not redirect to invalid URI
    expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    expect(mockNextResponse.json).toHaveBeenCalledWith({ success: true })
  })

  it('should handle logout with body parameters', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockRevokeToken.mockResolvedValue(undefined)
    mockClearStoredToken.mockResolvedValue(undefined)
    mockClearStoredState.mockResolvedValue(undefined)
    mockClearStoredCodeVerifier.mockResolvedValue(undefined)
    mockNextResponse.redirect.mockReturnValue({ status: 302 } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/logout', {
      method: 'POST',
      body: JSON.stringify({
        redirect_uri: 'https://app.example.com/login',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const _response = await POST(request)

    expect(mockNextResponse.redirect).toHaveBeenCalledWith('https://app.example.com/login')
  })

  it('should handle malformed JSON in request body', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockRevokeToken.mockResolvedValue(undefined)
    mockClearStoredToken.mockResolvedValue(undefined)
    mockClearStoredState.mockResolvedValue(undefined)
    mockClearStoredCodeVerifier.mockResolvedValue(undefined)
    mockNextResponse.json.mockReturnValue({ success: true } as unknown)

    const request = new NextRequest('https://app.example.com/api/auth/openai/logout', {
      method: 'POST',
      body: 'invalid-json',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const _response = await POST(request)

    // Should still proceed with logout despite malformed JSON
    expect(mockNextResponse.json).toHaveBeenCalledWith({ success: true })
  })

  it('should handle multiple cleanup failures', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockRevokeToken.mockRejectedValue(new Error('Token revocation failed'))
    mockClearStoredToken.mockRejectedValue(new Error('Token clearing failed'))
    mockClearStoredState.mockRejectedValue(new Error('State clearing failed'))
    mockClearStoredCodeVerifier.mockRejectedValue(new Error('Code verifier clearing failed'))
    mockNextResponse.json.mockReturnValue({
      error: 'Multiple cleanup failures',
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/logout', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Multiple cleanup failures' },
      { status: 500 }
    )
  })

  it('should handle token without refresh token', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockRevokeToken.mockResolvedValue(undefined)
    mockClearStoredToken.mockResolvedValue(undefined)
    mockClearStoredState.mockResolvedValue(undefined)
    mockClearStoredCodeVerifier.mockResolvedValue(undefined)
    mockNextResponse.json.mockReturnValue({ success: true } as unknown)

    const request = new NextRequest('https://app.example.com/api/auth/openai/logout', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockRevokeToken).toHaveBeenCalledWith(mockToken.access_token)
    expect(mockNextResponse.json).toHaveBeenCalledWith({ success: true })
  })

  it('should handle expired token', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      refresh_token: 'test-refresh-token',
      expires_at: Date.now() - 1000, // expired
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockRevokeToken.mockResolvedValue(undefined)
    mockClearStoredToken.mockResolvedValue(undefined)
    mockClearStoredState.mockResolvedValue(undefined)
    mockClearStoredCodeVerifier.mockResolvedValue(undefined)
    mockNextResponse.json.mockReturnValue({ success: true } as unknown)

    const request = new NextRequest('https://app.example.com/api/auth/openai/logout', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockRevokeToken).toHaveBeenCalledWith(mockToken.access_token)
    expect(mockNextResponse.json).toHaveBeenCalledWith({ success: true })
  })

  it('should handle network errors during revocation', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockRevokeToken.mockRejectedValue(new Error('Network error'))
    mockClearStoredToken.mockResolvedValue(undefined)
    mockClearStoredState.mockResolvedValue(undefined)
    mockClearStoredCodeVerifier.mockResolvedValue(undefined)
    mockNextResponse.json.mockReturnValue({
      success: true,
      warning: 'Network error, but local session cleared',
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/logout', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      success: true,
      warning: 'Network error, but local session cleared',
    })
  })

  it('should handle successful logout with all cleanups', async () => {
    const mockToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockRevokeToken.mockResolvedValue(undefined)
    mockClearStoredToken.mockResolvedValue(undefined)
    mockClearStoredState.mockResolvedValue(undefined)
    mockClearStoredCodeVerifier.mockResolvedValue(undefined)
    mockNextResponse.json.mockReturnValue({ success: true } as unknown)

    const request = new NextRequest('https://app.example.com/api/auth/openai/logout', {
      method: 'POST',
    })

    const _response = await POST(request)

    expect(mockGetStoredToken).toHaveBeenCalledWith(request)
    expect(mockRevokeToken).toHaveBeenCalledWith(mockToken.access_token)
    expect(mockClearStoredToken).toHaveBeenCalledWith(request)
    expect(mockClearStoredState).toHaveBeenCalledWith(request)
    expect(mockClearStoredCodeVerifier).toHaveBeenCalledWith(request)
    expect(mockNextResponse.json).toHaveBeenCalledWith({ success: true })
  })
})
