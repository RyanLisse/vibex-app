/**
 * Performance Metrics Aggregation Service
 *
 * Collects, aggregates, and analyzes performance metrics with OpenTelemetry integration
 * for comprehensive system monitoring and alerting.
 */

import { metrics } from "@opentelemetry/api";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/config";
import { agentExecutions, observabilityEvents } from "@/db/schema";
import { getTelemetryConfig } from "@/lib/telemetry";

// Performance metric types
export interface PerformanceMetric {
	name: string;
	value: number;
	timestamp: Date;
	labels: Record<string, string>;
	unit: string;
}

export interface AggregatedPerformanceMetric {
	name: string;
	count: number;
	sum: number;
	average: number;
	min: number;
	max: number;
	p50: number;
	p95: number;
	p99: number;
	stdDev: number;
	trend: "increasing" | "decreasing" | "stable";
	labels: Record<string, string>;
	timeRange: {
		start: Date;
		end: Date;
	};
}

export interface SystemHealthMetrics {
	overall: {
		status: "healthy" | "degraded" | "critical";
		score: number; // 0-100
	};
	executions: {
		total: number;
		successful: number;
		failed: number;
		successRate: number;
		averageDuration: number;
		p95Duration: number;
	};
	errors: {
		total: number;
		rate: number;
		byType: Record<string, number>;
		recentErrors: Array<{
			type: string;
			message: string;
			timestamp: Date;
			count: number;
		}>;
	};
	performance: {
		averageResponseTime: number;
		throughput: number;
		memoryUsage: number;
		cpuUsage: number;
	};
	agents: {
		active: number;
		byType: Record<string, number>;
		averageExecutionTime: Record<string, number>;
		errorRates: Record<string, number>;
	};
}

/**
 * Performance metrics aggregation service
 */
export class PerformanceAggregationService {
	private static instance: PerformanceAggregationService;
	private meter = metrics.getMeter("performance-aggregation");
	private config = getTelemetryConfig();

	// OpenTelemetry metrics
	private executionDurationHistogram = this.meter.createHistogram(
		"agent_execution_duration_seconds",
		{
			description: "Agent execution duration in seconds",
			unit: "s",
		}
	);

	private executionCounter = this.meter.createCounter("agent_executions_total", {
		description: "Total number of agent executions",
	});

	private errorCounter = this.meter.createCounter("agent_execution_errors_total", {
		description: "Total number of agent execution errors",
	});

	private memoryGauge = this.meter.createUpDownCounter("system_memory_usage_bytes", {
		description: "System memory usage in bytes",
	});

	// Metrics cache
	private metricsCache: Map<string, { data: any; timestamp: number }> = new Map();
	private readonly CACHE_TTL = 30000; // 30 seconds

	private constructor() {
		this.startPeriodicCollection();
	}

	static getInstance(): PerformanceAggregationService {
		if (!PerformanceAggregationService.instance) {
			PerformanceAggregationService.instance = new PerformanceAggregationService();
		}
		return PerformanceAggregationService.instance;
	}

	/**
	 * Collect and aggregate performance metrics
	 */
	async collectPerformanceMetrics(timeRangeMinutes = 60): Promise<AggregatedPerformanceMetric[]> {
		const cacheKey = `performance_metrics_${timeRangeMinutes}`;
		const cached = this.metricsCache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
			return cached.data;
		}

		const endTime = new Date();
		const startTime = new Date(endTime.getTime() - timeRangeMinutes * 60 * 1000);

