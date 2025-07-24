/**
 * Standardized Error Handling Middleware
 *
 * Eliminates duplicate error handling patterns across API routes by providing
 * reusable error handlers, validation utilities, and tracing integration.
 *
 * Based on successful patterns from tests/utils/auth-test-helpers.ts
 */

import { trace } from "@opentelemetry/api";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createErrorSpan, recordError } from "./common-handlers";
import { APIError, createEnhancedErrorHandler, ValidationError } from "./enhanced-error-handling";

/**
 * Standard API Response Types
 */
export interface StandardAPIResponse<T = any> {
	success: boolean;
	data?: T;
	error?: {
		message: string;
		code: string;
		statusCode: number;
		requestId: string;
		timestamp: string;
		details?: any;
		retryable?: boolean;
	};
	metadata?: {
		requestId: string;
		timestamp: string;
		processingTime?: number;
	};
}

/**
 * Standard Error Handler Configuration
 */
export interface ErrorHandlerConfig {
	service?: string;
	enableDetailedErrors?: boolean;
	enableTracing?: boolean;
	enableRetryHeaders?: boolean;
	corsEnabled?: boolean;
}

/**
 * Request Context for Error Handling
 */
export interface RequestContext {
	requestId: string;
	startTime: number;
	span?: any;
	request: NextRequest;
}

/**
 * Creates a standardized error handling environment for API routes
 * Following the successful pattern from auth-test-helpers.ts
 */
export function createStandardErrorEnvironment(config: ErrorHandlerConfig = {}) {
	const {
		service = "api",
		enableDetailedErrors = process.env.NODE_ENV === "development",
		enableTracing = true,
		enableRetryHeaders = true,
		corsEnabled = true,
	} = config;

	// Create enhanced error handler with configuration
	const enhancedErrorHandler = createEnhancedErrorHandler({
		service,
		enableDetailedErrors,
		enableRetryHeaders,
	});

	return {
		enhancedErrorHandler,
		config: { service, enableDetailedErrors, enableTracing, enableRetryHeaders, corsEnabled },
	};
}

/**
 * Standard request context initialization
 */
export function createRequestContext(request: NextRequest): RequestContext {
	const requestId = generateRequestId();
	const startTime = Date.now();

	return {
		requestId,
		startTime,
		request,
		span: undefined,
	};
}

/**
 * Generates cryptographically secure request ID
 * Using the secure pattern from successful implementations
 */
export function generateRequestId(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return `req_${crypto.randomUUID()}`;
	}

	// Fallback for environments without crypto.randomUUID
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 15);
	return `req_${timestamp}_${random}`;
}

/**
 * Standard API Route Wrapper Class
 * Follows the successful class-based pattern from AuthCallbackTestSuite
 */
export class StandardAPIHandler {
	private errorHandler: ReturnType<typeof createEnhancedErrorHandler>;
	private config: Required<ErrorHandlerConfig>;

	constructor(config: ErrorHandlerConfig = {}) {
		const environment = createStandardErrorEnvironment(config);
		this.errorHandler = environment.enhancedErrorHandler;
		this.config = environment.config as Required<ErrorHandlerConfig>;
	}

	/**
	 * Wrap an API handler with standardized error handling
	 */
	wrapHandler<T>(
		handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse<T>>
	) {
		return async (request: NextRequest): Promise<NextResponse<T>> => {
			const context = createRequestContext(request);

			// Initialize tracing span if enabled
			if (this.config.enableTracing) {
				context.span = createErrorSpan(`${this.config.service}_api_request`, {
					requestId: context.requestId,
					method: request.method,
					url: request.url,
				});
			}

			try {
				// Execute the handler
				const response = await handler(request, context);

				// Record successful completion
				if (context.span) {
					context.span.setStatus({ code: 1 }); // SUCCESS
					context.span.end();
				}

				// Add standard headers
				this.addStandardHeaders(response, context);

				return response;
			} catch (error) {
				// Record error in span
				if (context.span) {
					recordError(context.span, error);
					context.span.end();
				}

				// Use enhanced error handler
				return this.errorHandler(error, context.requestId) as NextResponse<T>;
			}
		};
	}

	/**
	 * Create standardized success response
	 */
	createSuccessResponse<T>(
		data: T,
		context: RequestContext,
		status = 200
	): NextResponse<StandardAPIResponse<T>> {
		const response: StandardAPIResponse<T> = {
			success: true,
			data,
			metadata: {
				requestId: context.requestId,
				timestamp: new Date().toISOString(),
				processingTime: Date.now() - context.startTime,
			},
		};

		const nextResponse = NextResponse.json(response, { status });
		this.addStandardHeaders(nextResponse, context);

		return nextResponse;
	}

