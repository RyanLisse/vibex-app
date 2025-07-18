// GitHub Authentication Mocking Utilities
// Comprehensive mocking for GitHub OAuth and API operations

import { vi } from 'vitest'

// Mock GitHub user data
export interface MockGitHubUser {
  id: number
  login: string
  name: string
  email: string
  avatar_url: string
  bio?: string
  company?: string
  location?: string
  blog?: string
  public_repos: number
  public_gists: number
  followers: number
  following: number
  created_at: string
  updated_at: string
}

// Mock GitHub repository data
export interface MockGitHubRepository {
  id: number
  name: string
  full_name: string
  owner: Pick<MockGitHubUser, 'id' | 'login' | 'avatar_url'>
  private: boolean
  html_url: string
  description?: string
  fork: boolean
  created_at: string
  updated_at: string
  pushed_at: string
  size: number
  stargazers_count: number
  watchers_count: number
  language: string
  has_issues: boolean
  has_projects: boolean
  has_wiki: boolean
  archived: boolean
  disabled: boolean
  visibility: 'public' | 'private' | 'internal'
  default_branch: string
  permissions?: {
    admin: boolean
    push: boolean
    pull: boolean
  }
}

// Mock GitHub branch data
export interface MockGitHubBranch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
  protection?: {
    enabled: boolean
    required_status_checks?: {
      enforcement_level: string
      contexts: string[]
    }
  }
}

// Mock authentication state
let mockAuthState = {
  isAuthenticated: false,
  user: null as MockGitHubUser | null,
  token: null as string | null,
  scopes: [] as string[],
  expiresAt: null as Date | null,
}

// Mock data stores
let mockRepositories: MockGitHubRepository[] = []
let mockBranches: Record<string, MockGitHubBranch[]> = {}

// Mock GitHub OAuth client
export const mockGitHubOAuth = {
  // OAuth flow
  getAuthUrl: vi.fn().mockImplementation((state?: string) => {
    return `https://github.com/login/oauth/authorize?client_id=mock_client&state=${state || 'test-state'}`
  }),

  exchangeCodeForToken: vi.fn().mockImplementation((code: string) => {
    const token = `mock-token-${code}`
    mockAuthState.token = token
    mockAuthState.isAuthenticated = true

    return Promise.resolve({
      access_token: token,
      token_type: 'bearer',
      scope: 'repo,user',
    })
  }),

  refreshToken: vi.fn().mockImplementation((refreshToken: string) => {
    const newToken = `refreshed-${refreshToken}`
    mockAuthState.token = newToken

    return Promise.resolve({
      access_token: newToken,
      token_type: 'bearer',
      scope: 'repo,user',
    })
  }),

  revokeToken: vi.fn().mockImplementation(() => {
    mockAuthState.isAuthenticated = false
    mockAuthState.user = null
    mockAuthState.token = null
    mockAuthState.scopes = []

    return Promise.resolve()
  }),
}

// Mock GitHub API client
export const mockGitHubAPI = {
  // User operations
  getUser: vi.fn().mockImplementation((token?: string) => {
    if (!(token || mockAuthState.isAuthenticated)) {
      return Promise.reject(new Error('Unauthorized'))
    }

    if (!mockAuthState.user) {
      mockAuthState.user = githubTestDataGenerators.createMockUser()
    }

    return Promise.resolve(mockAuthState.user)
  }),

  // Repository operations
  getRepositories: vi.fn().mockImplementation((token?: string) => {
    if (!(token || mockAuthState.isAuthenticated)) {
      return Promise.reject(new Error('Unauthorized'))
    }

    return Promise.resolve(mockRepositories)
  }),

  getRepository: vi.fn().mockImplementation((owner: string, repo: string) => {
    const repository = mockRepositories.find((r) => r.full_name === `${owner}/${repo}`)
    return repository
      ? Promise.resolve(repository)
      : Promise.reject(new Error('Repository not found'))
  }),

  // Branch operations
  getBranches: vi.fn().mockImplementation((owner: string, repo: string) => {
    const repoKey = `${owner}/${repo}`
    return Promise.resolve(mockBranches[repoKey] || [])
  }),

  getBranch: vi.fn().mockImplementation((owner: string, repo: string, branch: string) => {
    const repoKey = `${owner}/${repo}`
    const branches = mockBranches[repoKey] || []
    const foundBranch = branches.find((b) => b.name === branch)

    return foundBranch
      ? Promise.resolve(foundBranch)
      : Promise.reject(new Error('Branch not found'))
  }),

  // Organization operations
  getOrganizations: vi
    .fn()
    .mockResolvedValue([
      { id: 1, login: 'test-org', avatar_url: 'https://github.com/test-org.png' },
    ]),

  // Rate limiting
  getRateLimit: vi.fn().mockResolvedValue({
    rate: {
      limit: 5000,
      remaining: 4999,
      reset: Date.now() + 3_600_000, // 1 hour from now
    },
  }),
}

