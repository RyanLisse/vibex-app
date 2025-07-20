import {
	Counter,
	collectDefaultMetrics,
	Gauge,
	Histogram,
	Registry as PrometheusRegistry,
	type Registry,
	register,
	Summary,
} from "prom-client";
import { ObservabilityService } from "../observability";

export class PrometheusMetricsCollector {
	private static instance: PrometheusMetricsCollector;
	private registry: Registry;
	private observability = ObservabilityService.getInstance();

	// AI Agent Metrics - will be initialized in constructor
	private agentOperationsTotal!: Counter<string>;
	private agentExecutionDuration!: Histogram<string>;
	private agentTokenUsage!: Counter<string>;
	private agentCostTotal!: Counter<string>;
	private agentActiveGauge!: Gauge<string>;

	// Task Orchestration Metrics
	private taskExecutionsTotal!: Counter<string>;
	private taskQueueDepth!: Gauge<string>;
	private taskDependencyResolution!: Histogram<string>;

	// Memory and Context Metrics
	private memoryUsageBytes!: Gauge<string>;
	private contextRetrievalDuration!: Histogram<string>;

	// API and System Metrics
	private httpRequestsTotal!: Counter<string>;
	private httpRequestDuration!: Histogram<string>;
	private databaseConnectionsActive!: Gauge<string>;
	private databaseQueryDuration!: Histogram<string>;

	// Business Metrics
	private userSessionsActive!: Gauge<string>;
	private featureUsageTotal!: Counter<string>;

	private constructor() {
		// @ts-expect-error - Workaround for TypeScript bug with constructor overloads
		this.registry = new PrometheusRegistry();
		this.initializeMetrics();
		// Collect default Node.js metrics
		collectDefaultMetrics({ register: this.registry });
	}

	private initializeMetrics() {
		// Initialize all metrics with the registry
		this.agentOperationsTotal = new Counter({
			name: "agent_operations_total",
			help: "Total number of agent operations",
			labelNames: ["agent_id", "agent_type", "operation", "provider", "status"],
			registers: [this.registry],
		});

		this.agentExecutionDuration = new Histogram({
			name: "agent_execution_duration_seconds",
			help: "Duration of agent task execution",
			labelNames: ["agent_id", "agent_type", "task_type", "provider"],
			buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
			registers: [this.registry],
		});

		this.agentTokenUsage = new Counter({
			name: "agent_token_usage_total",
			help: "Total tokens used by agents",
			labelNames: ["agent_id", "agent_type", "provider", "token_type"],
			registers: [this.registry],
		});

		this.agentCostTotal = new Counter({
			name: "agent_cost_total",
			help: "Total cost of agent operations in USD",
			labelNames: ["agent_id", "agent_type", "provider"],
			registers: [this.registry],
		});

		this.agentActiveGauge = new Gauge({
			name: "agent_active_count",
			help: "Number of currently active agents",
			labelNames: ["agent_type", "provider"],
			registers: [this.registry],
		});

		this.taskExecutionsTotal = new Counter({
			name: "task_executions_total",
			help: "Total number of task executions",
			labelNames: ["task_type", "status", "priority"],
			registers: [this.registry],
		});

		this.taskQueueDepth = new Gauge({
			name: "task_queue_depth",
			help: "Number of tasks in queue",
			labelNames: ["queue_type", "priority"],
			registers: [this.registry],
		});

		this.taskDependencyResolution = new Histogram({
			name: "task_dependency_resolution_duration_seconds",
			help: "Time to resolve task dependencies",
			buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
			registers: [this.registry],
		});

		this.memoryUsageBytes = new Gauge({
			name: "agent_memory_usage_bytes",
			help: "Memory usage by agent memory system",
			labelNames: ["namespace", "agent_type"],
			registers: [this.registry],
		});

		this.contextRetrievalDuration = new Histogram({
			name: "context_retrieval_duration_seconds",
			help: "Time to retrieve context from memory",
			labelNames: ["namespace", "retrieval_type"],
			buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
			registers: [this.registry],
		});

		this.httpRequestsTotal = new Counter({
			name: "http_requests_total",
			help: "Total HTTP requests",
			labelNames: ["method", "route", "status_code"],
			registers: [this.registry],
		});

		this.httpRequestDuration = new Histogram({
			name: "http_request_duration_seconds",
			help: "HTTP request duration",
			labelNames: ["method", "route"],
			buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
			registers: [this.registry],
		});

		this.databaseConnectionsActive = new Gauge({
			name: "database_connections_active",
			help: "Number of active database connections",
			labelNames: ["database", "pool"],
			registers: [this.registry],
		});

		this.databaseQueryDuration = new Histogram({
			name: "database_query_duration_seconds",
			help: "Database query execution time",
			labelNames: ["operation", "table"],
			buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
			registers: [this.registry],
		});

		this.userSessionsActive = new Gauge({
			name: "user_sessions_active",
			help: "Number of active user sessions",
			registers: [this.registry],
		});

		this.featureUsageTotal = new Counter({
			name: "feature_usage_total",
			help: "Total feature usage count",
			labelNames: ["feature", "user_type"],
			registers: [this.registry],
		});
	}

