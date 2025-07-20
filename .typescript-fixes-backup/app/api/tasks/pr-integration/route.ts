/**
 * PR Status Integration API Route
 *
 * Handles GitHub PR integration, status updates, and webhook processing.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api'
import { and, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { ulid } from 'ulid'
import { z } from 'zod'
import { db } from '@/db/config'
import { tasks } from '@/db/schema'
import { observability } from '@/lib/observability'
import { createApiErrorResponse, createApiSuccessResponse } from '@/src/schemas/api-routes'
import { TaskPRLinkSchema, PRStatusUpdateSchema } from '@/src/schemas/enhanced-task-schemas'

// Mock GitHub API client
class GitHubAPIClient {
  private static baseUrl = 'https://api.github.com'

  static async getPRStatus(repository: string, prNumber: string) {
    // In real implementation, would make actual GitHub API calls
    // For now, return mock data
    await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate API delay

    return {
      prId: `pr-${prNumber}`,
      title: `Feature: Add new task management functionality`,
      status: 'open' as const,
      reviewStatus: 'pending' as const,
      mergeable: true,
      repository,
      branch: 'feature/task-management-enhancements',
      author: 'dev-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reviewers: [
        {
          login: 'senior-dev',
          status: 'approved' as const,
        },
        {
          login: 'tech-lead',
          status: 'requested' as const,
        },
      ],
      checks: [
        {
          name: 'CI/CD Pipeline',
          status: 'success' as const,
          conclusion: 'success',
          url: `https://github.com/${repository}/actions`,
        },
        {
          name: 'Code Quality',
          status: 'success' as const,
          conclusion: 'success',
          url: `https://sonarcloud.io/project/${repository}`,
        },
        {
          name: 'Security Scan',
          status: 'pending' as const,
          conclusion: null,
          url: `https://github.com/${repository}/security`,
        },
      ],
    }
  }

  static async mergePR(repository: string, prNumber: string) {
    // Mock merge operation
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return {
      merged: true,
      mergeCommitSha: 'abc123def456',
      mergedAt: new Date().toISOString(),
    }
  }

  static async requestReview(repository: string, prNumber: string, reviewers: string[]) {
    // Mock review request
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return {
      requested: reviewers,
      requestedAt: new Date().toISOString(),
    }
  }
}

/**
 * POST /api/tasks/pr-integration/link - Link task to PR
 */
export async function POST(request: NextRequest) {
  const tracer = trace.getTracer('tasks-api')
  const span = tracer.startSpan('tasks.prIntegration.link')

  try {
    const body = await request.json()
    const validatedData = TaskPRLinkSchema.parse(body)

    // Get the task
    const [task] = await db.select().from(tasks).where(eq(tasks.id, validatedData.taskId))

    if (!task) {
      return NextResponse.json(createApiErrorResponse('Task not found', 404, 'TASK_NOT_FOUND'), {
        status: 404,
      })
    }

    // Fetch PR status from GitHub
    const prStatus = await GitHubAPIClient.getPRStatus(
      validatedData.repository,
      validatedData.prNumber
    )

    // Create PR link data
    const prLink = {
      prId: prStatus.prId,
      repository: validatedData.repository,
      branch: prStatus.branch,
      autoUpdateStatus: validatedData.autoUpdateStatus,
      linkedAt: new Date().toISOString(),
      linkedBy: validatedData.userId,
    }

    // Update task metadata with PR link
    const currentMetadata = task.metadata || {}
    const existingPRLinks = currentMetadata.prLinks || []

    // Check if PR is already linked
    const existingLink = existingPRLinks.find((link) => link.prId === prStatus.prId)
    if (existingLink) {
      return NextResponse.json(
        createApiErrorResponse('PR is already linked to this task', 400, 'PR_ALREADY_LINKED'),
        { status: 400 }
      )
    }

    const updatedMetadata = {
      ...currentMetadata,
      prLinks: [...existingPRLinks, prLink],
      prStatuses: {
        ...currentMetadata.prStatuses,
        [prStatus.prId]: prStatus,
      },
    }

    const [updatedTask] = await db
      .update(tasks)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, validatedData.taskId))
      .returning()

    // Record event
    await observability.events.collector.collectEvent(
      'user_action',
      'info',
      `PR linked to task: ${task.title}`,
      {
        taskId: validatedData.taskId,
        prId: prStatus.prId,
        repository: validatedData.repository,
        prNumber: validatedData.prNumber,
        autoUpdate: validatedData.autoUpdateStatus,
      },
      'api',
      ['tasks', 'pr-integration', 'link']
    )

    span.setAttributes({
      'task.id': validatedData.taskId,
      'pr.id': prStatus.prId,
      'pr.repository': validatedData.repository,
      'pr.number': validatedData.prNumber,
      'pr.auto_update': validatedData.autoUpdateStatus,
    })

    return NextResponse.json(
      createApiSuccessResponse(
        {
          task: updatedTask,
          prStatus,
          link: prLink,
        },
        'PR linked successfully'
      ),
      { status: 201 }
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

    observability.metrics.errorRate(1, 'pr_integration_api')

    return NextResponse.json(createApiErrorResponse('Failed to link PR', 500, 'LINK_PR_ERROR'), {
      status: 500,
    })
  } finally {
    span.end()
  }
}

/**
 * PUT /api/tasks/pr-integration/status - Update PR status
 */
