/**
 * Prometheus Server Configuration
 * Provides configuration management for Prometheus server setup
 */

export interface PrometheusServerConfig {
	global: {
		scrape_interval: string;
		evaluation_interval: string;
		external_labels?: Record<string, string>;
	};
	rule_files: string[];
	scrape_configs: ScrapeConfig[];
	alerting?: {
		alertmanagers: AlertManagerConfig[];
	};
	remote_write?: RemoteWriteConfig[];
}

export interface ScrapeConfig {
	job_name: string;
	scrape_interval?: string;
	metrics_path?: string;
	static_configs?: StaticConfig[];
	kubernetes_sd_configs?: KubernetesSDConfig[];
	file_sd_configs?: FileSDConfig[];
	relabel_configs?: RelabelConfig[];
}

export interface StaticConfig {
	targets: string[];
	labels?: Record<string, string>;
}

export interface KubernetesSDConfig {
	role: "node" | "service" | "pod" | "endpoints" | "endpointslice" | "ingress";
	namespaces?: {
		names: string[];
	};
}

export interface FileSDConfig {
	files: string[];
	refresh_interval?: string;
}

export interface RelabelConfig {
	source_labels?: string[];
	separator?: string;
	target_label?: string;
	regex?: string;
	replacement?: string;
	action?: "replace" | "keep" | "drop" | "hashmod" | "labelmap" | "labeldrop" | "labelkeep";
}

export interface AlertManagerConfig {
	static_configs: StaticConfig[];
	scheme?: "http" | "https";
	timeout?: string;
	api_version?: "v1" | "v2";
}

export interface RemoteWriteConfig {
	url: string;
	remote_timeout?: string;
	headers?: Record<string, string>;
	write_relabel_configs?: RelabelConfig[];
	name?: string;
	send_exemplars?: boolean;
}

export class PrometheusConfigBuilder {
	static createDevelopmentConfig(): PrometheusServerConfig {
		return {
			global: {
				scrape_interval: "15s",
				evaluation_interval: "15s",
				external_labels: {
					monitor: "terragon-dev",
					environment: "development",
				},
			},
			rule_files: ["/etc/prometheus/rules/*.yml"],
			scrape_configs: [
				{
					job_name: "prometheus",
					static_configs: [
						{
							targets: ["localhost:9090"],
						},
					],
				},
				{
					job_name: "node-exporter",
					static_configs: [
						{
							targets: ["localhost:9100"],
						},
					],
				},
				{
					job_name: "terragon-app",
					scrape_interval: "5s",
					metrics_path: "/api/metrics",
					static_configs: [
						{
							targets: ["localhost:3000"],
							labels: {
								service: "terragon-web",
								version: "dev",
							},
						},
					],
				},
				{
					job_name: "ai-agents",
					scrape_interval: "10s",
					metrics_path: "/api/metrics/agents",
					static_configs: [
						{
							targets: ["localhost:3000"],
							labels: {
								component: "ai-agents",
								tier: "application",
							},
						},
					],
				},
			],
			alerting: {
				alertmanagers: [
					{
						static_configs: [
							{
								targets: ["localhost:9093"],
							},
						],
					},
				],
			},
		};
	}

