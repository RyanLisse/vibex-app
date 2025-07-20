// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PR Status Integration API Route - Refactored Version
 *
 * Enhanced GitHub PR integration using base utilities for consistency and reduced duplication
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db/config'
import { tasks } from '@/db/schema'
import { NotFoundError, ValidationError } from '@/lib/api/base-error'
import { BaseAPIService } from '@/lib/api/base-service'
import { BaseAPIHandler } from '@/lib/api/base-handler'
import { ResponseBuilder } from '@/lib/api/response-builder'
import { PRStatusSchema, TaskPRLinkSchema } from '@/src/schemas/enhanced-task-schemas'

// Request validation schemas
const GetPRIntegrationQuerySchema = z.object({
  taskId: z.string().optional(),
  userId: z.string().optional(),
})

// Mock GitHub API client (unchanged from original)
class GitHubAPIClient {
  static async getPRStatus(repository: string, prNumber: string) {
    // In real implementation, would make actual GitHub API calls
    await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate API delay

    return {
      prId: `pr-${prNumber}`,
      title: 'Feature: Add new task management functionality',
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

  static async mergePR(_repository: string, _prNumber: string) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return {
      merged: true,
      mergeCommitSha: 'abc123def456',
      mergedAt: new Date().toISOString(),
    }
  }

  static async requestReview(_repository: string, _prNumber: string, reviewers: string[]) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return {
      requested: reviewers,
      requestedAt: new Date().toISOString(),
    }
  }
}

// Service class extending BaseAPIService
class PRIntegrationService extends BaseAPIService {
  protected static serviceName = 'pr-integration-api'

  /**
   * Link task to PR
   */
  static async linkTaskToPR(linkData: z.infer<typeof TaskPRLinkSchema>) {
    return this.withTracing(
      'linkTaskToPR',
      async () => {
        return this.withTransaction(async (tx) => {
          // Get the task
          const [task] = await tx.select().from(tasks).where(eq(tasks.id, linkData.taskId))

          if (!task) {
            throw new NotFoundError('Task', linkData.taskId)
          }

          // Fetch PR status from GitHub
          const prStatus = await GitHubAPIClient.getPRStatus(linkData.repository, linkData.prId)

          // Create PR link data
          const prLink = {
            prId: prStatus.prId,
            repository: linkData.repository,
            branch: prStatus.branch,
            autoUpdateStatus: linkData.autoUpdateStatus,
            linkedAt: new Date().toISOString(),
            linkedBy: 'system', // userId not available in linkData
          }

          // Update task metadata with PR link
          const currentMetadata = (task.metadata as any) || {}
          const existingPRLinks = currentMetadata.prLinks || []

          // Check if PR is already linked
          const existingLink = existingPRLinks.find((link) => link.prId === prStatus.prId)
          if (existingLink) {
            throw new ValidationError('PR is already linked to this task')
          }

          const updatedMetadata = {
            ...(currentMetadata as any),
            prLinks: [...existingPRLinks, prLink],
            prStatuses: {
              ...(currentMetadata.prStatuses || {}),
              [prStatus.prId]: prStatus,
            },
          }

          const [updatedTask] = await tx
            .update(tasks)
            .set({
              metadata: updatedMetadata,
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, linkData.taskId))
            .returning()

          // Log operation
          await this.logOperation('link_pr', 'task', linkData.taskId, 'system', {
            prId: prStatus.prId,
            repository: linkData.repository,
            prNumber: linkData.prId,
            autoUpdate: linkData.autoUpdateStatus,
          })

          return {
            task: updatedTask,
            prStatus,
            link: prLink,
          }
        })
      },
      { 'task.id': linkData.taskId }
    )
  }

