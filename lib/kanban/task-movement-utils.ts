/**
 * Kanban Task Movement Utilities
 *
 * Breaks down complex moveTask function into smaller, focused utilities
 * to reduce complexity from 23 to under 15 while maintaining functionality.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/config";
import { tasks } from "@/db/schema";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/api/base";
// Import shared kanban constants to eliminate duplication
import { DEFAULT_COLUMNS, STATUS_COLUMN_MAP } from "@/lib/api/kanban/shared-service";

// Column to status mapping for reverse lookups
export const COLUMN_STATUS_MAP = {
	todo: "todo",
	in_progress: "in_progress",
	review: "review",
	completed: "completed",
} as const;

export interface TaskMoveData {
	taskId: string;
	toColumn: string;
	newOrder?: number;
}

export interface TaskMovementResult {
	task: any;
	movement: {
		from: string;
		to: string;
		timestamp: string;
	};
}

/**
 * Fetch task by ID with error handling
 */
export async function fetchTaskById(taskId: string): Promise<any> {
	const result = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

	const task = result[0];
	if (!task) {
		throw new NotFoundError("Task", taskId);
	}

	return task;
}

/**
 * Validate target column and return new status
 */
export function validateTargetColumn(toColumn: string): string {
	const newStatus = COLUMN_STATUS_MAP[toColumn as keyof typeof COLUMN_STATUS_MAP];
	if (!newStatus) {
		throw new ValidationError("Invalid target column");
	}
	return newStatus;
}

/**
 * Check WIP limits for target column
 */
export async function checkWipLimits(toColumn: string, newStatus: string): Promise<void> {
	// Skip WIP check for todo and completed columns
	if (toColumn === "todo" || toColumn === "completed") {
		return;
	}

	const columnConfig = DEFAULT_COLUMNS.find((c) => c.id === toColumn);
	if (!columnConfig?.limit) {
		return;
	}

	const currentColumnTasks = await db
		.select()
		.from(tasks)
		.where(eq(tasks.status, newStatus as any));

	if (currentColumnTasks.length >= columnConfig.limit) {
		throw new ConflictError(
			`Column "${columnConfig.title}" has reached its WIP limit of ${columnConfig.limit}`
		);
	}
}

/**
 * Build kanban metadata for task update
 */
export function buildKanbanMetadata(
	currentMetadata: any,
	fromColumn: string,
	toColumn: string,
	newOrder?: number
): any {
	return {
		...currentMetadata,
		kanban: {
			columnHistory: [
				...(currentMetadata.kanban?.columnHistory || []),
				{
					from: fromColumn,
					to: toColumn,
					timestamp: new Date().toISOString(),
					movedBy: "system",
				},
			],
			position: newOrder,
			lastMoved: new Date().toISOString(),
		},
	};
}

/**
 * Build task updates object
 */
export function buildTaskUpdates(newStatus: string, metadata: any): any {
	return {
		status: newStatus,
		updatedAt: new Date(),
		metadata,
	};
}

/**
 * Update task in database
 */
export async function updateTaskInDatabase(taskId: string, updates: any): Promise<any> {
	const result = await db.update(tasks).set(updates).where(eq(tasks.id, taskId)).returning();

	return result[0];
}

/**
 * Create movement record
 */
export function createMovementRecord(fromColumn: string, toColumn: string) {
	return {
		from: fromColumn,
		to: toColumn,
		timestamp: new Date().toISOString(),
	};
}

/**
 * Main task movement orchestrator - reduced from complexity 23 to ~8
 */
export async function executeTaskMove(
	moveData: TaskMoveData,
	task: any
): Promise<TaskMovementResult> {
	// Validate and get new status
	const newStatus = validateTargetColumn(moveData.toColumn);

	// Check WIP limits
	await checkWipLimits(moveData.toColumn, newStatus);

	// Build metadata and updates
	const fromColumn = STATUS_COLUMN_MAP[task.status as keyof typeof STATUS_COLUMN_MAP];
	const currentMetadata = (task.metadata as any) || {};
	const metadata = buildKanbanMetadata(
		currentMetadata,
		fromColumn,
		moveData.toColumn,
		moveData.newOrder
	);
	const updates = buildTaskUpdates(newStatus, metadata);

	// Update task in database
	const updatedTask = await updateTaskInDatabase(moveData.taskId, updates);

	// Create movement record
	const movement = createMovementRecord(fromColumn, moveData.toColumn);

	return {
		task: updatedTask,
		movement,
	};
}
