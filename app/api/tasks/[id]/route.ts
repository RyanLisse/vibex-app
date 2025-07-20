// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Individual Task API Route
 *
 * Enhanced API route for individual task operations with Drizzle ORM integration,
 * Zod validation, OpenTelemetry tracing, and comprehensive error handling.
 */

import { SpanStatusCode, trace } from "@opentelemetry/api";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/config";
import { tasks } from "@/db/schema";
import { observability } from "@/lib/observability";
import {
	createApiErrorResponse,
	createApiSuccessResponse,
	UpdateTaskSchema,
} from "@/src/schemas/api-routes";

// Route parameters schema
const TaskParamsSchema = z.object({
	id: z.string().min(1, "Task ID is required"),
});

// Enhanced error handling
class TaskAPIError extends Error {
	constructor(
		message: string,
		public statusCode = 500,
		public code = "INTERNAL_ERROR",
	) {
		super(message);
		this.name = "TaskAPIError";
	}
}

// Database operations with observability
class TaskService {
	/**
	 * Get a single task by ID
	 */
	static async getTask(id: string) {
		const tracer = trace.getTracer("task-api");
		const span = tracer.startSpan("task.getTask");

		try {
			const startTime = Date.now();

			const [task] = await db
				.select()
				.from(tasks)
				.where(eq(tasks.id, id))
				.limit(1);

			const duration = Date.now() - startTime;

			if (!task) {
				throw new TaskAPIError("Task not found", 404, "TASK_NOT_FOUND");
			}

			// Record metrics
			observability.metrics.queryDuration(duration, "select_task", true);

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

			span.setAttributes({
				"task.id": task.id,
				"task.title": task.title,
				"query.duration": duration,
			});

			return task;
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });

			if (error instanceof TaskAPIError) {
				throw error;
			}

			// Record error metrics
			observability.metrics.errorRate(1, "task_api");

			throw new TaskAPIError("Failed to fetch task", 500, "FETCH_TASK_ERROR");
		} finally {
			span.end();
		}
	}

	/**
	 * Update a task
	 */
	static async updateTask(
		id: string,
		updates: z.infer<typeof UpdateTaskSchema>,
	) {
		const tracer = trace.getTracer("task-api");
		const span = tracer.startSpan("task.updateTask");

		try {
			const startTime = Date.now();

			// First check if task exists
			const existingTask = await TaskService.getTask(id);

			const [updatedTask] = await db
				.update(tasks)
				.set({
					...updates,
					updatedAt: new Date(),
					...(updates.status === "completed" &&
						!existingTask.completedAt && {
							completedAt: new Date(),
						}),
				})
				.where(eq(tasks.id, id))
				.returning();

			const duration = Date.now() - startTime;

			// Record metrics
			observability.metrics.queryDuration(duration, "update_task", true);

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

			span.setAttributes({
				"task.id": updatedTask.id,
				"task.title": updatedTask.title,
				"task.status.previous": existingTask.status,
				"task.status.new": updatedTask.status,
				"query.duration": duration,
			});

			return updatedTask;
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });

			if (error instanceof TaskAPIError) {
				throw error;
			}

			// Record error metrics
			observability.metrics.errorRate(1, "task_api");

			throw new TaskAPIError("Failed to update task", 500, "UPDATE_TASK_ERROR");
		} finally {
			span.end();
		}
	}

	/**
	 * Delete a task
	 */
	static async deleteTask(id: string) {
		const tracer = trace.getTracer("task-api");
		const span = tracer.startSpan("task.deleteTask");

		try {
			const startTime = Date.now();

			// First check if task exists
			const _existingTask = await TaskService.getTask(id);

			const [deletedTask] = await db
				.delete(tasks)
				.where(eq(tasks.id, id))
				.returning();

			const duration = Date.now() - startTime;

			// Record metrics
			observability.metrics.queryDuration(duration, "delete_task", true);

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

			span.setAttributes({
				"task.id": deletedTask.id,
				"task.title": deletedTask.title,
				"query.duration": duration,
			});

			return deletedTask;
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });

			if (error instanceof TaskAPIError) {
				throw error;
			}

			// Record error metrics
			observability.metrics.errorRate(1, "task_api");

			throw new TaskAPIError("Failed to delete task", 500, "DELETE_TASK_ERROR");
		} finally {
			span.end();
		}
	}
}

/**
 * GET /api/tasks/[id] - Get a specific task
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		// Validate route parameters
		const { id } = TaskParamsSchema.parse(params);

		// Get task from database
		const task = await TaskService.getTask(id);

		return NextResponse.json(
			createApiSuccessResponse(task, "Task retrieved successfully"),
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				createApiErrorResponse(
					"Invalid task ID",
					400,
					"INVALID_TASK_ID",
					error.issues,
				),
				{ status: 400 },
			);
		}

		if (error instanceof TaskAPIError) {
			return NextResponse.json(
				createApiErrorResponse(error.message, error.statusCode, error.code),
				{ status: error.statusCode },
			);
		}

		return NextResponse.json(
			createApiErrorResponse("Internal server error", 500, "INTERNAL_ERROR"),
			{ status: 500 },
		);
	}
}

/**
 * PUT /api/tasks/[id] - Update a specific task
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		// Validate route parameters
		const { id } = TaskParamsSchema.parse(params);

		// Parse and validate request body
		const body = await request.json();
		const validatedData = UpdateTaskSchema.parse(body);

		// Update task in database
		const task = await TaskService.updateTask(id, validatedData);

		return NextResponse.json(
			createApiSuccessResponse(task, "Task updated successfully"),
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				createApiErrorResponse(
					"Validation failed",
					400,
					"VALIDATION_ERROR",
					error.issues,
				),
				{ status: 400 },
			);
		}

		if (error instanceof TaskAPIError) {
			return NextResponse.json(
				createApiErrorResponse(error.message, error.statusCode, error.code),
				{ status: error.statusCode },
			);
		}

		return NextResponse.json(
			createApiErrorResponse("Internal server error", 500, "INTERNAL_ERROR"),
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/tasks/[id] - Delete a specific task
 */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		// Validate route parameters
		const { id } = TaskParamsSchema.parse(params);

		// Delete task from database
		const task = await TaskService.deleteTask(id);

		return NextResponse.json(
			createApiSuccessResponse(task, "Task deleted successfully"),
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				createApiErrorResponse(
					"Invalid task ID",
					400,
					"INVALID_TASK_ID",
					error.issues,
				),
				{ status: 400 },
			);
		}

		if (error instanceof TaskAPIError) {
			return NextResponse.json(
				createApiErrorResponse(error.message, error.statusCode, error.code),
				{ status: error.statusCode },
			);
		}

		return NextResponse.json(
			createApiErrorResponse("Internal server error", 500, "INTERNAL_ERROR"),
			{ status: 500 },
		);
	}
}
