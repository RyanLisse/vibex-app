import { createDefaultLoggingConfig } from "./defaults";
import { LoggerFactory } from "./logger-factory";

export class AgentLogger {
	private logger: any;

	constructor() {
		const config = createDefaultLoggingConfig();
		const factory = LoggerFactory.getInstance(config);
		this.logger = factory.createLogger("agent-system");
	}

	agentStarted(agentId: string, agentType: string, metadata?: any): void {
		this.logger.info("Agent Started", {
			agentId,
			agentType,
			event: "agent_started",
			...metadata,
		});
	}

	agentStopped(agentId: string, reason: string, metadata?: any): void {
		this.logger.info("Agent Stopped", {
			agentId,
			reason,
			event: "agent_stopped",
			...metadata,
		});
	}

	taskAssigned(
		agentId: string,
		taskId: string,
		taskType: string,
		metadata?: any,
	): void {
		this.logger.info("Task Assigned", {
			agentId,
			taskId,
			taskType,
			event: "task_assigned",
			...metadata,
		});
	}

	taskCompleted(
		agentId: string,
		taskId: string,
		duration: number,
		result: any,
	): void {
		this.logger.info("Task Completed", {
			agentId,
			taskId,
			duration,
			event: "task_completed",
			success: true,
			resultSize: JSON.stringify(result).length,
		});
	}

	taskFailed(
		agentId: string,
		taskId: string,
		error: Error,
		context?: any,
	): void {
		this.logger.error("Task Failed", error, {
			agentId,
			taskId,
			event: "task_failed",
			context,
		});
	}

	llmRequest(
		agentId: string,
		provider: string,
		model: string,
		tokenUsage: any,
		duration: number,
	): void {
		this.logger.debug("LLM Request", {
			agentId,
			provider,
			model,
			tokenUsage,
			duration,
			event: "llm_request",
		});
	}

	llmError(agentId: string, provider: string, error: Error): void {
		this.logger.error("LLM Error", error, {
			agentId,
			provider,
			event: "llm_error",
		});
	}

	agentCommunication(
		fromAgent: string,
		toAgent: string,
		messageType: string,
		payloadSize: number,
	): void {
		this.logger.debug("Agent Communication", {
			fromAgent,
			toAgent,
			messageType,
			payloadSize,
			event: "agent_communication",
		});
	}

	performanceMetrics(agentId: string, metrics: any): void {
		this.logger.info("Agent Performance", {
			agentId,
			metrics,
			event: "performance_metrics",
		});
	}
}

export class DatabaseLogger {
	private logger: any;

	constructor() {
		const config = createDefaultLoggingConfig();
		const factory = LoggerFactory.getInstance(config);
		this.logger = factory.createLogger("database");
	}

	queryExecuted(query: string, duration: number, rowsAffected?: number): void {
		this.logger.debug("Query Executed", {
			query: this.sanitizeQuery(query),
			duration,
			rowsAffected,
			event: "query_executed",
		});
	}

	queryError(query: string, error: Error): void {
		this.logger.error("Query Error", error, {
			query: this.sanitizeQuery(query),
			event: "query_error",
		});
	}

	slowQuery(query: string, duration: number, threshold: number): void {
		this.logger.warn("Slow Query Detected", {
			query: this.sanitizeQuery(query),
			duration,
			threshold,
			event: "slow_query",
		});
	}

	connectionAcquired(poolSize: number, activeConnections: number): void {
		this.logger.debug("Connection Acquired", {
			poolSize,
			activeConnections,
			event: "connection_acquired",
		});
	}

	connectionReleased(poolSize: number, activeConnections: number): void {
		this.logger.debug("Connection Released", {
			poolSize,
			activeConnections,
			event: "connection_released",
		});
	}

	migrationStarted(migrationName: string): void {
		this.logger.info("Migration Started", {
			migrationName,
			event: "migration_started",
		});
	}

	migrationCompleted(migrationName: string, duration: number): void {
		this.logger.info("Migration Completed", {
			migrationName,
			duration,
			event: "migration_completed",
		});
	}

	migrationFailed(migrationName: string, error: Error): void {
		this.logger.error("Migration Failed", error, {
			migrationName,
			event: "migration_failed",
		});
	}

