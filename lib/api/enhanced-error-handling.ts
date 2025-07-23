import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

/**
 * Enhanced API Error Classes
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
    public details?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 400, "VALIDATION_ERROR", details, false);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR", undefined, false);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR", undefined, false);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND_ERROR", undefined, false);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = "Rate limit exceeded", retryAfter?: number) {
    super(message, 429, "RATE_LIMIT_ERROR", { retryAfter }, true);
    this.name = "RateLimitError";
  }
}

export class ExternalServiceError extends APIError {
  constructor(message: string, service: string, originalError?: Error) {
    super(message, 502, "EXTERNAL_SERVICE_ERROR", { service, originalError }, true);
    this.name = "ExternalServiceError";
  }
}

/**
 * Error Response Schema
 */
const errorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string(),
    statusCode: z.number(),
    details: z.any().optional(),
    retryable: z.boolean().optional(),
    timestamp: z.string(),
    requestId: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Enhanced API Error Handler with comprehensive error tracking,
 * user-friendly messages, and retry logic support.
 */
export function createEnhancedErrorHandler(options: {
  service?: string;
  enableDetailedErrors?: boolean;
  enableRetryHeaders?: boolean;
} = {}) {
  const { service = "api", enableDetailedErrors = false, enableRetryHeaders = true } = options;

  return function handleAPIError(error: unknown, requestId?: string): NextResponse {
    const timestamp = new Date().toISOString();
    const errorId = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Enhanced error context
    const errorContext = {
      service,
      requestId: errorId,
      timestamp,
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "server",
      environment: process.env.NODE_ENV,
    };

    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";
    let message = "Internal server error";
    let details: any = undefined;
    let retryable = false;

    // Handle different error types
    if (error instanceof APIError) {
      statusCode = error.statusCode;
      errorCode = error.code;
      message = error.message;
      details = error.details;
      retryable = error.retryable;
    } else if (error instanceof z.ZodError) {
      statusCode = 400;
      errorCode = "VALIDATION_ERROR";
      message = "Validation failed";
      details = {
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      };
      retryable = false;
    } else if (error instanceof Error) {
      // Handle specific error patterns
      if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
        statusCode = 503;
        errorCode = "SERVICE_UNAVAILABLE";
        message = "Service temporarily unavailable";
        retryable = true;
      } else if (error.message.includes("ENOTFOUND")) {
        statusCode = 502;
        errorCode = "EXTERNAL_SERVICE_ERROR";
        message = "External service unreachable";
        retryable = true;
      } else {
        message = enableDetailedErrors ? error.message : "Internal server error";
      }
    }

    // Create user-friendly message for production
    const userMessage = getUserFriendlyMessage(errorCode, statusCode);

    // Log error with context
    const logLevel = statusCode >= 500 ? "error" : "warn";
    console[logLevel]("API Error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      statusCode,
      errorCode,
      requestId: errorId,
      service,
      timestamp,
    });

    // Report to Sentry for server errors
    if (statusCode >= 500) {
      Sentry.withScope((scope) => {
        scope.setTag("apiError", true);
        scope.setTag("service", service);
        scope.setTag("errorCode", errorCode);
        scope.setLevel("error");
        scope.setContext("apiError", errorContext);
        scope.setContext("errorDetails", { statusCode, message, details });
        
        if (error instanceof Error) {
          Sentry.captureException(error);
        } else {
          Sentry.captureMessage(`API Error: ${message}`, "error");
        }
      });
    }

    // Create error response
    const errorResponse: ErrorResponse = {
      error: {
        message: process.env.NODE_ENV === "production" ? userMessage : message,
        code: errorCode,
        statusCode,
        details: enableDetailedErrors || process.env.NODE_ENV === "development" ? details : undefined,
        retryable,
        timestamp,
        requestId: errorId,
      },
    };

    // Create response with appropriate headers
    const response = NextResponse.json(errorResponse, { status: statusCode });

    // Add retry headers for retryable errors
    if (enableRetryHeaders && retryable) {
      response.headers.set("Retry-After", "60"); // Retry after 60 seconds
      response.headers.set("X-RateLimit-Retry-After", "60");
    }

    // Add error tracking headers
    response.headers.set("X-Request-ID", errorId);
    response.headers.set("X-Error-Code", errorCode);

    // Add CORS headers if needed
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return response;
  };
}

/**
 * Get user-friendly error messages
 */
function getUserFriendlyMessage(errorCode: string, statusCode: number): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: "The information provided is invalid. Please check your input and try again.",
    AUTHENTICATION_ERROR: "Please sign in to access this resource.",
    AUTHORIZATION_ERROR: "You don't have permission to access this resource.",
    NOT_FOUND_ERROR: "The requested resource could not be found.",
    RATE_LIMIT_ERROR: "Too many requests. Please wait a moment and try again.",
    EXTERNAL_SERVICE_ERROR: "We're experiencing issues with an external service. Please try again later.",
    SERVICE_UNAVAILABLE: "The service is temporarily unavailable. Please try again in a few minutes.",
    INTERNAL_ERROR: "We encountered an unexpected error. Our team has been notified.",
  };

  return messages[errorCode] || getGenericMessage(statusCode);
}

/**
 * Get generic error messages based on status code
 */
function getGenericMessage(statusCode: number): string {
  if (statusCode >= 500) {
    return "We're experiencing technical difficulties. Please try again later.";
  } else if (statusCode >= 400) {
    return "There was a problem with your request. Please check and try again.";
  }
  return "An unexpected error occurred.";
}

/**
 * Middleware for automatic error handling in API routes
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  options?: Parameters<typeof createEnhancedErrorHandler>[0]
) {
  const errorHandler = createEnhancedErrorHandler(options);

  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorHandler(error) as R;
    }
  };
}

/**
 * Client-side error handler for fetch requests
 */
export async function handleFetchError(response: Response): Promise<never> {
  let errorData: any;
  
  try {
    errorData = await response.json();
  } catch {
    errorData = { error: { message: "Network error", code: "NETWORK_ERROR" } };
  }

  const error = new APIError(
    errorData.error?.message || "Request failed",
    response.status,
    errorData.error?.code || "REQUEST_ERROR",
    errorData.error?.details,
    errorData.error?.retryable || false
  );

  // Log client-side errors
  console.error("Fetch Error:", {
    url: response.url,
    status: response.status,
    error: errorData,
  });

  // Report to Sentry
  Sentry.withScope((scope) => {
    scope.setTag("fetchError", true);
    scope.setTag("statusCode", response.status);
    scope.setContext("fetchError", {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      errorData,
    });
    Sentry.captureException(error);
  });

  throw error;
}

/**
 * Default error handler instance
 */
export const handleAPIError = createEnhancedErrorHandler();
