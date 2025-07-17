'use client'

import { useState, useCallback } from 'react'
import { GitHubRepository } from '@/lib/github'
import { fetchGitHubRepositories } from '@/lib/github-api'

interface UseGitHubRepositoriesReturn {
  repositories: GitHubRepository[]
  isLoading: boolean
  error: string | null
  fetchRepositories: () => Promise<void>
}

export function useGitHubRepositories(): UseGitHubRepositoriesReturn {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRepositories = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      const repos = await fetchGitHubRepositories()
      setRepositories(repos)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      setError(error instanceof Error ? error.message : 'Failed to fetch repositories')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    repositories,
    isLoading,
    error,
    fetchRepositories,
  }
}
