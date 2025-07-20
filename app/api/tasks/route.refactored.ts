// Force dynamic rendering to avoid build-time issues
<<<<<<< HEAD
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
=======
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
>>>>>>> ryan-lisse/review-this-pr

/**
 * Tasks API Route - Refactored Version
 *
 * Enhanced API route using base utilities for consistency and reduced duplication
 */

<<<<<<< HEAD
import type { NextRequest } from "next/server";
import { ulid } from "ulid";
import { z } from "zod";
import { db } from "@/db/config";
import { tasks } from "@/db/schema";
import {
	BaseAPIError,
	InternalServerError,
	NotFoundError,
} from "@/lib/api/base-error";
import { BaseAPIHandler } from "@/lib/api/base-handler";
import { BaseAPIService } from "@/lib/api/base-service";
import { QueryBuilder } from "@/lib/api/query-builder";
import { ResponseBuilder } from "@/lib/api/response-builder";
import { CreateTaskSchema, UpdateTaskSchema } from "@/src/schemas/api-routes";

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

// Service class extending BaseAPIService
class TasksService extends BaseAPIService {
	protected static serviceName = "tasks-api";

	/**
	 * Get tasks with filtering and pagination
	 */
	static async getTasks(params: z.infer<typeof GetTasksQuerySchema>) {
		return TasksService.withTracing("getTasks", async () => {
			// Use QueryBuilder for consistent query construction
			const filters = {
				status: params.status,
				priority: params.priority,
				assignee: params.assignee,
				userId: params.userId,
				search: params.search,
			};

			const result = await QueryBuilder.executePaginatedQuery<
				typeof tasks.$inferSelect
			>(db, tasks, {
				filters,
				searchFields: ["title", "description"],
				sortBy: params.sortBy,
				sortOrder: params.sortOrder,
				page: params.page,
				limit: params.limit,
				defaultSort: { field: "created_at", order: "desc" },
			});

			// Log operation for audit trail
			await TasksService.logOperation(
				"query_tasks",
				"tasks",
				"multiple",
				params.userId,
				{
					resultCount: result.data.length,
					filters: params,
				},
			);

			return result;
		});
	}

	/**
	 * Create a new task
	 */
	static async createTask(taskData: z.infer<typeof CreateTaskSchema>) {
		return TasksService.withTracing(
			"createTask",
			async () => {
				return TasksService.withTransaction(async (tx) => {
					const newTask = {
						id: ulid(),
						...taskData,
						createdAt: new Date(),
						updatedAt: new Date(),
					};

					const [createdTask] = await tx
						.insert(tasks)
						.values(newTask)
						.returning();

					// Log operation
					await TasksService.logOperation(
						"create_task",
						"task",
						createdTask.id,
						createdTask.userId,
						{
							title: createdTask.title,
						},
					);

					return createdTask;
				});
			},
			{ "task.title": taskData.title },
		);
	}

	/**
	 * Update a task
	 */
	static async updateTask(
		id: string,
		updates: z.infer<typeof UpdateTaskSchema>,
	) {
		return TasksService.withTracing(
			"updateTask",
			async () => {
				return TasksService.withTransaction(async (tx) => {
					const [updatedTask] = await tx
						.update(tasks)
						.set({
							...updates,
							updatedAt: new Date(),
							...(updates.status === "completed" && {
								completedAt: new Date(),
							}),
						})
						.where(eq(tasks.id, id))
						.returning();

					if (!updatedTask) {
						throw new NotFoundError("Task", id);
					}

					// Log operation
					await TasksService.logOperation(
						"update_task",
						"task",
						updatedTask.id,
						updatedTask.userId,
						{
							updates,
						},
					);

					return updatedTask;
				});
			},
			{ "task.id": id },
		);
	}

