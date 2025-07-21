import { describe, expect, it } from "bun:test";
AlertRuleBuilder, type PrometheusAlertRule } from "./alert-rules";

describe("AlertRuleBuilder", () => {
	describe("createAgentAlerts", () => {
		let alerts: PrometheusAlertRule[];

		it("should create agent alerts with correct structure", () => {
			alerts = AlertRuleBuilder.createAgentAlerts();

			expect(alerts).toHaveLength(3);
			alerts.forEach((alert) => {
				expect(alert.alert).toBeDefined();
				expect(alert.expr).toBeDefined();
				expect(alert.for).toBeDefined();
				expect(alert.labels).toBeDefined();
				expect(alert.annotations).toBeDefined();
			});
		});

		it("should include high agent error rate alert", () => {
			alerts = AlertRuleBuilder.createAgentAlerts();

			const errorAlert = alerts.find((a) => a.alert === "HighAgentErrorRate");
			expect(errorAlert).toBeDefined();
			expect(errorAlert?.expr).toBe(
				'rate(agent_operations_total{status="error"}[5m]) / rate(agent_operations_total[5m]) > 0.1',
			);
			expect(errorAlert?.for).toBe("2m");
			expect(errorAlert?.labels.severity).toBe("warning");
			expect(errorAlert?.labels.component).toBe("ai-agents");
			expect(errorAlert?.annotations.summary).toContain(
				"High error rate detected",
			);
			expect(errorAlert?.annotations.runbook_url).toBeDefined();
		});

		it("should include agent execution timeout alert", () => {
			alerts = AlertRuleBuilder.createAgentAlerts();

			const timeoutAlert = alerts.find(
				(a) => a.alert === "AgentExecutionTimeout",
			);
			expect(timeoutAlert).toBeDefined();
			expect(timeoutAlert?.expr).toBe(
				"histogram_quantile(0.95, rate(agent_execution_duration_seconds_bucket[5m])) > 60",
			);
			expect(timeoutAlert?.for).toBe("5m");
			expect(timeoutAlert?.labels.severity).toBe("critical");
			expect(timeoutAlert?.annotations.summary).toContain(
				"execution times are too high",
			);
		});

		it("should include high token usage alert", () => {
			alerts = AlertRuleBuilder.createAgentAlerts();

			const tokenAlert = alerts.find((a) => a.alert === "HighTokenUsage");
			expect(tokenAlert).toBeDefined();
			expect(tokenAlert?.expr).toBe(
				"rate(agent_token_usage_total[1h]) > 100000",
			);
			expect(tokenAlert?.for).toBe("10m");
			expect(tokenAlert?.labels.severity).toBe("warning");
			expect(tokenAlert?.annotations.summary).toContain(
				"High token usage detected",
			);
		});

		it("should have valid PromQL expressions", () => {
			alerts = AlertRuleBuilder.createAgentAlerts();

			alerts.forEach((alert) => {
				// Basic PromQL validation
				expect(alert.expr).not.toContain(";;");
				expect(alert.expr).not.toStartWith(" ");
				expect(alert.expr).not.toEndWith(" ");

				// Should contain comparison operator
				expect(alert.expr).toMatch(/[><]/);

				// Should contain metric name
				expect(alert.expr).toMatch(/agent_/);
			});
		});
	});

	describe("createSystemAlerts", () => {
		let alerts: PrometheusAlertRule[];

		it("should create system alerts with correct structure", () => {
			alerts = AlertRuleBuilder.createSystemAlerts();

			expect(alerts).toHaveLength(3);
			alerts.forEach((alert) => {
				expect(alert.labels.component).toBeDefined();
				expect(alert.annotations.runbook_url).toBeDefined();
			});
		});

		it("should include high HTTP error rate alert", () => {
			alerts = AlertRuleBuilder.createSystemAlerts();

			const httpAlert = alerts.find((a) => a.alert === "HighHTTPErrorRate");
			expect(httpAlert).toBeDefined();
			expect(httpAlert?.expr).toBe(
				'rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05',
			);
			expect(httpAlert?.labels.severity).toBe("critical");
			expect(httpAlert?.labels.component).toBe("api");
			expect(httpAlert?.annotations.summary).toContain("HTTP error rate");
		});

		it("should include database connections alert", () => {
			alerts = AlertRuleBuilder.createSystemAlerts();

			const dbAlert = alerts.find((a) => a.alert === "DatabaseConnectionsHigh");
			expect(dbAlert).toBeDefined();
			expect(dbAlert?.expr).toBe("database_connections_active > 80");
			expect(dbAlert?.labels.severity).toBe("warning");
			expect(dbAlert?.labels.component).toBe("database");
		});

		it("should include slow database queries alert", () => {
			alerts = AlertRuleBuilder.createSystemAlerts();

			const slowAlert = alerts.find((a) => a.alert === "SlowDatabaseQueries");
			expect(slowAlert).toBeDefined();
			expect(slowAlert?.expr).toBe(
				"histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m])) > 1",
			);
			expect(slowAlert?.labels.component).toBe("database");
		});
	});

	describe("createBusinessAlerts", () => {
		let alerts: PrometheusAlertRule[];

		it("should create business alerts with correct structure", () => {
			alerts = AlertRuleBuilder.createBusinessAlerts();

			expect(alerts).toHaveLength(2);
			alerts.forEach((alert) => {
				expect(alert.labels.component).toBe("business");
			});
		});

		it("should include low user engagement alert", () => {
			alerts = AlertRuleBuilder.createBusinessAlerts();

			const engagementAlert = alerts.find(
				(a) => a.alert === "LowUserEngagement",
			);
			expect(engagementAlert).toBeDefined();
			expect(engagementAlert?.expr).toBe("user_sessions_active < 10");
			expect(engagementAlert?.for).toBe("15m");
			expect(engagementAlert?.labels.severity).toBe("info");
			expect(engagementAlert?.annotations.summary).toContain(
				"Low user engagement",
			);
		});

		it("should include high operational cost alert", () => {
			alerts = AlertRuleBuilder.createBusinessAlerts();

			const costAlert = alerts.find((a) => a.alert === "HighOperationalCost");
			expect(costAlert).toBeDefined();
			expect(costAlert?.expr).toBe(
				"sum(rate(agent_cost_total[1h])) * 24 > 100",
			);
			expect(costAlert?.for).toBe("30m");
			expect(costAlert?.labels.severity).toBe("warning");
			expect(costAlert?.annotations.summary).toContain(
				"High operational costs",
			);
		});
	});

	describe("alert validation", () => {
		it("should have valid alert names", () => {
			const allAlerts = [
				...AlertRuleBuilder.createAgentAlerts(),
				...AlertRuleBuilder.createSystemAlerts(),
				...AlertRuleBuilder.createBusinessAlerts(),
			];

			allAlerts.forEach((alert) => {
				// Alert names should be PascalCase
				expect(alert.alert).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
				expect(alert.alert).not.toContain(" ");
				expect(alert.alert).not.toContain("-");
			});
		});

		it("should have unique alert names", () => {
			const allAlerts = [
				...AlertRuleBuilder.createAgentAlerts(),
				...AlertRuleBuilder.createSystemAlerts(),
				...AlertRuleBuilder.createBusinessAlerts(),
			];

			const alertNames = allAlerts.map((a) => a.alert);
			const uniqueNames = [...new Set(alertNames)];
			expect(alertNames).toEqual(uniqueNames);
		});

		it("should have valid severity levels", () => {
			const allAlerts = [
				...AlertRuleBuilder.createAgentAlerts(),
				...AlertRuleBuilder.createSystemAlerts(),
				...AlertRuleBuilder.createBusinessAlerts(),
			];

			const validSeverities = ["info", "warning", "critical"];

			allAlerts.forEach((alert) => {
				expect(validSeverities).toContain(alert.labels.severity);
			});
		});

		it("should have valid duration formats", () => {
			const allAlerts = [
				...AlertRuleBuilder.createAgentAlerts(),
				...AlertRuleBuilder.createSystemAlerts(),
				...AlertRuleBuilder.createBusinessAlerts(),
			];

			allAlerts.forEach((alert) => {
				// Duration should be in Prometheus format (e.g., "1m", "5m", "30s")
				expect(alert.for).toMatch(/^\d+[smh]$/);
			});
		});

		it("should have meaningful descriptions", () => {
			const allAlerts = [
				...AlertRuleBuilder.createAgentAlerts(),
				...AlertRuleBuilder.createSystemAlerts(),
				...AlertRuleBuilder.createBusinessAlerts(),
			];

			allAlerts.forEach((alert) => {
				expect(alert.annotations.summary).toBeDefined();
				expect(alert.annotations.summary.length).toBeGreaterThan(10);
				expect(alert.annotations.description).toBeDefined();
				expect(alert.annotations.description.length).toBeGreaterThan(10);
				expect(alert.annotations.runbook_url).toBeDefined();
				expect(alert.annotations.runbook_url).toMatch(/^https?:\/\//);
			});
		});

		it("should have template variables in descriptions", () => {
			const allAlerts = [
				...AlertRuleBuilder.createAgentAlerts(),
				...AlertRuleBuilder.createSystemAlerts(),
				...AlertRuleBuilder.createBusinessAlerts(),
			];

			// Check that some alerts use template variables
			const templatedAlerts = allAlerts.filter(
				(alert) =>
					alert.annotations.description.includes("{{ $value }}") ||
					alert.annotations.description.includes("{{ $labels"),
			);

			expect(templatedAlerts.length).toBeGreaterThan(0);
		});
	});
});
