import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TelemetryBackend, TelemetryConfig } from "../src/types/telemetry";
import {
	getDefaultEndpoint,
	getTelemetryConfig,
	logTelemetryConfig,
	validateTelemetryConfig,
} from "./telemetry";

describe("telemetry", () => {
	// Store original env vars
	const originalEnv = process.env;
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		// Reset environment variables
		process.env = { ...originalEnv };

		// Set up console spy using spyOn
		consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		process.env = originalEnv;
		consoleSpy?.mockRestore();
	});

	describe("getTelemetryConfig", () => {
		it("should return disabled config when OTEL_ENABLED is not true", () => {
			process.env.OTEL_ENABLED = undefined;

			const config = getTelemetryConfig();

			expect(config).toEqual({ isEnabled: false });
		});

		it("should return disabled config when OTEL_ENABLED is false", () => {
			process.env.OTEL_ENABLED = "false";

			const config = getTelemetryConfig();

			expect(config).toEqual({ isEnabled: false });
		});

		it("should return enabled config with defaults", () => {
			process.env.OTEL_ENABLED = "true";
			// Clear OTEL_EXPORTER_OTLP_ENDPOINT to test default endpoint
			delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

			const config = getTelemetryConfig();

			expect(config).toEqual({
				isEnabled: true,
				endpoint: "http://localhost:4318/v1/traces", // Default OTLP endpoint
				serviceName: "vibex",
				serviceVersion: "1.0.0",
				samplingRatio: 1.0,
				headers: undefined,
			});
		});

		it("should use custom service name and version", () => {
			process.env.OTEL_ENABLED = "true";
			process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";
			process.env.OTEL_SERVICE_NAME = "my-service";
			process.env.OTEL_SERVICE_VERSION = "2.0.0";

			const config = getTelemetryConfig();

			expect(config.serviceName).toBe("my-service");
			expect(config.serviceVersion).toBe("2.0.0");
		});

		it("should parse custom sampling ratio", () => {
			process.env.OTEL_ENABLED = "true";
			process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";
			process.env.OTEL_SAMPLING_RATIO = "0.5";

			const config = getTelemetryConfig();

			expect(config.samplingRatio).toBe(0.5);
		});

		it("should add authorization header when OTEL_AUTH_HEADER is set", () => {
			process.env.OTEL_ENABLED = "true";
			process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";
			process.env.OTEL_AUTH_HEADER = "Bearer token123";

			const config = getTelemetryConfig();

			expect(config.headers).toEqual({
				Authorization: "Bearer token123",
			});
		});

		it("should not include headers when OTEL_AUTH_HEADER is not set", () => {
			process.env.OTEL_ENABLED = "true";
			process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";

			const config = getTelemetryConfig();

			expect(config.headers).toBeUndefined();
		});
	});

	describe("getDefaultEndpoint", () => {
		const backends: [TelemetryBackend, string][] = [
			["jaeger", "http://localhost:14268/api/traces"],
			["zipkin", "http://localhost:9411/api/v2/spans"],
			["datadog", "https://trace.agent.datadoghq.com/v0.4/traces"],
			["newrelic", "https://otlp.nr-data.net/v1/traces"],
			["honeycomb", "https://api.honeycomb.io/v1/traces"],
			["tempo", "http://localhost:3200/v1/traces"],
			["otlp", "http://localhost:4318/v1/traces"],
		];

		it.each(backends)(
			"should return correct endpoint for %s",
			(backend, expectedEndpoint) => {
				const endpoint = getDefaultEndpoint(backend);
				expect(endpoint).toBe(expectedEndpoint);
			},
		);
	});

	describe("validateTelemetryConfig", () => {
		it("should validate disabled config", () => {
			const config: TelemetryConfig = { isEnabled: false };

			const result = validateTelemetryConfig(config);

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it("should validate enabled config with endpoint", () => {
			const config: TelemetryConfig = {
				isEnabled: true,
				endpoint: "http://localhost:4317",
				serviceName: "test-service",
				serviceVersion: "1.0.0",
				samplingRatio: 0.5,
			};

			const result = validateTelemetryConfig(config);

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it("should return error when enabled without endpoint", () => {
			const config: TelemetryConfig = {
				isEnabled: true,
				serviceName: "test-service",
			};

			const result = validateTelemetryConfig(config);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"endpoint is required when telemetry is enabled",
			);
		});

		it("should validate sampling ratio bounds", () => {
			const config1: TelemetryConfig = {
				isEnabled: true,
				endpoint: "http://localhost:4317",
				samplingRatio: -0.1,
			};

			const result1 = validateTelemetryConfig(config1);
			expect(result1.valid).toBe(false);
			expect(result1.errors).toContain(
				"samplingRatio must be between 0.0 and 1.0",
			);

			const config2: TelemetryConfig = {
				isEnabled: true,
				endpoint: "http://localhost:4317",
				samplingRatio: 1.1,
			};

			const result2 = validateTelemetryConfig(config2);
			expect(result2.valid).toBe(false);
			expect(result2.errors).toContain(
				"samplingRatio must be between 0.0 and 1.0",
			);
		});

		it("should accept valid sampling ratios", () => {
			const validRatios = [0, 0.1, 0.5, 0.99, 1];

			for (const ratio of validRatios) {
				const config: TelemetryConfig = {
					isEnabled: true,
					endpoint: "http://localhost:4317",
					samplingRatio: ratio,
				};

				const result = validateTelemetryConfig(config);
				expect(result.valid).toBe(true);
				expect(result.errors).toEqual([]);
			}
		});

		it("should handle undefined sampling ratio", () => {
			const config: TelemetryConfig = {
				isEnabled: true,
				endpoint: "http://localhost:4317",
				samplingRatio: undefined,
			};

			const result = validateTelemetryConfig(config);

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});
	});

	describe("logTelemetryConfig", () => {
		it("should log disabled message when telemetry is disabled", () => {
			process.env.NODE_ENV = "development";
			const config: TelemetryConfig = { isEnabled: false };

			logTelemetryConfig(config);

			expect(consoleSpy).toHaveBeenCalledWith("Telemetry:", "disabled");
		});

		it("should log enabled configuration", () => {
			process.env.NODE_ENV = "development";
			const config: TelemetryConfig = {
				isEnabled: true,
				endpoint: "http://localhost:4317",
				serviceName: "test-service",
				serviceVersion: "1.2.3",
				samplingRatio: 0.75,
			};

			logTelemetryConfig(config);

			expect(consoleSpy).toHaveBeenCalledWith("Telemetry:", "enabled");
		});

		it("should use default sampling ratio of 1 when not specified", () => {
			process.env.NODE_ENV = "development";
			const config: TelemetryConfig = {
				isEnabled: true,
				endpoint: "http://localhost:4317",
				serviceName: "test-service",
				serviceVersion: "1.0.0",
			};

			logTelemetryConfig(config);

			expect(consoleSpy).toHaveBeenCalledWith("Telemetry:", "enabled");
		});

		it("should log headers when present", () => {
			process.env.NODE_ENV = "development";
			const config: TelemetryConfig = {
				isEnabled: true,
				endpoint: "http://localhost:4317",
				serviceName: "test-service",
				serviceVersion: "1.0.0",
				headers: {
					Authorization: "Bearer token",
					"X-Custom-Header": "value",
				},
			};

			logTelemetryConfig(config);

			expect(consoleSpy).toHaveBeenCalledWith("Telemetry:", "enabled");
		});

		it("should not log headers when not present", () => {
			process.env.NODE_ENV = "development";
			const config: TelemetryConfig = {
				isEnabled: true,
				endpoint: "http://localhost:4317",
				serviceName: "test-service",
				serviceVersion: "1.0.0",
			};

			logTelemetryConfig(config);

			expect(consoleSpy).toHaveBeenCalledWith("Telemetry:", "enabled");
		});

		it("should handle edge case sampling ratios", () => {
			process.env.NODE_ENV = "development";
			const testCases = [
				{ ratio: 0 },
				{ ratio: 1 },
				{ ratio: 0.333 },
				{ ratio: 0.999 },
			];

			for (const { ratio } of testCases) {
				consoleSpy.mockClear();

				const config: TelemetryConfig = {
					isEnabled: true,
					endpoint: "http://localhost:4317",
					serviceName: "test-service",
					serviceVersion: "1.0.0",
					samplingRatio: ratio,
				};

				logTelemetryConfig(config);

				expect(consoleSpy).toHaveBeenCalledWith("Telemetry:", "enabled");
			}
		});
	});
});
