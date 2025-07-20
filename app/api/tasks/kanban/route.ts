// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/**
 * Kanban Board API Route
 *
 * Handles kanban board operations, task movements, and column management.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api'
import { and, eq, inArray } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { ulid } from 'ulid'
import { z } from 'zod'
import { db } from '@/db/config'
import { tasks } from '@/db/schema'
import { observability } from '@/lib/observability'
import { createApiErrorResponse, createApiSuccessResponse } from '@/src/schemas/api-routes'
import { KanbanMoveSchema, KanbanBoardConfigSchema } from '@/src/schemas/enhanced-task-schemas'

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

/**
 * GET /api/tasks/kanban - Get kanban board data
 */
export async function GET(request: NextRequest) {
  const tracer = trace.getTracer('tasks-api')
  const span = tracer.startSpan('tasks.kanban.get')

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')
    const assignee = searchParams.get('assignee')

    // Build query conditions
    const conditions = []
    if (userId) conditions.push(eq(tasks.userId, userId))
    if (assignee) conditions.push(eq(tasks.assignee, assignee))

    // Get all tasks
    let query = db.select().from(tasks)
    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const allTasks = await query

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
        if (priorityDiff !== 0) return priorityDiff
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

    return NextResponse.json(
      createApiSuccessResponse(
        {
          columns,
          config: kanbanConfig,
          metrics,
        },
        'Kanban board data retrieved successfully'
      )
    )
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({ code: SpanStatusCode.ERROR })

    return NextResponse.json(
      createApiErrorResponse('Failed to fetch kanban board', 500, 'FETCH_KANBAN_ERROR'),
      { status: 500 }
    )
  } finally {
    span.end()
  }
}

/**
 * POST /api/tasks/kanban/move - Move task between columns
 */
export async function POST(request: NextRequest) {
  const tracer = trace.getTracer('tasks-api')
  const span = tracer.startSpan('tasks.kanban.move')

  try {
    const body = await request.json()
    const validatedData = KanbanMoveSchema.parse(body)

    // Get the task to move
    const [task] = await db.select().from(tasks).where(eq(tasks.id, validatedData.taskId))

    if (!task) {
      return NextResponse.json(createApiErrorResponse('Task not found', 404, 'TASK_NOT_FOUND'), {
        status: 404,
      })
    }

    // Map column to status
    const columnStatusMap = {
      todo: 'todo',
      in_progress: 'in_progress',
      review: 'review',
      completed: 'completed',
    }

    const newStatus = columnStatusMap[validatedData.targetColumn]
    if (!newStatus) {
      return NextResponse.json(
        createApiErrorResponse('Invalid target column', 400, 'INVALID_COLUMN'),
        { status: 400 }
      )
    }

    // Check WIP limits before moving
    if (validatedData.targetColumn !== 'todo' && validatedData.targetColumn !== 'completed') {
      const columnConfig = DEFAULT_COLUMNS.find((c) => c.id === validatedData.targetColumn)
      if (columnConfig?.limit) {
        const currentColumnTasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.status, newStatus as any))

        if (currentColumnTasks.length >= columnConfig.limit) {
          return NextResponse.json(
            createApiErrorResponse(
              `Column "${columnConfig.title}" has reached its WIP limit of ${columnConfig.limit}`,
              400,
              'WIP_LIMIT_EXCEEDED'
            ),
            { status: 400 }
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
            to: validatedData.targetColumn,
            timestamp: new Date().toISOString(),
            movedBy: validatedData.userId,
          },
        ],
        position: validatedData.position,
        lastMoved: new Date().toISOString(),
      },
    }

    const [updatedTask] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, validatedData.taskId))
      .returning()

    // Record event
    await observability.events.collector.collectEvent(
      'user_action',
      'info',
      `Task moved in kanban: ${task.title}`,
      {
        taskId: validatedData.taskId,
        userId: validatedData.userId,
        fromColumn: STATUS_COLUMN_MAP[task.status],
        toColumn: validatedData.targetColumn,
        fromStatus: task.status,
        toStatus: newStatus,
      },
      'api',
      ['tasks', 'kanban', 'move']
    )

    span.setAttributes({
      'task.id': validatedData.taskId,
      'kanban.from_column': STATUS_COLUMN_MAP[task.status],
      'kanban.to_column': validatedData.targetColumn,
      'kanban.from_status': task.status,
      'kanban.to_status': newStatus,
    })

    return NextResponse.json(
      createApiSuccessResponse(
        {
          task: updatedTask,
          movement: {
            from: STATUS_COLUMN_MAP[task.status],
            to: validatedData.targetColumn,
            timestamp: new Date().toISOString(),
          },
        },
        'Task moved successfully'
      )
    )
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({ code: SpanStatusCode.ERROR })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.issues),
        { status: 400 }
      )
    }

    observability.metrics.errorRate(1, 'kanban_api')

    return NextResponse.json(
      createApiErrorResponse('Failed to move task', 500, 'MOVE_TASK_ERROR'),
      { status: 500 }
    )
  } finally {
    span.end()
  }
}

/**
 * PUT /api/tasks/kanban/config - Update kanban board configuration
 */
export async function PUT(request: NextRequest) {
  const tracer = trace.getTracer('tasks-api')
  const span = tracer.startSpan('tasks.kanban.updateConfig')

  try {
    const body = await request.json()
    const validatedData = KanbanBoardConfigSchema.parse(body)

    // In a real implementation, would save to database
    // For now, we'll just validate and return the config

    span.setAttributes({
      'kanban.columns_count': validatedData.columns.length,
      'kanban.wip_limits_enabled': validatedData.settings.enableWipLimits,
    })

    return NextResponse.json(
      createApiSuccessResponse(validatedData, 'Kanban configuration updated successfully')
    )
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({ code: SpanStatusCode.ERROR })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.issues),
        { status: 400 }
      )
    }

    return NextResponse.json(
      createApiErrorResponse('Failed to update kanban config', 500, 'UPDATE_CONFIG_ERROR'),
      { status: 500 }
    )
  } finally {
    span.end()
  }
}
