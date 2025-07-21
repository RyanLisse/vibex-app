import { Summary, Counter, Histogram, Gauge, register } from "prom-client";

export class PrometheusMetricsCollector {
	private static instance: PrometheusMetricsCollector;

	private agentOperationsTotal: Counter<string>;
	private agentExecutionDuration: Histogram<string>;
	private taskExecutionDuration: Summary<string>;
	private workflowStepDuration: Summary<string>;
	private tokenUsageTotal: Counter<string>;
	private agentCostTotal: Counter<string>;
	private activeAgentsGauge: Gauge<string>;
	private featureUsageTotal: Counter<string>;

	private constructor() {
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
			name: "token_usage_total",
			help: "Total token usage",
			labelNames: ["agent_id", "agent_type", "provider", "token_type"],
		});

		this.agentCostTotal = new Counter({
			name: "agent_cost_total",
			help: "Total agent cost in USD",
			labelNames: ["agent_id", "agent_type", "provider"],
		});

		this.activeAgentsGauge = new Gauge({
			name: "active_agents_count",
			help: "Number of active agents",
			labelNames: ["agent_type", "provider"],
		});

		this.featureUsageTotal = new Counter({
			name: "feature_usage_total",
			help: "Total feature usage",
			labelNames: ["feature", "tier"],
		});
	}

	public static getInstance(): PrometheusMetricsCollector {
		if (!PrometheusMetricsCollector.instance) {
			PrometheusMetricsCollector.instance = new PrometheusMetricsCollector();
		}
		return PrometheusMetricsCollector.instance;
	}

	public recordAgentOperation(
		agentId: string,
		agentType: string,
		operation: string,
		provider: string,
		status: string,
	): void {
		this.agentOperationsTotal
			.labels(agentId, agentType, operation, provider, status)
			.inc();
	}

	public recordAgentExecution(
		agentId: string,
		agentType: string,
		taskType: string,
		provider: string,
		duration: number,
	): void {
		this.agentExecutionDuration
			.labels(agentId, agentType, taskType, provider)
			.observe(duration);
	}

	public recordTaskExecution(
		taskId: string,
		taskType: string,
		status: string,
		duration: number,
	): void {
		this.taskExecutionDuration
			.labels(taskId, taskType, status)
			.observe(duration);
	}

	public recordWorkflowStep(
		workflowId: string,
		stepId: string,
		stepType: string,
		duration: number,
	): void {
		this.workflowStepDuration
			.labels(workflowId, stepId, stepType)
			.observe(duration);
	}

	public async getMetrics(): Promise<string> {
		return register.metrics();
	}

	public clearMetrics(): void {
		register.clear();
	}

	public recordTokenUsage(
		agentId: string,
		agentType: string,
		provider: string,
		tokenType: string,
		count: number,
	): void {
		this.tokenUsageTotal
			.labels(agentId, agentType, provider, tokenType)
			.inc(count);
	}

	public recordAgentCost(
		agentId: string,
		agentType: string,
		provider: string,
		cost: number,
	): void {
		this.agentCostTotal.labels(agentId, agentType, provider).inc(cost);
	}

	public setActiveAgents(
		agentType: string,
		provider: string,
		count: number,
	): void {
		this.activeAgentsGauge.labels(agentType, provider).set(count);
	}

	public recordFeatureUsage(feature: string, tier: string): void {
		this.featureUsageTotal.labels(feature, tier).inc();
	}

	public createCustomCounter(
		name: string,
		help: string,
		labelNames: string[],
	): Counter<string> {
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
		buckets: number[],
	): Histogram<string> {
		return new Histogram({
			name,
			help,
			labelNames,
			buckets,
		});
	}

	public createCustomGauge(
		name: string,
		help: string,
		labelNames: string[],
	): Gauge<string> {
		return new Gauge({
			name,
			help,
			labelNames,
		});
	}
}
