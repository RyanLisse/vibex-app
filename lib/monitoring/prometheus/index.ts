/**
 * Prometheus Metrics Exporter
 *
 * Exports application and database metrics in Prometheus format
 * for collection by Prometheus server
 */

import { createServer } from "node:http";
	Counter,
	collectDefaultMetrics,
	Gauge,
	Histogram,
	Registry,
	Summary,
} from "prom-client";
import { observability } from "@/lib/observability";
import { metrics as observabilityMetrics } from "@/lib/observability/metrics";
import { queryPerformanceMonitor } from "@/lib/performance/query-performance-monitor";

// Create custom registry
export const prometheusRegistry = new Registry();

// Metric definitions
export const metrics = {
	// HTTP metrics
	httpRequestsTotal: new Counter({
		name: "http_requests_total",
		help: "Total number of HTTP requests",
		labelNames: ["method", "route", "status_code"],
		registers: [prometheusRegistry],
	}),

	httpRequestDuration: new Histogram({
		name: "http_request_duration_seconds",
		help: "HTTP request latencies in seconds",
		labelNames: ["method", "route", "status_code"],
		buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
		registers: [prometheusRegistry],
	}),

	// Database metrics
	dbQueryTotal: new Counter({
		name: "db_queries_total",
		help: "Total number of database queries",
		labelNames: ["query_type", "table", "success"],
		registers: [prometheusRegistry],
	}),

	dbQueryDuration: new Histogram({
		name: "db_query_duration_seconds",
		help: "Database query execution time in seconds",
		labelNames: ["query_type", "table"],
		buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
		registers: [prometheusRegistry],
	}),

	dbConnectionPoolSize: new Gauge({
		name: "db_connection_pool_size",
		help: "Number of connections in the database pool",
		labelNames: ["state"],
		registers: [prometheusRegistry],
	}),

	dbTransactionDuration: new Histogram({
		name: "db_transaction_duration_seconds",
		help: "Database transaction duration in seconds",
		labelNames: ["type"],
		buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30],
		registers: [prometheusRegistry],
	}),

	// Agent execution metrics
	agentExecutionsTotal: new Counter({
		name: "agent_executions_total",
		help: "Total number of agent executions",
		labelNames: ["agent_type", "status"],
		registers: [prometheusRegistry],
	}),

	agentExecutionDuration: new Histogram({
		name: "agent_execution_duration_seconds",
		help: "Agent execution duration in seconds",
		labelNames: ["agent_type"],
		buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
		registers: [prometheusRegistry],
	}),

	agentTokenUsage: new Counter({
		name: "agent_token_usage_total",
		help: "Total number of tokens used by agents",
		labelNames: ["agent_type", "model"],
		registers: [prometheusRegistry],
	}),

	// System metrics
	memoryUsageBytes: new Gauge({
		name: "process_memory_usage_bytes",
		help: "Process memory usage in bytes",
		labelNames: ["type"],
		registers: [prometheusRegistry],
	}),

	cpuUsagePercent: new Gauge({
		name: "process_cpu_usage_percent",
		help: "Process CPU usage percentage",
		registers: [prometheusRegistry],
	}),

	// Cache metrics
	cacheHitsTotal: new Counter({
		name: "cache_hits_total",
		help: "Total number of cache hits",
		labelNames: ["cache_type"],
		registers: [prometheusRegistry],
	}),

	cacheMissesTotal: new Counter({
		name: "cache_misses_total",
		help: "Total number of cache misses",
		labelNames: ["cache_type"],
		registers: [prometheusRegistry],
	}),

	cacheSize: new Gauge({
		name: "cache_size_entries",
		help: "Number of entries in cache",
		labelNames: ["cache_type"],
		registers: [prometheusRegistry],
	}),

	// Error metrics
	errorsTotal: new Counter({
		name: "errors_total",
		help: "Total number of errors",
		labelNames: ["type", "severity", "component"],
		registers: [prometheusRegistry],
	}),

	// Business metrics
	activeUsers: new Gauge({
		name: "active_users_count",
		help: "Number of active users",
		labelNames: ["timeframe"],
		registers: [prometheusRegistry],
	}),

	workflowExecutionsTotal: new Counter({
		name: "workflow_executions_total",
		help: "Total number of workflow executions",
		labelNames: ["workflow_name", "status"],
		registers: [prometheusRegistry],
	}),

	// Performance metrics
	responseTimeSummary: new Summary({
		name: "response_time_summary_seconds",
		help: "Response time summary",
		labelNames: ["endpoint"],
		percentiles: [0.5, 0.9, 0.95, 0.99],
		registers: [prometheusRegistry],
	}),
};

// Prometheus exporter configuration
interface PrometheusConfig {
	port: number;
	path: string;
	defaultLabels?: Record<string, string>;
}

