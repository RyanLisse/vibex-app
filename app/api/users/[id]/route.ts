// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Individual User API Route
 *
 * Handles operations on specific users including profile updates
 * and account management with full database integration.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/config'
import { authSessions, users } from '@/db/schema'
import { observability } from '@/lib/observability'
import {
  createApiErrorResponse,
  createApiSuccessResponse,
  UpdateUserSchema,
} from '@/src/schemas/api-routes'

// Enhanced error handling
class UserAPIError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code = 'INTERNAL_ERROR'
  ) {
    super(message)
    this.name = 'UserAPIError'
  }
}

// Database operations service
class UserService {
  /**
   * Get user by ID with related data
   */
  static async getUserById(id: string) {
    const tracer = trace.getTracer('user-api')
    const span = tracer.startSpan('user.getUserById')

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
        throw new UserAPIError('User not found', 404, 'USER_NOT_FOUND')
      }

      // Get active auth sessions
      const activeSessions = await db
        .select({
          id: authSessions.id,
          provider: authSessions.provider,
          expiresAt: authSessions.expiresAt,
          lastUsedAt: authSessions.lastUsedAt,
          organizationId: authSessions.organizationId,
          creditsGranted: authSessions.creditsGranted,
          isActive: authSessions.isActive,
        })
        .from(authSessions)
        .where(eq(authSessions.userId, id))
        .orderBy(authSessions.lastUsedAt)

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(duration, 'select_user_with_sessions', true)

      span.setAttributes({
        'user.id': user.id,
        'user.provider': user.provider,
        'user.sessionCount': activeSessions.length,
        'query.duration': duration,
      })

      return {
        ...user,
        activeSessions,
      }
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })

      if (error instanceof UserAPIError) {
        throw error
      }

      throw new UserAPIError('Failed to fetch user', 500, 'FETCH_USER_ERROR')
    } finally {
      span.end()
    }
  }

  /**
   * Update user data
   */
  static async updateUser(id: string, updates: z.infer<typeof UpdateUserSchema>) {
    const tracer = trace.getTracer('user-api')
    const span = tracer.startSpan('user.updateUser')

    try {
      const startTime = Date.now()

      const [updatedUser] = await db
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          avatar: users.avatar,
          provider: users.provider,
          preferences: users.preferences,
          isActive: users.isActive,
          updatedAt: users.updatedAt,
        })

      if (!updatedUser) {
        throw new UserAPIError('User not found', 404, 'USER_NOT_FOUND')
      }

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(duration, 'update_user', true)

      // Record event
      await observability.events.collector.collectEvent(
        'user_action',
        'info',
        `User profile updated: ${updatedUser.email}`,
        {
          userId: updatedUser.id,
          changes: Object.keys(updates),
          duration,
        },
        'api',
        ['user', 'update']
      )

      span.setAttributes({
        'user.id': updatedUser.id,
        'user.email': updatedUser.email,
        'update.fields': Object.keys(updates).join(','),
        'query.duration': duration,
      })

      return updatedUser
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })

      if (error instanceof UserAPIError) {
        throw error
      }

      throw new UserAPIError('Failed to update user', 500, 'UPDATE_USER_ERROR')
    } finally {
      span.end()
    }
  }

  /**
   * Deactivate user (soft delete)
   */
  static async deactivateUser(id: string) {
    const tracer = trace.getTracer('user-api')
    const span = tracer.startSpan('user.deactivateUser')

    try {
      const startTime = Date.now()

      // Deactivate user
      const [deactivatedUser] = await db
        .update(users)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          email: users.email,
          isActive: users.isActive,
        })

      if (!deactivatedUser) {
        throw new UserAPIError('User not found', 404, 'USER_NOT_FOUND')
      }

      // Deactivate all auth sessions
      await db
        .update(authSessions)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(authSessions.userId, id))

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(duration, 'deactivate_user', true)

      // Record event
      await observability.events.collector.collectEvent(
        'user_action',
        'warning',
        `User deactivated: ${deactivatedUser.email}`,
        {
          userId: deactivatedUser.id,
          duration,
        },
        'api',
        ['user', 'deactivate']
      )

      span.setAttributes({
        'user.id': deactivatedUser.id,
        'user.email': deactivatedUser.email,
        'query.duration': duration,
      })

      return deactivatedUser
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })

      if (error instanceof UserAPIError) {
        throw error
      }

      throw new UserAPIError('Failed to deactivate user', 500, 'DEACTIVATE_USER_ERROR')
    } finally {
      span.end()
    }
  }
}

/**
 * GET /api/users/[id] - Get user by ID
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        createApiErrorResponse('User ID is required', 400, 'MISSING_USER_ID'),
        { status: 400 }
      )
    }

    const user = await UserService.getUserById(id)

    return NextResponse.json(createApiSuccessResponse(user, 'User retrieved successfully'))
  } catch (error) {
    if (error instanceof UserAPIError) {
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
 * PUT /api/users/[id] - Update user
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        createApiErrorResponse('User ID is required', 400, 'MISSING_USER_ID'),
        { status: 400 }
      )
    }

    // Validate request body
    const validatedData = UpdateUserSchema.parse(body)

    // Update user in database
    const user = await UserService.updateUser(id, validatedData)

    return NextResponse.json(createApiSuccessResponse(user, 'User updated successfully'))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.issues),
        { status: 400 }
      )
    }

    if (error instanceof UserAPIError) {
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
 * DELETE /api/users/[id] - Deactivate user (soft delete)
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        createApiErrorResponse('User ID is required', 400, 'MISSING_USER_ID'),
        { status: 400 }
      )
    }

    const user = await UserService.deactivateUser(id)

    return NextResponse.json(createApiSuccessResponse(user, 'User deactivated successfully'))
  } catch (error) {
    if (error instanceof UserAPIError) {
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
