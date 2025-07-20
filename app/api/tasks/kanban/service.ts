/**
 * Tasks Kanban API Service
 *
 * Implements kanban board operations with base infrastructure patterns
 * for consistent error handling, tracing, and observability.
 */

import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/config'
import { tasks } from '@/db/schema'
import {
  BaseAPIService,
  ConflictError,
  NotFoundError,
  type ServiceContext,
  ValidationError,
} from '@/lib/api/base'
import { QueryBuilder } from '@/lib/api/base/query-builder'
import type { KanbanBoardConfigSchema, KanbanMoveSchema } from '@/src/schemas/enhanced-task-schemas'

// Default kanban columns configuration
export const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'To Do', limit: null, color: '#64748b' },
  { id: 'in_progress', title: 'In Progress', limit: 5, color: '#3b82f6' },
  { id: 'review', title: 'Review', limit: 3, color: '#f59e0b' },
  { id: 'completed', title: 'Completed', limit: null, color: '#10b981' },
]

// Status mapping between task status and kanban columns
export const STATUS_COLUMN_MAP = {
  todo: 'todo',
  in_progress: 'in_progress',
  review: 'review',
  completed: 'completed',
  blocked: 'in_progress', // Blocked tasks stay in progress column
}

const COLUMN_STATUS_MAP = {
  todo: 'todo',
  in_progress: 'in_progress',
  review: 'review',
  completed: 'completed',
}

// Query schemas
export const GetKanbanQuerySchema = z.object({
  userId: z.string().optional(),
  projectId: z.string().optional(),
  assignee: z.string().optional(),
})

export type GetKanbanQuery = z.infer<typeof GetKanbanQuerySchema>
export type KanbanMoveDTO = z.infer<typeof KanbanMoveSchema>
export type KanbanConfigDTO = z.infer<typeof KanbanBoardConfigSchema>

export class TasksKanbanAPIService extends BaseAPIService {
  protected serviceName = 'tasks-kanban'
  private queryBuilder = new QueryBuilder(tasks)

