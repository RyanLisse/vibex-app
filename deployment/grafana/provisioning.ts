/**
 * Grafana Provisioning Configuration
 * Manages dashboards, data sources, and alert configurations
 */

import { GrafanaDashboardBuilder } from "@/lib/metrics/grafana-dashboards";
import { AlertRuleBuilder } from "@/lib/metrics/alert-rules";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export interface GrafanaDataSource {
	name: string;
	type: string;
	access: "proxy" | "direct";
	url: string;
	basicAuth?: boolean;
	basicAuthUser?: string;
	basicAuthPassword?: string;
	withCredentials?: boolean;
	isDefault?: boolean;
	jsonData?: Record<string, any>;
	secureJsonData?: Record<string, any>;
	version?: number;
	readOnly?: boolean;
}

export interface GrafanaProvisioningConfig {
	apiVersion: number;
	datasources: GrafanaDataSource[];
}

export interface GrafanaDashboardProvider {
	name: string;
	orgId: number;
	folder: string;
	type: "file";
	disableDeletion: boolean;
	updateIntervalSeconds: number;
	allowUiUpdates: boolean;
	options: {
		path: string;
	};
}

export interface GrafanaDashboardProvisioningConfig {
	apiVersion: number;
	providers: GrafanaDashboardProvider[];
}

export class GrafanaProvisioning {
	private config: {
		outputDir: string;
		prometheusUrl: string;
		environment: string;
	};

	constructor(
		config: {
			outputDir?: string;
			prometheusUrl?: string;
			environment?: string;
		} = {}
	) {
		this.config = {
			outputDir: config.outputDir || "./deployment/grafana/provisioning",
			prometheusUrl: config.prometheusUrl || "http://prometheus:9090",
			environment: config.environment || process.env.NODE_ENV || "development",
		};
	}

	/**
	 * Generate data source configuration
	 */
	generateDataSourceConfig(): GrafanaProvisioningConfig {
		const datasources: GrafanaDataSource[] = [
			{
				name: "Prometheus",
				type: "prometheus",
				access: "proxy",
				url: this.config.prometheusUrl,
				isDefault: true,
				version: 1,
				readOnly: false,
				jsonData: {
					httpMethod: "POST",
					manageAlerts: true,
					prometheusType: "Prometheus",
					prometheusVersion: "2.40.0",
					cacheLevel: "High",
					disableRecordingRules: false,
					incrementalQueryOverlapWindow: "10m",
					exemplarTraceIdDestinations: [
						{
							name: "trace_id",
							datasourceUid: "jaeger",
						},
					],
				},
			},
		];

		// Add Jaeger for tracing if configured
		if (process.env.JAEGER_URL) {
			datasources.push({
				name: "Jaeger",
				type: "jaeger",
				access: "proxy",
				url: process.env.JAEGER_URL,
				jsonData: {
					tracesToLogsV2: {
						datasourceUid: "loki",
						spanStartTimeShift: "1h",
						spanEndTimeShift: "-1h",
						tags: [{ key: "service.name", value: "terragon-web" }],
						filterByTraceID: false,
						filterBySpanID: false,
					},
				},
			});
		}

		// Add Loki for logs if configured
		if (process.env.LOKI_URL) {
			datasources.push({
				name: "Loki",
				type: "loki",
				access: "proxy",
				url: process.env.LOKI_URL,
				jsonData: {
					maxLines: 1000,
					derivedFields: [
						{
							matcherRegex: "trace_id=(\\w+)",
							name: "TraceID",
							url: "${__value.raw}",
							datasourceUid: "jaeger",
						},
					],
				},
			});
		}

		return {
			apiVersion: 1,
			datasources,
		};
	}

	/**
	 * Generate dashboard provider configuration
	 */
	generateDashboardProviderConfig(): GrafanaDashboardProvisioningConfig {
		return {
			apiVersion: 1,
			providers: [
				{
					name: "Terragon Dashboards",
					orgId: 1,
					folder: "Terragon",
					type: "file",
					disableDeletion: false,
					updateIntervalSeconds: 10,
					allowUiUpdates: true,
					options: {
						path: "/etc/grafana/provisioning/dashboards",
					},
				},
				{
					name: "AI Agent Dashboards",
					orgId: 1,
					folder: "AI Agents",
					type: "file",
					disableDeletion: false,
					updateIntervalSeconds: 10,
					allowUiUpdates: true,
					options: {
						path: "/etc/grafana/provisioning/dashboards/agents",
					},
				},
				{
					name: "System Dashboards",
					orgId: 1,
					folder: "System",
					type: "file",
					disableDeletion: false,
					updateIntervalSeconds: 10,
					allowUiUpdates: true,
					options: {
						path: "/etc/grafana/provisioning/dashboards/system",
					},
				},
			],
		};
	}

	/**
	 * Generate all dashboard JSON files
	 */
	async generateDashboards(): Promise<void> {
		const dashboards = [
			{
				name: "ai-agent-overview.json",
				folder: "agents",
				dashboard: GrafanaDashboardBuilder.createAgentOverviewDashboard(),
			},
			{
				name: "system-health.json",
				folder: "system",
				dashboard: GrafanaDashboardBuilder.createSystemHealthDashboard(),
			},
			{
				name: "business-metrics.json",
				folder: "",
				dashboard: GrafanaDashboardBuilder.createBusinessMetricsDashboard(),
			},
		];

		for (const { name, folder, dashboard } of dashboards) {
			const folderPath = join(this.config.outputDir, "dashboards", folder);
			await mkdir(folderPath, { recursive: true });

			const filePath = join(folderPath, name);
			await writeFile(filePath, JSON.stringify(dashboard, null, 2));
		}
	}

