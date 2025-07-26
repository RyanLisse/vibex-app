import { beforeEach, describe, expect, it } from "vitest";
import {
	getDefaultEndpoint,
	getTelemetryConfig,
	validateTelemetryConfig,
} from "../../lib/telemetry";
import type { TelemetryBackend } from "../../src/types/telemetry";

describe("Telemetry Configuration", () => {
	beforeEach(() => {
		// Clear all environment variables before each test
		process.env.OTEL_ENABLED = undefined;
		process.env.OTEL_ENDPOINT = undefined;
		process.env.OTEL_SERVICE_NAME = undefined;
		process.env.OTEL_SERVICE_VERSION = undefined;
		process.env.OTEL_AUTH_HEADER = undefined;
		process.env.OTEL_SAMPLING_RATIO = undefined;
	});

	describe("getTelemetryConfig", () => {
		it("should return disabled config when OTEL_ENABLED is not set", () => {
			const config = getTelemetryConfig();
			expect(config).toEqual({ isEnabled: false });
		});

		it("should return disabled config when OTEL_ENABLED is false", () => {
			process.env.OTEL_ENABLED = "false";
			const config = getTelemetryConfig();
			expect(config).toEqual({ isEnabled: false });
		});

		it("should return enabled config with defaults when OTEL_ENABLED is true", () => {
			process.env.OTEL_ENABLED = "true";
			const config = getTelemetryConfig();
			expect(config).toMatchObject({
				isEnabled: true,
				endpoint: "http://localhost:4318/v1/traces",
				serviceName: "vibex",
				serviceVersion: "1.0.0",
				samplingRatio: 1.0,
			});
		});

		it("should use custom values from environment variables", () => {
			process.env.OTEL_ENABLED = "true";
			process.env.OTEL_ENDPOINT = "https://custom.endpoint.com";
			process.env.OTEL_SERVICE_NAME = "my-service";
			process.env.OTEL_SERVICE_VERSION = "2.0.0";
			process.env.OTEL_SAMPLING_RATIO = "0.5";

			const config = getTelemetryConfig();
			expect(config).toMatchObject({
				isEnabled: true,
				endpoint: "https://custom.endpoint.com",
				serviceName: "my-service",
				serviceVersion: "2.0.0",
				samplingRatio: 0.5,
			});
		});

		it("should include auth header when provided", () => {
			process.env.OTEL_ENABLED = "true";
			process.env.OTEL_AUTH_HEADER = "Bearer my-token";

			const config = getTelemetryConfig();
			expect(config.headers).toEqual({
				Authorization: "Bearer my-token",
			});
		});
	});

	describe("validateTelemetryConfig", () => {
		it("should validate disabled config", () => {
			const result = validateTelemetryConfig({ isEnabled: false });
			expect(result).toEqual({
				valid: true,
				errors: [],
				warnings: [],
			});
		});

		it("should fail validation when enabled without endpoint", () => {
			const result = validateTelemetryConfig({
				isEnabled: true,
				serviceName: "test",
			});
			expect(result).toEqual({
				valid: false,
				errors: ["endpoint is required when telemetry is enabled"],
				warnings: [],
			});
		});

		it("should fail validation with invalid sampling ratio", () => {
			const result = validateTelemetryConfig({
				isEnabled: true,
				endpoint: "http://localhost:4317",
				samplingRatio: 1.5,
			});
			expect(result).toEqual({
				valid: false,
				errors: ["samplingRatio must be between 0.0 and 1.0"],
				warnings: [],
			});
		});

		it("should pass validation with valid config", () => {
			const result = validateTelemetryConfig({
				isEnabled: true,
				endpoint: "http://localhost:4317",
				serviceName: "test",
				samplingRatio: 0.5,
			});
			expect(result).toEqual({
				valid: true,
				errors: [],
				warnings: [],
			});
		});
	});

	describe("getDefaultEndpoint", () => {
		const testCases: [TelemetryBackend, string][] = [
			["jaeger", "http://localhost:14268/api/traces"],
			["zipkin", "http://localhost:9411/api/v2/spans"],
			["datadog", "https://trace.agent.datadoghq.com/v0.4/traces"],
			["newrelic", "https://otlp.nr-data.net/v1/traces"],
			["honeycomb", "https://api.honeycomb.io/v1/traces"],
			["tempo", "http://localhost:3200/v1/traces"],
			["otlp", "http://localhost:4318/v1/traces"],
		];

		testCases.forEach(([backend, expectedEndpoint]) => {
			it(`should return correct endpoint for ${backend}`, () => {
				const endpoint = getDefaultEndpoint(backend);
				expect(endpoint).toBe(expectedEndpoint);
			});
		});
	});
});
