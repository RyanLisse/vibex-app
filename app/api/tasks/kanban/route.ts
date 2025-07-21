// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Kanban Board API Route - Refactored Version
 *
 * Enhanced kanban operations using base utilities for consistency and reduced duplication
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/config";
import { tasks } from "@/db/schema";
import { BaseAPIService } from "@/lib/api/base";
import { NotFoundError, ValidationError } from "@/lib/api/base/errors";
import type { KanbanMoveSchema } from "@/src/schemas/enhanced-task-schemas";

// Request validation schemas
const GetKanbanQuerySchema = z.object({
	userId: z.string().optional(),
	projectId: z.string().optional(),
	assignee: z.string().optional(),
});

// Default kanban columns configuration
const DEFAULT_COLUMNS = [
	{ id: "todo", title: "To Do", limit: null, color: "#64748b" },
	{ id: "in_progress", title: "In Progress", limit: 5, color: "#3b82f6" },
	{ id: "review", title: "Review", limit: 3, color: "#f59e0b" },
	{ id: "completed", title: "Completed", limit: null, color: "#10b981" },
];

// Status mapping between task status and kanban columns
const STATUS_COLUMN_MAP = {
	todo: "todo",
	in_progress: "in_progress",
	review: "review",
	completed: "completed",
	blocked: "in_progress", // Blocked tasks stay in progress column
};

// Service class extending BaseAPIService
class KanbanService extends BaseAPIService {
	protected static serviceName = "kanban-api";

	/**
	 * Get kanban board data
	 */
	static async getKanbanBoard(params: z.infer<typeof GetKanbanQuerySchema>) {
		return KanbanService.withTracing("getKanbanBoard", async () => {
			// Build query conditions
			const conditions = [];
			if (params.userId) {
				conditions.push(eq(tasks.userId, params.userId));
			}
			if (params.assignee) {
				conditions.push(eq(tasks.assignee, params.assignee));
			}

			// Get all tasks
			let query = db.select().from(tasks);
			if (conditions.length > 0) {
				query = query.where(and(...conditions));
			}

			const allTasks = await query;

			// Get or create kanban configuration
			const kanbanConfig = {
				columns: DEFAULT_COLUMNS,
				settings: {
					enableWipLimits: true,
					autoAssignReviewer: true,
					allowMultipleAssignees: false,
					showTaskEstimates: true,
				},
			};

			// Organize tasks by columns
			const columns = kanbanConfig.columns.map((column) => {
				const columnTasks = allTasks.filter((task) => {
					const mappedColumn = STATUS_COLUMN_MAP[task.status] || "todo";
					return mappedColumn === column.id;
				});

				// Sort tasks by priority and creation date
				columnTasks.sort((a, b) => {
					const priorityOrder = { high: 3, medium: 2, low: 1 };
					const priorityDiff =
						priorityOrder[b.priority] - priorityOrder[a.priority];
					if (priorityDiff !== 0) {
						return priorityDiff;
					}
					return (
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
					);
				});

				return {
					...column,
					tasks: columnTasks,
					count: columnTasks.length,
					isOverLimit: column.limit && columnTasks.length > column.limit,
				};
			});

			// Calculate board metrics
			const metrics = {
				totalTasks: allTasks.length,
				tasksInProgress: allTasks.filter((t) => t.status === "in_progress")
					.length,
				blockedTasks: allTasks.filter((t) => t.status === "blocked").length,
				completedToday: allTasks.filter(
					(t) =>
						t.status === "completed" &&
						t.completedAt &&
						new Date(t.completedAt).toDateString() ===
							new Date().toDateString(),
				).length,
				wipLimitViolations: columns.filter((c) => c.isOverLimit).length,
			};

			// Log operation
			await KanbanService.logOperation(
				"get_kanban_board",
				"kanban",
				null,
				params.userId,
				{
					totalTasks: metrics.totalTasks,
					columns: columns.length,
					wipViolations: metrics.wipLimitViolations,
				},
			);

			return {
				columns,
				config: kanbanConfig,
				metrics,
			};
		});
	}

	// Helper functions to reduce moveTask complexity
	static async getTaskForMove(tx: any, taskId: string) {
		const [task] = await tx.select().from(tasks).where(eq(tasks.id, taskId));

		if (!task) {
			throw new NotFoundError("Task", taskId);
		}

		return task;
	}

