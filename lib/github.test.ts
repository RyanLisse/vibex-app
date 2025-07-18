import { cookies } from 'next/headers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearGitHubAuth,
  createRepository,
  exchangeCodeForToken,
  GitHubClient,
  getGitHubOAuthUrl,
  getGitHubUser,
  getRepoBranches,
  getUserRepositories,
} from './github'

// Mock dependencies
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

describe('GitHub Authentication', () => {
  const mockCookies = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }

  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cookies).mockResolvedValue(mockCookies as any)
    process.env = {
      ...originalEnv,
      GITHUB_CLIENT_ID: 'test-client-id',
      GITHUB_CLIENT_SECRET: 'test-client-secret',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getGitHubOAuthUrl', () => {
    it('should generate OAuth URL with correct parameters', () => {
      const url = getGitHubOAuthUrl()
      const parsedUrl = new URL(url)

      expect(parsedUrl.origin).toBe('https://github.com')
      expect(parsedUrl.pathname).toBe('/login/oauth/authorize')
      expect(parsedUrl.searchParams.get('client_id')).toBe('test-client-id')
      expect(parsedUrl.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3000/api/auth/github/callback'
      )
      expect(parsedUrl.searchParams.get('scope')).toBe('repo user')
      expect(parsedUrl.searchParams.get('state')).toBeTruthy()
    })

    it('should throw error when GITHUB_CLIENT_ID is missing', () => {
      delete process.env.GITHUB_CLIENT_ID

      expect(() => getGitHubOAuthUrl()).toThrow('GitHub OAuth is not configured')
    })

    it('should throw error when NEXT_PUBLIC_APP_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_APP_URL

      expect(() => getGitHubOAuthUrl()).toThrow('GitHub OAuth is not configured')
    })
  })

  describe('exchangeCodeForToken', () => {
    it('should exchange code for access token successfully', async () => {
      const mockResponse = {
        access_token: 'github-access-token-123',
        token_type: 'bearer',
        scope: 'repo,user',
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await exchangeCodeForToken('auth-code-123')

      expect(fetch).toHaveBeenCalledWith('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          code: 'auth-code-123',
          redirect_uri: 'http://localhost:3000/api/auth/github/callback',
        }),
      })

      expect(mockCookies.set).toHaveBeenCalledWith(
        'github_access_token',
        'github-access-token-123',
        {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        }
      )

      expect(result).toEqual(mockResponse)
    })

    it('should throw error when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response)

      await expect(exchangeCodeForToken('invalid-code')).rejects.toThrow(
        'Failed to exchange code for token: Bad Request'
      )
    })

    it('should throw error when environment variables are missing', async () => {
      delete process.env.GITHUB_CLIENT_SECRET

      await expect(exchangeCodeForToken('code')).rejects.toThrow('GitHub OAuth is not configured')
    })
  })

  describe('getGitHubUser', () => {
    it('should fetch user data with valid token', async () => {
      mockCookies.get.mockReturnValue({ value: 'valid-token' })

      const mockUser = {
        login: 'testuser',
        id: 123,
        name: 'Test User',
        email: 'test@example.com',
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      } as Response)

      const result = await getGitHubUser()

      expect(fetch).toHaveBeenCalledWith('https://api.github.com/user', {
        headers: {
          Authorization: 'Bearer valid-token',
          Accept: 'application/vnd.github.v3+json',
        },
      })

      expect(result).toEqual(mockUser)
    })

    it('should return null when no token is available', async () => {
      mockCookies.get.mockReturnValue(undefined)

      const result = await getGitHubUser()

      expect(result).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('getUserRepositories', () => {
    it('should fetch repositories with default options', async () => {
      mockCookies.get.mockReturnValue({ value: 'valid-token' })

      const mockRepos = [
        { id: 1, name: 'repo1' },
        { id: 2, name: 'repo2' },
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepos,
      } as Response)

      const result = await getUserRepositories()

      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/user/repos?sort=updated&per_page=30',
        expect.any(Object)
      )

      expect(result).toEqual(mockRepos)
    })

    it('should return empty array when no token', async () => {
      mockCookies.get.mockReturnValue(undefined)

      const result = await getUserRepositories()

      expect(result).toEqual([])
    })

    it('should pass custom options to API', async () => {
      mockCookies.get.mockReturnValue({ value: 'valid-token' })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)

      await getUserRepositories({ sort: 'created', per_page: 50 })

      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/user/repos?sort=created&per_page=50',
        expect.any(Object)
      )
    })
  })

  describe('getRepoBranches', () => {
    it('should fetch branches for a repository', async () => {
      mockCookies.get.mockReturnValue({ value: 'valid-token' })

      const mockBranches = [{ name: 'main' }, { name: 'develop' }]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBranches,
      } as Response)

      const result = await getRepoBranches('user', 'repo')

      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/repo/branches',
        expect.any(Object)
      )

      expect(result).toEqual(mockBranches)
    })

    it('should return empty array when no token', async () => {
      mockCookies.get.mockReturnValue(undefined)

      const result = await getRepoBranches('user', 'repo')

      expect(result).toEqual([])
    })
  })

  describe('createRepository', () => {
    it('should create repository successfully', async () => {
      mockCookies.get.mockReturnValue({ value: 'valid-token' })

      const newRepo = {
        name: 'new-repo',
        description: 'Test repository',
        private: false,
      }

      const mockResponse = {
        id: 123,
        ...newRepo,
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await createRepository(newRepo)

      expect(fetch).toHaveBeenCalledWith('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRepo),
      })

      expect(result).toEqual(mockResponse)
    })

    it('should throw error when no token', async () => {
      mockCookies.get.mockReturnValue(undefined)

      await expect(createRepository({ name: 'test' })).rejects.toThrow(
        'GitHub authentication required'
      )
    })
  })

  describe('clearGitHubAuth', () => {
    it('should clear GitHub authentication cookie', async () => {
      await clearGitHubAuth()

      expect(mockCookies.delete).toHaveBeenCalledWith('github_access_token')
    })
  })

  describe('GitHubClient', () => {
    it('should create client instance with token', () => {
      const client = new GitHubClient('test-token')
      expect(client).toBeDefined()
      expect(client.getUser).toBeDefined()
      expect(client.getRepositories).toBeDefined()
      expect(client.getBranches).toBeDefined()
      expect(client.createRepository).toBeDefined()
    })
  })
})
