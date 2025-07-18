import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the authentication utilities
vi.mock('@/lib/auth/openai-codex', () => ({
  validateToken: vi.fn(),
  refreshAuthToken: vi.fn(),
  getStoredToken: vi.fn(),
  parseJWT: vi.fn(),
}))

// Mock NextResponse
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data) => ({ json: () => Promise.resolve(data) })),
  },
}))

// Mock the route handler
const mockGET = vi.fn()
vi.mock('./route', () => ({
  GET: mockGET,
}))

import { getStoredToken, parseJWT, refreshAuthToken, validateToken } from '@/lib/auth/openai-codex'
import { GET } from './route'

const mockValidateToken = vi.mocked(validateToken)
const mockRefreshAuthToken = vi.mocked(refreshAuthToken)
const mockGetStoredToken = vi.mocked(getStoredToken)
const mockParseJWT = vi.mocked(parseJWT)

const { NextResponse } = await import('next/server')
const mockNextResponse = vi.mocked(NextResponse)

describe('GET /api/auth/openai/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return authenticated status with valid token', async () => {
    const mockToken = {
      access_token: 'valid-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'refresh-token',
    }

    const mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockValidateToken.mockResolvedValue({ active: true })
    mockParseJWT.mockReturnValue(mockUser)

    mockNextResponse.json.mockReturnValue({
      authenticated: true,
      user: mockUser,
      expires: Date.now() + 3_600_000,
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/status')

    const response = await GET(request)

    expect(mockGetStoredToken).toHaveBeenCalledWith(request)
    expect(mockValidateToken).toHaveBeenCalledWith(mockToken.access_token)
    expect(mockParseJWT).toHaveBeenCalledWith(mockToken.access_token)
    expect(mockNextResponse.json).toHaveBeenCalledWith({
      authenticated: true,
      user: mockUser,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })
  })

  it('should return unauthenticated status when no token', async () => {
    mockGetStoredToken.mockResolvedValue(null)
    mockNextResponse.json.mockReturnValue({
      authenticated: false,
      user: null,
      expires: null,
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/status')

    const response = await GET(request)

    expect(mockGetStoredToken).toHaveBeenCalledWith(request)
    expect(mockNextResponse.json).toHaveBeenCalledWith({
      authenticated: false,
      user: null,
      expires: null,
      isExpiring: false,
    })
  })

  it('should handle expired token', async () => {
    const mockToken = {
      access_token: 'expired-token',
      token_type: 'Bearer',
      expires_in: -1, // expired
      refresh_token: 'refresh-token',
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockNextResponse.json.mockReturnValue({
      authenticated: false,
      user: null,
      expires: null,
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/status')

    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      authenticated: false,
      user: null,
      expires: null,
      isExpiring: false,
    })
  })

  it('should handle invalid token', async () => {
    const mockToken = {
      access_token: 'invalid-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'refresh-token',
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockValidateToken.mockResolvedValue({ active: false })
    mockNextResponse.json.mockReturnValue({
      authenticated: false,
      user: null,
      expires: null,
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/status')

    const response = await GET(request)

    expect(mockValidateToken).toHaveBeenCalledWith(mockToken.access_token)
    expect(mockNextResponse.json).toHaveBeenCalledWith({
      authenticated: false,
      user: null,
      expires: null,
      isExpiring: false,
    })
  })

  it('should handle token validation error', async () => {
    const mockToken = {
      access_token: 'valid-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'refresh-token',
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockValidateToken.mockRejectedValue(new Error('Token validation failed'))
    mockNextResponse.json.mockReturnValue({
      authenticated: false,
      user: null,
      expires: null,
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/status')

    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      authenticated: false,
      user: null,
      expires: null,
      isExpiring: false,
    })
  })

  it('should refresh token when expiring soon', async () => {
    const mockToken = {
      access_token: 'expiring-token',
      token_type: 'Bearer',
      expires_in: 300, // 5 minutes from now
      refresh_token: 'refresh-token',
    }

    const mockRefreshedToken = {
      access_token: 'new-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'new-refresh-token',
    }

    const mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockValidateToken.mockResolvedValue({ active: true })
    mockRefreshAuthToken.mockResolvedValue(mockRefreshedToken)
    mockParseJWT.mockReturnValue(mockUser)

    mockNextResponse.json.mockReturnValue({
      authenticated: true,
      user: mockUser,
      expires: Date.now() + 3_600_000,
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/status')

    const response = await GET(request)

    expect(mockRefreshAuthToken).toHaveBeenCalledWith(mockToken.refresh_token)
    expect(mockNextResponse.json).toHaveBeenCalledWith({
      authenticated: true,
      user: mockUser,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })
  })

  it('should handle refresh token failure', async () => {
    const mockToken = {
      access_token: 'expiring-token',
      token_type: 'Bearer',
      expires_in: 300, // 5 minutes from now
      refresh_token: 'invalid-refresh-token',
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockValidateToken.mockResolvedValue({ active: true })
    mockRefreshAuthToken.mockRejectedValue(new Error('Refresh failed'))
    mockNextResponse.json.mockReturnValue({
      authenticated: false,
      user: null,
      expires: null,
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/status')

    const response = await GET(request)

    expect(mockRefreshAuthToken).toHaveBeenCalledWith(mockToken.refresh_token)
    expect(mockNextResponse.json).toHaveBeenCalledWith({
      authenticated: false,
      user: null,
      expires: null,
      isExpiring: false,
    })
  })

  it('should return expiring soon flag', async () => {
    const mockToken = {
      access_token: 'expiring-token',
      token_type: 'Bearer',
      expires_in: 300, // 5 minutes from now
      refresh_token: 'refresh-token',
    }

    const mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockValidateToken.mockResolvedValue({ active: true })
    mockParseJWT.mockReturnValue(mockUser)

    mockNextResponse.json.mockReturnValue({
      authenticated: true,
      user: mockUser,
      expires: Date.now() + 3_600_000,
      isExpiring: true,
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/status')

    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      authenticated: true,
      user: mockUser,
      expires: Date.now() + 3_600_000,
      isExpiring: true,
    })
  })

  it('should handle JWT parsing error', async () => {
    const mockToken = {
      access_token: 'valid-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'refresh-token',
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockValidateToken.mockResolvedValue({ active: true })
    mockParseJWT.mockImplementation(() => {
      throw new Error('Invalid JWT')
    })

    mockNextResponse.json.mockReturnValue({
      authenticated: true,
      user: null,
      expires: Date.now() + 3_600_000,
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/status')

    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      authenticated: true,
      user: null,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })
  })

  it('should handle token without expiration', async () => {
    const mockToken = {
      access_token: 'valid-token',
      token_type: 'Bearer',
      refresh_token: 'refresh-token',
    }

    const mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockValidateToken.mockResolvedValue({ active: true })
    mockParseJWT.mockReturnValue(mockUser)

    mockNextResponse.json.mockReturnValue({
      authenticated: true,
      user: mockUser,
      expires: null,
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/status')

    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      authenticated: true,
      user: mockUser,
      expires: null,
      isExpiring: false,
    })
  })

  it('should handle network errors', async () => {
    mockGetStoredToken.mockRejectedValue(new Error('Network error'))
    mockNextResponse.json.mockReturnValue({
      authenticated: false,
      user: null,
      expires: null,
      error: 'Network error',
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/status')

    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      authenticated: false,
      user: null,
      expires: null,
      isExpiring: false,
      error: 'Network error',
    })
  })

  it('should handle token with additional user info', async () => {
    const mockToken = {
      access_token: 'valid-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'refresh-token',
    }

    const mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      organization_id: 'org-123',
      credits_granted: 100,
    }

    mockGetStoredToken.mockResolvedValue(mockToken)
    mockValidateToken.mockResolvedValue({ active: true })
    mockParseJWT.mockReturnValue(mockUser)

    mockNextResponse.json.mockReturnValue({
      authenticated: true,
      user: mockUser,
      expires: Date.now() + 3_600_000,
    } as any)

    const request = new NextRequest('https://app.example.com/api/auth/openai/status')

    const response = await GET(request)

    expect(mockNextResponse.json).toHaveBeenCalledWith({
      authenticated: true,
      user: mockUser,
      expires: Date.now() + 3_600_000,
      isExpiring: false,
    })
  })
})
