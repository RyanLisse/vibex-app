/**
 * Enhanced Observability Events System
 *
 * Comprehensive agent execution tracking with OpenTelemetry integration,
 * real-time event streaming, and performance metrics collection.
 */

import {
	context,
	metrics as otelMetrics,
	SpanKind,
	SpanStatusCode,
	trace,
} from "@opentelemetry/api";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "@/db/config";
import { agentExecutions, observabilityEvents as observabilityEventsTable } from "@/db/schema";
import { getTelemetryConfig } from "@/lib/telemetry";
import type {
	EventMetadata,
	EventSeverity,
	ObservabilityEvent,
	ObservabilityEventType,
} from "./events";
import { metrics as performanceMetrics } from "./metrics";
import { eventStream } from "./streaming";

// Enhanced agent execution context
export interface AgentExecutionContext {
	executionId: string;
	agentType: string;
	taskId?: string;
	userId?: string;
	sessionId?: string;
	parentExecutionId?: string;
	metadata: Record<string, any>;
	startTime: Date;
	traceId?: string;
	spanId?: string;
}

// Performance metrics for agent executions
export interface AgentPerformanceMetrics {
	executionTime: number;
	memoryUsage?: number;
	cpuUsage?: number;
	tokenCount?: number;
	apiCalls?: number;
	cacheHits?: number;
	cacheMisses?: number;
	wasmOperations?: number;
	databaseQueries?: number;
	networkRequests?: number;
}

// Enhanced observability service
export class EnhancedObservabilityService {
	private static instance: EnhancedObservabilityService;
	private tracer = trace.getTracer("enhanced-observability");
	private meter = otelMetrics.getMeter("enhanced-observability");
	private config = getTelemetryConfig();

	// Metrics instruments
	private executionCounter = this.meter.createCounter("agent_executions_total", {
		description: "Total number of agent executions",
	});

	private executionDuration = this.meter.createHistogram("agent_execution_duration_ms", {
		description: "Agent execution duration in milliseconds",
	});

	private errorCounter = this.meter.createCounter("agent_execution_errors_total", {
		description: "Total number of agent execution errors",
	});

	private memoryGauge = this.meter.createUpDownCounter("agent_memory_usage_bytes", {
		description: "Agent memory usage in bytes",
	});

	// Active executions tracking
	private activeExecutions: Map<string, AgentExecutionContext> = new Map();

	// Event buffer for batch processing
	private eventBuffer: ObservabilityEvent[] = [];
	private flushTimer: NodeJS.Timeout | null = null;

	private constructor() {
		this.startPeriodicFlush();
	}

	static getInstance(): EnhancedObservabilityService {
		if (!EnhancedObservabilityService.instance) {
			EnhancedObservabilityService.instance = new EnhancedObservabilityService();
		}
		return EnhancedObservabilityService.instance;
	}

	/**
	 * Start tracking an agent execution
	 */
	async startAgentExecution(
		agentType: string,
		operation: string,
		metadata: Record<string, any> = {},
		taskId?: string,
		userId?: string,
		sessionId?: string,
		parentExecutionId?: string
	): Promise<string> {
		const executionId = ulid();
		const startTime = new Date();

		// Get current trace context
		const activeSpan = trace.getActiveSpan();
		const traceId = activeSpan?.spanContext().traceId;
		const spanId = activeSpan?.spanContext().spanId;

		// Create execution context
		const executionContext: AgentExecutionContext = {
			executionId,
			agentType,
			taskId,
			userId,
			sessionId,
			parentExecutionId,
			metadata: {
				...metadata,
				operation,
			},
			startTime,
			traceId,
			spanId,
		};

		// Store active execution
		this.activeExecutions.set(executionId, executionContext);

		// Create database record
		await db.insert(agentExecutions).values({
			id: executionId,
			taskId: taskId || null,
			agentType,
			status: "running",
			startedAt: startTime,
			input: this.config.agentTracking?.includeInputOutput ? metadata.input : null,
			metadata: {
				...metadata,
				operation,
				parentExecutionId,
				userId,
				sessionId,
			},
			traceId: traceId || null,
		});

		// Record metrics
		this.executionCounter.add(1, {
			agent_type: agentType,
			operation,
			status: "started",
		});

		// Collect observability event
		await this.collectEvent(
			"execution_start",
			"info",
			`Agent execution started: ${agentType}.${operation}`,
			{
				executionId,
				agentType,
				operation,
				taskId,
				userId,
				sessionId,
				parentExecutionId,
				traceId,
				spanId,
			},
			"agent",
			["execution", "start", agentType]
		);

		// Start OpenTelemetry span
		const span = this.tracer.startSpan(`agent.${agentType}.${operation}`, {
			kind: SpanKind.INTERNAL,
			attributes: {
				"agent.type": agentType,
				"agent.operation": operation,
				"agent.execution_id": executionId,
				"agent.task_id": taskId || "",
				"agent.user_id": userId || "",
				"agent.session_id": sessionId || "",
				"agent.parent_execution_id": parentExecutionId || "",
			},
		});

		// Store span in context for later use
		executionContext.metadata.span = span;

		return executionId;
	}

