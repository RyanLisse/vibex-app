import type { TelemetryBackend, TelemetryConfig } from "../src/types/telemetry";
import { logger } from "./logging";

export function getDefaultEndpoint(backend: TelemetryBackend): string {
	const endpoints = {
		jaeger: "http://localhost:14268/api/traces",
		zipkin: "http://localhost:9411/api/v2/spans",
		datadog: "https://trace.agent.datadoghq.com/v0.4/traces",
		newrelic: "https://otlp.nr-data.net/v1/traces",
		honeycomb: "https://api.honeycomb.io/v1/traces",
		tempo: "http://localhost:3200/v1/traces",
		otlp: "http://localhost:4318/v1/traces",
	};
	return endpoints[backend];
}

export function getDefaultMetricsEndpoint(backend: TelemetryBackend): string {
	const endpoints = {
		jaeger: "http://localhost:14269/api/metrics",
		zipkin: "http://localhost:9411/api/v2/metrics",
		datadog: "https://api.datadoghq.com/api/v2/metrics",
		newrelic: "https://otlp.nr-data.net/v1/metrics",
		honeycomb: "https://api.honeycomb.io/v1/metrics",
		tempo: "http://localhost:3200/v1/metrics",
		otlp: "http://localhost:4318/v1/metrics",
	};
	return endpoints[backend];
}

export function getTelemetryConfig(): TelemetryConfig {
	const isEnabled = process.env.OTEL_ENABLED === "true";
	if (!isEnabled) return { isEnabled: false };

	return {
		isEnabled: true,
		endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || getDefaultEndpoint("otlp"),
		metricsEndpoint:
			process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || getDefaultMetricsEndpoint("otlp"),
		serviceName: process.env.OTEL_SERVICE_NAME || "vibex",
		serviceVersion: process.env.OTEL_SERVICE_VERSION || "1.0.0",
		samplingRatio: Number.parseFloat(process.env.OTEL_SAMPLING_RATIO || "1.0"),
		headers: process.env.OTEL_AUTH_HEADER
			? { Authorization: process.env.OTEL_AUTH_HEADER }
			: undefined,
		// Enhanced agent execution tracking configuration
		agentTracking: {
			enabled: process.env.OTEL_AGENT_TRACKING_ENABLED !== "false",
			includeInputOutput: process.env.OTEL_AGENT_INCLUDE_IO === "true",
			maxPayloadSize: Number.parseInt(process.env.OTEL_AGENT_MAX_PAYLOAD_SIZE || "10240"),
			trackMemoryUsage: process.env.OTEL_AGENT_TRACK_MEMORY === "true",
			trackPerformanceMetrics: process.env.OTEL_AGENT_TRACK_PERFORMANCE !== "false",
		},
		// Real-time streaming configuration
		streaming: {
			enabled: process.env.OTEL_STREAMING_ENABLED !== "false",
			bufferSize: Number.parseInt(process.env.OTEL_STREAMING_BUFFER_SIZE || "1000"),
			flushInterval: Number.parseInt(process.env.OTEL_STREAMING_FLUSH_INTERVAL || "5000"),
			maxSubscriptions: Number.parseInt(process.env.OTEL_STREAMING_MAX_SUBSCRIPTIONS || "100"),
		},
		// Performance metrics configuration
		metrics: {
			enabled: process.env.OTEL_METRICS_ENABLED !== "false",
			collectInterval: Number.parseInt(process.env.OTEL_METRICS_COLLECT_INTERVAL || "10000"),
			retentionPeriod: Number.parseInt(process.env.OTEL_METRICS_RETENTION_HOURS || "24") * 3600000,
			aggregationWindow: Number.parseInt(process.env.OTEL_METRICS_AGGREGATION_WINDOW || "60000"),
		},
	};
}

export function validateTelemetryConfig(config: TelemetryConfig) {
	const errors: string[] = [];
	if (!config.isEnabled) return { valid: true, errors, warnings: [] };

	if (!config.endpoint) errors.push("endpoint is required when telemetry is enabled");
	if (config.samplingRatio && (config.samplingRatio < 0 || config.samplingRatio > 1)) {
		errors.push("samplingRatio must be between 0.0 and 1.0");
	}

	return { valid: errors.length === 0, errors, warnings: [] };
}

export function logTelemetryConfig(config: TelemetryConfig): void {
	if (process.env.NODE_ENV === "development") {
		logger.info("Telemetry configuration", {
			enabled: config.isEnabled,
			endpoint: config.endpoint,
			serviceName: config.serviceName,
		});
	}
}
