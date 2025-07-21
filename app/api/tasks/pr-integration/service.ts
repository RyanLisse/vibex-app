/**
 * PR Integration API Service
 *
 * Implements PR integration operations with base infrastructure patterns
 * for consistent error handling, tracing, and observability.
 */

import { ValidationError } from "@/lib/api/base";
import { TaskPRLinkSchema } from "@/src/schemas/enhanced-task-schemas";

// Query schemas
export const GetPRIntegrationQuerySchema = z.object({
	taskId: z.string().optional(),
	userId: z.string().optional(),
});

export const MergePRSchema = z.object({
	prId: z.string(),
	userId: z.string(),
	mergeMethod: z.enum(["merge", "squash", "rebase"]).default("squash"),
	deleteSourceBranch: z.boolean().default(true),
});

export type GetPRIntegrationQuery = z.infer<typeof GetPRIntegrationQuerySchema>;
export type TaskPRLinkDTO = z.infer<typeof TaskPRLinkSchema>;
export type PRStatusDTO = z.infer<typeof PRStatusSchema>;
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
		},
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

export class PRIntegrationAPIService extends BaseAPIService {
	protected serviceName = "pr-integration";
	private queryBuilder = new QueryBuilder(tasks);

	/**
	 * Link task to PR
	 */
	async linkTaskToPR(
		linkData: TaskPRLinkDTO,
		context: ServiceContext,
	): Promise<{
		task: any;
		prStatus: any;
		link: any;
	}> {
		return this.executeWithTracing("linkTaskToPR", context, async (span) => {
			// Get the task
			const task = await this.executeDatabase("getTask", async () => {
				const result = await db
					.select()
					.from(tasks)
					.where(eq(tasks.id, linkData.taskId))
					.limit(1);

				return result[0];
			});

			if (!task) {
				throw new NotFoundError("Task", linkData.taskId);
			}

			// Fetch PR status from GitHub
			let prStatus;
			try {
				prStatus = await GitHubAPIClient.getPRStatus(
					linkData.repository,
					linkData.prNumber,
				);
			} catch (error) {
				throw new ExternalServiceError("GitHub API", error as Error);
			}

			// Create PR link data
			const prLink = {
				prId: prStatus.prId,
				repository: linkData.repository,
				branch: prStatus.branch,
				autoUpdateStatus: linkData.autoUpdateStatus,
				linkedAt: new Date().toISOString(),
				linkedBy: linkData.userId,
			};

			// Update task metadata with PR link
			const currentMetadata = task.metadata || {};
			const existingPRLinks = currentMetadata.prLinks || [];

			// Check if PR is already linked
			const existingLink = existingPRLinks.find(
				(link) => link.prId === prStatus.prId,
			);
			if (existingLink) {
				throw new ConflictError("PR is already linked to this task");
			}

			const updatedMetadata = {
				...currentMetadata,
				prLinks: [...existingPRLinks, prLink],
				prStatuses: {
					...currentMetadata.prStatuses,
					[prStatus.prId]: prStatus,
				},
			};

			const updatedTask = await this.executeDatabase("updateTask", async () => {
				const result = await db
					.update(tasks)
					.set({
						metadata: updatedMetadata,
						updatedAt: new Date(),
					})
					.where(eq(tasks.id, linkData.taskId))
					.returning();

				return result[0];
			});

			span.setAttributes({
				"task.id": linkData.taskId,
				"pr.id": prStatus.prId,
				"pr.repository": linkData.repository,
				"pr.number": linkData.prNumber,
				"pr.auto_update": linkData.autoUpdateStatus,
			});

			await this.recordEvent(
				"user_action",
				"info",
				`PR linked to task: ${task.title}`,
				{
					taskId: linkData.taskId,
					prId: prStatus.prId,
					repository: linkData.repository,
					prNumber: linkData.prNumber,
					autoUpdate: linkData.autoUpdateStatus,
				},
			);

			return {
				task: updatedTask,
				prStatus,
				link: prLink,
			};
		});
	}

