/**
 * Tasks Kanban API Service
 *
 * Implements kanban board operations with base infrastructure patterns
 * for consistent error handling, tracing, and observability.
 *
 * REFACTORED: Uses shared kanban service to eliminate duplication
 */

import { and, eq } from "drizzle-orm";
import type { z } from "zod";
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
// Import shared utilities to eliminate duplication
import {
	DEFAULT_COLUMNS,
	type GetKanbanQuerySchema,
	type KanbanBoardData,
	KanbanUtils,
	SharedKanbanService,
	STATUS_COLUMN_MAP,
} from "@/lib/api/kanban/shared-service";
import { executeTaskMove } from "@/lib/kanban/task-movement-utils";
import type {
	KanbanBoardConfigSchema,
	KanbanMoveSchema,
} from "@/src/schemas/enhanced-task-schemas";

const COLUMN_STATUS_MAP = {
	todo: "todo",
	in_progress: "in_progress",
	review: "review",
	completed: "completed",
};

export type GetKanbanQuery = z.infer<typeof GetKanbanQuerySchema>;
export type KanbanMoveDTO = z.infer<typeof KanbanMoveSchema>;
export type KanbanConfigDTO = z.infer<typeof KanbanBoardConfigSchema>;

export class TasksKanbanAPIService extends BaseAPIService {
	protected serviceName = "tasks-kanban";
	private queryBuilder = new QueryBuilder(tasks);

	/**
	 * Get kanban board data - REFACTORED to use shared service
	 */
	async getKanbanBoard(params: GetKanbanQuery, context: ServiceContext): Promise<KanbanBoardData> {
		return this.executeWithTracing("getKanbanBoard", context, async (span) => {
			// Delegate to shared service to eliminate duplication
			const result = await SharedKanbanService.getKanbanBoard(params);

			// Add instance-specific observability
			span.setAttributes({
				"kanban.total_tasks": result.metrics.totalTasks,
				"kanban.columns": result.columns.length,
				"kanban.wip_violations": result.metrics.wipLimitViolations,
			});

			await this.recordEvent("kanban_query", "Kanban board data retrieved", {
				totalTasks: result.metrics.totalTasks,
				columns: result.columns.length,
				filters: params,
			});

			return result;
		});
	}

	/**
	 * Move task between columns
	 */
	async moveTask(
		moveData: KanbanMoveDTO,
		context: ServiceContext
	): Promise<{
		task: any;
		movement: {
			from: string;
			to: string;
			timestamp: string;
		};
	}> {
		return this.executeWithTracing("moveTask", context, async (span) => {
			// Get the task first
			const taskResult = await db.select().from(tasks).where(eq(tasks.id, moveData.taskId));
			const task = taskResult[0];
			if (!task) {
				throw new NotFoundError("Task", moveData.taskId);
			}

			// Use simplified task movement utility
			const result = await executeTaskMove(
				{
					taskId: moveData.taskId,
					toColumn: moveData.toColumn,
					newOrder: moveData.position,
				},
				task
			);

			// Add observability
			span.setAttributes({
				"task.id": moveData.taskId,
				"kanban.from_column": result.movement.from,
				"kanban.to_column": result.movement.to,
				"kanban.from_status": result.task.status,
				"kanban.to_status": result.movement.to,
			});

			await this.recordEvent("user_action", `Task moved in kanban: ${result.task.title}`, {
				taskId: moveData.taskId,
				userId: "system",
				fromColumn: result.movement.from,
				toColumn: result.movement.to,
			});

			return result;
		});
	}

	/**
	 * Update kanban board configuration - REFACTORED to use shared service
	 */
	async updateKanbanConfig(
		config: KanbanConfigDTO,
		context: ServiceContext
	): Promise<KanbanConfigDTO> {
		return this.executeWithTracing("updateKanbanConfig", context, async (span) => {
			// Delegate to shared service to eliminate duplication
			const result = await SharedKanbanService.updateConfig(config);

			// Add instance-specific observability
			span.setAttributes({
				"kanban.config_update": true,
				"kanban.columns_count": config.columns.length,
				"kanban.wip_limits_enabled": config.settings?.enableWipLimits || false,
			});

			await this.recordEvent("config_update", "Kanban configuration updated", {
				config: result,
			});

			return result;
		});
	}
}

// Export singleton instance
export const tasksKanbanService = new TasksKanbanAPIService({
	timestamp: new Date(),
});
