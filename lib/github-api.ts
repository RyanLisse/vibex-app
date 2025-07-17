// GitHub API utility functions
import { GitHubRepository, GitHubBranch } from '@/lib/github'

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

export function parseRepositoryName(repositoryName: string): { owner: string; repo: string } {
  const [owner, repo] = repositoryName.split('/')

  if (!owner || !repo) {
    throw new Error('Repository name must be in format "owner/repo"')
  }

  return { owner, repo }
}
