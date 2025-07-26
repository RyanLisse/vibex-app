/**
 * Error Handling Utilities
 *
 * Provides comprehensive error handling, retry logic, and error boundaries
 * for the task management system.
 */

import { observability } from "@/lib/observability";

export interface RetryOptions {
	maxAttempts?: number;
	initialDelay?: number;
	maxDelay?: number;
	backoffFactor?: number;
	retryCondition?: (error: any) => boolean;
	onRetry?: (error: any, attempt: number) => void;
}

export interface ErrorInfo {
	code?: string;
	message: string;
	details?: any;
	timestamp: Date;
	context?: Record<string, any>;
}

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
	code: string;
	statusCode: number;
	details?: any;
	isOperational: boolean;

	constructor(
		message: string,
		code = "UNKNOWN_ERROR",
		statusCode = 500,
		isOperational = true,
		details?: any
	) {
		super(message);
		this.code = code;
		this.statusCode = statusCode;
		this.isOperational = isOperational;
		this.details = details;
		Error.captureStackTrace(this, this.constructor);
	}
}

/**
 * Retry mechanism with exponential backoff
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
	const {
		maxAttempts = 3,
		initialDelay = 1000,
		maxDelay = 30000,
		backoffFactor = 2,
		retryCondition = (error) => true,
		onRetry = () => {},
	} = options;

	let lastError: any;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Check if we should retry
			if (attempt === maxAttempts || !retryCondition(error)) {
				throw error;
			}

			// Calculate delay with exponential backoff
			const delay = Math.min(initialDelay * backoffFactor ** (attempt - 1), maxDelay);

			// Call retry callback
			onRetry(error, attempt);

			// Log retry attempt
			observability.metrics.customMetric.record(1, {
				metric_name: "retry_attempt",
				unit: "count",
				category: "error_handling",
				attempt: String(attempt),
				error_type: error?.constructor?.name || "Unknown",
			});

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError;
}

/**
 * Error boundary hook for React components
 */
export function useErrorHandler() {
	const handleError = (error: Error, errorInfo?: { componentStack?: string }) => {
		// Log to observability
		observability.events.collector.collectEvent(
			"error",
			"error",
			`Component error: ${error.message}`,
			{
				error: error.message,
				stack: error.stack,
				componentStack: errorInfo?.componentStack,
			},
			"frontend",
			["error", "component"]
		);

		// Log to console in development
		if (process.env.NODE_ENV === "development") {
			console.error("Component error:", error, errorInfo);
		}
	};

	return { handleError };
}

/**
 * API error handler with retry
 */
export async function apiCall<T>(
	url: string,
	options: RequestInit = {},
	retryOptions?: RetryOptions
): Promise<T> {
	const defaultRetryOptions: RetryOptions = {
		maxAttempts: 3,
		retryCondition: (error) => {
			// Retry on network errors or 5xx status codes
			if (error instanceof TypeError && error.message.includes("fetch")) {
				return true;
			}
			if (error instanceof AppError && error.statusCode >= 500) {
				return true;
			}
			return false;
		},
		onRetry: (error, attempt) => {
			console.warn(`API call retry attempt ${attempt}:`, error.message);
		},
		...retryOptions,
	};

	return withRetry(async () => {
		const response = await fetch(url, {
			...options,
			headers: {
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new AppError(
				errorData.message || `API call failed: ${response.statusText}`,
				errorData.code || "API_ERROR",
				response.status,
				true,
				errorData
			);
		}

		return response.json();
	}, defaultRetryOptions);
}

/**
 * Error recovery strategies
 */
export const ErrorRecovery = {
	/**
	 * Fallback to cached data
	 */
	async withCache<T>(
		key: string,
		fn: () => Promise<T>,
		ttl = 300000 // 5 minutes
	): Promise<T> {
		try {
			const result = await fn();
			// Cache successful result
			if (typeof window !== "undefined") {
				localStorage.setItem(
					`cache_${key}`,
					JSON.stringify({
						data: result,
						timestamp: Date.now(),
						ttl,
					})
				);
			}
			return result;
		} catch (error) {
			// Try to get from cache on error
			if (typeof window !== "undefined") {
				const cached = localStorage.getItem(`cache_${key}`);
				if (cached) {
					const { data, timestamp, ttl: cachedTtl } = JSON.parse(cached);
					if (Date.now() - timestamp < cachedTtl) {
						console.warn("Using cached data due to error:", error);
						return data;
					}
				}
			}
			throw error;
		}
	},

	/**
	 * Fallback to default value
	 */
	withDefault<T>(defaultValue: T) {
		return async (fn: () => Promise<T>): Promise<T> => {
			try {
				return await fn();
			} catch (error) {
				console.warn("Using default value due to error:", error);
				return defaultValue;
			}
		};
	},

	/**
	 * Circuit breaker pattern
	 */
	circuitBreaker<T>(
		fn: () => Promise<T>,
		{ failureThreshold = 5, resetTimeout = 60000, halfOpenRequests = 3 } = {}
	) {
		let failures = 0;
		let lastFailureTime = 0;
		let state: "closed" | "open" | "half-open" = "closed";
		let halfOpenAttempts = 0;

		return async (): Promise<T> => {
			// Check if circuit should be reset
			if (state === "open" && Date.now() - lastFailureTime > resetTimeout) {
				state = "half-open";
				halfOpenAttempts = 0;
			}

			// If circuit is open, fail fast
			if (state === "open") {
				throw new AppError("Circuit breaker is open", "CIRCUIT_BREAKER_OPEN", 503);
			}

			// If half-open, limit requests
			if (state === "half-open" && halfOpenAttempts >= halfOpenRequests) {
				throw new AppError(
					"Circuit breaker is half-open, limit reached",
					"CIRCUIT_BREAKER_HALF_OPEN",
					503
				);
			}

			try {
				const result = await fn();

				// Reset on success
				if (state === "half-open") {
					state = "closed";
					failures = 0;
				}

				return result;
			} catch (error) {
				failures++;
				lastFailureTime = Date.now();

				if (state === "half-open") {
					halfOpenAttempts++;
				}

				// Open circuit if threshold reached
				if (failures >= failureThreshold) {
					state = "open";
				}

				throw error;
			}
		};
	},
};

/**
 * Global error handler for unhandled errors
 */
export function setupGlobalErrorHandlers() {
	if (typeof window !== "undefined") {
		window.addEventListener("unhandledrejection", (event) => {
			console.error("Unhandled promise rejection:", event.reason);
			observability.events.collector.collectEvent(
				"error",
				"error",
				"Unhandled promise rejection",
				{
					reason: event.reason?.message || String(event.reason),
					stack: event.reason?.stack,
				},
				"frontend",
				["error", "unhandled_rejection"]
			);
		});

		window.addEventListener("error", (event) => {
			console.error("Global error:", event.error);
			observability.events.collector.collectEvent(
				"error",
				"error",
				"Global error",
				{
					message: event.message,
					filename: event.filename,
					lineno: event.lineno,
					colno: event.colno,
					error: event.error?.stack,
				},
				"frontend",
				["error", "global"]
			);
		});
	}
}
