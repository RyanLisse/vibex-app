import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import { BaseAPIHandler } from "../../../lib/api/base/handler";
import {
	BaseAPIService,
	BaseCRUDService,
	type ServiceContext,
} from "../../../lib/api/base/service";
import {
	QueryBuilder,
	createQueryBuilder,
} from "../../../lib/api/base/query-builder";
import { ResponseBuilder } from "../../../lib/api/base/response-builder";
import {
	BaseAPIError,
	ValidationError,
	NotFoundError,
	DatabaseError,
} from "../../../lib/api/base/errors";
import { db } from "../../../db/config";
import { observability } from "../../../lib/observability";

// Mock dependencies
vi.mock("@/lib/observability", () => ({
	observability: {
		metrics: {
			errorRate: vi.fn(),
			queryDuration: vi.fn(),
			httpRequestDuration: vi.fn(),
		},
		events: {
			collector: {
				collectEvent: vi.fn().mockResolvedValue(undefined),
			},
		},
	},
}));

vi.mock("@/db/config", () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
}));

// Mock OpenTelemetry
const mockSpan = {
	setAttributes: vi.fn(),
	recordException: vi.fn(),
	setStatus: vi.fn(),
	end: vi.fn(),
};

const mockTracer = {
	startSpan: vi.fn().mockReturnValue(mockSpan),
};

vi.mock("@opentelemetry/api", async () => {
	const actual = await vi.importActual("@opentelemetry/api");
	return {
		...actual,
		trace: {
			getTracer: vi.fn().mockReturnValue(mockTracer),
		},
	};
});

// Define our domain model
interface Task {
	id: string;
	title: string;
	description: string;
	status: "pending" | "in_progress" | "completed";
	priority: "low" | "medium" | "high";
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

// DTOs
const CreateTaskDTO = z.object({
	title: z.string().min(3).max(100),
	description: z.string().max(500).optional(),
	priority: z.enum(["low", "medium", "high"]).default("medium"),
});

const UpdateTaskDTO = z.object({
	title: z.string().min(3).max(100).optional(),
	description: z.string().max(500).optional(),
	status: z.enum(["pending", "in_progress", "completed"]).optional(),
	priority: z.enum(["low", "medium", "high"]).optional(),
});

type CreateTaskDTO = z.infer<typeof CreateTaskDTO>;
type UpdateTaskDTO = z.infer<typeof UpdateTaskDTO>;

// Mock table schema
const tasksTable = {
	id: "tasks.id",
	title: "tasks.title",
	description: "tasks.description",
	status: "tasks.status",
	priority: "tasks.priority",
	userId: "tasks.userId",
	createdAt: "tasks.createdAt",
	updatedAt: "tasks.updatedAt",
};

// Task Service implementation
class TaskService extends BaseCRUDService<Task, CreateTaskDTO, UpdateTaskDTO> {
	protected tableName = "tasks";

	async getAll(
		filters: Record<string, any>,
		pagination: { page: number; limit: number },
		context: ServiceContext,
	): Promise<{ items: Task[]; total: number }> {
		return this.executeWithTracing("getAll", context, async (span) => {
			const queryBuilder = createQueryBuilder<Task>(tasksTable)
				.where(tasksTable.userId, context.userId!)
				.filter(filters)
				.orderBy(tasksTable.createdAt, "desc")
				.paginate(pagination.page, pagination.limit);

			const result = await queryBuilder.executePaginated();

			span.setAttributes({
				"tasks.count": result.items.length,
				"tasks.total": result.pagination.total,
			});

			await this.recordEvent(
				"tasks_listed",
				`Listed ${result.items.length} tasks`,
				{
					userId: context.userId,
					filters,
					pagination,
				},
			);

			return {
				items: result.items,
				total: result.pagination.total,
			};
		});
	}

	async getById(id: string, context: ServiceContext): Promise<Task> {
		return this.executeWithTracing("getById", context, async (span) => {
			const task = await this.executeDatabase("select", async () => {
				const queryBuilder = createQueryBuilder<Task>(tasksTable)
					.where(tasksTable.id, id)
					.where(tasksTable.userId, context.userId!);

				return queryBuilder.first();
			});

			if (!task) {
				throw new NotFoundError("Task", id);
			}

			span.setAttributes({
				"task.id": id,
				"task.status": task.status,
				"task.priority": task.priority,
			});

			return task;
		});
	}