	/**
	 * Update PR status
	 */
	async updatePRStatus(
		prStatusData: PRStatusDTO,
		context: ServiceContext,
	): Promise<{
		prStatus: any;
		updatedTasks: any[];
		autoUpdatedCount: number;
	}> {
		return this.executeWithTracing("updatePRStatus", context, async (span) => {
			// Get all tasks with this PR linked
			const allTasks = await this.executeDatabase("getAllTasks", async () => {
				return db.select().from(tasks);
			});

			const tasksWithPR = allTasks.filter((task) => {
				const prLinks = task.metadata?.prLinks || [];
				return prLinks.some((link) => link.prId === prStatusData.prId);
			});

			if (tasksWithPR.length === 0) {
				throw new NotFoundError("No tasks found with this PR");
			}

			// Fetch updated PR status from GitHub
			const taskWithPR = tasksWithPR[0];
			const prLink = taskWithPR.metadata.prLinks.find(
				(link) => link.prId === prStatusData.prId,
			);

			let prStatus;
			try {
				prStatus = await GitHubAPIClient.getPRStatus(
					prLink.repository,
					prStatusData.prId.replace("pr-", ""),
				);
			} catch (error) {
				throw new ExternalServiceError("GitHub API", error as Error);
			}

			// Update all linked tasks
			const updatePromises = tasksWithPR.map(async (task) => {
				const currentMetadata = task.metadata || {};
				const updatedMetadata = {
					...currentMetadata,
					prStatuses: {
						...currentMetadata.prStatuses,
						[prStatusData.prId]: prStatus,
					},
				};

				// Auto-update task status if PR is merged and auto-update is enabled
				const prLink = currentMetadata.prLinks.find(
					(link) => link.prId === prStatusData.prId,
				);
				const shouldAutoUpdate =
					prLink?.autoUpdateStatus && prStatus.status === "merged";

				const updates: any = {
					metadata: updatedMetadata,
					updatedAt: new Date(),
				};

				if (shouldAutoUpdate && task.status !== "completed") {
					updates.status = "completed";
					updates.completedAt = new Date();
				}

				return this.executeDatabase("updateTask", async () => {
					const result = await db
						.update(tasks)
						.set(updates)
						.where(eq(tasks.id, task.id))
						.returning();

					return result[0];
				});
			});

			const updatedTasks = await Promise.all(updatePromises);
			const autoUpdatedCount = updatedTasks.filter(
				(task) => task.status === "completed",
			).length;

			span.setAttributes({
				"pr.id": prStatusData.prId,
				"pr.status": prStatus.status,
				"pr.review_status": prStatus.reviewStatus,
				"tasks.updated": updatedTasks.length,
				"tasks.auto_updated": autoUpdatedCount,
			});

			await this.recordEvent(
				"pr_status_update",
				"info",
				`PR status updated: ${prStatus.title}`,
				{
					prId: prStatusData.prId,
					newStatus: prStatus.status,
					reviewStatus: prStatus.reviewStatus,
					tasksUpdated: updatedTasks.length,
					autoUpdatedTasks: autoUpdatedCount,
				},
			);

			return {
				prStatus,
				updatedTasks,
				autoUpdatedCount,
			};
		});
	}

	/**
	 * Get PR integration data
	 */
	async getPRIntegrationData(
		params: GetPRIntegrationQuery,
		context: ServiceContext,
	): Promise<{
		tasks: any[];
		statistics: any;
	}> {
		return this.executeWithTracing(
			"getPRIntegrationData",
			context,
			async (span) => {
				// Build query
				const query = this.queryBuilder;

				if (params.taskId) {
					query.where(tasks.id, params.taskId);
				} else if (params.userId) {
					query.where(tasks.userId, params.userId);
				}

				const allTasks = await query.execute();

				// Filter tasks that have PR links
				const tasksWithPRs = allTasks.filter(
					(task) => task.metadata?.prLinks && task.metadata.prLinks.length > 0,
				);

				// Aggregate PR statistics
				const prStats = {
					totalLinkedPRs: 0,
					openPRs: 0,
					mergedPRs: 0,
					pendingReview: 0,
					readyToMerge: 0,
				};

				tasksWithPRs.forEach((task) => {
					const prStatuses = task.metadata.prStatuses || {};
					Object.values(prStatuses).forEach((prStatus: any) => {
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
					});
				});

				span.setAttributes({
					"tasks.with_prs": tasksWithPRs.length,
					"pr.total_linked": prStats.totalLinkedPRs,
					"pr.open": prStats.openPRs,
					"pr.merged": prStats.mergedPRs,
				});

				return {
					tasks: tasksWithPRs,
					statistics: prStats,
				};
			},
		);
	}

