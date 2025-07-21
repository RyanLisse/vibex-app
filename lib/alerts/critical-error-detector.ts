import type { LogEntry } from "winston";
import {
	AlertSeverity,
	type CriticalError,
	CriticalErrorType,
	type ErrorTemplate,
} from "./types";

/**
 * Critical Error Detector
 *
 * Analyzes log entries to detect critical system errors that require immediate attention.
 * Supports custom error patterns and provides standardized error classification.
 */
export class CriticalErrorDetector {
	private readonly errorPatterns: Map<CriticalErrorType, RegExp[]> = new Map();
	private readonly templates: Map<CriticalErrorType, ErrorTemplate> = new Map();

	constructor() {
		this.initializeDefaultPatterns();
		this.initializeTemplates();
	}

	/**
	 * Initialize default error patterns for common critical errors
	 */
	private initializeDefaultPatterns(): void {
		// Database connection patterns
		this.errorPatterns.set(CriticalErrorType.DATABASE_CONNECTION_FAILURE, [
			/database.*connection.*failed/i,
			/connection.*to.*database.*refused/i,
			/database.*connection.*timeout/i,
			/postgres.*connection.*error/i,
			/mysql.*connection.*error/i,
			/db.*connection.*lost/i,
		]);

		// Redis connection patterns
		this.errorPatterns.set(CriticalErrorType.REDIS_CONNECTION_FAILURE, [
			/redis.*connection.*error/i,
			/connection.*to.*redis.*failed/i,
			/redis.*connection.*timeout/i,
			/redis.*connection.*refused/i,
		]);

		// Authentication service patterns
		this.errorPatterns.set(CriticalErrorType.AUTH_SERVICE_FAILURE, [
			/oauth.*token.*exchange.*failed/i,
			/authentication.*service.*failed/i,
			/auth.*service.*unavailable/i,
			/jwt.*token.*validation.*failed/i,
			/session.*validation.*failed/i,
		]);

		// Workflow execution patterns
		this.errorPatterns.set(CriticalErrorType.WORKFLOW_EXECUTION_FAILURE, [
			/workflow.*execution.*failed/i,
			/inngest.*function.*failed/i,
			/step.*function.*error/i,
			/workflow.*timeout/i,
		]);

		// System health patterns
		this.errorPatterns.set(CriticalErrorType.SYSTEM_HEALTH_FAILURE, [
			/system.*health.*check.*failed/i,
			/health.*endpoint.*error/i,
			/service.*unavailable/i,
			/system.*overloaded/i,
		]);

		// External API patterns
		this.errorPatterns.set(CriticalErrorType.EXTERNAL_API_FAILURE, [
			/external.*api.*failed/i,
			/third.*party.*service.*error/i,
			/api.*rate.*limit.*exceeded/i,
			/upstream.*service.*timeout/i,
		]);

		// Resource usage patterns
		this.errorPatterns.set(CriticalErrorType.MEMORY_USAGE_CRITICAL, [
			/out.*of.*memory/i,
			/memory.*usage.*critical/i,
			/heap.*size.*exceeded/i,
		]);

		this.errorPatterns.set(CriticalErrorType.CPU_USAGE_CRITICAL, [
			/cpu.*usage.*critical/i,
			/high.*cpu.*load/i,
			/system.*overloaded/i,
		]);

		this.errorPatterns.set(CriticalErrorType.DISK_SPACE_CRITICAL, [
			/disk.*space.*low/i,
			/storage.*full/i,
			/no.*space.*left/i,
		]);
	}

