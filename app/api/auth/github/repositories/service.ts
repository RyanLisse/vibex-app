/**
 * GitHub Repositories API Service
 *
 * Implements GitHub repository management operations with base infrastructure patterns
 * for consistent error handling, tracing, and observability.
 */

import { z } from 'zod'
import { and, desc, eq, gte, like } from 'drizzle-orm'
import { db } from '@/db/config'
import { authSessions, githubRepositories, users } from '@/db/schema'
import { githubAuth } from '@/lib/github'
import {
  BaseAPIService,
  type ServiceContext,
  NotFoundError,
  UnauthorizedError,
  ExternalServiceError,
} from '@/lib/api/base'
import { QueryBuilder } from '@/lib/api/base/query-builder'

// Query schemas
export const GetRepositoriesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(30),
  search: z.string().optional(),
  includeArchived: z.coerce.boolean().default(false),
  includeForks: z.coerce.boolean().default(false),
  forceSync: z.coerce.boolean().default(false),
  syncThreshold: z.coerce.number().min(5).max(1440).default(60), // minutes
})

export type GetRepositoriesQuery = z.infer<typeof GetRepositoriesQuerySchema>

export class GitHubRepositoriesAPIService extends BaseAPIService {
  protected serviceName = 'github-repositories'
  private queryBuilder = new QueryBuilder(githubRepositories)