	async create(data: CreateTaskDTO, context: ServiceContext): Promise<Task> {
		return this.executeWithTracing("create", context, async (span) => {
			const newTask: Task = {
				id: crypto.randomUUID(),
				...data,
				description: data.description || "",
				status: "pending",
				userId: context.userId!,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			await this.executeDatabase("insert", async () => {
				// Mock database insert
				return newTask;
			});

			span.setAttributes({
				"task.id": newTask.id,
				"task.priority": newTask.priority,
			});

			await this.recordEvent("task_created", `Task created: ${newTask.title}`, {
				taskId: newTask.id,
				userId: context.userId,
			});

			return newTask;
		});
	}

	async update(
		id: string,
		data: UpdateTaskDTO,
		context: ServiceContext,
	): Promise<Task> {
		return this.executeWithTracing("update", context, async (span) => {
			const existingTask = await this.getById(id, context);

			const updatedTask: Task = {
				...existingTask,
				...data,
				updatedAt: new Date(),
			};

			await this.executeDatabase("update", async () => {
				// Mock database update
				return updatedTask;
			});

			span.setAttributes({
				"task.id": id,
				"task.updated_fields": Object.keys(data).join(","),
			});

			await this.recordEvent(
				"task_updated",
				`Task updated: ${updatedTask.title}`,
				{
					taskId: id,
					userId: context.userId,
					changes: data,
				},
			);

			return updatedTask;
		});
	}

	async delete(id: string, context: ServiceContext): Promise<void> {
		return this.executeWithTracing("delete", context, async (span) => {
			await this.getById(id, context); // Ensure task exists and user has access

			await this.executeDatabase("delete", async () => {
				// Mock database delete
			});

			span.setAttributes({
				"task.id": id,
			});

			await this.recordEvent("task_deleted", `Task deleted: ${id}`, {
				taskId: id,
				userId: context.userId,
			});
		});
	}

	// Additional business logic methods
	async getByStatus(
		status: Task["status"],
		context: ServiceContext,
	): Promise<Task[]> {
		return this.executeWithTracing("getByStatus", context, async (span) => {
			const queryBuilder = createQueryBuilder<Task>(tasksTable)
				.where(tasksTable.userId, context.userId!)
				.where(tasksTable.status, status)
				.orderBy(tasksTable.priority, "desc");

			const tasks = await queryBuilder.execute();

			span.setAttributes({
				"tasks.status": status,
				"tasks.count": tasks.length,
			});

			return tasks;
		});
	}

	async getHighPriorityTasks(context: ServiceContext): Promise<Task[]> {
		return this.executeWithTracing(
			"getHighPriorityTasks",
			context,
			async (span) => {
				const queryBuilder = createQueryBuilder<Task>(tasksTable)
					.where(tasksTable.userId, context.userId!)
					.where(tasksTable.priority, "high")
					.where(tasksTable.status, "pending")
					.orderBy(tasksTable.createdAt, "asc")
					.limit(10);

				const tasks = await queryBuilder.execute();

				span.setAttributes({
					"tasks.count": tasks.length,
				});

				return tasks;
			},
		);
	}
}

// Helper to create mock NextRequest
function createRequest(
	url: string,
	options: {
		method?: string;
		headers?: Record<string, string>;
		body?: any;
		searchParams?: Record<string, string>;
	} = {},
) {
	const fullUrl = new URL(url, "http://localhost:3000");

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			fullUrl.searchParams.append(key, value);
		});
	}

	const headers = new Headers(options.headers || {});

	const init: RequestInit = {
		method: options.method || "GET",
		headers,
	};

	if (options.body) {
		init.body = JSON.stringify(options.body);
		headers.set("content-type", "application/json");
	}

	const request = new NextRequest(fullUrl, init);

	// Mock methods
	if (options.body) {
		(request as any).json = vi.fn().mockResolvedValue(options.body);
	}

	(request as any).cookies = {
		get: vi.fn((name: string) => {
			if (name === "auth_token" && options.headers?.["x-auth-token"]) {
				return { value: options.headers["x-auth-token"] };
			}
			return undefined;
		}),
	};

	return request;
}

