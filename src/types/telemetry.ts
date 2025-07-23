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
	 * OTLP metrics export endpoint URL
	 * @example "https://otel-collector.example.com/v1/metrics"
	 */
	metricsEndpoint?: string;

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

	/**
	 * Enhanced agent execution tracking configuration
	 */
	agentTracking?: {
		enabled: boolean;
		includeInputOutput: boolean;
		maxPayloadSize: number;
		trackMemoryUsage: boolean;
		trackPerformanceMetrics: boolean;
	};

	/**
	 * Real-time streaming configuration
	 */
	streaming?: {
		enabled: boolean;
		bufferSize: number;
		flushInterval: number;
		maxSubscriptions: number;
	};

	/**
	 * Performance metrics configuration
	 */
	metrics?: {
		enabled: boolean;
		collectInterval: number;
		retentionPeriod: number;
		aggregationWindow: number;
	};
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
	backend: TelemetryBackend;
	config: TelemetryConfig;
}