		try {
			// Get execution metrics
			const executionMetrics = await this.getExecutionMetrics(startTime, endTime);

			// Get error metrics
			const errorMetrics = await this.getErrorMetrics(startTime, endTime);

			// Get system metrics
			const systemMetrics = await this.getSystemMetrics();

			const aggregatedMetrics = [...executionMetrics, ...errorMetrics, ...systemMetrics];

			// Cache results
			this.metricsCache.set(cacheKey, {
				data: aggregatedMetrics,
				timestamp: Date.now(),
			});

			return aggregatedMetrics;
		} catch (error) {
			console.error("Error collecting performance metrics:", error);
			return [];
		}
	}

	/**
	 * Get execution performance metrics
	 */
	private async getExecutionMetrics(
		startTime: Date,
		endTime: Date
	): Promise<AggregatedPerformanceMetric[]> {
		const executions = await db
			.select({
				agentType: agentExecutions.agentType,
				status: agentExecutions.status,
				executionTimeMs: agentExecutions.executionTimeMs,
				startedAt: agentExecutions.startedAt,
			})
			.from(agentExecutions)
			.where(
				and(gte(agentExecutions.startedAt, startTime), lte(agentExecutions.startedAt, endTime))
			);

		// Group by agent type
		const groupedByAgent = executions.reduce(
			(acc, execution) => {
				const key = execution.agentType;
				if (!acc[key]) {
					acc[key] = [];
				}
				acc[key].push(execution);
				return acc;
			},
			{} as Record<string, typeof executions>
		);

		const metrics: AggregatedPerformanceMetric[] = [];

		// Calculate metrics for each agent type
		for (const [agentType, agentExecutions] of Object.entries(groupedByAgent)) {
			const durations = agentExecutions
				.filter((e) => e.executionTimeMs !== null)
				.map((e) => e.executionTimeMs!)
				.sort((a, b) => a - b);

			if (durations.length > 0) {
				const sum = durations.reduce((a, b) => a + b, 0);
				const average = sum / durations.length;
				const min = durations[0];
				const max = durations[durations.length - 1];
				const p50 = durations[Math.floor(durations.length * 0.5)];
				const p95 = durations[Math.floor(durations.length * 0.95)];
				const p99 = durations[Math.floor(durations.length * 0.99)];

				// Calculate standard deviation
				const variance =
					durations.reduce((acc, val) => acc + (val - average) ** 2, 0) / durations.length;
				const stdDev = Math.sqrt(variance);

				// Calculate trend (simplified)
				const trend = this.calculateTrend(durations);

				metrics.push({
					name: "agent_execution_duration_ms",
					count: durations.length,
					sum,
					average,
					min,
					max,
					p50,
					p95,
					p99,
					stdDev,
					trend,
					labels: { agent_type: agentType },
					timeRange: { start: startTime, end: endTime },
				});

				// Record OpenTelemetry metrics
				this.executionDurationHistogram.record(average / 1000, {
					agent_type: agentType,
				});
				this.executionCounter.add(durations.length, { agent_type: agentType });
			}

			// Success rate metric
			const successful = agentExecutions.filter((e) => e.status === "completed").length;
			const total = agentExecutions.length;
			const successRate = total > 0 ? (successful / total) * 100 : 0;

			metrics.push({
				name: "agent_execution_success_rate",
				count: total,
				sum: successful,
				average: successRate,
				min: 0,
				max: 100,
				p50: successRate,
				p95: successRate,
				p99: successRate,
				stdDev: 0,
				trend: "stable",
				labels: { agent_type: agentType },
				timeRange: { start: startTime, end: endTime },
			});
		}

		return metrics;
	}

	/**
	 * Get error metrics
	 */
	private async getErrorMetrics(
		startTime: Date,
		endTime: Date
	): Promise<AggregatedPerformanceMetric[]> {
		const errorEvents = await db
			.select({
				type: observabilityEvents.type,
				severity: observabilityEvents.severity,
				timestamp: observabilityEvents.timestamp,
				metadata: observabilityEvents.metadata,
			})
			.from(observabilityEvents)
			.where(
				and(
					eq(observabilityEvents.severity, "error"),
					gte(observabilityEvents.timestamp, startTime),
					lte(observabilityEvents.timestamp, endTime)
				)
			);

		const errorCount = errorEvents.length;
		const timeRangeHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
		const errorRate = errorCount / timeRangeHours;

		// Record OpenTelemetry metrics
		this.errorCounter.add(errorCount);

		return [
			{
				name: "error_rate_per_hour",
				count: errorCount,
				sum: errorCount,
				average: errorRate,
				min: 0,
				max: errorRate,
				p50: errorRate,
				p95: errorRate,
				p99: errorRate,
				stdDev: 0,
				trend: "stable",
				labels: {},
				timeRange: { start: startTime, end: endTime },
			},
		];
	}

	/**
	 * Get system metrics
	 */
	private async getSystemMetrics(): Promise<AggregatedPerformanceMetric[]> {
		const memoryUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();

		// Record OpenTelemetry metrics
		this.memoryGauge.add(memoryUsage.heapUsed);

		return [
			{
				name: "memory_usage_bytes",
				count: 1,
				sum: memoryUsage.heapUsed,
				average: memoryUsage.heapUsed,
				min: memoryUsage.heapUsed,
				max: memoryUsage.heapUsed,
				p50: memoryUsage.heapUsed,
				p95: memoryUsage.heapUsed,
				p99: memoryUsage.heapUsed,
				stdDev: 0,
				trend: "stable",
				labels: { type: "heap" },
				timeRange: { start: new Date(), end: new Date() },
			},
			{
				name: "memory_usage_bytes",
				count: 1,
				sum: memoryUsage.rss,
				average: memoryUsage.rss,
				min: memoryUsage.rss,
				max: memoryUsage.rss,
				p50: memoryUsage.rss,
				p95: memoryUsage.rss,
				p99: memoryUsage.rss,
				stdDev: 0,
				trend: "stable",
				labels: { type: "rss" },
				timeRange: { start: new Date(), end: new Date() },
			},
		];
	}

	/**
	 * Get comprehensive system health metrics
	 */
	async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
		const cacheKey = "system_health_metrics";
		const cached = this.metricsCache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
			return cached.data;
		}

		const endTime = new Date();
		const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour

		try {
			// Get execution statistics
			const executions = await db
				.select({
					status: agentExecutions.status,
					agentType: agentExecutions.agentType,
					executionTimeMs: agentExecutions.executionTimeMs,
				})
				.from(agentExecutions)
				.where(gte(agentExecutions.startedAt, startTime));

			const totalExecutions = executions.length;
			const successfulExecutions = executions.filter((e) => e.status === "completed").length;
			const failedExecutions = executions.filter((e) => e.status === "failed").length;
			const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

			// Calculate execution durations
			const durations = executions
				.filter((e) => e.executionTimeMs !== null)
				.map((e) => e.executionTimeMs!)
				.sort((a, b) => a - b);

			const averageDuration =
				durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
			const p95Duration = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0;

			// Get error statistics
			const errorEvents = await db
				.select({
					type: observabilityEvents.type,
					message: observabilityEvents.message,
					timestamp: observabilityEvents.timestamp,
				})
				.from(observabilityEvents)
				.where(
					and(
						eq(observabilityEvents.severity, "error"),
						gte(observabilityEvents.timestamp, startTime)
					)
				);

			const errorRate = totalExecutions > 0 ? (errorEvents.length / totalExecutions) * 100 : 0;

			// Group errors by type
			const errorsByType = errorEvents.reduce(
				(acc, error) => {
					acc[error.type] = (acc[error.type] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			);

			// Get agent statistics
			const agentsByType = executions.reduce(
				(acc, execution) => {
					acc[execution.agentType] = (acc[execution.agentType] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			);

			const agentExecutionTimes = executions.reduce(
				(acc, execution) => {
					if (execution.executionTimeMs !== null) {
						if (!acc[execution.agentType]) {
							acc[execution.agentType] = [];
						}
						acc[execution.agentType].push(execution.executionTimeMs);
					}
					return acc;
				},
				{} as Record<string, number[]>
			);

			const averageExecutionTimeByAgent = Object.entries(agentExecutionTimes).reduce(
				(acc, [agentType, times]) => {
					acc[agentType] = times.reduce((a, b) => a + b, 0) / times.length;
					return acc;
				},
				{} as Record<string, number>
			);

			// Calculate error rates by agent
			const errorRatesByAgent = Object.keys(agentsByType).reduce(
				(acc, agentType) => {
					const agentExecutions = executions.filter((e) => e.agentType === agentType);
					const agentErrors = agentExecutions.filter((e) => e.status === "failed");
					acc[agentType] =
						agentExecutions.length > 0 ? (agentErrors.length / agentExecutions.length) * 100 : 0;
					return acc;
				},
				{} as Record<string, number>
			);

			// Calculate overall health score
			const healthScore = this.calculateHealthScore({
				successRate,
				errorRate,
				averageDuration,
				p95Duration,
			});

			const healthStatus: "healthy" | "degraded" | "critical" =
				healthScore >= 80 ? "healthy" : healthScore >= 60 ? "degraded" : "critical";

			// Get system performance metrics
			const memoryUsage = process.memoryUsage().heapUsed;
			const throughput = totalExecutions / (60 * 60); // executions per second over the hour

			const healthMetrics: SystemHealthMetrics = {
				overall: {
					status: healthStatus,
					score: healthScore,
				},
				executions: {
					total: totalExecutions,
					successful: successfulExecutions,
					failed: failedExecutions,
					successRate: Math.round(successRate * 100) / 100,
					averageDuration: Math.round(averageDuration),
					p95Duration: Math.round(p95Duration),
				},
				errors: {
					total: errorEvents.length,
					rate: Math.round(errorRate * 100) / 100,
					byType: errorsByType,
					recentErrors: errorEvents.slice(-10).map((error) => ({
						type: error.type,
						message: error.message || "",
						timestamp: error.timestamp,
						count: 1,
					})),
				},
				performance: {
					averageResponseTime: Math.round(averageDuration),
					throughput: Math.round(throughput * 100) / 100,
					memoryUsage,
					cpuUsage: 0, // Would need more sophisticated CPU monitoring
				},
				agents: {
					active: Object.keys(agentsByType).length,
					byType: agentsByType,
					averageExecutionTime: Object.entries(averageExecutionTimeByAgent).reduce(
						(acc, [key, value]) => {
							acc[key] = Math.round(value);
							return acc;
						},
						{} as Record<string, number>
					),
					errorRates: Object.entries(errorRatesByAgent).reduce(
						(acc, [key, value]) => {
							acc[key] = Math.round(value * 100) / 100;
							return acc;
						},
						{} as Record<string, number>
					),
				},
			};

			// Cache results
			this.metricsCache.set(cacheKey, {
				data: healthMetrics,
				timestamp: Date.now(),
			});

			return healthMetrics;
		} catch (error) {
			console.error("Error getting system health metrics:", error);
			throw error;
		}
	}

	/**
	 * Calculate trend from a series of values
	 */
	private calculateTrend(values: number[]): "increasing" | "decreasing" | "stable" {
		if (values.length < 2) return "stable";

		const firstHalf = values.slice(0, Math.floor(values.length / 2));
		const secondHalf = values.slice(Math.floor(values.length / 2));

		const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
		const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

		const change = ((secondAvg - firstAvg) / firstAvg) * 100;

		if (Math.abs(change) < 5) return "stable";
		return change > 0 ? "increasing" : "decreasing";
	}

	/**
	 * Calculate overall health score
	 */
	private calculateHealthScore(metrics: {
		successRate: number;
		errorRate: number;
		averageDuration: number;
		p95Duration: number;
	}): number {
		let score = 100;

		// Success rate impact (40% weight)
		score -= (100 - metrics.successRate) * 0.4;

		// Error rate impact (30% weight)
		score -= metrics.errorRate * 0.3;

		// Performance impact (30% weight)
		const performancePenalty = Math.min(metrics.averageDuration / 1000, 10) * 3; // Max 30 point penalty
		score -= performancePenalty;

		return Math.max(0, Math.min(100, Math.round(score)));
	}

	/**
	 * Start periodic metrics collection
	 */
	private startPeriodicCollection(): void {
		if (!this.config.metrics?.enabled) return;

		const interval = this.config.metrics.collectInterval || 60000;

		setInterval(async () => {
			try {
				await this.collectPerformanceMetrics();
			} catch (error) {
				console.error("Error in periodic metrics collection:", error);
			}
		}, interval);
	}

	/**
	 * Clear metrics cache
	 */
	clearCache(): void {
		this.metricsCache.clear();
	}
}

// Export singleton instance
export const performanceAggregation = PerformanceAggregationService.getInstance();
