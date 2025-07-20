import { afterEach, beforeEach, describe, expect, it, spyOn, test } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import { useOpenAIAuthRefactored } from './use-openai-auth-refactored'

// Mock the base auth hook
const mockUseAuthBase = {
  state: {
    authenticated: false,
    loading: false,
    error: null,
    user: null,
    token: null,
  },
  actions: {
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    checkAuth: vi.fn(),
    clearError: vi.fn(),
  },
}

vi.mock('./use-auth-base', () => ({
  useAuthBase: () => mockUseAuthBase,
}))

// Mock environment variables
vi.mock('@/lib/env', () => ({
  env: {
    OPENAI_CLIENT_ID: 'test-client-id',
    OPENAI_API_URL: 'https://api.openai.com',
    OPENAI_AUTH_URL: 'https://auth.openai.com',
    OPENAI_REDIRECT_URI: 'https://app.example.com/auth/openai/callback',
  },
}))

describe('useOpenAIAuthRefactored', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock state
    mockUseAuthBase.state = {
      authenticated: false,
      loading: false,
      error: null,
      user: null,
      token: null,
    }
  })

  it('should initialize with base auth state', () => {
    const { result } = renderHook(() => useOpenAIAuthRefactored())

    expect(result.current.authenticated).toBe(false)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.user).toBeNull()
  })

  it('should return authenticated state when base auth is authenticated', () => {
    mockUseAuthBase.state = {
      authenticated: true,
      loading: false,
      error: null,
      user: {
        id: 'user-123',
        email: 'test@openai.com',
        name: 'Test User',
        organization_id: 'org-123',
      },
      token: {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 3_600_000,
      },
    }

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    expect(result.current.authenticated).toBe(true)
    expect(result.current.user).toEqual({
      id: 'user-123',
      email: 'test@openai.com',
      name: 'Test User',
      organization_id: 'org-123',
    })
  })

  it('should handle login with enhanced features', async () => {
    const { result } = renderHook(() => useOpenAIAuthRefactored())

    await act(async () => {
      await result.current.login({
        scope: 'read write model:gpt-4',
        state: 'custom-state',
        prompt: 'consent',
      })
    })

    expect(mockUseAuthBase.actions.login).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'read write model:gpt-4',
        state: 'custom-state',
        prompt: 'consent',
      })
    )
  })

  it('should handle logout with cleanup', async () => {
    mockUseAuthBase.state.authenticated = true

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    await act(async () => {
      await result.current.logout()
    })

    expect(mockUseAuthBase.actions.logout).toHaveBeenCalled()
  })

  it('should provide enhanced user information', () => {
    mockUseAuthBase.state = {
      authenticated: true,
      loading: false,
      error: null,
      user: {
        id: 'user-123',
        email: 'test@openai.com',
        name: 'Test User',
        organization_id: 'org-123',
        credits_granted: 100,
        credits_used: 25,
        model_permissions: ['gpt-3.5-turbo', 'gpt-4'],
        rate_limits: {
          rpm: 60,
          tpm: 150_000,
        },
      },
      token: {
        access_token: 'test-token',
        expires_at: Date.now() + 3_600_000,
      },
    }

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    expect(result.current.user?.credits_granted).toBe(100)
    expect(result.current.user?.credits_used).toBe(25)
    expect(result.current.user?.model_permissions).toContain('gpt-4')
    expect(result.current.user?.rate_limits?.rpm).toBe(60)
  })

  it('should handle organization switching', async () => {
    mockUseAuthBase.state.authenticated = true
    mockUseAuthBase.state.user = {
      id: 'user-123',
      email: 'test@openai.com',
      organizations: [
        { id: 'org-1', name: 'Org 1', role: 'owner' },
        { id: 'org-2', name: 'Org 2', role: 'member' },
      ],
      current_organization_id: 'org-1',
    }

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    await act(async () => {
      await result.current.switchOrganization('org-2')
    })

    expect(mockUseAuthBase.actions.login).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org-2',
      })
    )
  })

  it('should check model access permissions', () => {
    mockUseAuthBase.state = {
      authenticated: true,
      user: {
        model_permissions: ['gpt-3.5-turbo', 'gpt-4', 'dall-e-3'],
      },
      token: { access_token: 'test-token' },
    }

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    expect(result.current.hasModelAccess('gpt-4')).toBe(true)
    expect(result.current.hasModelAccess('gpt-4-32k')).toBe(false)
    expect(result.current.hasModelAccess('dall-e-3')).toBe(true)
  })

  it('should get available models', () => {
    mockUseAuthBase.state = {
      authenticated: true,
      user: {
        model_permissions: ['gpt-3.5-turbo', 'gpt-4', 'dall-e-3', 'whisper-1'],
      },
      token: { access_token: 'test-token' },
    }

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    const models = result.current.getAvailableModels()
    expect(models).toHaveLength(4)
    expect(models).toContain('gpt-4')
    expect(models).toContain('whisper-1')
  })

  it('should check remaining credits', () => {
    mockUseAuthBase.state = {
      authenticated: true,
      user: {
        credits_granted: 100,
        credits_used: 75,
      },
      token: { access_token: 'test-token' },
    }

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    expect(result.current.getRemainingCredits()).toBe(25)
  })

  it('should handle rate limit information', () => {
    mockUseAuthBase.state = {
      authenticated: true,
      user: {
        rate_limits: {
          rpm: 60,
          tpm: 150_000,
          rpd: 1000,
        },
      },
      token: { access_token: 'test-token' },
    }

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    const rateLimits = result.current.getRateLimits()
    expect(rateLimits.rpm).toBe(60)
    expect(rateLimits.tpm).toBe(150_000)
    expect(rateLimits.rpd).toBe(1000)
  })

  it('should handle session extension', async () => {
    mockUseAuthBase.state = {
      authenticated: true,
      token: {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 300_000, // 5 minutes
      },
    }

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    await act(async () => {
      await result.current.extendSession()
    })

    expect(mockUseAuthBase.actions.refresh).toHaveBeenCalled()
  })

  it('should check if session needs refresh', () => {
    // Session expiring soon
    mockUseAuthBase.state = {
      authenticated: true,
      token: {
        access_token: 'test-token',
        expires_at: Date.now() + 240_000, // 4 minutes
      },
    }

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    expect(result.current.sessionNeedsRefresh()).toBe(true)

    // Session still valid
    mockUseAuthBase.state.token.expires_at = Date.now() + 3_600_000 // 1 hour

    const { result: validResult } = renderHook(() => useOpenAIAuthRefactored())
    expect(validResult.current.sessionNeedsRefresh()).toBe(false)
  })

  it('should handle API key authentication', async () => {
    const { result } = renderHook(() => useOpenAIAuthRefactored())

    await act(async () => {
      await result.current.authenticateWithAPIKey('sk-test-api-key')
    })

    expect(mockUseAuthBase.actions.login).toHaveBeenCalledWith(
      expect.objectContaining({
        api_key: 'sk-test-api-key',
        auth_type: 'api_key',
      })
    )
  })

  it('should validate API key format', () => {
    const { result } = renderHook(() => useOpenAIAuthRefactored())

    expect(result.current.isValidAPIKey('sk-test-api-key')).toBe(true)
    expect(result.current.isValidAPIKey('invalid-key')).toBe(false)
    expect(result.current.isValidAPIKey('sk-')).toBe(false)
    expect(result.current.isValidAPIKey('')).toBe(false)
  })

  it('should handle loading states during operations', async () => {
    mockUseAuthBase.actions.login.mockImplementation(() => {
      mockUseAuthBase.state.loading = true
      return new Promise((resolve) => setTimeout(resolve, 100))
    })

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    const loginPromise = act(async () => {
      await result.current.login()
    })

    // Check loading state immediately
    expect(result.current.loading).toBe(true)

    await loginPromise

    mockUseAuthBase.state.loading = false
  })

  it('should handle error states', () => {
    mockUseAuthBase.state = {
      authenticated: false,
      loading: false,
      error: 'Authentication failed: Invalid credentials',
      user: null,
      token: null,
    }

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    expect(result.current.error).toBe('Authentication failed: Invalid credentials')
    expect(result.current.authenticated).toBe(false)
  })

  it('should clear errors', () => {
    mockUseAuthBase.state.error = 'Some error'

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    act(() => {
      result.current.clearError()
    })

    expect(mockUseAuthBase.actions.clearError).toHaveBeenCalled()
  })

  it('should handle organization list', () => {
    mockUseAuthBase.state = {
      authenticated: true,
      user: {
        organizations: [
          { id: 'org-1', name: 'Personal', role: 'owner' },
          { id: 'org-2', name: 'Company', role: 'member' },
          { id: 'org-3', name: 'Open Source', role: 'viewer' },
        ],
      },
      token: { access_token: 'test-token' },
    }

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    const orgs = result.current.getOrganizations()
    expect(orgs).toHaveLength(3)
    expect(orgs[0].name).toBe('Personal')
    expect(orgs[1].role).toBe('member')
  })

  it('should get current organization', () => {
    mockUseAuthBase.state = {
      authenticated: true,
      user: {
        organizations: [
          { id: 'org-1', name: 'Personal', role: 'owner' },
          { id: 'org-2', name: 'Company', role: 'member' },
        ],
        current_organization_id: 'org-2',
      },
      token: { access_token: 'test-token' },
    }

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    const currentOrg = result.current.getCurrentOrganization()
    expect(currentOrg?.id).toBe('org-2')
    expect(currentOrg?.name).toBe('Company')
  })

  it('should handle usage statistics', () => {
    mockUseAuthBase.state = {
      authenticated: true,
      user: {
        usage_stats: {
          total_tokens: 150_000,
          total_requests: 500,
          tokens_this_month: 50_000,
          requests_this_month: 150,
        },
      },
      token: { access_token: 'test-token' },
    }

    const { result } = renderHook(() => useOpenAIAuthRefactored())

    const stats = result.current.getUsageStatistics()
    expect(stats.total_tokens).toBe(150_000)
    expect(stats.requests_this_month).toBe(150)
  })
})
