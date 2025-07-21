/**
 * Alert system types and interfaces
 */

export enum CriticalErrorType {
	DATABASE_CONNECTION_FAILURE = "database_connection_failure",
	REDIS_CONNECTION_FAILURE = "redis_connection_failure",
	AUTH_SERVICE_FAILURE = "auth_service_failure",
	WORKFLOW_EXECUTION_FAILURE = "workflow_execution_failure",
	SYSTEM_HEALTH_FAILURE = "system_health_failure",
	PAYMENT_PROCESSING_FAILURE = "payment_processing_failure",
	EXTERNAL_API_FAILURE = "external_api_failure",
	MEMORY_USAGE_CRITICAL = "memory_usage_critical",
	CPU_USAGE_CRITICAL = "cpu_usage_critical",
	DISK_SPACE_CRITICAL = "disk_space_critical",
}

export enum AlertSeverity {
	LOW = "low",
	MEDIUM = "medium",
	HIGH = "high",
	CRITICAL = "critical",
}

export enum AlertChannelType {
	EMAIL = "email",
	SLACK = "slack",
	WEBHOOK = "webhook",
	SMS = "sms",
	DISCORD = "discord",
}

export interface AlertChannel {
	type: AlertChannelType;
	name: string;
	config: Record<string, any>;
	enabled: boolean;
}

export interface CriticalError {
	type: CriticalErrorType;
	message: string;
	severity: AlertSeverity;
	timestamp: Date;
	correlationId?: string;
	userId?: string;
	sessionId?: string;
	stackTrace?: string;
	metadata?: Record<string, any>;
}

export interface ErrorTemplate {
	type: CriticalErrorType;
	subject: string;
	severity: AlertSeverity;
	description: string;
	actionItems?: string[];
}

export interface AlertTransport {
	name: string;
	send(error: CriticalError): Promise<boolean>;
}

export interface AlertConfig {
	enabled: boolean;
	transports: AlertTransport[];
	rateLimiting?: {
		maxPerHour: number;
		cooldownMinutes: number;
	};
}
