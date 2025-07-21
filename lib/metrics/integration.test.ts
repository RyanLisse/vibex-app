import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AlertRuleBuilder } from "./alert-rules";
import { GrafanaDashboardBuilder } from "./grafana-dashboards";
import { PrometheusMetricsCollector } from "./prometheus-client";

describe("Metrics Integration", () => {
	let collector: PrometheusMetricsCollector;

	beforeEach(() => {
		collector = PrometheusMetricsCollector.getInstance();
		collector.clearMetrics();
	});

	afterEach(() => {
		collector.clearMetrics();
	});

	describe("End-to-End Metric Collection and Dashboard Correlation", () => {
		it("should collect agent metrics that correlate with dashboard queries", async () => {
			// Record various agent operations
			collector.recordAgentOperation(
				"agent-1",
				"code-gen",
				"execute",
				"openai",
				"success",
			);
			collector.recordAgentOperation(
				"agent-2",
				"code-gen",
				"execute",
				"anthropic",
				"success",
			);
			collector.recordAgentOperation(
				"agent-3",
				"code-review",
				"analyze",
				"openai",
				"error",
			);

			collector.recordAgentExecution(
				"agent-1",
				"code-gen",
				"typescript",
				"openai",
				2.5,
			);
			collector.recordAgentExecution(
				"agent-2",
				"code-gen",
				"python",
				"anthropic",
				1.8,
			);
			collector.recordAgentExecution(
				"agent-3",
				"code-review",
				"security",
				"openai",
				45.2,
			);

			collector.recordTokenUsage("agent-1", "code-gen", "openai", "input", 150);
			collector.recordTokenUsage("agent-1", "code-gen", "openai", "output", 85);
			collector.recordAgentCost("agent-1", "code-gen", "openai", 0.02);

			collector.setActiveAgents("code-gen", "openai", 2);
			collector.setActiveAgents("code-review", "openai", 1);

			const metrics = await collector.getMetrics();

			// Verify metrics exist for dashboard queries
			expect(metrics).toContain("agent_operations_total");
			expect(metrics).toContain("agent_execution_duration_seconds");
			expect(metrics).toContain("agent_token_usage_total");
			expect(metrics).toContain("agent_cost_total");
			expect(metrics).toContain("agent_active_count");

			// Verify dashboard can be created with these metrics
			const dashboard = GrafanaDashboardBuilder.createAgentOverviewDashboard();
			expect(dashboard.panels).toHaveLength(5);

			// Check that dashboard queries would work with collected metrics
			const activeAgentsPanel = dashboard.panels.find(
				(p) => p.title === "Active Agents",
			);
			expect(activeAgentsPanel?.targets[0].expr).toBe(
				"sum(agent_active_count)",
			);

			const operationsPanel = dashboard.panels.find(
				(p) => p.title === "Agent Operations Rate",
			);
			expect(operationsPanel?.targets[0].expr).toBe(
				"rate(agent_operations_total[5m])",
			);
		});

		it("should collect system metrics that correlate with system health dashboard", async () => {
			// Record system metrics
			collector.recordHttpRequest("GET", "/api/agents", 200, 0.125);
			collector.recordHttpRequest("POST", "/api/tasks", 201, 0.285);
			collector.recordHttpRequest("GET", "/api/health", 500, 2.1);

			collector.setDatabaseConnections("postgres", "main", 15);
			collector.setDatabaseConnections("postgres", "readonly", 8);

			collector.recordDatabaseQuery("SELECT", "agents", 0.025);
			collector.recordDatabaseQuery("INSERT", "tasks", 0.055);
			collector.recordDatabaseQuery("UPDATE", "agents", 1.2);

			const metrics = await collector.getMetrics();

			// Verify system metrics
			expect(metrics).toContain("http_requests_total");
			expect(metrics).toContain("http_request_duration_seconds");
			expect(metrics).toContain("database_connections_active");
			expect(metrics).toContain("database_query_duration_seconds");

			// Verify dashboard correlation
			const dashboard = GrafanaDashboardBuilder.createSystemHealthDashboard();
			const httpPanel = dashboard.panels.find(
				(p) => p.title === "HTTP Request Rate",
			);
			expect(httpPanel?.targets[0].expr).toBe("rate(http_requests_total[5m])");

			const dbPanel = dashboard.panels.find(
				(p) => p.title === "Database Connections",
			);
			expect(dbPanel?.targets[0].expr).toBe("database_connections_active");
		});

		it("should collect business metrics that correlate with business dashboard", async () => {
			// Record business metrics
			collector.setActiveUserSessions(42);
			collector.recordFeatureUsage("code-generation", "premium");
			collector.recordFeatureUsage("code-review", "free");
			collector.recordFeatureUsage("voice-brainstorm", "premium");

			// Also record some agent costs for cost analysis
			collector.recordAgentCost("agent-1", "code-gen", "openai", 0.05);
			collector.recordAgentCost("agent-2", "code-gen", "anthropic", 0.03);
			collector.recordAgentOperation(
				"agent-1",
				"code-gen",
				"execute",
				"openai",
				"success",
			);
			collector.recordAgentOperation(
				"agent-2",
				"code-gen",
				"execute",
				"anthropic",
				"success",
			);

			const metrics = await collector.getMetrics();

			// Verify business metrics
			expect(metrics).toContain("user_sessions_active");
			expect(metrics).toContain("feature_usage_total");
			expect(metrics).toContain("agent_cost_total");

			// Verify dashboard correlation
			const dashboard =
				GrafanaDashboardBuilder.createBusinessMetricsDashboard();
			const sessionsPanel = dashboard.panels.find(
				(p) => p.title === "Active User Sessions",
			);
			expect(sessionsPanel?.targets[0].expr).toBe("user_sessions_active");

			const costPanel = dashboard.panels.find(
				(p) => p.title === "Cost per Operation",
			);
			expect(costPanel?.targets[0].expr).toContain(
				"rate(agent_cost_total[1h])",
			);
			expect(costPanel?.targets[0].expr).toContain(
				"rate(agent_operations_total[1h])",
			);
		});
	});

	describe("Alert Rules and Metric Correlation", () => {
		it("should trigger agent alerts based on collected metrics", async () => {
			// Generate metrics that would trigger alerts

			// High error rate
			for (let i = 0; i < 8; i++) {
				collector.recordAgentOperation(
					`agent-${i}`,
					"code-gen",
					"execute",
					"openai",
					"error",
				);
			}
			for (let i = 0; i < 2; i++) {
				collector.recordAgentOperation(
					`agent-${i}`,
					"code-gen",
					"execute",
					"openai",
					"success",
				);
			}

			// High execution times
			collector.recordAgentExecution(
				"agent-slow",
				"code-gen",
				"complex",
				"openai",
				75.5,
			);
			collector.recordAgentExecution(
				"agent-slow",
				"code-gen",
				"complex",
				"anthropic",
				82.1,
			);

			// High token usage
			collector.recordTokenUsage(
				"agent-heavy",
				"code-gen",
				"openai",
				"total",
				150_000,
			);

			const metrics = await collector.getMetrics();

			// Verify metrics would trigger alerts
			const agentAlerts = AlertRuleBuilder.createAgentAlerts();

			const errorRateAlert = agentAlerts.find(
				(a) => a.alert === "HighAgentErrorRate",
			);
			expect(errorRateAlert?.expr).toContain(
				'rate(agent_operations_total{status="error"}[5m])',
			);
			expect(errorRateAlert?.expr).toContain(
				"rate(agent_operations_total[5m]) > 0.1",
			);

			const timeoutAlert = agentAlerts.find(
				(a) => a.alert === "AgentExecutionTimeout",
			);
			expect(timeoutAlert?.expr).toContain(
				"histogram_quantile(0.95, rate(agent_execution_duration_seconds_bucket[5m])) > 60",
			);

			const tokenAlert = agentAlerts.find((a) => a.alert === "HighTokenUsage");
			expect(tokenAlert?.expr).toContain(
				"rate(agent_token_usage_total[1h]) > 100000",
			);

			// Verify metrics contain the data that would trigger these alerts
			expect(metrics).toContain("agent_operations_total");
			expect(metrics).toContain('status="error"');
			expect(metrics).toContain('status="success"');
			expect(metrics).toContain("agent_execution_duration_seconds");
			expect(metrics).toContain("agent_token_usage_total");
		});

		it("should trigger system alerts based on collected metrics", async () => {
			// Generate metrics that would trigger system alerts

			// High HTTP error rate
			for (let i = 0; i < 6; i++) {
				collector.recordHttpRequest("GET", "/api/agents", 500, 0.5);
			}
			for (let i = 0; i < 94; i++) {
				collector.recordHttpRequest("GET", "/api/agents", 200, 0.1);
			}

			// High database connections
			collector.setDatabaseConnections("postgres", "main", 85);

			// Slow queries
			collector.recordDatabaseQuery("SELECT", "large_table", 1.5);
			collector.recordDatabaseQuery("SELECT", "complex_join", 2.2);

			const metrics = await collector.getMetrics();

			const systemAlerts = AlertRuleBuilder.createSystemAlerts();

			const httpErrorAlert = systemAlerts.find(
				(a) => a.alert === "HighHTTPErrorRate",
			);
			expect(httpErrorAlert?.expr).toContain(
				'rate(http_requests_total{status_code=~"5.."}[5m])',
			);
			expect(httpErrorAlert?.expr).toContain(
				"rate(http_requests_total[5m]) > 0.05",
			);

			const dbConnectionAlert = systemAlerts.find(
				(a) => a.alert === "DatabaseConnectionsHigh",
			);
			expect(dbConnectionAlert?.expr).toBe("database_connections_active > 80");

			const slowQueryAlert = systemAlerts.find(
				(a) => a.alert === "SlowDatabaseQueries",
			);
			expect(slowQueryAlert?.expr).toContain(
				"histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m])) > 1",
			);

			// Verify relevant metrics are collected
			expect(metrics).toContain("http_requests_total");
			expect(metrics).toContain('status_code="500"');
			expect(metrics).toContain('status_code="200"');
			expect(metrics).toContain("database_connections_active");
			expect(metrics).toContain("database_query_duration_seconds");
		});

		it("should trigger business alerts based on collected metrics", async () => {
			// Generate metrics that would trigger business alerts

			// Low user engagement
			collector.setActiveUserSessions(5);

			// High operational cost
			collector.recordAgentCost("agent-1", "expensive", "premium-model", 15.5);
			collector.recordAgentCost("agent-2", "expensive", "premium-model", 12.8);
			collector.recordAgentCost("agent-3", "expensive", "premium-model", 18.2);

			const metrics = await collector.getMetrics();

			const businessAlerts = AlertRuleBuilder.createBusinessAlerts();

			const engagementAlert = businessAlerts.find(
				(a) => a.alert === "LowUserEngagement",
			);
			expect(engagementAlert?.expr).toBe("user_sessions_active < 10");

			const costAlert = businessAlerts.find(
				(a) => a.alert === "HighOperationalCost",
			);
			expect(costAlert?.expr).toBe(
				"sum(rate(agent_cost_total[1h])) * 24 > 100",
			);

			// Verify relevant metrics are collected
			expect(metrics).toContain("user_sessions_active");
			expect(metrics).toContain("5");
			expect(metrics).toContain("agent_cost_total");
		});
	});

	describe("Metric Lifecycle and Consistency", () => {
		it("should maintain metric consistency across dashboard and alert queries", async () => {
			// Record comprehensive metrics
			collector.recordAgentOperation(
				"agent-1",
				"code-gen",
				"execute",
				"openai",
				"success",
			);
			collector.recordAgentExecution(
				"agent-1",
				"code-gen",
				"typescript",
				"openai",
				1.5,
			);
			collector.recordTokenUsage("agent-1", "code-gen", "openai", "total", 200);
			collector.recordAgentCost("agent-1", "code-gen", "openai", 0.03);
			collector.setActiveAgents("code-gen", "openai", 1);

			collector.recordHttpRequest("GET", "/api/agents", 200, 0.1);
			collector.setDatabaseConnections("postgres", "main", 10);
			collector.recordDatabaseQuery("SELECT", "agents", 0.02);

			collector.setActiveUserSessions(25);
			collector.recordFeatureUsage("code-generation", "premium");

			const metrics = await collector.getMetrics();

			// Get all dashboards and alerts
			const agentDashboard =
				GrafanaDashboardBuilder.createAgentOverviewDashboard();
			const systemDashboard =
				GrafanaDashboardBuilder.createSystemHealthDashboard();
			const businessDashboard =
				GrafanaDashboardBuilder.createBusinessMetricsDashboard();

			const agentAlerts = AlertRuleBuilder.createAgentAlerts();
			const systemAlerts = AlertRuleBuilder.createSystemAlerts();
			const businessAlerts = AlertRuleBuilder.createBusinessAlerts();

			// Verify all metric names used in dashboards exist in collected metrics
			const allPanels = [
				...agentDashboard.panels,
				...systemDashboard.panels,
				...businessDashboard.panels,
			];

			const allAlerts = [...agentAlerts, ...systemAlerts, ...businessAlerts];

			// Extract metric names from dashboard queries
			const dashboardMetrics = new Set<string>();
			allPanels.forEach((panel) => {
				panel.targets.forEach((target) => {
					const metricNames = target.expr.match(
						/[a-z_][a-z0-9_]*(?:_total|_seconds|_bytes|_count|_active)/g,
					);
					metricNames?.forEach((name) => dashboardMetrics.add(name));
				});
			});

			// Extract metric names from alert expressions
			const alertMetrics = new Set<string>();
			allAlerts.forEach((alert) => {
				const metricNames = alert.expr.match(
					/[a-z_][a-z0-9_]*(?:_total|_seconds|_bytes|_count|_active)/g,
				);
				metricNames?.forEach((name) => alertMetrics.add(name));
			});

			// Verify all dashboard metrics exist in collected metrics
			dashboardMetrics.forEach((metricName) => {
				expect(metrics).toContain(metricName);
			});

			// Verify all alert metrics exist in collected metrics
			alertMetrics.forEach((metricName) => {
				expect(metrics).toContain(metricName);
			});

			// Verify metric consistency
			expect(dashboardMetrics.size).toBeGreaterThan(10);
			expect(alertMetrics.size).toBeGreaterThan(5);
		});

		it("should handle metric updates and maintain data integrity", async () => {
			// Initial metrics
			collector.recordAgentOperation(
				"agent-1",
				"code-gen",
				"execute",
				"openai",
				"success",
			);
			collector.setActiveAgents("code-gen", "openai", 1);

			let metrics = await collector.getMetrics();
			expect(metrics).toContain("agent_operations_total");
			expect(metrics).toContain("agent_active_count");

			// Update metrics
			collector.recordAgentOperation(
				"agent-1",
				"code-gen",
				"execute",
				"openai",
				"success",
			);
			collector.recordAgentOperation(
				"agent-2",
				"code-gen",
				"execute",
				"anthropic",
				"error",
			);
			collector.setActiveAgents("code-gen", "openai", 2);
			collector.setActiveAgents("code-gen", "anthropic", 1);

			metrics = await collector.getMetrics();

			// Verify updates are reflected
			expect(metrics).toContain("agent_operations_total");
			expect(metrics).toContain('provider="openai"');
			expect(metrics).toContain('provider="anthropic"');
			expect(metrics).toContain('status="success"');
			expect(metrics).toContain('status="error"');

			// Clear and verify reset
			collector.clearMetrics();
			metrics = await collector.getMetrics();

			// Metrics definitions should exist but no label values
			expect(metrics).toContain("agent_operations_total");
			expect(metrics).not.toContain('provider="openai"');
			expect(metrics).not.toContain('status="success"');
		});
	});
});
