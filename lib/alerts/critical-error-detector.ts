import { randomUUID } from "crypto";
import type { LogEntry } from "winston";
import type { EventSeverity } from "../observability/types";
	type AlertTemplate,
	type CriticalError,
	CriticalErrorType,
} from "./types";

export class CriticalErrorDetector {
	private readonly errorPatterns: Map<CriticalErrorType, RegExp[]>;
	private readonly templates: Map<CriticalErrorType, AlertTemplate>;

	constructor() {
		this.errorPatterns = new Map();
		this.templates = new Map();
		this.initializePatterns();
		this.initializeTemplates();
	}

	private initializePatterns(): void {
		this.errorPatterns.set(CriticalErrorType.DATABASE_CONNECTION_FAILURE, [
			/connection.*failed/i,
			/database.*unavailable/i,
			/connection.*timeout/i,
			/ECONNREFUSED.*database/i,
			/authentication.*failed.*database/i,
		]);

		this.errorPatterns.set(CriticalErrorType.REDIS_CONNECTION_FAILURE, [
			/redis.*connection.*error/i,
			/redis.*connection.*closed/i,
			/redis.*timeout/i,
			/ECONNREFUSED.*redis/i,
		]);

		this.errorPatterns.set(CriticalErrorType.AUTH_SERVICE_FAILURE, [
			/authentication.*service.*failed/i,
			/oauth.*token.*exchange.*failed/i,
			/unauthorized.*access/i,
			/ExchangeFailed/i,
			/invalid.*credentials/i,
		]);

		this.errorPatterns.set(CriticalErrorType.WORKFLOW_EXECUTION_FAILURE, [
			/workflow.*execution.*failed/i,
			/workflow.*step.*failed/i,
			/execution.*error/i,
			/WorkflowExecutionError/i,
		]);

		this.errorPatterns.set(CriticalErrorType.MEMORY_THRESHOLD_EXCEEDED, [
			/memory.*usage.*exceeded/i,
			/out.*of.*memory/i,
			/heap.*limit.*reached/i,
		]);

		this.errorPatterns.set(CriticalErrorType.THIRD_PARTY_SERVICE_FAILURE, [
			/anthropic.*api.*failed/i,
			/openai.*api.*failed/i,
			/github.*api.*failed/i,
			/inngest.*failed/i,
			/external.*service.*unavailable/i,
		]);

		this.errorPatterns.set(CriticalErrorType.SYSTEM_HEALTH_FAILURE, [
			/system.*health.*unhealthy/i,
			/health.*check.*failed/i,
			/service.*unavailable/i,
		]);

		this.errorPatterns.set(CriticalErrorType.API_GATEWAY_FAILURE, [
			/api.*gateway.*failed/i,
			/request.*processing.*failed/i,
			/server.*error.*500/i,
		]);

		this.errorPatterns.set(CriticalErrorType.FILE_SYSTEM_FAILURE, [
			/file.*system.*error/i,
			/disk.*space.*full/i,
			/permission.*denied.*file/i,
			/ENOENT/i,
			/EACCES/i,
		]);
	}