// Test data generators
export const githubTestDataGenerators = {
  // Generate mock user
  createMockUser: (overrides: Partial<MockGitHubUser> = {}): MockGitHubUser => ({
    id: 123_456,
    login: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'https://github.com/testuser.png',
    bio: 'Test user bio',
    company: 'Test Company',
    location: 'Test City',
    blog: 'https://testuser.dev',
    public_repos: 10,
    public_gists: 5,
    followers: 100,
    following: 50,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  // Generate mock repository
  createMockRepository: (overrides: Partial<MockGitHubRepository> = {}): MockGitHubRepository => ({
    id: Math.floor(Math.random() * 1_000_000),
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    owner: {
      id: 123_456,
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
    },
    private: false,
    html_url: 'https://github.com/testuser/test-repo',
    description: 'Test repository',
    fork: false,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: new Date().toISOString(),
    pushed_at: new Date().toISOString(),
    size: 1024,
    stargazers_count: 10,
    watchers_count: 5,
    language: 'TypeScript',
    has_issues: true,
    has_projects: true,
    has_wiki: true,
    archived: false,
    disabled: false,
    visibility: 'public',
    default_branch: 'main',
    permissions: {
      admin: true,
      push: true,
      pull: true,
    },
    ...overrides,
  }),

  // Generate mock branch
  createMockBranch: (overrides: Partial<MockGitHubBranch> = {}): MockGitHubBranch => ({
    name: 'main',
    commit: {
      sha: 'abc123def456',
      url: 'https://api.github.com/repos/testuser/test-repo/commits/abc123def456',
    },
    protected: false,
    ...overrides,
  }),

  // Generate multiple repositories
  createMockRepositories: (
    count: number,
    overrides: Partial<MockGitHubRepository> = {}
  ): MockGitHubRepository[] => {
    return Array.from({ length: count }, (_, i) => ({
      ...githubTestDataGenerators.createMockRepository(),
      id: i + 1,
      name: `test-repo-${i + 1}`,
      full_name: `testuser/test-repo-${i + 1}`,
      ...overrides,
    }))
  },

  // Generate multiple branches
  createMockBranches: (names: string[]): MockGitHubBranch[] => {
    return names.map((name) => ({
      ...githubTestDataGenerators.createMockBranch(),
      name,
      commit: {
        sha: `${name}-${Math.random().toString(36).substring(7)}`,
        url: `https://api.github.com/repos/testuser/test-repo/commits/${name}-commit`,
      },
    }))
  },
}

// State management utilities
export const githubStateUtils = {
  // Reset all mock data
  reset: () => {
    mockAuthState = {
      isAuthenticated: false,
      user: null,
      token: null,
      scopes: [],
      expiresAt: null,
    }
    mockRepositories = []
    mockBranches = {}
    vi.clearAllMocks()
  },

  // Seed mock data
  seedData: (data: {
    repositories?: MockGitHubRepository[]
    branches?: Record<string, MockGitHubBranch[]>
    user?: MockGitHubUser
  }) => {
    if (data.repositories) {
      mockRepositories = [...data.repositories]
    }
    if (data.branches) {
      mockBranches = { ...data.branches }
    }
    if (data.user) {
      mockAuthState.user = data.user
    }
  },

  // Get current state
  getState: () => ({
    auth: { ...mockAuthState },
    repositories: [...mockRepositories],
    branches: { ...mockBranches },
  }),

  // Simulate authentication
  authenticateUser: (user?: MockGitHubUser) => {
    mockAuthState.isAuthenticated = true
    mockAuthState.user = user || githubTestDataGenerators.createMockUser()
    mockAuthState.token = 'mock-authenticated-token'
    mockAuthState.scopes = ['repo', 'user']
  },

  // Simulate logout
  logout: () => {
    mockAuthState.isAuthenticated = false
    mockAuthState.user = null
    mockAuthState.token = null
    mockAuthState.scopes = []
  },

  // Add repository to mock data
  addRepository: (repo: MockGitHubRepository, branches?: MockGitHubBranch[]) => {
    mockRepositories.push(repo)
    if (branches) {
      mockBranches[repo.full_name] = branches
    }
  },

  // Simulate API errors
  simulateAPIError: (method: string, error: Error) => {
    if (mockGitHubAPI[method]) {
      mockGitHubAPI[method].mockRejectedValueOnce(error)
    }
  },

  // Simulate rate limiting
  simulateRateLimit: () => {
    const rateLimitError = new Error('API rate limit exceeded')
    Object.keys(mockGitHubAPI).forEach((method) => {
      if (typeof mockGitHubAPI[method] === 'function') {
        mockGitHubAPI[method].mockRejectedValueOnce(rateLimitError)
      }
    })
  },
}

// Setup function to apply GitHub mocks
export const setupGitHubMocks = () => {
  vi.mock('@/lib/github', () => ({
    githubOAuth: mockGitHubOAuth,
    githubAPI: mockGitHubAPI,
  }))

  vi.mock('@/hooks/use-github-auth', () => ({
    useGitHubAuth: () => ({
      isAuthenticated: mockAuthState.isAuthenticated,
      user: mockAuthState.user,
      token: mockAuthState.token,
      login: mockGitHubOAuth.getAuthUrl,
      logout: mockGitHubOAuth.revokeToken,
    }),
  }))
}

// Test helpers for GitHub testing
export const githubTestHelpers = {
  // Assert authentication
  expectAuthenticated: () => {
    expect(mockAuthState.isAuthenticated).toBe(true)
    expect(mockAuthState.user).toBeTruthy()
    expect(mockAuthState.token).toBeTruthy()
  },

  // Assert not authenticated
  expectNotAuthenticated: () => {
    expect(mockAuthState.isAuthenticated).toBe(false)
    expect(mockAuthState.user).toBeNull()
    expect(mockAuthState.token).toBeNull()
  },

  // Assert API call was made
  expectAPICalled: (method: string, ...args: any[]) => {
    expect(mockGitHubAPI[method]).toHaveBeenCalledWith(...args)
  },

  // Assert repository exists
  expectRepositoryExists: (fullName: string) => {
    expect(mockRepositories.some((r) => r.full_name === fullName)).toBe(true)
  },

  // Assert branch exists
  expectBranchExists: (repoFullName: string, branchName: string) => {
    const branches = mockBranches[repoFullName] || []
    expect(branches.some((b) => b.name === branchName)).toBe(true)
  },

  // Wait for authentication
  waitForAuth: async (timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const checkAuth = () => {
        if (mockAuthState.isAuthenticated) {
          resolve(mockAuthState.user)
        } else {
          setTimeout(checkAuth, 10)
        }
      }
      checkAuth()
      setTimeout(() => reject(new Error('Authentication timeout')), timeout)
    })
  },
}

// Export setup function for easy integration
export const setupGitHubAuthMocks = () => {
  setupGitHubMocks()
  githubStateUtils.reset()
}

// Cleanup function
export const cleanupGitHubMocks = () => {
  githubStateUtils.reset()
  vi.clearAllMocks()
}
