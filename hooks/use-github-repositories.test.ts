import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import { vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useGitHubRepositories } from '@/hooks/use-github-repositories'

// Mock fetch
global.fetch = vi.fn()

// Mock the auth hook
vi.mock('./use-github-auth', () => ({
  useGitHubAuth: () => ({
    isAuthenticated: true,
    user: { login: 'testuser' },
  }),
}))

describe('useGitHubRepositories', () => {
  beforeEach(() => {
    mock.restore()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGitHubRepositories())

    expect(result.current.repositories).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.hasMore).toBe(true)
    expect(result.current.page).toBe(1)
  })

  it('should fetch repositories successfully', async () => {
    const mockRepositories = [
      {
        id: 1,
        name: 'repo1',
        full_name: 'testuser/repo1',
        private: false,
        owner: { login: 'testuser' },
        html_url: 'https://github.com/testuser/repo1',
        description: 'Test repository 1',
        fork: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        pushed_at: '2023-01-01T00:00:00Z',
        stargazers_count: 10,
        language: 'TypeScript',
        default_branch: 'main',
      },
      {
        id: 2,
        name: 'repo2',
        full_name: 'testuser/repo2',
        private: true,
        owner: { login: 'testuser' },
        html_url: 'https://github.com/testuser/repo2',
        description: 'Test repository 2',
        fork: false,
        created_at: '2023-01-02T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        pushed_at: '2023-01-02T00:00:00Z',
        stargazers_count: 5,
        language: 'JavaScript',
        default_branch: 'main',
      },
    ]

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRepositories,
    } as unknown)

    const { result } = renderHook(() => useGitHubRepositories())

    await act(async () => {
      await result.current.fetchRepositories()
    })

    expect(result.current.repositories).toEqual(mockRepositories)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    ;(fetch as unknown as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useGitHubRepositories())

    await act(async () => {
      await result.current.fetchRepositories()
    })

    expect(result.current.repositories).toEqual([])
    expect(result.current.error).toBe('Network error')
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle pagination', async () => {
    const mockPage1 = new Array(30).fill(null).map((_, i) => ({
      id: i + 1,
      name: `repo${i + 1}`,
      full_name: `testuser/repo${i + 1}`,
      private: false,
      owner: { login: 'testuser' },
      html_url: `https://github.com/testuser/repo${i + 1}`,
      description: `Test repository ${i + 1}`,
      fork: false,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      pushed_at: '2023-01-01T00:00:00Z',
      stargazers_count: i,
      language: 'TypeScript',
      default_branch: 'main',
    }))

    const mockPage2 = new Array(10).fill(null).map((_, i) => ({
      id: i + 31,
      name: `repo${i + 31}`,
      full_name: `testuser/repo${i + 31}`,
      private: false,
      owner: { login: 'testuser' },
      html_url: `https://github.com/testuser/repo${i + 31}`,
      description: `Test repository ${i + 31}`,
      fork: false,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      pushed_at: '2023-01-01T00:00:00Z',
      stargazers_count: i,
      language: 'TypeScript',
      default_branch: 'main',
    }))

    ;(fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) =>
            name === 'Link' ? '<https://api.github.com/user/repos?page=2>; rel="next"' : null,
        },
        json: async () => mockPage1,
      } as unknown)
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => null,
        },
        json: async () => mockPage2,
      } as unknown)

    const { result } = renderHook(() => useGitHubRepositories())

    // Fetch first page
    await act(async () => {
      await result.current.fetchRepositories()
    })

    expect(result.current.repositories).toHaveLength(30)
    expect(result.current.hasMore).toBe(true)
    expect(result.current.page).toBe(1)

    // Fetch next page
    await act(async () => {
      await result.current.fetchNextPage()
    })

    expect(result.current.repositories).toHaveLength(40)
    expect(result.current.hasMore).toBe(false)
    expect(result.current.page).toBe(2)
  })

  it('should filter repositories by query', async () => {
    const allRepositories = [
      {
        id: 1,
        name: 'react-app',
        full_name: 'testuser/react-app',
        description: 'A React application',
        language: 'TypeScript',
      },
      {
        id: 2,
        name: 'node-api',
        full_name: 'testuser/node-api',
        description: 'A Node.js API',
        language: 'JavaScript',
      },
      {
        id: 3,
        name: 'python-script',
        full_name: 'testuser/python-script',
        description: 'A Python script',
        language: 'Python',
      },
    ]

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => allRepositories,
    } as unknown)

    const { result } = renderHook(() => useGitHubRepositories())

    await act(async () => {
      await result.current.fetchRepositories()
    })

    // Filter by name
    act(() => {
      result.current.filterRepositories('react')
    })

    expect(result.current.filteredRepositories).toHaveLength(1)
    expect(result.current.filteredRepositories[0].name).toBe('react-app')

    // Filter by language
    act(() => {
      result.current.filterRepositories('javascript', 'language')
    })

    expect(result.current.filteredRepositories).toHaveLength(1)
    expect(result.current.filteredRepositories[0].language).toBe('JavaScript')
  })

  it('should sort repositories', async () => {
    const mockRepositories = [
      {
        id: 1,
        name: 'b-repo',
        stargazers_count: 5,
        updated_at: '2023-01-02T00:00:00Z',
      },
      {
        id: 2,
        name: 'a-repo',
        stargazers_count: 10,
        updated_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 3,
        name: 'c-repo',
        stargazers_count: 3,
        updated_at: '2023-01-03T00:00:00Z',
      },
    ]

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRepositories,
    } as unknown)

    const { result } = renderHook(() => useGitHubRepositories())

    await act(async () => {
      await result.current.fetchRepositories()
    })

    // Sort by name
    act(() => {
      result.current.sortRepositories('name')
    })

    expect(result.current.repositories[0].name).toBe('a-repo')
    expect(result.current.repositories[1].name).toBe('b-repo')
    expect(result.current.repositories[2].name).toBe('c-repo')

    // Sort by stars
    act(() => {
      result.current.sortRepositories('stars')
    })

    expect(result.current.repositories[0].stargazers_count).toBe(10)
    expect(result.current.repositories[1].stargazers_count).toBe(5)
    expect(result.current.repositories[2].stargazers_count).toBe(3)

    // Sort by updated date
    act(() => {
      result.current.sortRepositories('updated')
    })

    expect(result.current.repositories[0].updated_at).toBe('2023-01-03T00:00:00Z')
  })

  it('should refresh repositories', async () => {
    const mockRepositories = [{ id: 1, name: 'repo1' }]

    ;(fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRepositories,
    } as unknown)

    const { result } = renderHook(() => useGitHubRepositories())

    await act(async () => {
      await result.current.fetchRepositories()
    })

    expect(fetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refreshRepositories()
    })

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(result.current.page).toBe(1)
  })

  it('should handle authentication state', async () => {
    // Mock unauthenticated state
    mock.doMock('./use-github-auth', () => ({
      useGitHubAuth: () => ({
        isAuthenticated: false,
        user: null,
      }),
    }))

    const { result } = renderHook(() => useGitHubRepositories())

    await act(async () => {
      await result.current.fetchRepositories()
    })

    expect(result.current.error).toBe('Not authenticated')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('should handle API rate limits', async () => {
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
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
    } as unknown)

    const { result } = renderHook(() => useGitHubRepositories())

    await act(async () => {
      await result.current.fetchRepositories()
    })

    expect(result.current.error).toContain('rate limit')
    expect(result.current.rateLimitReset).toBe(1_234_567_890)
  })

  it('should fetch repository details', async () => {
    const mockRepoDetails = {
      id: 1,
      name: 'repo1',
      full_name: 'testuser/repo1',
      description: 'Detailed description',
      topics: ['typescript', 'react'],
      license: { name: 'MIT' },
      open_issues_count: 5,
      forks_count: 10,
      watchers_count: 20,
    }

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRepoDetails,
    } as unknown)

    const { result } = renderHook(() => useGitHubRepositories())

    const details = await act(async () => {
      return await result.current.getRepositoryDetails('testuser/repo1')
    })

    expect(details).toEqual(mockRepoDetails)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/testuser/repo1'),
      expect.any(Object)
    )
  })

  it('should handle repository visibility filters', async () => {
    const mixedRepositories = [
      { id: 1, name: 'public-repo', private: false },
      { id: 2, name: 'private-repo', private: true },
      { id: 3, name: 'another-public', private: false },
    ]

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mixedRepositories,
    } as unknown)

    const { result } = renderHook(() => useGitHubRepositories())

    await act(async () => {
      await result.current.fetchRepositories({ visibility: 'public' })
    })

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=public'), expect.any(Object))
  })

  it('should handle repository type filters', async () => {
    const { result } = renderHook(() => useGitHubRepositories())

    await act(async () => {
      await result.current.fetchRepositories({
        type: 'owner',
        sort: 'updated',
        direction: 'desc',
      })
    })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('type=owner&sort=updated&direction=desc'),
      expect.any(Object)
    )
  })

  it('should cache repository data', async () => {
    const mockRepositories = [{ id: 1, name: 'repo1' }]

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRepositories,
    } as unknown)

    const { result } = renderHook(() =>
      useGitHubRepositories({
        cacheEnabled: true,
        cacheDuration: 5 * 60 * 1000, // 5 minutes
      })
    )

    await act(async () => {
      await result.current.fetchRepositories()
    })

    expect(fetch).toHaveBeenCalledTimes(1)

    // Fetch again - should use cache
    await act(async () => {
      await result.current.fetchRepositories()
    })

    expect(fetch).toHaveBeenCalledTimes(1) // Still 1, used cache
  })
})
