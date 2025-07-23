/**
 * Comprehensive Error Classes
 *
 * Provides structured error handling with categorization,
 * recovery strategies, and distributed tracing support.
 */

import { observability } from "@/lib/observability";

export enum ErrorCategory {
	VALIDATION = "validation",
	AUTHENTICATION = "authentication",
	AUTHORIZATION = "authorization",
	NOT_FOUND = "not_found",
	CONFLICT = "conflict",
	RATE_LIMIT = "rate_limit",
	EXTERNAL_SERVICE = "external_service",
	DATABASE = "database",
	NETWORK = "network",
	TIMEOUT = "timeout",
	INTERNAL = "internal",
	BUSINESS_LOGIC = "business_logic",
}

export enum ErrorSeverity {
	LOW = "low",
	MEDIUM = "medium",
	HIGH = "high",
	CRITICAL = "critical",
}

export interface ErrorContext {
	userId?: string;
	sessionId?: string;
	requestId?: string;
	traceId?: string;
	spanId?: string;
	operation?: string;
	component?: string;
	metadata?: Record<string, any>;
	timestamp?: Date;
}

export interface RecoveryStrategy {
	type: "retry" | "fallback" | "circuit_breaker" | "manual" | "none";
	config?: {
		maxRetries?: number;
		backoffMs?: number;
		exponential?: boolean;
		fallbackValue?: any;
		circuitBreakerThreshold?: number;
	};
}

/**
 * Base application error class with enhanced context and recovery
 */
export abstract class AppError extends Error {
	public readonly category: ErrorCategory;
	public readonly severity: ErrorSeverity;
	public readonly code: string;
	public readonly context: ErrorContext;
	public readonly recoveryStrategy: RecoveryStrategy;
	public readonly isRetryable: boolean;
	public readonly statusCode: number;
	public readonly timestamp: Date;

	constructor(
		message: string,
		category: ErrorCategory,
		severity: ErrorSeverity,
		code: string,
		context: ErrorContext = {},
		recoveryStrategy: RecoveryStrategy = { type: "none" },
		isRetryable = false,
		statusCode = 500
	) {
		super(message);
		this.name = this.constructor.name;
		this.category = category;
		this.severity = severity;
		this.code = code;
		this.context = { ...context, timestamp: new Date() };
		this.recoveryStrategy = recoveryStrategy;
		this.isRetryable = isRetryable;
		this.statusCode = statusCode;
		this.timestamp = new Date();

		// Capture stack trace
		Error.captureStackTrace(this, this.constructor);

		// Record error in observability system
		this.recordError();
	}

	private recordError() {
		observability.recordError(`error.${this.category}.${this.code}`, this, {
			category: this.category,
			severity: this.severity,
			code: this.code,
			isRetryable: this.isRetryable,
			statusCode: this.statusCode,
			...this.context,
		});
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			category: this.category,
			severity: this.severity,
			code: this.code,
			context: this.context,
			recoveryStrategy: this.recoveryStrategy,
			isRetryable: this.isRetryable,
			statusCode: this.statusCode,
			timestamp: this.timestamp,
			stack: this.stack,
		};
	}

	toString() {
		return `${this.name}: ${this.message} [${this.category}:${this.code}]`;
	}
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
	public readonly validationErrors: Array<{
		field: string;
		message: string;
		value?: any;
	}>;

	constructor(
		message: string,
		validationErrors: Array<{ field: string; message: string; value?: any }> = [],
		context: ErrorContext = {}
	) {
		super(
			message,
			ErrorCategory.VALIDATION,
			ErrorSeverity.LOW,
			"VALIDATION_FAILED",
			context,
			{ type: "none" },
			false,
			400
		);
		this.validationErrors = validationErrors;
	}
}

/**
 * Authentication errors
 */
export class AuthenticationError extends AppError {
	constructor(message = "Authentication failed", context: ErrorContext = {}) {
		super(
			message,
			ErrorCategory.AUTHENTICATION,
			ErrorSeverity.MEDIUM,
			"AUTH_FAILED",
			context,
			{ type: "manual" },
			false,
			401
		);
	}
}

/**
 * Authorization errors
 */
