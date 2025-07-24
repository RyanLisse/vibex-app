/**
 * Simple Workflow Engine Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type WorkflowDefinition, WorkflowEngine } from "./workflow-engine";

// Mock OpenTelemetry modules
vi.mock("@opentelemetry/api", () => ({
	context: {},
	SpanKind: {},
	SpanStatusCode: {},
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
		getActiveSpan: vi.fn(),
		setGlobalTracerProvider: vi.fn(),
	},
	metrics: {
		setGlobalMeterProvider: vi.fn(),
		getMeter: vi.fn(),
	},
}));

vi.mock("@opentelemetry/resources", () => ({
	Resource: vi.fn(),
}));

vi.mock("@opentelemetry/sdk-trace-node", () => ({
	NodeTracerProvider: vi.fn(),
	BatchSpanProcessor: vi.fn(),
	ConsoleSpanExporter: vi.fn(),
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
		update: vi.fn().mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([
						{
							id: "test-workflow-id",
							name: "Updated Workflow",
							definition: {},
							version: 2,
							isActive: true,
							createdAt: new Date(),
						},
					]),
				}),
			}),
		}),
	},
}));

describe("WorkflowEngine", () => {
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

		it("should get a workflow by ID", async () => {
			const workflow = await workflowEngine.getWorkflow("test-workflow-id");

			expect(workflow).toBeDefined();
			expect(workflow?.id).toBe("test-workflow-id");
		});

		it("should list workflows", async () => {
			const workflows = await workflowEngine.listWorkflows();

			expect(workflows).toBeDefined();
			expect(Array.isArray(workflows)).toBe(true);
		});
	});

	describe("Step Executors", () => {
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
	});

	describe("Progress Tracking", () => {
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