	static createProductionConfig(): PrometheusServerConfig {
		return {
			global: {
				scrape_interval: "30s",
				evaluation_interval: "30s",
				external_labels: {
					monitor: "terragon-prod",
					environment: "production",
					cluster: "main",
				},
			},
			rule_files: ["/etc/prometheus/rules/*.yml", "/etc/prometheus/alerts/*.yml"],
			scrape_configs: [
				{
					job_name: "prometheus",
					static_configs: [
						{
							targets: ["prometheus:9090"],
						},
					],
				},
				{
					job_name: "node-exporter",
					static_configs: [
						{
							targets: ["node-exporter:9100"],
						},
					],
				},
				{
					job_name: "terragon-app",
					scrape_interval: "15s",
					metrics_path: "/api/metrics",
					kubernetes_sd_configs: [
						{
							role: "pod",
							namespaces: {
								names: ["terragon-prod"],
							},
						},
					],
					relabel_configs: [
						{
							source_labels: ["__meta_kubernetes_pod_label_app"],
							action: "keep",
							regex: "terragon-web",
						},
						{
							source_labels: ["__meta_kubernetes_pod_annotation_prometheus_io_scrape"],
							action: "keep",
							regex: "true",
						},
						{
							source_labels: ["__meta_kubernetes_pod_annotation_prometheus_io_path"],
							action: "replace",
							target_label: "__metrics_path__",
							regex: "(.+)",
						},
					],
				},
				{
					job_name: "ai-agents",
					scrape_interval: "10s",
					metrics_path: "/api/metrics/agents",
					kubernetes_sd_configs: [
						{
							role: "service",
							namespaces: {
								names: ["terragon-prod"],
							},
						},
					],
					relabel_configs: [
						{
							source_labels: ["__meta_kubernetes_service_label_component"],
							action: "keep",
							regex: "ai-agents",
						},
					],
				},
				{
					job_name: "database-exporter",
					static_configs: [
						{
							targets: ["postgres-exporter:9187"],
							labels: {
								database: "main",
								component: "database",
							},
						},
					],
				},
				{
					job_name: "redis-exporter",
					static_configs: [
						{
							targets: ["redis-exporter:9121"],
							labels: {
								cache: "main",
								component: "cache",
							},
						},
					],
				},
			],
			alerting: {
				alertmanagers: [
					{
						static_configs: [
							{
								targets: ["alertmanager:9093"],
							},
						],
						scheme: "http",
						timeout: "10s",
						api_version: "v2",
					},
				],
			},
			remote_write: [
				{
					url: "https://prometheus-remote-write.example.com/api/v1/write",
					remote_timeout: "30s",
					headers: {
						"X-Prometheus-Remote-Write-Version": "0.1.0",
					},
					send_exemplars: true,
				},
			],
		};
	}

	static createDockerComposeConfig(): PrometheusServerConfig {
		return {
			global: {
				scrape_interval: "15s",
				evaluation_interval: "15s",
				external_labels: {
					monitor: "terragon-docker",
					environment: "docker",
				},
			},
			rule_files: ["/etc/prometheus/rules/*.yml"],
			scrape_configs: [
				{
					job_name: "prometheus",
					static_configs: [
						{
							targets: ["localhost:9090"],
						},
					],
				},
				{
					job_name: "terragon-app",
					scrape_interval: "10s",
					metrics_path: "/api/metrics",
					static_configs: [
						{
							targets: ["terragon-web:3000"],
							labels: {
								service: "terragon-web",
								environment: "docker",
							},
						},
					],
				},
				{
					job_name: "node-exporter",
					static_configs: [
						{
							targets: ["node-exporter:9100"],
						},
					],
				},
				{
					job_name: "postgres-exporter",
					static_configs: [
						{
							targets: ["postgres-exporter:9187"],
						},
					],
				},
				{
					job_name: "grafana",
					static_configs: [
						{
							targets: ["grafana:3000"],
							labels: {
								service: "grafana",
							},
						},
					],
				},
			],
			alerting: {
				alertmanagers: [
					{
						static_configs: [
							{
								targets: ["alertmanager:9093"],
							},
						],
					},
				],
			},
		};
	}

	/**
	 * Generate YAML configuration string
	 */
	static generateYAML(config: PrometheusServerConfig): string {
		// Simple YAML generation - in production, use a proper YAML library
		const yaml = {
			global: config.global,
			rule_files: config.rule_files,
			scrape_configs: config.scrape_configs,
			...(config.alerting && { alerting: config.alerting }),
			...(config.remote_write && { remote_write: config.remote_write }),
		};

		return JSON.stringify(yaml, null, 2)
			.replace(/"/g, "")
			.replace(/,/g, "")
			.replace(/\[/g, "\n  - ")
			.replace(/\]/g, "")
			.replace(/\{/g, "")
			.replace(/\}/g, "");
	}

	/**
	 * Validate configuration
	 */
	static validateConfig(config: PrometheusServerConfig): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		// Validate global config
		if (!config.global.scrape_interval) {
			errors.push("Global scrape_interval is required");
		}

		if (!config.global.evaluation_interval) {
			errors.push("Global evaluation_interval is required");
		}

		// Validate scrape configs
		if (!config.scrape_configs || config.scrape_configs.length === 0) {
			errors.push("At least one scrape_config is required");
		}

		config.scrape_configs?.forEach((scrapeConfig, index) => {
			if (!scrapeConfig.job_name) {
				errors.push(`Scrape config ${index}: job_name is required`);
			}

			if (
				!scrapeConfig.static_configs &&
				!scrapeConfig.kubernetes_sd_configs &&
				!scrapeConfig.file_sd_configs
			) {
				errors.push(`Scrape config ${index}: at least one service discovery method is required`);
			}
		});

		return {
			valid: errors.length === 0,
			errors,
		};
	}
}