export class AuthorizationError extends AppError {
	constructor(message = "Access denied", context: ErrorContext = {}) {
		super(
			message,
			ErrorCategory.AUTHORIZATION,
			ErrorSeverity.MEDIUM,
			"ACCESS_DENIED",
			context,
			{ type: "manual" },
			false,
			403
		);
	}
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
	constructor(resource: string, id?: string, context: ErrorContext = {}) {
		const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
		super(
			message,
			ErrorCategory.NOT_FOUND,
			ErrorSeverity.LOW,
			"RESOURCE_NOT_FOUND",
			{ ...context, resource, id },
			{ type: "none" },
			false,
			404
		);
	}
}

/**
 * Conflict errors (e.g., duplicate resources)
 */
export class ConflictError extends AppError {
	constructor(message: string, context: ErrorContext = {}) {
		super(
			message,
			ErrorCategory.CONFLICT,
			ErrorSeverity.MEDIUM,
			"RESOURCE_CONFLICT",
			context,
			{ type: "manual" },
			false,
			409
		);
	}
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
	public readonly retryAfter: number;

	constructor(retryAfter = 60, context: ErrorContext = {}) {
		super(
			`Rate limit exceeded. Retry after ${retryAfter} seconds`,
			ErrorCategory.RATE_LIMIT,
			ErrorSeverity.MEDIUM,
			"RATE_LIMIT_EXCEEDED",
			context,
			{
				type: "retry",
				config: {
					maxRetries: 3,
					backoffMs: retryAfter * 1000,
					exponential: false,
				},
			},
			true,
			429
		);
		this.retryAfter = retryAfter;
	}
}

/**
 * External service errors
 */
export class ExternalServiceError extends AppError {
	public readonly serviceName: string;

	constructor(
		serviceName: string,
		message: string,
		context: ErrorContext = {},
		isRetryable = true
	) {
		super(
			`External service error (${serviceName}): ${message}`,
			ErrorCategory.EXTERNAL_SERVICE,
			ErrorSeverity.HIGH,
			"EXTERNAL_SERVICE_ERROR",
			{ ...context, serviceName },
			{
				type: "circuit_breaker",
				config: {
					maxRetries: 3,
					backoffMs: 1000,
					exponential: true,
					circuitBreakerThreshold: 5,
				},
			},
			isRetryable,
			502
		);
		this.serviceName = serviceName;
	}
}

/**
 * Database errors
 */
export class DatabaseError extends AppError {
	public readonly operation: string;
	public readonly table?: string;

	constructor(operation: string, message: string, table?: string, context: ErrorContext = {}) {
		super(
			`Database error during ${operation}: ${message}`,
			ErrorCategory.DATABASE,
			ErrorSeverity.HIGH,
			"DATABASE_ERROR",
			{ ...context, operation, table },
			{
				type: "retry",
				config: {
					maxRetries: 3,
					backoffMs: 500,
					exponential: true,
				},
			},
			true,
			500
		);
		this.operation = operation;
		this.table = table;
	}
}

/**
 * Network errors
 */
export class NetworkError extends AppError {
	public readonly url?: string;
	public readonly method?: string;

	constructor(message: string, url?: string, method?: string, context: ErrorContext = {}) {
		super(
			`Network error: ${message}`,
			ErrorCategory.NETWORK,
			ErrorSeverity.MEDIUM,
			"NETWORK_ERROR",
			{ ...context, url, method },
			{
				type: "retry",
				config: {
					maxRetries: 3,
					backoffMs: 1000,
					exponential: true,
				},
			},
			true,
			503
		);
		this.url = url;
		this.method = method;
	}
}

/**
 * Timeout errors
 */
export class TimeoutError extends AppError {
	public readonly timeoutMs: number;

	constructor(operation: string, timeoutMs: number, context: ErrorContext = {}) {
		super(
			`Operation ${operation} timed out after ${timeoutMs}ms`,
			ErrorCategory.TIMEOUT,
			ErrorSeverity.MEDIUM,
			"OPERATION_TIMEOUT",
			{ ...context, operation, timeoutMs },
			{
				type: "retry",
				config: {
					maxRetries: 2,
					backoffMs: 1000,
					exponential: false,
				},
			},
			true,
			408
		);
		this.timeoutMs = timeoutMs;
	}
}

