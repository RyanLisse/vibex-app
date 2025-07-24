/**
 * External Monitoring Integration System
 *
 * Provides comprehensive monitoring capabilities including:
 * - Prometheus metrics export
 * - Grafana dashboard integration
 * - Alert management
 * - External notifications
 * - Health checks
 * - SLA monitoring
 * - Capacity planning
 */

export * from "./alerts";
export * from "./capacity";
export * from "./grafana";
export * from "./health";
export * from "./notifications";
// Export all monitoring components
export * from "./prometheus";
export * from "./sla";

// Central monitoring configuration
export interface MonitoringConfig {
	prometheus: {
		enabled: boolean;
		port: number;
		path: string;
		defaultLabels?: Record<string, string>;
	};
	grafana: {
		enabled: boolean;
		dashboardPath: string;
		datasourceName: string;
	};
	alertManager: {
		enabled: boolean;
		url: string;
		alertRules: AlertRule[];
	};
	notifications: {
		email?: EmailConfig;
		slack?: SlackConfig;
		webhook?: WebhookConfig;
	};
	health: {
		enabled: boolean;
		path: string;
		checks: HealthCheck[];
	};
	sla: {
		enabled: boolean;
		targets: SLATarget[];
		reportingInterval: number;
	};
	capacity: {
		enabled: boolean;
		thresholds: CapacityThreshold[];
		forecastDays: number;
	};
}

export interface AlertRule {
	name: string;
	condition: string;
	severity: "low" | "medium" | "high" | "critical";
	for: string;
	labels: Record<string, string>;
	annotations: Record<string, string>;
}

export interface EmailConfig {
	enabled: boolean;
	smtp: {
		host: string;
		port: number;
		secure: boolean;
		auth: {
			user: string;
			pass: string;
		};
	};
	from: string;
	to: string[];
}

export interface SlackConfig {
	enabled: boolean;
	webhookUrl: string;
	channel?: string;
	username?: string;
	iconEmoji?: string;
}

export interface WebhookConfig {
	enabled: boolean;
	url: string;
	headers?: Record<string, string>;
	method?: "POST" | "PUT";
}

export interface HealthCheck {
	name: string;
	type: "database" | "api" | "service" | "custom";
	interval: number;
	timeout: number;
	check: () => Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
	status: "healthy" | "degraded" | "unhealthy";
	message?: string;
	details?: Record<string, any>;
	responseTime?: number;
}

export interface SLATarget {
	name: string;
	metric: string;
	target: number;
	window: "hour" | "day" | "week" | "month";
	calculation: "average" | "percentile" | "count";
}

export interface CapacityThreshold {
	resource: string;
	metric: string;
	warningThreshold: number;
	criticalThreshold: number;
	unit: string;
}

// Get monitoring configuration from environment
export function getMonitoringConfig(): MonitoringConfig {
	return {
		prometheus: {
			enabled: process.env.PROMETHEUS_ENABLED === "true",
			port: Number.parseInt(process.env.PROMETHEUS_PORT || "9090", 10),
			path: process.env.PROMETHEUS_PATH || "/metrics",
			defaultLabels: {
				service: process.env.SERVICE_NAME || "codex-clone",
				environment: process.env.NODE_ENV || "development",
				version: process.env.SERVICE_VERSION || "1.0.0",
			},
		},
		grafana: {
			enabled: process.env.GRAFANA_ENABLED === "true",
			dashboardPath: process.env.GRAFANA_DASHBOARD_PATH || "./grafana/dashboards",
			datasourceName: process.env.GRAFANA_DATASOURCE || "Prometheus",
		},
		alertManager: {
			enabled: process.env.ALERT_MANAGER_ENABLED === "true",
			url: process.env.ALERT_MANAGER_URL || "http://localhost:9093",
			alertRules: [], // Loaded from configuration
		},
		notifications: {
			email:
				process.env.EMAIL_NOTIFICATIONS_ENABLED === "true"
					? {
							enabled: true,
							smtp: {
								host: process.env.SMTP_HOST || "localhost",
								port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
								secure: process.env.SMTP_SECURE === "true",
								auth: {
									user: process.env.SMTP_USER || "",
									pass: process.env.SMTP_PASS || "",
								},
							},
							from: process.env.EMAIL_FROM || "monitoring@codex-clone.com",
							to: (process.env.EMAIL_TO || "").split(",").filter(Boolean),
						}
					: undefined,
			slack: process.env.SLACK_WEBHOOK_URL
				? {
						enabled: true,
						webhookUrl: process.env.SLACK_WEBHOOK_URL,
						channel: process.env.SLACK_CHANNEL,
						username: process.env.SLACK_USERNAME || "Monitoring Bot",
						iconEmoji: process.env.SLACK_ICON || ":robot:",
					}
				: undefined,
			webhook: process.env.WEBHOOK_URL
				? {
						enabled: true,
						url: process.env.WEBHOOK_URL,
						headers: process.env.WEBHOOK_HEADERS ? JSON.parse(process.env.WEBHOOK_HEADERS) : {},
						method: (process.env.WEBHOOK_METHOD as "POST" | "PUT") || "POST",
					}
				: undefined,
		},
		health: {
			enabled: process.env.HEALTH_CHECKS_ENABLED !== "false",
			path: process.env.HEALTH_CHECK_PATH || "/health",
			checks: [], // Loaded dynamically
		},
		sla: {
			enabled: process.env.SLA_MONITORING_ENABLED === "true",
			targets: [], // Loaded from configuration
			reportingInterval: Number.parseInt(process.env.SLA_REPORTING_INTERVAL || "3600000", 10), // 1 hour
		},
		capacity: {
			enabled: process.env.CAPACITY_PLANNING_ENABLED === "true",
			thresholds: [], // Loaded from configuration
			forecastDays: Number.parseInt(process.env.CAPACITY_FORECAST_DAYS || "30", 10),
		},
	};
}

// Initialize monitoring system
export async function initializeMonitoring(): Promise<void> {
	const config = getMonitoringConfig();

	if (config.prometheus.enabled) {
		const { startPrometheusExporter } = await import("./prometheus");
		await startPrometheusExporter(config.prometheus);
	}

	if (config.alertManager.enabled) {
		const { initializeAlertManager } = await import("./alerts");
		await initializeAlertManager(config.alertManager);
	}

	if (config.health.enabled) {
		const { initializeHealthChecks } = await import("./health");
		await initializeHealthChecks(config.health);
	}

	if (config.sla.enabled) {
		const { initializeSLAMonitoring } = await import("./sla");
		await initializeSLAMonitoring(config.sla);
	}

	if (config.capacity.enabled) {
		const { initializeCapacityPlanning } = await import("./capacity");
		await initializeCapacityPlanning(config.capacity);
	}

	console.log("🔍 External monitoring system initialized");
}
