/**
 * Inngest Testing Integration
 * Utilities for testing Inngest functions with @inngest/test
 */

import { type EventPayload, InngestTestEngine } from "@inngest/test";
import { inngest } from "@/lib/inngest";

/**
 * Mock event factory for creating test events
 */
export class InngestTestEventFactory {
	/**
	 * Create a test task event
	 */
	static createTaskEvent(
		taskId: string,
		data: Record<string, any> = {},
	): EventPayload {
		return {
			name: "task/created",
			data: {
				taskId,
				status: "pending",
				...data,
			},
			user: {
				id: "test-user",
			},
			ts: Date.now(),
		};
	}

	/**
	 * Create a test workflow event
	 */
	static createWorkflowEvent(
		workflowId: string,
		action: string,
		data: Record<string, any> = {},
	): EventPayload {
		return {
			name: `workflow/${action}`,
			data: {
				workflowId,
				action,
				...data,
			},
			user: {
				id: "test-user",
			},
			ts: Date.now(),
		};
	}

	/**
	 * Create a test agent event
	 */
	static createAgentEvent(
		agentId: string,
		eventType: string,
		data: Record<string, any> = {},
	): EventPayload {
		return {
			name: `agent/${eventType}`,
			data: {
				agentId,
				eventType,
				...data,
			},
			user: {
				id: "test-user",
			},
			ts: Date.now(),
		};
	}

	/**
	 * Create a test AI completion event
	 */
	static createAICompletionEvent(
		sessionId: string,
		data: Record<string, any> = {},
	): EventPayload {
		return {
			name: "ai/completion",
			data: {
				sessionId,
				completion: "Test AI response",
				model: "test-model",
				...data,
			},
			user: {
				id: "test-user",
			},
			ts: Date.now(),
		};
	}

	/**
	 * Create a test error event
	 */
	static createErrorEvent(
		error: string,
		context: Record<string, any> = {},
	): EventPayload {
		return {
			name: "system/error",
			data: {
				error,
				context,
				timestamp: Date.now(),
			},
			user: {
				id: "test-user",
			},
			ts: Date.now(),
		};
	}

	/**
	 * Create a batch of test events
	 */
	static createBatchEvents(
		count: number,
		eventFactory: () => EventPayload,
	): EventPayload[] {
		return Array.from({ length: count }, () => eventFactory());
	}
}

/**
 * Inngest function test helper
 */
export class InngestFunctionTester {
	private testEngine: InngestTestEngine;

	constructor(functionToTest: any) {
		this.testEngine = new InngestTestEngine({
			client: inngest,
			function: functionToTest,
		});
	}

	/**
	 * Execute a function with an event and return results
	 */
	async execute(event: EventPayload) {
		return await this.testEngine.execute(event);
	}

	/**
	 * Execute and assert successful completion
	 */
	async executeAndExpectSuccess(event: EventPayload) {
		const { result, execution } = await this.execute(event);

		if (execution.status !== "completed") {
			throw new Error(
				`Expected function to complete successfully, but got status: ${execution.status}`,
			);
		}

		return { result, execution };
	}

	/**
	 * Execute and assert failure
	 */
	async executeAndExpectFailure(event: EventPayload, expectedError?: string) {
		const { result, execution } = await this.execute(event);

		if (execution.status !== "failed") {
			throw new Error(
				`Expected function to fail, but got status: ${execution.status}`,
			);
		}

		if (expectedError && !execution.error?.message?.includes(expectedError)) {
			throw new Error(
				`Expected error to contain "${expectedError}", but got: ${execution.error?.message}`,
			);
		}

		return { result, execution };
	}

	/**
	 * Execute with retry testing
	 */
	async executeWithRetries(event: EventPayload, maxAttempts = 3) {
		let lastExecution;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			const { execution } = await this.execute(event);
			lastExecution = execution;

			if (execution.status === "completed") {
				break;
			}

			if (attempt === maxAttempts) {
				break;
			}

			// Simulate retry delay
			await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
		}

		return lastExecution;
	}

	/**
	 * Test step-by-step execution
	 */
	async executeSteps(event: EventPayload) {
		const { result, execution } = await this.execute(event);

		return {
			result,
			execution,
			steps: execution.steps || [],
			stepResults: execution.steps?.map((step) => step.result) || [],
		};
	}

	/**
	 * Validate function timing
	 */
	async validateTiming(
		event: EventPayload,
		expectedMinMs: number,
		expectedMaxMs: number,
	) {
		const start = Date.now();
		const { execution } = await this.execute(event);
		const elapsed = Date.now() - start;

		if (elapsed < expectedMinMs) {
			throw new Error(
				`Function completed too quickly: ${elapsed}ms (expected minimum: ${expectedMinMs}ms)`,
			);
		}

		if (elapsed > expectedMaxMs) {
			throw new Error(
				`Function took too long: ${elapsed}ms (expected maximum: ${expectedMaxMs}ms)`,
			);
		}

		return { execution, elapsed };
	}
}

