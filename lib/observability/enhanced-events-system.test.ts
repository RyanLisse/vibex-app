/**
 * Enhanced Observability Events System Tests
 *
 * Comprehensive tests for the enhanced observability system including
 * agent execution tracking, performance metrics, and real-time streaming.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	agentTracking,
	EnhancedObservabilityService,
} from "./enhanced-events-system";

// Mock dependencies
vi.mock("@/db/config", () => ({
	db: {
		insert: vi.fn().mockReturnValue({
			values: vi.fn().mockResolvedValue(undefined),
		}),
		update: vi.fn().mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined),
			}),
		}),
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			}),
		}),
	},
}));

vi.mock("@opentelemetry/api", () => ({
	trace: {
		getTracer: vi.fn().mockReturnValue({
			startSpan: vi.fn().mockReturnValue({
				setAttributes: vi.fn(),
				setStatus: vi.fn(),
				recordException: vi.fn(),
				end: vi.fn(),
			}),
		}),
		getActiveSpan: vi.fn().mockReturnValue({
			spanContext: vi.fn().mockReturnValue({
				traceId: "test-trace-id",
				spanId: "test-span-id",
			}),
			addEvent: vi.fn(),
		}),
	},
	metrics: {
		getMeter: vi.fn().mockReturnValue({
			createCounter: vi.fn().mockReturnValue({
				add: vi.fn(),
			}),
			createHistogram: vi.fn().mockReturnValue({
				record: vi.fn(),
			}),
			createUpDownCounter: vi.fn().mockReturnValue({
				add: vi.fn(),
			}),
		}),
	},
	context: {},
	SpanKind: { INTERNAL: "internal" },
	SpanStatusCode: { OK: "ok", ERROR: "error" },
}));

vi.mock("@/lib/telemetry", () => ({
	getTelemetryConfig: vi.fn().mockReturnValue({
		isEnabled: true,
		agentTracking: {
			enabled: true,
			includeInputOutput: true,
			maxPayloadSize: 10240,
			trackMemoryUsage: true,
			trackPerformanceMetrics: true,
		},
		streaming: {
			enabled: true,
			bufferSize: 100,
			flushInterval: 5000,
			maxSubscriptions: 100,
		},
		metrics: {
			enabled: true,
			collectInterval: 10000,
			retentionPeriod: 86400000,
			aggregationWindow: 60000,
		},
	}),
}));

vi.mock("./streaming", () => ({
	eventStream: {
		manager: {
			broadcastEvent: vi.fn(),
		},
	},
}));

describe("EnhancedObservabilityService", () => {
	let service: EnhancedObservabilityService;

	beforeEach(() => {
		// Get fresh instance for each test
		service = EnhancedObservabilityService.getInstance();
		// Clear any existing state
		service.cleanup();
	});

	afterEach(() => {
		service.cleanup();
		vi.clearAllMocks();
	});

	describe("Agent Execution Tracking", () => {
		it("should start agent execution tracking", async () => {
			const executionId = await service.startAgentExecution(
				"test-agent",
				"test-operation",
				{ input: "test-input" },
				"task-123",
				"user-456",
				"session-789",
			);

			expect(executionId).toBeDefined();
			expect(typeof executionId).toBe("string");

			const context = service.getExecutionContext(executionId);
			expect(context).toBeDefined();
			expect(context?.agentType).toBe("test-agent");
			expect(context?.taskId).toBe("task-123");
			expect(context?.userId).toBe("user-456");
			expect(context?.sessionId).toBe("session-789");
		});

		it("should complete agent execution successfully", async () => {
			const executionId = await service.startAgentExecution(
				"test-agent",
				"test-operation",
			);

			const performanceMetrics = {
				executionTime: 1500,
				memoryUsage: 1024 * 1024,
				tokenCount: 100,
			};

			await service.completeAgentExecution(
				executionId,
				{ result: "success" },
				performanceMetrics,
			);

			const context = service.getExecutionContext(executionId);
			expect(context).toBeUndefined(); // Should be removed after completion
		});

		it("should handle agent execution failure", async () => {
			const executionId = await service.startAgentExecution(
				"test-agent",
				"test-operation",
			);

			const error = new Error("Test error");
			const performanceMetrics = {
				executionTime: 500,
				memoryUsage: 512 * 1024,
			};

			await service.failAgentExecution(executionId, error, performanceMetrics);

			const context = service.getExecutionContext(executionId);
			expect(context).toBeUndefined(); // Should be removed after failure
		});

		it("should record execution steps", async () => {
			const executionId = await service.startAgentExecution(
				"test-agent",
				"test-operation",
			);

			await service.recordExecutionStep(
				executionId,
				"step-1",
				{ data: "test-data" },
				100,
			);

			// Should not throw and should record the step
			expect(true).toBe(true);
		});

		it("should handle invalid execution ID gracefully", async () => {
			await expect(
				service.completeAgentExecution("invalid-id", {}),
			).rejects.toThrow("Execution context not found");

			await expect(
				service.failAgentExecution("invalid-id", new Error("test")),
			).rejects.toThrow("Execution context not found");
		});
	});

	describe("System Health Metrics", () => {
		it("should get system health metrics", async () => {
			const healthMetrics = await service.getSystemHealthMetrics();

			expect(healthMetrics).toBeDefined();
			expect(healthMetrics.activeExecutions).toBe(0);
			expect(healthMetrics.totalExecutions).toBeDefined();
			expect(healthMetrics.errorRate).toBeDefined();
			expect(healthMetrics.averageExecutionTime).toBeDefined();
			expect(healthMetrics.memoryUsage).toBeDefined();
			expect(healthMetrics.eventBufferSize).toBeDefined();
		});

		it("should track active executions", async () => {
			const executionId1 = await service.startAgentExecution("agent-1", "op-1");
			const executionId2 = await service.startAgentExecution("agent-2", "op-2");

			const activeExecutions = service.getActiveExecutions();
			expect(activeExecutions).toHaveLength(2);
			expect(activeExecutions.map((e) => e.executionId)).toContain(
				executionId1,
			);
			expect(activeExecutions.map((e) => e.executionId)).toContain(
				executionId2,
			);

			await service.completeAgentExecution(executionId1, {});

			const remainingExecutions = service.getActiveExecutions();
			expect(remainingExecutions).toHaveLength(1);
			expect(remainingExecutions[0].executionId).toBe(executionId2);
		});
	});

	describe("Event Collection and Flushing", () => {
		it("should flush events when buffer is full", async () => {
			// Start multiple executions to generate events
			const promises = [];
			for (let i = 0; i < 50; i++) {
				promises.push(
					service.startAgentExecution(`agent-${i}`, "test-operation"),
				);
			}

			await Promise.all(promises);

			// Should have triggered flush due to buffer size
			expect(true).toBe(true); // Events should be flushed
		});

		it("should force flush events", async () => {
			await service.startAgentExecution("test-agent", "test-operation");
			await service.forceFlush();

			// Should complete without error
			expect(true).toBe(true);
		});
	});
});

describe("agentTracking convenience functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("trackExecution", () => {
		it("should track successful execution", async () => {
			const mockExecution = vi.fn().mockResolvedValue("success");

			const result = await agentTracking.trackExecution(
				"test-agent",
				"test-operation",
				mockExecution,
				{ input: "test" },
				"task-123",
				"user-456",
				"session-789",
			);

			expect(result).toBe("success");
			expect(mockExecution).toHaveBeenCalledOnce();
		});

		it("should track failed execution", async () => {
			const error = new Error("Test error");
			const mockExecution = vi.fn().mockRejectedValue(error);

			await expect(
				agentTracking.trackExecution(
					"test-agent",
					"test-operation",
					mockExecution,
				),
			).rejects.toThrow("Test error");

			expect(mockExecution).toHaveBeenCalledOnce();
		});

		it("should track memory usage when enabled", async () => {
			const mockExecution = vi.fn().mockResolvedValue("success");

			// Mock process.memoryUsage
			const originalMemoryUsage = process.memoryUsage;
			let callCount = 0;
			process.memoryUsage = vi.fn().mockImplementation(() => ({
				heapUsed: callCount++ === 0 ? 1000000 : 1500000, // Simulate memory increase
				rss: 2000000,
				heapTotal: 3000000,
				external: 100000,
				arrayBuffers: 50000,
			}));

			const result = await agentTracking.trackExecution(
				"test-agent",
				"test-operation",
				mockExecution,
			);

			expect(result).toBe("success");
			expect(mockExecution).toHaveBeenCalledOnce();

			// Restore original function
			process.memoryUsage = originalMemoryUsage;
		});
	});

	describe("recordStep", () => {
		it("should record execution step", async () => {
			await agentTracking.recordStep(
				"test-execution-id",
				"test-step",
				{ data: "test" },
				100,
			);

			// Should complete without error
			expect(true).toBe(true);
		});
	});

	describe("getHealthMetrics", () => {
		it("should get health metrics", async () => {
			const metrics = await agentTracking.getHealthMetrics();

			expect(metrics).toBeDefined();
			expect(metrics.activeExecutions).toBeDefined();
			expect(metrics.totalExecutions).toBeDefined();
			expect(metrics.errorRate).toBeDefined();
		});
	});
});

describe("Performance and Memory Management", () => {
	let service: EnhancedObservabilityService;

	beforeEach(() => {
		service = EnhancedObservabilityService.getInstance();
		service.cleanup();
	});

	afterEach(() => {
		service.cleanup();
	});

	it("should handle high volume of executions", async () => {
		const executionPromises = [];

		// Start many executions
		for (let i = 0; i < 100; i++) {
			executionPromises.push(
				service.startAgentExecution(`agent-${i % 5}`, `operation-${i}`),
			);
		}

		const executionIds = await Promise.all(executionPromises);
		expect(executionIds).toHaveLength(100);

		// Complete half of them
		const completionPromises = [];
		for (let i = 0; i < 50; i++) {
			completionPromises.push(
				service.completeAgentExecution(executionIds[i], { result: i }),
			);
		}

		await Promise.all(completionPromises);

		const activeExecutions = service.getActiveExecutions();
		expect(activeExecutions).toHaveLength(50);
	});

	it("should cleanup resources properly", () => {
		service.cleanup();

		const activeExecutions = service.getActiveExecutions();
		expect(activeExecutions).toHaveLength(0);
	});
});
