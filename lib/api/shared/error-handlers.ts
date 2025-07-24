/**
 * Shared API Error Handlers - Eliminates Error Handling Duplication
 *
 * Consolidates the repeated 24-29 line error handling patterns found across
 * multiple API routes into reusable, standardized error handling utilities.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { createApiErrorResponse } from "@/src/schemas/api-routes";
import { observability } from "@/lib/observability";

// Standard API error types
export class APIError extends Error {
	constructor(
		message: string,
		public statusCode = 500,
		public code = "INTERNAL_ERROR",
		public details?: any
	) {
		super(message);
		this.name = "APIError";
	}
}

export class ValidationAPIError extends APIError {
	constructor(message: string, details?: any) {
		super(message, 400, "VALIDATION_ERROR", details);
		this.name = "ValidationAPIError";
	}
}

export class NotFoundAPIError extends APIError {
	constructor(resource: string, identifier?: string) {
		const message = identifier
			? `${resource} with ID '${identifier}' not found`
			: `${resource} not found`;
		super(message, 404, "NOT_FOUND", { resource, identifier });
		this.name = "NotFoundAPIError";
	}
}

export class UnauthorizedAPIError extends APIError {
	constructor(message = "Unauthorized") {
		super(message, 401, "UNAUTHORIZED");
		this.name = "UnauthorizedAPIError";
	}
}

export class ForbiddenAPIError extends APIError {
	constructor(message = "Forbidden") {
		super(message, 403, "FORBIDDEN");
		this.name = "ForbiddenAPIError";
	}
}

export class ConflictAPIError extends APIError {
	constructor(message: string, details?: any) {
		super(message, 409, "CONFLICT", details);
		this.name = "ConflictAPIError";
	}
}

export class RateLimitAPIError extends APIError {
	constructor(message = "Rate limit exceeded") {
		super(message, 429, "RATE_LIMIT_EXCEEDED");
		this.name = "RateLimitAPIError";
	}
}

// Error handling configuration
export interface ErrorHandlerConfig {
	includeStackTrace?: boolean;
	logErrors?: boolean;
	recordMetrics?: boolean;
	tracingEnabled?: boolean;
	serviceName?: string;
}

const DEFAULT_ERROR_CONFIG: ErrorHandlerConfig = {
	includeStackTrace: process.env.NODE_ENV === "development",
	logErrors: true,
	recordMetrics: true,
	tracingEnabled: true,
	serviceName: "api",
};

/**
 * Standardized error handler that eliminates duplication across API routes
 * Handles the common pattern of:
 * 1. Zod validation errors
 * 2. Custom API errors
 * 3. Generic server errors
 * 4. Observability (metrics, tracing, logging)
 */
export function handleAPIError(error: unknown, config: ErrorHandlerConfig = {}): NextResponse {
	const finalConfig = { ...DEFAULT_ERROR_CONFIG, ...config };
	const span = finalConfig.tracingEnabled ? trace.getActiveSpan() : null;

	try {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			return handleZodError(error, finalConfig, span);
		}

		// Handle custom API errors
		if (error instanceof APIError) {
			return handleCustomAPIError(error, finalConfig, span);
		}

		// Handle generic errors
		return handleGenericError(error, finalConfig, span);
	} catch (handlingError) {
		// Fallback if error handling itself fails
		console.error("Error in error handler:", handlingError);
		return NextResponse.json(createApiErrorResponse("Internal server error", 500), { status: 500 });
	}
}

/**
 * Handle Zod validation errors with detailed field information
 */
function handleZodError(error: z.ZodError, config: ErrorHandlerConfig, span: any): NextResponse {
	const validationErrors = error.issues.map((issue) => ({
		field: issue.path.join("."),
		message: issue.message,
		code: issue.code,
		received: issue.received,
	}));

	const responseData = createApiErrorResponse("Validation failed", 400, validationErrors);

	// Add stack trace in development
	if (config.includeStackTrace) {
		(responseData as any).stack = error.stack;
	}

	// Record observability data
	if (config.recordMetrics) {
		observability.metrics.errorRate.record(1, {
			error_type: "validation",
			status_code: "400",
		});
	}

	if (config.logErrors) {
		console.warn("Validation error:", {
			service: config.serviceName,
			error: error.message,
			issues: validationErrors,
			timestamp: new Date().toISOString(),
		});
	}

	if (span) {
		span.recordException(error);
		span.setStatus({ code: SpanStatusCode.ERROR, message: "Validation failed" });
		span.setAttributes({
			"error.type": "validation",
			"error.validation_issues": validationErrors.length,
			"http.status_code": 400,
		});
	}

	return NextResponse.json(responseData, { status: 400 });
}

/**
 * Handle custom API errors with proper status codes and context
 */