/**
 * Business logic errors
 */
export class BusinessLogicError extends AppError {
	constructor(message: string, code: string, context: ErrorContext = {}) {
		super(
			message,
			ErrorCategory.BUSINESS_LOGIC,
			ErrorSeverity.MEDIUM,
			code,
			context,
			{ type: "manual" },
			false,
			422
		);
	}
}

/**
 * Internal server errors
 */
export class InternalError extends AppError {
	constructor(message = "Internal server error", context: ErrorContext = {}) {
		super(
			message,
			ErrorCategory.INTERNAL,
			ErrorSeverity.CRITICAL,
			"INTERNAL_ERROR",
			context,
			{ type: "manual" },
			false,
			500
		);
	}
}

/**
 * Error factory for creating appropriate error instances
 */
export class ErrorFactory {
	static fromHttpStatus(status: number, message: string, context: ErrorContext = {}): AppError {
		switch (status) {
			case 400:
				return new ValidationError(message, [], context);
			case 401:
				return new AuthenticationError(message, context);
			case 403:
				return new AuthorizationError(message, context);
			case 404:
				return new NotFoundError("Resource", undefined, context);
			case 409:
				return new ConflictError(message, context);
			case 429:
				return new RateLimitError(60, context);
			case 408:
				return new TimeoutError("Request", 30000, context);
			case 502:
			case 503:
				return new ExternalServiceError("Unknown", message, context);
			default:
				return new InternalError(message, context);
		}
	}

	static fromError(error: Error, context: ErrorContext = {}): AppError {
		if (error instanceof AppError) {
			return error;
		}

		// Try to categorize common error types
		if (error.name === "ValidationError") {
			return new ValidationError(error.message, [], context);
		}

		if (error.name === "TimeoutError" || error.message.includes("timeout")) {
			return new TimeoutError("Operation", 30000, context);
		}

		if (error.message.includes("network") || error.message.includes("fetch")) {
			return new NetworkError(error.message, undefined, undefined, context);
		}

		if (error.message.includes("database") || error.message.includes("sql")) {
			return new DatabaseError("query", error.message, undefined, context);
		}

		// Default to internal error
		return new InternalError(error.message, context);
	}
}

/**
 * Error correlation utilities
 */
export class ErrorCorrelation {
	private static correlationMap = new Map<string, AppError[]>();

	static addError(correlationId: string, error: AppError) {
		if (!ErrorCorrelation.correlationMap.has(correlationId)) {
			ErrorCorrelation.correlationMap.set(correlationId, []);
		}
		ErrorCorrelation.correlationMap.get(correlationId)!.push(error);
	}

	static getCorrelatedErrors(correlationId: string): AppError[] {
		return ErrorCorrelation.correlationMap.get(correlationId) || [];
	}

	static clearCorrelation(correlationId: string) {
		ErrorCorrelation.correlationMap.delete(correlationId);
	}

	static getErrorPattern(errors: AppError[]): {
		mostCommonCategory: ErrorCategory;
		averageSeverity: number;
		isSystemic: boolean;
	} {
		if (errors.length === 0) {
			return {
				mostCommonCategory: ErrorCategory.INTERNAL,
				averageSeverity: 0,
				isSystemic: false,
			};
		}

		const categoryCount = new Map<ErrorCategory, number>();
		let severitySum = 0;

		errors.forEach((error) => {
			categoryCount.set(error.category, (categoryCount.get(error.category) || 0) + 1);
			severitySum += ErrorCorrelation.severityToNumber(error.severity);
		});

		const mostCommonCategory = Array.from(categoryCount.entries()).sort(
			(a, b) => b[1] - a[1]
		)[0][0];

		const averageSeverity = severitySum / errors.length;
		const isSystemic = errors.length > 5 && averageSeverity >= 2;

		return {
			mostCommonCategory,
			averageSeverity,
			isSystemic,
		};
	}

	private static severityToNumber(severity: ErrorSeverity): number {
		switch (severity) {
			case ErrorSeverity.LOW:
				return 1;
			case ErrorSeverity.MEDIUM:
				return 2;
			case ErrorSeverity.HIGH:
				return 3;
			case ErrorSeverity.CRITICAL:
				return 4;
			default:
				return 0;
		}
	}
}
