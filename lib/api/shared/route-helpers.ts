/**
 * Shared API Route Helpers - Eliminates Route Handler Duplication
 *
 * Consolidates the repeated patterns found across API routes including:
 * - Parameter validation and parsing
 * - Request body handling
 * - Response formatting
 * - Tracing and observability setup
 * - Cache header management
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { checkETag, generateETag, notModifiedResponse, withCache } from "@/lib/api/cache-headers";
import { createApiErrorResponse, createApiSuccessResponse } from "@/src/schemas/api-routes";
import {
	handleAPIError,
	validateParams,
	validateRequestBody,
	withErrorHandling,
} from "./error-handlers";
import { observability } from "@/lib/observability";

// Common route parameter schemas
export const CommonParamSchemas = {
	id: z.object({
		id: z.string().min(1, "ID is required"),
	}),

	userId: z.object({
		userId: z.string().min(1, "User ID is required"),
	}),

	taskId: z.object({
		taskId: z.string().min(1, "Task ID is required"),
	}),

	pagination: z.object({
		page: z.coerce.number().min(1).default(1),
		limit: z.coerce.number().min(1).max(100).default(20),
	}),

	search: z.object({
		q: z.string().optional(),
		filter: z.string().optional(),
		sort: z.string().optional(),
	}),
};

// Route handler configuration
export interface RouteConfig {
	serviceName?: string;
	enableTracing?: boolean;
	enableCaching?: boolean;
	enableMetrics?: boolean;
	cacheMaxAge?: number;
	requireAuth?: boolean;
}

const DEFAULT_ROUTE_CONFIG: RouteConfig = {
	serviceName: "api",
	enableTracing: true,
	enableCaching: false,
	enableMetrics: true,
	cacheMaxAge: 300, // 5 minutes
	requireAuth: false,
};

/**
 * Route handler factory that eliminates boilerplate
 * Provides consistent structure for GET/POST/PUT/DELETE handlers
 */
export function createRouteHandler<TParams = any, TBody = any, TResponse = any>(
	config: RouteConfig & {
		method: "GET" | "POST" | "PUT" | "DELETE";
		paramSchema?: z.ZodSchema<TParams>;
		bodySchema?: z.ZodSchema<TBody>;
		handler: (params: {
			params: TParams;
			body?: TBody;
			request: NextRequest;
		}) => Promise<TResponse>;
	}
) {
	const finalConfig = { ...DEFAULT_ROUTE_CONFIG, ...config };

	return withErrorHandling(
		async (request: NextRequest, context?: { params: Promise<any> }) => {
			const tracer = finalConfig.enableTracing ? trace.getTracer(finalConfig.serviceName!) : null;

			const span = tracer?.startSpan(`${config.method.toLowerCase()}_${finalConfig.serviceName}`);
			const startTime = Date.now();

			try {
				// Parse and validate parameters
				let validatedParams: TParams = {} as TParams;
				if (config.paramSchema && context?.params) {
					const resolvedParams = await context.params;
					validatedParams = validateParams(config.paramSchema, resolvedParams);
				}

				// Parse and validate request body for non-GET requests
				let validatedBody: TBody | undefined;
				if (config.bodySchema && config.method !== "GET") {
					validatedBody = await validateRequestBody(config.bodySchema, request);
				}

				// Execute the handler
				const result = await config.handler({
					params: validatedParams,
					body: validatedBody,
					request,
				});

				const duration = Date.now() - startTime;

				// Record metrics
				if (finalConfig.enableMetrics) {
					observability.metrics.queryDuration.record(duration, {
						method: config.method,
						service: finalConfig.serviceName,
					});
				}

				// Set span attributes
				span?.setAttributes({
					"http.method": config.method,
					"http.status_code": 200,
					"request.duration": duration,
					"service.name": finalConfig.serviceName,
				});

				// Handle caching for GET requests
				if (config.method === "GET" && finalConfig.enableCaching) {
					const etag = generateETag(result);

					if (checkETag(request, etag)) {
						return notModifiedResponse(etag);
					}

					const responseData = createApiSuccessResponse(result);
					return withCache.generic(responseData, finalConfig.cacheMaxAge);
				}

				// Return success response
				const responseData = createApiSuccessResponse(result, getSuccessMessage(config.method));

				return NextResponse.json(responseData);
			} catch (error) {
				span?.recordException(error as Error);
				span?.setStatus({ code: SpanStatusCode.ERROR });

				// Record error metrics
				if (finalConfig.enableMetrics) {
					observability.metrics.errorRate.record(1, {
						method: config.method,
						service: finalConfig.serviceName,
					});
				}

				throw error; // Re-throw to be handled by withErrorHandling
			} finally {
				span?.end();
			}
		},
		{ serviceName: finalConfig.serviceName }
	);
}