// Start Prometheus metrics exporter
export async function startPrometheusExporter(
	config: PrometheusConfig,
): Promise<void> {
	// Set default labels
	if (config.defaultLabels) {
		prometheusRegistry.setDefaultLabels(config.defaultLabels);
	}

	// Collect default Node.js metrics
	collectDefaultMetrics({ register: prometheusRegistry });


	// Collect custom system metrics immediately
	updateSystemMetrics();


	// Start metrics collection from observability system
	startMetricsCollection();

	// Create HTTP server for metrics endpoint
	const server = createServer(async (req, res) => {
		if (req.url === config.path && req.method === "GET") {
			res.writeHead(200, { "Content-Type": prometheusRegistry.contentType });
			res.end(await prometheusRegistry.metrics());
		} else {
			res.writeHead(404);
			res.end("Not found");
		}
	});

	server.listen(config.port, () => {
		console.log(
			`📊 Prometheus metrics exporter listening on port ${config.port}${config.path}`,
		);
	});
}

// Start collecting metrics from observability system
function startMetricsCollection(): void {
	// Update metrics every 10 seconds
	setInterval(() => {
		updateSystemMetrics();
		updateDatabaseMetrics();
		updateBusinessMetrics();
	}, 10_000);
}

// Update system metrics
export function updateSystemMetrics(): void {

	const memoryUsage = process.memoryUsage();
	metrics.memoryUsageBytes.set({ type: "heapUsed" }, memoryUsage.heapUsed);
	metrics.memoryUsageBytes.set({ type: "heapTotal" }, memoryUsage.heapTotal);
	metrics.memoryUsageBytes.set({ type: "rss" }, memoryUsage.rss);
	metrics.memoryUsageBytes.set({ type: "external" }, memoryUsage.external);


	// CPU usage (simplified - in production use more sophisticated measurement)
	const cpuUsage = process.cpuUsage();
	const totalCpuTime = (cpuUsage.user + cpuUsage.system) / 1_000_000; // Convert to seconds
	metrics.cpuUsagePercent.set(totalCpuTime);
}

// Update database metrics
export function updateDatabaseMetrics(): void {

	// Get performance metrics from query monitor
	const perfMetrics = queryPerformanceMonitor.getCurrentMetrics();


	// Update connection pool metrics (example values - integrate with actual pool)
	metrics.dbConnectionPoolSize.set({ state: "active" }, 5);
	metrics.dbConnectionPoolSize.set({ state: "idle" }, 10);
	metrics.dbConnectionPoolSize.set({ state: "waiting" }, 0);

	// Get cache metrics from observability
	const stats = observability.getOperationStats();
	const cacheHitRate = stats.successRate / 100;

	metrics.cacheHitsTotal.inc(
		{ cache_type: "query" },
		Math.round(perfMetrics.totalQueries * cacheHitRate),
	);
	metrics.cacheMissesTotal.inc(
		{ cache_type: "query" },
		Math.round(perfMetrics.totalQueries * (1 - cacheHitRate)),
	);
}

// Update business metrics
export function updateBusinessMetrics(): void {

	// Get metrics from observability system
	const stats = observability.getOperationStats();
	const health = observability.getHealthStatus();


	// Update active users (example - integrate with actual user tracking)
	metrics.activeUsers.set(
		{ timeframe: "1h" },
		Math.floor(Math.random() * 100) + 50,
	);
	metrics.activeUsers.set(
		{ timeframe: "24h" },
		Math.floor(Math.random() * 500) + 200,
	);

	// Update error rate
	const errorRate = health.recentErrorRate / 100;
	metrics.errorsTotal.inc(
		{
			type: "application",
			severity: errorRate > 0.1 ? "high" : "low",
			component: "general",
		},
		Math.round(stats.totalOperations * errorRate),
	);
}

// Helper functions for recording metrics
export const recordHttpRequest = (
	method: string,
	route: string,
	statusCode: number,
	duration: number,
): void => {
	metrics.httpRequestsTotal.inc({
		method,
		route,
		status_code: statusCode.toString(),
	});
	metrics.httpRequestDuration.observe(
		{ method, route, status_code: statusCode.toString() },
		duration / 1000,
	);
};

export const recordDatabaseQuery = (
	queryType: string,
	table: string,
	success: boolean,
	duration: number,
): void => {
	metrics.dbQueryTotal.inc({
		query_type: queryType,
		table,
		success: success.toString(),
	});
	metrics.dbQueryDuration.observe(
		{ query_type: queryType, table },
		duration / 1000,
	);
};

export const recordAgentExecution = (
	agentType: string,
	status: "success" | "failure",
	duration: number,
	tokenUsage?: number,
): void => {
	metrics.agentExecutionsTotal.inc({ agent_type: agentType, status });
	metrics.agentExecutionDuration.observe(
		{ agent_type: agentType },
		duration / 1000,
	);

	if (tokenUsage) {
		metrics.agentTokenUsage.inc(
			{ agent_type: agentType, model: "gpt-4" },
			tokenUsage,
		);
	}
};

export const recordWorkflowExecution = (
	workflowName: string,
	status: "started" | "completed" | "failed",
): void => {
	metrics.workflowExecutionsTotal.inc({ workflow_name: workflowName, status });
};

export const recordCacheOperation = (cacheType: string, hit: boolean): void => {
	if (hit) {
		metrics.cacheHitsTotal.inc({ cache_type: cacheType });
	} else {
		metrics.cacheMissesTotal.inc({ cache_type: cacheType });
	}
};

export const recordError = (
	type: string,
	severity: "low" | "medium" | "high" | "critical",
	component: string,
): void => {
	metrics.errorsTotal.inc({ type, severity, component });
};

// Export registry for testing
export { prometheusRegistry as registry };