	/**
	 * Complete an agent execution
	 */
	async completeAgentExecution(
		executionId: string,
		output?: any,
		performanceMetrics?: AgentPerformanceMetrics
	): Promise<void> {
		const executionContext = this.activeExecutions.get(executionId);
		if (!executionContext) {
			throw new Error(`Execution context not found for ID: ${executionId}`);
		}

		const endTime = new Date();
		const duration = endTime.getTime() - executionContext.startTime.getTime();

		// Update database record
		await db
			.update(agentExecutions)
			.set({
				status: "completed",
				completedAt: endTime,
				output: this.config.agentTracking?.includeInputOutput ? output : null,
				executionTimeMs: duration,
				tokenUsage: performanceMetrics?.tokenCount
					? { total: performanceMetrics.tokenCount }
					: null,
				metadata: {
					...executionContext.metadata,
					performanceMetrics,
				},
			})
			.where(eq(agentExecutions.id, executionId));

		// Record metrics
		this.executionDuration.record(duration, {
			agent_type: executionContext.agentType,
			operation: executionContext.metadata.operation,
			status: "completed",
		});

		if (performanceMetrics?.memoryUsage) {
			this.memoryGauge.add(performanceMetrics.memoryUsage, {
				agent_type: executionContext.agentType,
			});
		}

		// Collect observability event
		await this.collectEvent(
			"execution_end",
			"info",
			`Agent execution completed: ${executionContext.agentType}.${executionContext.metadata.operation}`,
			{
				executionId,
				agentType: executionContext.agentType,
				operation: executionContext.metadata.operation,
				duration,
				performanceMetrics,
				taskId: executionContext.taskId,
				userId: executionContext.userId,
				sessionId: executionContext.sessionId,
				traceId: executionContext.traceId,
				spanId: executionContext.spanId,
			},
			"agent",
			["execution", "end", executionContext.agentType]
		);

		// Complete OpenTelemetry span
		const span = executionContext.metadata.span;
		if (span) {
			span.setAttributes({
				"agent.execution_time_ms": duration,
				"agent.status": "completed",
				...(performanceMetrics && {
					"agent.memory_usage": performanceMetrics.memoryUsage || 0,
					"agent.cpu_usage": performanceMetrics.cpuUsage || 0,
					"agent.token_count": performanceMetrics.tokenCount || 0,
					"agent.api_calls": performanceMetrics.apiCalls || 0,
				}),
			});
			span.setStatus({ code: SpanStatusCode.OK });
			span.end();
		}

		// Remove from active executions
		this.activeExecutions.delete(executionId);

		// Record performance metrics
		if (performanceMetrics) {
			performanceMetrics.recordMetric("agent_execution_time", duration);
			if (performanceMetrics.memoryUsage) {
				performanceMetrics.recordMetric("agent_memory_usage", performanceMetrics.memoryUsage);
			}
			if (performanceMetrics.cpuUsage) {
				performanceMetrics.recordMetric("agent_cpu_usage", performanceMetrics.cpuUsage);
			}
		}
	}