	/**
	 * Delete a task
	 */
	static async deleteTask(id: string) {
		return TasksService.withTracing(
			"deleteTask",
			async () => {
				return TasksService.withTransaction(async (tx) => {
					const [deletedTask] = await tx
						.delete(tasks)
						.where(eq(tasks.id, id))
						.returning();

					if (!deletedTask) {
						throw new NotFoundError("Task", id);
					}

					// Log operation
					await TasksService.logOperation(
						"delete_task",
						"task",
						deletedTask.id,
						deletedTask.userId,
						{
							title: deletedTask.title,
						},
					);

					return deletedTask;
				});
			},
			{ "task.id": id },
		);
	}
=======
import { NextRequest } from 'next/server'
import { ulid } from 'ulid'
import { z } from 'zod'
import { db } from '@/db/config'
import { tasks } from '@/db/schema'
import { BaseAPIError, NotFoundError, InternalServerError } from '@/lib/api/base-error'
import { BaseAPIService } from '@/lib/api/base-service'
import { BaseAPIHandler } from '@/lib/api/base-handler'
import { QueryBuilder } from '@/lib/api/query-builder'
import { ResponseBuilder } from '@/lib/api/response-builder'
import { CreateTaskSchema, UpdateTaskSchema } from '@/src/schemas/api-routes'

// Request validation schemas
const GetTasksQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignee: z.string().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['created_at', 'updated_at', 'title', 'priority', 'due_date'])
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  userId: z.string().optional(),
})

// Service class extending BaseAPIService
class TasksService extends BaseAPIService {
  protected static serviceName = 'tasks-api'

  /**
   * Get tasks with filtering and pagination
   */
  static async getTasks(params: z.infer<typeof GetTasksQuerySchema>) {
    return this.withTracing('getTasks', async () => {
      // Use QueryBuilder for consistent query construction
      const filters = {
        status: params.status,
        priority: params.priority,
        assignee: params.assignee,
        userId: params.userId,
        search: params.search,
      }

      const result = await QueryBuilder.executePaginatedQuery<typeof tasks.$inferSelect>(
        db,
        tasks,
        {
          filters,
          searchFields: ['title', 'description'],
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          page: params.page,
          limit: params.limit,
          defaultSort: { field: 'created_at', order: 'desc' },
        }
      )

      // Log operation for audit trail
      await this.logOperation('query_tasks', 'tasks', 'multiple', params.userId, {
        resultCount: result.data.length,
        filters: params,
      })

      return result
    })
  }