/**
 * Specialized route handlers for common patterns
 */

// GET single resource by ID
export function createGetByIdHandler<T>(config: {
	serviceName: string;
	getById: (id: string) => Promise<T>;
	enableCaching?: boolean;
}) {
	return createRouteHandler({
		method: "GET",
		serviceName: config.serviceName,
		paramSchema: CommonParamSchemas.id,
		enableCaching: config.enableCaching ?? true,
		handler: async ({ params }) => {
			return await config.getById(params.id);
		},
	});
}

// GET list with pagination and filtering
export function createGetListHandler<T>(config: {
	serviceName: string;
	getList: (options: {
		page: number;
		limit: number;
		search?: string;
		filter?: string;
		sort?: string;
	}) => Promise<{ items: T[]; total: number; page: number; limit: number }>;
	enableCaching?: boolean;
}) {
	return createRouteHandler({
		method: "GET",
		serviceName: config.serviceName,
		enableCaching: config.enableCaching ?? true,
		handler: async ({ request }) => {
			const url = new URL(request.url);
			const pagination = CommonParamSchemas.pagination.parse({
				page: url.searchParams.get("page"),
				limit: url.searchParams.get("limit"),
			});
			const search = CommonParamSchemas.search.parse({
				q: url.searchParams.get("q"),
				filter: url.searchParams.get("filter"),
				sort: url.searchParams.get("sort"),
			});

			return await config.getList({
				...pagination,
				search: search.q,
				filter: search.filter,
				sort: search.sort,
			});
		},
	});
}

// POST create resource
export function createPostHandler<TBody, TResponse>(config: {
	serviceName: string;
	bodySchema: z.ZodSchema<TBody>;
	create: (data: TBody) => Promise<TResponse>;
}) {
	return createRouteHandler({
		method: "POST",
		serviceName: config.serviceName,
		bodySchema: config.bodySchema,
		handler: async ({ body }) => {
			return await config.create(body!);
		},
	});
}

// PUT update resource
export function createPutHandler<TBody, TResponse>(config: {
	serviceName: string;
	bodySchema: z.ZodSchema<TBody>;
	update: (id: string, data: TBody) => Promise<TResponse>;
}) {
	return createRouteHandler({
		method: "PUT",
		serviceName: config.serviceName,
		paramSchema: CommonParamSchemas.id,
		bodySchema: config.bodySchema,
		handler: async ({ params, body }) => {
			return await config.update(params.id, body!);
		},
	});
}

// DELETE resource
export function createDeleteHandler<TResponse>(config: {
	serviceName: string;
	delete: (id: string) => Promise<TResponse>;
}) {
	return createRouteHandler({
		method: "DELETE",
		serviceName: config.serviceName,
		paramSchema: CommonParamSchemas.id,
		handler: async ({ params }) => {
			return await config.delete(params.id);
		},
	});
}

/**
 * CRUD route factory - creates all CRUD operations at once
 */