	/**
	 * Fail an agent execution
	 */
	async failAgentExecution(
		executionId: string,
		error: Error,
		performanceMetrics?: AgentPerformanceMetrics
	): Promise<void> {
		const executionContext = this.activeExecutions.get(executionId);
		if (!executionContext) {
			throw new Error(`Execution context not found for ID: ${executionId}`);
		}

		const endTime = new Date();
		const duration = endTime.getTime() - executionContext.startTime.getTime();

		// Update database record
		await db
			.update(agentExecutions)
			.set({
				status: "failed",
				completedAt: endTime,
				error: error.message,
				executionTimeMs: duration,
				metadata: {
					...executionContext.metadata,
					error: {
						name: error.name,
						message: error.message,
						stack: error.stack,
					},
					performanceMetrics,
				},
			})
			.where(eq(agentExecutions.id, executionId));

		// Record metrics
		this.errorCounter.add(1, {
			agent_type: executionContext.agentType,
			operation: executionContext.metadata.operation,
			error_type: error.name,
		});

		this.executionDuration.record(duration, {
			agent_type: executionContext.agentType,
			operation: executionContext.metadata.operation,
			status: "failed",
		});

		// Collect observability event
		await this.collectEvent(
			"execution_error",
			"error",
			`Agent execution failed: ${executionContext.agentType}.${executionContext.metadata.operation}`,
			{
				executionId,
				agentType: executionContext.agentType,
				operation: executionContext.metadata.operation,
				duration,
				errorDetails: {
					code: error.name,
					message: error.message,
					stack: error.stack,
				},
				performanceMetrics,
				taskId: executionContext.taskId,
				userId: executionContext.userId,
				sessionId: executionContext.sessionId,
				traceId: executionContext.traceId,
				spanId: executionContext.spanId,
			},
			"agent",
			["execution", "error", executionContext.agentType]
		);

		// Complete OpenTelemetry span with error
		const span = executionContext.metadata.span;
		if (span) {
			span.setAttributes({
				"agent.execution_time_ms": duration,
				"agent.status": "failed",
				"agent.error_type": error.name,
				"agent.error_message": error.message,
			});
			span.recordException(error);
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: error.message,
			});
			span.end();
		}

		// Remove from active executions
		this.activeExecutions.delete(executionId);
	}

	/**
	 * Record a step within an agent execution
	 */
	async recordExecutionStep(
		executionId: string,
		stepName: string,
		stepData: any,
		stepDuration?: number
	): Promise<void> {
		const executionContext = this.activeExecutions.get(executionId);
		if (!executionContext) {
			console.warn(`Execution context not found for step recording: ${executionId}`);
			return;
		}

		await this.collectEvent(
			"step_start",
			"debug",
			`Execution step: ${stepName}`,
			{
				executionId,
				stepName,
				stepData,
				stepDuration,
				agentType: executionContext.agentType,
				operation: executionContext.metadata.operation,
				traceId: executionContext.traceId,
				spanId: executionContext.spanId,
			},
			"agent",
			["execution", "step", executionContext.agentType, stepName]
		);

		// Add step event to current span
		const span = trace.getActiveSpan();
		if (span) {
			span.addEvent(`step.${stepName}`, {
				"step.name": stepName,
				"step.duration_ms": stepDuration || 0,
				"step.data_size": JSON.stringify(stepData).length,
			});
		}
	}

	/**
	 * Collect an observability event
	 */
	private async collectEvent(
		type: ObservabilityEventType,
		severity: EventSeverity,
		message: string,
		metadata: EventMetadata = {},
		source = "system",
		tags: string[] = []
	): Promise<void> {
		const event: ObservabilityEvent = {
			id: ulid(),
			type,
			severity,
			message,
			metadata: {
				...metadata,
				timestamp: new Date().toISOString(),
			},
			timestamp: new Date(),
			source,
			tags,
		};

		// Add to buffer
		this.eventBuffer.push(event);

		// Stream event in real-time
		eventStream.manager.broadcastEvent(event);

		// Flush if buffer is full
		if (this.eventBuffer.length >= (this.config.streaming?.bufferSize || 100)) {
			await this.flushEvents();
		}
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
				}))
			);
		} catch (error) {
			console.error("Failed to flush observability events:", error);
			// Re-add events to buffer for retry
			this.eventBuffer.unshift(...eventsToFlush);
		}
	}

	/**
	 * Start periodic flush
	 */
	private startPeriodicFlush(): void {
		const flushInterval = this.config.streaming?.flushInterval || 5000;
		this.flushTimer = setInterval(() => {
			this.flushEvents().catch(console.error);
		}, flushInterval);
	}

	/**
	 * Get active executions
	 */
	getActiveExecutions(): AgentExecutionContext[] {
		return Array.from(this.activeExecutions.values());
	}

	/**
	 * Get execution context
	 */
	getExecutionContext(executionId: string): AgentExecutionContext | undefined {
		return this.activeExecutions.get(executionId);
	}

	/**
	 * Get system health metrics
	 */
	async getSystemHealthMetrics(): Promise<{
		activeExecutions: number;
		totalExecutions: number;
		errorRate: number;
		averageExecutionTime: number;
		memoryUsage: number;
		eventBufferSize: number;
	}> {
		const activeExecutions = this.activeExecutions.size;

		// Get recent execution stats from database
		const recentExecutions = await db
			.select()
			.from(agentExecutions)
			.where(gte(agentExecutions.startedAt, new Date(Date.now() - 3600000))) // Last hour
			.limit(1000);

		const totalExecutions = recentExecutions.length;
		const failedExecutions = recentExecutions.filter((e) => e.status === "failed").length;
		const errorRate = totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0;

		const completedExecutions = recentExecutions.filter((e) => e.executionTimeMs !== null);
		const averageExecutionTime =
			completedExecutions.length > 0
				? completedExecutions.reduce((sum, e) => sum + (e.executionTimeMs || 0), 0) /
					completedExecutions.length
				: 0;

		// Get memory usage (approximate)
		const memoryUsage = process.memoryUsage().heapUsed;

		return {
			activeExecutions,
			totalExecutions,
			errorRate: Math.round(errorRate * 100) / 100,
			averageExecutionTime: Math.round(averageExecutionTime),
			memoryUsage,
			eventBufferSize: this.eventBuffer.length,
		};
	}

	/**
	 * Force flush all pending events
	 */
	async forceFlush(): Promise<void> {
		await this.flushEvents();
	}

	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}
		this.activeExecutions.clear();
		this.eventBuffer = [];
	}
}

