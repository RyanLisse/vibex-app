import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { observability } from "../../lib/observability";
import { enhancedObservability } from "../../lib/observability/enhanced";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
	metrics: {
		gauge: vi.fn(),
		increment: vi.fn(),
		distribution: vi.fn(),
		set: vi.fn(),
	},
	addBreadcrumb: vi.fn(),
	captureException: vi.fn(),
	setUser: vi.fn(),
	setTags: vi.fn(),
	startTransaction: vi.fn(() => ({
		finish: vi.fn(),
	})),
}));

// Mock observability
vi.mock("@/lib/observability", () => ({
	observability: {
		metrics: {
			gauge: vi.fn(),
			requestCount: vi.fn(),
			queryDuration: vi.fn(),
		},
		events: {
			collector: {
				collectEvent: vi.fn(),
			},
		},
		setGlobalAttributes: vi.fn(),
	},
}));

describe("Enhanced Observability", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Metrics", () => {
		test("should track gauge metric in both systems", () => {
			enhancedObservability.trackMetric("cpu.usage", 75.5, "percent", {
				server: "web-1",
			});

			expect(observability.metrics.gauge).toHaveBeenCalledWith(75.5, "cpu.usage");
			expect(Sentry.metrics.gauge).toHaveBeenCalledWith("cpu.usage", 75.5, {
				unit: "percent",
				tags: { server: "web-1" },
			});
		});

		test("should track increment metric in both systems", () => {
			enhancedObservability.trackIncrement("api.requests", 1, {
				endpoint: "/api/users",
			});

			expect(observability.metrics.requestCount).toHaveBeenCalledWith(1, "api.requests");
			expect(Sentry.metrics.increment).toHaveBeenCalledWith("api.requests", 1, {
				tags: { endpoint: "/api/users" },
			});
		});

		test("should track distribution metric in both systems", () => {
			enhancedObservability.trackDistribution("response.time", 250, "millisecond", {
				route: "/home",
			});

			expect(observability.metrics.queryDuration).toHaveBeenCalledWith(250, "response.time", true);
			expect(Sentry.metrics.distribution).toHaveBeenCalledWith("response.time", 250, {
				unit: "millisecond",
				tags: { route: "/home" },
			});
		});

		test("should track set metric in Sentry", () => {
			enhancedObservability.trackSet("unique.users", "user123", {
				region: "us-east",
			});

			expect(Sentry.metrics.set).toHaveBeenCalledWith("unique.users", "user123", {
				tags: { region: "us-east" },
			});
		});
	});

	describe("Events", () => {
		test("should log event to both systems", async () => {
			await enhancedObservability.logEvent("info", "User logged in", { userId: "123" }, "auth", [
				"login",
				"success",
			]);

			expect(observability.events.collector.collectEvent).toHaveBeenCalledWith(
				"system_event",
				"info",
				"User logged in",
				{ userId: "123" },
				"auth",
				["login", "success"]
			);

			expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
				message: "User logged in",
				category: "auth",
				level: "info",
				data: { userId: "123" },
			});
		});

		test("should capture exception for error events", async () => {
			const error = new Error("Test error");

			await enhancedObservability.logEvent("error", "Operation failed", { error }, "operation", [
				"failure",
			]);

			expect(Sentry.captureException).toHaveBeenCalledWith(error, {
				tags: {
					component: "operation",
					failure: true,
				},
				extra: { error },
			});
		});
	});

	describe("User Context", () => {
		test("should set user in both systems", () => {
			const user = { id: "123", email: "test@example.com" };
			enhancedObservability.setUser(user);

			expect(Sentry.setUser).toHaveBeenCalledWith(user);
			expect(observability.setGlobalAttributes).toHaveBeenCalledWith({
				"user.id": "123",
				"user.email": "test@example.com",
			});
		});

		test("should clear user in both systems", () => {
			enhancedObservability.clearUser();

			expect(Sentry.setUser).toHaveBeenCalledWith(null);
			expect(observability.setGlobalAttributes).toHaveBeenCalledWith({
				"user.id": "",
				"user.email": "",
			});
		});
	});

	describe("Global Tags", () => {
		test("should set global tags in both systems", () => {
			const tags = { environment: "production", version: "1.0.0" };
			enhancedObservability.setGlobalTags(tags);

			expect(Sentry.setTags).toHaveBeenCalledWith(tags);
			expect(observability.setGlobalAttributes).toHaveBeenCalledWith(tags);
		});
	});

	describe("Performance Timer", () => {
		test("should create and track timer", async () => {
			const timer = enhancedObservability.createTimer("operation.duration", {
				type: "test",
			});

			// Simulate some time passing
			await new Promise((resolve) => setTimeout(resolve, 10));

			timer.end();

			expect(observability.metrics.queryDuration).toHaveBeenCalled();
			expect(Sentry.metrics.distribution).toHaveBeenCalledWith(
				"operation.duration",
				expect.any(Number),
				expect.objectContaining({
					unit: "millisecond",
					tags: { type: "test" },
				})
			);
		});
	});

	describe("Transaction", () => {
		test("should start a Sentry transaction", () => {
			enhancedObservability.startTransaction("page.load", "navigation");

			expect(Sentry.startTransaction).toHaveBeenCalledWith({
				name: "page.load",
				op: "navigation",
			});
		});
	});
});
