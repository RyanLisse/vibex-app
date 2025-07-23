/**
 * Error Recovery Strategies
 *
 * Implements various recovery patterns including exponential backoff,
 * circuit breakers, and fallback mechanisms.
 */

import { observability } from "@/lib/observability";
import { AppError, ErrorCategory, ErrorSeverity } from "./error-classes";

export interface RetryConfig {
	maxRetries: number;
	backoffMs: number;
	exponential: boolean;
	jitter: boolean;
	maxBackoffMs?: number;
}

export interface CircuitBreakerConfig {
	failureThreshold: number;
	recoveryTimeoutMs: number;
	monitoringPeriodMs: number;
}

export interface FallbackConfig {
	fallbackValue?: any;
	fallbackFunction?: () => Promise<any>;
	cacheKey?: string;
	cacheTtlMs?: number;
}

/**
 * Retry strategy with exponential backoff and jitter
 */
export class RetryStrategy {
	private static readonly DEFAULT_CONFIG: RetryConfig = {
		maxRetries: 3,
		backoffMs: 1000,
		exponential: true,
		jitter: true,
		maxBackoffMs: 30000,
	};

	static async execute<T>(
		operation: () => Promise<T>,
		config: Partial<RetryConfig> = {},
		context: { operationName?: string; traceId?: string } = {}
	): Promise<T> {
		const finalConfig = { ...RetryStrategy.DEFAULT_CONFIG, ...config };
		const { operationName = "unknown", traceId } = context;

		let lastError: Error;
		let attempt = 0;

		while (attempt <= finalConfig.maxRetries) {
			try {
				const result = await observability.trackOperation(
					`retry.${operationName}.attempt_${attempt}`,
					operation
				);

				if (attempt > 0) {
					observability.recordEvent("retry.success", {
						operationName,
						attempt,
						traceId,
					});
				}

				return result;
			} catch (error) {
				lastError = error as Error;
				attempt++;

				// Don't retry if it's not a retryable error
				if (error instanceof AppError && !error.isRetryable) {
					throw error;
				}

				// Don't retry if we've exceeded max attempts
				if (attempt > finalConfig.maxRetries) {
					break;
				}

				const backoffMs = RetryStrategy.calculateBackoff(
					attempt,
					finalConfig.backoffMs,
					finalConfig.exponential,
					finalConfig.jitter,
					finalConfig.maxBackoffMs
				);

				observability.recordEvent("retry.attempt", {
					operationName,
					attempt,
					backoffMs,
					error: error instanceof Error ? error.message : "Unknown error",
					traceId,
				});

				await RetryStrategy.sleep(backoffMs);
			}
		}

		observability.recordEvent("retry.exhausted", {
			operationName,
			totalAttempts: attempt,
			finalError: lastError.message,
			traceId,
		});

		throw lastError;
	}

	private static calculateBackoff(
		attempt: number,
		baseBackoffMs: number,
		exponential: boolean,
		jitter: boolean,
		maxBackoffMs?: number
	): number {
		let backoff = exponential ? baseBackoffMs * 2 ** (attempt - 1) : baseBackoffMs;

		if (jitter) {
			// Add random jitter (±25%)
			const jitterRange = backoff * 0.25;
			backoff += (Math.random() - 0.5) * 2 * jitterRange;
		}

		if (maxBackoffMs) {
			backoff = Math.min(backoff, maxBackoffMs);
		}

		return Math.max(backoff, 0);
	}

	private static sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
	private static instances = new Map<string, CircuitBreaker>();

	private state: "closed" | "open" | "half-open" = "closed";
	private failureCount = 0;
	private lastFailureTime = 0;
	private successCount = 0;

	constructor(
		private name: string,
		private config: CircuitBreakerConfig
	) {}

