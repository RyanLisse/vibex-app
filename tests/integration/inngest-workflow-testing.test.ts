/**
 * Inngest Workflow Testing
 * Integration tests for Inngest functions using @inngest/test
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	InngestFunctionTester,
	InngestTestEventFactory,
	InngestTestHelpers,
	InngestWorkflowTester,
	MockInngestClient,
} from "../../lib/inngest/testing/inngest-test-utils";

// Mock Inngest functions for testing
const mockTaskFunction = {
	name: "process-task",
	handler: async ({ event, step }) => {
		const { taskId, action } = event.data;

		if (action === "fail") {
			throw new Error("Task processing failed");
		}

		const result = await step.run("process", async () => {
			return {
				taskId,
				status: "completed",
				result: "Task processed successfully",
			};
		});

		return result;
	},
};

const mockWorkflowFunction = {
	name: "workflow-orchestrator",
	handler: async ({ event, step }) => {
		const { workflowId, steps } = event.data;

		const results = [];

		for (let i = 0; i < steps.length; i++) {
			const stepResult = await step.run(`step-${i}`, async () => {
				if (steps[i].shouldFail) {
					throw new Error(`Step ${i} failed`);
				}
				return { stepId: i, status: "completed", data: steps[i] };
			});

			results.push(stepResult);
		}

		return { workflowId, completed: true, results };
	},
};

const mockAgentFunction = {
	name: "agent-coordinator",
	handler: async ({ event, step }) => {
		const { agentId, task } = event.data;

		const coordination = await step.run("coordinate", async () => {
			if (task === "complex-task") {
				// Simulate coordination delay
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			return { agentId, task, status: "coordinated" };
		});

		const execution = await step.run("execute", async () => {
			return {
				agentId,
				task,
				status: "executed",
				result: "Agent task completed",
			};
		});

		return { coordination, execution };
	},
};

describe("Inngest Workflow Testing", () => {
	let testEnvironment: ReturnType<
		typeof InngestTestHelpers.createTestEnvironment
	>;

	beforeEach(() => {
		testEnvironment = InngestTestHelpers.createTestEnvironment();
	});

	afterEach(() => {
		testEnvironment.reset();
	});

	describe("Event Factory", () => {
		it("should create task events with correct structure", () => {
			const event = InngestTestEventFactory.createTaskEvent("task-123", {
				priority: "high",
			});

			expect(event.name).toBe("task/created");
			expect(event.data.taskId).toBe("task-123");
			expect(event.data.status).toBe("pending");
			expect(event.data.priority).toBe("high");
			expect(event.user.id).toBe("test-user");
			expect(event.ts).toBeTypeOf("number");
		});

		it("should create workflow events", () => {
			const event = InngestTestEventFactory.createWorkflowEvent(
				"workflow-456",
				"start",
				{
					config: "test",
				},
			);

			expect(event.name).toBe("workflow/start");
			expect(event.data.workflowId).toBe("workflow-456");
			expect(event.data.action).toBe("start");
			expect(event.data.config).toBe("test");
		});

		it("should create agent events", () => {
			const event = InngestTestEventFactory.createAgentEvent(
				"agent-789",
				"activate",
				{
					model: "gpt-4",
				},
			);

			expect(event.name).toBe("agent/activate");
			expect(event.data.agentId).toBe("agent-789");
			expect(event.data.eventType).toBe("activate");
			expect(event.data.model).toBe("gpt-4");
		});

		it("should create AI completion events", () => {
			const event = InngestTestEventFactory.createAICompletionEvent(
				"session-123",
				{ tokens: 100 },
			);

			expect(event.name).toBe("ai/completion");
			expect(event.data.sessionId).toBe("session-123");
			expect(event.data.completion).toBe("Test AI response");
			expect(event.data.tokens).toBe(100);
		});

		it("should create error events", () => {
			const event = InngestTestEventFactory.createErrorEvent(
				"Database connection failed",
				{
					database: "postgres",
				},
			);

			expect(event.name).toBe("system/error");
			expect(event.data.error).toBe("Database connection failed");
			expect(event.data.context.database).toBe("postgres");
		});

		it("should create batch events", () => {
			const events = InngestTestEventFactory.createBatchEvents(3, () =>
				InngestTestEventFactory.createTaskEvent(`task-${Date.now()}`),
			);

			expect(events).toHaveLength(3);
			events.forEach((event) => {
				expect(event.name).toBe("task/created");
				expect(event.data.taskId).toMatch(/^task-/);
			});
		});
	});

	describe("Function Testing", () => {
		it("should execute function successfully", async () => {
			const tester = new InngestFunctionTester(mockTaskFunction);
			const event = InngestTestEventFactory.createTaskEvent("task-123", {
				action: "process",
			});

			const { result, execution } = await tester.executeAndExpectSuccess(event);

			expect(execution.status).toBe("completed");
			expect(result.taskId).toBe("task-123");
			expect(result.status).toBe("completed");
			expect(result.result).toBe("Task processed successfully");
		});

		it("should handle function failures", async () => {
			const tester = new InngestFunctionTester(mockTaskFunction);
			const event = InngestTestEventFactory.createTaskEvent("task-456", {
				action: "fail",
			});

			await tester.executeAndExpectFailure(event, "Task processing failed");
		});

		it("should test retry logic", async () => {
			const tester = new InngestFunctionTester(mockTaskFunction);
			const event = InngestTestEventFactory.createTaskEvent("task-retry", {
				action: "fail",
			});

			const execution = await tester.executeWithRetries(event, 3);

			expect(execution.status).toBe("failed");
			expect(execution.attempts).toBeGreaterThan(1);
		});

		it("should test step-by-step execution", async () => {
			const tester = new InngestFunctionTester(mockWorkflowFunction);
			const event = InngestTestEventFactory.createWorkflowEvent(
				"workflow-123",
				"execute",
				{
					steps: [
						{ name: "step1", data: "test1" },
						{ name: "step2", data: "test2" },
					],
				},
			);

			const { result, execution, steps } = await tester.executeSteps(event);

			expect(execution.status).toBe("completed");
			expect(steps).toHaveLength(2);
			expect(result.workflowId).toBe("workflow-123");
			expect(result.completed).toBe(true);
			expect(result.results).toHaveLength(2);
		});

		it("should validate function timing", async () => {
			const tester = new InngestFunctionTester(mockAgentFunction);
			const event = InngestTestEventFactory.createAgentEvent(
				"agent-123",
				"coordinate",
				{
					task: "complex-task",
				},
			);

			const { execution, elapsed } = await tester.validateTiming(
				event,
				50,
				500,
			);

			expect(execution.status).toBe("completed");
			expect(elapsed).toBeGreaterThanOrEqual(50);
			expect(elapsed).toBeLessThanOrEqual(500);
		});
	});

	describe("Workflow Testing", () => {
		it("should execute sequential workflow", async () => {
			const workflowTester = new InngestWorkflowTester()
				.addFunction("task", mockTaskFunction)
				.addFunction("agent", mockAgentFunction);

			const events = [
				{
					functionName: "task",
					event: InngestTestEventFactory.createTaskEvent("task-1", {
						action: "process",
					}),
				},
				{
					functionName: "agent",
					event: InngestTestEventFactory.createAgentEvent(
						"agent-1",
						"coordinate",
						{
							task: "simple-task",
						},
					),
				},
			];

			const results = await workflowTester.executeWorkflow(events);

			expect(results).toHaveLength(2);
			expect(results[0].execution.status).toBe("completed");
			expect(results[1].execution.status).toBe("completed");
		});

		it("should handle workflow failures", async () => {
			const workflowTester = new InngestWorkflowTester()
				.addFunction("task", mockTaskFunction)
				.addFunction("workflow", mockWorkflowFunction);

			const events = [
				{
					functionName: "task",
					event: InngestTestEventFactory.createTaskEvent("task-fail", {
						action: "fail",
					}),
				},
				{
					functionName: "workflow",
					event: InngestTestEventFactory.createWorkflowEvent(
						"workflow-after-fail",
						"execute",
						{
							steps: [],
						},
					),
				},
			];

			const results = await workflowTester.executeWorkflow(events);

			expect(results).toHaveLength(1); // Should stop after first failure
			expect(results[0].execution.status).toBe("failed");
		});

		it("should execute parallel functions", async () => {
			const workflowTester = new InngestWorkflowTester()
				.addFunction("task1", mockTaskFunction)
				.addFunction("task2", mockTaskFunction);

			const executions = [
				{
					functionName: "task1",
					event: InngestTestEventFactory.createTaskEvent("task-1", {
						action: "process",
					}),
				},
				{
					functionName: "task2",
					event: InngestTestEventFactory.createTaskEvent("task-2", {
						action: "process",
					}),
				},
			];

			const results = await workflowTester.executeParallel(executions);

			expect(results).toHaveLength(2);
			results.forEach((result) => {
				expect(result.status).toBe("fulfilled");
				if (result.status === "fulfilled") {
					expect(result.value.execution.status).toBe("completed");
				}
			});
		});
	});

	describe("Mock Client Testing", () => {
		it("should track sent events", async () => {
			const mockClient = new MockInngestClient();
			const event = InngestTestEventFactory.createTaskEvent("task-123");

			await mockClient.send(event);

			const sentEvents = mockClient.getSentEvents();
			expect(sentEvents).toHaveLength(1);
			expect(sentEvents[0].name).toBe("task/created");
			expect(sentEvents[0].data.taskId).toBe("task-123");
		});

		it("should handle batch events", async () => {
			const mockClient = new MockInngestClient();
			const events = InngestTestEventFactory.createBatchEvents(3, () =>
				InngestTestEventFactory.createTaskEvent(`task-${Date.now()}`),
			);

			await mockClient.send(events);

			expect(mockClient.getSentEvents()).toHaveLength(3);
			expect(mockClient.getEventsByName("task/created")).toHaveLength(3);
		});

		it("should assert events correctly", async () => {
			const mockClient = new MockInngestClient();

			await mockClient.send(
				InngestTestEventFactory.createTaskEvent("task-123", {
					priority: "high",
				}),
			);
			await mockClient.send(
				InngestTestEventFactory.createAgentEvent("agent-456", "activate"),
			);

			// Should not throw
			mockClient.assertEventSent("task/created");
			mockClient.assertEventSent("agent/activate");
			mockClient.assertEventSent("task/created", {
				taskId: "task-123",
				priority: "high",
			});

			// Should throw for missing events
			expect(() => {
				mockClient.assertEventSent("missing/event");
			}).toThrow('Expected event "missing/event" to be sent');

			expect(() => {
				mockClient.assertEventSent("task/created", { taskId: "wrong-id" });
			}).toThrow('Expected event "task/created" with data');
		});

		it("should assert event counts", async () => {
			const mockClient = new MockInngestClient();

			await mockClient.send(InngestTestEventFactory.createTaskEvent("task-1"));
			await mockClient.send(InngestTestEventFactory.createTaskEvent("task-2"));
			await mockClient.send(
				InngestTestEventFactory.createAgentEvent("agent-1", "activate"),
			);

			mockClient.assertEventCount("task/created", 2);
			mockClient.assertEventCount("agent/activate", 1);

			expect(() => {
				mockClient.assertEventCount("task/created", 3);
			}).toThrow('Expected 3 events of type "task/created", but found 2');
		});
	});

	describe("Test Helpers", () => {
		it("should create test scenarios", async () => {
			const tester = new InngestFunctionTester(mockTaskFunction);
			const scenario = InngestTestHelpers.createTestScenario(
				"task-processing",
				[
					InngestTestEventFactory.createTaskEvent("task-1", {
						action: "process",
					}),
					InngestTestEventFactory.createTaskEvent("task-2", {
						action: "process",
					}),
				],
			);

			expect(scenario.name).toBe("task-processing");
			expect(scenario.events).toHaveLength(2);

			const results = await scenario.execute(tester);
			expect(results).toHaveLength(2);
			results.forEach((result) => {
				expect(result.execution.status).toBe("completed");
			});
		});

		it("should handle network delays", async () => {
			const start = Date.now();

			const result = await InngestTestHelpers.withNetworkDelay(async () => {
				return "delayed-result";
			}, 200);

			const elapsed = Date.now() - start;
			expect(result).toBe("delayed-result");
			expect(elapsed).toBeGreaterThanOrEqual(150); // Account for timing variance
		});

		it("should wait for async operations", async () => {
			const start = Date.now();
			await InngestTestHelpers.waitForAsync(100);
			const elapsed = Date.now() - start;

			expect(elapsed).toBeGreaterThanOrEqual(90); // Account for timing variance
		});

		it("should create delayed events", async () => {
			const baseEvent = InngestTestEventFactory.createTaskEvent("delayed-task");
			const start = Date.now();

			const delayedEvent = await InngestTestHelpers.createDelayedEvent(
				baseEvent,
				100,
			);
			const elapsed = Date.now() - start;

			expect(delayedEvent.data.taskId).toBe("delayed-task");
			expect(elapsed).toBeGreaterThanOrEqual(90);
		});
	});
});
