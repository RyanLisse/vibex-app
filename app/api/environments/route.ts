// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/**
 * Environments API Route
 *
 * Enhanced API route with Drizzle ORM integration, Zod validation,
 * OpenTelemetry tracing, and comprehensive error handling for environment management.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api'
import { and, desc, eq, like } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { ulid } from 'ulid'
import { z } from 'zod'
import { db } from '@/db/config'
import { environments } from '@/db/schema'
import { observability } from '@/lib/observability'
import {
  CreateEnvironmentSchema,
  createApiErrorResponse,
  createApiSuccessResponse,
  createPaginatedResponse,
  EnvironmentSchema,
  EnvironmentsRequestSchema,
  UpdateEnvironmentSchema,
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
    public statusCode = 500,
    public code = 'INTERNAL_ERROR'
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
      observability.recordOperation('select_environments', duration)

      // Record event
      observability.recordEvent('environments_query', {
        action: 'query_end',
        level: 'debug',
        message: 'Environments query completed',
        duration,
        resultCount: envResults.length,
        totalCount: countResult.length,
        filters: params,
        source: 'api',
        tags: ['environments', 'query'],
      })

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
      observability.recordError('environments_api', error as Error)

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

      // Extract userId from request context or set as needed
      const userId = envData.userId || 'system' // This should come from auth context

      // If this environment should be active, deactivate others for the same user
      if (envData.isActive) {
        await db
          .update(environments)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(environments.userId, userId), eq(environments.isActive, true)))
      }

      const newEnvironment = {
        id: ulid(),
        ...envData,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const [createdEnvironment] = await db.insert(environments).values(newEnvironment).returning()

      const duration = Date.now() - startTime

      // Record metrics
      observability.recordOperation('insert_environment', duration)

      // Record event
      observability.recordEvent('environments_event', {
        action: 'user_action',
        level: 'info',
        message: `Environment created: ${createdEnvironment.name}`,
        environmentId: createdEnvironment.id,
        userId: createdEnvironment.userId,
        isActive: createdEnvironment.isActive,
        duration,
        source: 'api',
        tags: ['environments', 'create'],
      })

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
      observability.recordError('environments_api', error as Error)

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
      observability.recordOperation('activate_environment', duration)

      // Record event
      observability.recordEvent('environments_event', {
        action: 'user_action',
        level: 'info',
        message: `Environment activated: ${activatedEnvironment.name}`,
        environmentId: activatedEnvironment.id,
        userId: activatedEnvironment.userId,
        duration,
        source: 'api',
        tags: ['environments', 'activate'],
      })

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
      observability.recordError('environments_api', error as Error)

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
      return NextResponse.json(createApiErrorResponse('Validation failed', 400), { status: 400 })
    }

    if (error instanceof EnvironmentsAPIError) {
      return NextResponse.json(
        createApiErrorResponse(error.message, error.statusCode, error.code),
        { status: error.statusCode }
      )
    }

    return NextResponse.json(createApiErrorResponse('Internal server error', 500), { status: 500 })
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
      return NextResponse.json(createApiErrorResponse('Validation failed', 400), { status: 400 })
    }

    if (error instanceof EnvironmentsAPIError) {
      return NextResponse.json(
        createApiErrorResponse(error.message, error.statusCode, error.code),
        { status: error.statusCode }
      )
    }

    return NextResponse.json(createApiErrorResponse('Internal server error', 500), { status: 500 })
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
      return NextResponse.json(createApiErrorResponse('Validation failed', 400), { status: 400 })
    }

    if (error instanceof EnvironmentsAPIError) {
      return NextResponse.json(
        createApiErrorResponse(error.message, error.statusCode, error.code),
        { status: error.statusCode }
      )
    }

    return NextResponse.json(createApiErrorResponse('Internal server error', 500), { status: 500 })
  }
}
