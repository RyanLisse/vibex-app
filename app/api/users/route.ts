// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Users API Route
 *
 * Database-integrated user management with comprehensive authentication
 * provider support, session management, and observability.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api'
import { and, desc, eq, like } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { ulid } from 'ulid'
import { z } from 'zod'
import { db } from '@/db/config'
import { authSessions, users } from '@/db/schema'
import { observability } from '@/lib/observability'
import {
  CreateUserSchema,
  createApiErrorResponse,
  createApiSuccessResponse,
  createPaginatedResponse,
  type UpdateUserSchema,
} from '@/src/schemas/api-routes'

// Request validation schemas
const GetUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  provider: z.enum(['github', 'openai', 'anthropic']).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'name', 'last_login_at']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const _GetUserParamsSchema = z.object({
  id: z.string().min(1),
})

// Enhanced error handling
class UsersAPIError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code = 'INTERNAL_ERROR'
  ) {
    super(message)
    this.name = 'UsersAPIError'
  }
}

// Database operations with observability
class UsersService {
  /**
   * Get users with filtering and pagination
   */
  static async getUsers(params: z.infer<typeof GetUsersQuerySchema>) {
    const tracer = trace.getTracer('users-api')
    const span = tracer.startSpan('users.getUsers')

    try {
      const startTime = Date.now()

      // Build query conditions
      const conditions = []

      if (params.provider) {
        conditions.push(eq(users.provider, params.provider))
      }

      if (params.isActive !== undefined) {
        conditions.push(eq(users.isActive, params.isActive))
      }

      if (params.search) {
        conditions.push(
          like(users.name, `%${params.search}%`),
          like(users.email, `%${params.search}%`)
        )
      }

      // Build sort order
      const sortColumn = users[params.sortBy as keyof typeof users]
      const orderBy = params.sortOrder === 'asc' ? sortColumn : desc(sortColumn)

      // Execute query with pagination
      const offset = (params.page - 1) * params.limit

      const [userResults, countResult] = await Promise.all([
        db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            avatar: users.avatar,
            provider: users.provider,
            isActive: users.isActive,
            lastLoginAt: users.lastLoginAt,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(orderBy)
          .limit(params.limit)
          .offset(offset),
        db
          .select({ count: users.id })
          .from(users)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
      ])

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(duration, 'select_users', true)

      // Record event
      await observability.events.collector.collectEvent(
        'query_end',
        'debug',
        'Users query completed',
        {
          duration,
          resultCount: userResults.length,
          totalCount: countResult.length,
          filters: params,
        },
        'api',
        ['users', 'query']
      )

      span.setAttributes({
        'users.count': userResults.length,
        'users.total': countResult.length,
        'query.duration': duration,
      })

      return {
        users: userResults,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: countResult.length,
          totalPages: Math.ceil(countResult.length / params.limit),
        },
      }
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })

      // Record error metrics
      observability.metrics.errorRate(1, 'users_api')

      throw new UsersAPIError('Failed to fetch users', 500, 'FETCH_USERS_ERROR')
    } finally {
      span.end()
    }
  }

  /**
   * Get user by ID with auth sessions
   */
  static async getUserById(id: string) {
    const tracer = trace.getTracer('users-api')
    const span = tracer.startSpan('users.getUserById')

    try {
      const startTime = Date.now()

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          avatar: users.avatar,
          provider: users.provider,
          providerId: users.providerId,
          profile: users.profile,
          preferences: users.preferences,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      if (!user) {
        throw new UsersAPIError('User not found', 404, 'USER_NOT_FOUND')
      }

      // Get active auth sessions for this user
      const activeSessions = await db
        .select({
          id: authSessions.id,
          provider: authSessions.provider,
          expiresAt: authSessions.expiresAt,
          lastUsedAt: authSessions.lastUsedAt,
          organizationId: authSessions.organizationId,
          creditsGranted: authSessions.creditsGranted,
        })
        .from(authSessions)
        .where(and(eq(authSessions.userId, id), eq(authSessions.isActive, true)))
        .orderBy(desc(authSessions.lastUsedAt))

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(duration, 'select_user_by_id', true)

      span.setAttributes({
        'user.id': user.id,
        'user.provider': user.provider,
        'user.activeSessions': activeSessions.length,
        'query.duration': duration,
      })

      return {
        ...user,
        activeSessions,
      }
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })

      if (error instanceof UsersAPIError) {
        throw error
      }

      // Record error metrics
      observability.metrics.errorRate(1, 'users_api')

      throw new UsersAPIError('Failed to fetch user', 500, 'FETCH_USER_ERROR')
    } finally {
      span.end()
    }
  }

  /**
   * Create or update user (upsert based on provider + providerId)
   */
  static async upsertUser(userData: z.infer<typeof CreateUserSchema>) {
    const tracer = trace.getTracer('users-api')
    const span = tracer.startSpan('users.upsertUser')

    try {
      const startTime = Date.now()

      // Check if user exists with this provider + providerId
      const [existingUser] = await db
        .select()
        .from(users)
        .where(
          and(eq(users.provider, userData.provider), eq(users.providerId, userData.providerId))
        )
        .limit(1)

      let user
      if (existingUser) {
        // Update existing user
        ;[user] = await db
          .update(users)
          .set({
            ...userData,
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning()
      } else {
        // Create new user
        const newUser = ({
          id: ulid(),
          ...userData,
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }[user] = await db.insert(users).values(newUser).returning())
      }

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(
        duration,
        existingUser ? 'update_user' : 'insert_user',
        true
      )

      // Record event
      await observability.events.collector.collectEvent(
        'user_action',
        'info',
        `User ${existingUser ? 'updated' : 'created'}: ${user.email}`,
        {
          userId: user.id,
          provider: user.provider,
          isNew: !existingUser,
          duration,
        },
        'api',
        ['users', existingUser ? 'update' : 'create']
      )

      span.setAttributes({
        'user.id': user.id,
        'user.email': user.email,
        'user.provider': user.provider,
        'user.isNew': !existingUser,
        'query.duration': duration,
      })

      return user
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })

      // Record error metrics
      observability.metrics.errorRate(1, 'users_api')

      throw new UsersAPIError('Failed to upsert user', 500, 'UPSERT_USER_ERROR')
    } finally {
      span.end()
    }
  }

  /**
   * Update user preferences and profile
   */
  static async updateUser(id: string, updates: z.infer<typeof UpdateUserSchema>) {
    const tracer = trace.getTracer('users-api')
    const span = tracer.startSpan('users.updateUser')

    try {
      const startTime = Date.now()

      const [updatedUser] = await db
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning()

      if (!updatedUser) {
        throw new UsersAPIError('User not found', 404, 'USER_NOT_FOUND')
      }

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(duration, 'update_user', true)

      // Record event
      await observability.events.collector.collectEvent(
        'user_action',
        'info',
        `User updated: ${updatedUser.email}`,
        {
          userId: updatedUser.id,
          updates,
          duration,
        },
        'api',
        ['users', 'update']
      )

      span.setAttributes({
        'user.id': updatedUser.id,
        'user.email': updatedUser.email,
        'query.duration': duration,
      })

      return updatedUser
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })

      if (error instanceof UsersAPIError) {
        throw error
      }

      // Record error metrics
      observability.metrics.errorRate(1, 'users_api')

      throw new UsersAPIError('Failed to update user', 500, 'UPDATE_USER_ERROR')
    } finally {
      span.end()
    }
  }
}

/**
 * GET /api/users - Get users with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    // Validate query parameters
    const validatedParams = GetUsersQuerySchema.parse(queryParams)

    // Get users from database
    const result = await UsersService.getUsers(validatedParams)

    return NextResponse.json(
      createPaginatedResponse(result.users, result.pagination, 'Users retrieved successfully')
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.issues),
        { status: 400 }
      )
    }

    if (error instanceof UsersAPIError) {
      return NextResponse.json(
        createApiErrorResponse(error.message, error.statusCode, error.code),
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      createApiErrorResponse('Internal server error', 500, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

/**
 * POST /api/users - Create or update user (upsert)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validatedData = CreateUserSchema.parse(body)

    // Upsert user in database
    const user = await UsersService.upsertUser(validatedData)

    return NextResponse.json(createApiSuccessResponse(user, 'User created/updated successfully'), {
      status: 201,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.issues),
        { status: 400 }
      )
    }

    if (error instanceof UsersAPIError) {
      return NextResponse.json(
        createApiErrorResponse(error.message, error.statusCode, error.code),
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      createApiErrorResponse('Internal server error', 500, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
