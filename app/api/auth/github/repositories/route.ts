/**
 * GitHub Repositories API Route
 *
 * Database-integrated GitHub repository management with caching,
 * synchronization, and comprehensive error handling.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { db } from '@/db/config'
import { users, authSessions, githubRepositories } from '@/db/schema'
import { eq, and, desc, gte, like } from 'drizzle-orm'
import { githubAuth } from '@/lib/github'
import { observability } from '@/lib/observability'
import {
  createApiSuccessResponse,
  createApiErrorResponse,
  createPaginatedResponse,
} from '@/src/schemas/api-routes'

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

// Enhanced error handling
class GitHubRepositoriesAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message)
    this.name = 'GitHubRepositoriesAPIError'
  }
}

// Database operations with caching and sync
class GitHubRepositoriesService {
  /**
   * Get repositories from database with optional sync
   */
  static async getRepositories(
    userId: string,
    accessToken: string,
    params: z.infer<typeof GetRepositoriesQuerySchema>
  ) {
    const tracer = trace.getTracer('github-repositories-api')
    const span = tracer.startSpan('githubRepositories.getRepositories')

    try {
      const startTime = Date.now()

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

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(duration, 'select_github_repositories', true)

      // Record event
      await observability.events.collector.collectEvent(
        'query_end',
        'debug',
        `GitHub repositories query completed`,
        {
          duration,
          resultCount: repoResults.length,
          totalCount: countResult.length,
          syncPerformed: syncNeeded,
          filters: params,
        },
        'api',
        ['github', 'repositories', 'query']
      )

      span.setAttributes({
        'repositories.count': repoResults.length,
        'repositories.total': countResult.length,
        'repositories.syncPerformed': syncNeeded,
        'query.duration': duration,
      })

      return {
        repositories: repoResults,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: countResult.length,
          totalPages: Math.ceil(countResult.length / params.limit),
        },
        syncPerformed: syncNeeded,
        lastSync: repoResults[0]?.lastSyncAt,
      }
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })

      // Record error metrics
      observability.metrics.errorRate(1, 'github_repositories_api')

      throw new GitHubRepositoriesAPIError(
        'Failed to fetch repositories',
        500,
        'FETCH_REPOSITORIES_ERROR'
      )
    } finally {
      span.end()
    }
  }

  /**
   * Check if repositories sync is needed
   */
  private static async isSyncNeeded(
    userId: string,
    syncThresholdMinutes: number,
    forceSync: boolean
  ): Promise<boolean> {
    if (forceSync) return true

    const thresholdTime = new Date(Date.now() - syncThresholdMinutes * 60 * 1000)

    const [recentSync] = await db
      .select({ lastSyncAt: githubRepositories.lastSyncAt })
      .from(githubRepositories)
      .where(and(eq(githubRepositories.userId, userId), gte(githubRepositories.lastSyncAt, thresholdTime)))
      .limit(1)

    return !recentSync
  }

  /**
   * Sync repositories from GitHub API to database
   */
  private static async syncRepositories(userId: string, accessToken: string) {
    const tracer = trace.getTracer('github-repositories-api')
    const span = tracer.startSpan('githubRepositories.syncRepositories')

    try {
      const startTime = Date.now()

      // Fetch repositories from GitHub API
      const apiRepositories = await githubAuth.getUserRepositories(accessToken)

      // Filter to only include repositories the user has push access to
      const userRepos = apiRepositories.filter(
        (repo) => repo.permissions?.push !== false // Only repos with push access
      )

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
      await db.delete(githubRepositories).where(eq(githubRepositories.userId, userId))

      // Insert new repositories
      if (repoData.length > 0) {
        await db.insert(githubRepositories).values(repoData)
      }

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(duration, 'sync_github_repositories', true)

      // Record event
      await observability.events.collector.collectEvent(
        'sync_complete',
        'info',
        `GitHub repositories synced: ${repoData.length} repositories`,
        {
          userId,
          repositoryCount: repoData.length,
          duration,
        },
        'api',
        ['github', 'repositories', 'sync']
      )

      span.setAttributes({
        'sync.repositoryCount': repoData.length,
        'sync.duration': duration,
      })
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })

      throw new GitHubRepositoriesAPIError(
        'Failed to sync repositories',
        500,
        'SYNC_REPOSITORIES_ERROR'
      )
    } finally {
      span.end()
    }
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
      throw new GitHubRepositoriesAPIError('Authentication session not found', 401, 'AUTH_SESSION_NOT_FOUND')
    }

    return userSession.userId
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the access token from the httpOnly cookie
    const accessToken = request.cookies.get('github_access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        createApiErrorResponse('Not authenticated', 401, 'NOT_AUTHENTICATED'),
        { status: 401 }
      )
    }

    // Get user ID from authentication
    const userId = await GitHubRepositoriesService.getUserFromAuth(accessToken)

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedParams = GetRepositoriesQuerySchema.parse(queryParams)

    // Get repositories from database with sync if needed
    const result = await GitHubRepositoriesService.getRepositories(userId, accessToken, validatedParams)

    return NextResponse.json(
      createPaginatedResponse(
        result.repositories,
        result.pagination,
        `Repositories retrieved successfully${result.syncPerformed ? ' (synced from GitHub)' : ''}`
      )
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.errors),
        { status: 400 }
      )
    }

    if (error instanceof GitHubRepositoriesAPIError) {
      return NextResponse.json(
        createApiErrorResponse(error.message, error.statusCode, error.code),
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      createApiErrorResponse('Failed to fetch repositories', 500, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
