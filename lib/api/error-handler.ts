import { SpanStatusCode, type trace } from "@opentelemetry/api";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { getLogger } from "@/lib/logging/safe-wrapper";

interface ErrorHandlerOptions {
	span?: ReturnType<ReturnType<typeof trace.getTracer>>;
	logger?: ReturnType<typeof getLogger>;
	operation?: string;
}

export function handleApiError(
	error: unknown,
	options: ErrorHandlerOptions = {},
): NextResponse {
	const { span, logger, operation = "API operation" } = options;

	// Record error in span if provided
	if (span && error instanceof Error) {
		span.recordException(error);
		span.setStatus({
			code: SpanStatusCode.ERROR,
			message: error.message,
		});
	}

	// Log error if logger provided
	if (logger && error instanceof Error) {
		logger.error(`Error in ${operation}`, error);
	}

	// Handle Zod validation errors
	if (error instanceof z.ZodError) {
		return NextResponse.json(
			{
				success: false,
				error: "Invalid request data",
				details: error.issues,
			},
			{ status: 400 },
		);
	}

	// Handle generic errors
	return NextResponse.json(
		{
			success: false,
			error: error instanceof Error ? error.message : `Failed to ${operation}`,
		},
		{ status: 500 },
	);
}

export function createApiResponse<T>(
	data: T,
	options: { status?: number } = {},
): NextResponse {
	return NextResponse.json(
		{
			success: true,
			data,
		},
		{ status: options.status || 200 },
	);
}

export function createErrorResponse(
	message: string,
	status = 500,
	details?: unknown,
): NextResponse {
	return NextResponse.json(
		{
			success: false,
			error: message,
			...(details && { details }),
		},
		{ status },
	);
}
