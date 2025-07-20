/**
 * Real-time Progress Monitoring API Route
 *
 * Handles progress updates, milestone tracking, and real-time notifications.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api'
import { and, eq, gte, lte } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { ulid } from 'ulid'
import { z } from 'zod'
import { db } from '@/db/config'
import { tasks } from '@/db/schema'
import { observability } from '@/lib/observability'
import { createApiErrorResponse, createApiSuccessResponse } from '@/src/schemas/api-routes'
import { TaskProgressUpdateSchema } from '@/src/schemas/enhanced-task-schemas'

// WebSocket connection manager (mock implementation)
class ProgressNotificationManager {
  private static connections = new Map<string, Set<string>>() // userId -> Set of connectionIds

  static addConnection(userId: string, connectionId: string) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set())
    }
    this.connections.get(userId)!.add(connectionId)
  }

  static removeConnection(userId: string, connectionId: string) {
    const userConnections = this.connections.get(userId)
    if (userConnections) {
      userConnections.delete(connectionId)
      if (userConnections.size === 0) {
        this.connections.delete(userId)
      }
    }
  }

  static async notifyProgress(userId: string, progressData: any) {
    const userConnections = this.connections.get(userId)
    if (userConnections && userConnections.size > 0) {
      // In real implementation, would send WebSocket messages
      console.log(`Notifying ${userConnections.size} connections for user ${userId}:`, progressData)
    }
  }

  static async notifyMilestone(userIds: string[], milestone: any) {
    for (const userId of userIds) {
      await this.notifyProgress(userId, {
        type: 'milestone_reached',
        milestone,
      })
    }
  }
}

// Calculate progress metrics
const calculateProgressMetrics = (tasks: any[]) => {
  const total = tasks.length
  const completed = tasks.filter((t) => t.status === 'completed').length
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length
  const blocked = tasks.filter((t) => t.status === 'blocked').length
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
  ).length

  const completionRate = total > 0 ? (completed / total) * 100 : 0
  const velocity = calculateVelocity(tasks)
  const burndownData = calculateBurndown(tasks)

  return {
    total,
    completed,
    inProgress,
    blocked,
    overdue,
    completionRate,
    velocity,
    burndownData,
  }
}

const calculateVelocity = (tasks: any[]) => {
  // Calculate tasks completed per day over last 7 days
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const recentlyCompleted = tasks.filter(
    (t) =>
      t.completedAt && new Date(t.completedAt) >= sevenDaysAgo && new Date(t.completedAt) <= now
  )

  return recentlyCompleted.length / 7
}

const calculateBurndown = (tasks: any[]) => {
  // Generate burndown chart data for last 30 days
  const days = []
  const now = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const completedByDate = tasks.filter(
      (t) => t.completedAt && new Date(t.completedAt) <= date
    ).length
    const totalByDate = tasks.filter((t) => new Date(t.createdAt) <= date).length

    days.push({
      date: date.toISOString().split('T')[0],
      completed: completedByDate,
      remaining: totalByDate - completedByDate,
      total: totalByDate,
    })
  }

  return days
}

/**
 * POST /api/tasks/progress - Update task progress
 */
