'use client'

import { useState, useCallback } from 'react'
import { GitHubBranch } from '@/lib/github'
import { fetchGitHubBranches, parseRepositoryName } from '@/lib/github-api'

interface UseGitHubBranchesReturn {
  branches: GitHubBranch[]
  isLoading: boolean
  error: string | null
  fetchBranches: (repositoryName: string) => Promise<void>
}

export function useGitHubBranches(): UseGitHubBranchesReturn {
  const [branches, setBranches] = useState<GitHubBranch[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBranches = useCallback(async (repositoryName: string): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      const { owner, repo } = parseRepositoryName(repositoryName)
      const branchData = await fetchGitHubBranches(owner, repo)
      setBranches(branchData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch branches')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    branches,
    isLoading,
    error,
    fetchBranches,
  }
}
