/**
 * OpenTelemetry Integration for Enhanced Observability
 *
 * Configures and initializes OpenTelemetry with comprehensive instrumentation
 * for agent executions, database operations, and performance monitoring.
 */

import { metrics, trace } from "@opentelemetry/api";
import {
	getNodeAutoInstrumentations,
	NodeSDK,
} from "@opentelemetry/auto-instrumentations-node";
import {
	OTLPMetricsExporter,
	OTLPTraceExporter,
} from "@opentelemetry/exporter-otlp-http";
// Custom instrumentation for database operations
import {
	type Instrumentation,
	InstrumentationBase,
} from "@opentelemetry/instrumentation";
import { Resource } from "@opentelemetry/resources";
import {
	MeterProvider,
	PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { NodeTracerProvider } from "@opentelemetry/sdk-node";
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-node";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { getTelemetryConfig } from "@/lib/telemetry";

/**
 * Custom instrumentation for Drizzle ORM database operations
 */
class DrizzleInstrumentation extends InstrumentationBase {
	constructor() {
		super("@vibex/drizzle-instrumentation", "1.0.0");
	}

	protected init() {
		// This would be implemented to instrument Drizzle ORM operations
		// For now, we'll rely on the existing observability service
		return [];
	}
}

/**
 * Custom instrumentation for agent executions
 */
class AgentExecutionInstrumentation extends InstrumentationBase {
	constructor() {
		super("@vibex/agent-execution-instrumentation", "1.0.0");
	}

	protected init() {
		// This would be implemented to automatically instrument agent executions
		// For now, we'll rely on manual instrumentation in the enhanced observability service
		return [];
	}
}

/**
 * OpenTelemetry configuration and initialization
 */
export class OpenTelemetryIntegration {
	private static instance: OpenTelemetryIntegration;
	private sdk: NodeSDK | null = null;
	private tracerProvider: NodeTracerProvider | null = null;
	private meterProvider: MeterProvider | null = null;
	private config = getTelemetryConfig();

	private constructor() {}

	static getInstance(): OpenTelemetryIntegration {
		if (!OpenTelemetryIntegration.instance) {
			OpenTelemetryIntegration.instance = new OpenTelemetryIntegration();
		}
		return OpenTelemetryIntegration.instance;
	}

	/**
	 * Initialize OpenTelemetry with enhanced configuration
	 */
	async initialize(): Promise<void> {
		if (!this.config.isEnabled) {
			console.log("OpenTelemetry is disabled");
			return;
		}

		try {
			// Create resource with service information
			const resource = new Resource({
				[SemanticResourceAttributes.SERVICE_NAME]:
					this.config.serviceName || "vibex",
				[SemanticResourceAttributes.SERVICE_VERSION]:
					this.config.serviceVersion || "1.0.0",
				[SemanticResourceAttributes.SERVICE_NAMESPACE]: "vibex",
				[SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
					process.env.NODE_ENV || "development",
			});

			// Initialize tracing
			await this.initializeTracing(resource);

			// Initialize metrics
			await this.initializeMetrics(resource);

			// Initialize SDK with auto-instrumentations
			await this.initializeSDK(resource);

			console.log("OpenTelemetry initialized successfully");
		} catch (error) {
			console.error("Failed to initialize OpenTelemetry:", error);
			throw error;
		}
	}

	/**
	 * Initialize tracing with OTLP exporter
	 */
	private async initializeTracing(resource: Resource): Promise<void> {
		// Create tracer provider
		this.tracerProvider = new NodeTracerProvider({
			resource,
			sampler: this.createSampler(),
		});

		// Create exporters
		const exporters = [];

		// OTLP exporter for production
		if (this.config.endpoint) {
			const otlpExporter = new OTLPTraceExporter({
				url: this.config.endpoint,
				headers: this.config.headers || {},
			});
			exporters.push(new BatchSpanProcessor(otlpExporter));
		}

		// Console exporter for development
		if (process.env.NODE_ENV === "development") {
			exporters.push(new BatchSpanProcessor(new ConsoleSpanExporter()));
		}

		// Add span processors
		exporters.forEach((processor) => {
			this.tracerProvider!.addSpanProcessor(processor);
		});

		// Register tracer provider
		this.tracerProvider.register();
		trace.setGlobalTracerProvider(this.tracerProvider);
	}

	/**
	 * Initialize metrics with OTLP exporter
	 */
	private async initializeMetrics(resource: Resource): Promise<void> {
		if (!this.config.metrics?.enabled) {
			return;
		}

		const readers = [];

		// OTLP metrics exporter
		if (this.config.metricsEndpoint) {
			const otlpMetricsExporter = new OTLPMetricsExporter({
				url: this.config.metricsEndpoint,
				headers: this.config.headers || {},
			});

			readers.push(
				new PeriodicExportingMetricReader({
					exporter: otlpMetricsExporter,
					exportIntervalMillis: this.config.metrics.collectInterval || 10000,
				}),
			);
		}

		// Create meter provider
		this.meterProvider = new MeterProvider({
			resource,
			readers,
		});

		// Register meter provider
		metrics.setGlobalMeterProvider(this.meterProvider);
	}

	/**
	 * Initialize SDK with auto-instrumentations
	 */
	private async initializeSDK(resource: Resource): Promise<void> {
		const instrumentations: Instrumentation[] = [
			// Auto-instrumentations for common libraries
			...getNodeAutoInstrumentations({
				// Disable some instrumentations that might be noisy
				"@opentelemetry/instrumentation-fs": {
					enabled: false,
				},
				// Configure HTTP instrumentation
				"@opentelemetry/instrumentation-http": {
					enabled: true,
					requestHook: (span, request) => {
						span.setAttributes({
							"http.request.size": request.headers["content-length"] || 0,
						});
					},
					responseHook: (span, response) => {
						span.setAttributes({
							"http.response.size": response.headers["content-length"] || 0,
						});
					},
				},
				// Configure Express instrumentation
				"@opentelemetry/instrumentation-express": {
					enabled: true,
				},
				// Configure database instrumentations
				"@opentelemetry/instrumentation-pg": {
					enabled: true,
				},
				"@opentelemetry/instrumentation-redis": {
					enabled: true,
				},
			}),
			// Custom instrumentations
			new DrizzleInstrumentation(),
			new AgentExecutionInstrumentation(),
		];

		// Create and start SDK
		this.sdk = new NodeSDK({
			resource,
			instrumentations,
		});

		await this.sdk.start();
	}

	/**
	 * Create sampler based on configuration
	 */
	private createSampler() {
		const {
			TraceIdRatioBasedSampler,
			AlwaysOnSampler,
			AlwaysOffSampler,
		} = require("@opentelemetry/sdk-trace-base");

		const samplingRatio = this.config.samplingRatio || 1.0;

		if (samplingRatio <= 0) {
			return new AlwaysOffSampler();
		} else if (samplingRatio >= 1.0) {
			return new AlwaysOnSampler();
		} else {
			return new TraceIdRatioBasedSampler(samplingRatio);
		}
	}

	/**
	 * Create a custom meter for application metrics
	 */
	createMeter(name: string, version?: string) {
		return metrics.getMeter(name, version);
	}

	/**
	 * Create a custom tracer for application tracing
	 */
	createTracer(name: string, version?: string) {
		return trace.getTracer(name, version);
	}

	/**
	 * Get current configuration
	 */
	getConfig() {
		return this.config;
	}

	/**
	 * Shutdown OpenTelemetry
	 */
	async shutdown(): Promise<void> {
		try {
			if (this.sdk) {
				await this.sdk.shutdown();
			}
			if (this.tracerProvider) {
				await this.tracerProvider.shutdown();
			}
			if (this.meterProvider) {
				await this.meterProvider.shutdown();
			}
			console.log("OpenTelemetry shutdown successfully");
		} catch (error) {
			console.error("Error shutting down OpenTelemetry:", error);
		}
	}
}

// Export singleton instance
export const openTelemetryIntegration = OpenTelemetryIntegration.getInstance();

// Convenience functions
export const telemetry = {
	/**
	 * Initialize OpenTelemetry
	 */
	async initialize() {
		return openTelemetryIntegration.initialize();
	},

	/**
	 * Create a custom meter
	 */
	createMeter(name: string, version?: string) {
		return openTelemetryIntegration.createMeter(name, version);
	},

	/**
	 * Create a custom tracer
	 */
	createTracer(name: string, version?: string) {
		return openTelemetryIntegration.createTracer(name, version);
	},

	/**
	 * Get current configuration
	 */
	getConfig() {
		return openTelemetryIntegration.getConfig();
	},

	/**
	 * Shutdown OpenTelemetry
	 */
	async shutdown() {
		return openTelemetryIntegration.shutdown();
	},
};

// Auto-initialize if enabled
if (getTelemetryConfig().isEnabled) {
	// Initialize in next tick to allow other modules to load
	process.nextTick(() => {
		openTelemetryIntegration.initialize().catch(console.error);
	});
}