	/**
	 * Initialize error templates for standardized messaging
	 */
	private initializeTemplates(): void {
		this.templates.set(CriticalErrorType.DATABASE_CONNECTION_FAILURE, {
			type: CriticalErrorType.DATABASE_CONNECTION_FAILURE,
			subject: "⚠️ Database Connection Failure",
			severity: AlertSeverity.CRITICAL,
			description:
				"Database connection has failed. This may affect all database operations.",
			actionItems: [
				"Check database server status",
				"Verify connection credentials",
				"Review network connectivity",
				"Check database logs",
			],
		});

		this.templates.set(CriticalErrorType.REDIS_CONNECTION_FAILURE, {
			type: CriticalErrorType.REDIS_CONNECTION_FAILURE,
			subject: "⚠️ Redis Connection Failure",
			severity: AlertSeverity.CRITICAL,
			description:
				"Redis connection has failed. This may affect caching and session management.",
			actionItems: [
				"Check Redis server status",
				"Verify Redis configuration",
				"Review network connectivity",
				"Check Redis logs",
			],
		});

		this.templates.set(CriticalErrorType.AUTH_SERVICE_FAILURE, {
			type: CriticalErrorType.AUTH_SERVICE_FAILURE,
			subject: "⚠️ Authentication Service Failure",
			severity: AlertSeverity.CRITICAL,
			description:
				"Authentication service has failed. Users may not be able to log in.",
			actionItems: [
				"Check OAuth providers",
				"Verify API keys and secrets",
				"Review authentication logs",
				"Test login flow",
			],
		});

		this.templates.set(CriticalErrorType.WORKFLOW_EXECUTION_FAILURE, {
			type: CriticalErrorType.WORKFLOW_EXECUTION_FAILURE,
			subject: "⚠️ Workflow Execution Failure",
			severity: AlertSeverity.HIGH,
			description:
				"A workflow execution has failed. This may affect background processing.",
			actionItems: [
				"Check workflow logs",
				"Verify Inngest configuration",
				"Review function code",
				"Check external dependencies",
			],
		});

		this.templates.set(CriticalErrorType.SYSTEM_HEALTH_FAILURE, {
			type: CriticalErrorType.SYSTEM_HEALTH_FAILURE,
			subject: "⚠️ System Health Failure",
			severity: AlertSeverity.CRITICAL,
			description:
				"System health check has failed. The system may be experiencing issues.",
			actionItems: [
				"Check system resources",
				"Review application logs",
				"Verify service status",
				"Monitor system metrics",
			],
		});

		this.templates.set(CriticalErrorType.EXTERNAL_API_FAILURE, {
			type: CriticalErrorType.EXTERNAL_API_FAILURE,
			subject: "⚠️ External API Failure",
			severity: AlertSeverity.HIGH,
			description:
				"External API service is failing. This may affect integrations.",
			actionItems: [
				"Check API status pages",
				"Verify API keys",
				"Review rate limiting",
				"Check network connectivity",
			],
		});

		this.templates.set(CriticalErrorType.MEMORY_USAGE_CRITICAL, {
			type: CriticalErrorType.MEMORY_USAGE_CRITICAL,
			subject: "⚠️ Critical Memory Usage",
			severity: AlertSeverity.CRITICAL,
			description:
				"Memory usage is critically high. The system may become unstable.",
			actionItems: [
				"Check memory usage patterns",
				"Review for memory leaks",
				"Consider scaling resources",
				"Optimize memory usage",
			],
		});

		this.templates.set(CriticalErrorType.CPU_USAGE_CRITICAL, {
			type: CriticalErrorType.CPU_USAGE_CRITICAL,
			subject: "⚠️ Critical CPU Usage",
			severity: AlertSeverity.CRITICAL,
			description: "CPU usage is critically high. Performance may be degraded.",
			actionItems: [
				"Check CPU usage patterns",
				"Identify resource-intensive processes",
				"Consider scaling resources",
				"Optimize performance",
			],
		});

		this.templates.set(CriticalErrorType.DISK_SPACE_CRITICAL, {
			type: CriticalErrorType.DISK_SPACE_CRITICAL,
			subject: "⚠️ Critical Disk Space",
			severity: AlertSeverity.CRITICAL,
			description: "Disk space is critically low. System operations may fail.",
			actionItems: [
				"Free up disk space",
				"Clean up temporary files",
				"Archive old logs",
				"Consider storage expansion",
			],
		});
	}

	/**
	 * Analyze a log entry and detect if it represents a critical error
	 */
	public detectCriticalError(logEntry: LogEntry): CriticalError | null {
		// Only analyze error-level logs
		if (logEntry.level !== "error") {
			return null;
		}

		// Check each error pattern
		for (const [errorType, patterns] of this.errorPatterns.entries()) {
			for (const pattern of patterns) {
				if (pattern.test(logEntry.message)) {
					const template = this.templates.get(errorType);

					return {
						type: errorType,
						message: logEntry.message,
						severity: template?.severity || AlertSeverity.HIGH,
						timestamp: new Date(),
						correlationId: logEntry.correlationId as string,
						userId: logEntry.userId as string,
						sessionId: logEntry.sessionId as string,
						stackTrace: logEntry.stack as string,
						metadata: logEntry.meta,
					};
				}
			}
		}

		return null;
	}

	/**
	 * Add a custom error pattern for a specific error type
	 */
	public addCustomPattern(errorType: CriticalErrorType, pattern: RegExp): void {
		const existingPatterns = this.errorPatterns.get(errorType) || [];
		this.errorPatterns.set(errorType, [...existingPatterns, pattern]);
	}

	/**
	 * Get the template for a specific error type
	 */
	public getTemplate(errorType: CriticalErrorType): ErrorTemplate | undefined {
		return this.templates.get(errorType);
	}

	/**
	 * Get all supported error types
	 */
	public getSupportedErrorTypes(): CriticalErrorType[] {
		return Array.from(this.errorPatterns.keys());
	}
}