  /**
   * Get repositories from database with optional sync
   */
  async getRepositories(
    userId: string,
    accessToken: string,
    params: GetRepositoriesQuery,
    context: ServiceContext
  ): Promise<{
    repositories: any[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
    syncPerformed: boolean
    lastSync?: Date
  }> {
    return this.executeWithTracing('getRepositories', context, async (span) => {
      // Check if sync is needed
      const syncNeeded = await this.isSyncNeeded(userId, params.syncThreshold, params.forceSync)

      if (syncNeeded) {
        await this.syncRepositories(userId, accessToken, context)
      }

      // Build query with filters
      const query = this.queryBuilder

      // Base condition - user's repositories
      query.where(githubRepositories.userId, userId)

      // Apply archived filter
      if (!params.includeArchived) {
        query.where(githubRepositories.isArchived, false)
      }

      // Apply fork filter
      if (!params.includeForks) {
        query.where(githubRepositories.isFork, false)
      }

      // Apply search
      if (params.search) {
        query.search([githubRepositories.name, githubRepositories.description], params.search)
      }

      // Apply sorting
      query.orderBy(githubRepositories.lastSyncAt, 'desc')

      // Apply pagination
      query.paginate(params.page, params.limit)

      // Select specific fields
      query.select({
        id: githubRepositories.id,
        githubId: githubRepositories.githubId,
        name: githubRepositories.name,
        fullName: githubRepositories.fullName,
        description: githubRepositories.description,
        htmlUrl: githubRepositories.htmlUrl,
        defaultBranch: githubRepositories.defaultBranch,
        isPrivate: githubRepositories.isPrivate,
        isFork: githubRepositories.isFork,
        isArchived: githubRepositories.isArchived,
        language: githubRepositories.language,
        stargazersCount: githubRepositories.stargazersCount,
        forksCount: githubRepositories.forksCount,
        openIssuesCount: githubRepositories.openIssuesCount,
        permissions: githubRepositories.permissions,
        lastSyncAt: githubRepositories.lastSyncAt,
        updatedAt: githubRepositories.updatedAt,
      })

      // Execute with pagination
      const result = await query.executePaginated()

      span.setAttributes({
        'repositories.count': result.items.length,
        'repositories.total': result.pagination.total,
        'repositories.syncPerformed': syncNeeded,
        'repositories.filters.search': params.search || 'none',
      })

      await this.recordEvent('query_end', 'debug', 'GitHub repositories query completed', {
        resultCount: result.items.length,
        totalCount: result.pagination.total,
        syncPerformed: syncNeeded,
        filters: params,
      })

      return {
        repositories: result.items,
        pagination: {
          ...result.pagination,
          hasNext: result.pagination.page < result.pagination.totalPages,
          hasPrev: result.pagination.page > 1,
        },
        syncPerformed: syncNeeded,
        lastSync: result.items[0]?.lastSyncAt,
      }
    })
  }

  /**
   * Check if repositories sync is needed
   */
  private async isSyncNeeded(
    userId: string,
    syncThresholdMinutes: number,
    forceSync: boolean
  ): Promise<boolean> {
    if (forceSync) {
      return true
    }

    const thresholdTime = new Date(Date.now() - syncThresholdMinutes * 60 * 1000)

    const recentSync = await this.executeDatabase('checkSyncTime', async () => {
      const result = await db
        .select({ lastSyncAt: githubRepositories.lastSyncAt })
        .from(githubRepositories)
        .where(
          and(
            eq(githubRepositories.userId, userId),
            gte(githubRepositories.lastSyncAt, thresholdTime)
          )
        )
        .limit(1)

      return result[0]
    })

    return !recentSync
  }

  /**
   * Sync repositories from GitHub API to database
   */
  private async syncRepositories(
    userId: string,
    accessToken: string,
    context: ServiceContext
  ): Promise<void> {
    return this.executeWithTracing('syncRepositories', context, async (span) => {
      try {
        // Fetch repositories from GitHub API
        const apiRepositories = await githubAuth.getUserRepositories(accessToken)

        // Filter to only include repositories the user has push access to
        const userRepos = apiRepositories.filter((repo) => repo.permissions?.push !== false)

        // Prepare repository data for database
        const now = new Date()
        const repoData = userRepos.map((repo) => ({
          id: crypto.randomUUID(),
          userId,
          githubId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          htmlUrl: repo.html_url,
          cloneUrl: repo.clone_url,
          sshUrl: repo.ssh_url,
          defaultBranch: repo.default_branch,
          isPrivate: repo.private,
          isFork: repo.fork,
          isArchived: repo.archived,
          language: repo.language,
          stargazersCount: repo.stargazers_count,
          forksCount: repo.forks_count,
          openIssuesCount: repo.open_issues_count,
          size: repo.size,
          permissions: repo.permissions,
          lastSyncAt: now,
          createdAt: now,
          updatedAt: now,
        }))

        // Delete existing repositories for this user
        await this.executeDatabase('deleteExisting', async () => {
          return db.delete(githubRepositories).where(eq(githubRepositories.userId, userId))
        })

        // Insert new repositories
        if (repoData.length > 0) {
          await this.executeDatabase('insertRepositories', async () => {
            return db.insert(githubRepositories).values(repoData)
          })
        }

        span.setAttributes({
          'sync.repositoryCount': repoData.length,
        })

        await this.recordEvent(
          'sync_complete',
          'info',
          `GitHub repositories synced: ${repoData.length} repositories`,
          {
            userId,
            repositoryCount: repoData.length,
          }
        )
      } catch (error) {
        throw new ExternalServiceError('GitHub API', error as Error)
      }
    })
  }

  /**
   * Get user ID from authentication
   */
  async getUserFromAuth(accessToken: string): Promise<string> {
    const userSession = await this.executeDatabase('getUserSession', async () => {
      const result = await db
        .select({
          userId: authSessions.userId,
        })
        .from(authSessions)
        .innerJoin(users, eq(authSessions.userId, users.id))
        .where(
          and(
            eq(authSessions.provider, 'github'),
            eq(authSessions.accessToken, accessToken),
            eq(authSessions.isActive, true)
          )
        )
        .limit(1)

      return result[0]
    })

    if (!userSession) {
      throw new UnauthorizedError('Authentication session not found')
    }

    return userSession.userId
  }
}

// Export singleton instance
export const githubRepositoriesService = new GitHubRepositoriesAPIService({
  serviceName: 'github-repositories',
})
