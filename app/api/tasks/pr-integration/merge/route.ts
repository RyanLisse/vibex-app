/**
 * PR Merge API Route
 *
 * Handles PR merge operations and automatic task status updates.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/config'
import { tasks } from '@/db/schema'
import { observability } from '@/lib/observability'
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from '@/src/schemas/api-routes'

const MergePRSchema = z.object({
  prId: z.string(),
  userId: z.string(),
  mergeMethod: z.enum(['merge', 'squash', 'rebase']).default('squash'),
  deleteSourceBranch: z.boolean().default(true),
})

// Mock GitHub API client for merge operations
class GitHubMergeClient {
  static async mergePR(repository: string, prNumber: string, options: {
    mergeMethod: string
    deleteSourceBranch: boolean
  }) {
    // Simulate merge operation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock successful merge response
    return {
      merged: true,
      mergeCommitSha: 'abc123def456789',
      mergedAt: new Date().toISOString(),
      mergeMethod: options.mergeMethod,
      sourceBranchDeleted: options.deleteSourceBranch,
    }
  }
}

/**
 * POST /api/tasks/pr-integration/merge - Merge PR and update linked tasks
 */
export async function POST(request: NextRequest) {
  const tracer = trace.getTracer('tasks-api')
  const span = tracer.startSpan('tasks.prIntegration.merge')

  try {
    const body = await request.json()
    const validatedData = MergePRSchema.parse(body)

    // Find all tasks linked to this PR
    const allTasks = await db.select().from(tasks)
    const linkedTasks = allTasks.filter(task => {
      const prLinks = task.metadata?.prLinks || []
      return prLinks.some(link => link.prId === validatedData.prId)
    })

    if (linkedTasks.length === 0) {
      return NextResponse.json(
        createApiErrorResponse('No tasks found linked to this PR', 404, 'PR_NOT_LINKED'),
        { status: 404 }
      )
    }

    // Get PR details from the first linked task
    const firstTask = linkedTasks[0]
    const prLink = firstTask.metadata.prLinks.find(link => link.prId === validatedData.prId)
    const prStatus = firstTask.metadata.prStatuses?.[validatedData.prId]

    if (!prStatus) {
      return NextResponse.json(
        createApiErrorResponse('PR status not found', 404, 'PR_STATUS_NOT_FOUND'),
        { status: 404 }
      )
    }

    // Check if PR can be merged
    const canMerge = prStatus.status === 'open' && 
                     prStatus.reviewStatus === 'approved' && 
                     prStatus.mergeable &&
                     prStatus.checks.every(check => check.status === 'success')

    if (!canMerge) {
      const reasons = []
      if (prStatus.status !== 'open') reasons.push(`PR is ${prStatus.status}`)
      if (prStatus.reviewStatus !== 'approved') reasons.push('Review approval required')
      if (!prStatus.mergeable) reasons.push('Merge conflicts exist')
      if (prStatus.checks.some(check => check.status !== 'success')) {
        reasons.push('Checks must pass')
      }

      return NextResponse.json(
        createApiErrorResponse(
          `Cannot merge PR: ${reasons.join(', ')}`,
          400,
          'MERGE_BLOCKED'
        ),
        { status: 400 }
      )
    }

    // Perform merge operation
    const mergeResult = await GitHubMergeClient.mergePR(
      prLink.repository,
      validatedData.prId.replace('pr-', ''),
      {
        mergeMethod: validatedData.mergeMethod,
        deleteSourceBranch: validatedData.deleteSourceBranch,
      }
    )

    // Update PR status to merged
    const updatedPRStatus = {
      ...prStatus,
      status: 'merged' as const,
      mergedAt: mergeResult.mergedAt,
      mergeCommitSha: mergeResult.mergeCommitSha,
    }

    // Update all linked tasks
    const updatePromises = linkedTasks.map(async (task) => {
      const currentMetadata = task.metadata || {}
      const prLink = currentMetadata.prLinks.find(link => link.prId === validatedData.prId)
      
      const updatedMetadata = {
        ...currentMetadata,
        prStatuses: {
          ...currentMetadata.prStatuses,
          [validatedData.prId]: updatedPRStatus,
        },
      }

      // Auto-complete task if auto-update is enabled and task isn't already completed
      const shouldAutoComplete = prLink?.autoUpdateStatus && task.status !== 'completed'
      
      const updates: any = {
        metadata: updatedMetadata,
        updatedAt: new Date(),
      }

      if (shouldAutoComplete) {
        updates.status = 'completed'
        updates.completedAt = new Date()
      }

      return db
        .update(tasks)
        .set(updates)
        .where(eq(tasks.id, task.id))
        .returning()
    })

    const updatedTasks = await Promise.all(updatePromises)
    const autoCompletedTasks = updatedTasks.filter(([task]) => task.status === 'completed')

    // Record comprehensive event
    await observability.events.collector.collectEvent(
      'pr_merged',
      'info',
      `PR merged successfully: ${prStatus.title}`,
      {
        prId: validatedData.prId,
        repository: prLink.repository,
        mergeMethod: validatedData.mergeMethod,
        mergeCommitSha: mergeResult.mergeCommitSha,
        linkedTasksCount: linkedTasks.length,
        autoCompletedTasksCount: autoCompletedTasks.length,
        mergedBy: validatedData.userId,
        sourceBranchDeleted: validatedData.deleteSourceBranch,
      },
      'api',
      ['tasks', 'pr-integration', 'merge']
    )

    span.setAttributes({
      'pr.id': validatedData.prId,
      'pr.merge_method': validatedData.mergeMethod,
      'pr.merge_commit_sha': mergeResult.mergeCommitSha,
      'tasks.linked_count': linkedTasks.length,
      'tasks.auto_completed_count': autoCompletedTasks.length,
    })

    return NextResponse.json(
      createApiSuccessResponse(
        {
          mergeResult,
          prStatus: updatedPRStatus,
          linkedTasks: updatedTasks.map(result => result[0]),
          autoCompletedTasks: autoCompletedTasks.map(result => result[0]),
          summary: {
            totalLinkedTasks: linkedTasks.length,
            autoCompletedTasks: autoCompletedTasks.length,
            mergeCommitSha: mergeResult.mergeCommitSha,
          },
        },
        'PR merged successfully'
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

    observability.metrics.errorRate(1, 'pr_merge_api')

    return NextResponse.json(
      createApiErrorResponse('Failed to merge PR', 500, 'MERGE_PR_ERROR'),
      { status: 500 }
    )
  } finally {
    span.end()
  }
}