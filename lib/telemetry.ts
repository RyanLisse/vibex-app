import type { TelemetryBackend, TelemetryConfig } from "../src/types/telemetry";

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

export function getTelemetryConfig(): TelemetryConfig {
	const isEnabled = process.env.OTEL_ENABLED === "true";
	if (!isEnabled) return { isEnabled: false };

	return {
		isEnabled: true,
		endpoint:
			process.env.OTEL_EXPORTER_OTLP_ENDPOINT || getDefaultEndpoint("otlp"),
		serviceName: process.env.OTEL_SERVICE_NAME || "vibex",
		serviceVersion: process.env.OTEL_SERVICE_VERSION || "1.0.0",
		samplingRatio: parseFloat(process.env.OTEL_SAMPLING_RATIO || "1.0"),
		headers: process.env.OTEL_AUTH_HEADER
			? { Authorization: process.env.OTEL_AUTH_HEADER }
			: undefined,
	};
}

export function validateTelemetryConfig(config: TelemetryConfig) {
	const errors: string[] = [];
	if (!config.isEnabled) return { valid: true, errors, warnings: [] };

	if (!config.endpoint)
		errors.push("endpoint is required when telemetry is enabled");
	if (
		config.samplingRatio &&
		(config.samplingRatio < 0 || config.samplingRatio > 1)
	) {
		errors.push("samplingRatio must be between 0.0 and 1.0");
	}

	return { valid: errors.length === 0, errors, warnings: [] };
}

export function logTelemetryConfig(config: TelemetryConfig): void {
	if (process.env.NODE_ENV === "development") {
		console.log("Telemetry:", config.isEnabled ? "enabled" : "disabled");
	}
}
