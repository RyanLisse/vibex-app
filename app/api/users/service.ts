/**
 * Users API Service
 *
 * Implements user management operations with base infrastructure patterns
 * for consistent error handling, tracing, and observability.
 */

import { ulid } from 'ulid'
import { z } from 'zod'
import { and, eq, like, desc } from 'drizzle-orm'
import { db } from '@/db/config'
import { authSessions, users } from '@/db/schema'
import {
  BaseAPIService,
  BaseCRUDService,
  type ServiceContext,
  NotFoundError,
  DatabaseError,
  ConflictError,
} from '@/lib/api/base'
import { QueryBuilder } from '@/lib/api/base/query-builder'
import { CreateUserSchema, UpdateUserSchema } from '@/src/schemas/api-routes'

// Query schemas
export const GetUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  provider: z.enum(['github', 'openai', 'anthropic']).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'name', 'last_login_at']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>
export type CreateUserDTO = z.infer<typeof CreateUserSchema>
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>

export class UsersAPIService extends BaseCRUDService<any, CreateUserDTO, UpdateUserDTO> {
  protected tableName = 'users'
  private queryBuilder = new QueryBuilder(users)

  constructor() {
    super({ serviceName: 'users' })
  }

  /**
   * Get all users with filtering and pagination
   */
  async getAll(
    params: GetUsersQuery,
    _pagination: { page: number; limit: number },
    context: ServiceContext
  ): Promise<{ items: any[]; total: number }> {
    return this.executeWithTracing('getUsers', context, async (span) => {
      // Build query with filters
      const query = this.queryBuilder

      // Apply provider filter
      if (params.provider) {
        query.where(users.provider, params.provider)
      }

      // Apply active status filter
      if (params.isActive !== undefined) {
        query.where(users.isActive, params.isActive)
      }

      // Apply search
      if (params.search) {
        query.search([users.name, users.email], params.search)
      }

      // Apply sorting
      const sortColumn = users[params.sortBy as keyof typeof users]
      query.orderBy(sortColumn, params.sortOrder)

      // Apply pagination
      query.paginate(params.page, params.limit)

      // Select specific fields
      query.select({
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

      // Execute with pagination
      const result = await query.executePaginated()

      span.setAttributes({
        'users.count': result.items.length,
        'users.total': result.pagination.total,
        'users.filters.provider': params.provider || 'none',
        'users.filters.search': params.search || 'none',
      })

      await this.recordEvent('query_end', 'debug', 'Users query completed', {
        resultCount: result.items.length,
        totalCount: result.pagination.total,
        filters: params,
      })

      return {
        items: result.items,
        total: result.pagination.total,
      }
    })
  }

  /**
   * Get user by ID with auth sessions
   */
  async getById(id: string, context: ServiceContext): Promise<any> {
    return this.executeWithTracing('getUserById', context, async (span) => {
      const user = await this.executeDatabase('selectUser', async () => {
        const result = await db
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

        return result[0]
      })

      if (!user) {
        throw new NotFoundError('User', id)
      }

      // Get active auth sessions
      const activeSessions = await this.executeDatabase('selectSessions', async () => {
        return db
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
      })

      span.setAttributes({
        'user.id': user.id,
        'user.provider': user.provider,
        'user.activeSessions': activeSessions.length,
      })

      return {
        ...user,
        activeSessions,
      }
    })
  }

  /**
   * Create new user or update existing (upsert)
   */
  async create(userData: CreateUserDTO, context: ServiceContext): Promise<any> {
    return this.executeWithTracing('upsertUser', context, async (span) => {
      // Check if user exists with this provider + providerId
      const existingUser = await this.executeDatabase('checkExisting', async () => {
        const result = await db
          .select()
          .from(users)
          .where(
            and(eq(users.provider, userData.provider), eq(users.providerId, userData.providerId))
          )
          .limit(1)

        return result[0]
      })

      let user
      if (existingUser) {
        // Update existing user
        user = await this.executeDatabase('updateUser', async () => {
          const result = await db
            .update(users)
            .set({
              ...userData,
              lastLoginAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id))
            .returning()

          return result[0]
        })
      } else {
        // Create new user
        user = await this.executeDatabase('insertUser', async () => {
          const newUser = {
            id: ulid(),
            ...userData,
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          const result = await db.insert(users).values(newUser).returning()

          return result[0]
        })
      }

      span.setAttributes({
        'user.id': user.id,
        'user.email': user.email,
        'user.provider': user.provider,
        'user.isNew': !existingUser,
      })

      await this.recordEvent(
        'user_action',
        'info',
        `User ${existingUser ? 'updated' : 'created'}: ${user.email}`,
        {
          userId: user.id,
          provider: user.provider,
          isNew: !existingUser,
        }
      )

      return user
    })
  }

  /**
   * Update user preferences and profile
   */
  async update(id: string, updates: UpdateUserDTO, context: ServiceContext): Promise<any> {
    return this.executeWithTracing('updateUser', context, async (span) => {
      const updatedUser = await this.executeDatabase('updateUser', async () => {
        const result = await db
          .update(users)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(eq(users.id, id))
          .returning()

        return result[0]
      })

      if (!updatedUser) {
        throw new NotFoundError('User', id)
      }

      span.setAttributes({
        'user.id': updatedUser.id,
        'user.email': updatedUser.email,
      })

      await this.recordEvent('user_action', 'info', `User updated: ${updatedUser.email}`, {
        userId: updatedUser.id,
        updates,
      })

      return updatedUser
    })
  }

  /**
   * Delete user (not implemented in original, adding for completeness)
   */
  async delete(id: string, context: ServiceContext): Promise<void> {
    return this.executeWithTracing('deleteUser', context, async (span) => {
      throw new DatabaseError('User deletion not implemented')
    })
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivate(id: string, context: ServiceContext): Promise<any> {
    return this.executeWithTracing('deactivateUser', context, async (span) => {
      // Deactivate user
      const deactivatedUser = await this.executeDatabase('deactivateUser', async () => {
        const result = await db
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

        return result[0]
      })

      if (!deactivatedUser) {
        throw new NotFoundError('User', id)
      }

      // Deactivate all auth sessions
      await this.executeDatabase('deactivateSessions', async () => {
        return db
          .update(authSessions)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(authSessions.userId, id))
      })

      span.setAttributes({
        'user.id': deactivatedUser.id,
        'user.email': deactivatedUser.email,
      })

      await this.recordEvent(
        'user_action',
        'warning',
        `User deactivated: ${deactivatedUser.email}`,
        {
          userId: deactivatedUser.id,
        }
      )

      return deactivatedUser
    })
  }
}

// Export singleton instance
export const usersService = new UsersAPIService()