describe("Base API Infrastructure End-to-End Tests", () => {
	let taskService: TaskService;
	const mockUserId = "user-123";

	beforeEach(() => {
		vi.clearAllMocks();
		taskService = new TaskService();

		// Setup mock database responses
		const mockTasks: Task[] = [
			{
				id: "task-1",
				title: "Complete project documentation",
				description: "Write comprehensive docs",
				status: "in_progress",
				priority: "high",
				userId: mockUserId,
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
			},
			{
				id: "task-2",
				title: "Review pull requests",
				description: "Review team PRs",
				status: "pending",
				priority: "medium",
				userId: mockUserId,
				createdAt: new Date("2024-01-03"),
				updatedAt: new Date("2024-01-03"),
			},
		];

		// Mock query chain for database operations
		const mockQueryChain = {
			select: vi.fn().mockReturnThis(),
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			offset: vi.fn().mockReturnThis(),
			then: vi.fn((resolve) => resolve(mockTasks)),
		};

		vi.mocked(db.select).mockReturnValue(mockQueryChain as any);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("GET /api/tasks - List all tasks", () => {
		it("should list tasks with pagination", async () => {
			const handler = BaseAPIHandler.GET(
				async (context) => {
					const queryParams = new URLSearchParams(context.query as any);
					const page = parseInt(queryParams.get("page") || "1");
					const limit = parseInt(queryParams.get("limit") || "10");

					const result = await taskService.getAll(
						{},
						{ page, limit },
						{ ...context, userId: mockUserId },
					);

					return ResponseBuilder.paginated(result.items, {
						page,
						limit,
						total: result.total,
						totalPages: Math.ceil(result.total / limit),
						hasNext: page < Math.ceil(result.total / limit),
						hasPrev: page > 1,
					});
				},
				{ requireAuth: true },
			);

			const request = createRequest("/api/tasks", {
				headers: { "x-auth-token": "valid-token" },
				searchParams: { page: "1", limit: "10" },
			});

			const response = await handler(request);

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				success: true,
				data: expect.any(Array),
				pagination: {
					page: 1,
					limit: 10,
					total: expect.any(Number),
					totalPages: expect.any(Number),
					hasNext: expect.any(Boolean),
					hasPrev: false,
				},
			});

			expect(observability.metrics.httpRequestDuration).toHaveBeenCalled();
			expect(observability.metrics.queryDuration).toHaveBeenCalled();
		});

		it("should filter tasks by status", async () => {
			const handler = BaseAPIHandler.GET(
				async (context) => {
					const status = context.query.status as Task["status"];

					const result = await taskService.getAll(
						{ status },
						{ page: 1, limit: 10 },
						{ ...context, userId: mockUserId },
					);

					return ResponseBuilder.paginated(
						result.items,
						{
							page: 1,
							limit: 10,
							total: result.total,
							totalPages: 1,
							hasNext: false,
							hasPrev: false,
						},
						`Found ${result.total} ${status} tasks`,
					);
				},
				{ requireAuth: true },
			);

			const request = createRequest("/api/tasks", {
				headers: { "x-auth-token": "valid-token" },
				searchParams: { status: "pending" },
			});

			const response = await handler(request);

			expect(response.status).toBe(200);
			expect(response.body.message).toContain("pending tasks");
		});
	});

	describe("POST /api/tasks - Create new task", () => {
		it("should create task with valid data", async () => {
			const handler = BaseAPIHandler.POST(
				async (context) => {
					const body = await BaseAPIHandler.validateBody(
						context as any,
						CreateTaskDTO,
					);

					const task = await taskService.create(body, {
						...context,
						userId: mockUserId,
					});

					return ResponseBuilder.created(task, "Task created successfully");
				},
				{ requireAuth: true },
			);

			const newTaskData = {
				title: "New task to complete",
				description: "This is a new task",
				priority: "high",
			};

			const request = createRequest("/api/tasks", {
				method: "POST",
				headers: { "x-auth-token": "valid-token" },
				body: newTaskData,
			});

			const response = await handler(request);

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				success: true,
				data: expect.objectContaining({
					id: expect.any(String),
					title: newTaskData.title,
					description: newTaskData.description,
					priority: newTaskData.priority,
					status: "pending",
				}),
				message: "Task created successfully",
			});

			expect(observability.events.collector.collectEvent).toHaveBeenCalledWith(
				"task_created",
				expect.any(String),
				expect.any(Object),
				expect.any(Object),
				"api",
				expect.any(Array),
			);
		});

		it("should handle validation errors", async () => {
			const handler = BaseAPIHandler.POST(
				async (context) => {
					const body = await BaseAPIHandler.validateBody(
						context as any,
						CreateTaskDTO,
					);

					const task = await taskService.create(body, {
						...context,
						userId: mockUserId,
					});

					return ResponseBuilder.created(task);
				},
				{ requireAuth: true },
			);

			const invalidData = {
				title: "x", // Too short
				priority: "invalid", // Not in enum
			};

			const request = createRequest("/api/tasks", {
				method: "POST",
				headers: { "x-auth-token": "valid-token" },
				body: invalidData,
			});

			const response = await handler(request);

			expect(response.status).toBe(400);
			expect(response.body).toMatchObject({
				success: false,
				code: "VALIDATION_ERROR",
				statusCode: 400,
			});
		});
	});

	describe("GET /api/tasks/:id - Get task by ID", () => {
		it("should get task by ID", async () => {
			const handler = BaseAPIHandler.GET(
				async (context) => {
					const taskId = context.path.split("/").pop()!;

					const task = await taskService.getById(taskId, {
						...context,
						userId: mockUserId,
					});

					return ResponseBuilder.success(task);
				},
				{ requireAuth: true },
			);

			const request = createRequest("/api/tasks/task-1", {
				headers: { "x-auth-token": "valid-token" },
			});

			const response = await handler(request);

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				success: true,
				data: expect.objectContaining({
					id: "task-1",
					title: expect.any(String),
				}),
			});
		});

		it("should handle not found error", async () => {
			// Mock the query to return null
			const mockQueryChain = {
				select: vi.fn().mockReturnThis(),
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				then: vi.fn((resolve) => resolve([])),
			};
			vi.mocked(db.select).mockReturnValue(mockQueryChain as any);

			const handler = BaseAPIHandler.GET(
				async (context) => {
					const taskId = context.path.split("/").pop()!;

					const task = await taskService.getById(taskId, {
						...context,
						userId: mockUserId,
					});

					return ResponseBuilder.success(task);
				},
				{ requireAuth: true },
			);

			const request = createRequest("/api/tasks/non-existent", {
				headers: { "x-auth-token": "valid-token" },
			});

			const response = await handler(request);

			expect(response.status).toBe(404);
			expect(response.body).toMatchObject({
				success: false,
				code: "NOT_FOUND",
				statusCode: 404,
				error: "Task with id non-existent not found",
			});
		});
	});

	describe("PUT /api/tasks/:id - Update task", () => {
		it("should update task successfully", async () => {
			const handler = BaseAPIHandler.PUT(
				async (context) => {
					const taskId = context.path.split("/").pop()!;
					const body = await BaseAPIHandler.validateBody(
						context as any,
						UpdateTaskDTO,
					);

					const task = await taskService.update(taskId, body, {
						...context,
						userId: mockUserId,
					});

					return ResponseBuilder.updated(task);
				},
				{ requireAuth: true },
			);

			const updateData = {
				status: "completed",
				priority: "low",
			};

			const request = createRequest("/api/tasks/task-1", {
				method: "PUT",
				headers: { "x-auth-token": "valid-token" },
				body: updateData,
			});

			const response = await handler(request);

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				success: true,
				data: expect.objectContaining({
					id: "task-1",
					status: "completed",
					priority: "low",
				}),
				message: "Resource updated successfully",
			});
		});
	});

	describe("DELETE /api/tasks/:id - Delete task", () => {
		it("should delete task successfully", async () => {
			const handler = BaseAPIHandler.DELETE(
				async (context) => {
					const taskId = context.path.split("/").pop()!;

					await taskService.delete(taskId, { ...context, userId: mockUserId });

					return ResponseBuilder.deleted("Task deleted successfully");
				},
				{ requireAuth: true },
			);

			const request = createRequest("/api/tasks/task-1", {
				method: "DELETE",
				headers: { "x-auth-token": "valid-token" },
			});

			const response = await handler(request);

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				success: true,
				data: null,
				message: "Task deleted successfully",
			});
		});
	});

	describe("Complex scenarios", () => {
		it("should handle database errors gracefully", async () => {
			// Mock database error
			vi.mocked(db.select).mockImplementation(() => {
				throw new Error("Database connection lost");
			});

			const handler = BaseAPIHandler.GET(
				async (context) => {
					const result = await taskService.getAll(
						{},
						{ page: 1, limit: 10 },
						{ ...context, userId: mockUserId },
					);

					return ResponseBuilder.success(result);
				},
				{ requireAuth: true },
			);

			const request = createRequest("/api/tasks", {
				headers: { "x-auth-token": "valid-token" },
			});

			const response = await handler(request);

			expect(response.status).toBe(500);
			expect(response.body).toMatchObject({
				success: false,
				code: "DATABASE_ERROR",
				statusCode: 500,
			});
		});

		it("should handle concurrent requests", async () => {
			const handler = BaseAPIHandler.GET(
				async (context) => {
					const tasks = await taskService.getHighPriorityTasks({
						...context,
						userId: mockUserId,
					});

					return ResponseBuilder.success(
						tasks,
						`Found ${tasks.length} high priority tasks`,
					);
				},
				{ requireAuth: true },
			);

			const requests = Array(5)
				.fill(null)
				.map(() =>
					createRequest("/api/tasks/high-priority", {
						headers: { "x-auth-token": "valid-token" },
					}),
				);

			const responses = await Promise.all(requests.map((req) => handler(req)));

			responses.forEach((response) => {
				expect(response.status).toBe(200);
				expect(response.body.success).toBe(true);
			});

			// Verify metrics were recorded for all requests
			expect(observability.metrics.httpRequestDuration).toHaveBeenCalledTimes(
				5,
			);
		});

		it("should maintain tracing context through service calls", async () => {
			const handler = BaseAPIHandler.POST(
				async (context) => {
					// Create multiple tasks in a batch
					const tasks = await Promise.all([
						taskService.create(
							{ title: "Task 1", priority: "high" },
							{ ...context, userId: mockUserId },
						),
						taskService.create(
							{ title: "Task 2", priority: "medium" },
							{ ...context, userId: mockUserId },
						),
						taskService.create(
							{ title: "Task 3", priority: "low" },
							{ ...context, userId: mockUserId },
						),
					]);

					return ResponseBuilder.batch(
						tasks.map((task) => ({ success: true, data: task })),
						"Batch task creation completed",
					);
				},
				{ requireAuth: true },
			);

			const request = createRequest("/api/tasks/batch", {
				method: "POST",
				headers: { "x-auth-token": "valid-token" },
				body: {},
			});

			const response = await handler(request);

			expect(response.status).toBe(200);
			expect(response.body.data.succeeded).toBe(3);
			expect(response.body.data.failed).toBe(0);

			// Verify spans were created for each operation
			expect(mockTracer.startSpan).toHaveBeenCalledWith("tasks.create");
			expect(mockSpan.end).toHaveBeenCalled();
		});
	});

	describe("Performance and reliability", () => {
		it("should handle timeouts gracefully", async () => {
			vi.useFakeTimers();

			const handler = BaseAPIHandler.GET(
				async (context) => {
					// Simulate slow operation
					await new Promise((resolve) => setTimeout(resolve, 5000));

					const result = await taskService.getAll(
						{},
						{ page: 1, limit: 10 },
						{ ...context, userId: mockUserId },
					);

					return ResponseBuilder.success(result);
				},
				{ requireAuth: true },
			);

			const request = createRequest("/api/tasks", {
				headers: { "x-auth-token": "valid-token" },
			});

			const responsePromise = handler(request);

			// Fast-forward time
			vi.advanceTimersByTime(5000);

			const response = await responsePromise;

			expect(response.status).toBe(200);

			vi.useRealTimers();
		});

		it("should measure performance accurately", async () => {
			const handler = BaseAPIHandler.GET(
				async (context) => {
					// Simulate some processing time
					await new Promise((resolve) => setTimeout(resolve, 50));

					const result = await taskService.getAll(
						{},
						{ page: 1, limit: 10 },
						{ ...context, userId: mockUserId },
					);

					return ResponseBuilder.success(result);
				},
				{ requireAuth: true },
			);

			const request = createRequest("/api/tasks", {
				headers: { "x-auth-token": "valid-token" },
			});

			const startTime = Date.now();
			await handler(request);
			const endTime = Date.now();

			const httpDurationCall = (
				observability.metrics.httpRequestDuration as any
			).mock.calls[0];
			const recordedDuration = httpDurationCall[0];

			expect(recordedDuration).toBeGreaterThanOrEqual(50);
			expect(recordedDuration).toBeLessThanOrEqual(endTime - startTime + 10);
		});
	});
});