  /**
   * Update PR status
   */
  static async updatePRStatus(statusData: z.infer<typeof PRStatusSchema>) {
    return this.withTracing('updatePRStatus', async () => {
      return this.withTransaction(async (tx) => {
        // Get all tasks with this PR linked
        const allTasks = await tx.select().from(tasks)
        const tasksWithPR = allTasks.filter((task) => {
          const prLinks = (task.metadata as any)?.prLinks || []
          return prLinks.some((link) => link.prId === statusData.prId)
        })

        if (tasksWithPR.length === 0) {
          throw new NotFoundError('PR', statusData.prId)
        }

        // Fetch updated PR status from GitHub
        const taskWithPR = tasksWithPR[0]
        const prLink = (taskWithPR.metadata as any).prLinks.find(
          (link: any) => link.prId === statusData.prId
        )
        const prStatus = await GitHubAPIClient.getPRStatus(
          prLink.repository,
          statusData.prId.replace('pr-', '')
        )

        // Update all linked tasks
        const updatePromises = tasksWithPR.map(async (task) => {
          const currentMetadata = (task.metadata as any) || {}
          const updatedMetadata = {
            ...(currentMetadata as any),
            prStatuses: {
              ...(currentMetadata.prStatuses || {}),
              [statusData.prId]: prStatus,
            },
          }

          // Auto-update task status if PR is merged and auto-update is enabled
          const prLink = currentMetadata.prLinks?.find((link: any) => link.prId === statusData.prId)
          const shouldAutoUpdate = prLink?.autoUpdateStatus && (prStatus as any).status === 'merged'

          const updates: any = {
            metadata: updatedMetadata,
            updatedAt: new Date(),
          }

          if (shouldAutoUpdate && task.status !== 'completed') {
            updates.status = 'completed'
            // Note: completedAt field not available in current schema
          }

          return tx.update(tasks).set(updates).where(eq(tasks.id, task.id)).returning()
        })

        const updatedTasks = await Promise.all(updatePromises)

        // Log operation
        await this.logOperation('update_pr_status', 'pr', statusData.prId, null, {
          newStatus: prStatus.status,
          reviewStatus: prStatus.reviewStatus,
          tasksUpdated: updatedTasks.length,
          autoUpdatedTasks: updatedTasks.filter(([task]) => task.status === 'completed').length,
        })

        return {
          prStatus,
          updatedTasks: updatedTasks.map((result) => result[0]),
          autoUpdatedCount: updatedTasks.filter(([task]) => task.status === 'completed').length,
        }
      })
    })
  }

  /**
   * Get PR integration data
   */
  static async getPRIntegrationData(params: z.infer<typeof GetPRIntegrationQuerySchema>) {
    return this.withTracing('getPRIntegrationData', async () => {
      const conditions = []
      if (params.taskId) {
        conditions.push(eq(tasks.id, params.taskId))
      } else if (params.userId) {
        conditions.push(eq(tasks.userId, params.userId))
      }

      const query = db
        .select()
        .from(tasks)
        .where(conditions.length > 0 ? conditions[0] : undefined)

      const taskResults = await query

      // Filter tasks that have PR links
      const tasksWithPRs = taskResults.filter(
        (task) => (task.metadata as any)?.prLinks && (task.metadata as any).prLinks.length > 0
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
        const prStatuses = (task.metadata as any).prStatuses || {}
        Object.values(prStatuses).forEach((prStatus: any) => {
          prStats.totalLinkedPRs++
          if (prStatus.status === 'open') {
            prStats.openPRs++
          }
          if (prStatus.status === 'merged') {
            prStats.mergedPRs++
          }
          if (prStatus.reviewStatus === 'pending') {
            prStats.pendingReview++
          }
          if (prStatus.reviewStatus === 'approved' && prStatus.mergeable) {
            prStats.readyToMerge++
          }
        })
      })

      // Log operation
      await this.logOperation('get_pr_integration_data', 'pr', null, params.userId, {
        tasksWithPRs: tasksWithPRs.length,
        totalLinkedPRs: prStats.totalLinkedPRs,
        filters: params,
      })

      return {
        tasks: tasksWithPRs,
        statistics: prStats,
      }
    })
  }
}

/**
 * POST /api/tasks/pr-integration/link - Link task to PR
 */
export const POST = BaseAPIHandler.createHandler({ schema: TaskPRLinkSchema }, async (data) => {
  const result = await PRIntegrationService.linkTaskToPR(data)
  return ResponseBuilder.created(result, 'PR linked successfully')
})

/**
 * PUT /api/tasks/pr-integration/status - Update PR status
 */
export const PUT = BaseAPIHandler.createHandler({ schema: PRStatusSchema }, async (data) => {
  const result = await PRIntegrationService.updatePRStatus(data)
  return ResponseBuilder.success(result, 'PR status updated successfully')
})

/**
 * GET /api/tasks/pr-integration - Get PR integration data
 */
export const GET = BaseAPIHandler.createHandler(
  { schema: GetPRIntegrationQuerySchema },
  async (params) => {
    const result = await PRIntegrationService.getPRIntegrationData(params)
    return ResponseBuilder.success(result, 'PR integration data retrieved successfully')
  }
)