	/**
	 * Generate alert rules YAML files
	 */
	async generateAlertRules(): Promise<void> {
		const alertGroups = [
			{
				name: "agent-alerts.yml",
				group: "ai-agents",
				rules: AlertRuleBuilder.createAgentAlerts(),
			},
			{
				name: "system-alerts.yml",
				group: "system",
				rules: AlertRuleBuilder.createSystemAlerts(),
			},
			{
				name: "business-alerts.yml",
				group: "business",
				rules: AlertRuleBuilder.createBusinessAlerts(),
			},
		];

		const rulesDir = join(this.config.outputDir, "rules");
		await mkdir(rulesDir, { recursive: true });

		for (const { name, group, rules } of alertGroups) {
			const yamlContent = this.generateAlertRuleYAML(group, rules);
			const filePath = join(rulesDir, name);
			await writeFile(filePath, yamlContent);
		}
	}

	/**
	 * Generate Docker Compose configuration for Grafana
	 */
	generateDockerCompose(): object {
		return {
			version: "3.8",
			services: {
				grafana: {
					image: "grafana/grafana:latest",
					container_name: "terragon-grafana",
					restart: "unless-stopped",
					ports: ["3001:3000"],
					environment: {
						GF_SECURITY_ADMIN_PASSWORD: process.env.GRAFANA_ADMIN_PASSWORD || "admin",
						GF_USERS_ALLOW_SIGN_UP: "false",
						GF_SECURITY_ALLOW_EMBEDDING: "true",
						GF_AUTH_ANONYMOUS_ENABLED: this.config.environment === "development" ? "true" : "false",
						GF_AUTH_ANONYMOUS_ORG_ROLE: "Viewer",
						GF_INSTALL_PLUGINS: "grafana-piechart-panel,grafana-worldmap-panel,grafana-clock-panel",
						GF_FEATURE_TOGGLES_ENABLE: "traceqlEditor",
					},
					volumes: [
						"./deployment/grafana/provisioning:/etc/grafana/provisioning",
						"./deployment/grafana/grafana.ini:/etc/grafana/grafana.ini",
						"grafana-storage:/var/lib/grafana",
					],
					networks: ["terragon-monitoring"],
				},
				prometheus: {
					image: "prom/prometheus:latest",
					container_name: "terragon-prometheus",
					restart: "unless-stopped",
					ports: ["9090:9090"],
					command: [
						"--config.file=/etc/prometheus/prometheus.yml",
						"--storage.tsdb.path=/prometheus",
						"--web.console.libraries=/etc/prometheus/console_libraries",
						"--web.console.templates=/etc/prometheus/consoles",
						"--storage.tsdb.retention.time=200h",
						"--web.enable-lifecycle",
						"--web.enable-admin-api",
					],
					volumes: [
						"./deployment/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml",
						"./deployment/prometheus/rules:/etc/prometheus/rules",
						"prometheus-storage:/prometheus",
					],
					networks: ["terragon-monitoring"],
				},
				alertmanager: {
					image: "prom/alertmanager:latest",
					container_name: "terragon-alertmanager",
					restart: "unless-stopped",
					ports: ["9093:9093"],
					volumes: [
						"./deployment/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml",
					],
					networks: ["terragon-monitoring"],
				},
			},
			networks: {
				"terragon-monitoring": {
					driver: "bridge",
				},
			},
			volumes: {
				"grafana-storage": {},
				"prometheus-storage": {},
			},
		};
	}

	/**
	 * Generate complete provisioning setup
	 */
	async provisionAll(): Promise<void> {
		// Create directory structure
		await mkdir(join(this.config.outputDir, "datasources"), { recursive: true });
		await mkdir(join(this.config.outputDir, "dashboards"), { recursive: true });
		await mkdir(join(this.config.outputDir, "notifiers"), { recursive: true });

		// Generate data source configuration
		const dataSourceConfig = this.generateDataSourceConfig();
		await writeFile(
			join(this.config.outputDir, "datasources", "datasources.yml"),
			this.yamlStringify(dataSourceConfig)
		);

		// Generate dashboard provider configuration
		const dashboardProviderConfig = this.generateDashboardProviderConfig();
		await writeFile(
			join(this.config.outputDir, "dashboards", "dashboards.yml"),
			this.yamlStringify(dashboardProviderConfig)
		);

		// Generate dashboard files
		await this.generateDashboards();

		// Generate alert rules
		await this.generateAlertRules();

		// Generate Docker Compose
		const dockerCompose = this.generateDockerCompose();
		await writeFile(
			join(this.config.outputDir, "..", "docker-compose.monitoring.yml"),
			this.yamlStringify(dockerCompose)
		);

		console.log(`✅ Grafana provisioning generated in ${this.config.outputDir}`);
	}

	/**
	 * Convert alert rules to YAML format
	 */
	private generateAlertRuleYAML(groupName: string, rules: any[]): string {
		const ruleGroup = {
			groups: [
				{
					name: groupName,
					rules: rules,
				},
			],
		};

		return this.yamlStringify(ruleGroup);
	}

	/**
	 * Simple YAML stringifier (replace with proper YAML library in production)
	 */
	private yamlStringify(obj: any): string {
		return JSON.stringify(obj, null, 2)
			.replace(/"/g, "")
			.replace(/,$/gm, "")
			.replace(/^\s*\[/gm, "  - ")
			.replace(/^\s*\]/gm, "")
			.replace(/^\s*\{/gm, "")
			.replace(/^\s*\}/gm, "");
	}
}

// CLI usage
if (require.main === module) {
	const provisioning = new GrafanaProvisioning();
	provisioning.provisionAll().catch(console.error);
}