	/**
	 * Merge PR and update linked tasks
	 */
	async mergePR(
		mergeData: MergePRDTO,
		context: ServiceContext,
	): Promise<{
		mergeResult: any;
		prStatus: any;
		linkedTasks: any[];
		autoCompletedTasks: any[];
		summary: any;
	}> {
		return this.executeWithTracing("mergePR", context, async (span) => {
			// Find all tasks linked to this PR
			const allTasks = await this.executeDatabase("getAllTasks", async () => {
				return db.select().from(tasks);
			});

			const linkedTasks = allTasks.filter((task) => {
				const prLinks = task.metadata?.prLinks || [];
				return prLinks.some((link) => link.prId === mergeData.prId);
			});

			if (linkedTasks.length === 0) {
				throw new NotFoundError("No tasks found linked to this PR");
			}

			// Get PR details from the first linked task
			const firstTask = linkedTasks[0];
			const prLink = firstTask.metadata.prLinks.find(
				(link) => link.prId === mergeData.prId,
			);
			const prStatus = firstTask.metadata.prStatuses?.[mergeData.prId];

			if (!prStatus) {
				throw new NotFoundError("PR status not found");
			}

			// Check if PR can be merged
			const canMerge =
				prStatus.status === "open" &&
				prStatus.reviewStatus === "approved" &&
				prStatus.mergeable &&
				prStatus.checks.every((check) => check.status === "success");

			if (!canMerge) {
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
				if (prStatus.checks.some((check) => check.status !== "success")) {
					reasons.push("Checks must pass");
				}

				throw new ValidationError(`Cannot merge PR: ${reasons.join(", ")}`);
			}

			// Perform merge operation
			let mergeResult;
			try {
				mergeResult = await GitHubAPIClient.mergePR(
					prLink.repository,
					mergeData.prId.replace("pr-", ""),
					{
						mergeMethod: mergeData.mergeMethod,
						deleteSourceBranch: mergeData.deleteSourceBranch,
					},
				);
			} catch (error) {
				throw new ExternalServiceError("GitHub API", error as Error);
			}

			// Update PR status to merged
			const updatedPRStatus = {
				...prStatus,
				status: "merged" as const,
				mergedAt: mergeResult.mergedAt,
				mergeCommitSha: mergeResult.mergeCommitSha,
			};

			// Update all linked tasks
			const updatePromises = linkedTasks.map(async (task) => {
				const currentMetadata = task.metadata || {};
				const prLink = currentMetadata.prLinks.find(
					(link) => link.prId === mergeData.prId,
				);

				const updatedMetadata = {
					...currentMetadata,
					prStatuses: {
						...currentMetadata.prStatuses,
						[mergeData.prId]: updatedPRStatus,
					},
				};

				// Auto-complete task if auto-update is enabled and task isn't already completed
				const shouldAutoComplete =
					prLink?.autoUpdateStatus && task.status !== "completed";

				const updates: any = {
					metadata: updatedMetadata,
					updatedAt: new Date(),
				};

				if (shouldAutoComplete) {
					updates.status = "completed";
					updates.completedAt = new Date();
				}

				return this.executeDatabase("updateTask", async () => {
					const result = await db
						.update(tasks)
						.set(updates)
						.where(eq(tasks.id, task.id))
						.returning();

					return result[0];
				});
			});

			const updatedTasks = await Promise.all(updatePromises);
			const autoCompletedTasks = updatedTasks.filter(
				(task) => task.status === "completed",
			);

			span.setAttributes({
				"pr.id": mergeData.prId,
				"pr.merge_method": mergeData.mergeMethod,
				"pr.merge_commit_sha": mergeResult.mergeCommitSha,
				"tasks.linked_count": linkedTasks.length,
				"tasks.auto_completed_count": autoCompletedTasks.length,
			});

			await this.recordEvent(
				"pr_merged",
				"info",
				`PR merged successfully: ${prStatus.title}`,
				{
					prId: mergeData.prId,
					repository: prLink.repository,
					mergeMethod: mergeData.mergeMethod,
					mergeCommitSha: mergeResult.mergeCommitSha,
					linkedTasksCount: linkedTasks.length,
					autoCompletedTasksCount: autoCompletedTasks.length,
					mergedBy: mergeData.userId,
					sourceBranchDeleted: mergeData.deleteSourceBranch,
				},
			);

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
		});
	}
}

// Export singleton instance
export const prIntegrationService = new PRIntegrationAPIService({
	serviceName: "pr-integration",
});
