/**
 * Base API Handler
 *
 * Provides standardized request handling for all API routes
 * Includes validation, error handling, and response formatting
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiErrorResponse, createApiSuccessResponse } from "@/src/schemas/api-routes";
import { BaseAPIError } from "./base-error";
import { validateToken, getStoredToken, refreshUserSession } from "@/lib/auth/anthropic";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { securityHeaders } from "@/lib/middleware/security-headers";
import { csrfProtection } from "@/lib/middleware/csrf";
import { logger } from "@/lib/logging";
import { observabilityService } from "@/lib/observability";

export type RouteHandler<T = any> = (
	request: NextRequest,
	context?: any
) => Promise<NextResponse<T>>;

export interface HandlerOptions<TInput = any, TOutput = any> {
	schema?: z.ZodSchema<TInput>;
	authenticate?: boolean;
	rateLimit?: {
		requests: number;
		window: number;
	};
	csrfProtection?: boolean;
	securityHeaders?: boolean;
	requiredScopes?: string[];
	allowedMethods?: string[];
}

export abstract class BaseAPIHandler {
	/**
	 * Create a standardized route handler with security middleware
	 */
	static createHandler<TInput = any, TOutput = any>(
		options: HandlerOptions<TInput, TOutput>,
		handler: (params: TInput, request: NextRequest, userId?: string) => Promise<TOutput>
	): RouteHandler<TOutput> {
		return async (request: NextRequest, context?: any) => {
			const startTime = Date.now();
			let userId: string | undefined;

			try {
				// Method validation
				if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
					return NextResponse.json(
						createApiErrorResponse(`Method ${request.method} not allowed`, 405),
						{ status: 405 }
					);
				}

				// Rate limiting
				if (options.rateLimit) {
					const rateLimitResult = await rateLimit(request, options.rateLimit);
					if (!rateLimitResult.allowed) {
						return NextResponse.json(createApiErrorResponse("Rate limit exceeded", 429), {
							status: 429,
							headers: {
								"X-RateLimit-Limit": options.rateLimit.requests.toString(),
								"X-RateLimit-Remaining": "0",
								"X-RateLimit-Reset": rateLimitResult.resetTime?.toString() || "",
							},
						});
					}
				}

				// CSRF protection
				if (options.csrfProtection && ["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
					const csrfResult = await csrfProtection(request);
					if (!csrfResult.valid) {
						return NextResponse.json(createApiErrorResponse("CSRF token validation failed", 403), {
							status: 403,
						});
					}
				}

				// Authentication
				if (options.authenticate) {
					userId = await BaseAPIHandler.authenticateUser(request, options.requiredScopes);
					if (!userId) {
						return NextResponse.json(createApiErrorResponse("Authentication required", 401), {
							status: 401,
						});
					}
				}

				// Parse and validate input
				const params = await BaseAPIHandler.parseInput<TInput>(request, options.schema);

				// Execute handler
				const result = await handler(params, request, userId);

				// Create response with security headers
				const response = BaseAPIHandler.successResponse(
					result,
					request.method === "POST" ? 201 : 200
				);

				if (options.securityHeaders !== false) {
					securityHeaders(response);
				}

				// Record success metrics
				observabilityService.recordEvent({
					type: "api",
					category: "request_success",
					message: "API request completed successfully",
					metadata: {
						method: request.method,
						path: new URL(request.url).pathname,
						userId,
						duration: Date.now() - startTime,
						statusCode: response.status,
					},
				});

				return response;
			} catch (error) {
				// Record error metrics
				observabilityService.recordError(error as Error, {
					context: "api_handler",
					method: request.method,
					path: new URL(request.url).pathname,
					userId,
					duration: Date.now() - startTime,
				});

				return BaseAPIHandler.handleError(error);
			}
		};
	}

	/**
	 * Parse request input based on method
	 */
	private static async parseInput<T>(request: NextRequest, schema?: z.ZodSchema<T>): Promise<T> {
		let input: any = {};

		if (request.method === "GET" || request.method === "DELETE") {
			const { searchParams } = new URL(request.url);
			input = Object.fromEntries(searchParams.entries());

			// Convert numeric strings to numbers for common params
			if ("page" in input) input.page = parseInt(input.page, 10);
			if ("limit" in input) input.limit = parseInt(input.limit, 10);
		} else {
			const contentType = request.headers.get("content-type");

			if (contentType?.includes("application/json")) {
				input = await request.json();
			} else if (contentType?.includes("multipart/form-data")) {
				const formData = await request.formData();
				input = Object.fromEntries(formData.entries());
			}
		}

		// Validate with schema if provided
		if (schema) {
			return schema.parse(input);
		}

		return input as T;
	}

	/**
	 * Create success response
	 */
	static successResponse<T>(data: T, statusCode = 200): NextResponse {
		return NextResponse.json(createApiSuccessResponse(data), {
			status: statusCode,
		});
	}

	/**
	 * Handle errors and create appropriate error response
	 */
	static handleError(error: unknown): NextResponse {
		// Zod validation errors
		if (error instanceof z.ZodError) {
			return NextResponse.json(createApiErrorResponse("Validation failed", 400, error.issues), {
				status: 400,
			});
		}

		// Our custom API errors
		if (error instanceof BaseAPIError) {
			return NextResponse.json(
				createApiErrorResponse(error.message, error.statusCode, error.details),
				{ status: error.statusCode }
			);
		}

		// Generic errors
		if (error instanceof Error) {
			console.error("Unhandled error:", error);

			// Don't expose internal error details in production
			const message =
				process.env.NODE_ENV === "production" ? "Internal server error" : error.message;

			return NextResponse.json(createApiErrorResponse(message, 500), {
				status: 500,
			});
		}

		// Unknown errors
		console.error("Unknown error:", error);
		return NextResponse.json(createApiErrorResponse("Internal server error", 500), { status: 500 });
	}

	/**
	 * Authenticate user and validate token
	 */
	private static async authenticateUser(
		request: NextRequest,
		requiredScopes?: string[]
	): Promise<string | null> {
		try {
			// Try Bearer token first
			const authHeader = request.headers.get("authorization");
			if (authHeader?.startsWith("Bearer ")) {
				const token = authHeader.substring(7);
				const validation = await validateToken(token);

				if (!validation.active) {
					return null;
				}

				// Check scopes if required
				if (requiredScopes && requiredScopes.length > 0) {
					const tokenScopes = validation.scope?.split(" ") || [];
					const hasRequiredScope = requiredScopes.some((scope) => tokenScopes.includes(scope));

					if (!hasRequiredScope) {
						return null;
					}
				}

				return validation.user_id || validation.sub || null;
			}

			// Try session cookie
			const sessionToken = await getStoredToken(request);
			if (sessionToken) {
				// Check if token is expired
				if (sessionToken.expires_at < Date.now()) {
					// Try to refresh
					const userId = await BaseAPIHandler.getUserFromSession(request);
					if (userId) {
						const refreshed = await refreshUserSession(userId);
						if (refreshed) {
							return userId;
						}
					}
					return null;
				}

				// Validate session token
				const validation = await validateToken(sessionToken.access_token);
				if (!validation.active) {
					return null;
				}

				return validation.user_id || validation.sub || null;
			}

			return null;
		} catch (error) {
			logger.error("Authentication failed", { error });
			return null;
		}
	}

	/**
	 * Get user ID from session (helper method)
	 */
	private static async getUserFromSession(request: NextRequest): Promise<string | null> {
		// This would typically involve looking up the session in the database
		// For now, we'll extract from the session token structure
		const sessionToken = await getStoredToken(request);
		if (!sessionToken) return null;

		try {
			// If it's a JWT, parse it to get user info
			const parts = sessionToken.access_token.split(".");
			if (parts.length === 3) {
				const payload = JSON.parse(atob(parts[1]));
				return payload.sub || payload.user_id || null;
			}
		} catch {
			// Not a JWT or parsing failed
		}

		return null;
	}

	/**
	 * Create CORS-enabled response
	 */
	static corsResponse<T>(data: T, statusCode = 200, origin?: string): NextResponse {
		const response = NextResponse.json(createApiSuccessResponse(data), {
			status: statusCode,
		});

		// CORS headers
		if (origin && BaseAPIHandler.isAllowedOrigin(origin)) {
			response.headers.set("Access-Control-Allow-Origin", origin);
		} else {
			response.headers.set("Access-Control-Allow-Origin", "*");
		}

		response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
		response.headers.set(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization, X-CSRF-Token"
		);
		response.headers.set("Access-Control-Allow-Credentials", "true");
		response.headers.set("Access-Control-Max-Age", "86400");

		return response;
	}

	/**
	 * Handle preflight OPTIONS requests
	 */
	static handlePreflight(request: NextRequest): NextResponse {
		const origin = request.headers.get("origin");
		const response = new NextResponse(null, { status: 200 });

		if (origin && BaseAPIHandler.isAllowedOrigin(origin)) {
			response.headers.set("Access-Control-Allow-Origin", origin);
		}

		response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
		response.headers.set(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization, X-CSRF-Token"
		);
		response.headers.set("Access-Control-Allow-Credentials", "true");
		response.headers.set("Access-Control-Max-Age", "86400");

		return response;
	}

	/**
	 * Check if origin is allowed
	 */
	private static isAllowedOrigin(origin: string): boolean {
		const allowedOrigins = [
			"http://localhost:3000",
			"http://localhost:3001",
			"https://vibex.app",
			...(process.env.ALLOWED_ORIGINS?.split(",") || []),
		];

		return allowedOrigins.includes(origin);
	}
}
