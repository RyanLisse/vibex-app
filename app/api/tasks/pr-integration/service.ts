/**
 * PR Integration API Service
 *
 * Implements PR integration operations with base infrastructure patterns
 * for consistent error handling, tracing, and observability.
 */

import { SpanStatusCode, trace } from "@opentelemetry/api";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/config";
import { tasks } from "@/db/schema";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/api/base/errors";
import { observability } from "@/lib/observability";

export interface ServiceContext {
	userId?: string;
	requestId?: string;
}

export class ExternalServiceError extends Error {
	constructor(service: string, error: Error) {
		super(`External service error (${service}): ${error.message}`);
		this.name = "ExternalServiceError";
	}
}

import type {
	PRStatusSchema,
	PRStatusUpdateSchema,
	TaskPRLinkSchema,
} from "@/src/schemas/enhanced-task-schemas";

// Query schemas
export const GetPRIntegrationQuerySchema = z.object({
	taskId: z.string().optional(),
	userId: z.string().optional(),
});

export const MergePRSchema = z.object({
	prUrl: z.string().url(),
	userId: z.string(),
	mergeMethod: z.enum(["merge", "squash", "rebase"]).default("squash"),
	deleteSourceBranch: z.boolean().default(true),
});

export type GetPRIntegrationQuery = z.infer<typeof GetPRIntegrationQuerySchema>;
export type TaskPRLinkDTO = z.infer<typeof TaskPRLinkSchema>;
export type PRStatusDTO = z.infer<typeof PRStatusUpdateSchema>;
export type MergePRDTO = z.infer<typeof MergePRSchema>;

// Mock GitHub API client
class GitHubAPIClient {
	static async getPRStatus(repository: string, prNumber: string) {
		// In real implementation, would make actual GitHub API calls
		// For now, return mock data
		await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay

		return {
			prId: `pr-${prNumber}`,
			title: "Feature: Add new task management functionality",
			status: "open" as const,
			reviewStatus: "pending" as const,
			mergeable: true,
			repository,
			branch: "feature/task-management-enhancements",
			author: "dev-user",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			reviewers: [
				{
					login: "senior-dev",
					status: "approved" as const,
				},
				{
					login: "tech-lead",
					status: "requested" as const,
				},
			],
			checks: [
				{
					name: "CI/CD Pipeline",
					status: "success" as const,
					conclusion: "success",
					url: `https://github.com/${repository}/actions`,
				},
				{
					name: "Code Quality",
					status: "success" as const,
					conclusion: "success",
					url: `https://sonarcloud.io/project/${repository}`,
				},
				{
					name: "Security Scan",
					status: "pending" as const,
					conclusion: null,
					url: `https://github.com/${repository}/security`,
				},
			],
		};
	}

	static async mergePR(
		_repository: string,
		_prNumber: string,
		options: {
			mergeMethod: string;
			deleteSourceBranch: boolean;
		}
	) {
		// Mock merge operation
		await new Promise((resolve) => setTimeout(resolve, 2000));
		return {
			merged: true,
			mergeCommitSha: "abc123def456789",
			mergedAt: new Date().toISOString(),
			mergeMethod: options.mergeMethod,
			sourceBranchDeleted: options.deleteSourceBranch,
		};
	}
}

export class PRIntegrationAPIService {
	protected static serviceName = "pr-integration";

