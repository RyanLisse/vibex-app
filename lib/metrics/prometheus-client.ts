import { Counter, Gauge, Histogram, register, Summary } from "prom-client";

export class PrometheusMetricsCollector {
	private static instance: PrometheusMetricsCollector;

	public static getInstance(): PrometheusMetricsCollector {
		if (!PrometheusMetricsCollector.instance) {
			PrometheusMetricsCollector.instance = new PrometheusMetricsCollector();
		}
		return PrometheusMetricsCollector.instance;
	}

	private agentOperationsTotal: Counter<string>;
	private agentExecutionDuration: Histogram<string>;
	private taskExecutionDuration: Summary<string>;
	private workflowStepDuration: Summary<string>;
	private tokenUsageTotal: Counter<string>;
	private agentCostTotal: Counter<string>;
	private activeAgentsGauge: Gauge<string>;
	private featureUsageTotal: Counter<string>;
	private httpRequestsTotal: Counter<string>;
	private httpRequestDuration: Histogram<string>;
	private activeUserSessions: Gauge<string>;
	private databaseConnections: Gauge<string>;
	private databaseQueryDuration: Histogram<string>;

	private constructor() {
		this.initializeMetrics();
	}

	public recordAgentOperation(
		agentId: string,
		agentType: string,
		operation: string,
		provider: string,
		status: string
	): void {
		this.agentOperationsTotal.labels(agentId, agentType, operation, provider, status).inc();
	}

	public recordAgentExecution(
		agentId: string,
		agentType: string,
		taskType: string,
		provider: string,
		duration: number
	): void {
		this.agentExecutionDuration.labels(agentId, agentType, taskType, provider).observe(duration);
	}

	public recordTaskExecution(
		taskId: string,
		taskType: string,
		status: string,
		duration: number
	): void {
		this.taskExecutionDuration.labels(taskId, taskType, status).observe(duration);
	}

	public recordWorkflowStep(
		workflowId: string,
		stepId: string,
		stepType: string,
		duration: number
	): void {
		this.workflowStepDuration.labels(workflowId, stepId, stepType).observe(duration);
	}

	public async getMetrics(): Promise<string> {
		return register.metrics();
	}

	public clearMetrics(): void {
		register.clear();
		// Re-initialize metrics after clearing to ensure they're registered
		this.initializeMetrics();
	}

	private initializeMetrics(): void {
		this.agentOperationsTotal = new Counter({
			name: "agent_operations_total",
			help: "Total number of agent operations",
			labelNames: ["agent_id", "agent_type", "operation", "provider", "status"],
		});

		this.agentExecutionDuration = new Histogram({
			name: "agent_execution_duration_seconds",
			help: "Agent execution duration in seconds",
			labelNames: ["agent_id", "agent_type", "task_type", "provider"],
			buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
		});

		this.taskExecutionDuration = new Summary({
			name: "task_execution_duration_seconds",
			help: "Task execution duration in seconds",
			labelNames: ["task_id", "task_type", "status"],
		});

		this.workflowStepDuration = new Summary({
			name: "workflow_step_duration_seconds",
			help: "Workflow step duration in seconds",
			labelNames: ["workflow_id", "step_id", "step_type"],
		});

		this.tokenUsageTotal = new Counter({
			name: "agent_token_usage_total",
			help: "Total token usage",
			labelNames: ["agent_id", "agent_type", "provider", "token_type"],
		});

		this.agentCostTotal = new Counter({
			name: "agent_cost_total",
			help: "Total agent cost in USD",
			labelNames: ["agent_id", "agent_type", "provider"],
		});

		this.activeAgentsGauge = new Gauge({
			name: "agent_active_count",
			help: "Number of active agents",
			labelNames: ["agent_type", "provider"],
		});

		this.featureUsageTotal = new Counter({
			name: "feature_usage_total",
			help: "Total feature usage",
			labelNames: ["feature", "tier"],
		});

		this.httpRequestsTotal = new Counter({
			name: "http_requests_total",
			help: "Total number of HTTP requests",
			labelNames: ["method", "route", "status_code"],
		});

		this.httpRequestDuration = new Histogram({
			name: "http_request_duration_seconds",
			help: "HTTP request duration in seconds",
			labelNames: ["method", "route", "status_code"],
			buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
		});

		this.activeUserSessions = new Gauge({
			name: "user_sessions_active",
			help: "Number of active user sessions",
		});

		this.databaseConnections = new Gauge({
			name: "database_connections_active",
			help: "Number of active database connections",
			labelNames: ["database_type", "instance"],
		});

		this.databaseQueryDuration = new Histogram({
			name: "database_query_duration_seconds",
			help: "Database query duration in seconds",
			labelNames: ["query_type", "table"],
			buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
		});
	}

	public recordTokenUsage(
		agentId: string,
		agentType: string,
		provider: string,
		tokenType: string,
		count: number
	): void {
		this.tokenUsageTotal.labels(agentId, agentType, provider, tokenType).inc(count);
	}

	public recordAgentCost(agentId: string, agentType: string, provider: string, cost: number): void {
		this.agentCostTotal.labels(agentId, agentType, provider).inc(cost);
	}

	public setActiveAgents(agentType: string, provider: string, count: number): void {
		this.activeAgentsGauge.labels(agentType, provider).set(count);
	}

	public recordFeatureUsage(feature: string, tier: string): void {
		this.featureUsageTotal.labels(feature, tier).inc();
	}

	public createCustomCounter(name: string, help: string, labelNames: string[]): Counter<string> {
		return new Counter({
			name,
			help,
			labelNames,
		});
	}

	public createCustomHistogram(
		name: string,
		help: string,
		labelNames: string[],
		buckets: number[]
	): Histogram<string> {
		return new Histogram({
			name,
			help,
			labelNames,
			buckets,
		});
	}

	public createCustomGauge(name: string, help: string, labelNames: string[]): Gauge<string> {
		return new Gauge({
			name,
			help,
			labelNames,
		});
	}

	/**
	 * Record HTTP request metrics
	 */
	public recordHttpRequest(
		method: string,
		route: string,
		statusCode: number,
		duration: number
	): void {
		this.httpRequestsTotal.labels(method, route, statusCode.toString()).inc();

		this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(duration);
	}

	/**
	 * Set active user sessions count
	 */
	public setActiveUserSessions(count: number): void {
		this.activeUserSessions.set(count);
	}

	/**
	 * Set database connections count
	 */
	public setDatabaseConnections(databaseType: string, instance: string, count: number): void {
		this.databaseConnections.labels(databaseType, instance).set(count);
	}

	/**
	 * Record database query metrics
	 */
	public recordDatabaseQuery(queryType: string, table: string, duration: number): void {
		this.databaseQueryDuration.labels(queryType, table).observe(duration);
	}

	/**
	 * Generic gauge method for custom metrics
	 */
	public gauge(name: string, value: number, labels?: Record<string, string>): void {
		// Create or get existing gauge
		let gauge = register.getSingleMetric(name) as Gauge<string>;

		if (!gauge) {
			const labelNames = labels ? Object.keys(labels) : [];
			gauge = new Gauge({
				name,
				help: `Custom gauge metric: ${name}`,
				labelNames,
			});
		}

		if (labels) {
			const labelValues = Object.values(labels);
			gauge.labels(...labelValues).set(value);
		} else {
			gauge.set(value);
		}
	}
}
