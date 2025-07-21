/**
 * OpenTelemetry Integration
 *
 * Integrates the monitoring system with existing OpenTelemetry infrastructure
 */
import { SpanStatusCode, type Tracer, trace } from "@opentelemetry/api";
import { SEMRESATTRS_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { notificationManager } from "./notifications";
import {
	metrics as prometheusMetrics,
	recordAgentExecution,
	recordDatabaseQuery,
	recordHttpRequest,
} from "./prometheus";
import {
	dbObservabilityMetrics,
	otelMetrics as otelExportMetrics,
} from "./prometheus/custom-metrics";

// Custom span processor for monitoring integration
class MonitoringSpanProcessor extends BatchSpanProcessor {
	onEnd(span: any): void {
		super.onEnd(span);

		// Extract span details
		const spanContext = span.spanContext();
		const attributes = span.attributes || {};
		const duration =
			(span.endTime[0] - span.startTime[0]) * 1000 +
			(span.endTime[1] - span.startTime[1]) / 1e6;

		// Record metrics based on span type
		if (attributes["http.method"]) {
			// HTTP span
			recordHttpRequest(
				attributes["http.method"] as string,
				(attributes["http.route"] as string) ||
					(attributes["http.target"] as string) ||
					"unknown",
				(attributes["http.status_code"] as number) || 0,
				duration,
			);
		} else if (attributes["db.operation"]) {
			// Database span
			recordDatabaseQuery(
				attributes["db.operation"] as string,
				(attributes["db.sql.table"] as string) || "unknown",
				span.status.code === SpanStatusCode.OK,
				duration,
			);
		} else if (attributes["agent.type"]) {
			// Agent execution span
			recordAgentExecution(
				attributes["agent.type"] as string,
				span.status.code === SpanStatusCode.OK ? "success" : "failure",
				duration,
				attributes["agent.token_usage"] as number,
			);
		}

		// Record OpenTelemetry export metrics
		otelExportMetrics.spansExported.inc({
			exporter: "monitoring-integration",
			status: "success",
		});

		// Check for errors and create alerts
		if (span.status.code === SpanStatusCode.ERROR) {
			this.handleSpanError(span, attributes);
		}
	}

	private handleSpanError(span: any, attributes: any): void {
		const errorMessage = span.status.message || "Unknown error";
		const component = attributes["component"] || "unknown";

		// Record error metric
		prometheusMetrics.errorsTotal.inc({
			type: "span_error",
			severity: "medium",
			component,
		});

		// Check if we should create an alert
		if (attributes["alert.create"] === true) {
			alertManager.addCustomRule({
				name: `SpanError_${component}_${Date.now()}`,
				expression: `errors_total{component="${component}"} > 0`,
				for: "1m",
				severity: attributes["alert.severity"] || "medium",
				labels: {
					category: "tracing",
					component,
				},
				annotations: {
					summary: `Error in ${component}`,
					description: errorMessage,
				},
			});
		}
	}
}

// Custom metric exporter for Prometheus integration
class PrometheusMetricExporter extends ConsoleMetricExporter {
	export(
		metrics: {
			resourceMetrics: Array<{
				scopeMetrics: Array<{
					metrics: Array<{
						name: string;
						description?: string;
						unit?: string;
						data?: unknown;
					}>;
				}>;
			}>;
		},
		resultCallback: (result: { code: number; error?: Error }) => void,
	): void {
		// Process metrics and update Prometheus
		for (const metric of metrics.resourceMetrics) {
			for (const scopeMetric of metric.scopeMetrics) {
				for (const metricData of scopeMetric.metrics) {
					this.processMetric(metricData);
				}
			}
		}

		// Record export metrics
		otelExportMetrics.metricsExported.inc(
			{
				exporter: "prometheus-integration",
				status: "success",
			},
			metrics.resourceMetrics.length,
		);

		resultCallback({ code: 0 });
	}

	private processMetric(metricData: any): void {
		const name = metricData.descriptor.name;
		const dataPoints = metricData.dataPoints || [];

		for (const point of dataPoints) {
			const value = point.value;
			const labels = point.attributes || {};

			// Map to Prometheus metrics based on name
			switch (name) {
				case "http.server.duration":
					prometheusMetrics.httpRequestDuration.observe(
						labels,
						value / 1000, // Convert to seconds
					);
					break;

				case "db.client.connections.usage":
					prometheusMetrics.dbConnectionPoolSize.set(
						{ state: labels.state || "unknown" },
						value,
					);
					break;

				case "process.runtime.memory":
					prometheusMetrics.memoryUsageBytes.set(
						{ type: labels.type || "unknown" },
						value,
					);
					break;

				// Add more metric mappings as needed
			}
		}
	}
}

// Initialize OpenTelemetry with monitoring integration
export async function initializeOpenTelemetryIntegration(): Promise<void> {
	const telemetryConfig = getTelemetryConfig();

	if (!telemetryConfig.isEnabled) {
		console.log("📡 OpenTelemetry integration disabled");
		return;
	}

	// Create resource
	const resource = Resource.default().merge(
		new Resource({
			[SEMRESATTRS_SERVICE_NAME]: telemetryConfig.serviceName || "codex-clone",
			[SEMRESATTRS_SERVICE_VERSION]: telemetryConfig.serviceVersion || "1.0.0",
			"deployment.environment": process.env.NODE_ENV || "development",
		}),
	);

	// Initialize tracer provider
	const provider = new NodeTracerProvider({
		resource,
		sampler: {
			shouldSample: () => ({
				decision: Math.random() < (telemetryConfig.samplingRatio || 1) ? 1 : 0,
				attributes: {},
			}),
			toString: () => "ProbabilitySampler",
		},
	});

	// Add Jaeger exporter if configured
	if (telemetryConfig.endpoint) {
		const jaegerExporter = new JaegerExporter({
			endpoint: telemetryConfig.endpoint,
			headers: telemetryConfig.headers,
		});

		// Use custom span processor
		provider.addSpanProcessor(new MonitoringSpanProcessor(jaegerExporter));
	}

	// Register provider
	provider.register();

	// Initialize metrics
	const metricReader = new PeriodicExportingMetricReader({
		exporter: new PrometheusMetricExporter(),
		exportIntervalMillis: 10_000, // 10 seconds
	});

	// Register instrumentations
	registerInstrumentations({
		instrumentations: [
			new HttpInstrumentation({
				requestHook: (span, request) => {
					span.setAttribute("custom.monitoring", true);
				},
				responseHook: (span, response) => {
					const statusCode = response.statusCode || 0;
					if (statusCode >= 400) {
						span.setAttribute("alert.create", true);
						span.setAttribute(
							"alert.severity",
							statusCode >= 500 ? "high" : "medium",
						);
					}
				},
			}),
			new ExpressInstrumentation(),
		],
	});

	console.log("📡 OpenTelemetry integration initialized with monitoring");
}

// Monitoring-aware tracer
export class MonitoringTracer {
	private tracer: Tracer;

	constructor(name: string) {
		this.tracer = trace.getTracer(name);
	}

	startSpan(name: string, options?: any): Span {
		const span = this.tracer.startSpan(name, options);

		// Add monitoring attributes
		span.setAttribute("monitoring.enabled", true);
		span.setAttribute("monitoring.timestamp", Date.now());

		return span;
	}

	async withSpan<T>(
		name: string,
		fn: (span: Span) => Promise<T>,
		options?: any,
	): Promise<T> {
		const span = this.startSpan(name, options);

		try {
			const result = await context.with(
				trace.setSpan(context.active(), span),
				() => fn(span),
			);

			span.setStatus({ code: SpanStatusCode.OK });
			return result;
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: (error as Error).message,
			});

			// Send notification for critical errors
			if (options?.critical) {
				await notificationManager.sendNotification({
					title: `Critical Error: ${name}`,
					message: (error as Error).message,
					severity: "critical",
					data: {
						spanId: span.spanContext().spanId,
						traceId: span.spanContext().traceId,
						error: (error as Error).stack,
					},
				});
			}

			throw error;
		} finally {
			span.end();
		}
	}
}

