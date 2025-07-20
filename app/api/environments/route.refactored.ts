// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Environments API Route - Refactored Version
 *
 * Enhanced environment management using base utilities for consistency and reduced duplication
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, desc, eq, like } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '@/db/config'
import { environments } from '@/db/schema'
import { NotFoundError } from '@/lib/api/base-error'
import { BaseAPIService } from '@/lib/api/base-service'
import { BaseAPIHandler } from '@/lib/api/base-handler'
import { ResponseBuilder } from '@/lib/api/response-builder'
import { CreateEnvironmentSchema } from '@/src/schemas/api-routes'

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

const ActivateEnvironmentSchema = z.object({
  environmentId: z.string().min(1),
  userId: z.string().min(1),
})

// Service class extending BaseAPIService
class EnvironmentsService extends BaseAPIService {
  protected static serviceName = 'environments-api'

  /**
   * Get environments with filtering and pagination
   */
  static async getEnvironments(params: z.infer<typeof GetEnvironmentsQuerySchema>) {
    return this.withTracing('getEnvironments', async () => {
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
      let orderByColumn
      switch (params.sortBy) {
        case 'name':
          orderByColumn = environments.name
          break
        case 'created_at':
          orderByColumn = environments.createdAt
          break
        case 'updated_at':
          orderByColumn = environments.updatedAt
          break
        default:
          orderByColumn = environments.createdAt
      }
      const orderBy = params.sortOrder === 'asc' ? orderByColumn : desc(orderByColumn)

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

      const totalPages = Math.ceil(countResult.length / params.limit)
      const result = {
        data: envResults,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: countResult.length,
          totalPages,
          hasMore: params.page < totalPages,
        },
        total: countResult.length,
      }

      // Log operation
      await this.logOperation('get_environments', 'environments', null, params.userId, {
        resultCount: result.data.length,
        totalCount: result.total,
        filters: params,
      })

      return result
    })
  }

  /**
   * Create a new environment
   */
  static async createEnvironment(
    envData: z.infer<typeof CreateEnvironmentSchema>,
    userId: string = 'system'
  ) {
    return this.withTracing('createEnvironment', async () => {
      return this.withTransaction(async (tx) => {
        // By default, first environment is active
        const isActive = true

        // If this environment should be active, deactivate others for the same user
        if (isActive) {
          await tx
            .update(environments)
            .set({ isActive: false, updatedAt: new Date() })
            .where(and(eq(environments.userId, userId), eq(environments.isActive, true)))
        }

        const newEnvironment = {
          id: ulid(),
          name: envData.name,
          config: {
            type: envData.type,
            description: envData.description,
            url: envData.url,
            variables: envData.variables,
          },
          userId,
          isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const [createdEnvironment] = await tx
          .insert(environments)
          .values(newEnvironment)
          .returning()

        // Log operation
        await this.logOperation(
          'create_environment',
          'environment',
          createdEnvironment.id,
          createdEnvironment.userId,
          {
            name: createdEnvironment.name,
            isActive: createdEnvironment.isActive,
          }
        )

        return createdEnvironment
      })
    })
  }

  /**
   * Activate an environment (deactivate others for the same user)
   */
  static async activateEnvironment(id: string, userId: string) {
    return this.withTracing(
      'activateEnvironment',
      async () => {
        return this.withTransaction(async (tx) => {
          // First, deactivate all environments for this user
          await tx
            .update(environments)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(environments.userId, userId))

          // Then activate the specified environment
          const [activatedEnvironment] = await tx
            .update(environments)
            .set({ isActive: true, updatedAt: new Date() })
            .where(and(eq(environments.id, id), eq(environments.userId, userId)))
            .returning()

          if (!activatedEnvironment) {
            throw new NotFoundError('Environment', id)
          }

          // Log operation
          await this.logOperation(
            'activate_environment',
            'environment',
            activatedEnvironment.id,
            activatedEnvironment.userId,
            {
              name: activatedEnvironment.name,
            }
          )

          return activatedEnvironment
        })
      },
      { 'environment.id': id, 'user.id': userId }
    )
  }
}

/**
 * GET /api/environments - Get environments with filtering and pagination
 */
export const GET = BaseAPIHandler.createHandler(
  { schema: GetEnvironmentsQuerySchema },
  async (params) => {
    const result = await EnvironmentsService.getEnvironments(params)
    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Environments retrieved successfully'
    )
  }
)

/**
 * POST /api/environments - Create a new environment
 */
export const POST = BaseAPIHandler.createHandler(
  { schema: CreateEnvironmentSchema },
  async (data) => {
    // In a real implementation, would get userId from auth context
    const environment = await EnvironmentsService.createEnvironment(data)
    return ResponseBuilder.created(environment, 'Environment created successfully')
  }
)

/**
 * PUT /api/environments/activate - Activate an environment
 */
export const PUT = BaseAPIHandler.createHandler(
  { schema: ActivateEnvironmentSchema },
  async (data) => {
    const environment = await EnvironmentsService.activateEnvironment(
      data.environmentId,
      data.userId
    )
    return ResponseBuilder.success(environment, 'Environment activated successfully')
  }
)
