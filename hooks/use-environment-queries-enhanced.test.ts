/**
 * Test for TanStack Query environment hooks
 */

import { describe, it, expect, beforeEach } from "vitest";

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

describe("Environment Query Hooks", () => {
	beforeEach(() => {
		mock.restore();
	});

	it("should export environment keys", async () => {
		const { environmentKeys } = await import("./use-environment-queries-enhanced");

		expect(environmentKeys).toBeDefined();
		expect(environmentKeys.all).toEqual(["environments"]);
		expect(environmentKeys.detail("test-id")).toEqual(["environments", "detail", "test-id"]);
		expect(environmentKeys.active()).toEqual(["environments", "active"]);
	});

	it("should have environment query functions", async () => {
		const module = await import("./use-environment-queries-enhanced");

		// Test that the module exports the expected functions
		expect(typeof module.useEnvironments).toBe("function");
		expect(typeof module.useEnvironment).toBe("function");
		expect(typeof module.useActiveEnvironment).toBe("function");
		expect(typeof module.useCreateEnvironment).toBe("function");
		expect(typeof module.useUpdateEnvironment).toBe("function");
		expect(typeof module.useDeleteEnvironment).toBe("function");
		expect(typeof module.useActivateEnvironment).toBe("function");
	});

	it("should have utility hooks", async () => {
		const module = await import("./use-environment-queries-enhanced");

		expect(typeof module.useListEnvironments).toBe("function");
		expect(typeof module.useCreateEnvironmentMutation).toBe("function");
		expect(typeof module.useUpdateEnvironmentMutation).toBe("function");
		expect(typeof module.useDeleteEnvironmentMutation).toBe("function");
		expect(typeof module.useEnvironmentStats).toBe("function");
		expect(typeof module.usePrefetchEnvironment).toBe("function");
	});

	it("should have real-time sync hooks", async () => {
		const module = await import("./use-environment-queries-enhanced");

		expect(typeof module.useEnvironmentSubscription).toBe("function");
		expect(typeof module.useEnvironmentsWithRealTimeSync).toBe("function");
		expect(typeof module.useEnvironmentWithRealTimeSync).toBe("function");
	});
});
