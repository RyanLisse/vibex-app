// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Kanban Board API Route - Refactored Version
 *
 * Enhanced kanban operations using base utilities for consistency and reduced duplication
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/config'
import { tasks } from '@/db/schema'
import { NotFoundError, ValidationError } from '@/lib/api/base-error'
import { BaseAPIService } from '@/lib/api/base-service'
import { BaseAPIHandler } from '@/lib/api/base-handler'
import { ResponseBuilder } from '@/lib/api/response-builder'
import { KanbanBoardConfigSchema, KanbanMoveSchema } from '@/src/schemas/enhanced-task-schemas'

// Request validation schemas
const GetKanbanQuerySchema = z.object({
  userId: z.string().optional(),
  projectId: z.string().optional(),
  assignee: z.string().optional(),
})

// Default kanban columns configuration
const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'To Do', limit: null, color: '#64748b' },
  { id: 'in_progress', title: 'In Progress', limit: 5, color: '#3b82f6' },
  { id: 'review', title: 'Review', limit: 3, color: '#f59e0b' },
  { id: 'completed', title: 'Completed', limit: null, color: '#10b981' },
]

// Status mapping between task status and kanban columns
const STATUS_COLUMN_MAP = {
  todo: 'todo',
  in_progress: 'in_progress',
  review: 'review',
  completed: 'completed',
  blocked: 'in_progress', // Blocked tasks stay in progress column
}

// Service class extending BaseAPIService
class KanbanService extends BaseAPIService {
  protected static serviceName = 'kanban-api'

  /**
   * Get kanban board data
   */
  static async getKanbanBoard(params: z.infer<typeof GetKanbanQuerySchema>) {
    return this.withTracing('getKanbanBoard', async () => {
      // Build query conditions
      const conditions = []
      if (params.userId) {
        conditions.push(eq(tasks.userId, params.userId))
      }
      // Note: assignee field not available in current schema

      // Get all tasks
      const allTasks = await db
        .select()
        .from(tasks)
        .where(conditions.length > 0 ? and(...conditions) : undefined)

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
        completedToday: allTasks.filter((t) => t.status === 'completed').length,
        wipLimitViolations: columns.filter((c) => c.isOverLimit).length,
      }

      // Log operation
      await this.logOperation('get_kanban_board', 'kanban', null, params.userId, {
        totalTasks: metrics.totalTasks,
        columns: columns.length,
        wipViolations: metrics.wipLimitViolations,
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
  static async moveTask(moveData: z.infer<typeof KanbanMoveSchema>) {
    return this.withTracing(
      'moveTask',
      async () => {
        return this.withTransaction(async (tx) => {
          // Get the task to move
          const [task] = await tx.select().from(tasks).where(eq(tasks.id, moveData.taskId))

          if (!task) {
            throw new NotFoundError('Task', moveData.taskId)
          }

          // Map column to status
          const columnStatusMap = {
            todo: 'todo',
            in_progress: 'in_progress',
            review: 'review',
            completed: 'completed',
          }

          const newStatus = columnStatusMap[moveData.toColumn]
          if (!newStatus) {
            throw new ValidationError('Invalid target column')
          }

          // Check WIP limits before moving
          if (moveData.toColumn !== 'todo' && moveData.toColumn !== 'completed') {
            const columnConfig = DEFAULT_COLUMNS.find((c) => c.id === moveData.toColumn)
            if (columnConfig?.limit) {
              const currentColumnTasks = await tx
                .select()
                .from(tasks)
                .where(eq(tasks.status, newStatus as any))

              if (currentColumnTasks.length >= columnConfig.limit) {
                throw new ValidationError(
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

          // Note: completedAt field not available in current schema

          // Add kanban metadata
          const currentMetadata = (task.metadata as any) || {}
          updates.metadata = {
            ...currentMetadata,
            kanban: {
              columnHistory: [
                ...(currentMetadata.kanban?.columnHistory || []),
                {
                  from: STATUS_COLUMN_MAP[task.status],
                  to: moveData.toColumn,
                  timestamp: new Date().toISOString(),
                  movedBy: 'system', // userId not available in moveData
                },
              ],
              position: moveData.newOrder,
              lastMoved: new Date().toISOString(),
            },
          }

          const [updatedTask] = await tx
            .update(tasks)
            .set(updates)
            .where(eq(tasks.id, moveData.taskId))
            .returning()

          // Log operation
          await this.logOperation('move_task', 'task', moveData.taskId, 'system', {
            fromColumn: STATUS_COLUMN_MAP[task.status],
            toColumn: moveData.toColumn,
            fromStatus: task.status,
            toStatus: newStatus,
          })

          return {
            task: updatedTask,
            movement: {
              from: STATUS_COLUMN_MAP[task.status],
              to: moveData.toColumn,
              timestamp: new Date().toISOString(),
            },
          }
        })
      },
      { 'task.id': moveData.taskId }
    )
  }

  /**
   * Update kanban board configuration
   */
  static async updateConfig(config: z.infer<typeof KanbanBoardConfigSchema>) {
    return this.withTracing('updateConfig', async () => {
      // In a real implementation, would save to database
      // For now, we'll just validate and return the config

      // Log operation
      await this.logOperation('update_kanban_config', 'kanban', null, null, {
        config: config,
      })

      return config
    })
  }
}

/**
 * GET /api/tasks/kanban - Get kanban board data
 */
export const GET = BaseAPIHandler.createHandler(
  { schema: GetKanbanQuerySchema },
  async (params) => {
    const result = await KanbanService.getKanbanBoard(params)
    return ResponseBuilder.success(result, 'Kanban board data retrieved successfully')
  }
)

/**
 * POST /api/tasks/kanban/move - Move task between columns
 */
export const POST = BaseAPIHandler.createHandler({ schema: KanbanMoveSchema }, async (data) => {
  const result = await KanbanService.moveTask(data)
  return ResponseBuilder.success(result, 'Task moved successfully')
})

/**
 * PUT /api/tasks/kanban/config - Update kanban board configuration
 */
export const PUT = BaseAPIHandler.createHandler(
  { schema: KanbanBoardConfigSchema },
  async (data) => {
    const config = await KanbanService.updateConfig(data)
    return ResponseBuilder.success(config, 'Kanban configuration updated successfully')
  }
)
