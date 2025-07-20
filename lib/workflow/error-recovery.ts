/**
 * Workflow Error Handling and Recovery
 *
 * Implements comprehensive error handling, recovery strategies, and resilience patterns
 */

import { observability } from "@/lib/observability";
import type {
	ErrorHandler,
	RetryPolicy,
	StepError,
	StepExecutionState,
	WorkflowError,
	WorkflowExecutionState,
} from "./types";

// Error types
export enum WorkflowErrorCode {
	// Step errors
	STEP_EXECUTION_FAILED = "STEP_EXECUTION_FAILED",
	STEP_TIMEOUT = "STEP_TIMEOUT",
	STEP_VALIDATION_FAILED = "STEP_VALIDATION_FAILED",
	STEP_NOT_FOUND = "STEP_NOT_FOUND",

	// Workflow errors
	WORKFLOW_TIMEOUT = "WORKFLOW_TIMEOUT",
	WORKFLOW_CANCELLED = "WORKFLOW_CANCELLED",
	WORKFLOW_INVALID_STATE = "WORKFLOW_INVALID_STATE",

	// System errors
	SYSTEM_UNAVAILABLE = "SYSTEM_UNAVAILABLE",
	RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED",
	PERMISSION_DENIED = "PERMISSION_DENIED",

	// Data errors
	INVALID_INPUT = "INVALID_INPUT",
	DATA_CORRUPTION = "DATA_CORRUPTION",
	SCHEMA_MISMATCH = "SCHEMA_MISMATCH",

	// External errors
	EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
	NETWORK_ERROR = "NETWORK_ERROR",
	AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
}

// Error severity levels
export enum ErrorSeverity {
	LOW = "low",
	MEDIUM = "medium",
	HIGH = "high",
	CRITICAL = "critical",
}

// Recovery strategies
export enum RecoveryStrategy {
	RETRY = "retry",
	RETRY_WITH_BACKOFF = "retry_with_backoff",
	CIRCUIT_BREAKER = "circuit_breaker",
	FALLBACK = "fallback",
	COMPENSATE = "compensate",
	SKIP = "skip",
	FAIL_FAST = "fail_fast",
	MANUAL_INTERVENTION = "manual_intervention",
}

// Error classification
export interface ErrorClassification {
	code: WorkflowErrorCode;
	severity: ErrorSeverity;
	recoverable: boolean;
	retryable: boolean;
	strategy: RecoveryStrategy;
	maxRetries?: number;
	retryDelay?: number;
}

// Error classifier
export class WorkflowErrorClassifier {
	private static classifications = new Map<
		WorkflowErrorCode,
		ErrorClassification
	>([
		[
			WorkflowErrorCode.STEP_TIMEOUT,
			{
				code: WorkflowErrorCode.STEP_TIMEOUT,
				severity: ErrorSeverity.MEDIUM,
				recoverable: true,
				retryable: true,
				strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
				maxRetries: 3,
				retryDelay: 1000,
			},
		],

		[
			WorkflowErrorCode.NETWORK_ERROR,
			{
				code: WorkflowErrorCode.NETWORK_ERROR,
				severity: ErrorSeverity.MEDIUM,
				recoverable: true,
				retryable: true,
				strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
				maxRetries: 5,
				retryDelay: 2000,
			},
		],

		[
			WorkflowErrorCode.EXTERNAL_SERVICE_ERROR,
			{
				code: WorkflowErrorCode.EXTERNAL_SERVICE_ERROR,
				severity: ErrorSeverity.HIGH,
				recoverable: true,
				retryable: true,
				strategy: RecoveryStrategy.CIRCUIT_BREAKER,
				maxRetries: 3,
				retryDelay: 5000,
			},
		],

		[
			WorkflowErrorCode.INVALID_INPUT,
			{
				code: WorkflowErrorCode.INVALID_INPUT,
				severity: ErrorSeverity.LOW,
				recoverable: false,
				retryable: false,
				strategy: RecoveryStrategy.FAIL_FAST,
			},
		],

		[
			WorkflowErrorCode.PERMISSION_DENIED,
			{
				code: WorkflowErrorCode.PERMISSION_DENIED,
				severity: ErrorSeverity.HIGH,
				recoverable: false,
				retryable: false,
				strategy: RecoveryStrategy.MANUAL_INTERVENTION,
			},
		],

		[
			WorkflowErrorCode.SYSTEM_UNAVAILABLE,
			{
				code: WorkflowErrorCode.SYSTEM_UNAVAILABLE,
				severity: ErrorSeverity.CRITICAL,
				recoverable: true,
				retryable: true,
				strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
				maxRetries: 10,
				retryDelay: 10_000,
			},
		],
	]);

