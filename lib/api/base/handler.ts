/**
 * Base API Handler Infrastructure
 *
 * Provides consistent request handling, validation, and response formatting
 * for all API routes with automatic error handling and observability.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logging";
import { createApiErrorResponse, createApiSuccessResponse } from "@/src/schemas/api-routes";
import { BaseAPIError } from "./errors";

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
}

export abstract class BaseAPIHandler {
	/**
	 * Create a standardized route handler
	 */
	static createHandler<TInput = any, TOutput = any>(
		options: HandlerOptions<TInput, TOutput>,
		handler: (params: TInput, request: NextRequest) => Promise<TOutput>
	): RouteHandler<TOutput> {
		return async (request: NextRequest, context?: any): Promise<NextResponse<TOutput>> => {
			try {
				// Parse and validate input
				const params = await BaseAPIHandler.parseInput<TInput>(request, options.schema);

				// Execute handler
				const result = await handler(params, request);

				// Return success response
				return BaseAPIHandler.successResponse(
					result,
					request.method === "POST" ? 201 : 200
				) as NextResponse<TOutput>;
			} catch (error) {
				return BaseAPIHandler.handleError(error) as NextResponse<TOutput>;
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
			if ("page" in input) input.page = Number.parseInt(input.page, 10);
			if ("limit" in input) input.limit = Number.parseInt(input.limit, 10);
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
			logger.error("Unhandled error", { error: error.message, stack: error.stack });

			// Don't expose internal error details in production
			const message =
				process.env.NODE_ENV === "production" ? "Internal server error" : error.message;

			return NextResponse.json(createApiErrorResponse(message, 500), {
				status: 500,
			});
		}

		// Unknown errors
		logger.error("Unknown error", { error });
		return NextResponse.json(createApiErrorResponse("Internal server error", 500), { status: 500 });
	}

	/**
	 * Extract user from request using token validation
	 */
	protected static async getUser(request: NextRequest): Promise<string | null> {
		try {
			// Try Bearer token first
			const authHeader = request.headers.get("authorization");
			if (authHeader?.startsWith("Bearer ")) {
				const token = authHeader.substring(7);
				const validation = await BaseAPIHandler.validateBearerToken(token);
				return validation.userId;
			}

			// Try session token from cookies
			const sessionToken = await BaseAPIHandler.getSessionFromCookies(request);
			if (sessionToken) {
				return sessionToken.userId;
			}

			return null;
		} catch (error) {
			logger.error("Authentication error", { error });
			return null;
		}
	}

	/**
	 * Validate Bearer token
	 */
	private static async validateBearerToken(token: string): Promise<{ userId: string | null }> {
		try {
			// Import auth functions dynamically to avoid circular dependencies
			const { validateToken } = await import("@/lib/auth/anthropic");

			const validation = await validateToken(token);

			if (!validation.active) {
				return { userId: null };
			}

			return { userId: validation.user_id || validation.sub || null };
		} catch (error) {
			logger.error("Token validation error", { error });
			return { userId: null };
		}
	}

	/**
	 * Get session from cookies
	 */
	private static async getSessionFromCookies(
		request: NextRequest
	): Promise<{ userId: string } | null> {
		try {
			// Import session manager dynamically
			const { sessionManager } = await import("@/lib/auth/session-manager");

			const session = await sessionManager.getSessionFromRequest(request);

			if (!session) {
				return null;
			}

			return { userId: session.userId };
		} catch (error) {
			logger.error("Session validation error", { error });
			return null;
		}
	}

	/**
	 * Check rate limits using in-memory storage (Redis recommended for production)
	 */
	protected static async checkRateLimit(
		identifier: string,
		limits: { requests: number; window: number }
	): Promise<boolean> {
		try {
			// Use in-memory rate limiting for now
			// In production, this should use Redis or similar distributed cache
			const rateLimitStore = await BaseAPIHandler.getRateLimitStore();

			const key = `rate_limit:${identifier}`;
			const now = Date.now();
			const windowStart = now - limits.window;

			// Get existing requests in the current window
			const existingRequests = rateLimitStore.get(key) || [];

			// Filter out requests outside the current window
			const validRequests = existingRequests.filter((timestamp: number) => timestamp > windowStart);

			// Check if we're within the limit
			if (validRequests.length >= limits.requests) {
				return false;
			}

			// Add current request
			validRequests.push(now);
			rateLimitStore.set(key, validRequests);

			// Clean up old entries periodically
			BaseAPIHandler.cleanupRateLimitStore(rateLimitStore, windowStart);

			return true;
		} catch (error) {
			logger.error("Rate limit check error", { error });
			// On error, allow the request (fail open)
			return true;
		}
	}

	/**
	 * Get rate limit store (in-memory for now)
	 */
	private static async getRateLimitStore(): Promise<Map<string, number[]>> {
		// In production, this should be replaced with Redis
		if (!BaseAPIHandler.rateLimitStore) {
			BaseAPIHandler.rateLimitStore = new Map();
		}
		return BaseAPIHandler.rateLimitStore;
	}

	/**
	 * Clean up old rate limit entries
	 */
	private static cleanupRateLimitStore(store: Map<string, number[]>, cutoffTime: number): void {
		// Clean up entries older than cutoff time
		for (const [key, timestamps] of store.entries()) {
			const validTimestamps = timestamps.filter((ts) => ts > cutoffTime);
			if (validTimestamps.length === 0) {
				store.delete(key);
			} else {
				store.set(key, validTimestamps);
			}
		}
	}

	// Static rate limit store (should be Redis in production)
	private static rateLimitStore: Map<string, number[]> | null = null;
}
