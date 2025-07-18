'use client'

import type { GitHubBranch, GitHubRepository, GitHubUser } from '@/lib/github'
import { useGitHubBranches } from './use-github-branches'
import { useGitHubRepositories } from './use-github-repositories'
import { useGitHubUser } from './use-github-user'

interface UseGitHubAuthReturn {
  isAuthenticated: boolean
  user: GitHubUser | null
  repositories: GitHubRepository[]
  branches: GitHubBranch[]
  isLoading: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => void
  fetchRepositories: () => Promise<void>
  fetchBranches: (repositoryName: string) => Promise<void>
}

export function useGitHubAuth(): UseGitHubAuthReturn {
  const {
    isAuthenticated,
    user,
    isLoading: userLoading,
    error: userError,
    login,
    logout: logoutUser,
  } = useGitHubUser()

  const {
    repositories,
    isLoading: repoLoading,
    error: repoError,
    fetchRepositories,
  } = useGitHubRepositories()

  const {
    branches,
    isLoading: branchLoading,
    error: branchError,
    fetchBranches,
  } = useGitHubBranches()

  const logout = (): void => {
    logoutUser()
    // Clear repositories and branches on logout
    // Note: These hooks should ideally have reset functions for cleaner state management
  }

  const isLoading = userLoading || repoLoading || branchLoading
  const error = userError || repoError || branchError

  return {
    isAuthenticated,
    user,
    repositories,
    branches,
    isLoading,
    error,
    login,
    logout,
    fetchRepositories,
    fetchBranches,
  }
}
