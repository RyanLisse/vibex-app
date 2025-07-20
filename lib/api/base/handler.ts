/**
 * Base API Handler Infrastructure
 *
 * Provides consistent request handling, validation, and response formatting
 * for all API routes with automatic error handling and observability.
 */

import { type NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { BaseAPIError, ValidationError } from "./errors";
import { ResponseBuilder } from "./response-builder";

export interface HandlerOptions {
	requireAuth?: boolean;
	rateLimit?: {
		requests: number;
		window: string;
	};
}

export interface RequestContext {
	userId?: string;
	sessionId?: string;
	requestId: string;
	method: string;
	path: string;
	query: Record<string, string>;
	headers: Record<string, string>;
}

/**
 * Base handler for consistent API request processing
 */
export class BaseAPIHandler {
	/**
	 * Process an API request with automatic error handling and validation
	 */
	static async handle<T = any>(
		request: NextRequest,
		handler: (context: RequestContext) => Promise<T>,
		options: HandlerOptions = {},
	): Promise<NextResponse> {
		const startTime = Date.now();
		const requestId = crypto.randomUUID();

		// Create request context
		const context: RequestContext = {
			requestId,
			method: request.method,
			path: request.nextUrl.pathname,
			query: Object.fromEntries(request.nextUrl.searchParams.entries()),
			headers: Object.fromEntries(request.headers.entries()),
		};

		try {
			// Check authentication if required
			if (options.requireAuth) {
				const authResult = await BaseAPIHandler.checkAuth(request);
				if (!authResult.isAuthenticated) {
					throw new BaseAPIError("Authentication required", {
						statusCode: 401,
						code: "AUTHENTICATION_REQUIRED",
					});
				}
				context.userId = authResult.userId;
				context.sessionId = authResult.sessionId;
			}

			// Execute handler
			const result = await handler(context);

			// Record success metrics
			const duration = Date.now() - startTime;
			// Skip metrics during build
			if (process.env.NEXT_PHASE !== "phase-production-build") {
				try {
					const { observability } = await import("@/lib/observability");
					observability.metrics.httpRequestDuration(
						duration,
						context.method,
						context.path,
						200,
					);
				} catch (error) {
					// Ignore observability errors
				}
			}

			// Return success response
			return NextResponse.json(ResponseBuilder.success(result), {
				status: 200,
			});
		} catch (error) {
			// Record error metrics
			const duration = Date.now() - startTime;
			const statusCode = error instanceof BaseAPIError ? error.statusCode : 500;

			// Skip metrics during build
			if (process.env.NEXT_PHASE !== "phase-production-build") {
				try {
					const { observability } = await import("@/lib/observability");
					observability.metrics.httpRequestDuration(
						duration,
						context.method,
						context.path,
						statusCode,
					);
				} catch (error) {
					// Ignore observability errors
				}
			}

			// Return error response
			if (error instanceof BaseAPIError) {
				return NextResponse.json(ResponseBuilder.error(error), {
					status: error.statusCode,
				});
			}

			// Handle unexpected errors
			const internalError = new BaseAPIError("Internal server error", {
				statusCode: 500,
				code: "INTERNAL_ERROR",
				details: error instanceof Error ? error.message : "Unknown error",
			});

			return NextResponse.json(ResponseBuilder.error(internalError), {
				status: 500,
			});
		}
	}

	/**
	 * Validate request body against a schema
	 */
	static async validateBody<T>(
		request: NextRequest,
		schema: z.ZodSchema<T>,
	): Promise<T> {
		try {
			const body = await request.json();
			const result = schema.safeParse(body);

			if (!result.success) {
				throw new ValidationError(
					"Validation failed",
					result.error.issues.map((issue) => ({
						field: issue.path.join("."),
						message: issue.message,
						code: issue.code,
					})),
				);
			}

			return result.data;
		} catch (error) {
			if (error instanceof ValidationError) {
				throw error;
			}
			throw new ValidationError("Invalid request body");
		}
	}

	/**
	 * Validate query parameters against a schema
	 */
	static validateQuery<T>(
		searchParams: URLSearchParams,
		schema: z.ZodSchema<T>,
	): T {
		const query = Object.fromEntries(searchParams.entries());
		const result = schema.safeParse(query);

		if (!result.success) {
			throw new ValidationError(
				"Invalid query parameters",
				result.error.issues.map((issue) => ({
					field: issue.path.join("."),
					message: issue.message,
					code: issue.code,
				})),
			);
		}

		return result.data;
	}

	/**
	 * Check authentication (simplified version - extend as needed)
	 */
	private static async checkAuth(request: NextRequest): Promise<{
		isAuthenticated: boolean;
		userId?: string;
		sessionId?: string;
	}> {
		// Check for auth token in cookies or headers
		const token =
			request.cookies.get("auth_token")?.value ||
			request.headers.get("authorization")?.replace("Bearer ", "");

		if (!token) {
			return { isAuthenticated: false };
		}

		// TODO: Implement actual token validation
		// For now, return mock authenticated user
		return {
			isAuthenticated: true,
			userId: "mock-user-id",
			sessionId: "mock-session-id",
		};
	}

	/**
	 * Create standard HTTP method handlers
	 */
	static GET(
		handler: (context: RequestContext) => Promise<any>,
		options?: HandlerOptions,
	) {
		return (request: NextRequest) =>
			BaseAPIHandler.handle(request, handler, options);
	}

	static POST(
		handler: (context: RequestContext) => Promise<any>,
		options?: HandlerOptions,
	) {
		return (request: NextRequest) =>
			BaseAPIHandler.handle(request, handler, options);
	}

	static PUT(
		handler: (context: RequestContext) => Promise<any>,
		options?: HandlerOptions,
	) {
		return (request: NextRequest) =>
			BaseAPIHandler.handle(request, handler, options);
	}

	static DELETE(
		handler: (context: RequestContext) => Promise<any>,
		options?: HandlerOptions,
	) {
		return (request: NextRequest) =>
			BaseAPIHandler.handle(request, handler, options);
	}

	static PATCH(
		handler: (context: RequestContext) => Promise<any>,
		options?: HandlerOptions,
	) {
		return (request: NextRequest) =>
			BaseAPIHandler.handle(request, handler, options);
	}
}
