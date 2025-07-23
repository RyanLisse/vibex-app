// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Tasks API Route - REFACTORED to eliminate duplication
 *
 * Uses shared route helpers to eliminate repeated patterns for:
 * - Parameter validation and parsing
 * - Request body handling  
 * - Response formatting
 * - Error handling
 * - Tracing and observability
 */

import { ulid } from "ulid";
import { z } from "zod";
import { db } from "@/db/config";
import { tasks } from "@/db/schema";
import { 
	createGetListHandler,
	createPostHandler,
	QueryParsers 
} from "@/lib/api/shared/route-helpers";
import { observability } from "@/lib/observability";
import {
	buildQueryConditions,
	buildSortOrder,
	buildTaskQuery,
	calculatePagination,
} from "@/lib/tasks/query-utils";
import {
	CreateTaskSchema,
	type UpdateTaskSchema,
} from "@/src/schemas/api-routes";

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

// Shared service class for business logic
class TasksService {
	/**
	 * Get tasks with filtering and pagination
	 */
	static async getTasks(params: z.infer<typeof GetTasksQuerySchema>) {
		const startTime = Date.now();

		// Use existing query utilities
		const conditions = buildQueryConditions(params, tasks);
		const orderBy = buildSortOrder(params, tasks);
		const { offset } = calculatePagination(params);

		// Execute optimized query
		const result = await buildTaskQuery({
			conditions,
			orderBy,
			limit: params.limit,
			offset,
			table: tasks,
		});

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
				resultCount: result.taskResults.length,
				totalCount: result.countResult.length,
				filters: params,
			},
			"api",
			["tasks", "query"],
		);

		return {
			items: result.taskResults,
			total: result.countResult.length,
			page: params.page,
			limit: params.limit,
		};
	}

	/**
	 * Create a new task
	 */
	static async createTask(taskData: z.infer<typeof CreateTaskSchema>) {
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

		return createdTask;
	}
}

// REFACTORED: Route handlers using shared utilities eliminate 70+ lines of duplication

/**
 * GET /api/tasks - Get tasks with filtering and pagination
 */
export const GET = createGetListHandler({
	serviceName: 'tasks-api',
	enableCaching: true,
	getList: async (options) => {
		// Transform options to match our query schema
		const params = GetTasksQuerySchema.parse({
			page: options.page,
			limit: options.limit,
			search: options.search,
			// Add any filter/sort parsing as needed
		});

		return await TasksService.getTasks(params);
	},
});

/**
 * POST /api/tasks - Create a new task
 */
export const POST = createPostHandler({
	serviceName: 'tasks-api',
	bodySchema: CreateTaskSchema,
	create: async (data) => {
		return await TasksService.createTask(data);
	},
});