	static classify(error: any): ErrorClassification {
		// Try to determine error code from error
		let code = WorkflowErrorCode.STEP_EXECUTION_FAILED;

		if (error.code && WorkflowErrorClassifier.classifications.has(error.code)) {
			code = error.code;
		} else if (error.message) {
			// Pattern matching on error message
			if (error.message.includes("timeout")) {
				code = WorkflowErrorCode.STEP_TIMEOUT;
			} else if (
				error.message.includes("network") ||
				error.message.includes("ECONNREFUSED")
			) {
				code = WorkflowErrorCode.NETWORK_ERROR;
			} else if (
				error.message.includes("permission") ||
				error.message.includes("unauthorized")
			) {
				code = WorkflowErrorCode.PERMISSION_DENIED;
			} else if (
				error.message.includes("invalid") ||
				error.message.includes("validation")
			) {
				code = WorkflowErrorCode.INVALID_INPUT;
			}
		}

		return (
			WorkflowErrorClassifier.classifications.get(code) || {
				code,
				severity: ErrorSeverity.MEDIUM,
				recoverable: false,
				retryable: false,
				strategy: RecoveryStrategy.FAIL_FAST,
			}
		);
	}
}

// Recovery executor
export class RecoveryExecutor {
	private circuitBreakers = new Map<string, CircuitBreaker>();

	async executeRecovery(
		error: any,
		context: RecoveryContext,
	): Promise<RecoveryResult> {
		const classification = WorkflowErrorClassifier.classify(error);

		observability.trackEvent("workflow.error.classified", {
			executionId: context.executionId,
			stepId: context.stepId,
			errorCode: classification.code,
			severity: classification.severity,
			strategy: classification.strategy,
		});

		switch (classification.strategy) {
			case RecoveryStrategy.RETRY:
				return await this.executeRetry(error, context, classification);

			case RecoveryStrategy.RETRY_WITH_BACKOFF:
				return await this.executeRetryWithBackoff(
					error,
					context,
					classification,
				);

			case RecoveryStrategy.CIRCUIT_BREAKER:
				return await this.executeWithCircuitBreaker(
					error,
					context,
					classification,
				);

			case RecoveryStrategy.FALLBACK:
				return await this.executeFallback(error, context);

			case RecoveryStrategy.COMPENSATE:
				return await this.executeCompensation(error, context);

			case RecoveryStrategy.SKIP:
				return { success: true, action: "skipped" };

			case RecoveryStrategy.MANUAL_INTERVENTION:
				return await this.requestManualIntervention(error, context);

			case RecoveryStrategy.FAIL_FAST:
			default:
				return { success: false, action: "failed" };
		}
	}

	private async executeRetry(
		error: any,
		context: RecoveryContext,
		classification: ErrorClassification,
	): Promise<RecoveryResult> {
		const maxRetries = classification.maxRetries || 3;
		const currentRetry = context.retryCount || 0;

		if (currentRetry >= maxRetries) {
			return { success: false, action: "max_retries_exceeded" };
		}

		observability.trackEvent("workflow.recovery.retry", {
			executionId: context.executionId,
			stepId: context.stepId,
			retryCount: currentRetry + 1,
			maxRetries,
		});

		return {
			success: true,
			action: "retry",
			retryCount: currentRetry + 1,
		};
	}

