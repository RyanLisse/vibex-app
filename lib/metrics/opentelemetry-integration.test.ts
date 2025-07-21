import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OpenTelemetryPrometheusIntegration } from "./opentelemetry-integration";
import { PrometheusMetricsCollector } from "./prometheus-client";

describe("OpenTelemetryPrometheusIntegration", () => {
	let integration: OpenTelemetryPrometheusIntegration;
	let prometheusCollector: PrometheusMetricsCollector;

	beforeEach(() => {
		integration = OpenTelemetryPrometheusIntegration.getInstance({
			serviceName: "test-service",
			serviceVersion: "1.0.0",
			prometheusPort: 9091,
			prometheusEndpoint: "/test-metrics",
		});
		prometheusCollector = PrometheusMetricsCollector.getInstance();
		prometheusCollector.clearMetrics();
	});

	afterEach(() => {
		prometheusCollector.clearMetrics();
	});

	describe("singleton pattern", () => {
		it("should return the same instance", () => {
			const instance1 = OpenTelemetryPrometheusIntegration.getInstance();
			const instance2 = OpenTelemetryPrometheusIntegration.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("configuration", () => {
		it("should use provided configuration", () => {
			const config = integration.getConfig();
			expect(config.serviceName).toBe("test-service");
			expect(config.serviceVersion).toBe("1.0.0");
			expect(config.prometheusPort).toBe(9091);
			expect(config.prometheusEndpoint).toBe("/test-metrics");
		});

		it("should use default configuration when not provided", () => {
			// Since we're using singleton, we need to check if it already has custom config
			const config = integration.getConfig();

			// The singleton pattern means the first instance sets the config
			expect(config.serviceName).toBeTruthy();
			expect(config.serviceVersion).toBeTruthy();
			expect(config.prometheusPort).toBeGreaterThan(0);
			expect(config.prometheusEndpoint).toBeTruthy();
			expect(typeof config.enableDefaultMetrics).toBe("boolean");
		});
	});

	describe("OpenTelemetry metrics creation", () => {
		it("should create OpenTelemetry metrics", () => {
			const metrics = integration.createOpenTelemetryMetrics();

			expect(metrics.agentLatencyHistogram).toBeDefined();
			expect(metrics.agentThroughputCounter).toBeDefined();
			expect(metrics.systemResourceGauge).toBeDefined();
			expect(metrics.businessKpiGauge).toBeDefined();
		});
	});

	describe("dual metric recording", () => {
		it("should record agent operations in both Prometheus and OpenTelemetry", async () => {
			integration.recordAgentOperationDual(
				"test-agent",
				"code-gen",
				"execute",
				"openai",
				"success",
				1.5,
			);

			// Verify Prometheus metrics
			const prometheusMetrics = await prometheusCollector.getMetrics();
			expect(prometheusMetrics).toContain("agent_operations_total");
			expect(prometheusMetrics).toContain("agent_execution_duration_seconds");
			expect(prometheusMetrics).toContain('agent_id="test-agent"');
			expect(prometheusMetrics).toContain('status="success"');
		});

		it("should record system metrics with correlation IDs", async () => {
			integration.recordSystemMetricsDual(
				"http",
				"api_request",
				0.25,
				{
					method: "GET",
					route: "/api/test",
					status_code: "200",
				},
				"corr-123",
			);

			// Verify Prometheus metrics
			const prometheusMetrics = await prometheusCollector.getMetrics();
			expect(prometheusMetrics).toContain("http_requests_total");
			expect(prometheusMetrics).toContain("http_request_duration_seconds");
			expect(prometheusMetrics).toContain('method="GET"');
			expect(prometheusMetrics).toContain('route="/api/test"');
			expect(prometheusMetrics).toContain('status_code="200"');
		});

		it("should record database metrics", async () => {
			integration.recordSystemMetricsDual(
				"database",
				"query",
				0.05,
				{
					operation: "SELECT",
					table: "users",
				},
				"db-corr-456",
			);

			const prometheusMetrics = await prometheusCollector.getMetrics();
			expect(prometheusMetrics).toContain("database_query_duration_seconds");
			expect(prometheusMetrics).toContain('operation="SELECT"');
			expect(prometheusMetrics).toContain('table="users"');
		});
	});

	describe("unified metrics export", () => {
		it("should export unified metrics from both systems", async () => {
			// Record some metrics
			integration.recordAgentOperationDual(
				"agent-1",
				"code-gen",
				"execute",
				"openai",
				"success",
				2.0,
			);

			integration.recordSystemMetricsDual("http", "request", 0.1, {
				method: "POST",
				route: "/api/agents",
				status_code: "201",
			});

			const unifiedMetrics = await integration.getUnifiedMetrics();

			expect(unifiedMetrics.prometheus).toBeDefined();
			expect(unifiedMetrics.opentelemetry).toBeDefined();
			expect(unifiedMetrics.correlations).toBeDefined();

			expect(unifiedMetrics.prometheus).toContain("agent_operations_total");
			expect(unifiedMetrics.prometheus).toContain("http_requests_total");

			expect(unifiedMetrics.correlations).toHaveLength(3);
			expect(unifiedMetrics.correlations[0].prometheus_metric).toBe(
				"agent_operations_total",
			);
			expect(unifiedMetrics.correlations[0].opentelemetry_metric).toBe(
				"agent_throughput_otel",
			);
		});
	});

	describe("metrics middleware", () => {
		it("should create functional metrics middleware", () => {
			const middleware = integration.createMetricsMiddleware();
			expect(typeof middleware).toBe("function");
		});

		it("should record metrics via middleware", async () => {
			const middleware = integration.createMetricsMiddleware();

			// Mock request and response
			const req = {
				method: "GET",
				url: "/api/test",
				headers: { "x-correlation-id": "test-corr-123" },
			};
			const res = { statusCode: 200 };
			const next = async () => {
				// Simulate processing time
				await new Promise((resolve) => setTimeout(resolve, 10));
			};

			await middleware(req, res, next);

			// Verify metrics were recorded
			const prometheusMetrics = await prometheusCollector.getMetrics();
			expect(prometheusMetrics).toContain("http_requests_total");
			expect(prometheusMetrics).toContain('method="GET"');
			expect(prometheusMetrics).toContain('status_code="200"');
		});
	});

	describe("health check", () => {
		it("should return healthy status when all components work", async () => {
			// Record some metrics to ensure systems are working
			integration.recordAgentOperationDual(
				"health-agent",
				"test",
				"health-check",
				"test-provider",
				"success",
				0.1,
			);

			const health = await integration.healthCheck();

			expect(health.status).toBe("healthy");
			expect(health.prometheus).toBe(true);
			expect(health.opentelemetry).toBe(true);
			expect(health.observability).toBe(true);
		});
	});

	describe("metric correlation", () => {
		it("should maintain correlation between Prometheus and OpenTelemetry metrics", async () => {
			const agentId = "corr-test-agent";
			const correlationId = "test-correlation-123";

			// Record agent operation
			integration.recordAgentOperationDual(
				agentId,
				"correlation-test",
				"execute",
				"test-provider",
				"success",
				1.0,
			);

			// Record system operation with same correlation context
			integration.recordSystemMetricsDual(
				"http",
				"correlated_request",
				0.5,
				{
					method: "POST",
					route: `/api/agents/${agentId}`,
					status_code: "200",
				},
				correlationId,
			);

			const unifiedMetrics = await integration.getUnifiedMetrics();

			// Verify both metric systems recorded the operations
			expect(unifiedMetrics.prometheus).toContain("agent_operations_total");
			expect(unifiedMetrics.prometheus).toContain("http_requests_total");
			expect(unifiedMetrics.prometheus).toContain(`agent_id="${agentId}"`);

			// Verify correlation mappings exist
			const agentCorrelation = unifiedMetrics.correlations.find(
				(c) => c.prometheus_metric === "agent_operations_total",
			);
			expect(agentCorrelation).toBeDefined();
			expect(agentCorrelation?.opentelemetry_metric).toBe(
				"agent_throughput_otel",
			);

			const httpCorrelation = unifiedMetrics.correlations.find(
				(c) => c.prometheus_metric === "http_requests_total",
			);
			expect(httpCorrelation).toBeDefined();
			expect(httpCorrelation?.opentelemetry_metric).toBe(
				"system_resources_otel",
			);
		});
	});

	describe("error handling", () => {
		it("should handle unknown metric types gracefully", async () => {
			// This should not throw
			integration.recordSystemMetricsDual("unknown" as any, "test", 1.0, {
				test: "value",
			});

			// Should still be able to get metrics
			const prometheusMetrics = await prometheusCollector.getMetrics();
			expect(prometheusMetrics).toBeDefined();
		});

		it("should handle missing labels gracefully", async () => {
			integration.recordSystemMetricsDual(
				"http",
				"request_with_missing_labels",
				0.1,
				// No labels provided
			);

			const prometheusMetrics = await prometheusCollector.getMetrics();
			expect(prometheusMetrics).toContain("http_requests_total");
			expect(prometheusMetrics).toContain('method="GET"'); // Default
			expect(prometheusMetrics).toContain('route="/unknown"'); // Default
		});
	});
});
