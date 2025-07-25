// Comprehensive error handling system for task management
import { z } from "zod";

// Error types and classifications
export enum ErrorType {
	VALIDATION = "VALIDATION",
	NETWORK = "NETWORK",
	AUTHENTICATION = "AUTHENTICATION",
	AUTHORIZATION = "AUTHORIZATION",
	NOT_FOUND = "NOT_FOUND",
	CONFLICT = "CONFLICT",
	RATE_LIMIT = "RATE_LIMIT",
	SERVER_ERROR = "SERVER_ERROR",
	CLIENT_ERROR = "CLIENT_ERROR",
	TIMEOUT = "TIMEOUT",
	UNKNOWN = "UNKNOWN",
}

export enum ErrorSeverity {
	LOW = "LOW",
	MEDIUM = "MEDIUM",
	HIGH = "HIGH",
	CRITICAL = "CRITICAL",
}

// Base error class
export class AppError extends Error {
	public readonly type: ErrorType;
	public readonly severity: ErrorSeverity;
	public readonly code: string;
	public readonly statusCode: number;
	public readonly context?: Record<string, any>;
	public readonly timestamp: Date;
	public readonly userMessage?: string;
	public readonly retryable: boolean;

	constructor({
		message,
		type = ErrorType.UNKNOWN,
		severity = ErrorSeverity.MEDIUM,
		code,
		statusCode = 500,
		context,
		userMessage,
		retryable = false,
		cause,
	}: {
		message: string;
		type?: ErrorType;
		severity?: ErrorSeverity;
		code: string;
		statusCode?: number;
		context?: Record<string, any>;
		userMessage?: string;
		retryable?: boolean;
		cause?: Error;
	}) {
		super(message);
		this.name = "AppError";
		this.type = type;
		this.severity = severity;
		this.code = code;
		this.statusCode = statusCode;
		this.context = context;
		this.timestamp = new Date();
		this.userMessage = userMessage;
		this.retryable = retryable;

		if (cause) {
			this.cause = cause;
		}

		// Maintain proper stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AppError);
		}
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			type: this.type,
			severity: this.severity,
			code: this.code,
			statusCode: this.statusCode,
			context: this.context,
			timestamp: this.timestamp,
			userMessage: this.userMessage,
			retryable: this.retryable,
			stack: this.stack,
		};
	}
}

// Specific error classes
export class ValidationError extends AppError {
	constructor(message: string, context?: Record<string, any>) {
		super({
			message,
			type: ErrorType.VALIDATION,
			severity: ErrorSeverity.LOW,
			code: "VALIDATION_ERROR",
			statusCode: 400,
			context,
			userMessage: "Please check your input and try again.",
			retryable: false,
		});
	}
}

export class NetworkError extends AppError {
	constructor(message: string, context?: Record<string, any>) {
		super({
			message,
			type: ErrorType.NETWORK,
			severity: ErrorSeverity.MEDIUM,
			code: "NETWORK_ERROR",
			statusCode: 0,
			context,
			userMessage:
				"Network connection failed. Please check your internet connection and try again.",
			retryable: true,
		});
	}
}

export class AuthenticationError extends AppError {
	constructor(message = "Authentication required") {
		super({
			message,
			type: ErrorType.AUTHENTICATION,
			severity: ErrorSeverity.HIGH,
			code: "AUTHENTICATION_ERROR",
			statusCode: 401,
			userMessage: "Please log in to continue.",
			retryable: false,
		});
	}
}

export class AuthorizationError extends AppError {
	constructor(message = "Insufficient permissions") {
		super({
			message,
			type: ErrorType.AUTHORIZATION,
			severity: ErrorSeverity.HIGH,
			code: "AUTHORIZATION_ERROR",
			statusCode: 403,
			userMessage: "You don't have permission to perform this action.",
			retryable: false,
		});
	}
}

export class NotFoundError extends AppError {
	constructor(resource: string, id?: string) {
		super({
			message: `${resource}${id ? ` with ID ${id}` : ""} not found`,
			type: ErrorType.NOT_FOUND,
			severity: ErrorSeverity.LOW,
			code: "NOT_FOUND_ERROR",
			statusCode: 404,
			context: { resource, id },
			userMessage: `The requested ${resource.toLowerCase()} could not be found.`,
			retryable: false,
		});
	}
}

export class ConflictError extends AppError {
	constructor(message: string, context?: Record<string, any>) {
		super({
			message,
			type: ErrorType.CONFLICT,
			severity: ErrorSeverity.MEDIUM,
			code: "CONFLICT_ERROR",
			statusCode: 409,
			context,
			userMessage: "This action conflicts with existing data. Please refresh and try again.",
			retryable: true,
		});
	}
}

