// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Tasks API Route
 *
 * Enhanced API route with Drizzle ORM integration, Zod validation,
 * OpenTelemetry tracing, and comprehensive error handling.
 */

import { type UpdateTaskSchema } from "@/src/schemas/api-routes";

// Request validation schemas
const GetTasksQuerySchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),
	status: z.string().optional(),
	priority: z.string().optional(),
	assignee: z.string().optional(),
	search: z.string().optional(),
	sortBy: z
		.enum(["created_at", "updated_at", "title", "priority", "due_date"])
		.default("created_at"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
	userId: z.string().optional(),
});

const _GetTaskParamsSchema = z.object({
	id: z.string().min(1),
});

// Enhanced error handling
class TasksAPIError extends Error {
	constructor(
		message: string,
		public statusCode = 500,
		public code = "INTERNAL_ERROR",
	) {
		super(message);
		this.name = "TasksAPIError";
	}
}

// Database operations with observability
class TasksService {
	/**
	 * Get tasks with filtering and pagination
	 */
	static async getTasks(params: z.infer<typeof GetTasksQuerySchema>) {
		const tracer = trace.getTracer("tasks-api");
		const span = tracer.startSpan("tasks.getTasks");

		try {
			const startTime = Date.now();

			// Build query conditions
			const conditions = [];

			if (params.status) {
				conditions.push(eq(tasks.status, params.status as any));
			}

			if (params.priority) {
				conditions.push(eq(tasks.priority, params.priority as any));
			}

			if (params.assignee) {
				conditions.push(eq(tasks.assignee, params.assignee));
			}

			if (params.userId) {
				conditions.push(eq(tasks.userId, params.userId));
			}

			if (params.search) {
				conditions.push(like(tasks.title, `%${params.search}%`));
			}

			// Build sort order
			const sortColumn = tasks[params.sortBy as keyof typeof tasks];
			const orderBy =
				params.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

			// Execute query with pagination
			const offset = (params.page - 1) * params.limit;

			const [taskResults, countResult] = await Promise.all([
				db
					.select()
					.from(tasks)
					.where(conditions.length > 0 ? and(...conditions) : undefined)
					.orderBy(orderBy)
					.limit(params.limit)
					.offset(offset),
				db
					.select({ count: tasks.id })
					.from(tasks)
					.where(conditions.length > 0 ? and(...conditions) : undefined),
			]);

			const duration = Date.now() - startTime;

			// Record metrics
			observability.metrics.queryDuration(duration, "select_tasks", true);

			// Record event
			await observability.events.collector.collectEvent(
				"query_end",
				"debug",
				"Tasks query completed",
				{
					duration,
					resultCount: taskResults.length,
					totalCount: countResult.length,
					filters: params,
				},
				"api",
				["tasks", "query"],
			);

			span.setAttributes({
				"tasks.count": taskResults.length,
				"tasks.total": countResult.length,
				"query.duration": duration,
			});

			return {
				tasks: taskResults,
				pagination: {
					page: params.page,
					limit: params.limit,
					total: countResult.length,
					totalPages: Math.ceil(countResult.length / params.limit),
				},
			};
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });

			// Record error metrics
			observability.metrics.errorRate(1, "tasks_api");

			throw new TasksAPIError(
				"Failed to fetch tasks",
				500,
				"FETCH_TASKS_ERROR",
			);
		} finally {
			span.end();
		}
	}

	/**
	 * Create a new task
	 */
	static async createTask(taskData: z.infer<typeof CreateTaskSchema>) {
		const tracer = trace.getTracer("tasks-api");
		const span = tracer.startSpan("tasks.createTask");

		try {
			const startTime = Date.now();

			const newTask = {
				id: ulid(),
				...taskData,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const [createdTask] = await db.insert(tasks).values(newTask).returning();

			const duration = Date.now() - startTime;

			// Record metrics
			observability.metrics.queryDuration(duration, "insert_task", true);

			// Record event
			await observability.events.collector.collectEvent(
				"user_action",
				"info",
				`Task created: ${createdTask.title}`,
				{
					taskId: createdTask.id,
					userId: createdTask.userId,
					duration,
				},
				"api",
				["tasks", "create"],
			);

			span.setAttributes({
				"task.id": createdTask.id,
				"task.title": createdTask.title,
				"query.duration": duration,
			});

			return createdTask;
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });

			// Record error metrics
			observability.metrics.errorRate(1, "tasks_api");

			throw new TasksAPIError(
				"Failed to create task",
				500,
				"CREATE_TASK_ERROR",
			);
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
		const tracer = trace.getTracer("tasks-api");
		const span = tracer.startSpan("tasks.updateTask");

		try {
			const startTime = Date.now();

			const [updatedTask] = await db
				.update(tasks)
				.set({
					...updates,
					updatedAt: new Date(),
					...(updates.status === "completed" && { completedAt: new Date() }),
				})
				.where(eq(tasks.id, id))
				.returning();

			if (!updatedTask) {
				throw new TasksAPIError("Task not found", 404, "TASK_NOT_FOUND");
			}

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
					duration,
				},
				"api",
				["tasks", "update"],
			);

			span.setAttributes({
				"task.id": updatedTask.id,
				"task.title": updatedTask.title,
				"query.duration": duration,
			});

			return updatedTask;
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });

			if (error instanceof TasksAPIError) {
				throw error;
			}

			// Record error metrics
			observability.metrics.errorRate(1, "tasks_api");

			throw new TasksAPIError(
				"Failed to update task",
				500,
				"UPDATE_TASK_ERROR",
			);
		} finally {
			span.end();
		}
	}

	/**
	 * Delete a task
	 */
	static async deleteTask(id: string) {
		const tracer = trace.getTracer("tasks-api");
		const span = tracer.startSpan("tasks.deleteTask");

		try {
			const startTime = Date.now();

			const [deletedTask] = await db
				.delete(tasks)
				.where(eq(tasks.id, id))
				.returning();

			if (!deletedTask) {
				throw new TasksAPIError("Task not found", 404, "TASK_NOT_FOUND");
			}

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
					duration,
				},
				"api",
				["tasks", "delete"],
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

			if (error instanceof TasksAPIError) {
				throw error;
			}

			// Record error metrics
			observability.metrics.errorRate(1, "tasks_api");

			throw new TasksAPIError(
				"Failed to delete task",
				500,
				"DELETE_TASK_ERROR",
			);
		} finally {
			span.end();
		}
	}
}

/**
 * GET /api/tasks - Get tasks with filtering and pagination
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const queryParams = Object.fromEntries(searchParams.entries());

		// Validate query parameters
		const validatedParams = GetTasksQuerySchema.parse(queryParams);

		// Get tasks from database
		const result = await TasksService.getTasks(validatedParams);

		return NextResponse.json(
			createPaginatedResponse(
				result.tasks,
				result.pagination,
				"Tasks retrieved successfully",
			),
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

		if (error instanceof TasksAPIError) {
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
 * POST /api/tasks - Create a new task
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// Validate request body
		const validatedData = CreateTaskSchema.parse(body);

		// Create task in database
		const task = await TasksService.createTask(validatedData);

		return NextResponse.json(
			createApiSuccessResponse(task, "Task created successfully"),
			{
				status: 201,
			},
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

		if (error instanceof TasksAPIError) {
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
