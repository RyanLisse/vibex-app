/**
 * Consolidated Error Handling Utilities
 *
 * This module consolidates common error handling patterns to eliminate code duplication
 * identified by qlty smells analysis across API routes and services.
 */

import type { Span } from "@opentelemetry/api";
import { SpanStatusCode } from "@opentelemetry/api";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "../logging";

// Standard error response structure
export interface ErrorResponse {
	error: string;
	details?: unknown;
	timestamp?: string;
}

// Error handling configuration
export interface ErrorHandlerConfig {
	operation: string;
	observability?: {
		recordError: (operation: string, error: Error) => void;
	};
	span?: Span;
	includeDetails?: boolean;
}

/**
 * Consolidated error handler for API routes
 */
export function handleAPIError(
	error: unknown,
	config: ErrorHandlerConfig
): NextResponse<ErrorResponse> {
	const { operation, observability, span, includeDetails = false } = config;

	logger.error(`Failed to ${operation}`, { error });

	// Record error in observability system
	if (observability) {
		observability.recordError(`api.${operation}`, error as Error);
	}

	// Record error in span if provided
	if (span) {
		span.recordException(error as Error);
		span.setStatus({
			code: SpanStatusCode.ERROR,
			message: (error as Error).message,
		});
	}

	// Handle Zod validation errors
	if (error instanceof ZodError) {
		return NextResponse.json(
			{
				error: "Validation failed",
				details: includeDetails ? error.issues : undefined,
				timestamp: new Date().toISOString(),
			},
			{ status: 400 }
		);
	}

	// Handle generic errors
	const errorMessage = error instanceof Error ? error.message : "Internal server error";

	return NextResponse.json(
		{
			error: errorMessage,
			details: includeDetails ? error : undefined,
			timestamp: new Date().toISOString(),
		},
		{ status: 500 }
	);
}

/**
 * Standardized try-catch wrapper for API operations
 */
export async function withErrorHandling<T>(
	operation: () => Promise<T>,
	config: ErrorHandlerConfig
): Promise<T | NextResponse<ErrorResponse>> {
	try {
		return await operation();
	} catch (error) {
		return handleAPIError(error, config);
	}
}

/**
 * Performance monitoring error handler with span management
 */
export function handlePerformanceError(
	error: unknown,
	span: Span,
	operation: string
): NextResponse<ErrorResponse> {
	span.recordException(error as Error);
	span.setStatus({
		code: SpanStatusCode.ERROR,
		message: (error as Error).message,
	});

	logger.error(`Performance monitoring error in ${operation}`, { error });

	const errorMessage = error instanceof Error ? error.message : "Performance monitoring failed";

	return NextResponse.json(
		{
			error: errorMessage,
			timestamp: new Date().toISOString(),
		},
		{ status: 500 }
	);
}

/**
 * Common error patterns for different operation types
 */
export const ERROR_PATTERNS = {
	TASKS: {
		GET: "fetch tasks",
		CREATE: "create task",
		UPDATE: "update task",
		DELETE: "delete task",
	},
	AUTH: {
		LOGIN: "authenticate user",
		LOGOUT: "logout user",
		CALLBACK: "process auth callback",
		TOKEN: "exchange token",
	},
	PERFORMANCE: {
		METRICS: "collect metrics",
		TRACE: "record trace",
		MONITOR: "monitor performance",
	},
} as const;

/**
 * Creates a standardized error handler for specific operations
 */
export function createOperationErrorHandler(
	operationType: keyof typeof ERROR_PATTERNS,
	operation: string,
	observability?: { recordError: (operation: string, error: Error) => void }
) {
	return (error: unknown, span?: Span) => {
		return handleAPIError(error, {
			operation,
			observability,
			span,
			includeDetails: process.env.NODE_ENV === "development",
		});
	};
}