	static getInstance(name: string, config: CircuitBreakerConfig): CircuitBreaker {
		if (!CircuitBreaker.instances.has(name)) {
			CircuitBreaker.instances.set(name, new CircuitBreaker(name, config));
		}
		return CircuitBreaker.instances.get(name)!;
	}

	async execute<T>(operation: () => Promise<T>): Promise<T> {
		if (this.state === "open") {
			if (this.shouldAttemptReset()) {
				this.state = "half-open";
				this.successCount = 0;
				observability.recordEvent("circuit_breaker.half_open", {
					name: this.name,
				});
			} else {
				const error = new AppError(
					`Circuit breaker ${this.name} is open`,
					ErrorCategory.EXTERNAL_SERVICE,
					ErrorSeverity.HIGH,
					"CIRCUIT_BREAKER_OPEN",
					{ circuitBreakerName: this.name }
				);
				throw error;
			}
		}

		try {
			const result = await observability.trackOperation(
				`circuit_breaker.${this.name}.execute`,
				operation
			);

			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	private shouldAttemptReset(): boolean {
		return Date.now() - this.lastFailureTime >= this.config.recoveryTimeoutMs;
	}

	private onSuccess(): void {
		this.failureCount = 0;

		if (this.state === "half-open") {
			this.successCount++;
			if (this.successCount >= 3) {
				// Require 3 successes to close
				this.state = "closed";
				observability.recordEvent("circuit_breaker.closed", {
					name: this.name,
				});
			}
		}
	}

	private onFailure(): void {
		this.failureCount++;
		this.lastFailureTime = Date.now();

		if (this.failureCount >= this.config.failureThreshold) {
			this.state = "open";
			observability.recordEvent("circuit_breaker.opened", {
				name: this.name,
				failureCount: this.failureCount,
			});
		}
	}

	getState(): { state: string; failureCount: number; lastFailureTime: number } {
		return {
			state: this.state,
			failureCount: this.failureCount,
			lastFailureTime: this.lastFailureTime,
		};
	}
}

/**
 * Fallback strategy implementation
 */
export class FallbackStrategy {
	private static cache = new Map<string, { value: any; expiresAt: number }>();

	static async execute<T>(
		operation: () => Promise<T>,
		config: FallbackConfig,
		context: { operationName?: string; traceId?: string } = {}
	): Promise<T> {
		const { operationName = "unknown", traceId } = context;

		try {
			const result = await operation();

			// Cache successful result if cache key provided
			if (config.cacheKey && config.cacheTtlMs) {
				FallbackStrategy.cache.set(config.cacheKey, {
					value: result,
					expiresAt: Date.now() + config.cacheTtlMs,
				});
			}

			return result;
		} catch (error) {
			observability.recordEvent("fallback.triggered", {
				operationName,
				error: error instanceof Error ? error.message : "Unknown error",
				traceId,
			});

			// Try cached value first
			if (config.cacheKey) {
				const cached = FallbackStrategy.cache.get(config.cacheKey);
				if (cached && cached.expiresAt > Date.now()) {
					observability.recordEvent("fallback.cache_hit", {
						operationName,
						cacheKey: config.cacheKey,
						traceId,
					});
					return cached.value;
				}
			}

			// Try fallback function
			if (config.fallbackFunction) {
				try {
					const fallbackResult = await config.fallbackFunction();
					observability.recordEvent("fallback.function_success", {
						operationName,
						traceId,
					});
					return fallbackResult;
				} catch (fallbackError) {
					observability.recordEvent("fallback.function_failed", {
						operationName,
						error: fallbackError instanceof Error ? fallbackError.message : "Unknown error",
						traceId,
					});
				}
			}

			// Use static fallback value
			if (config.fallbackValue !== undefined) {
				observability.recordEvent("fallback.static_value", {
					operationName,
					traceId,
				});
				return config.fallbackValue;
			}

			// No fallback available, re-throw original error
			throw error;
		}
	}

	static clearCache(key?: string): void {
		if (key) {
			FallbackStrategy.cache.delete(key);
		} else {
			FallbackStrategy.cache.clear();
		}
	}

	static getCacheStats(): { size: number; keys: string[] } {
		return {
			size: FallbackStrategy.cache.size,
			keys: Array.from(FallbackStrategy.cache.keys()),
		};
	}
}

/**
 * Composite recovery strategy that combines multiple approaches
 */
export class CompositeRecoveryStrategy {
	static async execute<T>(
		operation: () => Promise<T>,
		config: {
			retry?: Partial<RetryConfig>;
			circuitBreaker?: { name: string; config: CircuitBreakerConfig };
			fallback?: FallbackConfig;
		},
		context: { operationName?: string; traceId?: string } = {}
	): Promise<T> {
		const { operationName = "unknown", traceId } = context;

		// Wrap operation with circuit breaker if configured
		let wrappedOperation = operation;
		if (config.circuitBreaker) {
			const circuitBreaker = CircuitBreaker.getInstance(
				config.circuitBreaker.name,
				config.circuitBreaker.config
			);
			wrappedOperation = () => circuitBreaker.execute(operation);
		}

		// Wrap with retry if configured
		if (config.retry) {
			wrappedOperation = () =>
				RetryStrategy.execute(wrappedOperation, config.retry, { operationName, traceId });
		}

		// Wrap with fallback if configured
		if (config.fallback) {
			return FallbackStrategy.execute(wrappedOperation, config.fallback, {
				operationName,
				traceId,
			});
		}

		return wrappedOperation();
	}
}

/**
 * Recovery strategy factory
 */
export class RecoveryStrategyFactory {
	static createForError(error: AppError): {
		retry?: Partial<RetryConfig>;
		circuitBreaker?: { name: string; config: CircuitBreakerConfig };
		fallback?: FallbackConfig;
	} {
		const config: any = {};

		// Configure retry based on error type
		if (error.isRetryable) {
			config.retry = error.recoveryStrategy.config || {
				maxRetries: 3,
				backoffMs: 1000,
				exponential: true,
				jitter: true,
			};
		}

		// Configure circuit breaker for external services
		if (error.category === ErrorCategory.EXTERNAL_SERVICE) {
			config.circuitBreaker = {
				name: `external_service_${error.context.serviceName || "unknown"}`,
				config: {
					failureThreshold: 5,
					recoveryTimeoutMs: 60000,
					monitoringPeriodMs: 300000,
				},
			};
		}

		// Configure fallback for non-critical operations
		if (error.severity !== ErrorSeverity.CRITICAL) {
			config.fallback = {
				fallbackValue: null,
				cacheKey: `fallback_${error.context.operation}`,
				cacheTtlMs: 300000, // 5 minutes
			};
		}

		return config;
	}
}

/**
 * Global error recovery coordinator
 */
export class ErrorRecoveryCoordinator {
	private static activeRecoveries = new Map<string, Promise<any>>();

	static async recover<T>(
		operationId: string,
		operation: () => Promise<T>,
		error: AppError
	): Promise<T> {
		// Prevent duplicate recovery attempts
		if (ErrorRecoveryCoordinator.activeRecoveries.has(operationId)) {
			return ErrorRecoveryCoordinator.activeRecoveries.get(operationId);
		}

		const recoveryConfig = RecoveryStrategyFactory.createForError(error);

		const recoveryPromise = CompositeRecoveryStrategy.execute(operation, recoveryConfig, {
			operationName: operationId,
			traceId: error.context.traceId,
		}).finally(() => {
			ErrorRecoveryCoordinator.activeRecoveries.delete(operationId);
		});

		ErrorRecoveryCoordinator.activeRecoveries.set(operationId, recoveryPromise);
		return recoveryPromise;
	}

	static getActiveRecoveries(): string[] {
		return Array.from(ErrorRecoveryCoordinator.activeRecoveries.keys());
	}
}
