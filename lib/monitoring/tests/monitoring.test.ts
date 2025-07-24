/**
 * Comprehensive tests for monitoring system components
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SlackChannel } from "../notifications";
import {
	metrics,
	prometheusRegistry,
	recordAgentExecution,
	recordDatabaseQuery,
	recordHttpRequest,
} from "../prometheus";

describe("Monitoring System", () => {
	describe("Prometheus Metrics", () => {
		it("should record HTTP requests", () => {
			expect(() => recordHttpRequest("GET", "/api/test", 200, 100)).not.toThrow();
		});

		it("should record database queries", () => {
			expect(() => recordDatabaseQuery("SELECT", 50)).not.toThrow();
		});

		it("should record agent executions", () => {
			expect(() => recordAgentExecution("test-agent", "success", 1000)).not.toThrow();
		});
	});

	describe("Notifications", () => {
		it("should create Slack channel instance", () => {
			const channel = new SlackChannel("test-channel");
			expect(channel).toBeDefined();
		});
	});
});