	private initializeTemplates(): void {
		this.templates.set(CriticalErrorType.DATABASE_CONNECTION_FAILURE, {
			type: CriticalErrorType.DATABASE_CONNECTION_FAILURE,
			subject: "🚨 Critical: Database Connection Failure",
			message: "Database connection has failed. Service may be unavailable.",
			severity: "critical" as EventSeverity,
			priority: "critical",
		});

		this.templates.set(CriticalErrorType.REDIS_CONNECTION_FAILURE, {
			type: CriticalErrorType.REDIS_CONNECTION_FAILURE,
			subject: "⚠️ Critical: Redis Connection Failure",
			message:
				"Redis connection has failed. Caching and session management may be impacted.",
			severity: "critical" as EventSeverity,
			priority: "high",
		});

		this.templates.set(CriticalErrorType.AUTH_SERVICE_FAILURE, {
			type: CriticalErrorType.AUTH_SERVICE_FAILURE,
			subject: "🔐 Critical: Authentication Service Failure",
			message:
				"Authentication service has failed. Users may not be able to log in.",
			severity: "critical" as EventSeverity,
			priority: "critical",
		});

		this.templates.set(CriticalErrorType.WORKFLOW_EXECUTION_FAILURE, {
			type: CriticalErrorType.WORKFLOW_EXECUTION_FAILURE,
			subject: "⚙️ Critical: Workflow Execution Failure",
			message:
				"Workflow execution has failed. Automated processes may be impacted.",
			severity: "high" as EventSeverity,
			priority: "high",
		});

		this.templates.set(CriticalErrorType.MEMORY_THRESHOLD_EXCEEDED, {
			type: CriticalErrorType.MEMORY_THRESHOLD_EXCEEDED,
			subject: "📈 Critical: Memory Threshold Exceeded",
			message: "System memory usage has exceeded critical thresholds.",
			severity: "critical" as EventSeverity,
			priority: "critical",
		});

		this.templates.set(CriticalErrorType.THIRD_PARTY_SERVICE_FAILURE, {
			type: CriticalErrorType.THIRD_PARTY_SERVICE_FAILURE,
			subject: "🔗 High: Third-party Service Failure",
			message: "External service integration has failed.",
			severity: "high" as EventSeverity,
			priority: "medium",
		});

		this.templates.set(CriticalErrorType.SYSTEM_HEALTH_FAILURE, {
			type: CriticalErrorType.SYSTEM_HEALTH_FAILURE,
			subject: "💔 Critical: System Health Failure",
			message: "System health check has failed. Service may be degraded.",
			severity: "critical" as EventSeverity,
			priority: "critical",
		});

		this.templates.set(CriticalErrorType.API_GATEWAY_FAILURE, {
			type: CriticalErrorType.API_GATEWAY_FAILURE,
			subject: "🌐 Critical: API Gateway Failure",
			message: "API gateway has failed. API endpoints may be unavailable.",
			severity: "critical" as EventSeverity,
			priority: "critical",
		});

		this.templates.set(CriticalErrorType.FILE_SYSTEM_FAILURE, {
			type: CriticalErrorType.FILE_SYSTEM_FAILURE,
			subject: "💾 High: File System Failure",
			message: "File system error detected. File operations may be impacted.",
			severity: "high" as EventSeverity,
			priority: "medium",
		});
	}

	detectCriticalError(logEntry: LogEntry): CriticalError | null {
		if (logEntry.level !== "error") {
			return null;
		}

		const message = logEntry.message || "";
		const metadata = logEntry.meta || {};

		for (const [errorType, patterns] of this.errorPatterns) {
			for (const pattern of patterns) {
				if (pattern.test(message) || this.testMetadata(metadata, pattern)) {
					return this.createCriticalError(errorType, logEntry);
				}
			}
		}

		// Check for high frequency errors that might indicate a critical issue
		if (this.isHighFrequencyError(logEntry)) {
			return this.createCriticalError(
				CriticalErrorType.ERROR_RATE_THRESHOLD_EXCEEDED,
				logEntry,
			);
		}

		return null;
	}

	private testMetadata(metadata: any, pattern: RegExp): boolean {
		const metadataString = JSON.stringify(metadata);
		return pattern.test(metadataString);
	}

	private isHighFrequencyError(logEntry: LogEntry): boolean {
		// This would be implemented with proper frequency tracking
		// For now, we'll detect based on certain error patterns
		const message = logEntry.message || "";
		return (
			/error.*rate.*exceeded/i.test(message) ||
			/too.*many.*errors/i.test(message)
		);
	}

	private createCriticalError(
		type: CriticalErrorType,
		logEntry: LogEntry,
	): CriticalError {
		const template = this.templates.get(type);
		const now = new Date();

		return {
			id: randomUUID(),
			timestamp: now,
			severity: template?.severity || "high",
			type,
			message:
				logEntry.message || template?.message || "Critical error detected",
			source: logEntry.service || logEntry.component || "unknown",
			metadata: {
				...logEntry.meta,
				level: logEntry.level,
				template: template?.subject,
			},
			stackTrace: logEntry.stack,
			correlationId: logEntry.correlationId,
			environment: process.env.NODE_ENV || "development",
			userId: logEntry.userId,
			sessionId: logEntry.sessionId,
			resolved: false,
			occurrenceCount: 1,
			lastOccurrence: now,
			firstOccurrence: now,
		};
	}

	getTemplate(type: CriticalErrorType): AlertTemplate | undefined {
		return this.templates.get(type);
	}

	addCustomPattern(type: CriticalErrorType, pattern: RegExp): void {
		const patterns = this.errorPatterns.get(type) || [];
		patterns.push(pattern);
		this.errorPatterns.set(type, patterns);
	}
}