export async function PUT(request: NextRequest) {
  const tracer = trace.getTracer('tasks-api')
  const span = tracer.startSpan('tasks.prIntegration.updateStatus')

  try {
    const body = await request.json()
    const validatedData = PRStatusUpdateSchema.parse(body)

    // Get all tasks with this PR linked
    const allTasks = await db.select().from(tasks)
    const tasksWithPR = allTasks.filter((task) => {
      const prLinks = task.metadata?.prLinks || []
      return prLinks.some((link) => link.prId === validatedData.prId)
    })

    if (tasksWithPR.length === 0) {
      return NextResponse.json(
        createApiErrorResponse('No tasks found with this PR', 404, 'PR_NOT_LINKED'),
        { status: 404 }
      )
    }

    // Fetch updated PR status from GitHub
    const taskWithPR = tasksWithPR[0]
    const prLink = taskWithPR.metadata.prLinks.find((link) => link.prId === validatedData.prId)
    const prStatus = await GitHubAPIClient.getPRStatus(
      prLink.repository,
      validatedData.prId.replace('pr-', '')
    )

    // Update all linked tasks
    const updatePromises = tasksWithPR.map(async (task) => {
      const currentMetadata = task.metadata || {}
      const updatedMetadata = {
        ...currentMetadata,
        prStatuses: {
          ...currentMetadata.prStatuses,
          [validatedData.prId]: prStatus,
        },
      }

      // Auto-update task status if PR is merged and auto-update is enabled
      const prLink = currentMetadata.prLinks.find((link) => link.prId === validatedData.prId)
      const shouldAutoUpdate = prLink?.autoUpdateStatus && prStatus.status === 'merged'

      const updates: any = {
        metadata: updatedMetadata,
        updatedAt: new Date(),
      }

      if (shouldAutoUpdate && task.status !== 'completed') {
        updates.status = 'completed'
        updates.completedAt = new Date()
      }

      return db.update(tasks).set(updates).where(eq(tasks.id, task.id)).returning()
    })

    const updatedTasks = await Promise.all(updatePromises)

    // Record event
    await observability.events.collector.collectEvent(
      'pr_status_update',
      'info',
      `PR status updated: ${prStatus.title}`,
      {
        prId: validatedData.prId,
        newStatus: prStatus.status,
        reviewStatus: prStatus.reviewStatus,
        tasksUpdated: updatedTasks.length,
        autoUpdatedTasks: updatedTasks.filter(([task]) => task.status === 'completed').length,
      },
      'api',
      ['tasks', 'pr-integration', 'status-update']
    )

    span.setAttributes({
      'pr.id': validatedData.prId,
      'pr.status': prStatus.status,
      'pr.review_status': prStatus.reviewStatus,
      'tasks.updated': updatedTasks.length,
    })

    return NextResponse.json(
      createApiSuccessResponse(
        {
          prStatus,
          updatedTasks: updatedTasks.map((result) => result[0]),
          autoUpdatedCount: updatedTasks.filter(([task]) => task.status === 'completed').length,
        },
        'PR status updated successfully'
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

    observability.metrics.errorRate(1, 'pr_integration_api')

    return NextResponse.json(
      createApiErrorResponse('Failed to update PR status', 500, 'UPDATE_PR_STATUS_ERROR'),
      { status: 500 }
    )
  } finally {
    span.end()
  }
}

/**
 * GET /api/tasks/pr-integration - Get PR integration data
 */
export async function GET(request: NextRequest) {
  const tracer = trace.getTracer('tasks-api')
  const span = tracer.startSpan('tasks.prIntegration.get')

  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const userId = searchParams.get('userId')

    let query = db.select().from(tasks)

    if (taskId) {
      query = query.where(eq(tasks.id, taskId))
    } else if (userId) {
      query = query.where(eq(tasks.userId, userId))
    }

    const tasks = await query

    // Filter tasks that have PR links
    const tasksWithPRs = tasks.filter(
      (task) => task.metadata?.prLinks && task.metadata.prLinks.length > 0
    )

    // Aggregate PR statistics
    const prStats = {
      totalLinkedPRs: 0,
      openPRs: 0,
      mergedPRs: 0,
      pendingReview: 0,
      readyToMerge: 0,
    }

    tasksWithPRs.forEach((task) => {
      const prStatuses = task.metadata.prStatuses || {}
      Object.values(prStatuses).forEach((prStatus: any) => {
        prStats.totalLinkedPRs++
        if (prStatus.status === 'open') prStats.openPRs++
        if (prStatus.status === 'merged') prStats.mergedPRs++
        if (prStatus.reviewStatus === 'pending') prStats.pendingReview++
        if (prStatus.reviewStatus === 'approved' && prStatus.mergeable) {
          prStats.readyToMerge++
        }
      })
    })

    span.setAttributes({
      'tasks.with_prs': tasksWithPRs.length,
      'pr.total_linked': prStats.totalLinkedPRs,
      'pr.open': prStats.openPRs,
      'pr.merged': prStats.mergedPRs,
    })

    return NextResponse.json(
      createApiSuccessResponse(
        {
          tasks: tasksWithPRs,
          statistics: prStats,
        },
        'PR integration data retrieved successfully'
      )
    )
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({ code: SpanStatusCode.ERROR })

    return NextResponse.json(
      createApiErrorResponse('Failed to fetch PR integration data', 500, 'FETCH_PR_DATA_ERROR'),
      { status: 500 }
    )
  } finally {
    span.end()
  }
}