  /**
   * Create a new task
   */
  static async createTask(taskData: z.infer<typeof CreateTaskSchema>) {
    return this.withTracing(
      'createTask',
      async () => {
        return this.withTransaction(async (tx) => {
          const newTask = {
            id: ulid(),
            ...taskData,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          const [createdTask] = await tx.insert(tasks).values(newTask).returning()

          // Log operation
          await this.logOperation('create_task', 'task', createdTask.id, createdTask.userId, {
            title: createdTask.title,
          })

          return createdTask
        })
      },
      { 'task.title': taskData.title }
    )
  }

  /**
   * Update a task
   */
  static async updateTask(id: string, updates: z.infer<typeof UpdateTaskSchema>) {
    return this.withTracing(
      'updateTask',
      async () => {
        return this.withTransaction(async (tx) => {
          const [updatedTask] = await tx
            .update(tasks)
            .set({
              ...updates,
              updatedAt: new Date(),
              ...(updates.status === 'completed' && { completedAt: new Date() }),
            })
            .where(eq(tasks.id, id))
            .returning()

          if (!updatedTask) {
            throw new NotFoundError('Task', id)
          }

          // Log operation
          await this.logOperation('update_task', 'task', updatedTask.id, updatedTask.userId, {
            updates,
          })

          return updatedTask
        })
      },
      { 'task.id': id }
    )
  }

  /**
   * Delete a task
   */
  static async deleteTask(id: string) {
    return this.withTracing(
      'deleteTask',
      async () => {
        return this.withTransaction(async (tx) => {
          const [deletedTask] = await tx.delete(tasks).where(eq(tasks.id, id)).returning()

          if (!deletedTask) {
            throw new NotFoundError('Task', id)
          }

          // Log operation
          await this.logOperation('delete_task', 'task', deletedTask.id, deletedTask.userId, {
            title: deletedTask.title,
          })

          return deletedTask
        })
      },
      { 'task.id': id }
    )
  }
>>>>>>> ryan-lisse/review-this-pr
}

/**
 * GET /api/tasks - Get tasks with filtering and pagination
 */
<<<<<<< HEAD
export const GET = BaseAPIHandler.createHandler(
	{ schema: GetTasksQuerySchema },
	async (params) => {
		const result = await TasksService.getTasks(params);
		return ResponseBuilder.paginated(
			result.data,
			result.pagination,
			"Tasks retrieved successfully",
		);
	},
);
=======
export const GET = BaseAPIHandler.createHandler({ schema: GetTasksQuerySchema }, async (params) => {
  const result = await TasksService.getTasks(params)
  return ResponseBuilder.paginated(result.data, result.pagination, 'Tasks retrieved successfully')
})
>>>>>>> ryan-lisse/review-this-pr

/**
 * POST /api/tasks - Create a new task
 */
<<<<<<< HEAD
export const POST = BaseAPIHandler.createHandler(
	{ schema: CreateTaskSchema },
	async (params) => {
		const task = await TasksService.createTask(params);
		return ResponseBuilder.created(task, "Task created successfully");
	},
);
=======
export const POST = BaseAPIHandler.createHandler({ schema: CreateTaskSchema }, async (params) => {
  const task = await TasksService.createTask(params)
  return ResponseBuilder.created(task, 'Task created successfully')
})
>>>>>>> ryan-lisse/review-this-pr

/**
 * PUT /api/tasks/[id] - Update a task
 * Note: This would typically be in a separate [id]/route.ts file
 */
export async function PUT(request: NextRequest) {
<<<<<<< HEAD
	try {
		// Extract ID from URL
		const url = new URL(request.url);
		const pathParts = url.pathname.split("/");
		const id = pathParts[pathParts.length - 1];

		if (!id) {
			return ResponseBuilder.badRequest("Task ID is required");
		}

		// Parse and validate request body
		const body = await request.json();
		const validatedData = UpdateTaskSchema.parse(body);

		// Update task
		const task = await TasksService.updateTask(id, validatedData);

		return ResponseBuilder.success(task, "Task updated successfully");
	} catch (error) {
		return BaseAPIHandler.handleError(error);
	}
=======
  try {
    // Extract ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const id = pathParts[pathParts.length - 1]

    if (!id) {
      return ResponseBuilder.badRequest('Task ID is required')
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = UpdateTaskSchema.parse(body)

    // Update task
    const task = await TasksService.updateTask(id, validatedData)

    return ResponseBuilder.success(task, 'Task updated successfully')
  } catch (error) {
    return BaseAPIHandler.handleError(error)
  }
>>>>>>> ryan-lisse/review-this-pr
}

/**
 * DELETE /api/tasks/[id] - Delete a task
 * Note: This would typically be in a separate [id]/route.ts file
 */
export async function DELETE(request: NextRequest) {
<<<<<<< HEAD
	try {
		// Extract ID from URL
		const url = new URL(request.url);
		const pathParts = url.pathname.split("/");
		const id = pathParts[pathParts.length - 1];

		if (!id) {
			return ResponseBuilder.badRequest("Task ID is required");
		}

		// Delete task
		await TasksService.deleteTask(id);

		return ResponseBuilder.noContent();
	} catch (error) {
		return BaseAPIHandler.handleError(error);
	}
=======
  try {
    // Extract ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const id = pathParts[pathParts.length - 1]

    if (!id) {
      return ResponseBuilder.badRequest('Task ID is required')
    }

    // Delete task
    await TasksService.deleteTask(id)

    return ResponseBuilder.noContent()
  } catch (error) {
    return BaseAPIHandler.handleError(error)
  }
>>>>>>> ryan-lisse/review-this-pr
}
