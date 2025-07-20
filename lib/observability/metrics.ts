/**
 * Performance Metrics Collection and Aggregation System
 *
 * Collects, aggregates, and analyzes performance metrics for database operations,
 * WASM optimizations, query performance, and system health monitoring.
 */

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/config";
import { observabilityEvents as eventsTable } from "@/db/schema";
import { observabilityEvents } from "./events";

// Metric types
export type MetricType =
	| "query_duration"
	| "sync_latency"
	| "wasm_init_time"
	| "wasm_execution_time"
	| "memory_usage"
	| "cpu_usage"
	| "network_latency"
	| "cache_hit_rate"
	| "error_rate"
	| "throughput";

// Metric data point
export interface MetricDataPoint {
	timestamp: Date;
	value: number;
	tags: Record<string, string>;
	metadata?: Record<string, any>;
}

// Aggregated metric
export interface AggregatedMetric {
	metric: MetricType;
	timeRange: {
		start: Date;
		end: Date;
	};
	aggregation: {
		count: number;
		sum: number;
		avg: number;
		min: number;
		max: number;
		p50: number;
		p95: number;
		p99: number;
	};
	tags: Record<string, string>;
}

// Performance metrics collector
export class PerformanceMetricsCollector {
	private static instance: PerformanceMetricsCollector;
	private metricsBuffer: Map<MetricType, MetricDataPoint[]> = new Map();
	private readonly BUFFER_SIZE = 1000;
	private readonly FLUSH_INTERVAL = 10_000; // 10 seconds
	private flushInterval: NodeJS.Timeout | null = null;

	private constructor() {
		this.startPeriodicFlush();
	}

	static getInstance(): PerformanceMetricsCollector {
		if (!PerformanceMetricsCollector.instance) {
			PerformanceMetricsCollector.instance = new PerformanceMetricsCollector();
		}
		return PerformanceMetricsCollector.instance;
	}

	/**
	 * Record a metric data point
	 */
	recordMetric(
		metric: MetricType,
		value: number,
		tags: Record<string, string> = {},
		metadata: Record<string, any> = {},
	): void {
		const dataPoint: MetricDataPoint = {
			timestamp: new Date(),
			value,
			tags,
			metadata,
		};

		if (!this.metricsBuffer.has(metric)) {
			this.metricsBuffer.set(metric, []);
		}

		const buffer = this.metricsBuffer.get(metric)!;
		buffer.push(dataPoint);

		// Flush if buffer is full
		if (buffer.length >= this.BUFFER_SIZE) {
			this.flushMetric(metric);
		}

		// Also send to observability events
		observabilityEvents.performanceMetric(metric, value, {
			tags: Object.entries(tags).map(([k, v]) => `${k}:${v}`),
			...metadata,
		});
	}

	/**
	 * Flush specific metric to storage
	 */
	private async flushMetric(metric: MetricType): Promise<void> {
		const buffer = this.metricsBuffer.get(metric);
		if (!buffer || buffer.length === 0) return;

		const dataPoints = [...buffer];
		this.metricsBuffer.set(metric, []);

		try {
			// Store aggregated metrics in observability events
			const aggregated = this.aggregateDataPoints(dataPoints);

			await observabilityEvents.collector.collectEvent(
				"performance_metric",
				"debug",
				`Aggregated metric: ${metric}`,
				{
					metric,
					aggregation: aggregated,
					dataPointCount: dataPoints.length,
				},
				"metrics",
				["performance", "aggregated", metric],
			);
		} catch (error) {
			console.error(`Failed to flush metric ${metric}:`, error);
			// Re-add data points to buffer for retry
			const currentBuffer = this.metricsBuffer.get(metric) || [];
			this.metricsBuffer.set(metric, [...dataPoints, ...currentBuffer]);
		}
	}

	/**
	 * Aggregate data points into statistical summary
	 */
	private aggregateDataPoints(
		dataPoints: MetricDataPoint[],
	): AggregatedMetric["aggregation"] {
		if (dataPoints.length === 0) {
			return {
				count: 0,
				sum: 0,
				avg: 0,
				min: 0,
				max: 0,
				p50: 0,
				p95: 0,
				p99: 0,
			};
		}

		const values = dataPoints.map((dp) => dp.value).sort((a, b) => a - b);
		const sum = values.reduce((acc, val) => acc + val, 0);
		const count = values.length;

		return {
			count,
			sum,
			avg: sum / count,
			min: values[0],
			max: values[count - 1],
			p50: this.percentile(values, 0.5),
			p95: this.percentile(values, 0.95),
			p99: this.percentile(values, 0.99),
		};
	}

