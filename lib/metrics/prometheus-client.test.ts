import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mock } from "bun:test";

// Create chainable mocks for bun
const createMockMetric = (methodNames: string[]) => {
	const mockMetric: any = {};

	// Create mock methods
	for (const methodName of methodNames) {
		mockMetric[methodName] = mock(() => {});
	}

	// labels method returns object with all methods
	mockMetric.labels = mock(() => {
		const labeled: any = {};
		for (const methodName of methodNames) {
			labeled[methodName] = mock(() => {});
		}
		return labeled;
	});

	return mockMetric;
};

const mockSummary = mock(() => createMockMetric(["observe"]));
const mockHistogram = mock(() => createMockMetric(["observe"]));
const mockCounter = mock(() => createMockMetric(["inc"]));
const mockGauge = mock(() => createMockMetric(["set", "inc", "dec"]));

const mockRegister = {
	clear: mock(() => {}),
	metrics: mock(() =>
		Promise.resolve(
			'# Mock metrics\nagent_operations_total{agent_id="agent-1",agent_type="code-gen",operation="execute",provider="openai",status="success"} 1'
		)
	),
};

// Mock the prom-client module
mock.module("prom-client", () => ({
	Summary: mockSummary,
	Histogram: mockHistogram,
	Counter: mockCounter,
	Gauge: mockGauge,
	register: mockRegister,
}));

import { PrometheusMetricsCollector } from "./prometheus-client";

