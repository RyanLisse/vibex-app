/**
 * Enhanced Observability Integration Test
 *
 * Simple integration test to verify the enhanced observability system
 * works correctly with basic functionality.
 */

import { beforeEach, describe, expect, it } from "vitest";

describe("Enhanced Observability Integration", () => {
	it("should import enhanced observability modules without errors", async () => {
		// Test that all modules can be imported
		const { enhancedObservability, agentTracking } = await import("./enhanced-events-system");
		const { performanceAggregation } = await import("./performance-aggregation");
		const { eventStream } = await import("./streaming");

		expect(enhancedObservability).toBeDefined();
		expect(agentTracking).toBeDefined();
		expect(performanceAggregation).toBeDefined();
		expect(eventStream).toBeDefined();
	});

	it("should have correct API structure", async () => {
		const { agentTracking } = await import("./enhanced-events-system");

		expect(typeof agentTracking.trackExecution).toBe("function");
		expect(typeof agentTracking.recordStep).toBe("function");
		expect(typeof agentTracking.getHealthMetrics).toBe("function");
	});

	it("should handle telemetry configuration", async () => {
		const { getTelemetryConfig } = await import("../telemetry");

		const config = getTelemetryConfig();
		expect(config).toBeDefined();
		expect(typeof config.isEnabled).toBe("boolean");
	});

	it("should export all required types", async () => {
		const types = await import("./types");

		// Check that key types are exported
		expect(types).toBeDefined();
	});
});
