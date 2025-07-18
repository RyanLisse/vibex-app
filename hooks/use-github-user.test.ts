import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useGitHubUser } from '@/hooks/use-github-user'

// Mock fetch
global.fetch = mock()

// Mock localStorage
const mockLocalStorage = {
  getItem: mock(),
  setItem: mock(),
  removeItem: mock(),
  clear: mock(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('useGitHubUser', () => {
  beforeEach(() => {
    mock.restore()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGitHubUser())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should load user from localStorage on mount', () => {
    const storedUser = {
      id: '123',
      login: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      avatar_url: 'https://github.com/avatar.jpg',
    }

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        user: storedUser,
        token: 'test-token',
      })
    )

    const { result } = renderHook(() => useGitHubUser())

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(storedUser)
  })

  it('should handle login successfully', async () => {
    const mockCode = 'test-auth-code'
    const mockTokenResponse = {
      access_token: 'github-token',
      token_type: 'bearer',
      scope: 'repo,user',
    }
    const mockUserResponse = {
      id: '123',
      login: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      avatar_url: 'https://github.com/avatar.jpg',
      bio: 'Test bio',
      company: 'Test Company',
      location: 'Test Location',
      public_repos: 10,
      followers: 100,
      following: 50,
    }

    // Mock token exchange
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTokenResponse,
    } as any)

    // Mock user fetch
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserResponse,
    } as any)

    const { result } = renderHook(() => useGitHubUser())

    await act(async () => {
      await result.current.login(mockCode)
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUserResponse)
    expect(result.current.error).toBeNull()
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'github_auth',
      expect.stringContaining('github-token')
    )
  })

  it('should handle login errors', async () => {
    const mockCode = 'invalid-code'

    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'bad_verification_code' }),
    } as any)

    const { result } = renderHook(() => useGitHubUser())

    await act(async () => {
      await result.current.login(mockCode)
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.error).toContain('bad_verification_code')
  })

  it('should handle logout', () => {
    // Set initial authenticated state
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        user: { id: '123', login: 'testuser' },
        token: 'test-token',
      })
    )

    const { result } = renderHook(() => useGitHubUser())

    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('github_auth')
  })

  it('should fetch user profile', async () => {
    const mockUserProfile = {
      id: '123',
      login: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      avatar_url: 'https://github.com/avatar.jpg',
      created_at: '2020-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      public_repos: 20,
      total_private_repos: 5,
      owned_private_repos: 3,
      public_gists: 10,
      private_gists: 2,
      followers: 150,
      following: 75,
      plan: {
        name: 'pro',
        space: 976_562_499,
        collaborators: 0,
        private_repos: 9999,
      },
    }

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        token: 'test-token',
      })
    )

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserProfile,
    } as any)

    const { result } = renderHook(() => useGitHubUser())

    const profile = await act(async () => {
      return await result.current.fetchUserProfile()
    })

    expect(profile).toEqual(mockUserProfile)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    )
  })

  it('should update user profile', async () => {
    const updates = {
      name: 'Updated Name',
      bio: 'Updated bio',
      company: 'New Company',
      location: 'New Location',
    }

    const mockUpdatedUser = {
      id: '123',
      login: 'testuser',
      ...updates,
    }

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        token: 'test-token',
        user: { id: '123', login: 'testuser' },
      })
    )

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdatedUser,
    } as any)

    const { result } = renderHook(() => useGitHubUser())

    await act(async () => {
      await result.current.updateProfile(updates)
    })

    expect(result.current.user).toEqual(mockUpdatedUser)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
    )
  })

  it('should get user organizations', async () => {
    const mockOrganizations = [
      {
        id: 1,
        login: 'org1',
        description: 'Organization 1',
        avatar_url: 'https://github.com/org1.png',
      },
      {
        id: 2,
        login: 'org2',
        description: 'Organization 2',
        avatar_url: 'https://github.com/org2.png',
      },
    ]

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        token: 'test-token',
      })
    )

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrganizations,
    } as any)

    const { result } = renderHook(() => useGitHubUser())

    const orgs = await act(async () => {
      return await result.current.getOrganizations()
    })

    expect(orgs).toEqual(mockOrganizations)
  })

  it('should refresh token', async () => {
    const mockNewToken = {
      access_token: 'new-github-token',
      token_type: 'bearer',
      scope: 'repo,user',
    }

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        token: 'old-token',
        refresh_token: 'refresh-token',
        user: { id: '123', login: 'testuser' },
      })
    )

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNewToken,
    } as any)

    const { result } = renderHook(() => useGitHubUser())

    await act(async () => {
      await result.current.refreshToken()
    })

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'github_auth',
      expect.stringContaining('new-github-token')
    )
  })

  it('should check token validity', async () => {
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        token: 'test-token',
        expires_at: Date.now() + 3_600_000, // 1 hour from now
      })
    )

    const { result } = renderHook(() => useGitHubUser())

    expect(result.current.isTokenValid()).toBe(true)

    // Test expired token
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        token: 'test-token',
        expires_at: Date.now() - 1000, // 1 second ago
      })
    )

    const { result: expiredResult } = renderHook(() => useGitHubUser())

    expect(expiredResult.current.isTokenValid()).toBe(false)
  })

  it('should handle OAuth redirect', () => {
    window.location = undefined
    window.location = { href: '' } as any

    const { result } = renderHook(() => useGitHubUser())

    act(() => {
      result.current.initiateOAuthFlow()
    })

    expect(window.location.href).toContain('https://github.com/login/oauth/authorize')
    expect(window.location.href).toContain('client_id=')
    expect(window.location.href).toContain('scope=repo%20user')
  })

  it('should handle network errors', async () => {
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        token: 'test-token',
      })
    )

    ;(fetch as any).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useGitHubUser())

    const profile = await act(async () => {
      return await result.current.fetchUserProfile()
    })

    expect(profile).toBeNull()
    expect(result.current.error).toBe('Network error')
  })

  it('should handle rate limiting', async () => {
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        token: 'test-token',
      })
    )

    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: {
        get: (name: string) => {
          if (name === 'X-RateLimit-Remaining') {
            return '0'
          }
          if (name === 'X-RateLimit-Reset') {
            return '1234567890'
          }
          return null
        },
      },
      json: async () => ({ message: 'API rate limit exceeded' }),
    } as any)

    const { result } = renderHook(() => useGitHubUser())

    await act(async () => {
      await result.current.fetchUserProfile()
    })

    expect(result.current.error).toContain('rate limit')
    expect(result.current.rateLimitReset).toBe(1_234_567_890)
  })

  it('should get user emails', async () => {
    const mockEmails = [
      {
        email: 'primary@example.com',
        primary: true,
        verified: true,
        visibility: 'public',
      },
      {
        email: 'secondary@example.com',
        primary: false,
        verified: true,
        visibility: 'private',
      },
    ]

    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        token: 'test-token',
      })
    )

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmails,
    } as any)

    const { result } = renderHook(() => useGitHubUser())

    const emails = await act(async () => {
      return await result.current.getUserEmails()
    })

    expect(emails).toEqual(mockEmails)
    expect(emails[0].primary).toBe(true)
  })

  it('should handle scopes check', async () => {
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        token: 'test-token',
        scope: 'repo user read:org',
      })
    )

    const { result } = renderHook(() => useGitHubUser())

    expect(result.current.hasScope('repo')).toBe(true)
    expect(result.current.hasScope('user')).toBe(true)
    expect(result.current.hasScope('read:org')).toBe(true)
    expect(result.current.hasScope('admin:org')).toBe(false)
  })

  it('should clear error state', () => {
    const { result } = renderHook(() => useGitHubUser())

    // Set error state
    act(() => {
      result.current.setError('Test error')
    })

    expect(result.current.error).toBe('Test error')

    // Clear error
    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })
})
