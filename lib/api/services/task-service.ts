import { eq, and, sql, desc, asc, inArray } from 'drizzle-orm'
import { db } from '@/db/config'
import { tasks } from '@/db/schema'
import { observability } from '@/lib/observability'
import { BaseService } from './base-service'

export interface TaskQueryParams {
  page?: number
  limit?: number
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  userId?: string
  environmentId?: string
  includeMetadata?: boolean
}

export interface TaskUpdateData {
  title?: string
  description?: string
  status?: string
  priority?: string
  dueDate?: string | null
  metadata?: Record<string, any>
  assigneeId?: string | null
  environmentId?: string | null
}

export interface TaskCreateData {
  title: string
  description?: string
  status?: string
  priority?: string
  dueDate?: string | null
  metadata?: Record<string, any>
  userId: string
  assigneeId?: string | null
  environmentId?: string | null
}

export class TaskService extends BaseService {
  private static instance: TaskService

  private constructor() {
    super({ serviceName: 'task-service', tracerName: 'task-api' })
  }

  static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService()
    }
    return TaskService.instance
  }

  /**
   * Get a single task by ID
   */
  async getTask(id: string) {
    return this.executeWithObservability(
      'getTask',
      async () => {
        const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)

        if (!task) {
          return null
        }

        return task
      },
      { 'task.id': id }
    )
  }

  /**
   * Get tasks with filtering and pagination
   */
  async getTasks(params: TaskQueryParams) {
    return this.executeWithObservability(
      'getTasks',
      async () => {
        const {
          page = 1,
          limit = 10,
          status,
          sortBy = 'createdAt',
          sortOrder = 'desc',
          userId,
          environmentId,
          includeMetadata = true,
        } = params

        // Build query conditions
        const conditions = []
        if (status) conditions.push(eq(tasks.status, status))
        if (userId) conditions.push(eq(tasks.userId, userId))
        if (environmentId) conditions.push(eq(tasks.environmentId, environmentId))

        // Execute paginated query
        const offset = (page - 1) * limit
        const orderColumn = tasks[sortBy as keyof typeof tasks] || tasks.createdAt
        const orderDirection = sortOrder === 'asc' ? asc : desc

        const [taskResults, totalCount] = await Promise.all([
          db
            .select({
              id: tasks.id,
              title: tasks.title,
              description: tasks.description,
              status: tasks.status,
              priority: tasks.priority,
              dueDate: tasks.dueDate,
              completedAt: tasks.completedAt,
              createdAt: tasks.createdAt,
              updatedAt: tasks.updatedAt,
              userId: tasks.userId,
              assigneeId: tasks.assigneeId,
              environmentId: tasks.environmentId,
              ...(includeMetadata && { metadata: tasks.metadata }),
            })
            .from(tasks)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(orderDirection(orderColumn))
            .limit(limit)
            .offset(offset),
          db
            .select({ count: sql<number>`count(*)` })
            .from(tasks)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .then((res) => res[0]?.count || 0),
        ])

        await this.recordEvent(
          'query_end',
          'debug',
          'Tasks query completed',
          {
            resultCount: taskResults.length,
            totalCount,
            filters: params,
          },
          ['tasks', 'query']
        )

        return this.buildPaginationResponse(taskResults, page, limit, totalCount)
      },
      {
        'task.query.page': params.page || 1,
        'task.query.limit': params.limit || 10,
        'task.query.status': params.status || 'all',
        'task.query.sortBy': params.sortBy || 'createdAt',
        'task.query.sortOrder': params.sortOrder || 'desc',
      }
    )
  }

  /**
   * Create a new task
   */
  static async createTask(data: TaskCreateData) {
    const tracer = trace.getTracer('task-api')
    const span = tracer.startSpan('task.createTask')

    try {
      span.setAttribute('task.userId', data.userId)

      const newTask = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.insert(tasks).values(newTask)

      observability.recordTaskCreated(newTask.userId)
      span.setStatus({ code: SpanStatusCode.OK })

      return newTask
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      })
      throw error
    } finally {
      span.end()
    }
  }

  /**
   * Update a task
   */
  static async updateTask(id: string, data: TaskUpdateData) {
    const tracer = trace.getTracer('task-api')
    const span = tracer.startSpan('task.updateTask')

    try {
      span.setAttribute('task.id', id)

      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      }

      // Handle completion tracking
      if (data.status === 'completed' && !updateData.completedAt) {
        updateData.completedAt = new Date()
      } else if (data.status !== 'completed') {
        updateData.completedAt = null
      }

      const [updatedTask] = await db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, id))
        .returning()

      if (!updatedTask) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Task not found',
        })
        return null
      }

      if (data.status === 'completed') {
        observability.recordTaskCompleted(updatedTask.userId)
      }

      span.setStatus({ code: SpanStatusCode.OK })
      return updatedTask
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      })
      throw error
    } finally {
      span.end()
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(id: string) {
    const tracer = trace.getTracer('task-api')
    const span = tracer.startSpan('task.deleteTask')

    try {
      span.setAttribute('task.id', id)

      const [deletedTask] = await db
        .delete(tasks)
        .where(eq(tasks.id, id))
        .returning({ id: tasks.id, userId: tasks.userId })

      if (!deletedTask) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Task not found',
        })
        return null
      }

      observability.recordTaskDeleted(deletedTask.userId)
      span.setStatus({ code: SpanStatusCode.OK })

      return deletedTask
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      })
      throw error
    } finally {
      span.end()
    }
  }

  /**
   * Batch update tasks
   */
  static async batchUpdateTasks(taskIds: string[], updates: Partial<TaskUpdateData>) {
    const tracer = trace.getTracer('task-api')
    const span = tracer.startSpan('task.batchUpdateTasks')

    try {
      span.setAttribute('task.batch.count', taskIds.length)

      const updateData: any = {
        ...updates,
        updatedAt: new Date(),
      }

      const updatedTasks = await db
        .update(tasks)
        .set(updateData)
        .where(inArray(tasks.id, taskIds))
        .returning()

      span.setAttribute('task.batch.updated', updatedTasks.length)
      span.setStatus({ code: SpanStatusCode.OK })

      return updatedTasks
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      })
      throw error
    } finally {
      span.end()
    }
  }
}