	private async executeRetryWithBackoff(
		error: any,
		context: RecoveryContext,
		classification: ErrorClassification,
	): Promise<RecoveryResult> {
		const result = await this.executeRetry(error, context, classification);

		if (result.action === "retry") {
			const baseDelay = classification.retryDelay || 1000;
			const retryCount = result.retryCount || 1;
			const delay = this.calculateBackoff(baseDelay, retryCount);

			await this.delay(delay);

			return {
				...result,
				delayMs: delay,
			};
		}

		return result;
	}

	private async executeWithCircuitBreaker(
		error: any,
		context: RecoveryContext,
		classification: ErrorClassification,
	): Promise<RecoveryResult> {
		const breakerId = `${context.workflowId}:${context.stepId}`;
		let breaker = this.circuitBreakers.get(breakerId);

		if (!breaker) {
			breaker = new CircuitBreaker({
				failureThreshold: 5,
				resetTimeout: 60_000, // 1 minute
				monitoringPeriod: 300_000, // 5 minutes
			});
			this.circuitBreakers.set(breakerId, breaker);
		}

		if (breaker.isOpen()) {
			return {
				success: false,
				action: "circuit_breaker_open",
			};
		}

		breaker.recordFailure();

		if (breaker.shouldOpen()) {
			breaker.open();

			observability.trackEvent("workflow.circuit_breaker.opened", {
				executionId: context.executionId,
				stepId: context.stepId,
				failures: breaker.getFailureCount(),
			});

			return {
				success: false,
				action: "circuit_breaker_opened",
			};
		}

		return await this.executeRetryWithBackoff(error, context, classification);
	}

	private async executeFallback(
		error: any,
		context: RecoveryContext,
	): Promise<RecoveryResult> {
		if (!context.errorHandler?.fallbackStepId) {
			return { success: false, action: "no_fallback_defined" };
		}

		observability.trackEvent("workflow.recovery.fallback", {
			executionId: context.executionId,
			stepId: context.stepId,
			fallbackStepId: context.errorHandler.fallbackStepId,
		});

		return {
			success: true,
			action: "fallback",
			nextStepId: context.errorHandler.fallbackStepId,
		};
	}

	private async executeCompensation(
		error: any,
		context: RecoveryContext,
	): Promise<RecoveryResult> {
		if (!context.errorHandler?.compensationStepId) {
			return { success: false, action: "no_compensation_defined" };
		}

		observability.trackEvent("workflow.recovery.compensation", {
			executionId: context.executionId,
			stepId: context.stepId,
			compensationStepId: context.errorHandler.compensationStepId,
		});

		// Execute compensation step
		// This would trigger the compensation workflow or step

		return {
			success: true,
			action: "compensated",
			compensationStepId: context.errorHandler.compensationStepId,
		};
	}

	private async requestManualIntervention(
		error: any,
		context: RecoveryContext,
	): Promise<RecoveryResult> {
		observability.trackEvent("workflow.recovery.manual_intervention", {
			executionId: context.executionId,
			stepId: context.stepId,
			error: error.message,
		});

		// Create manual intervention request
		// This would notify administrators and pause the workflow

		return {
			success: false,
			action: "manual_intervention_required",
			requiresApproval: true,
		};
	}

