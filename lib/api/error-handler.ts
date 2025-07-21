import { NextResponse } from "next/server";

/**
 * API Error Handler
 *
 * Provides standardized error handling for API routes
 */

export interface ApiError {
	message: string;
	code?: string;
	status?: number;
	details?: any;
}

export interface ApiErrorResponse {
	error: {
		message: string;
		code?: string;
		details?: any;
	};
	success: false;
	timestamp: string;
}

export interface ApiSuccessResponse<T = any> {
	data: T;
	success: true;
	timestamp: string;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
	message: string,
	status: number = 500,
	code?: string,
	details?: any,
): NextResponse<ApiErrorResponse> {
	const response: ApiErrorResponse = {
		error: {
			message,
			code,
			details,
		},
		success: false,
		timestamp: new Date().toISOString(),
	};

	return NextResponse.json(response, { status });
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
	data: T,
	status: number = 200,
): NextResponse<ApiSuccessResponse<T>> {
	const response: ApiSuccessResponse<T> = {
		data,
		success: true,
		timestamp: new Date().toISOString(),
	};

	return NextResponse.json(response, { status });
}

/**
 * Alias for createSuccessResponse for backward compatibility
 */
export const createApiResponse = createSuccessResponse;

/**
 * Handle API errors with proper logging and response formatting
 */
export function handleApiError(
	error: unknown,
	context?: string,
): NextResponse<ApiErrorResponse> {
	console.error(`API Error${context ? ` in ${context}` : ""}:`, error);

	if (error instanceof Error) {
		// Handle known error types
		if (error.name === "ValidationError") {
			return createErrorResponse(error.message, 400, "VALIDATION_ERROR");
		}

		if (error.name === "UnauthorizedError") {
			return createErrorResponse("Unauthorized", 401, "UNAUTHORIZED");
		}

		if (error.name === "ForbiddenError") {
			return createErrorResponse("Forbidden", 403, "FORBIDDEN");
		}

		if (error.name === "NotFoundError") {
			return createErrorResponse("Resource not found", 404, "NOT_FOUND");
		}

		// Generic error
		return createErrorResponse(
			error.message || "Internal server error",
			500,
			"INTERNAL_ERROR",
		);
	}

	// Unknown error type
	return createErrorResponse(
		"An unexpected error occurred",
		500,
		"UNKNOWN_ERROR",
		{ originalError: String(error) },
	);
}
