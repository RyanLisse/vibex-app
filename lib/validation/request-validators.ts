/**
 * Request Validation Utilities
 *
 * Eliminates duplicate validation patterns across API routes
 * and provides reusable request validation functions.
 */

import type { NextRequest } from "next/server";
import { z } from "zod";

// Common field validators
export const CommonValidators = {
	id: z.string().min(1, "ID is required"),
	email: z.string().email("Invalid email format"),
	url: z.string().url("Invalid URL format"),
	userId: z.string().min(1, "User ID is required"),
	taskId: z.string().min(1, "Task ID is required"),

	// Pagination
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),

	// Search and filters
	search: z.string().optional(),
	status: z.string().optional(),
	priority: z.enum(["low", "medium", "high"]).optional(),

	// Sort parameters
	sortBy: z.string().default("created_at"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
};

// Common composite schemas
export const RequestSchemas = {
	// Pagination query
	paginationQuery: z.object({
		page: CommonValidators.page,
		limit: CommonValidators.limit,
	}),

	// Search query
	searchQuery: z.object({
		search: CommonValidators.search,
		sortBy: CommonValidators.sortBy,
		sortOrder: CommonValidators.sortOrder,
	}),

	// Task filters
	taskFilters: z.object({
		status: CommonValidators.status,
		priority: CommonValidators.priority,
		userId: CommonValidators.userId.optional(),
	}),
};

/**
 * Extract and validate query parameters from request
 */
export function validateQueryParams<T>(request: NextRequest, schema: z.ZodSchema<T>): T {
	const { searchParams } = new URL(request.url);
	const queryParams = Object.fromEntries(searchParams.entries());
	return schema.parse(queryParams);
}

/**
 * Extract and validate JSON body from request
 */
export async function validateRequestBody<T>(
	request: NextRequest,
	schema: z.ZodSchema<T>
): Promise<T> {
	const body = await request.json();
	return schema.parse(body);
}

/**
 * Validate pagination parameters
 */
export function validatePagination(request: NextRequest) {
	return validateQueryParams(request, RequestSchemas.paginationQuery);
}

/**
 * Validate search parameters
 */
export function validateSearch(request: NextRequest) {
	return validateQueryParams(request, RequestSchemas.searchQuery);
}

/**
 * Validate task filter parameters
 */
export function validateTaskFilters(request: NextRequest) {
	return validateQueryParams(request, RequestSchemas.taskFilters);
}

// Performance monitoring schemas
export const PerformanceSchemas = {
	// Performance metrics query
	metricsQuery: z.object({
		timeRange: z.enum(["5m", "1h", "24h", "7d"]).default("1h"),
		includeDetails: z.boolean().default(false),
		includeHistorical: z.boolean().default(false),
	}),

	// Analysis request
	analysisRequest: z.object({
		includeRecommendations: z.boolean().default(true),
		analyzeSlowQueries: z.boolean().default(true),
		includeTrends: z.boolean().default(false),
		maxResults: z.coerce.number().min(1).max(1000).default(100),
	}),

	// Benchmark request
	benchmarkRequest: z.object({
		suites: z.array(z.string()).optional(),
		compareWithBaseline: z.boolean().default(true),
		iterations: z.coerce.number().min(1).max(10).default(1),
		warmup: z.boolean().default(true),
	}),
};

// Task API schemas
export const TaskSchemas = {
	// Task route parameters
	taskParams: z.object({
		id: CommonValidators.taskId,
	}),

	// Task update body
	taskUpdateBody: z.object({
		title: z.string().min(1, "Title is required").max(255, "Title too long").optional(),
		description: z.string().max(1000, "Description too long").optional(),
		status: z.enum(["todo", "in_progress", "review", "completed", "blocked"]).optional(),
		priority: z.enum(["high", "medium", "low"]).optional(),
		assigneeId: z.string().uuid("Invalid assignee ID").optional(),
		dueDate: z.string().datetime().optional(),
		tags: z.array(z.string()).optional(),
	}),

	// Task query parameters
	taskQuery: z.object({
		userId: CommonValidators.userId.optional(),
		projectId: z.string().optional(),
		assignee: z.string().optional(),
		...RequestSchemas.paginationQuery.shape,
		...RequestSchemas.searchQuery.shape,
		...RequestSchemas.taskFilters.shape,
	}),
};