	static getInstance(): PrometheusMetricsCollector {
		if (!PrometheusMetricsCollector.instance) {
			PrometheusMetricsCollector.instance = new PrometheusMetricsCollector();
		}
		return PrometheusMetricsCollector.instance;
	}

	// Agent Metrics Methods
	recordAgentOperation(
		agentId: string,
		agentType: string,
		operation: string,
		provider: string,
		status: "success" | "error" | "timeout",
	): void {
		this.agentOperationsTotal.inc({
			agent_id: agentId,
			agent_type: agentType,
			operation,
			provider,
			status,
		});
	}

	recordAgentExecution(
		agentId: string,
		agentType: string,
		taskType: string,
		provider: string,
		duration: number,
	): void {
		this.agentExecutionDuration.observe(
			{
				agent_id: agentId,
				agent_type: agentType,
				task_type: taskType,
				provider,
			},
			duration,
		);
	}

	recordTokenUsage(
		agentId: string,
		agentType: string,
		provider: string,
		tokenType: "input" | "output" | "total",
		count: number,
	): void {
		this.agentTokenUsage.inc(
			{
				agent_id: agentId,
				agent_type: agentType,
				provider,
				token_type: tokenType,
			},
			count,
		);
	}

	recordAgentCost(
		agentId: string,
		agentType: string,
		provider: string,
		cost: number,
	): void {
		this.agentCostTotal.inc(
			{
				agent_id: agentId,
				agent_type: agentType,
				provider,
			},
			cost,
		);
	}

	setActiveAgents(agentType: string, provider: string, count: number): void {
		this.agentActiveGauge.set({ agent_type: agentType, provider }, count);
	}

	// Task Orchestration Methods
	recordTaskExecution(
		taskType: string,
		status: "completed" | "failed" | "cancelled",
		priority: string,
	): void {
		this.taskExecutionsTotal.inc({
			task_type: taskType,
			status,
			priority,
		});
	}

	setTaskQueueDepth(queueType: string, priority: string, depth: number): void {
		this.taskQueueDepth.set({ queue_type: queueType, priority }, depth);
	}

	recordDependencyResolution(duration: number): void {
		this.taskDependencyResolution.observe(duration);
	}

	// Memory and Context Methods
	setMemoryUsage(namespace: string, agentType: string, bytes: number): void {
		this.memoryUsageBytes.set({ namespace, agent_type: agentType }, bytes);
	}

	recordContextRetrieval(
		namespace: string,
		retrievalType: string,
		duration: number,
	): void {
		this.contextRetrievalDuration.observe(
			{ namespace, retrieval_type: retrievalType },
			duration,
		);
	}

	// API and System Methods
	recordHttpRequest(
		method: string,
		route: string,
		statusCode: number,
		duration: number,
	): void {
		this.httpRequestsTotal.inc({
			method,
			route,
			status_code: statusCode.toString(),
		});

		this.httpRequestDuration.observe({ method, route }, duration);
	}

	setDatabaseConnections(database: string, pool: string, count: number): void {
		this.databaseConnectionsActive.set({ database, pool }, count);
	}

	recordDatabaseQuery(
		operation: string,
		table: string,
		duration: number,
	): void {
		this.databaseQueryDuration.observe({ operation, table }, duration);
	}

	// Business Metrics Methods
	setActiveUserSessions(count: number): void {
		this.userSessionsActive.set(count);
	}

	recordFeatureUsage(feature: string, userType: string): void {
		this.featureUsageTotal.inc({ feature, user_type: userType });
	}

	// Utility Methods
	async getMetrics(): Promise<string> {
		return this.registry.metrics();
	}

	clearMetrics(): void {
		this.registry.clear();
		this.initializeMetrics();
	}

	createCustomCounter(name: string, help: string, labelNames?: string[]) {
		return new Counter({
			name,
			help,
			labelNames,
			registers: [this.registry],
		});
	}

	createCustomHistogram(
		name: string,
		help: string,
		labelNames?: string[],
		buckets?: number[],
	) {
		return new Histogram({
			name,
			help,
			labelNames,
			buckets,
			registers: [this.registry],
		});
	}

	createCustomGauge(name: string, help: string, labelNames?: string[]) {
		return new Gauge({
			name,
			help,
			labelNames,
			registers: [this.registry],
		});
	}
}