	/**
	 * Calculate percentile
	 */
	private percentile(sortedValues: number[], p: number): number {
		if (sortedValues.length === 0) return 0;
		const index = Math.ceil(sortedValues.length * p) - 1;
		return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
	}

	/**
	 * Start periodic flush
	 */
	private startPeriodicFlush(): void {
		this.flushInterval = setInterval(() => {
			for (const metric of this.metricsBuffer.keys()) {
				this.flushMetric(metric).catch(console.error);
			}
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
	 * Force flush all metrics
	 */
	async forceFlush(): Promise<void> {
		const flushPromises = Array.from(this.metricsBuffer.keys()).map((metric) =>
			this.flushMetric(metric),
		);
		await Promise.all(flushPromises);
	}
}

// Metrics query and analysis
export class MetricsAnalyzer {
	/**
	 * Get aggregated metrics for a time range
	 */
	static async getAggregatedMetrics(
		metrics: MetricType[],
		startTime: Date,
		endTime: Date,
		groupBy: "hour" | "day" | "week" = "hour",
	): Promise<AggregatedMetric[]> {
		const timeFormat = {
			hour: "date_trunc('hour', timestamp)",
			day: "date_trunc('day', timestamp)",
			week: "date_trunc('week', timestamp)",
		}[groupBy];

		const results = await db
			.select({
				metric: eventsTable.type,
				timeGroup: sql`${sql.raw(timeFormat)}`.as("time_group"),
				count: sql`count(*)`.as("count"),
				avgValue: sql`avg((metadata->>'value')::numeric)`.as("avg_value"),
				minValue: sql`min((metadata->>'value')::numeric)`.as("min_value"),
				maxValue: sql`max((metadata->>'value')::numeric)`.as("max_value"),
			})
			.from(eventsTable)
			.where(
				and(
					eq(eventsTable.type, "performance_metric"),
					gte(eventsTable.timestamp, startTime),
					lte(eventsTable.timestamp, endTime),
				),
			)
			.groupBy(eventsTable.type, sql`${sql.raw(timeFormat)}`)
			.orderBy(sql`time_group DESC`);

		return results.map((result) => ({
			metric: result.metric as MetricType,
			timeRange: {
				start: startTime,
				end: endTime,
			},
			aggregation: {
				count: Number(result.count),
				sum: Number(result.avgValue) * Number(result.count),
				avg: Number(result.avgValue),
				min: Number(result.minValue),
				max: Number(result.maxValue),
				p50: Number(result.avgValue), // Approximation
				p95: Number(result.maxValue) * 0.95, // Approximation
				p99: Number(result.maxValue) * 0.99, // Approximation
			},
			tags: {},
		}));
	}

	/**
	 * Get performance trends
	 */
	static async getPerformanceTrends(
		metric: MetricType,
		timeRange: { start: Date; end: Date },
		resolution: "minute" | "hour" | "day" = "hour",
	): Promise<{ timestamp: Date; value: number }[]> {
		const timeFormat = {
			minute: "date_trunc('minute', timestamp)",
			hour: "date_trunc('hour', timestamp)",
			day: "date_trunc('day', timestamp)",
		}[resolution];

		const results = await db
			.select({
				timestamp: sql`${sql.raw(timeFormat)}`.as("timestamp"),
				value: sql`avg((metadata->>'value')::numeric)`.as("value"),
			})
			.from(eventsTable)
			.where(
				and(
					eq(eventsTable.type, "performance_metric"),
					sql`metadata->>'metric' = ${metric}`,
					gte(eventsTable.timestamp, timeRange.start),
					lte(eventsTable.timestamp, timeRange.end),
				),
			)
			.groupBy(sql`${sql.raw(timeFormat)}`)
			.orderBy(sql`timestamp ASC`);

		return results.map((result) => ({
			timestamp: new Date(result.timestamp as string),
			value: Number(result.value),
		}));
	}

	/**
	 * Calculate system health score
	 */
	static async calculateHealthScore(timeRange: {
		start: Date;
		end: Date;
	}): Promise<{
		overall: number;
		components: {
			database: number;
			sync: number;
			wasm: number;
			queries: number;
		};
	}> {
		// Get error rates and performance metrics
		const errorEvents = await db
			.select({ count: sql`count(*)`.as("count") })
			.from(eventsTable)
			.where(
				and(
					eq(eventsTable.severity, "error"),
					gte(eventsTable.timestamp, timeRange.start),
					lte(eventsTable.timestamp, timeRange.end),
				),
			);

		const totalEvents = await db
			.select({ count: sql`count(*)`.as("count") })
			.from(eventsTable)
			.where(
				and(
					gte(eventsTable.timestamp, timeRange.start),
					lte(eventsTable.timestamp, timeRange.end),
				),
			);

		const errorRate =
			Number(errorEvents[0]?.count || 0) / Number(totalEvents[0]?.count || 1);
		const baseScore = Math.max(0, 100 - errorRate * 100);

		// Component-specific scores (simplified)
		const components = {
			database: Math.max(0, baseScore - errorRate * 20),
			sync: Math.max(0, baseScore - errorRate * 15),
			wasm: Math.max(0, baseScore - errorRate * 10),
			queries: Math.max(0, baseScore - errorRate * 25),
		};

		const overall =
			(components.database +
				components.sync +
				components.wasm +
				components.queries) /
			4;

		return { overall, components };
	}
}

// Convenience functions for common metrics
export const metrics = {
	collector: PerformanceMetricsCollector.getInstance(),
	analyzer: MetricsAnalyzer,

	// API Request metrics
	httpRequestDuration: (
		duration: number,
		method: string,
		route: string,
		statusCode: number,
	) =>
		PerformanceMetricsCollector.getInstance().recordMetric(
			"query_duration",
			duration,
			{
				method,
				route,
				statusCode: statusCode.toString(),
				event: "http_request",
			},
		),

	apiRequestStart: (method: string, route: string) =>
		PerformanceMetricsCollector.getInstance().recordMetric("throughput", 1, {
			method,
			route,
			event: "request_start",
		}),

	apiRequestSuccess: (method: string, route: string, duration: number) =>
		PerformanceMetricsCollector.getInstance().recordMetric(
			"query_duration",
			duration,
			{
				method,
				route,
				success: "true",
				event: "request_success",
			},
		),

	apiRequestError: (
		method: string,
		route: string,
		duration: number,
		errorMessage: string,
	) =>
		PerformanceMetricsCollector.getInstance().recordMetric("error_rate", 1, {
			method,
			route,
			error: errorMessage,
			event: "request_error",
		}),

	// Database metrics
	queryDuration: (duration: number, queryType: string, success: boolean) =>
		PerformanceMetricsCollector.getInstance().recordMetric(
			"query_duration",
			duration,
			{
				queryType,
				success: success.toString(),
			},
		),

	// Sync metrics
	syncLatency: (latency: number, syncType: string) =>
		PerformanceMetricsCollector.getInstance().recordMetric(
			"sync_latency",
			latency,
			{ syncType },
		),

	// WASM metrics
	wasmInitTime: (initTime: number, service: string) =>
		PerformanceMetricsCollector.getInstance().recordMetric(
			"wasm_init_time",
			initTime,
			{ service },
		),

	wasmExecutionTime: (executionTime: number, operation: string) =>
		PerformanceMetricsCollector.getInstance().recordMetric(
			"wasm_execution_time",
			executionTime,
			{
				operation,
			},
		),

	// System metrics
	memoryUsage: (usage: number, component: string) =>
		PerformanceMetricsCollector.getInstance().recordMetric(
			"memory_usage",
			usage,
			{ component },
		),

	cacheHitRate: (hitRate: number, cacheType: string) =>
		PerformanceMetricsCollector.getInstance().recordMetric(
			"cache_hit_rate",
			hitRate,
			{
				cacheType,
			},
		),

	errorRate: (rate: number, component: string) =>
		PerformanceMetricsCollector.getInstance().recordMetric("error_rate", rate, {
			component,
		}),
};

// Export metrics collector instance
export const metricsCollector = PerformanceMetricsCollector.getInstance();