// Kanban schemas
export const KanbanSchemas = {
	// Kanban move request
	moveTask: z.object({
		taskId: CommonValidators.taskId,
		fromColumn: z.enum(["todo", "in_progress", "review", "completed"]),
		toColumn: z.enum(["todo", "in_progress", "review", "completed"]),
		newOrder: z.coerce.number().min(0).optional(),
		validateLimits: z.boolean().default(true),
	}),

	// Kanban query parameters
	kanbanQuery: z.object({
		userId: CommonValidators.userId.optional(),
		projectId: z.string().optional(),
		includeMetrics: z.boolean().default(true),
		includeArchived: z.boolean().default(false),
	}),
};

/**
 * Validate performance metrics parameters
 */
export function validatePerformanceMetrics(request: NextRequest) {
	return validateQueryParams(request, PerformanceSchemas.metricsQuery);
}

/**
 * Validate analysis request body
 */
export async function validateAnalysisRequest(request: NextRequest) {
	return validateRequestBody(request, PerformanceSchemas.analysisRequest);
}

/**
 * Validate benchmark request body
 */
export async function validateBenchmarkRequest(request: NextRequest) {
	return validateRequestBody(request, PerformanceSchemas.benchmarkRequest);
}

/**
 * Validate task parameters
 */
export function validateTaskParams(params: Record<string, string | string[]>) {
	return TaskSchemas.taskParams.parse(params);
}

/**
 * Validate task update body
 */
export async function validateTaskUpdateBody(request: NextRequest) {
	return validateRequestBody(request, TaskSchemas.taskUpdateBody);
}

/**
 * Validate task query parameters
 */
export function validateTaskQuery(request: NextRequest) {
	return validateQueryParams(request, TaskSchemas.taskQuery);
}

/**
 * Validate kanban move request
 */
export async function validateKanbanMove(request: NextRequest) {
	return validateRequestBody(request, KanbanSchemas.moveTask);
}

/**
 * Validate kanban query parameters
 */
export function validateKanbanQuery(request: NextRequest) {
	return validateQueryParams(request, KanbanSchemas.kanbanQuery);
}

/**
 * Error formatting utilities
 */
export class ValidationErrorFormatter {
	/**
	 * Format Zod error for API response
	 */
	static formatZodError(error: z.ZodError) {
		return error.issues.map((issue) => ({
			field: issue.path.join("."),
			message: issue.message,
			code: issue.code,
		}));
	}

	/**
	 * Get first error message from validation result
	 */
	static getFirstErrorMessage(error: z.ZodError | Error): string {
		if (error instanceof z.ZodError) {
			return error.issues[0]?.message || "Validation failed";
		}
		return error.message || "Validation failed";
	}
}

/**
 * Route parameter validation helper
 */
export function validateRouteParams<T>(
	params: Record<string, string | string[]>,
	schema: z.ZodSchema<T>
): T {
	return schema.parse(params);
}

/**
 * Comprehensive request validation utility
 */
export async function validateCompleteRequest<TParams = any, TQuery = any, TBody = any>(
	request: NextRequest,
	params: Record<string, string | string[]>,
	schemas: {
		params?: z.ZodSchema<TParams>;
		query?: z.ZodSchema<TQuery>;
		body?: z.ZodSchema<TBody>;
	}
): Promise<{
	params?: TParams;
	query?: TQuery;
	body?: TBody;
}> {
	const result: any = {};

	if (schemas.params) {
		result.params = validateRouteParams(params, schemas.params);
	}

	if (schemas.query) {
		result.query = validateQueryParams(request, schemas.query);
	}

	if (schemas.body) {
		result.body = await validateRequestBody(request, schemas.body);
	}

	return result;
}