export class RateLimitError extends AppError {
	constructor(retryAfter?: number) {
		super({
			message: "Rate limit exceeded",
			type: ErrorType.RATE_LIMIT,
			severity: ErrorSeverity.MEDIUM,
			code: "RATE_LIMIT_ERROR",
			statusCode: 429,
			context: { retryAfter },
			userMessage: `Too many requests. Please wait ${retryAfter ? `${retryAfter} seconds` : "a moment"} before trying again.`,
			retryable: true,
		});
	}
}

export class TimeoutError extends AppError {
	constructor(operation: string, timeout: number) {
		super({
			message: `Operation '${operation}' timed out after ${timeout}ms`,
			type: ErrorType.TIMEOUT,
			severity: ErrorSeverity.MEDIUM,
			code: "TIMEOUT_ERROR",
			statusCode: 408,
			context: { operation, timeout },
			userMessage: "The operation took too long to complete. Please try again.",
			retryable: true,
		});
	}
}

// Error handler utility functions
export class ErrorHandler {
	private static errorCounts = new Map<string, number>();
	private static lastErrorTime = new Map<string, number>();

	static handle(error: unknown, context?: Record<string, any>): AppError {
		// Convert unknown errors to AppError
		if (error instanceof AppError) {
			return error;
		}

		if (error instanceof z.ZodError) {
			return new ValidationError("Validation failed", {
				issues: error.issues,
				...context,
			});
		}

		if (error instanceof Error) {
			// Check for specific error patterns
			if (error.message.includes("fetch")) {
				return new NetworkError(error.message, context);
			}

			if (error.message.includes("timeout")) {
				return new TimeoutError("Request", 30000);
			}

			// Generic error conversion
			return new AppError({
				message: error.message,
				code: "GENERIC_ERROR",
				context: { originalError: error.name, ...context },
				cause: error,
			});
		}

		// Unknown error type
		return new AppError({
			message: "An unknown error occurred",
			code: "UNKNOWN_ERROR",
			context: { originalError: String(error), ...context },
		});
	}

	static shouldRetry(error: AppError, attempt = 1, maxAttempts = 3): boolean {
		if (!error.retryable || attempt >= maxAttempts) {
			return false;
		}

		// Exponential backoff for rate limits
		if (error.type === ErrorType.RATE_LIMIT) {
			return attempt < 2; // Only retry once for rate limits
		}

		// Don't retry client errors
		if (error.statusCode >= 400 && error.statusCode < 500) {
			return false;
		}

		return true;
	}

	static getRetryDelay(error: AppError, attempt: number): number {
		const baseDelay = 1000; // 1 second

		if (error.type === ErrorType.RATE_LIMIT && error.context?.retryAfter) {
			return error.context.retryAfter * 1000;
		}

		// Exponential backoff with jitter
		const exponentialDelay = baseDelay * 2 ** (attempt - 1);
		const jitter = Math.random() * 1000;
		return exponentialDelay + jitter;
	}

	static trackError(error: AppError): void {
		const key = `${error.type}:${error.code}`;
		const count = ErrorHandler.errorCounts.get(key) || 0;
		ErrorHandler.errorCounts.set(key, count + 1);
		ErrorHandler.lastErrorTime.set(key, Date.now());

		// Log critical errors immediately
		if (error.severity === ErrorSeverity.CRITICAL) {
			console.error("CRITICAL ERROR:", error.toJSON());
		}
	}

	static getErrorStats(): Record<string, { count: number; lastOccurred: Date }> {
		const stats: Record<string, { count: number; lastOccurred: Date }> = {};

		for (const [key, count] of ErrorHandler.errorCounts.entries()) {
			const lastTime = ErrorHandler.lastErrorTime.get(key);
			if (lastTime) {
				stats[key] = {
					count,
					lastOccurred: new Date(lastTime),
				};
			}
		}

		return stats;
	}

	static clearStats(): void {
		ErrorHandler.errorCounts.clear();
		ErrorHandler.lastErrorTime.clear();
	}
}

// Retry utility with exponential backoff
export async function withRetry<T>(
	operation: () => Promise<T>,
	options: {
		maxAttempts?: number;
		baseDelay?: number;
		maxDelay?: number;
		shouldRetry?: (error: AppError, attempt: number) => boolean;
		onRetry?: (error: AppError, attempt: number) => void;
	} = {}
): Promise<T> {
	const {
		maxAttempts = 3,
		baseDelay = 1000,
		maxDelay = 30000,
		shouldRetry = ErrorHandler.shouldRetry,
		onRetry,
	} = options;

	let lastError: AppError;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = ErrorHandler.handle(error);
			ErrorHandler.trackError(lastError);

			if (attempt === maxAttempts || !shouldRetry(lastError, attempt, maxAttempts)) {
				throw lastError;
			}

			const delay = Math.min(ErrorHandler.getRetryDelay(lastError, attempt), maxDelay);

			onRetry?.(lastError, attempt);

			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError!;
}
