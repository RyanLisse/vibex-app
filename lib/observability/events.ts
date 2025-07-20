/**
 * Observability Events System
 *
 * Comprehensive agent execution tracking with OpenTelemetry integration
 * for real-time monitoring, debugging, and performance analysis.
 */

import { context, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "@/db/config";
	agentExecutions,
	observabilityEvents as observabilityEventsTable,
} from "@/db/schema";

// Event types for categorization
export type ObservabilityEventType =
	| "execution_start"
	| "execution_end"
	| "execution_error"
	| "step_start"
	| "step_end"
	| "step_error"
	| "memory_access"
	| "memory_update"
	| "query_start"
	| "query_end"
	| "sync_start"
	| "sync_end"
	| "wasm_operation"
	| "performance_metric"
	| "user_action"
	| "system_event";

// Event severity levels
export type EventSeverity = "debug" | "info" | "warn" | "error" | "critical";

// Event metadata structure
export interface EventMetadata {
	executionId?: string;
	stepId?: string;
	userId?: string;
	sessionId?: string;
	traceId?: string;
	spanId?: string;
	duration?: number;
	memoryUsage?: number;
	cpuUsage?: number;
	networkLatency?: number;
	wasmPerformance?: {
		initTime: number;
		executionTime: number;
		memoryUsage: number;
	};
	queryMetrics?: {
		queryTime: number;
		rowsAffected: number;
		cacheHit: boolean;
	};
	syncMetrics?: {
		syncTime: number;
		conflictsResolved: number;
		dataTransferred: number;
	};
	errorDetails?: {
		code: string;
		message: string;
		stack?: string;
		context?: Record<string, any>;
	};
	[key: string]: any;
}

// Observability event interface
export interface ObservabilityEvent {
	id: string;
	type: ObservabilityEventType;
	severity: EventSeverity;
	message: string;
	metadata: EventMetadata;
	timestamp: Date;
	source: string;
	tags: string[];
}

// Event collection and storage class
export class ObservabilityEventCollector {
	private static instance: ObservabilityEventCollector;
	private eventBuffer: ObservabilityEvent[] = [];
	private flushInterval: NodeJS.Timeout | null = null;
	private readonly BUFFER_SIZE = 100;
	private readonly FLUSH_INTERVAL = 5000; // 5 seconds

	private constructor() {
		this.startPeriodicFlush();
	}

	static getInstance(): ObservabilityEventCollector {
		if (!ObservabilityEventCollector.instance) {
			ObservabilityEventCollector.instance = new ObservabilityEventCollector();
		}
		return ObservabilityEventCollector.instance;
	}

	/**
	 * Collect an observability event
	 */
	async collectEvent(
		type: ObservabilityEventType,
		severity: EventSeverity,
		message: string,
		metadata: EventMetadata = {},
		source = "system",
		tags: string[] = [],
	): Promise<void> {
		const event: ObservabilityEvent = {
			id: ulid(),
			type,
			severity,
			message,
			metadata: {
				...metadata,
				traceId: trace.getActiveSpan()?.spanContext().traceId,
				spanId: trace.getActiveSpan()?.spanContext().spanId,
			},
			timestamp: new Date(),
			source,
			tags,
		};

		// Add to buffer
		this.eventBuffer.push(event);

		// Flush if buffer is full
		if (this.eventBuffer.length >= this.BUFFER_SIZE) {
			await this.flushEvents();
		}

		// Also send to OpenTelemetry
		this.sendToOpenTelemetry(event);
	}

	/**
	 * Flush events to database
	 */
	private async flushEvents(): Promise<void> {
		if (this.eventBuffer.length === 0) return;

		const eventsToFlush = [...this.eventBuffer];
		this.eventBuffer = [];

		try {
			await db.insert(observabilityEventsTable).values(
				eventsToFlush.map((event) => ({
					id: event.id,
					type: event.type,
					severity: event.severity,
					message: event.message,
					metadata: event.metadata,
					timestamp: event.timestamp,
					source: event.source,
					tags: event.tags,
					executionId: event.metadata.executionId || null,
					traceId: event.metadata.traceId || null,
					spanId: event.metadata.spanId || null,
					data: event.metadata,
					category: event.source,
				})),
			);
		} catch (error) {
			console.error("Failed to flush observability events:", error);
			// Re-add events to buffer for retry
			this.eventBuffer.unshift(...eventsToFlush);
		}
	}

	/**
	 * Send event to OpenTelemetry
	 */
	private sendToOpenTelemetry(event: ObservabilityEvent): void {
		const tracer = trace.getTracer("observability-events");
		const span = tracer.startSpan(`event.${event.type}`, {
			kind: SpanKind.INTERNAL,
			attributes: {
				"event.type": event.type,
				"event.severity": event.severity,
				"event.source": event.source,
				"event.message": event.message,
				"event.tags": event.tags.join(","),
				...Object.entries(event.metadata).reduce(
					(acc, [key, value]) => {
						if (
							typeof value === "string" ||
							typeof value === "number" ||
							typeof value === "boolean"
						) {
							acc[`event.metadata.${key}`] = value;
						}
						return acc;
					},
					{} as Record<string, string | number | boolean>,
				),
			},
		});

		if (event.severity === "error" || event.severity === "critical") {
			span.setStatus({ code: SpanStatusCode.ERROR, message: event.message });
		}

		span.end();
	}

