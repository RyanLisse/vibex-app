/**
 * Workflow Engine Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type WorkflowDefinition, WorkflowEngine } from "./workflow-engine";

// Mock the observability module
// vi.mock("@/lib/observability", () => ({
// 	observability: {
// 		trackOperation: vi.fn((name, fn) => fn()),
// 		recordEvent: vi.fn(),
// 		recordError: vi.fn(),
// 		clear: vi.fn(),
// 		getEvents: vi.fn(() => []),
// 		getErrors: vi.fn(() => []),
// 	},
// }));

// Mock the database
// vi.mock("@/db", () => ({
// 	db: {
// 		insert: vi.fn().mockReturnValue({
// 			values: vi.fn().mockReturnValue({
// 				returning: vi.fn().mockResolvedValue([
// {
// 						id: "test-workflow-id",
// 						name: "Test Workflow",
// 						definition: {},
// 						version: 1,
// 						isActive: true,
// 						createdAt: new Date(),
// 					},
// ]),
// 			}),
// 		}),
// 		select: vi.fn().mockReturnValue({
// 			from: vi.fn().mockReturnValue({
// 				where: vi.fn().mockReturnValue({
// 					limit: vi.fn().mockResolvedValue([
// {
// 							id: "test-workflow-id",
// 							name: "Test Workflow",
// 							definition: {
// 								id: "test-workflow-id",
// 								name: "Test Workflow",
// 								version: 1,
// 								steps: [],
// 							},
// 							version: 1,
// 							isActive: true,
// 							createdAt: new Date(),
// 						},
// ]),
// 					orderBy: vi.fn().mockReturnValue({
// 						limit: vi.fn().mockReturnValue({
// 							offset: vi.fn().mockResolvedValue([]),
// 						}),
// 					}),
// 				}),
// 				orderBy: vi.fn().mockReturnValue({
// 					limit: vi.fn().mockResolvedValue([]),
// 				}),
// 			}),
// 		}),
// 		update: vi.fn().mockReturnValue({
// 			set: vi.fn().mockReturnValue({
// 				where: vi.fn().mockReturnValue({
// 					returning: vi.fn().mockResolvedValue([
// {
// 							id: "test-workflow-id",
// 							name: "Updated Workflow",
// 							definition: {},
// 							version: 2,
// 							isActive: true,
// 							createdAt: new Date(),
// 						},
// ]),
// 				}),
// 			}),
// 		}),
// 	},
// }));

describe.skip("WorkflowEngine", () => {
	let workflowEngine: WorkflowEngine;

	beforeEach(() => {
		workflowEngine = new WorkflowEngine();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Workflow Management", () => {
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

		it("should update a workflow", async () => {
			const updates = {
				name: "Updated Workflow",
				version: 2,
			};

			const workflow = await workflowEngine.updateWorkflow("test-workflow-id", updates);

			expect(workflow).toBeDefined();
			expect(workflow.name).toBe("Updated Workflow");
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

		it("should execute condition step", async () => {
			const step = {
				id: "condition-step",
				name: "Condition Check",
				type: "condition" as const,
				config: {
					condition: "value > 10",
					variables: { value: 15 },
				},
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

			const result = await workflowEngine["executeConditionStep"](step, context);

			expect(result).toBe(true);
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

		it("should emit progress updates", () => {
			const callback = vi.fn();
			workflowEngine.subscribeToProgress("test-execution", callback);

			const context = {
				executionId: "test-execution",
				workflowId: "test-workflow",
				definition: {
					id: "test-workflow",
					name: "Test Workflow",
					version: 1,
					steps: [
						{
							id: "step1",
							name: "Step 1",
							type: "action" as const,
							config: {},
						},
						{
							id: "step2",
							name: "Step 2",
							type: "action" as const,
							config: {},
						},
					],
				} as WorkflowDefinition,
				state: {
					currentStep: 0,
					stepStates: {
						step1: { status: "completed" as const, retryCount: 0 },
						step2: { status: "pending" as const, retryCount: 0 },
					},
					variables: {},
					checkpoints: [],
				},
				triggeredBy: "test",
			};

			workflowEngine["emitProgress"](context);

			expect(callback).toHaveBeenCalledWith(
				expect.objectContaining({
					executionId: "test-execution",
					workflowId: "test-workflow",
					currentStep: 0,
					totalSteps: 2,
					completedSteps: 1,
					progress: 50,
				})
			);
		});
	});

	describe("Error Handling", () => {
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

		it("should handle condition evaluation errors", () => {
			const invalidCondition = "invalid.syntax.here";
			const variables = { value: 10 };

			const result = workflowEngine["evaluateCondition"](invalidCondition, variables);

			expect(result).toBe(false);
		});
	});

	describe("Observability", () => {
		it("should track operations", async () => {
			const definition = {
				name: "Test Workflow",
				version: 1,
				steps: [],
			};

			await workflowEngine.createWorkflow(definition);

			const events = observability.getEvents();
			expect(events.some((event) => event.name === "workflow.created")).toBe(true);
		});

		it("should record errors", async () => {
			const step = {
				id: "error-step",
				name: "Error Step",
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

			try {
				await workflowEngine["executeActionStep"](step, context);
			} catch (error) {
				// Expected error
			}

			const errors = observability.getErrors();
			expect(errors.length).toBeGreaterThan(0);
		});
	});

	describe("Workflow Statistics", () => {
		it("should get workflow statistics", async () => {
			const stats = await workflowEngine.getWorkflowStats();

			expect(stats).toBeDefined();
			expect(typeof stats.totalExecutions).toBe("number");
			expect(typeof stats.completedExecutions).toBe("number");
			expect(typeof stats.failedExecutions).toBe("number");
			expect(typeof stats.averageExecutionTime).toBe("number");
			expect(typeof stats.successRate).toBe("number");
		});

		it("should get workflow statistics for specific workflow", async () => {
			const stats = await workflowEngine.getWorkflowStats("test-workflow-id");

			expect(stats).toBeDefined();
			expect(typeof stats.totalExecutions).toBe("number");
		});
	});
});
