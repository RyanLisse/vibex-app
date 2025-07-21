/**
 * Error Handler Utilities
 *
 * Provides centralized error handling for API routes
 */

import { NextResponse } from "next/server";

export class APIError extends Error {
	constructor(
		message: string,
		public statusCode: number = 500,
		public code?: string,
	) {
		super(message);
		this.name = "APIError";
	}
}

export class ValidationError extends APIError {
	constructor(message: string) {
		super(message, 400, "VALIDATION_ERROR");
		this.name = "ValidationError";
	}
}

export class NotFoundError extends APIError {
	constructor(message: string = "Resource not found") {
		super(message, 404, "NOT_FOUND");
		this.name = "NotFoundError";
	}
}

export class UnauthorizedError extends APIError {
	constructor(message: string = "Unauthorized") {
		super(message, 401, "UNAUTHORIZED");
		this.name = "UnauthorizedError";
	}
}

export function handleAPIError(error: unknown): NextResponse {
	console.error("API Error:", error);

	if (error instanceof APIError) {
		return NextResponse.json(
			{
				error: {
					message: error.message,
					code: error.code,
				},
			},
			{ status: error.statusCode },
		);
	}

	if (error instanceof Error) {
		return NextResponse.json(
			{
				error: {
					message: error.message,
					code: "INTERNAL_ERROR",
				},
			},
			{ status: 500 },
		);
	}

	return NextResponse.json(
		{
			error: {
				message: "An unexpected error occurred",
				code: "UNKNOWN_ERROR",
			},
		},
		{ status: 500 },
	);
}

// Alias for backward compatibility
export const handleRouteError = handleAPIError;

export default handleAPIError;