	private calculateBackoff(baseDelay: number, retryCount: number): number {
		// Exponential backoff with jitter
		const exponentialDelay = baseDelay * 2 ** (retryCount - 1);
		const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
		return Math.min(exponentialDelay + jitter, 300_000); // Max 5 minutes
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Circuit breaker implementation
class CircuitBreaker {
	private failureCount = 0;
	private lastFailureTime?: Date;
	private state: "closed" | "open" | "half-open" = "closed";

	constructor(
		private config: {
			failureThreshold: number;
			resetTimeout: number;
			monitoringPeriod: number;
		},
	) {}

	isOpen(): boolean {
		if (this.state === "open") {
			// Check if we should transition to half-open
			if (this.lastFailureTime) {
				const timeSinceLastFailure =
					Date.now() - this.lastFailureTime.getTime();
				if (timeSinceLastFailure > this.config.resetTimeout) {
					this.state = "half-open";
					return false;
				}
			}
			return true;
		}
		return false;
	}

	recordFailure(): void {
		this.failureCount++;
		this.lastFailureTime = new Date();
	}

	recordSuccess(): void {
		if (this.state === "half-open") {
			this.reset();
		}
	}

	shouldOpen(): boolean {
		return this.failureCount >= this.config.failureThreshold;
	}

	open(): void {
		this.state = "open";
	}

	reset(): void {
		this.state = "closed";
		this.failureCount = 0;
		this.lastFailureTime = undefined;
	}

	getFailureCount(): number {
		return this.failureCount;
	}
}

// Recovery context
export interface RecoveryContext {
	executionId: string;
	workflowId: string;
	stepId: string;
	retryCount?: number;
	errorHandler?: ErrorHandler;
}

// Recovery result
export interface RecoveryResult {
	success: boolean;
	action: string;
	retryCount?: number;
	delayMs?: number;
	nextStepId?: string;
	compensationStepId?: string;
	requiresApproval?: boolean;
}

// Error enrichment
export function enrichError(
	error: any,
	context: {
		executionId: string;
		stepId?: string;
		workflowId: string;
	},
): WorkflowError {
	const classification = WorkflowErrorClassifier.classify(error);

	return {
		code: classification.code,
		message: error.message || "Unknown error",
		stepId: context.stepId,
		timestamp: new Date(),
		details: {
			originalError: error,
			stack: error.stack,
			classification,
		},
		recoverable: classification.recoverable,
	};
}

// Error aggregation for reporting
export class ErrorAggregator {
	private errors: WorkflowError[] = [];

	add(error: WorkflowError): void {
		this.errors.push(error);
	}

	getErrorSummary(): ErrorSummary {
		const byCode = this.groupBy(this.errors, "code");
		const bySeverity = this.groupBySeverity(this.errors);

		return {
			total: this.errors.length,
			byCode: Object.entries(byCode).map(([code, errors]) => ({
				code,
				count: errors.length,
				lastOccurrence: this.getLatest(errors).timestamp,
			})),
			bySeverity: Object.entries(bySeverity).map(([severity, count]) => ({
				severity,
				count,
			})),
			recoverable: this.errors.filter((e) => e.recoverable).length,
			unrecoverable: this.errors.filter((e) => !e.recoverable).length,
		};
	}

	private groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
		return items.reduce(
			(acc, item) => {
				const group = String(item[key]);
				if (!acc[group]) acc[group] = [];
				acc[group].push(item);
				return acc;
			},
			{} as Record<string, T[]>,
		);
	}

	private groupBySeverity(errors: WorkflowError[]): Record<string, number> {
		const severities: Record<string, number> = {};

		errors.forEach((error) => {
			const classification = WorkflowErrorClassifier.classify(error);
			severities[classification.severity] =
				(severities[classification.severity] || 0) + 1;
		});

		return severities;
	}

	private getLatest(errors: WorkflowError[]): WorkflowError {
		return errors.reduce((latest, error) =>
			error.timestamp > latest.timestamp ? error : latest,
		);
	}
}

// Error summary type
export interface ErrorSummary {
	total: number;
	byCode: Array<{
		code: string;
		count: number;
		lastOccurrence: Date;
	}>;
	bySeverity: Array<{
		severity: string;
		count: number;
	}>;
	recoverable: number;
	unrecoverable: number;
}

// Export recovery executor singleton
export const recoveryExecutor = new RecoveryExecutor();
