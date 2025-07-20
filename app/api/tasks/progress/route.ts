// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Real-time Progress Monitoring API Route
 *
 * Handles progress updates, milestone tracking, and real-time notifications.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api'
import { and, eq, gte } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/config'
import { tasks } from '@/db/schema'
import { observability } from '@/lib/observability'
import { createApiErrorResponse, createApiSuccessResponse } from '@/src/schemas/api-routes'
import { TaskProgressSchema } from '@/src/schemas/enhanced-task-schemas'

// WebSocket connection manager (mock implementation)
class ProgressNotificationManager {
  private static connections = new Map<string, Set<string>>() // userId -> Set of connectionIds

  static addConnection(userId: string, connectionId: string) {
    if (!ProgressNotificationManager.connections.has(userId)) {
      ProgressNotificationManager.connections.set(userId, new Set())
    }
    ProgressNotificationManager.connections.get(userId)?.add(connectionId)
  }

  static removeConnection(userId: string, connectionId: string) {
    const userConnections = ProgressNotificationManager.connections.get(userId)
    if (userConnections) {
      userConnections.delete(connectionId)
      if (userConnections.size === 0) {
        ProgressNotificationManager.connections.delete(userId)
      }
    }
  }

  static async notifyProgress(userId: string, _progressData: any) {
    const userConnections = ProgressNotificationManager.connections.get(userId)
    if (userConnections && userConnections.size > 0) {
    }
  }

  static async notifyMilestone(userIds: string[], milestone: any) {
    for (const userId of userIds) {
      await ProgressNotificationManager.notifyProgress(userId, {
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
  const overdue = tasks.filter((t) => {
    const metadata = t.metadata as any
    return metadata?.dueDate && new Date(metadata.dueDate) < new Date() && t.status !== 'completed'
  }).length

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

  const recentlyCompleted = tasks.filter((t) => {
    const metadata = t.metadata as any
    return (
      metadata?.completedAt &&
      new Date(metadata.completedAt) >= sevenDaysAgo &&
      new Date(metadata.completedAt) <= now
    )
  })

  return recentlyCompleted.length / 7
}

const calculateBurndown = (tasks: any[]) => {
  // Generate burndown chart data for last 30 days
  const days = []
  const now = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const completedByDate = tasks.filter((t) => {
      const metadata = t.metadata as any
      return metadata?.completedAt && new Date(metadata.completedAt) <= date
    }).length
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
    const validatedData = TaskProgressSchema.parse(body)

    // Get current task
    const [task] = await db.select().from(tasks).where(eq(tasks.id, validatedData.taskId))

    if (!task) {
      return NextResponse.json(createApiErrorResponse('Task not found', 404), {
        status: 404,
      })
    }

    // Calculate time tracking
    const currentMetadata = (task.metadata as any) || {}
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
        description: (validatedData as any).notes || 'Progress update',
      })
    }

    // Update progress
    const progressData = {
      percentage: validatedData.completionPercentage,
      milestones: (validatedData as any).milestones || currentMetadata.progress?.milestones || [],
      blockers: (validatedData as any).blockers || [],
      timeTracking,
      lastUpdated: new Date().toISOString(),
      updatedBy: (validatedData as any).userId || 'system',
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
          ...(currentMetadata as any),
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
        userId: (validatedData as any).userId || 'system',
        previousProgress: currentMetadata.progress?.percentage || 0,
        newProgress: validatedData.completionPercentage,
        milestonesCompleted: newMilestones.length,
        timeSpent: validatedData.timeSpent,
      },
      'api',
      ['tasks', 'progress', 'update']
    )

    span.setAttributes({
      'task.id': validatedData.taskId,
      'progress.percentage': validatedData.completionPercentage,
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
        createApiErrorResponse(
          'Validation failed',
          400,
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }))
        ),
        { status: 400 }
      )
    }

    observability.metrics.errorRate(1, 'progress_api')

    return NextResponse.json(createApiErrorResponse('Failed to update progress', 500), {
      status: 500,
    })
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
    const _projectId = searchParams.get('projectId')
    const timeframe = searchParams.get('timeframe') || '30'

    const daysAgo = Number.parseInt(timeframe, 10)
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

    const conditions = [gte(tasks.createdAt, startDate)]
    if (userId) {
      conditions.push(eq(tasks.userId, userId))
    }

    const query = db
      .select()
      .from(tasks)
      .where(and(...conditions))

    const taskResults = await query

    // Calculate metrics
    const metrics = calculateProgressMetrics(taskResults)

    // Find overdue tasks requiring attention
    const overdueTasks = taskResults.filter((t) => {
      const metadata = t.metadata as any
      return (
        metadata?.dueDate && new Date(metadata.dueDate) < new Date() && t.status !== 'completed'
      )
    })

    // Find blocked tasks
    const blockedTasks = taskResults.filter((t) => t.status === 'blocked')

    // Calculate team productivity
    const teamStats = {
      totalActiveUsers: new Set(taskResults.map((t) => t.userId)).size,
      averageCompletionTime: calculateAverageCompletionTime(taskResults),
      mostProductiveDay: findMostProductiveDay(taskResults),
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

    return NextResponse.json(createApiErrorResponse('Failed to fetch progress analytics', 500), {
      status: 500,
    })
  } finally {
    span.end()
  }
}

// Helper functions
const calculateAverageCompletionTime = (tasks: any[]) => {
  const completedTasks = tasks.filter((t) => {
    const metadata = t.metadata as any
    return metadata?.completedAt && t.createdAt
  })

  if (completedTasks.length === 0) {
    return 0
  }

  const totalTime = completedTasks.reduce((sum, task) => {
    const created = new Date(task.createdAt).getTime()
    const metadata = task.metadata as any
    const completed = new Date(metadata.completedAt).getTime()
    return sum + (completed - created)
  }, 0)

  return totalTime / completedTasks.length / (1000 * 60 * 60 * 24) // Convert to days
}

const findMostProductiveDay = (tasks: any[]) => {
  const dayCompletion = {}

  tasks
    .filter((t) => {
      const metadata = t.metadata as any
      return metadata?.completedAt
    })
    .forEach((task) => {
      const metadata = task.metadata as any
      const day = new Date(metadata.completedAt).toLocaleDateString('en-US', { weekday: 'long' })
      dayCompletion[day] = (dayCompletion[day] || 0) + 1
    })

  return Object.entries(dayCompletion).reduce(
    (most, [day, count]) =>
      (count as number) > most.count ? { day, count: count as number } : most,
    { day: 'No data', count: 0 }
  )
}
