// GitHub API utility functions
import type { GitHubBranch, GitHubRepository, GitHubUser } from '@/lib/github'

export class GitHubAPI {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      // Try to parse error message from response body
      let errorMessage = `${response.status} ${response.statusText}`
      try {
        const errorText = await response.text()
        if (errorText) {
          const errorData = JSON.parse(errorText)
          if (errorData.message) {
            errorMessage = errorData.message
          }
        }
      } catch {
        // If parsing fails, use HTTP error format
        errorMessage = `${response.status} ${response.statusText}`
      }
      
      // Throw error with appropriate message format
      if (errorMessage === `${response.status} ${response.statusText}`) {
        throw new Error(`HTTP error: ${errorMessage}`)
      } else {
        throw new Error(`GitHub API error: ${errorMessage}`)
      }
    }

    return response
  }

  async getUser(): Promise<GitHubUser> {
    const response = await this.makeRequest('https://api.github.com/user')
    return response.json()
  }

  async getRepositories(
    options: { type?: string; sort?: string; direction?: string; per_page?: number; page?: number } = {}
  ): Promise<GitHubRepository[]> {
    const params = new URLSearchParams()
    
    // Add all provided parameters to the query string
    if (options.type) params.append('type', options.type)
    if (options.sort) params.append('sort', options.sort)
    if (options.direction) params.append('direction', options.direction)
    if (options.per_page) params.append('per_page', options.per_page.toString())
    if (options.page) params.append('page', options.page.toString())
    
    const url = `https://api.github.com/user/repos${params.toString() ? '?' + params.toString() : ''}`
    const response = await this.makeRequest(url)
    return response.json()
  }

  async getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    const url = `https://api.github.com/repos/${owner}/${repo}/branches`
    const response = await this.makeRequest(url)
    return response.json()
  }

  async createRepository(data: {
    name: string
    description?: string
    private?: boolean
    auto_init?: boolean
    gitignore_template?: string
    license_template?: string
  }): Promise<GitHubRepository> {
    const response = await this.makeRequest('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return response.json()
  }
}

export async function checkAuthStatus(signal?: AbortSignal) {
  const response = await fetch('/api/auth/github/repositories', { signal })
  return response.ok
}

export async function getAuthUrl() {
  const response = await fetch('/api/auth/github/url')
  const { url } = await response.json()
  return url
}

export async function fetchGitHubRepositories(signal?: AbortSignal): Promise<GitHubRepository[]> {
  const response = await fetch('/api/auth/github/repositories', { signal })

  if (!response.ok) {
    throw new Error('Failed to fetch repositories')
  }

  const data = await response.json()
  return data.repositories || []
}

export async function fetchGitHubBranches(
  owner: string,
  repo: string,
  signal?: AbortSignal
): Promise<GitHubBranch[]> {
  const response = await fetch(
    `/api/auth/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
    { signal }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch branches')
  }

  const data = await response.json()
  return data.branches || []
}

export function parseCookieValue(cookieName: string): string | null {
  const cookie = document.cookie.split('; ').find((row) => row.startsWith(`${cookieName}=`))
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
}

export function clearAuthCookies() {
  document.cookie = 'github_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  document.cookie = 'github_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
}

export function parseRepositoryName(repositoryName: string): {
  owner: string
  repo: string
} {
  const [owner, repo] = repositoryName.split('/')

  if (!(owner && repo)) {
    throw new Error('Repository name must be in format "owner/repo"')
  }

  return { owner, repo }
}

export async function revokeToken(token: string): Promise<void> {
  // GitHub doesn't have a standard token revocation endpoint
  // This is a placeholder implementation
  // In practice, you would revoke the token through the GitHub API
  // or by deleting the associated OAuth app authorization
  console.warn(
    'GitHub token revocation not implemented - token should be revoked through GitHub settings'
  )
}
