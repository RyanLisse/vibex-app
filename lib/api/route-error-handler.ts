/**
 * Centralized error handling utilities for API routes
 * 
 * Provides consistent error handling patterns to eliminate code duplication
 * across API routes while maintaining proper observability and error tracking.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { SpanStatusCode } from "@opentelemetry/api";
import { createApiErrorResponse } from "@/src/schemas/api-routes";
import { observability } from "@/lib/observability";

export interface ErrorHandlerOptions {
  /** The API route path for logging/metrics */
  route: string;
  /** OpenTelemetry span for error recording */
  span?: any;
  /** Custom error message for generic errors */
  genericErrorMessage?: string;
  /** Whether to include error details in development */
  includeErrorDetails?: boolean;
  /** Custom metric name for error tracking */
  metricName?: string;
}

export interface APIError extends Error {
  statusCode: number;
  code?: string;
  details?: any;
}

/**
 * Centralized error handler for API routes
 * Handles common error types with consistent response format
 */
export function handleAPIRouteError(
  error: unknown,
  options: ErrorHandlerOptions
): NextResponse {
  const {
    route,
    span,
    genericErrorMessage = "Internal server error",
    includeErrorDetails = process.env.NODE_ENV === "development",
    metricName
  } = options;

  // Record error in span if provided
  if (span) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }

  // Record error metrics
  if (metricName) {
    observability.metrics.errorRate(1, metricName);
  }

  // Log error for debugging
  console.error(`API Error in ${route}:`, error);

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      createApiErrorResponse(
        "Validation failed",
        400,
        error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }))
      ),
      { status: 400 }
    );
  }

  // Handle custom API errors
  if (error && typeof error === "object" && "statusCode" in error) {
    const apiError = error as APIError;
    return NextResponse.json(
      createApiErrorResponse(
        apiError.message,
        apiError.statusCode,
        apiError.details
      ),
      { status: apiError.statusCode }
    );
  }

  // Handle generic errors
  const errorMessage = error instanceof Error ? error.message : genericErrorMessage;
  const details = includeErrorDetails && error instanceof Error 
    ? { originalError: error.message, stack: error.stack }
    : undefined;

  return NextResponse.json(
    createApiErrorResponse(genericErrorMessage, 500, details),
    { status: 500 }
  );
}

/**
 * Wrapper for API route handlers with automatic error handling
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse>,
  options: Omit<ErrorHandlerOptions, "span">
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleAPIRouteError(error, options);
    }
  };
}

/**
 * Creates a standardized try-catch wrapper for API route methods
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  options: ErrorHandlerOptions
): Promise<T | NextResponse> {
  try {
    return await operation();
  } catch (error) {
    return handleAPIRouteError(error, options);
  }
}

/**
 * Common error classes for API routes
 */
export class TaskAPIError extends Error implements APIError {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "TASK_API_ERROR",
    public details?: any
  ) {
    super(message);
    this.name = "TaskAPIError";
  }
}

export class ValidationError extends Error implements APIError {
  constructor(
    message: string = "Validation failed",
    public statusCode: number = 400,
    public code: string = "VALIDATION_ERROR",
    public details?: any
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error implements APIError {
  constructor(
    message: string = "Resource not found",
    public statusCode: number = 404,
    public code: string = "NOT_FOUND",
    public details?: any
  ) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error implements APIError {
  constructor(
    message: string = "Resource conflict",
    public statusCode: number = 409,
    public code: string = "CONFLICT",
    public details?: any
  ) {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * Utility to create consistent error responses for specific scenarios
 */
export const createErrorResponse = {
  validation: (details?: any) => 
    createApiErrorResponse("Validation failed", 400, details),
  
  notFound: (resource: string = "Resource") => 
    createApiErrorResponse(`${resource} not found`, 404),
  
  conflict: (message: string = "Resource conflict") => 
    createApiErrorResponse(message, 409),
  
  internal: (message: string = "Internal server error") => 
    createApiErrorResponse(message, 500),
  
  unauthorized: (message: string = "Unauthorized") => 
    createApiErrorResponse(message, 401),
  
  forbidden: (message: string = "Forbidden") => 
    createApiErrorResponse(message, 403)
};
