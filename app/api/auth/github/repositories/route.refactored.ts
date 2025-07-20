// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GitHub Repositories API Route - Refactored Version
 *
 * Enhanced GitHub repository management using base utilities for consistency and reduced duplication
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, desc, eq, gte, like } from 'drizzle-orm'
import { db } from '@/db/config'
import { authSessions, githubRepositories, users } from '@/db/schema'
import { githubAuth } from '@/lib/github'
import { UnauthorizedError } from '@/lib/api/base-error'
import { BaseAPIService } from '@/lib/api/base-service'
import { BaseAPIHandler } from '@/lib/api/base-handler'
import { ResponseBuilder } from '@/lib/api/response-builder'

// Request validation schemas
const GetRepositoriesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(30),
  search: z.string().optional(),
  includeArchived: z.coerce.boolean().default(false),
  includeForks: z.coerce.boolean().default(false),
  forceSync: z.coerce.boolean().default(false),
  syncThreshold: z.coerce.number().min(5).max(1440).default(60), // minutes
})

// Service class extending BaseAPIService
class GitHubRepositoriesService extends BaseAPIService {
  protected static serviceName = 'github-repositories-api'

  /**
   * Get repositories from database with optional sync
   */
  static async getRepositories(
    userId: string,
    accessToken: string,
    params: z.infer<typeof GetRepositoriesQuerySchema>
  ) {
    return this.withTracing('getRepositories', async () => {
      // Check if sync is needed
      const syncNeeded = await this.isSyncNeeded(userId, params.syncThreshold, params.forceSync)

      if (syncNeeded) {
        await this.syncRepositories(userId, accessToken)
      }

      // Build query conditions
      const conditions = [eq(githubRepositories.userId, userId)]

      if (!params.includeArchived) {
        conditions.push(eq(githubRepositories.isArchived, false))
      }

      if (!params.includeForks) {
        conditions.push(eq(githubRepositories.isFork, false))
      }

      if (params.search) {
        conditions.push(
          like(githubRepositories.name, `%${params.search}%`),
          like(githubRepositories.description, `%${params.search}%`)
        )
      }

      // Execute query with pagination
      const offset = (params.page - 1) * params.limit

      const [repoResults, countResult] = await Promise.all([
        db
          .select({
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
          .from(githubRepositories)
          .where(and(...conditions))
          .orderBy(desc(githubRepositories.lastSyncAt))
          .limit(params.limit)
          .offset(offset),
        db
          .select({ count: githubRepositories.id })
          .from(githubRepositories)
          .where(and(...conditions)),
      ])

      const result = {
        data: repoResults,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: countResult.length,
          totalPages: Math.ceil(countResult.length / params.limit),
        },
        total: countResult.length,
      }

      // Log operation
      await this.logOperation('get_repositories', 'github_repositories', null, userId, {
        resultCount: result.data.length,
        totalCount: result.total,
        syncPerformed: syncNeeded,
        filters: params,
      })

      return {
        repositories: result.data,
        pagination: result.pagination,
        syncPerformed: syncNeeded,
        lastSync: result.data[0]?.lastSyncAt,
      }
    })
  }

  /**
   * Check if repositories sync is needed
   */
  private static async isSyncNeeded(
    userId: string,
    syncThresholdMinutes: number,
    forceSync: boolean
  ): Promise<boolean> {
    if (forceSync) {
      return true
    }

    const thresholdTime = new Date(Date.now() - syncThresholdMinutes * 60 * 1000)

    const [recentSync] = await db
      .select({ lastSyncAt: githubRepositories.lastSyncAt })
      .from(githubRepositories)
      .where(
        and(
          eq(githubRepositories.userId, userId),
          gte(githubRepositories.lastSyncAt, thresholdTime)
        )
      )
      .limit(1)

    return !recentSync
  }

  /**
   * Sync repositories from GitHub API to database
   */
  private static async syncRepositories(userId: string, accessToken: string) {
    return this.withTracing('syncRepositories', async () => {
      return this.withTransaction(async (tx) => {
        // Fetch repositories from GitHub API
        const apiRepositories = await githubAuth.getUserRepositories(accessToken)

        // Filter to only include repositories the user has push access to
        const userRepos = apiRepositories.filter((repo) => repo.permissions?.push !== false)

        // Prepare repository data
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
        await tx.delete(githubRepositories).where(eq(githubRepositories.userId, userId))

        // Insert new repositories
        if (repoData.length > 0) {
          await tx.insert(githubRepositories).values(repoData)
        }

        // Log operation
        await this.logOperation('sync_repositories', 'github_repositories', null, userId, {
          repositoryCount: repoData.length,
        })

        return repoData.length
      })
    })
  }

  /**
   * Get user ID from authentication
   */
  static async getUserFromAuth(accessToken: string): Promise<string> {
    // Find user by active GitHub session
    const [userSession] = await db
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

    if (!userSession) {
      throw new UnauthorizedError('Authentication session not found')
    }

    return userSession.userId
  }
}

/**
 * GET /api/auth/github/repositories - Get GitHub repositories
 */
export const GET = BaseAPIHandler.createHandler(
  { schema: GetRepositoriesQuerySchema },
  async (params, request: NextRequest) => {
    // Get the access token from the httpOnly cookie
    const accessToken = request.cookies.get('github_access_token')?.value

    if (!accessToken) {
      throw new UnauthorizedError('Not authenticated')
    }

    // Get user ID from authentication
    const userId = await GitHubRepositoriesService.getUserFromAuth(accessToken)

    // Get repositories from database with sync if needed
    const result = await GitHubRepositoriesService.getRepositories(userId, accessToken, params)

    return ResponseBuilder.paginated(
      result.repositories,
      result.pagination,
      'Repositories retrieved successfully'
    )
  }
)
