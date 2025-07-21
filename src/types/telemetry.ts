export interface TelemetryConfig {
	/**
	 * Enable or disable telemetry
	 * @default false
	 */
	isEnabled: boolean;

	/**
	 * OTLP trace export endpoint URL
	 * @example "https://otel-collector.example.com/v1/traces"
	 */
	endpoint?: string;

	/**
	 * Service name for identification
	 * @default "vibex"
	 */
	serviceName?: string;

	/**
	 * Service version
	 * @default "1.0.0"
	 */
	serviceVersion?: string;

	/**
	 * Custom headers for telemetry export (e.g., authentication)
	 */
	headers?: Record<string, string>;

	/**
	 * Trace sampling ratio (0.0 to 1.0)
	 * @default 1.0
	 */
	samplingRatio?: number;
}

export type TelemetryBackend =
	| "jaeger"
	| "zipkin"
	| "datadog"
	| "newrelic"
	| "honeycomb"
	| "tempo"
	| "otlp";

export interface TelemetryEnvironmentConfig {