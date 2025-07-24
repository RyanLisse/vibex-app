/**
 * Workflow Utility Functions
 *
 * Extracted common patterns and utility functions to reduce complexity
 * in the main workflow engine and improve reusability.
 */

/**
 * Default timeout for step execution (5 minutes)
 */
export const DEFAULT_STEP_TIMEOUT = 300_000;

/**
 * Maximum number of retry attempts for failed steps
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Validates workflow execution state exists
 */
export function validateExecutionExists<T>(execution: T | undefined, executionId: string): T {
	if (!execution) {
		throw new Error(`Execution ${executionId} not found`);
	}
	return execution;
}

/**
 * Validates step configuration exists in workflow definition
 */
export function validateStepExists(steps: Array<{ id: string }>, stepId: string): { id: string } {
	const step = steps.find((s) => s.id === stepId);
	if (!step) {
		throw new Error(`Step ${stepId} not found in workflow definition`);
	}
	return step;
}

/**
 * Calculates step execution duration
 */
export function calculateStepDuration(startTime: Date, endTime: Date): number {
	return endTime.getTime() - startTime.getTime();
}

/**
 * Determines if a retry should be attempted based on policy
 */
export function shouldRetryStep(
	retryPolicy: {
		maxAttempts: number;
		backoffType?: "exponential" | "linear" | "fixed";
		initialDelay: number;
		maxDelay?: number;
	},
	currentAttempts: number
): boolean {
	return currentAttempts < retryPolicy.maxAttempts;
}

/**
 * Calculates retry delay based on backoff strategy
 */
export function calculateRetryDelay(
	retryPolicy: {
		backoffType?: "exponential" | "linear" | "fixed";
		initialDelay: number;
		maxDelay?: number;
	},
	attemptNumber: number
): number {
	let delay = retryPolicy.initialDelay;

	switch (retryPolicy.backoffType) {
		case "exponential":
			delay = delay * 2 ** (attemptNumber - 1);
			break;
		case "linear":
			delay = delay * attemptNumber;
			break;
		case "fixed":
		default:
			// Keep initial delay
			break;
	}

	if (retryPolicy.maxDelay) {
		delay = Math.min(delay, retryPolicy.maxDelay);
	}

	return delay;
}

/**
 * Creates a timeout promise that rejects after specified milliseconds
 */
export function createTimeoutPromise(timeoutMs: number): Promise<never> {
	return new Promise((_, reject) =>
		setTimeout(() => reject(new Error("Operation timed out")), timeoutMs)
	);
}

/**
 * Executes a promise with timeout
 */
export async function executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return Promise.race([promise, createTimeoutPromise(timeoutMs)]);
}

/**
 * Generates a unique workflow event ID
 */
export function generateEventId(): string {
	return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique session ID
 */
export function generateSessionId(): string {
	return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safely accesses nested object properties using dot notation
 */
export function getNestedValue(obj: any, path: string): any {
	return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

/**
 * Safely sets nested object properties using dot notation
 */
export function setNestedValue(obj: any, path: string, value: any): void {
	const parts = path.split(".");
	const last = parts.pop()!;
	const target = parts.reduce((acc, part) => {
		if (!acc[part]) acc[part] = {};
		return acc[part];
	}, obj);
	target[last] = value;
}

/**
 * Creates a standardized error object for workflow operations
 */
export function createWorkflowError(
	code: string,
	message: string,
	details?: any
): {
	code: string;
	message: string;
	details?: any;
	timestamp: Date;
	recoverable: boolean;
} {
	return {
		code,
		message,
		details,
		timestamp: new Date(),
		recoverable: false,
	};
}

/**
 * Validates that required fields are present in an object
 */
export function validateRequiredFields<T extends Record<string, any>>(
	obj: T,
	requiredFields: (keyof T)[]
): void {
	const missing = requiredFields.filter((field) => obj[field] === undefined || obj[field] === null);

	if (missing.length > 0) {
		throw new Error(`Missing required fields: ${missing.join(", ")}`);
	}
}

/**
 * Debounces a function to prevent excessive calls
 */
export function debounce<T extends (...args: any[]) => void>(
	func: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: NodeJS.Timeout;
	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(...args), delay);
	};
}

/**
 * Throttles a function to limit call frequency
 */
export function throttle<T extends (...args: any[]) => void>(
	func: T,
	limit: number
): (...args: Parameters<T>) => void {
	let inThrottle: boolean;
	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

/**
 * Type guard to check if a value is defined
 */
export function isDefined<T>(value: T | undefined | null): value is T {
	return value !== undefined && value !== null;
}

/**
 * Type guard to check if a string is not empty
 */
export function isNonEmptyString(value: any): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

/**
 * Formats a duration in milliseconds to a human-readable string
 */
export function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	return `${seconds}s`;
}

/**
 * Creates a delay promise for async operations
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely parses JSON with fallback value
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
	try {
		return JSON.parse(json);
	} catch {
		return fallback;
	}
}

/**
 * Creates a deep clone of an object
 */
export function deepClone<T>(obj: T): T {
	if (obj === null || typeof obj !== "object") {
		return obj;
	}

	if (obj instanceof Date) {
		return new Date(obj.getTime()) as T;
	}

	if (obj instanceof Array) {
		return obj.map((item) => deepClone(item)) as T;
	}

	const cloned = {} as T;
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			cloned[key] = deepClone(obj[key]);
		}
	}

	return cloned;
}
