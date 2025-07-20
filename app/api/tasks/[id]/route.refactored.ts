// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Individual Task API Route - Refactored Version
 *
 * Enhanced API route using base utilities for consistency and reduced duplication
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db/config'
import { tasks } from '@/db/schema'
import { NotFoundError } from '@/lib/api/base-error'
import { BaseAPIService } from '@/lib/api/base-service'
import { BaseAPIHandler } from '@/lib/api/base-handler'
import { ResponseBuilder } from '@/lib/api/response-builder'
import { UpdateTaskSchema } from '@/src/schemas/api-routes'

// Route parameters schema
const TaskParamsSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
})

// Service class extending BaseAPIService
class TaskService extends BaseAPIService {
  protected static serviceName = 'task-api'

  /**
   * Get a single task by ID
   */
  static async getTask(id: string) {
    return this.withTracing(
      'getTask',
      async () => {
        const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)

        if (!task) {
          throw new NotFoundError('Task', id)
        }

        // Log operation
        await this.logOperation('get_task', 'task', task.id, task.userId, { title: task.title })

        return task
      },
      { 'task.id': id }
    )
  }

  /**
   * Update a task
   */
  static async updateTask(id: string, updates: z.infer<typeof UpdateTaskSchema>) {
    return this.withTracing(
      'updateTask',
      async () => {
        return this.withTransaction(async (tx) => {
          // First check if task exists
          const [existingTask] = await tx.select().from(tasks).where(eq(tasks.id, id)).limit(1)

          if (!existingTask) {
            throw new NotFoundError('Task', id)
          }

          const [updatedTask] = await tx
            .update(tasks)
            .set({
              ...updates,
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, id))
            .returning()

          // Log operation with detailed metadata
          await this.logOperation('update_task', 'task', updatedTask.id, updatedTask.userId, {
            updates,
            previousStatus: existingTask.status,
            newStatus: updatedTask.status,
          })

          return updatedTask
        })
      },
      { 'task.id': id }
    )
  }

  /**
   * Delete a task
   */
  static async deleteTask(id: string) {
    return this.withTracing(
      'deleteTask',
      async () => {
        return this.withTransaction(async (tx) => {
          // First check if task exists
          const [existingTask] = await tx.select().from(tasks).where(eq(tasks.id, id)).limit(1)

          if (!existingTask) {
            throw new NotFoundError('Task', id)
          }

          const [deletedTask] = await tx.delete(tasks).where(eq(tasks.id, id)).returning()

          // Log operation
          await this.logOperation('delete_task', 'task', deletedTask.id, deletedTask.userId, {
            title: deletedTask.title,
            status: deletedTask.status,
          })

          return deletedTask
        })
      },
      { 'task.id': id }
    )
  }
}

/**
 * GET /api/tasks/[id] - Get a specific task
 */
export const GET = BaseAPIHandler.createHandler({ schema: TaskParamsSchema }, async (params) => {
  const task = await TaskService.getTask(params.id)
  return ResponseBuilder.success(task, 'Task retrieved successfully')
})

/**
 * PUT /api/tasks/[id] - Update a specific task
 */
export const PUT = BaseAPIHandler.createHandler(
  {
    // Note: We need to combine params and body validation
    // This is a limitation of the current BaseAPIHandler
    // In a real scenario, we might extend BaseAPIHandler to handle this better
  },
  async (_, request) => {
    // Extract ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const id = pathParts[pathParts.indexOf('tasks') + 1]

    // Validate ID
    const { id: validatedId } = TaskParamsSchema.parse({ id })

    // Parse and validate body
    const body = await request.json()
    const validatedData = UpdateTaskSchema.parse(body)

    // Update task
    const task = await TaskService.updateTask(validatedId, validatedData)
    return ResponseBuilder.success(task, 'Task updated successfully')
  }
)

/**
 * DELETE /api/tasks/[id] - Delete a specific task
 */
export const DELETE = BaseAPIHandler.createHandler({ schema: TaskParamsSchema }, async (params) => {
  await TaskService.deleteTask(params.id)
  return ResponseBuilder.noContent()
})

// Alternative approach for handling route params with body validation
// This demonstrates a more elegant solution by extending the handler

/**
 * Enhanced handler that can handle both route params and body
 */
function createRouteHandler<TParams = any, TBody = any, TOutput = any>(
  options: {
    paramsSchema?: z.ZodSchema<TParams>
    bodySchema?: z.ZodSchema<TBody>
  },
  handler: (params: TParams, body: TBody, request: NextRequest) => Promise<TOutput>
) {
  return async (request: NextRequest, context: { params: any }) => {
    try {
      // Validate params if schema provided
      const params = options.paramsSchema
        ? options.paramsSchema.parse(context.params)
        : (context.params as TParams)

      // Validate body if schema provided and method requires body
      let body: TBody = {} as TBody
      if (options.bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const rawBody = await request.json()
        body = options.bodySchema.parse(rawBody)
      }

      // Execute handler
      const result = await handler(params, body, request)

      // Return appropriate response
      if (result === null || result === undefined) {
        return ResponseBuilder.noContent()
      }

      const statusCode = request.method === 'POST' ? 201 : 200
      return ResponseBuilder.success(result, undefined, statusCode)
    } catch (error) {
      return BaseAPIHandler.handleError(error)
    }
  }
}

// Example of using the enhanced handler
export const PUT_V2 = createRouteHandler(
  {
    paramsSchema: TaskParamsSchema,
    bodySchema: UpdateTaskSchema,
  },
  async (params, body) => {
    const task = await TaskService.updateTask(params.id, body)
    return task
  }
)
