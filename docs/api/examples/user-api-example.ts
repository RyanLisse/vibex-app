/**
 * Example: User API Implementation
 *
 * This example demonstrates how to build a complete user API
 * using the base infrastructure patterns.
 */

// app/api/users/route.ts
import { BaseAPIHandler, ResponseBuilder, ValidationError } from '@/lib/api/base'
import { userService } from '@/services/user-service'
import { z } from 'zod'

// Validation schemas
const GetUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
  sortBy: z.enum(['createdAt', 'name', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8),
  role: z.enum(['user', 'admin']).default('user'),
})

// GET /api/users - List users or get single user
export const GET = BaseAPIHandler.GET(async (context) => {
  const { id, ...queryParams } = context.query

  // Single user by ID
  if (id) {
    const user = await userService.getUserById(id, context)
    return ResponseBuilder.success(user)
  }

  // List users with filters
  const params = BaseAPIHandler.validateQuery(new URLSearchParams(queryParams), GetUsersQuerySchema)

  const result = await userService.getUsers(params, context)
  return ResponseBuilder.fromQueryResult(result)
})

// POST /api/users - Create new user
export const POST = BaseAPIHandler.POST(async (context) => {
  const data = await BaseAPIHandler.validateBody(context.request, CreateUserSchema)

  const user = await userService.createUser(data, context)

  return ResponseBuilder.created(user, `User ${user.email} created successfully`)
})

// services/user-service.ts
import {
  BaseAPIService,
  BaseCRUDService,
  NotFoundError,
  ConflictError,
  createQueryBuilder,
  type ServiceContext,
} from '@/lib/api/base'
import { db } from '@/db/config'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'

interface User {
  id: string
  email: string
  name: string
  role: string
  createdAt: Date
  updatedAt: Date
}

interface CreateUserData {
  email: string
  name: string
  password: string
  role: string
}

class UserService extends BaseCRUDService<User, CreateUserData, Partial<CreateUserData>> {
  protected tableName = 'users'

  constructor() {
    super({ serviceName: 'users' })
  }

  async getUserById(id: string, context: ServiceContext): Promise<User> {
    return this.executeWithTracing('getUserById', context, async (span) => {
      span.setAttributes({ 'user.id': id })

      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      if (!user) {
        throw new NotFoundError('User', id)
      }

      await this.recordEvent('user_accessed', `User ${user.id} accessed`, {
        userId: user.id,
        accessedBy: context.userId,
      })

      return user
    })
  }

  async getUsers(params: any, context: ServiceContext) {
    return this.executeWithTracing('getUsers', context, async (span) => {
      const query = createQueryBuilder(users)

      // Apply search
      if (params.search) {
        query.search([users.name, users.email], params.search)
      }

      // Apply filters
      if (params.role) {
        query.where(users.role, params.role)
      }

      // Apply sorting
      const sortColumn = {
        createdAt: users.createdAt,
        name: users.name,
        email: users.email,
      }[params.sortBy]

      query.orderBy(sortColumn, params.sortOrder)

      // Apply pagination
      query.paginate(params.page, params.limit)

      const result = await query.executePaginated()

      span.setAttributes({
        'query.results': result.items.length,
        'query.total': result.pagination.total,
      })

      return result
    })
  }

  async createUser(data: CreateUserData, context: ServiceContext): Promise<User> {
    return this.executeWithTracing('createUser', context, async (span) => {
      // Check for existing user
      const existing = await db.query.users.findFirst({
        where: eq(users.email, data.email),
      })

      if (existing) {
        throw new ConflictError('Email already registered')
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12)

      // Create user
      const user = await this.executeDatabase('insertUser', async () => {
        const [result] = await db
          .insert(users)
          .values({
            id: crypto.randomUUID(),
            email: data.email,
            name: data.name,
            passwordHash,
            role: data.role,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })

        return result
      })

      // Record event
      await this.recordEvent('user_created', `New user registered: ${user.email}`, {
        userId: user.id,
        email: user.email,
        role: user.role,
        createdBy: context.userId || 'system',
      })

      span.setAttributes({
        'user.id': user.id,
        'user.role': user.role,
      })

      return user
    })
  }

  // Required CRUD methods
  async getAll(filters: any, pagination: any, context: ServiceContext) {
    const result = await this.getUsers({ ...filters, ...pagination }, context)
    return {
      items: result.items,
      total: result.pagination.total,
    }
  }

  async getById(id: string, context: ServiceContext) {
    return this.getUserById(id, context)
  }

  async create(data: CreateUserData, context: ServiceContext) {
    return this.createUser(data, context)
  }

  async update(id: string, data: Partial<CreateUserData>, context: ServiceContext) {
    return this.executeWithTracing('updateUser', context, async (span) => {
      // Verify user exists
      await this.getById(id, context)

      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      }

      // Hash password if provided
      if (data.password) {
        updateData.passwordHash = await bcrypt.hash(data.password, 12)
        delete updateData.password
      }

      const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })

      await this.recordEvent('user_updated', `User ${id} updated`, {
        userId: id,
        updatedBy: context.userId,
        changes: Object.keys(data),
      })

      return updated
    })
  }

  async delete(id: string, context: ServiceContext): Promise<void> {
    return this.executeWithTracing('deleteUser', context, async (span) => {
      const user = await this.getById(id, context)

      await db.delete(users).where(eq(users.id, id))

      await this.recordEvent('user_deleted', `User ${user.email} deleted`, {
        userId: id,
        deletedBy: context.userId,
      })
    })
  }
}

export const userService = new UserService()

// app/api/users/[id]/route.ts - Dynamic routes
import { BaseAPIHandler, ResponseBuilder } from '@/lib/api/base'
import { userService } from '@/services/user-service'

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(100).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['user', 'admin']).optional(),
})

export const GET = BaseAPIHandler.GET(async (context) => {
  const { id } = context.params
  const user = await userService.getById(id, context)
  return ResponseBuilder.success(user)
})

export const PUT = BaseAPIHandler.PUT(
  async (context) => {
    const { id } = context.params
    const data = await BaseAPIHandler.validateBody(context.request, UpdateUserSchema)

    const user = await userService.update(id, data, context)
    return ResponseBuilder.updated(user)
  },
  { requireAuth: true }
)

export const DELETE = BaseAPIHandler.DELETE(
  async (context) => {
    const { id } = context.params
    await userService.delete(id, context)
    return ResponseBuilder.deleted()
  },
  { requireAuth: true }
)
