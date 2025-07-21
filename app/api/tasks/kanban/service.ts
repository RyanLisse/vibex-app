/**
 * Tasks Kanban API Service
 *
 * Implements kanban board operations with base infrastructure patterns
 * for consistent error handling, tracing, and observability.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/config";
import { tasks } from "@/db/schema";
import {
	BaseAPIService,
	ConflictError,
	NotFoundError,
	type ServiceContext,
	ValidationError,
} from "@/lib/api/base";
import { QueryBuilder } from "@/lib/api/base/query-builder";
import { executeTaskMove } from "@/lib/kanban/task-movement-utils";
import type {
	KanbanBoardConfigSchema,
	KanbanMoveSchema,
} from "@/src/schemas/enhanced-task-schemas";

// Default kanban columns configuration
export const DEFAULT_COLUMNS = [
	{ id: "todo", title: "To Do", limit: null, color: "#64748b" },
	{ id: "in_progress", title: "In Progress", limit: 5, color: "#3b82f6" },
	{ id: "review", title: "Review", limit: 3, color: "#f59e0b" },
	{ id: "completed", title: "Completed", limit: null, color: "#10b981" },
];

// Status mapping between task status and kanban columns
export const STATUS_COLUMN_MAP = {
	todo: "todo",
	in_progress: "in_progress",
	review: "review",
	completed: "completed",
	blocked: "in_progress", // Blocked tasks stay in progress column
};

const COLUMN_STATUS_MAP = {
	todo: "todo",
	in_progress: "in_progress",
	review: "review",
	completed: "completed",
};

// Query schemas
export const GetKanbanQuerySchema = z.object({
	userId: z.string().optional(),
	projectId: z.string().optional(),
	assignee: z.string().optional(),
});

export type GetKanbanQuery = z.infer<typeof GetKanbanQuerySchema>;
export type KanbanMoveDTO = z.infer<typeof KanbanMoveSchema>;
export type KanbanConfigDTO = z.infer<typeof KanbanBoardConfigSchema>;

export class TasksKanbanAPIService extends BaseAPIService {
	protected serviceName = "tasks-kanban";
	private queryBuilder = new QueryBuilder(tasks);

	/**
	 * Get kanban board data
	 */
	async getKanbanBoard(
		params: GetKanbanQuery,
		context: ServiceContext,
	): Promise<{
		columns: any[];
		config: any;
		metrics: any;
	}> {
		return this.executeWithTracing("getKanbanBoard", context, async (span) => {
			// Build query conditions
			const conditions = [];
			if (params.userId) {
				conditions.push(eq(tasks.userId, params.userId));
			}
			// Note: assignee field not available in current schema

			// Get all tasks
			const allTasks = await this.executeDatabase("getTasks", async () => {
				return db
					.select()
					.from(tasks)
					.where(conditions.length > 0 ? and(...conditions) : undefined);
			});

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
				completedToday: allTasks.filter((t) => t.status === "completed").length,
				wipLimitViolations: columns.filter((c) => c.isOverLimit).length,
			};

			span.setAttributes({
				"kanban.total_tasks": metrics.totalTasks,
				"kanban.columns": columns.length,
				"kanban.wip_violations": metrics.wipLimitViolations,
			});

			await this.recordEvent("kanban_query", "Kanban board data retrieved", {
				totalTasks: metrics.totalTasks,
				columns: columns.length,
				filters: params,
			});

			return {
				columns,
				config: kanbanConfig,
				metrics,
			};
		});
	}

	/**
	 * Move task between columns
	 */
	async moveTask(
		moveData: KanbanMoveDTO,
		context: ServiceContext,
	): Promise<{
		task: any;
		movement: {
			from: string;
			to: string;
			timestamp: string;
		};
	}> {
		return this.executeWithTracing("moveTask", context, async (span) => {
			// Use simplified task movement utility
			const result = await executeTaskMove({
				taskId: moveData.taskId,
				toColumn: moveData.toColumn,
				newOrder: moveData.newOrder,
				columnsConfig: DEFAULT_COLUMNS,
				statusColumnMap: STATUS_COLUMN_MAP,
				columnStatusMap: COLUMN_STATUS_MAP,
			});

			// Add observability
			span.setAttributes({
				"task.id": moveData.taskId,
				"kanban.from_column": result.movement.from,
				"kanban.to_column": result.movement.to,
				"kanban.from_status": result.task.status,
				"kanban.to_status": result.movement.to,
			});

			await this.recordEvent(
				"user_action",
				`Task moved in kanban: ${result.task.title}`,
				{
					taskId: moveData.taskId,
					userId: "system",
					fromColumn: result.movement.from,
					toColumn: result.movement.to,
				},
			);

			return result;
		});
	}

	/**
	 * Update kanban board configuration
	 */
	async updateKanbanConfig(
		config: KanbanConfigDTO,
		context: ServiceContext,
	): Promise<KanbanConfigDTO> {
		return this.executeWithTracing(
			"updateKanbanConfig",
			context,
			async (span) => {
				// In a real implementation, would save to database
				// For now, we'll just validate and return the config

				span.setAttributes({
					"kanban.config_update": true,
				});

				await this.recordEvent(
					"config_update",
					"Kanban configuration updated",
					{
						config: config,
					},
				);

				return config;
			},
		);
	}
}

// Export singleton instance
export const tasksKanbanService = new TasksKanbanAPIService({
	serviceName: "tasks-kanban",
});