	/**
	 * Add standard headers to response
	 */
	private addStandardHeaders(response: NextResponse, context: RequestContext): void {
		response.headers.set("X-Request-ID", context.requestId);
		response.headers.set("X-Service", this.config.service);

		if (this.config.corsEnabled) {
			response.headers.set("Access-Control-Allow-Origin", "*");
			response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
			response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
		}
	}
}

/**
 * Standardized Zod validation error handler
 * Creates consistent validation error responses across all routes
 */
export class StandardValidationHandler {
	constructor(private apiHandler: StandardAPIHandler) {}

	/**
	 * Validate request data with Zod schema
	 */
	async validateRequest<T>(
		schema: z.ZodSchema<T>,
		data: unknown,
		context: RequestContext
	): Promise<T> {
		try {
			return await schema.parseAsync(data);
		} catch (error) {
			if (error instanceof z.ZodError) {
				throw new ValidationError("Request validation failed", {
					issues: error.issues.map((issue) => ({
						path: issue.path.join("."),
						message: issue.message,
						code: issue.code,
					})),
				});
			}
			throw error;
		}
	}

	/**
	 * Validate query parameters
	 */
	async validateQuery<T>(
		schema: z.ZodSchema<T>,
		request: NextRequest,
		context: RequestContext
	): Promise<T> {
		const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
		return this.validateRequest(schema, searchParams, context);
	}

	/**
	 * Validate request body (JSON)
	 */
	async validateBody<T>(
		schema: z.ZodSchema<T>,
		request: NextRequest,
		context: RequestContext
	): Promise<T> {
		try {
			const body = await request.json();
			return this.validateRequest(schema, body, context);
		} catch (error) {
			if (error instanceof SyntaxError) {
				throw new ValidationError("Invalid JSON in request body");
			}
			throw error;
		}
	}
}

/**
 * Standard span/tracing error handler
 * Provides consistent OpenTelemetry tracing across routes
 */
export class StandardTracingHandler {
	/**
	 * Create and execute operation with tracing
	 */
	async traceOperation<T>(
		operationName: string,
		context: RequestContext,
		operation: (span: any) => Promise<T>,
		attributes?: Record<string, string | number | boolean>
	): Promise<T> {
		const tracer = trace.getTracer("api-routes");

		return tracer.startActiveSpan(operationName, async (span) => {
			try {
				// Set standard attributes
				span.setAttributes({
					"request.id": context.requestId,
					"request.method": context.request.method,
					"request.url": context.request.url,
					...attributes,
				});

				const result = await operation(span);

				span.setStatus({ code: 1 }); // SUCCESS
				return result;
			} catch (error) {
				recordError(span, error);
				throw error;
			} finally {
				span.end();
			}
		});
	}
}

/**
 * Create complete standardized API utilities
 * Single function that provides all standardized utilities
 */
export function createStandardAPIUtilities(config: ErrorHandlerConfig = {}) {
	const apiHandler = new StandardAPIHandler(config);
	const validationHandler = new StandardValidationHandler(apiHandler);
	const tracingHandler = new StandardTracingHandler();

	return {
		apiHandler,
		validationHandler,
		tracingHandler,

		// Convenience methods
		wrapHandler: apiHandler.wrapHandler.bind(apiHandler),
		createSuccess: apiHandler.createSuccessResponse.bind(apiHandler),
		validateQuery: validationHandler.validateQuery.bind(validationHandler),
		validateBody: validationHandler.validateBody.bind(validationHandler),
		traceOperation: tracingHandler.traceOperation.bind(tracingHandler),
	};
}

/**
 * Default standardized utilities instance
 * Ready-to-use utilities with default configuration
 */
export const standardAPI = createStandardAPIUtilities();

/**
 * Simple wrapper function for basic error handling
 * For routes that just need basic error handling without custom configuration
 */
export function withStandardErrorHandling<T>(
	handler: (request: NextRequest) => Promise<NextResponse<T>>,
	config?: ErrorHandlerConfig
): (request: NextRequest) => Promise<NextResponse<T>> {
	const { wrapHandler } = createStandardAPIUtilities(config);

	return wrapHandler(async (request: NextRequest, context: RequestContext) => {
		return handler(request);
	});
}
