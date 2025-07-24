/**
 * Isolated Workflow Engine Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock all OpenTelemetry dependencies before any imports
vi.mock("@opentelemetry/api", () => ({
	context: {
		with: vi.fn((ctx, fn) => fn()),
		active: vi.fn(() => ({})),
	},
	SpanKind: { INTERNAL: 1 },
	SpanStatusCode: { OK: 1, ERROR: 2 },
	trace: {
		getTracer: vi.fn(() => ({
			startSpan: vi.fn(() => ({
				setStatus: vi.fn(),
				recordException: vi.fn(),
				end: vi.fn(),
				setAttributes: vi.fn(),
				addEvent: vi.fn(),
			})),
		})),
		setSpan: vi.fn(),
		getActiveSpan: vi.fn(() => null),
		setGlobalTracerProvider: vi.fn(),
	},
	metrics: {
		setGlobalMeterProvider: vi.fn(),
		getMeter: vi.fn(() => ({})),
	},
}));

vi.mock("@opentelemetry/resources", () => ({
	Resource: class MockResource {
		constructor() {}
	},
}));

vi.mock("@opentelemetry/sdk-trace-node", () => ({
	NodeTracerProvider: class MockNodeTracerProvider {
		constructor() {}
		addSpanProcessor() {}
		register() {}
		shutdown() {
			return Promise.resolve();
		}
	},
	BatchSpanProcessor: class MockBatchSpanProcessor {
		constructor() {}
	},
	ConsoleSpanExporter: class MockConsoleSpanExporter {
		constructor() {}
	},
}));

vi.mock("@opentelemetry/sdk-metrics", () => ({
	MeterProvider: class MockMeterProvider {
		constructor() {}
		shutdown() {
			return Promise.resolve();
		}
	},
	PeriodicExportingMetricReader: class MockPeriodicExportingMetricReader {
		constructor() {}
	},
}));

vi.mock("@opentelemetry/auto-instrumentations-node", () => ({
	getNodeAutoInstrumentations: vi.fn(() => []),
	NodeSDK: class MockNodeSDK {
		constructor() {}
		start() {
			return Promise.resolve();
		}
		shutdown() {
			return Promise.resolve();
		}
	},
}));

vi.mock("@opentelemetry/exporter-otlp-http", () => ({
	OTLPMetricsExporter: class MockOTLPMetricsExporter {
		constructor() {}
	},
	OTLPTraceExporter: class MockOTLPTraceExporter {
		constructor() {}
	},
}));

vi.mock("@opentelemetry/instrumentation", () => ({
	InstrumentationBase: class MockInstrumentationBase {
		constructor() {}
		protected init() {
			return [];
		}
	},
}));

vi.mock("@opentelemetry/semantic-conventions", () => ({
	SemanticResourceAttributes: {
		SERVICE_NAME: "service.name",
		SERVICE_VERSION: "service.version",
		SERVICE_NAMESPACE: "service.namespace",
		DEPLOYMENT_ENVIRONMENT: "deployment.environment",
	},
}));

// Mock telemetry config
vi.mock("@/lib/telemetry", () => ({
	getTelemetryConfig: vi.fn(() => ({
		isEnabled: false,
		serviceName: "test",
		serviceVersion: "1.0.0",
		endpoint: null,
		headers: {},
		samplingRatio: 1.0,
		metrics: { enabled: false },
	})),
}));

// Mock the observability module
vi.mock("@/lib/observability", () => ({
	observability: {
		trackOperation: vi.fn((name, fn) => fn()),
		recordEvent: vi.fn(),
		recordError: vi.fn(),
		clear: vi.fn(),
		getEvents: vi.fn(() => []),
		getErrors: vi.fn(() => []),
	},
}));

// Mock the database
vi.mock("@/db", () => ({
	db: {
		insert: vi.fn().mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([
					{
						id: "test-workflow-id",
						name: "Test Workflow",
						definition: {},
						version: 1,
						isActive: true,
						createdAt: new Date(),
					},
				]),
			}),
		}),
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue([
						{
							id: "test-workflow-id",
							name: "Test Workflow",
							definition: {
								id: "test-workflow-id",
								name: "Test Workflow",
								version: 1,
								steps: [],
							},
							version: 1,
							isActive: true,
							createdAt: new Date(),
						},
					]),
					orderBy: vi.fn().mockReturnValue({
						limit: vi.fn().mockReturnValue({
							offset: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
				orderBy: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue([]),
				}),
			}),
		}),
	},
}));

// Now import the workflow engine
import { type WorkflowDefinition, WorkflowEngine } from "./workflow-engine";

describe("WorkflowEngine - Isolated Tests", () => {
	let workflowEngine: WorkflowEngine;

	beforeEach(() => {
		workflowEngine = new WorkflowEngine();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Basic Functionality", () => {
		it("should create a workflow engine instance", () => {
			expect(workflowEngine).toBeDefined();
			expect(workflowEngine).toBeInstanceOf(WorkflowEngine);
		});

		it("should create a workflow", async () => {
			const definition = {
				name: "Test Workflow",
				description: "A test workflow",
				version: 1,
				steps: [
					{
						id: "step1",
						name: "Test Step",
						type: "action" as const,
						config: { type: "http_request", url: "https://example.com" },
					},
				],
			};

			const workflow = await workflowEngine.createWorkflow(definition);

			expect(workflow).toBeDefined();
			expect(workflow.id).toBe("test-workflow-id");
			expect(workflow.name).toBe("Test Workflow");
		});

		it("should register custom step executor", () => {
			const customExecutor = vi.fn().mockResolvedValue({ result: "custom" });

			workflowEngine.registerStepExecutor("custom", customExecutor);

			// Verify the executor was registered (internal state check)
			expect(workflowEngine["stepExecutors"].has("custom")).toBe(true);
		});

		it("should execute HTTP request step", async () => {
			const step = {
				id: "http-step",
				name: "HTTP Request",
				type: "action" as const,
				config: { type: "http_request", url: "https://example.com" },
			};

			const context = {
				executionId: "test-execution",
				workflowId: "test-workflow",
				definition: {} as WorkflowDefinition,
				state: {
					currentStep: 0,
					stepStates: {},
					variables: {},
					checkpoints: [],
				},
				triggeredBy: "test",
			};

			const result = await workflowEngine["executeActionStep"](step, context);

			expect(result).toBeDefined();
			expect(result).toEqual({
				status: "success",
				data: "HTTP request executed",
				config: step.config,
			});
		});

		it("should handle unknown action types", async () => {
			const step = {
				id: "unknown-step",
				name: "Unknown Step",
				type: "action" as const,
				config: { type: "unknown_action" },
			};

			const context = {
				executionId: "test-execution",
				workflowId: "test-workflow",
				definition: {} as WorkflowDefinition,
				state: {
					currentStep: 0,
					stepStates: {},
					variables: {},
					checkpoints: [],
				},
				triggeredBy: "test",
			};

			await expect(workflowEngine["executeActionStep"](step, context)).rejects.toThrow(
				"Unknown action type: unknown_action"
			);
		});

		it("should subscribe to progress updates", () => {
			const callback = vi.fn();
			const unsubscribe = workflowEngine.subscribeToProgress("test-execution", callback);

			expect(typeof unsubscribe).toBe("function");

			// Test unsubscribe
			unsubscribe();
			expect(workflowEngine["progressListeners"].has("test-execution")).toBe(false);
		});
	});
});
