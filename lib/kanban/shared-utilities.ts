/**
 * Shared Kanban Utilities
 *
 * Eliminates duplicate kanban-related patterns by providing
 * reusable column mappings, status conversions, and board utilities.
 */

import { z } from "zod";

// Standard kanban column configuration
export interface KanbanColumn {
	id: string;
	title: string;
	limit: number | null;
	color: string;
}

// Task status type
export type TaskStatus = "todo" | "in_progress" | "review" | "completed" | "blocked";

// Column ID type
export type ColumnId = "todo" | "in_progress" | "review" | "completed";

/**
 * Default kanban columns configuration used across the application
 */
export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
	{ id: "todo", title: "To Do", limit: null, color: "#64748b" },
	{ id: "in_progress", title: "In Progress", limit: 5, color: "#3b82f6" },
	{ id: "review", title: "Review", limit: 3, color: "#f59e0b" },
	{ id: "completed", title: "Completed", limit: null, color: "#10b981" },
];

/**
 * Status to column mapping - determines which column a task status belongs to
 */
export const STATUS_TO_COLUMN_MAP: Record<TaskStatus, ColumnId> = {
	todo: "todo",
	in_progress: "in_progress",
	review: "review",
	completed: "completed",
	blocked: "in_progress", // Blocked tasks stay in progress column
};

/**
 * Column to status mapping - determines default status when moving to a column
 */
export const COLUMN_TO_STATUS_MAP: Record<ColumnId, TaskStatus> = {
	todo: "todo",
	in_progress: "in_progress",
	review: "review",
	completed: "completed",
};

/**
 * Priority levels and their display order
 */
export const PRIORITY_LEVELS = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITY_LEVELS)[number];

export const PRIORITY_ORDER: Record<Priority, number> = {
	high: 3,
	medium: 2,
	low: 1,
};

/**
 * Kanban utility functions
 */
export class KanbanUtils {
	/**
	 * Get the column ID for a given task status
	 */
	static getColumnForStatus(status: TaskStatus): ColumnId {
		return STATUS_TO_COLUMN_MAP[status] || "todo";
	}

	/**
	 * Get the default status for a given column
	 */
	static getStatusForColumn(columnId: ColumnId): TaskStatus {
		return COLUMN_TO_STATUS_MAP[columnId] || "todo";
	}

	/**
	 * Check if a column has a WIP limit violation
	 */
	static hasWipLimitViolation(column: KanbanColumn, taskCount: number): boolean {
		return column.limit !== null && taskCount > column.limit;
	}

	/**
	 * Sort tasks by priority and creation date
	 */
	static sortTasks<T extends { priority: Priority; createdAt: Date | string }>(tasks: T[]): T[] {
		return [...tasks].sort((a, b) => {
			// First sort by priority
			const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
			if (priorityDiff !== 0) {
				return priorityDiff;
			}

			// Then by creation date (newest first)
			const dateA = new Date(a.createdAt).getTime();
			const dateB = new Date(b.createdAt).getTime();
			return dateB - dateA;
		});
	}

	/**
	 * Organize tasks into columns
	 */
	static organizeTasks<
		T extends {
			status: TaskStatus;
			priority: Priority;
			createdAt: Date | string;
		},
	>(tasks: T[], columns: KanbanColumn[] = DEFAULT_KANBAN_COLUMNS) {
		return columns.map((column) => {
			// Filter tasks for this column
			const columnTasks = tasks.filter((task) => {
				const mappedColumn = KanbanUtils.getColumnForStatus(task.status);
				return mappedColumn === column.id;
			});

			// Sort tasks by priority and date
			const sortedTasks = KanbanUtils.sortTasks(columnTasks);

			return {
				...column,
				tasks: sortedTasks,
				count: sortedTasks.length,
				isOverLimit: KanbanUtils.hasWipLimitViolation(column, sortedTasks.length),
			};
		});
	}