	/**
	 * Link task to PR
	 */
	async linkTaskToPR(
		linkData: TaskPRLinkDTO,
		context: ServiceContext
	): Promise<{
		task: any;
		prStatus: any;
		link: any;
	}> {
		// Execute with manual tracing
		const tracer = trace.getTracer("pr-integration-api");
		const span = tracer.startSpan("linkTaskToPR");

		try {
			// Get the task
			const [task] = await db.select().from(tasks).where(eq(tasks.id, linkData.taskId)).limit(1);

			if (!task) {
				throw new NotFoundError("Task", linkData.taskId);
			}

			// Fetch PR status from GitHub
			let prStatus;
			try {
				prStatus = await GitHubAPIClient.getPRStatus(
					linkData.repository,
					linkData.prNumber.toString()
				);
			} catch (error) {
				throw new ExternalServiceError("GitHub API", error as Error);
			}

			// Create PR link data
			const prLink = {
				prUrl: linkData.prUrl,
				prNumber: linkData.prNumber,
				repository: linkData.repository,
				status: prStatus.status,
				title: prStatus.title,
				author: prStatus.author,
				createdAt: prStatus.createdAt,
				updatedAt: prStatus.updatedAt,
				linkedAt: new Date().toISOString(),
				linkedBy: "system", // userId not available in linkData
			};

			// Update task metadata with PR link
			const currentMetadata = (task.metadata as any) || {};
			const existingPRLinks = currentMetadata.prLinks || [];

			// Check if PR is already linked
			const existingLink = existingPRLinks.find((link) => link.prNumber === linkData.prNumber);
			if (existingLink) {
				throw new ConflictError("PR is already linked to this task");
			}

			const updatedMetadata = {
				...currentMetadata,
				prLinks: [...existingPRLinks, prLink],
				prStatuses: {
					...currentMetadata.prStatuses,
					[`pr-${linkData.prNumber}`]: prStatus,
				},
			};

			const [updatedTask] = await db
				.update(tasks)
				.set({
					metadata: updatedMetadata,
					updatedAt: new Date(),
				})
				.where(eq(tasks.id, linkData.taskId))
				.returning();

			// Log operation
			await observability.events.collector.collectEvent(
				"user_action",
				"info",
				`PR linked to task: ${task.title}`,
				{
					taskId: linkData.taskId,
					prNumber: linkData.prNumber.toString(),
					repository: linkData.repository,
					prUrl: linkData.prUrl,
					userId: context.userId,
				},
				"api",
				["pr", "link"]
			);

			span.setAttributes({
				"task.id": linkData.taskId,
				"pr.number": linkData.prNumber,
				"pr.repository": linkData.repository,
				"pr.url": linkData.prUrl,
			});

			span.setStatus({ code: SpanStatusCode.OK });

			return {
				task: updatedTask,
				prStatus,
				link: prLink,
			};
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	}

	/**
	 * Update PR status
	 */
	async updatePRStatus(
		prStatusData: PRStatusDTO,
		context: ServiceContext
	): Promise<{
		prStatus: any;
		updatedTasks: any[];
		autoUpdatedCount: number;
	}> {
		// Execute with manual tracing
		const tracer = trace.getTracer("pr-integration-api");
		const span = tracer.startSpan("updatePRStatus");

		try {
			// Get all tasks with this PR linked
			const allTasks = await db.select().from(tasks);

			const tasksWithPR = allTasks.filter((task) => {
				const prLinks = (task.metadata as any)?.prLinks || [];
				return prLinks.some((link) => link.prUrl === prStatusData.prUrl);
			});

			if (tasksWithPR.length === 0) {
				throw new NotFoundError("No tasks found with this PR");
			}

			// Fetch updated PR status from GitHub
			const taskWithPR = tasksWithPR[0];
			const prLink = ((taskWithPR as any).metadata as any).prLinks.find(
				(link: any) => link.prUrl === prStatusData.prUrl
			);

			let prStatus;
			try {
				prStatus = await GitHubAPIClient.getPRStatus(prLink.repository, prLink.prNumber.toString());
			} catch (error) {
				throw new ExternalServiceError("GitHub API", error as Error);
			}

			// Update all linked tasks
			const updatePromises = tasksWithPR.map(async (task) => {
				const currentMetadata = (task.metadata as any) || {};
				const updatedMetadata = {
					...currentMetadata,
					prStatuses: {
						...currentMetadata.prStatuses,
						[`pr-${prLink.prNumber}`]: prStatus,
					},
				};

				// Auto-update task status if PR is merged and auto-update is enabled
				const taskPrLink = currentMetadata.prLinks.find(
					(link) => link.prUrl === prStatusData.prUrl
				);
				const shouldAutoUpdate = taskPrLink && prStatus.status === "merged";

				const updates: any = {
					metadata: updatedMetadata,
					updatedAt: new Date(),
				};

				if (shouldAutoUpdate && task.status !== "completed") {
					updates.status = "completed";
					updates.completedAt = new Date();
				}

				const [result] = await db
					.update(tasks)
					.set(updates)
					.where(eq(tasks.id, task.id))
					.returning();
				return result;
			});

			const updatedTasks = await Promise.all(updatePromises);
			const autoUpdatedCount = updatedTasks.filter((task) => task.status === "completed").length;

			// Log operation
			await observability.events.collector.collectEvent(
				"user_action",
				"info",
				`PR status updated: ${prStatus.title}`,
				{
					prUrl: prStatusData.prUrl,
					prNumber: prLink.prNumber,
					newStatus: prStatus.status,
					reviewStatus: prStatus.reviewStatus,
					tasksUpdated: updatedTasks.length,
					autoUpdatedTasks: autoUpdatedCount,
					userId: context.userId,
				},
				"api",
				["pr", "status"]
			);

			span.setAttributes({
				"pr.url": prStatusData.prUrl,
				"pr.number": prLink.prNumber,
				"pr.status": prStatus.status,
				"tasks.updated": updatedTasks.length,
			});

			span.setStatus({ code: SpanStatusCode.OK });

			return {
				prStatus,
				updatedTasks,
				autoUpdatedCount,
			};
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	}

	// Helper functions to reduce getPRIntegrationData complexity
	private buildQueryConditions(params: GetPRIntegrationQuery) {
		const conditions = [];
		if (params.taskId) {
			conditions.push(eq(tasks.id, params.taskId));
		} else if (params.userId) {
			conditions.push(eq(tasks.userId, params.userId));
		}
		return conditions;
	}

	private async executeTaskQuery(conditions: any[]) {
		const query = db.select().from(tasks);
		if (conditions.length > 0) {
			query.where(conditions[0]);
		}
		return await query;
	}

	private filterTasksWithPRs(allTasks: any[]) {
		return allTasks.filter(
			(task) => (task.metadata as any)?.prLinks && (task.metadata as any).prLinks.length > 0
		);
	}

	private initializePRStats() {
		return {
			totalLinkedPRs: 0,
			openPRs: 0,
			mergedPRs: 0,
			pendingReview: 0,
			readyToMerge: 0,
		};
	}

	private updatePRStatsForStatus(prStats: any, prStatus: any) {
		prStats.totalLinkedPRs++;
		if (prStatus.status === "open") {
			prStats.openPRs++;
		}
		if (prStatus.status === "merged") {
			prStats.mergedPRs++;
		}
		if (prStatus.reviewStatus === "pending") {
			prStats.pendingReview++;
		}
		if (prStatus.reviewStatus === "approved" && prStatus.mergeable) {
			prStats.readyToMerge++;
		}
	}

	private aggregatePRStatistics(tasksWithPRs: any[]) {
		const prStats = this.initializePRStats();

		tasksWithPRs.forEach((task) => {
			const prStatuses = (task.metadata as any).prStatuses || {};
			Object.values(prStatuses).forEach((prStatus: any) => {
				this.updatePRStatsForStatus(prStats, prStatus);
			});
		});

		return prStats;
	}

	/**
	 * Get PR integration data
	 */
	async getPRIntegrationData(
		params: GetPRIntegrationQuery,
		context: ServiceContext
	): Promise<{
		tasks: any[];
		statistics: any;
	}> {
		// Execute with manual tracing
		const tracer = trace.getTracer("pr-integration-api");
		const span = tracer.startSpan("getPRIntegrationData");

		try {
			// Build and execute query
			const conditions = this.buildQueryConditions(params);
			const allTasks = await this.executeTaskQuery(conditions);

			// Filter and process tasks
			const tasksWithPRs = this.filterTasksWithPRs(allTasks);
			const prStats = this.aggregatePRStatistics(tasksWithPRs);

			// Set span attributes and return
			span.setAttributes({
				"tasks.with_prs": tasksWithPRs.length,
				"pr.total_linked": prStats.totalLinkedPRs,
			});

			span.setStatus({ code: SpanStatusCode.OK });

			return {
				tasks: tasksWithPRs,
				statistics: prStats,
			};
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	}

	// Helper functions to reduce mergePR complexity
	private async findLinkedTasks(prUrl: string) {
		const allTasks = await db.select().from(tasks);
		return allTasks.filter((task) => {
			const prLinks = (task.metadata as any)?.prLinks || [];
			return prLinks.some((link) => link.prUrl === prUrl);
		});
	}

	private extractPRDetails(linkedTasks: any[], prUrl: string) {
		if (linkedTasks.length === 0) {
			throw new NotFoundError("No tasks found linked to this PR");
		}

		const firstTask = linkedTasks[0];
		const prLink = (firstTask.metadata as any).prLinks.find((link: any) => link.prUrl === prUrl);
		const prStatus = (firstTask.metadata as any).prStatuses?.[`pr-${prLink?.prNumber}`];

		if (!prStatus) {
			throw new NotFoundError("PR status not found");
		}

		return { prLink, prStatus };
	}

	private validateMergeEligibility(prStatus: any) {
		const canMerge =
			prStatus.status === "open" &&
			prStatus.reviewStatus === "approved" &&
			prStatus.mergeable &&
			prStatus.checks.every((check: any) => check.status === "success");

		if (!canMerge) {
			const reasons = this.getMergeBlockingReasons(prStatus);
			throw new ValidationError(`Cannot merge PR: ${reasons.join(", ")}`);
		}
	}

	private getMergeBlockingReasons(prStatus: any): string[] {
		const reasons = [];
		if (prStatus.status !== "open") {
			reasons.push(`PR is ${prStatus.status}`);
		}
		if (prStatus.reviewStatus !== "approved") {
			reasons.push("Review approval required");
		}
		if (!prStatus.mergeable) {
			reasons.push("Merge conflicts exist");
		}
		if (prStatus.checks.some((check: any) => check.status !== "success")) {
			reasons.push("Checks must pass");
		}
		return reasons;
	}

	private async performMergeOperation(prLink: any, mergeData: MergePRDTO) {
		try {
			return await GitHubAPIClient.mergePR(prLink.repository, prLink.prNumber.toString(), {
				mergeMethod: mergeData.mergeMethod,
				deleteSourceBranch: mergeData.deleteSourceBranch,
			});
		} catch (error) {
			throw new ExternalServiceError("GitHub API", error as Error);
		}
	}

	private createUpdatedPRStatus(prStatus: any, mergeResult: any) {
		return {
			...prStatus,
			status: "merged" as const,
			mergedAt: mergeResult.mergedAt,
			mergeCommitSha: mergeResult.mergeCommitSha,
		};
	}

	private async updateLinkedTasks(linkedTasks: any[], mergeData: MergePRDTO, updatedPRStatus: any) {
		const updatePromises = linkedTasks.map(async (task) => {
			const currentMetadata = (task.metadata as any) || {};
			const prLink = (currentMetadata as any).prLinks?.find(
				(link: any) => link.prUrl === mergeData.prUrl
			);

			const updatedMetadata = {
				...currentMetadata,
				prStatuses: {
					...currentMetadata.prStatuses,
					[`pr-${prLink?.prNumber}`]: updatedPRStatus,
				},
			};

			// Auto-complete task if auto-update is enabled and task isn't already completed
			// Note: autoUpdateStatus property doesn't exist in schema, so defaulting to true for merged PRs
			const shouldAutoComplete = task.status !== "completed";

			const updates: any = {
				metadata: updatedMetadata,
				updatedAt: new Date(),
			};

			if (shouldAutoComplete) {
				updates.status = "completed";
				updates.completedAt = new Date();
			}

			const [result] = await db.update(tasks).set(updates).where(eq(tasks.id, task.id)).returning();
			return result;
		});

		return await Promise.all(updatePromises);
	}

	private async logMergeOperation(
		mergeData: MergePRDTO,
		prStatus: any,
		prLink: any,
		mergeResult: any,
		linkedTasks: any[],
		autoCompletedTasks: any[]
	) {
		await observability.events.collector.collectEvent(
			"user_action",
			"info",
			`PR merged successfully: ${prStatus.title}`,
			{
				prUrl: mergeData.prUrl,
				repository: prLink.repository,
				mergeMethod: mergeData.mergeMethod,
				mergeCommitSha: mergeResult.mergeCommitSha,
				linkedTasksCount: linkedTasks.length,
				autoCompletedTasksCount: autoCompletedTasks.length,
				mergedBy: mergeData.userId,
				sourceBranchDeleted: mergeData.deleteSourceBranch,
			},
			"api",
			["pr", "merge"]
		);
	}

	/**
	 * Merge PR and update linked tasks
	 */
	async mergePR(
		mergeData: MergePRDTO,
		context: ServiceContext
	): Promise<{
		mergeResult: any;
		prStatus: any;
		linkedTasks: any[];
		autoCompletedTasks: any[];
		summary: any;
	}> {
		// Execute with manual tracing
		const tracer = trace.getTracer("pr-integration-api");
		const span = tracer.startSpan("mergePR");

		try {
			// Find linked tasks and extract PR details
			const linkedTasks = await this.findLinkedTasks(mergeData.prUrl);
			const { prLink, prStatus } = this.extractPRDetails(linkedTasks, mergeData.prUrl);

			// Validate merge eligibility
			this.validateMergeEligibility(prStatus);

			// Perform merge operation
			const mergeResult = await this.performMergeOperation(prLink, mergeData);

			// Update PR status and linked tasks
			const updatedPRStatus = this.createUpdatedPRStatus(prStatus, mergeResult);
			const updatedTasks = await this.updateLinkedTasks(linkedTasks, mergeData, updatedPRStatus);
			const autoCompletedTasks = updatedTasks.filter((task) => task.status === "completed");

			// Log operation
			await this.logMergeOperation(
				mergeData,
				prStatus,
				prLink,
				mergeResult,
				linkedTasks,
				autoCompletedTasks
			);

			// Set span attributes
			span.setAttributes({
				"pr.id": mergeData.prUrl,
				"pr.merge_method": mergeData.mergeMethod,
				"tasks.linked_count": linkedTasks.length,
			});

			span.setStatus({ code: SpanStatusCode.OK });

			return {
				mergeResult,
				prStatus: updatedPRStatus,
				linkedTasks: updatedTasks,
				autoCompletedTasks,
				summary: {
					totalLinkedTasks: linkedTasks.length,
					autoCompletedTasks: autoCompletedTasks.length,
					mergeCommitSha: mergeResult.mergeCommitSha,
				},
			};
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });
			throw error;
		} finally {
			span.end();
		}
	}
}

// Export singleton instance
export const prIntegrationService = new PRIntegrationAPIService();
