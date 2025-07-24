/**
 * Test for TanStack Query task hooks
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock the observability module
const mockObservability = {
	trackOperation: vi.fn((name: string, fn: () => any) => fn()),
};

mock.module("@/lib/observability", () => ({
	observability: mockObservability,
}));

// Mock fetch
global.fetch = vi.fn(() =>
	Promise.resolve({
		ok: true,
		json: () => Promise.resolve({ data: [] }),
	})
) as any;

describe("Task Query Hooks", () => {
	beforeEach(() => {
		mock.restore();
	});

	it("should export query keys", async () => {
		const { queryKeys } = await import("./use-task-queries-enhanced");
		
		expect(queryKeys).toBeDefined();
		expect(queryKeys.tasks).toBeDefined();
		expect(queryKeys.tasks.all).toEqual(["tasks"]);
		expect(queryKeys.tasks.detail("test-id")).toEqual(["tasks", "detail", "test-id"]);
	});

	it("should have task filter interface", async () => {
		const module = await import("./use-task-queries-enhanced");
		
		// Test that the module exports the expected functions
		expect(typeof module.useTaskQuery).toBe("function");
		expect(typeof module.useTasksQuery).toBe("function");
		expect(typeof module.useCreateTaskMutation).toBe("function");
		expect(typeof module.useUpdateTaskMutation).toBe("function");
		expect(typeof module.useDeleteTaskMutation).toBe("function");
	});

	it("should have utility hooks", async () => {
		const module = await import("./use-task-queries-enhanced");
		
		expect(typeof module.useTasks).toBe("function");
		expect(typeof module.useActiveTasks).toBe("function");
		expect(typeof module.useCompletedTasks).toBe("function");
		expect(typeof module.useTask).toBe("function");
		expect(typeof module.useTasksByStatus).toBe("function");
		expect(typeof module.useTasksBySessionId).toBe("function");
	});

	it("should have real-time sync hooks", async () => {
		const module = await import("./use-task-queries-enhanced");
		
		expect(typeof module.useTaskSubscription).toBe("function");
		expect(typeof module.useTasksWithRealTimeSync).toBe("function");
		expect(typeof module.useTaskWithRealTimeSync).toBe("function");
	});
});