// Export singleton instance
export const enhancedObservability = EnhancedObservabilityService.getInstance();

// Convenience functions for common operations
export const agentTracking = {
	/**
	 * Track a complete agent execution
	 */
	async trackExecution<T>(
		agentType: string,
		operation: string,
		execution: () => Promise<T>,
		metadata: Record<string, any> = {},
		taskId?: string,
		userId?: string,
		sessionId?: string
	): Promise<T> {
		const executionId = await enhancedObservability.startAgentExecution(
			agentType,
			operation,
			metadata,
			taskId,
			userId,
			sessionId
		);

		const startTime = Date.now();
		let memoryBefore: number | undefined;

		if (enhancedObservability["config"].agentTracking?.trackMemoryUsage) {
			memoryBefore = process.memoryUsage().heapUsed;
		}

		try {
			const result = await execution();

			const endTime = Date.now();
			const performanceMetrics: AgentPerformanceMetrics = {
				executionTime: endTime - startTime,
			};

			if (memoryBefore !== undefined) {
				const memoryAfter = process.memoryUsage().heapUsed;
				performanceMetrics.memoryUsage = memoryAfter - memoryBefore;
			}

			await enhancedObservability.completeAgentExecution(executionId, result, performanceMetrics);

			return result;
		} catch (error) {
			const endTime = Date.now();
			const performanceMetrics: AgentPerformanceMetrics = {
				executionTime: endTime - startTime,
			};

			if (memoryBefore !== undefined) {
				const memoryAfter = process.memoryUsage().heapUsed;
				performanceMetrics.memoryUsage = memoryAfter - memoryBefore;
			}

			await enhancedObservability.failAgentExecution(
				executionId,
				error as Error,
				performanceMetrics
			);

			throw error;
		}
	},

	/**
	 * Record a step within the current execution context
	 */
	async recordStep(
		executionId: string,
		stepName: string,
		stepData: any,
		stepDuration?: number
	): Promise<void> {
		await enhancedObservability.recordExecutionStep(executionId, stepName, stepData, stepDuration);
	},

	/**
	 * Get system health metrics
	 */
	async getHealthMetrics() {
		return enhancedObservability.getSystemHealthMetrics();
	},
};
