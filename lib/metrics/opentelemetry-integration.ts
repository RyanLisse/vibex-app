/**
 * OpenTelemetry Integration for Prometheus Metrics
 * Bridges OpenTelemetry metrics with Prometheus collection
 */

import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { metrics } from "@opentelemetry/api";
import { PrometheusMetricsCollector } from "./prometheus-client";

export interface OpenTelemetryConfig {
	serviceName: string;
	serviceVersion: string;
	environment: string;
	prometheusPort?: number;
	prometheusEndpoint?: string;
	jaegerEndpoint?: string;
	enableAutoInstrumentation?: boolean;
	enableConsoleExporter?: boolean;
	metricExportIntervalMillis?: number;
	traceExportTimeoutMillis?: number;
}

export class OpenTelemetryPrometheusIntegration {
	private static instance: OpenTelemetryPrometheusIntegration;
	private prometheusExporter?: PrometheusExporter;
	private meterProvider?: MeterProvider;
	private config: OpenTelemetryConfig;
	private prometheusCollector: PrometheusMetricsCollector;

	private constructor(config: OpenTelemetryConfig) {
		this.config = config;
		this.prometheusCollector = PrometheusMetricsCollector.getInstance();
	}

	static getInstance(config?: OpenTelemetryConfig): OpenTelemetryPrometheusIntegration {
		if (!OpenTelemetryPrometheusIntegration.instance) {
			if (!config) {
				throw new Error(
					"OpenTelemetryPrometheusIntegration config required for first initialization"
				);
			}
			OpenTelemetryPrometheusIntegration.instance = new OpenTelemetryPrometheusIntegration(config);
		}
		return OpenTelemetryPrometheusIntegration.instance;
	}

	/**
	 * Initialize OpenTelemetry with Prometheus integration
	 */
	async initialize(): Promise<void> {
		const resource = Resource.default().merge(
			new Resource({
				[SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
				[SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
				[SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
			})
		);

		// Configure Prometheus exporter
		this.prometheusExporter = new PrometheusExporter({
			port: this.config.prometheusPort || 9090,
			endpoint: this.config.prometheusEndpoint || "/metrics",
		});

		// Configure meter provider
		this.meterProvider = new MeterProvider({
			resource,
			readers: [this.prometheusExporter],
		});

		// Set global meter provider
		metrics.setGlobalMeterProvider(this.meterProvider);

		console.log("OpenTelemetry initialized with Prometheus integration");
	}

	/**
	 * Bridge OpenTelemetry metrics to Prometheus collector
	 */
	bridgeToPrometheus() {
		const meter = metrics.getMeter(this.config.serviceName, this.config.serviceVersion);

		// AI Agent metrics
		const agentOperationsCounter = meter.createCounter("agent_operations_otel", {
			description: "Total number of AI agent operations (OpenTelemetry)",
		});

		const agentExecutionHistogram = meter.createHistogram("agent_execution_duration_otel", {
			description: "Duration of AI agent executions (OpenTelemetry)",
			unit: "seconds",
		});

		const tokenUsageCounter = meter.createCounter("token_usage_otel", {
			description: "Total token usage by AI agents (OpenTelemetry)",
		});

		return {
			recordAgentOperation: (
				agentId: string,
				agentType: string,
				operation: string,
				provider: string,
				status: "success" | "error" | "timeout"
			) => {
				// Record in OpenTelemetry
				agentOperationsCounter.add(1, {
					agent_id: agentId,
					agent_type: agentType,
					operation,
					provider,
					status,
				});

				// Record in Prometheus
				this.prometheusCollector.recordAgentOperation(
					agentId,
					agentType,
					operation,
					provider,
					status
				);
			},

			recordAgentExecution: (
				agentId: string,
				agentType: string,
				taskType: string,
				provider: string,
				duration: number
			) => {
				// Record in OpenTelemetry
				agentExecutionHistogram.record(duration, {
					agent_id: agentId,
					agent_type: agentType,
					task_type: taskType,
					provider,
				});

				// Record in Prometheus
				this.prometheusCollector.recordAgentExecution(
					agentId,
					agentType,
					taskType,
					provider,
					duration
				);
			},

			recordTokenUsage: (
				agentId: string,
				agentType: string,
				provider: string,
				tokenType: "input" | "output" | "total",
				count: number
			) => {
				// Record in OpenTelemetry
				tokenUsageCounter.add(count, {
					agent_id: agentId,
					agent_type: agentType,
					provider,
					token_type: tokenType,
				});

				// Record in Prometheus
				this.prometheusCollector.recordTokenUsage(agentId, agentType, provider, tokenType, count);
			},
		};
	}

	/**
	 * Get metrics endpoint for health checks
	 */
	async getMetricsEndpoint(): Promise<string> {
		return this.prometheusCollector.getMetrics();
	}

	/**
	 * Shutdown OpenTelemetry
	 */
	async shutdown(): Promise<void> {
		if (this.meterProvider) {
			await this.meterProvider.shutdown();
			console.log("OpenTelemetry shut down successfully");
		}
	}
}

// Default configuration factory
export function createDefaultOpenTelemetryConfig(): OpenTelemetryConfig {
	return {
		serviceName: process.env.OTEL_SERVICE_NAME || "terragon-web",
		serviceVersion: process.env.OTEL_SERVICE_VERSION || "1.0.0",
		environment: process.env.NODE_ENV || "development",
		prometheusPort: parseInt(process.env.PROMETHEUS_PORT || "9090", 10),
		prometheusEndpoint: process.env.PROMETHEUS_ENDPOINT || "/metrics",
		jaegerEndpoint: process.env.JAEGER_ENDPOINT,
		enableAutoInstrumentation: process.env.OTEL_AUTO_INSTRUMENTATION === "true",
		enableConsoleExporter: process.env.NODE_ENV === "development",
		metricExportIntervalMillis: parseInt(process.env.OTEL_METRIC_EXPORT_INTERVAL || "30000", 10),
		traceExportTimeoutMillis: parseInt(process.env.OTEL_TRACE_EXPORT_TIMEOUT || "30000", 10),
	};
}