  /**
   * Get kanban board data
   */
  async getKanbanBoard(
    params: GetKanbanQuery,
    context: ServiceContext
  ): Promise<{
    columns: any[]
    config: any
    metrics: any
  }> {
    return this.executeWithTracing('getKanbanBoard', context, async (span) => {
      // Build query conditions
      const conditions = []
      if (params.userId) {
        conditions.push(eq(tasks.userId, params.userId))
      }
      if (params.assignee) {
        conditions.push(eq(tasks.assignee, params.assignee))
      }

      // Get all tasks
      const allTasks = await this.executeDatabase('getTasks', async () => {
        let query = db.select().from(tasks)
        if (conditions.length > 0) {
          query = query.where(and(...conditions))
        }
        return query
      })

      // Get or create kanban configuration
      const kanbanConfig = {
        columns: DEFAULT_COLUMNS,
        settings: {
          enableWipLimits: true,
          autoAssignReviewer: true,
          allowMultipleAssignees: false,
          showTaskEstimates: true,
        },
      }

      // Organize tasks by columns
      const columns = kanbanConfig.columns.map((column) => {
        const columnTasks = allTasks.filter((task) => {
          const mappedColumn = STATUS_COLUMN_MAP[task.status] || 'todo'
          return mappedColumn === column.id
        })

        // Sort tasks by priority and creation date
        columnTasks.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
          if (priorityDiff !== 0) {
            return priorityDiff
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

        return {
          ...column,
          tasks: columnTasks,
          count: columnTasks.length,
          isOverLimit: column.limit && columnTasks.length > column.limit,
        }
      })

      // Calculate board metrics
      const metrics = {
        totalTasks: allTasks.length,
        tasksInProgress: allTasks.filter((t) => t.status === 'in_progress').length,
        blockedTasks: allTasks.filter((t) => t.status === 'blocked').length,
        completedToday: allTasks.filter(
          (t) =>
            t.status === 'completed' &&
            t.completedAt &&
            new Date(t.completedAt).toDateString() === new Date().toDateString()
        ).length,
        wipLimitViolations: columns.filter((c) => c.isOverLimit).length,
      }

      span.setAttributes({
        'kanban.total_tasks': metrics.totalTasks,
        'kanban.columns': columns.length,
        'kanban.wip_violations': metrics.wipLimitViolations,
      })

      await this.recordEvent('kanban_query', 'debug', 'Kanban board data retrieved', {
        totalTasks: metrics.totalTasks,
        columns: columns.length,
        filters: params,
      })

      return {
        columns,
        config: kanbanConfig,
        metrics,
      }
    })
  }

  /**
   * Move task between columns
   */
  async moveTask(
    moveData: KanbanMoveDTO,
    context: ServiceContext
  ): Promise<{
    task: any
    movement: {
      from: string
      to: string
      timestamp: string
    }
  }> {
    return this.executeWithTracing('moveTask', context, async (span) => {
      // Get the task to move
      const task = await this.executeDatabase('getTask', async () => {
        const result = await db.select().from(tasks).where(eq(tasks.id, moveData.taskId)).limit(1)

        return result[0]
      })

      if (!task) {
        throw new NotFoundError('Task', moveData.taskId)
      }

      // Validate target column
      const newStatus = COLUMN_STATUS_MAP[moveData.targetColumn]
      if (!newStatus) {
        throw new ValidationError('Invalid target column')
      }

      // Check WIP limits before moving
      if (moveData.targetColumn !== 'todo' && moveData.targetColumn !== 'completed') {
        const columnConfig = DEFAULT_COLUMNS.find((c) => c.id === moveData.targetColumn)
        if (columnConfig?.limit) {
          const currentColumnTasksCount = await this.executeDatabase('checkWipLimit', async () => {
            const result = await db
              .select({ count: tasks.id })
              .from(tasks)
              .where(eq(tasks.status, newStatus as any))

            return result.length
          })

          if (currentColumnTasksCount >= columnConfig.limit) {
            throw new ConflictError(
              `Column "${columnConfig.title}" has reached its WIP limit of ${columnConfig.limit}`
            )
          }
        }
      }

      // Update task position and status
      const updates: any = {
        status: newStatus,
        updatedAt: new Date(),
      }

      // Set completion time if moving to completed
      if (newStatus === 'completed') {
        updates.completedAt = new Date()
      }

      // Add kanban metadata
      const currentMetadata = task.metadata || {}
      updates.metadata = {
        ...currentMetadata,
        kanban: {
          columnHistory: [
            ...(currentMetadata.kanban?.columnHistory || []),
            {
              from: STATUS_COLUMN_MAP[task.status],
              to: moveData.targetColumn,
              timestamp: new Date().toISOString(),
              movedBy: moveData.userId,
            },
          ],
          position: moveData.position,
          lastMoved: new Date().toISOString(),
        },
      }

      const updatedTask = await this.executeDatabase('updateTask', async () => {
        const result = await db
          .update(tasks)
          .set(updates)
          .where(eq(tasks.id, moveData.taskId))
          .returning()

        return result[0]
      })

      const movement = {
        from: STATUS_COLUMN_MAP[task.status],
        to: moveData.targetColumn,
        timestamp: new Date().toISOString(),
      }

      span.setAttributes({
        'task.id': moveData.taskId,
        'kanban.from_column': movement.from,
        'kanban.to_column': movement.to,
        'kanban.from_status': task.status,
        'kanban.to_status': newStatus,
      })

      await this.recordEvent('user_action', 'info', `Task moved in kanban: ${task.title}`, {
        taskId: moveData.taskId,
        userId: moveData.userId,
        fromColumn: movement.from,
        toColumn: movement.to,
        fromStatus: task.status,
        toStatus: newStatus,
      })

      return {
        task: updatedTask,
        movement,
      }
    })
  }

  /**
   * Update kanban board configuration
   */
  async updateKanbanConfig(
    config: KanbanConfigDTO,
    context: ServiceContext
  ): Promise<KanbanConfigDTO> {
    return this.executeWithTracing('updateKanbanConfig', context, async (span) => {
      // In a real implementation, would save to database
      // For now, we'll just validate and return the config

      span.setAttributes({
        'kanban.columns_count': config.columns.length,
        'kanban.wip_limits_enabled': config.settings.enableWipLimits,
      })

      await this.recordEvent('config_update', 'info', 'Kanban configuration updated', {
        columnsCount: config.columns.length,
        settings: config.settings,
      })

      return config
    })
  }
}

// Export singleton instance
export const tasksKanbanService = new TasksKanbanAPIService({
  serviceName: 'tasks-kanban',
})
