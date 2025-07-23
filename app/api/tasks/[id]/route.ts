// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Individual Task API Route - REFACTORED to eliminate duplication
 *
 * Uses shared route helpers to eliminate repeated patterns for:
 * - Parameter validation and parsing
 * - Request body handling  
 * - Response formatting
 * - Error handling
 * - Tracing and observability
 * - Cache management
 */

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/config";
import { tasks } from "@/db/schema";
import { 
	createGetByIdHandler,
	createPutHandler,
	createDeleteHandler,
	CommonParamSchemas
} from "@/lib/api/shared/route-helpers";
import { 
	NotFoundAPIError,
	APIError 
} from "@/lib/api/shared/error-handlers";
import { observability } from "@/lib/observability";
import { UpdateTaskSchema } from "@/src/schemas/api-routes";

// Shared service class for business logic
class TaskService {
	/**
	 * Get a single task by ID
	 */
	static async getTask(id: string) {
		const startTime = Date.now();

		const [task] = await db
			.select()
			.from(tasks)
			.where(eq(tasks.id, id))
			.limit(1);

		const duration = Date.now() - startTime;

		if (!task) {
			throw new NotFoundAPIError("Task", id);
		}

		// Record metrics
		observability.metrics.queryDuration.record(duration);

		// Record event
		await observability.events.collector.collectEvent(
			"query_end",
			"debug",
			`Task retrieved: ${task.title}`,
			{
				taskId: task.id,
				userId: task.userId,
				duration,
			},
			"api",
			["task", "get"],
		);

		return task;
	}

	/**
	 * Update a task
	 */
	static async updateTask(
		id: string,
		updates: z.infer<typeof UpdateTaskSchema>,
	) {
		const startTime = Date.now();

		// First check if task exists
		const existingTask = await TaskService.getTask(id);

		const [updatedTask] = await db
			.update(tasks)
			.set({
				...updates,
				updatedAt: new Date(),
			})
			.where(eq(tasks.id, id))
			.returning();

		if (!updatedTask) {
			throw new APIError("Failed to update task", 500, "UPDATE_TASK_ERROR");
		}

		const duration = Date.now() - startTime;

		// Record metrics
		observability.metrics.queryDuration.record(duration);

		// Record event
		await observability.events.collector.collectEvent(
			"user_action",
			"info",
			`Task updated: ${updatedTask.title}`,
			{
				taskId: updatedTask.id,
				userId: updatedTask.userId,
				updates,
				previousStatus: existingTask.status,
				newStatus: updatedTask.status,
				duration,
			},
			"api",
			["task", "update"],
		);

		return updatedTask;
	}

	/**
	 * Delete a task
	 */
	static async deleteTask(id: string) {
		const startTime = Date.now();

		// First check if task exists to get task details for logging
		const existingTask = await TaskService.getTask(id);

		const [deletedTask] = await db
			.delete(tasks)
			.where(eq(tasks.id, id))
			.returning();

		if (!deletedTask) {
			throw new APIError("Failed to delete task", 500, "DELETE_TASK_ERROR");
		}

		const duration = Date.now() - startTime;

		// Record metrics
		observability.metrics.queryDuration.record(duration);

		// Record event
		await observability.events.collector.collectEvent(
			"user_action",
			"info",
			`Task deleted: ${deletedTask.title}`,
			{
				taskId: deletedTask.id,
				userId: deletedTask.userId,
				taskStatus: deletedTask.status,
				duration,
			},
			"api",
			["task", "delete"],
		);

		return deletedTask;
	}
}

// REFACTORED: Route handlers using shared utilities eliminate 100+ lines of duplication

/**
 * GET /api/tasks/[id] - Get a specific task
 */
export const GET = createGetByIdHandler({
	serviceName: 'task-api',
	enableCaching: true,
	getById: async (id: string) => {
		return await TaskService.getTask(id);
	},
});

/**
 * PUT /api/tasks/[id] - Update a specific task
 */
export const PUT = createPutHandler({
	serviceName: 'task-api',
	bodySchema: UpdateTaskSchema,
	update: async (id: string, data) => {
		return await TaskService.updateTask(id, data);
	},
});

/**
 * DELETE /api/tasks/[id] - Delete a specific task
 */
export const DELETE = createDeleteHandler({
	serviceName: 'task-api',
	delete: async (id: string) => {
		return await TaskService.deleteTask(id);
	},
});