	private sanitizeQuery(query: string): string {
		return query
			.replace(/password\s*=\s*['"][^'"]*['"]/gi, "password='***'")
			.replace(/token\s*=\s*['"][^'"]*['"]/gi, "token='***'")
			.replace(/secret\s*=\s*['"][^'"]*['"]/gi, "secret='***'")
			.substring(0, 1000);
	}
}

export class SecurityLogger {
	private logger: any;

	constructor() {
		const config = createDefaultLoggingConfig();
		const factory = LoggerFactory.getInstance(config);
		this.logger = factory.createLogger("security");
	}

	authenticationAttempt(
		userId: string,
		method: string,
		success: boolean,
		metadata?: any,
	): void {
		this.logger.info("Authentication Attempt", {
			userId,
			method,
			success,
			event: "auth_attempt",
			...metadata,
		});
	}

	authenticationFailure(userId: string, reason: string, ip?: string): void {
		this.logger.warn("Authentication Failure", {
			userId,
			reason,
			ip,
			event: "auth_failure",
		});
	}

	unauthorizedAccess(
		userId: string,
		resource: string,
		action: string,
		ip?: string,
	): void {
		this.logger.warn("Unauthorized Access", {
			userId,
			resource,
			action,
			ip,
			event: "unauthorized_access",
		});
	}

	rateLimitExceeded(
		userId: string,
		endpoint: string,
		limit: number,
		ip?: string,
	): void {
		this.logger.warn("Rate Limit Exceeded", {
			userId,
			endpoint,
			limit,
			ip,
			event: "rate_limit_exceeded",
		});
	}

	suspiciousActivity(
		userId: string,
		activity: string,
		risk: "low" | "medium" | "high",
		metadata?: any,
	): void {
		this.logger.warn("Suspicious Activity", {
			userId,
			activity,
			risk,
			event: "suspicious_activity",
			...metadata,
		});
	}

	dataAccess(
		userId: string,
		dataType: string,
		action: string,
		recordCount?: number,
	): void {
		this.logger.info("Data Access", {
			userId,
			dataType,
			action,
			recordCount,
			event: "data_access",
		});
	}

	securityEvent(
		eventType: string,
		severity: "low" | "medium" | "high" | "critical",
		details: any,
	): void {
		this.logger.warn("Security Event", {
			eventType,
			severity,
			details,
			event: "security_event",
		});
	}
}

export class PerformanceLogger {
	private logger: any;

	constructor() {
		const config = createDefaultLoggingConfig();
		const factory = LoggerFactory.getInstance(config);
		this.logger = factory.createLogger("performance");
	}

	operationTiming(operation: string, duration: number, metadata?: any): void {
		this.logger.info("Operation Timing", {
			operation,
			duration,
			event: "operation_timing",
			...metadata,
		});
	}

	slowOperation(operation: string, duration: number, threshold: number): void {
		this.logger.warn("Slow Operation", {
			operation,
			duration,
			threshold,
			event: "slow_operation",
		});
	}

	memoryUsage(usage: NodeJS.MemoryUsage): void {
		this.logger.debug("Memory Usage", {
			rss: Math.round(usage.rss / 1024 / 1024),
			heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
			heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
			external: Math.round(usage.external / 1024 / 1024),
			event: "memory_usage",
		});
	}

	cpuUsage(usage: NodeJS.CpuUsage): void {
		this.logger.debug("CPU Usage", {
			user: usage.user,
			system: usage.system,
			event: "cpu_usage",
		});
	}

	httpRequestTiming(
		method: string,
		path: string,
		statusCode: number,
		duration: number,
	): void {
		this.logger.info("HTTP Request Timing", {
			method,
			path,
			statusCode,
			duration,
			event: "http_request_timing",
		});
	}

	cacheHit(key: string, operation: string): void {
		this.logger.debug("Cache Hit", {
			key,
			operation,
			event: "cache_hit",
		});
	}

	cacheMiss(key: string, operation: string): void {
		this.logger.debug("Cache Miss", {
			key,
			operation,
			event: "cache_miss",
		});
	}
}
