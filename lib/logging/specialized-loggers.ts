/**
 * Specialized loggers for different use cases
 */

import { ComponentLogger } from "./logger-factory";

export class AgentLogger extends ComponentLogger {
	private agentId: string;

	constructor(agentId: string, baseLogger?: any) {
		super(baseLogger || console);
		this.agentId = agentId;
	}

	protected formatMessage(level: string, message: string, meta?: any): string {
		const baseMessage = super.formatMessage
			? super.formatMessage(level, message, meta)
			: `[${level.toUpperCase()}] ${message}`;
		return `[Agent:${this.agentId}] ${baseMessage}`;
	}

	logTask(taskId: string, status: string, details?: any) {
		this.info(`Task ${taskId} - ${status}`, { taskId, status, ...details });
	}

	logDecision(decision: string, reasoning?: string) {
		this.info(`Decision: ${decision}`, { decision, reasoning });
	}
}

export class SecurityLogger extends ComponentLogger {
	constructor(baseLogger?: any) {
		super(baseLogger || console);
	}

	protected formatMessage(level: string, message: string, meta?: any): string {
		const baseMessage = super.formatMessage
			? super.formatMessage(level, message, meta)
			: `[${level.toUpperCase()}] ${message}`;
		return `[SECURITY] ${baseMessage}`;
	}

	logAuthAttempt(userId: string, success: boolean, method: string) {
		const level = success ? "info" : "warn";
		this[level](`Auth attempt - User: ${userId}, Method: ${method}, Success: ${success}`, {
			userId,
			method,
			success,
			timestamp: new Date().toISOString(),
		});
	}

	logAccessDenied(userId: string, resource: string, reason: string) {
		this.warn(`Access denied - User: ${userId}, Resource: ${resource}`, {
			userId,
			resource,
			reason,
			timestamp: new Date().toISOString(),
		});
	}

	logSecurityEvent(
		eventType: string,
		severity: "low" | "medium" | "high" | "critical",
		details: any
	) {
		const level = severity === "critical" || severity === "high" ? "error" : "warn";
		this[level](`Security event: ${eventType} (${severity})`, {
			eventType,
			severity,
			...details,
			timestamp: new Date().toISOString(),
		});
	}
}