	/**
	 * Calculate board metrics
	 */
	static calculateMetrics<T extends { status: TaskStatus }>(tasks: T[]) {
		const metrics = {
			totalTasks: tasks.length,
			tasksInProgress: tasks.filter((t) => t.status === "in_progress").length,
			blockedTasks: tasks.filter((t) => t.status === "blocked").length,
			completedTasks: tasks.filter((t) => t.status === "completed").length,
			todoTasks: tasks.filter((t) => t.status === "todo").length,
			reviewTasks: tasks.filter((t) => t.status === "review").length,
		};

		return {
			...metrics,
			completionRate:
				metrics.totalTasks > 0
					? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
					: 0,
			wipUtilization:
				metrics.totalTasks > 0
					? Math.round(((metrics.tasksInProgress + metrics.reviewTasks) / metrics.totalTasks) * 100)
					: 0,
		};
	}

	/**
	 * Check for WIP limit violations across all columns
	 */
	static getWipLimitViolations<T extends { status: TaskStatus }>(
		tasks: T[],
		columns: KanbanColumn[] = DEFAULT_KANBAN_COLUMNS
	) {
		const organizedColumns = KanbanUtils.organizeTasks(tasks, columns);
		return organizedColumns.filter((column) => column.isOverLimit);
	}

	/**
	 * Validate task move between columns
	 */
	static validateTaskMove(
		fromColumn: ColumnId,
		toColumn: ColumnId,
		toColumnTaskCount: number,
		columns: KanbanColumn[] = DEFAULT_KANBAN_COLUMNS
	): { valid: boolean; reason?: string } {
		const targetColumn = columns.find((col) => col.id === toColumn);

		if (!targetColumn) {
			return { valid: false, reason: "Target column not found" };
		}

		// Check WIP limits (don't count current task being moved)
		const newCount = toColumnTaskCount + 1;
		if (targetColumn.limit && newCount > targetColumn.limit) {
			return {
				valid: false,
				reason: `Would exceed WIP limit of ${targetColumn.limit} for ${targetColumn.title}`,
			};
		}

		return { valid: true };
	}

	/**
	 * Get allowed transitions for a given column
	 */
	static getAllowedTransitions(fromColumn: ColumnId): ColumnId[] {
		const transitions: Record<ColumnId, ColumnId[]> = {
			todo: ["in_progress"],
			in_progress: ["review", "todo"],
			review: ["completed", "in_progress"],
			completed: ["review"], // Allow reopening
		};

		return transitions[fromColumn] || [];
	}
}

/**
 * Kanban configuration schemas for validation
 */
export const KanbanColumnSchema = z.object({
	id: z.string(),
	title: z.string(),
	limit: z.number().nullable(),
	color: z.string(),
});

export const KanbanConfigSchema = z.object({
	columns: z.array(KanbanColumnSchema),
	settings: z.object({
		enableWipLimits: z.boolean().default(true),
		autoAssignReviewer: z.boolean().default(false),
		allowMultipleAssignees: z.boolean().default(false),
		showTaskEstimates: z.boolean().default(true),
	}),
});

export const TaskMoveSchema = z.object({
	taskId: z.string(),
	fromColumn: z.enum(["todo", "in_progress", "review", "completed"]),
	toColumn: z.enum(["todo", "in_progress", "review", "completed"]),
	newOrder: z.number().optional(),
	validateLimits: z.boolean().default(true),
});

export type KanbanConfig = z.infer<typeof KanbanConfigSchema>;
export type TaskMove = z.infer<typeof TaskMoveSchema>;

/**
 * Mock data factories for testing
 */
export class KanbanTestFactory {
	static createMockTask(
		overrides: Partial<{
			id: string;
			title: string;
			status: TaskStatus;
			priority: Priority;
			createdAt: Date;
		}> = {}
	) {
		return {
			id: `task-${Date.now()}`,
			title: "Test Task",
			status: "todo" as TaskStatus,
			priority: "medium" as Priority,
			createdAt: new Date(),
			...overrides,
		};
	}

	static createMockColumn(overrides: Partial<KanbanColumn> = {}): KanbanColumn {
		return {
			id: "todo",
			title: "To Do",
			limit: null,
			color: "#64748b",
			...overrides,
		};
	}

