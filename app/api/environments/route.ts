/**
 * Environments API Route
 *
 * Enhanced API route with Drizzle ORM integration, Zod validation,
 * OpenTelemetry tracing, and comprehensive error handling for environment management.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { db } from '@/db/config'
import { environments } from '@/db/schema'
import { eq, and, desc, like } from 'drizzle-orm'
import { ulid } from 'ulid'
import { observability } from '@/lib/observability'
import {
  EnvironmentSchema,
  CreateEnvironmentSchema,
  UpdateEnvironmentSchema,
  EnvironmentsRequestSchema,
  createApiSuccessResponse,
  createApiErrorResponse,
  createPaginatedResponse,
} from '@/src/schemas/api-routes'

// Request validation schemas
const GetEnvironmentsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  userId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'name']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Enhanced error handling
class EnvironmentsAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message)
    this.name = 'EnvironmentsAPIError'
  }
}

// Database operations with observability
class EnvironmentsService {
  /**
   * Get environments with filtering and pagination
   */
  static async getEnvironments(params: z.infer<typeof GetEnvironmentsQuerySchema>) {
    const tracer = trace.getTracer('environments-api')
    const span = tracer.startSpan('environments.getEnvironments')

    try {
      const startTime = Date.now()

      // Build query conditions
      const conditions = []

      if (params.userId) {
        conditions.push(eq(environments.userId, params.userId))
      }

      if (params.isActive !== undefined) {
        conditions.push(eq(environments.isActive, params.isActive))
      }

      if (params.search) {
        conditions.push(like(environments.name, `%${params.search}%`))
      }

      // Build sort order
      const sortColumn = environments[params.sortBy as keyof typeof environments]
      const orderBy = params.sortOrder === 'asc' ? sortColumn : desc(sortColumn)

      // Execute query with pagination
      const offset = (params.page - 1) * params.limit

      const [envResults, countResult] = await Promise.all([
        db
          .select()
          .from(environments)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(orderBy)
          .limit(params.limit)
          .offset(offset),
        db
          .select({ count: environments.id })
          .from(environments)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
      ])

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(duration, 'select_environments', true)

      // Record event
      await observability.events.collector.collectEvent(
        'query_end',
        'debug',
        `Environments query completed`,
        {
          duration,
          resultCount: envResults.length,
          totalCount: countResult.length,
          filters: params,
        },
        'api',
        ['environments', 'query']
      )

      span.setAttributes({
        'environments.count': envResults.length,
        'environments.total': countResult.length,
        'query.duration': duration,
      })

      return {
        environments: envResults,
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
      observability.metrics.errorRate(1, 'environments_api')

      throw new EnvironmentsAPIError(
        'Failed to fetch environments',
        500,
        'FETCH_ENVIRONMENTS_ERROR'
      )
    } finally {
      span.end()
    }
  }

  /**
   * Create a new environment
   */
  static async createEnvironment(envData: z.infer<typeof CreateEnvironmentSchema>) {
    const tracer = trace.getTracer('environments-api')
    const span = tracer.startSpan('environments.createEnvironment')

    try {
      const startTime = Date.now()

      // If this environment should be active, deactivate others for the same user
      if (envData.isActive) {
        await db
          .update(environments)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(environments.userId, envData.userId), eq(environments.isActive, true)))
      }

      const newEnvironment = {
        id: ulid(),
        ...envData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const [createdEnvironment] = await db.insert(environments).values(newEnvironment).returning()

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(duration, 'insert_environment', true)

      // Record event
      await observability.events.collector.collectEvent(
        'user_action',
        'info',
        `Environment created: ${createdEnvironment.name}`,
        {
          environmentId: createdEnvironment.id,
          userId: createdEnvironment.userId,
          isActive: createdEnvironment.isActive,
          duration,
        },
        'api',
        ['environments', 'create']
      )

      span.setAttributes({
        'environment.id': createdEnvironment.id,
        'environment.name': createdEnvironment.name,
        'environment.isActive': createdEnvironment.isActive,
        'query.duration': duration,
      })

      return createdEnvironment
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })

      // Record error metrics
      observability.metrics.errorRate(1, 'environments_api')

      throw new EnvironmentsAPIError(
        'Failed to create environment',
        500,
        'CREATE_ENVIRONMENT_ERROR'
      )
    } finally {
      span.end()
    }
  }

  /**
   * Activate an environment (deactivate others for the same user)
   */
  static async activateEnvironment(id: string, userId: string) {
    const tracer = trace.getTracer('environments-api')
    const span = tracer.startSpan('environments.activateEnvironment')

    try {
      const startTime = Date.now()

      // First, deactivate all environments for this user
      await db
        .update(environments)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(environments.userId, userId))

      // Then activate the specified environment
      const [activatedEnvironment] = await db
        .update(environments)
        .set({ isActive: true, updatedAt: new Date() })
        .where(and(eq(environments.id, id), eq(environments.userId, userId)))
        .returning()

      if (!activatedEnvironment) {
        throw new EnvironmentsAPIError('Environment not found', 404, 'ENVIRONMENT_NOT_FOUND')
      }

      const duration = Date.now() - startTime

      // Record metrics
      observability.metrics.queryDuration(duration, 'activate_environment', true)

      // Record event
      await observability.events.collector.collectEvent(
        'user_action',
        'info',
        `Environment activated: ${activatedEnvironment.name}`,
        {
          environmentId: activatedEnvironment.id,
          userId: activatedEnvironment.userId,
          duration,
        },
        'api',
        ['environments', 'activate']
      )

      span.setAttributes({
        'environment.id': activatedEnvironment.id,
        'environment.name': activatedEnvironment.name,
        'query.duration': duration,
      })

      return activatedEnvironment
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })

      if (error instanceof EnvironmentsAPIError) {
        throw error
      }

      // Record error metrics
      observability.metrics.errorRate(1, 'environments_api')

      throw new EnvironmentsAPIError(
        'Failed to activate environment',
        500,
        'ACTIVATE_ENVIRONMENT_ERROR'
      )
    } finally {
      span.end()
    }
  }
}

/**
 * GET /api/environments - Get environments with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    // Validate query parameters
    const validatedParams = GetEnvironmentsQuerySchema.parse(queryParams)

    // Get environments from database
    const result = await EnvironmentsService.getEnvironments(validatedParams)

    return NextResponse.json(
      createPaginatedResponse(
        result.environments,
        result.pagination,
        'Environments retrieved successfully'
      )
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.errors),
        { status: 400 }
      )
    }

    if (error instanceof EnvironmentsAPIError) {
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
 * POST /api/environments - Create a new environment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validatedData = CreateEnvironmentSchema.parse(body)

    // Create environment in database
    const environment = await EnvironmentsService.createEnvironment(validatedData)

    return NextResponse.json(
      createApiSuccessResponse(environment, 'Environment created successfully'),
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.errors),
        { status: 400 }
      )
    }

    if (error instanceof EnvironmentsAPIError) {
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
 * PUT /api/environments/activate - Activate an environment
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const { environmentId, userId } = z
      .object({
        environmentId: z.string().min(1),
        userId: z.string().min(1),
      })
      .parse(body)

    // Activate environment in database
    const environment = await EnvironmentsService.activateEnvironment(environmentId, userId)

    return NextResponse.json(
      createApiSuccessResponse(environment, 'Environment activated successfully')
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.errors),
        { status: 400 }
      )
    }

    if (error instanceof EnvironmentsAPIError) {
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
