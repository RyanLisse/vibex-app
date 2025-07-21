/**
 * Task Query Utilities
 *
 * Breaks down complex getTasks function into smaller, focused utilities
 * to reduce complexity from 20 to under 15 while maintaining functionality.
 */

import { and, asc, desc, eq, like } from "drizzle-orm";
import { z } from "zod";
import { tasks } from "@/db/schema";

// Query parameters schema
export const GetTasksQuerySchema = z.object({
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

export type TaskQueryParams = z.infer<typeof GetTasksQuerySchema>;

export interface TaskQueryResult {
	tasks: any[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

/**
 * Build query conditions from parameters
 */
export function buildQueryConditions(params: TaskQueryParams) {
	const conditions = [];

	if (params.status) {
		conditions.push(eq(tasks.status, params.status as any));
	}

	if (params.priority) {
		conditions.push(eq(tasks.priority, params.priority as any));
	}

	if (params.userId) {
		conditions.push(eq(tasks.userId, params.userId));
	}

	if (params.search) {
		conditions.push(like(tasks.title, `%${params.search}%`));
	}

	return conditions;
}

/**
 * Build sort order clause
 */
export function buildSortOrder(params: TaskQueryParams) {
	const { sortBy, sortOrder } = params;

	switch (sortBy) {
		case "created_at":
			return sortOrder === "asc" ? asc(tasks.createdAt) : desc(tasks.createdAt);
		case "updated_at":
			return sortOrder === "asc" ? asc(tasks.updatedAt) : desc(tasks.updatedAt);
		case "title":
			return sortOrder === "asc" ? asc(tasks.title) : desc(tasks.title);
		case "priority":
			return sortOrder === "asc" ? asc(tasks.priority) : desc(tasks.priority);
		default:
			return desc(tasks.createdAt);
	}
}

/**
 * Calculate pagination values
 */
export function calculatePagination(params: TaskQueryParams) {
	return {
		offset: (params.page - 1) * params.limit,
		limit: params.limit,
	};
}

/**
 * Build pagination metadata
 */
export function buildPaginationMetadata(
	params: TaskQueryParams,
	totalCount: number,
): TaskQueryResult["pagination"] {
	return {
		page: params.page,
		limit: params.limit,
		total: totalCount,
		totalPages: Math.ceil(totalCount / params.limit),
	};
}

/**
 * Build WHERE clause for query
 */
export function buildWhereClause(conditions: any[]) {
	return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Query builder orchestrator - reduced from complexity 20 to ~6
 */
export function buildTaskQuery(params: TaskQueryParams) {
	const conditions = buildQueryConditions(params);
	const sortOrder = buildSortOrder(params);
	const pagination = calculatePagination(params);
	const whereClause = buildWhereClause(conditions);

	return {
		conditions,
		sortOrder,
		pagination,
		whereClause,
		buildPagination: (totalCount: number) =>
			buildPaginationMetadata(params, totalCount),
	};
}