	static createMockBoard() {
		const tasks = [
			KanbanTestFactory.createMockTask({
				id: "1",
				status: "todo",
				priority: "high",
			}),
			KanbanTestFactory.createMockTask({
				id: "2",
				status: "todo",
				priority: "medium",
			}),
			KanbanTestFactory.createMockTask({
				id: "3",
				status: "in_progress",
				priority: "high",
			}),
			KanbanTestFactory.createMockTask({
				id: "4",
				status: "review",
				priority: "low",
			}),
			KanbanTestFactory.createMockTask({
				id: "5",
				status: "completed",
				priority: "medium",
			}),
		];

		return {
			tasks,
			columns: DEFAULT_KANBAN_COLUMNS,
			organizedColumns: KanbanUtils.organizeTasks(tasks),
			metrics: KanbanUtils.calculateMetrics(tasks),
		};
	}
}

/**
 * Kanban event types for real-time updates
 */
export const KANBAN_EVENTS = {
	TASK_MOVED: "task_moved",
	TASK_CREATED: "task_created",
	TASK_UPDATED: "task_updated",
	TASK_DELETED: "task_deleted",
	COLUMN_UPDATED: "column_updated",
	WIP_LIMIT_VIOLATED: "wip_limit_violated",
} as const;

export type KanbanEvent = (typeof KANBAN_EVENTS)[keyof typeof KANBAN_EVENTS];

export interface KanbanEventData {
	type: KanbanEvent;
	taskId?: string;
	columnId?: ColumnId;
	previousColumn?: ColumnId;
	newColumn?: ColumnId;
	timestamp: Date;
	metadata?: Record<string, any>;
}

/**
 * Kanban analytics utilities
 */
export class KanbanAnalytics {
	/**
	 * Calculate cycle time for completed tasks
	 */
	static calculateCycleTime<
		T extends {
			status: TaskStatus;
			createdAt: Date | string;
			completedAt?: Date | string;
		},
	>(tasks: T[]): number {
		const completedTasks = tasks.filter((t) => t.status === "completed" && t.completedAt);

		if (completedTasks.length === 0) return 0;

		const totalTime = completedTasks.reduce((sum, task) => {
			const created = new Date(task.createdAt).getTime();
			const completed = new Date(task.completedAt!).getTime();
			return sum + (completed - created);
		}, 0);

		// Return average cycle time in days
		return Math.round(totalTime / completedTasks.length / (1000 * 60 * 60 * 24));
	}

	/**
	 * Calculate throughput (tasks completed per time period)
	 */
	static calculateThroughput<
		T extends {
			status: TaskStatus;
			completedAt?: Date | string;
		},
	>(tasks: T[], days = 7): number {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - days);

		const recentCompletions = tasks.filter((task) => {
			if (task.status !== "completed" || !task.completedAt) return false;
			return new Date(task.completedAt) >= cutoff;
		});

		return Math.round((recentCompletions.length / days) * 10) / 10; // Tasks per day
	}

	/**
	 * Identify bottlenecks in the workflow
	 */
	static identifyBottlenecks<T extends { status: TaskStatus }>(tasks: T[]) {
		const metrics = KanbanUtils.calculateMetrics(tasks);
		const bottlenecks: Array<{
			column: ColumnId;
			reason: string;
			severity: "low" | "medium" | "high";
		}> = [];

		// Check for columns with high task counts
		if (metrics.tasksInProgress > metrics.totalTasks * 0.4) {
			bottlenecks.push({
				column: "in_progress",
				reason: "High number of tasks in progress",
				severity: "high",
			});
		}

		if (metrics.reviewTasks > metrics.totalTasks * 0.3) {
			bottlenecks.push({
				column: "review",
				reason: "Tasks accumulating in review",
				severity: "medium",
			});
		}

		if (metrics.blockedTasks > 0) {
			bottlenecks.push({
				column: "in_progress",
				reason: `${metrics.blockedTasks} blocked tasks`,
				severity: "high",
			});
		}

		return bottlenecks;
	}
}