// Database operation tracing with metrics
export async function traceDbOperation<T>(
	operation: string,
	table: string,
	fn: () => Promise<T>,
): Promise<T> {
	const tracer = new MonitoringTracer("db-operations");

	return tracer.withSpan(
		`db.${operation}`,
		async (span) => {
			span.setAttributes({
				"db.operation": operation,
				"db.sql.table": table,
				"db.system": "postgresql",
			});

			const start = Date.now();
			try {
				const result = await fn();
				const duration = Date.now() - start;

				// Record custom metrics
				dbObservabilityMetrics.syncOperationsTotal.inc({
					operation_type: operation,
					source: "application",
					destination: "database",
					status: "success",
				});

				return result;
			} catch (error) {
				const duration = Date.now() - start;

				dbObservabilityMetrics.syncOperationsTotal.inc({
					operation_type: operation,
					source: "application",
					destination: "database",
					status: "failure",
				});

				throw error;
			}
		},
		{ kind: SpanKind.CLIENT },
	);
}

// Agent execution tracing with metrics
export async function traceAgentExecution<T>(
	agentType: string,
	operation: string,
	fn: () => Promise<T>,
	metadata?: any,
): Promise<T> {
	const tracer = new MonitoringTracer("agent-executions");

	return tracer.withSpan(
		`agent.${agentType}.${operation}`,
		async (span) => {
			span.setAttributes({
				"agent.type": agentType,
				"agent.operation": operation,
				...metadata,
			});

			const start = Date.now();
			try {
				const result = await fn();
				const duration = Date.now() - start;

				// Record execution metrics
				recordAgentExecution(
					agentType,
					"success",
					duration,
					metadata?.tokenUsage,
				);

				return result;
			} catch (error) {
				const duration = Date.now() - start;

				recordAgentExecution(
					agentType,
					"failure",
					duration,
					metadata?.tokenUsage,
				);

				// Create alert for repeated failures
				span.setAttribute("alert.create", true);
				span.setAttribute("alert.severity", "high");

				throw error;
			}
		},
		{
			kind: SpanKind.INTERNAL,
			critical: metadata?.critical,
		},
	);
}

// Export utilities
export { trace, type context, type SpanKind, SpanStatusCode };
export const getTracer = (name: string) => new MonitoringTracer(name);