	static validateTargetColumn(targetColumn: string) {
		const columnStatusMap = {
			todo: "todo",
			in_progress: "in_progress",
			review: "review",
			completed: "completed",
		};

		const newStatus =
			columnStatusMap[targetColumn as keyof typeof columnStatusMap];
		if (!newStatus) {
			throw new ValidationError("Invalid target column");
		}

		return newStatus;
	}

	static async validateWipLimits(
		tx: any,
		targetColumn: string,
		newStatus: string,
	) {
		if (targetColumn === "todo" || targetColumn === "completed") {
			return; // No WIP limits for these columns
		}

		const columnConfig = DEFAULT_COLUMNS.find((c) => c.id === targetColumn);
		if (!columnConfig?.limit) {
			return; // No limit configured
		}

		const currentColumnTasks = await tx
			.select()
			.from(tasks)
			.where(eq(tasks.status, newStatus as any));

		if (currentColumnTasks.length >= columnConfig.limit) {
			throw new ValidationError(
				`Column "${columnConfig.title}" has reached its WIP limit of ${columnConfig.limit}`,
			);
		}
	}

	static createTaskUpdates(
		task: any,
		newStatus: string,
		moveData: z.infer<typeof KanbanMoveSchema>,
	) {
		const updates: any = {
			status: newStatus,
			updatedAt: new Date(),
		};

		// Set completion time if moving to completed
		if (newStatus === "completed") {
			updates.completedAt = new Date();
		}

		return updates;
	}

	static createKanbanMetadata(
		task: any,
		moveData: z.infer<typeof KanbanMoveSchema>,
	) {
		const currentMetadata = task.metadata || {};
		return {
			...currentMetadata,
			kanban: {
				columnHistory: [
					...(currentMetadata.kanban?.columnHistory || []),
					{
						from: STATUS_COLUMN_MAP[
							task.status as keyof typeof STATUS_COLUMN_MAP
						],
						to: moveData.targetColumn,
						timestamp: new Date().toISOString(),
						movedBy: moveData.userId,
					},
				],
				position: moveData.position,
				lastMoved: new Date().toISOString(),
			},
		};
	}

	/**
	 * Move task between columns
	 */
	static async moveTask(moveData: z.infer<typeof KanbanMoveSchema>) {
		return KanbanService.withTracing(
			"moveTask",
			async () => {
				return KanbanService.withTransaction(async (tx) => {
					// Get and validate task
					const task = await KanbanService.getTaskForMove(tx, moveData.taskId);

					// Validate target column and get new status
					const newStatus = KanbanService.validateTargetColumn(
						moveData.targetColumn,
					);

					// Check WIP limits
					await KanbanService.validateWipLimits(
						tx,
						moveData.targetColumn,
						newStatus,
					);

					// Create task updates
					const updates = KanbanService.createTaskUpdates(
						task,
						newStatus,
						moveData,
					);
					updates.metadata = KanbanService.createKanbanMetadata(task, moveData);

					// Update task in database
					const [updatedTask] = await tx
						.update(tasks)
						.set(updates)
						.where(eq(tasks.id, moveData.taskId))
						.returning();

					// Log operation
					await KanbanService.logOperation(
						"move_task",
						"task",
						moveData.taskId,
						moveData.userId,
						{
							fromColumn:
								STATUS_COLUMN_MAP[
									task.status as keyof typeof STATUS_COLUMN_MAP
								],
							toColumn: moveData.targetColumn,
							fromStatus: task.status,
							toStatus: newStatus,
						},
					);

					return {
						task: updatedTask,
						movement: {
							from: STATUS_COLUMN_MAP[
								task.status as keyof typeof STATUS_COLUMN_MAP
							],
							to: moveData.targetColumn,
							timestamp: new Date().toISOString(),
						},
					};
				});
			},
			{ "task.id": moveData.taskId },
		);
	}

	/**
	 * Update kanban board configuration
	 */
	static async updateConfig(config: z.infer<typeof KanbanBoardConfigSchema>) {
		return KanbanService.withTracing("updateConfig", async () => {
			// In a real implementation, would save to database
			// For now, we'll just validate and return the config

			// Log operation
			await KanbanService.logOperation(
				"update_kanban_config",
				"kanban",
				null,
				null,
				{
					columnsCount: config.columns.length,
					wipLimitsEnabled: config.settings.enableWipLimits,
				},
			);

			return config;
		});
	}
}