function handleCustomAPIError(
	error: APIError,
	config: ErrorHandlerConfig,
	span: any
): NextResponse {
	const responseData = createApiErrorResponse(
		error.message,
		error.statusCode,
		error.details ? [error.details] : undefined
	);

	// Add error code to response
	(responseData as any).code = error.code;

	// Add stack trace in development
	if (config.includeStackTrace) {
		(responseData as any).stack = error.stack;
	}

	// Record observability data
	if (config.recordMetrics) {
		observability.metrics.errorRate.record(1, {
			error_type: error.code.toLowerCase(),
			status_code: error.statusCode.toString(),
		});
	}

	if (config.logErrors) {
		const logLevel = error.statusCode >= 500 ? "error" : "warn";
		console[logLevel](`API Error [${error.code}]:`, {
			service: config.serviceName,
			error: error.message,
			statusCode: error.statusCode,
			code: error.code,
			details: error.details,
			timestamp: new Date().toISOString(),
		});
	}

	if (span) {
		span.recordException(error);
		span.setStatus({
			code: error.statusCode >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.OK,
			message: error.message,
		});
		span.setAttributes({
			"error.type": error.code.toLowerCase(),
			"error.custom": true,
			"http.status_code": error.statusCode,
		});
	}

	return NextResponse.json(responseData, { status: error.statusCode });
}

/**
 * Handle generic/unknown errors with safe fallbacks
 */
function handleGenericError(error: unknown, config: ErrorHandlerConfig, span: any): NextResponse {
	const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
	const errorStack = error instanceof Error ? error.stack : undefined;

	const responseData = createApiErrorResponse("Internal server error", 500);

	// Add stack trace in development
	if (config.includeStackTrace && errorStack) {
		(responseData as any).stack = errorStack;
		(responseData as any).originalError = errorMessage;
	}

	// Record observability data
	if (config.recordMetrics) {
		observability.metrics.errorRate.record(1, {
			error_type: "internal",
			status_code: "500",
		});
	}

	if (config.logErrors) {
		console.error("Unhandled API error:", {
			service: config.serviceName,
			error: errorMessage,
			stack: errorStack,
			timestamp: new Date().toISOString(),
		});
	}

	if (span) {
		if (error instanceof Error) {
			span.recordException(error);
		}
		span.setStatus({ code: SpanStatusCode.ERROR, message: "Internal server error" });
		span.setAttributes({
			"error.type": "internal",
			"error.unhandled": true,
			"http.status_code": 500,
		});
	}

	return NextResponse.json(responseData, { status: 500 });
}

/**
 * Async error handler wrapper for API routes
 * Eliminates try-catch boilerplate in route handlers
 */
export function withErrorHandling<T extends any[], R>(
	handler: (...args: T) => Promise<R>,
	config?: ErrorHandlerConfig
) {
	return async (...args: T): Promise<R | NextResponse> => {
		try {
			return await handler(...args);
		} catch (error) {
			return handleAPIError(error, config);
		}
	};
}

/**
 * Route-specific error handlers for common patterns
 */
export const RouteErrorHandlers = {
	/**
	 * Task-specific error handler
	 */
	task: (error: unknown) =>
		handleAPIError(error, {
			serviceName: "task-api",
			recordMetrics: true,
			tracingEnabled: true,
		}),

	/**
	 * Auth-specific error handler
	 */
	auth: (error: unknown) =>
		handleAPIError(error, {
			serviceName: "auth-api",
			includeStackTrace: false, // Never expose auth error details
			recordMetrics: true,
			tracingEnabled: true,
		}),

	/**
	 * Kanban-specific error handler
	 */
	kanban: (error: unknown) =>
		handleAPIError(error, {
			serviceName: "kanban-api",
			recordMetrics: true,
			tracingEnabled: true,
		}),

	/**
	 * Generic API error handler
	 */
	generic: (error: unknown) =>
		handleAPIError(error, {
			serviceName: "api",
			recordMetrics: true,
			tracingEnabled: true,
		}),
};

/**
 * Error response builders for consistent API responses
 */
export const ErrorResponses = {
	validation: (message: string, issues?: any[]) =>
		NextResponse.json(createApiErrorResponse(message, 400, issues), { status: 400 }),

	notFound: (resource: string, identifier?: string) => {
		const message = identifier
			? `${resource} with ID '${identifier}' not found`
			: `${resource} not found`;
		return NextResponse.json(createApiErrorResponse(message, 404), { status: 404 });
	},

	unauthorized: (message = "Unauthorized") =>
		NextResponse.json(createApiErrorResponse(message, 401), { status: 401 }),

	forbidden: (message = "Forbidden") =>
		NextResponse.json(createApiErrorResponse(message, 403), { status: 403 }),

	conflict: (message: string) =>
		NextResponse.json(createApiErrorResponse(message, 409), { status: 409 }),

	rateLimit: (message = "Rate limit exceeded") =>
		NextResponse.json(createApiErrorResponse(message, 429), { status: 429 }),

	internal: (message = "Internal server error") =>
		NextResponse.json(createApiErrorResponse(message, 500), { status: 500 }),
};

/**
 * Middleware for parameter validation
 */
export function validateParams<T>(schema: z.ZodSchema<T>, params: unknown): T {
	try {
		return schema.parse(params);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new ValidationAPIError("Invalid parameters", error.issues);
		}
		throw error;
	}
}

/**
 * Middleware for request body validation
 */
export async function validateRequestBody<T>(schema: z.ZodSchema<T>, request: Request): Promise<T> {
	try {
		const body = await request.json();
		return schema.parse(body);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new ValidationAPIError("Invalid request body", error.issues);
		}
		if (error instanceof SyntaxError) {
			throw new ValidationAPIError("Invalid JSON in request body");
		}
		throw error;
	}
}

// Export all error types for use in route handlers
export {
	APIError,
	ValidationAPIError,
	NotFoundAPIError,
	UnauthorizedAPIError,
	ForbiddenAPIError,
	ConflictAPIError,
	RateLimitAPIError,
};