export async function POST(request: NextRequest) {
  const tracer = trace.getTracer('tasks-api')
  const span = tracer.startSpan('tasks.progress.update')

  try {
    const body = await request.json()
    const validatedData = TaskProgressUpdateSchema.parse(body)

    // Get current task
    const [task] = await db.select().from(tasks).where(eq(tasks.id, validatedData.taskId))

    if (!task) {
      return NextResponse.json(createApiErrorResponse('Task not found', 404, 'TASK_NOT_FOUND'), {
        status: 404,
      })
    }

    // Calculate time tracking
    const currentMetadata = task.metadata || {}
    const timeTracking = currentMetadata.timeTracking || {
      estimatedHours: 0,
      actualHours: 0,
      sessions: [],
    }

    if (validatedData.timeSpent) {
      timeTracking.actualHours += validatedData.timeSpent
      timeTracking.sessions.push({
        duration: validatedData.timeSpent,
        timestamp: new Date().toISOString(),
        description: validatedData.notes || 'Progress update',
      })
    }

    // Update progress
    const progressData = {
      percentage: validatedData.percentage,
      milestones: validatedData.milestones || currentMetadata.progress?.milestones || [],
      blockers: validatedData.blockers || [],
      timeTracking,
      lastUpdated: new Date().toISOString(),
      updatedBy: validatedData.userId,
    }

    // Check for milestone completion
    const previousMilestones = currentMetadata.progress?.milestones || []
    const newMilestones = progressData.milestones.filter(
      (m) => m.completed && !previousMilestones.find((pm) => pm.id === m.id && pm.completed)
    )

    // Update task with new progress
    const [updatedTask] = await db
      .update(tasks)
      .set({
        metadata: {
          ...currentMetadata,
          progress: progressData,
        },
        updatedAt: new Date(),
        ...(validatedData.status && { status: validatedData.status }),
      })
      .where(eq(tasks.id, validatedData.taskId))
      .returning()

    // Send real-time notifications
    await ProgressNotificationManager.notifyProgress(task.userId, {
      type: 'progress_updated',
      taskId: validatedData.taskId,
      progress: progressData,
    })

    // Notify about milestone completions
    if (newMilestones.length > 0) {
      await ProgressNotificationManager.notifyMilestone([task.userId], {
        taskId: validatedData.taskId,
        milestones: newMilestones,
      })
    }

    // Record event
    await observability.events.collector.collectEvent(
      'user_action',
      'info',
      `Task progress updated: ${task.title}`,
      {
        taskId: validatedData.taskId,
        userId: validatedData.userId,
        previousProgress: currentMetadata.progress?.percentage || 0,
        newProgress: validatedData.percentage,
        milestonesCompleted: newMilestones.length,
        timeSpent: validatedData.timeSpent,
      },
      'api',
      ['tasks', 'progress', 'update']
    )

    span.setAttributes({
      'task.id': validatedData.taskId,
      'progress.percentage': validatedData.percentage,
      'progress.milestones_completed': newMilestones.length,
      'progress.time_spent': validatedData.timeSpent || 0,
    })

    return NextResponse.json(
      createApiSuccessResponse(
        {
          task: updatedTask,
          progressData,
          milestonesCompleted: newMilestones,
        },
        'Progress updated successfully'
      )
    )
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({ code: SpanStatusCode.ERROR })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiErrorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.errors),
        { status: 400 }
      )
    }

    observability.metrics.errorRate(1, 'progress_api')

    return NextResponse.json(
      createApiErrorResponse('Failed to update progress', 500, 'UPDATE_PROGRESS_ERROR'),
      { status: 500 }
    )
  } finally {
    span.end()
  }
}

/**
 * GET /api/tasks/progress - Get progress analytics
 */
export async function GET(request: NextRequest) {
  const tracer = trace.getTracer('tasks-api')
  const span = tracer.startSpan('tasks.progress.analytics')

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')
    const timeframe = searchParams.get('timeframe') || '30'

    const daysAgo = parseInt(timeframe)
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

    let query = db.select().from(tasks).where(gte(tasks.createdAt, startDate))

    if (userId) {
      query = query.where(and(gte(tasks.createdAt, startDate), eq(tasks.userId, userId)))
    }

    const tasks = await query

    // Calculate metrics
    const metrics = calculateProgressMetrics(tasks)

    // Find overdue tasks requiring attention
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
    )

    // Find blocked tasks
    const blockedTasks = tasks.filter((t) => t.status === 'blocked')

    // Calculate team productivity
    const teamStats = {
      totalActiveUsers: new Set(tasks.map((t) => t.userId)).size,
      averageCompletionTime: calculateAverageCompletionTime(tasks),
      mostProductiveDay: findMostProductiveDay(tasks),
    }

    span.setAttributes({
      'analytics.total_tasks': metrics.total,
      'analytics.completion_rate': metrics.completionRate,
      'analytics.velocity': metrics.velocity,
      'analytics.overdue_count': overdueTasks.length,
      'analytics.blocked_count': blockedTasks.length,
    })

    return NextResponse.json(
      createApiSuccessResponse(
        {
          metrics,
          overdueTasks: overdueTasks.slice(0, 10), // Limit for performance
          blockedTasks: blockedTasks.slice(0, 10),
          teamStats,
          timeframe: `${daysAgo} days`,
        },
        'Progress analytics retrieved successfully'
      )
    )
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({ code: SpanStatusCode.ERROR })

    return NextResponse.json(
      createApiErrorResponse('Failed to fetch progress analytics', 500, 'FETCH_ANALYTICS_ERROR'),
      { status: 500 }
    )
  } finally {
    span.end()
  }
}

// Helper functions
const calculateAverageCompletionTime = (tasks: any[]) => {
  const completedTasks = tasks.filter((t) => t.completedAt && t.createdAt)

  if (completedTasks.length === 0) return 0

  const totalTime = completedTasks.reduce((sum, task) => {
    const created = new Date(task.createdAt).getTime()
    const completed = new Date(task.completedAt).getTime()
    return sum + (completed - created)
  }, 0)

  return totalTime / completedTasks.length / (1000 * 60 * 60 * 24) // Convert to days
}

const findMostProductiveDay = (tasks: any[]) => {
  const dayCompletion = {}

  tasks
    .filter((t) => t.completedAt)
    .forEach((task) => {
      const day = new Date(task.completedAt).toLocaleDateString('en-US', { weekday: 'long' })
      dayCompletion[day] = (dayCompletion[day] || 0) + 1
    })

  return Object.entries(dayCompletion).reduce(
    (most, [day, count]) => (count > most.count ? { day, count } : most),
    { day: 'No data', count: 0 }
  )
}