export function createCRUDRoutes<TModel, TCreateData, TUpdateData>(config: {
	serviceName: string;
	createSchema: z.ZodSchema<TCreateData>;
	updateSchema: z.ZodSchema<TUpdateData>;
	service: {
		getById: (id: string) => Promise<TModel>;
		getList: (
			options: any
		) => Promise<{ items: TModel[]; total: number; page: number; limit: number }>;
		create: (data: TCreateData) => Promise<TModel>;
		update: (id: string, data: TUpdateData) => Promise<TModel>;
		delete: (id: string) => Promise<TModel>;
	};
	enableCaching?: boolean;
}) {
	return {
		GET: createGetByIdHandler({
			serviceName: config.serviceName,
			getById: config.service.getById,
			enableCaching: config.enableCaching,
		}),

		// For list endpoints (typically on parent route)
		GET_LIST: createGetListHandler({
			serviceName: config.serviceName,
			getList: config.service.getList,
			enableCaching: config.enableCaching,
		}),

		POST: createPostHandler({
			serviceName: config.serviceName,
			bodySchema: config.createSchema,
			create: config.service.create,
		}),

		PUT: createPutHandler({
			serviceName: config.serviceName,
			bodySchema: config.updateSchema,
			update: config.service.update,
		}),

		DELETE: createDeleteHandler({
			serviceName: config.serviceName,
			delete: config.service.delete,
		}),
	};
}

/**
 * Utility functions
 */

function getSuccessMessage(method: string): string {
	switch (method) {
		case "GET":
			return "Retrieved successfully";
		case "POST":
			return "Created successfully";
		case "PUT":
			return "Updated successfully";
		case "DELETE":
			return "Deleted successfully";
		default:
			return "Operation completed successfully";
	}
}

/**
 * Query parameter parsers
 */
export const QueryParsers = {
	/**
	 * Parse pagination parameters from URL
	 */
	pagination: (request: NextRequest) => {
		const url = new URL(request.url);
		return CommonParamSchemas.pagination.parse({
			page: url.searchParams.get("page"),
			limit: url.searchParams.get("limit"),
		});
	},

	/**
	 * Parse search parameters from URL
	 */
	search: (request: NextRequest) => {
		const url = new URL(request.url);
		return CommonParamSchemas.search.parse({
			q: url.searchParams.get("q"),
			filter: url.searchParams.get("filter"),
			sort: url.searchParams.get("sort"),
		});
	},

	/**
	 * Parse boolean parameter from URL
	 */
	boolean: (request: NextRequest, param: string, defaultValue = false) => {
		const url = new URL(request.url);
		const value = url.searchParams.get(param);
		if (value === null) return defaultValue;
		return value === "true" || value === "1";
	},

	/**
	 * Parse array parameter from URL (comma-separated)
	 */
	array: (request: NextRequest, param: string, defaultValue: string[] = []) => {
		const url = new URL(request.url);
		const value = url.searchParams.get(param);
		if (!value) return defaultValue;
		return value
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
	},
};

/**
 * Response builders for consistent API responses
 */
export const ResponseBuilders = {
	success: <T>(data: T, message?: string) =>
		NextResponse.json(createApiSuccessResponse(data, message)),

	created: <T>(data: T, message = "Created successfully") =>
		NextResponse.json(createApiSuccessResponse(data, message), { status: 201 }),

	noContent: () => new NextResponse(null, { status: 204 }),

	paginated: <T>(
		items: T[],
		total: number,
		page: number,
		limit: number,
		message = "Retrieved successfully"
	) =>
		NextResponse.json(
			createApiSuccessResponse(
				{
					items,
					pagination: {
						total,
						page,
						limit,
						pages: Math.ceil(total / limit),
						hasNext: page * limit < total,
						hasPrev: page > 1,
					},
				},
				message
			)
		),
};

// Export all utilities
export { withErrorHandling, handleAPIError, validateParams, validateRequestBody };