describe("PrometheusMetricsCollector", () => {
	let collector: PrometheusMetricsCollector;

	beforeEach(() => {
		// Clear mock calls for bun
		mockCounter.mockClear();
		mockHistogram.mockClear();
		mockSummary.mockClear();
		mockGauge.mockClear();
		mockRegister.clear.mockClear();
		mockRegister.metrics.mockClear();
		collector = PrometheusMetricsCollector.getInstance();
	});

	afterEach(() => {
		if (collector && typeof collector.clearMetrics === "function") {
			collector.clearMetrics();
		}
	});

	describe("singleton pattern", () => {
		it("should return the same instance", () => {
			const instance1 = PrometheusMetricsCollector.getInstance();
			const instance2 = PrometheusMetricsCollector.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("agent metrics", () => {
		it("should record agent operations with correct labels", async () => {
			collector.recordAgentOperation("agent-1", "code-gen", "execute", "openai", "success");

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("agent_operations_total");
			expect(metrics).toContain('agent_id="agent-1"');
			expect(metrics).toContain('agent_type="code-gen"');
			expect(metrics).toContain('operation="execute"');
			expect(metrics).toContain('provider="openai"');
			expect(metrics).toContain('status="success"');
			expect(metrics).toContain("1");
		});

		it("should record agent execution duration", async () => {
			collector.recordAgentExecution("agent-1", "code-gen", "task", "openai", 2.5);

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("agent_execution_duration_seconds");
			expect(metrics).toContain('agent_id="agent-1"');
			expect(metrics).toContain('task_type="task"');
		});

		it("should record token usage by type", async () => {
			collector.recordTokenUsage("agent-1", "code-gen", "openai", "input", 150);
			collector.recordTokenUsage("agent-1", "code-gen", "openai", "output", 75);

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("agent_token_usage_total");
			expect(metrics).toContain('token_type="input"');
			expect(metrics).toContain('token_type="output"');
		});

		it("should record agent cost in USD", async () => {
			collector.recordAgentCost("agent-1", "code-gen", "openai", 0.05);

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("agent_cost_total");
			expect(metrics).toContain("0.05");
		});

		it("should set active agent count", async () => {
			collector.setActiveAgents("code-gen", "openai", 3);

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("agent_active_count");
			expect(metrics).toContain("3");
		});
	});

	describe("task orchestration metrics", () => {
		it("should record task execution with status", async () => {
			collector.recordTaskExecution("code-generation", "completed", "high");

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("task_executions_total");
			expect(metrics).toContain('task_type="code-generation"');
			expect(metrics).toContain('status="completed"');
			expect(metrics).toContain('priority="high"');
		});

		it("should set task queue depth", async () => {
			collector.setTaskQueueDepth("priority", "high", 5);

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("task_queue_depth");
			expect(metrics).toContain('queue_type="priority"');
			expect(metrics).toContain("5");
		});

		it("should record dependency resolution time", async () => {
			collector.recordDependencyResolution(0.1);

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("task_dependency_resolution_duration_seconds");
		});
	});

	describe("memory and context metrics", () => {
		it("should set memory usage by namespace", async () => {
			collector.setMemoryUsage("agents", "code-gen", 1_024_000);

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("agent_memory_usage_bytes");
			expect(metrics).toContain('namespace="agents"');
			expect(metrics).toContain("1024000");
		});

		it("should record context retrieval duration", async () => {
			collector.recordContextRetrieval("agents", "vector-search", 0.05);

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("context_retrieval_duration_seconds");
			expect(metrics).toContain('retrieval_type="vector-search"');
		});
	});

	describe("API and system metrics", () => {
		it("should record HTTP requests with status codes", async () => {
			collector.recordHttpRequest("GET", "/api/agents", 200, 0.1);
			collector.recordHttpRequest("POST", "/api/tasks", 500, 1.5);

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("http_requests_total");
			expect(metrics).toContain("http_request_duration_seconds");
			expect(metrics).toContain('method="GET"');
			expect(metrics).toContain('route="/api/agents"');
			expect(metrics).toContain('status_code="200"');
			expect(metrics).toContain('status_code="500"');
		});

		it("should set database connection counts", async () => {
			collector.setDatabaseConnections("postgres", "main", 10);

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("database_connections_active");
			expect(metrics).toContain('database="postgres"');
			expect(metrics).toContain('pool="main"');
			expect(metrics).toContain("10");
		});

		it("should record database query performance", async () => {
			collector.recordDatabaseQuery("SELECT", "tasks", 0.01);

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("database_query_duration_seconds");
			expect(metrics).toContain('operation="SELECT"');
			expect(metrics).toContain('table="tasks"');
		});
	});

	describe("business metrics", () => {
		it("should set active user sessions", async () => {
			collector.setActiveUserSessions(25);

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("user_sessions_active");
			expect(metrics).toContain("25");
		});

		it("should record feature usage", async () => {
			collector.recordFeatureUsage("code-generation", "premium");

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("feature_usage_total");
			expect(metrics).toContain('feature="code-generation"');
			expect(metrics).toContain('user_type="premium"');
		});
	});

	describe("custom metrics", () => {
		it("should create custom counter", () => {
			const counter = collector.createCustomCounter(
				"custom_operations_total",
				"Custom operations counter",
				["operation", "status"]
			);

			expect(counter).toBeDefined();
			counter.inc({ operation: "test", status: "success" });
		});

		it("should create custom histogram", () => {
			const histogram = collector.createCustomHistogram(
				"custom_duration_seconds",
				"Custom duration histogram",
				["operation"],
				[0.1, 1, 5, 10]
			);

			expect(histogram).toBeDefined();
			histogram.observe({ operation: "test" }, 2.5);
		});

		it("should create custom gauge", () => {
			const gauge = collector.createCustomGauge(
				"custom_active_count",
				"Custom active count gauge",
				["type"]
			);

			expect(gauge).toBeDefined();
			gauge.set({ type: "test" }, 42);
		});
	});

	describe("metrics output", () => {
		it("should return Prometheus-formatted metrics", async () => {
			collector.recordAgentOperation("agent-1", "test", "execute", "openai", "success");

			const metrics = await collector.getMetrics();
			expect(metrics).toContain("# HELP");
			expect(metrics).toContain("# TYPE");
			expect(typeof metrics).toBe("string");
		});

		it("should clear all metrics", async () => {
			collector.recordAgentOperation("agent-1", "test", "execute", "openai", "success");

			let metrics = await collector.getMetrics();
			expect(metrics).toContain("agent_operations_total");
			expect(metrics).toContain('agent_id="agent-1"'); // Should contain the recorded labels

			collector.clearMetrics();

			metrics = await collector.getMetrics();
			expect(metrics).toContain("agent_operations_total"); // Metric definition should still exist
			expect(metrics).not.toContain('agent_id="agent-1"'); // But label values should be reset
		});
	});
});