	/**
	 * Start periodic flush
	 */
	private startPeriodicFlush(): void {
		this.flushInterval = setInterval(() => {
			this.flushEvents().catch(console.error);
		}, this.FLUSH_INTERVAL);
	}

	/**
	 * Stop periodic flush
	 */
	stopPeriodicFlush(): void {
		if (this.flushInterval) {
			clearInterval(this.flushInterval);
			this.flushInterval = null;
		}
	}

	/**
	 * Force flush all pending events
	 */
	async forceFlush(): Promise<void> {
		await this.flushEvents();
	}
}

// Event query and filtering utilities
export class ObservabilityEventQuery {
	/**
	 * Get events by execution ID
	 */
	static async getEventsByExecution(
		executionId: string,
	): Promise<ObservabilityEvent[]> {
		const events = await db
			.select()
			.from(observabilityEventsTable)
			.where(eq(observabilityEventsTable.metadata, { executionId }))
			.orderBy(desc(observabilityEventsTable.timestamp));

		return events.map(ObservabilityEventQuery.mapDbEventToEvent);
	}

	/**
	 * Get events by type and time range
	 */
	static async getEventsByTypeAndTimeRange(
		types: ObservabilityEventType[],
		startTime: Date,
		endTime: Date,
		limit = 1000,
	): Promise<ObservabilityEvent[]> {
		const events = await db
			.select()
			.from(observabilityEventsTable)
			.where(
				and(
					inArray(observabilityEventsTable.type, types as any),
					gte(observabilityEventsTable.timestamp, startTime),
					lte(observabilityEventsTable.timestamp, endTime),
				),
			)
			.orderBy(desc(observabilityEventsTable.timestamp))
			.limit(limit);

		return events.map(ObservabilityEventQuery.mapDbEventToEvent);
	}

	/**
	 * Get events by severity
	 */
	static async getEventsBySeverity(
		severity: EventSeverity[],
		limit = 1000,
	): Promise<ObservabilityEvent[]> {
		const events = await db
			.select()
			.from(observabilityEventsTable)
			.where(inArray(observabilityEventsTable.severity, severity as any))
			.orderBy(desc(observabilityEventsTable.timestamp))
			.limit(limit);

		return events.map(ObservabilityEventQuery.mapDbEventToEvent);
	}

	/**
	 * Get recent events
	 */
	static async getRecentEvents(limit = 100): Promise<ObservabilityEvent[]> {
		const events = await db
			.select()
			.from(observabilityEventsTable)
			.orderBy(desc(observabilityEventsTable.timestamp))
			.limit(limit);

		return events.map(ObservabilityEventQuery.mapDbEventToEvent);
	}

	/**
	 * Map database event to event interface
	 */
	private static mapDbEventToEvent(dbEvent: any): ObservabilityEvent {
		return {
			id: dbEvent.id,
			type: dbEvent.type,
			severity: dbEvent.severity,
			message: dbEvent.message,
			metadata: dbEvent.metadata || {},
			timestamp: dbEvent.timestamp,
			source: dbEvent.source,
			tags: dbEvent.tags || [],
		};
	}
}

// Convenience functions for common event types
export const observabilityEvents = {
	collector: ObservabilityEventCollector.getInstance(),
	query: ObservabilityEventQuery,

	// Execution events
	executionStart: (executionId: string, metadata: EventMetadata = {}) =>
		ObservabilityEventCollector.getInstance().collectEvent(
			"execution_start",
			"info",
			`Execution started: ${executionId}`,
			{ ...metadata, executionId },
			"agent",
			["execution", "start"],
		),

	executionEnd: (
		executionId: string,
		duration: number,
		metadata: EventMetadata = {},
	) =>
		ObservabilityEventCollector.getInstance().collectEvent(
			"execution_end",
			"info",
			`Execution completed: ${executionId}`,
			{ ...metadata, executionId, duration },
			"agent",
			["execution", "end"],
		),

	executionError: (
		executionId: string,
		error: Error,
		metadata: EventMetadata = {},
	) =>
		ObservabilityEventCollector.getInstance().collectEvent(
			"execution_error",
			"error",
			`Execution failed: ${executionId}`,
			{
				...metadata,
				executionId,
				errorDetails: {
					code: error.name,
					message: error.message,
					stack: error.stack,
				},
			},
			"agent",
			["execution", "error"],
		),

	// Performance events
	performanceMetric: (
		metric: string,
		value: number,
		metadata: EventMetadata = {},
	) =>
		ObservabilityEventCollector.getInstance().collectEvent(
			"performance_metric",
			"debug",
			`Performance metric: ${metric} = ${value}`,
			{ ...metadata, [metric]: value },
			"system",
			["performance", metric],
		),

	// WASM events
	wasmOperation: (
		operation: string,
		performance: EventMetadata["wasmPerformance"],
		metadata: EventMetadata = {},
	) =>
		ObservabilityEventCollector.getInstance().collectEvent(
			"wasm_operation",
			"debug",
			`WASM operation: ${operation}`,
			{ ...metadata, wasmPerformance: performance },
			"wasm",
			["wasm", operation],
		),
};