/**
 * Workflow test orchestrator
 */
export class InngestWorkflowTester {
	private functions: Map<string, InngestFunctionTester> = new Map();

	/**
	 * Add a function to the workflow test
	 */
	addFunction(name: string, functionToTest: any) {
		this.functions.set(name, new InngestFunctionTester(functionToTest));
		return this;
	}

	/**
	 * Execute a workflow sequence
	 */
	async executeWorkflow(
		events: Array<{ functionName: string; event: EventPayload }>,
	) {
		const results = [];

		for (const { functionName, event } of events) {
			const tester = this.functions.get(functionName);
			if (!tester) {
				throw new Error(`Function not found: ${functionName}`);
			}

			const result = await tester.execute(event);
			results.push({ functionName, ...result });

			// Check if this step failed and should stop the workflow
			if (result.execution.status === "failed") {
				break;
			}
		}

		return results;
	}

	/**
	 * Execute parallel functions
	 */
	async executeParallel(
		executions: Array<{ functionName: string; event: EventPayload }>,
	) {
		const promises = executions.map(async ({ functionName, event }) => {
			const tester = this.functions.get(functionName);
			if (!tester) {
				throw new Error(`Function not found: ${functionName}`);
			}

			const result = await tester.execute(event);
			return { functionName, ...result };
		});

		return await Promise.allSettled(promises);
	}
}

/**
 * Mock Inngest client for testing
 */
export class MockInngestClient {
	private events: EventPayload[] = [];
	private functions: Map<string, any> = new Map();

	/**
	 * Mock send method
	 */
	async send(event: EventPayload | EventPayload[]) {
		const eventsArray = Array.isArray(event) ? event : [event];
		this.events.push(...eventsArray);
		return { ids: eventsArray.map(() => `test-${Date.now()}`) };
	}

	/**
	 * Get sent events
	 */
	getSentEvents(): EventPayload[] {
		return [...this.events];
	}

	/**
	 * Clear sent events
	 */
	clearEvents() {
		this.events = [];
	}

	/**
	 * Get events by name
	 */
	getEventsByName(name: string): EventPayload[] {
		return this.events.filter((event) => event.name === name);
	}

	/**
	 * Assert event was sent
	 */
	assertEventSent(name: string, data?: Partial<Record<string, any>>) {
		const events = this.getEventsByName(name);

		if (events.length === 0) {
			throw new Error(
				`Expected event "${name}" to be sent, but no events found`,
			);
		}

		if (data) {
			const matchingEvent = events.find((event) => {
				return Object.entries(data).every(
					([key, value]) => event.data[key] === value,
				);
			});

			if (!matchingEvent) {
				throw new Error(
					`Expected event "${name}" with data ${JSON.stringify(data)}, but no matching event found`,
				);
			}
		}
	}

	/**
	 * Assert event count
	 */
	assertEventCount(name: string, expectedCount: number) {
		const events = this.getEventsByName(name);

		if (events.length !== expectedCount) {
			throw new Error(
				`Expected ${expectedCount} events of type "${name}", but found ${events.length}`,
			);
		}
	}
}

/**
 * Test helpers for common Inngest patterns
 */
export const InngestTestHelpers = {
	/**
	 * Create a test environment with mocked dependencies
	 */
	createTestEnvironment: () => {
		const mockClient = new MockInngestClient();

		return {
			mockClient,
			eventFactory: InngestTestEventFactory,

			// Reset environment between tests
			reset: () => {
				mockClient.clearEvents();
			},
		};
	},

	/**
	 * Wait for async operations to complete
	 */
	waitForAsync: (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms)),

	/**
	 * Create a delayed event for testing timing
	 */
	createDelayedEvent: (
		event: EventPayload,
		delayMs: number,
	): Promise<EventPayload> => {
		return new Promise((resolve) => {
			setTimeout(() => resolve(event), delayMs);
		});
	},

	/**
	 * Simulate network delays in testing
	 */
	withNetworkDelay: async <T>(
		operation: () => Promise<T>,
		delayMs = 100,
	): Promise<T> => {
		await new Promise((resolve) => setTimeout(resolve, delayMs));
		return await operation();
	},

	/**
	 * Create a test scenario with multiple events
	 */
	createTestScenario: (name: string, events: EventPayload[]) => ({
		name,
		events,
		execute: async (tester: InngestFunctionTester) => {
			const results = [];
			for (const event of events) {
				const result = await tester.execute(event);
				results.push(result);
			}
			return results;
		},
	}),
};
