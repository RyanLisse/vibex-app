export interface PrometheusAlertRule {
	alert: string;
	expr: string;
	for: string;
	labels: Record<string, string>;
	annotations: Record<string, string>;
}

export class AlertRuleBuilder {
	static createAgentAlerts(): PrometheusAlertRule[] {
		return [
			{
				alert: "HighAgentErrorRate",
				expr: 'rate(agent_operations_total{status="error"}[5m]) / rate(agent_operations_total[5m]) > 0.1',
				for: "2m",
				labels: {
					severity: "warning",
					component: "ai-agents",
				},
				annotations: {
					summary: "High error rate detected for AI agents",
					description:
						"Agent error rate is {{ $value | humanizePercentage }} for {{ $labels.agent_type }}",
					runbook_url: "https://docs.example.com/runbooks/agent-errors",
				},
			},
			{
				alert: "AgentExecutionTimeout",
				expr: "histogram_quantile(0.95, rate(agent_execution_duration_seconds_bucket[5m])) > 60",
				for: "5m",
				labels: {
					severity: "critical",
					component: "ai-agents",
				},
				annotations: {
					summary: "Agent execution times are too high",
					description:
						"95th percentile execution time is {{ $value }}s for {{ $labels.agent_type }}",
					runbook_url: "https://docs.example.com/runbooks/agent-performance",
				},
			},
			{
				alert: "HighTokenUsage",
				expr: "rate(agent_token_usage_total[1h]) > 100000",
				for: "10m",
				labels: {
					severity: "warning",
					component: "ai-agents",
				},
				annotations: {
					summary: "High token usage detected",
					description: "Token usage rate is {{ $value }} tokens/hour for {{ $labels.provider }}",
					runbook_url: "https://docs.example.com/runbooks/token-usage",
				},
			},
		];
	}

	static createSystemAlerts(): PrometheusAlertRule[] {
		return [
			{
				alert: "HighHTTPErrorRate",
				expr: 'rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05',
				for: "2m",
				labels: {
					severity: "critical",
					component: "api",
				},
				annotations: {
					summary: "High HTTP error rate detected",
					description:
						"HTTP 5xx error rate is {{ $value | humanizePercentage }} for {{ $labels.route }}",
					runbook_url: "https://docs.example.com/runbooks/http-errors",
				},
			},
			{
				alert: "DatabaseConnectionsHigh",
				expr: "database_connections_active > 80",
				for: "5m",
				labels: {
					severity: "warning",
					component: "database",
				},
				annotations: {
					summary: "High number of database connections",
					description: "Database has {{ $value }} active connections for {{ $labels.database }}",
					runbook_url: "https://docs.example.com/runbooks/database-connections",
				},
			},
			{
				alert: "SlowDatabaseQueries",
				expr: "histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m])) > 1",
				for: "5m",
				labels: {
					severity: "warning",
					component: "database",
				},
				annotations: {
					summary: "Slow database queries detected",
					description: "95th percentile query time is {{ $value }}s for {{ $labels.operation }}",
					runbook_url: "https://docs.example.com/runbooks/slow-queries",
				},
			},
		];
	}

	static createBusinessAlerts(): PrometheusAlertRule[] {
		return [
			{
				alert: "LowUserEngagement",
				expr: "user_sessions_active < 10",
				for: "15m",
				labels: {
					severity: "info",
					component: "business",
				},
				annotations: {
					summary: "Low user engagement detected",
					description: "Only {{ $value }} active user sessions",
					runbook_url: "https://docs.example.com/runbooks/user-engagement",
				},
			},
			{
				alert: "HighOperationalCost",
				expr: "sum(rate(agent_cost_total[1h])) * 24 > 100",
				for: "30m",
				labels: {
					severity: "warning",
					component: "business",
				},
				annotations: {
					summary: "High operational costs detected",
					description: "Daily operational cost projection is ${{ $value }}",
					runbook_url: "https://docs.example.com/runbooks/cost-optimization",
				},
			},
		];
	}
}
