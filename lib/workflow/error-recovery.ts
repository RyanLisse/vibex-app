/**
 * Workflow Error Handling and Recovery
 *
 * Implements comprehensive error handling, recovery strategies, and resilience patterns
 */

import { WorkflowExecutionState } from "./types";

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
	private static classifications = new Map<WorkflowErrorCode, string>();

	static classify(error: WorkflowError): string {
		return WorkflowErrorClassifier.classifications.get(error.code) || "unknown";
	}

	static addClassification(code: WorkflowErrorCode, classification: string): void {
		WorkflowErrorClassifier.classifications.set(code, classification);
	}
}
