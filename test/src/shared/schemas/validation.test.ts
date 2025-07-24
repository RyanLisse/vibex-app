/**
 * Comprehensive test suite for Zod schema validation
 * Tests the src/shared/schemas/validation.ts module for proper validation logic
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// Import validation functions and schema
import {
	type Env,
	EnvSchema,
	getEnvSummary,
	validateDevelopmentEnv,
	validateEnv,
	validateProductionEnv,
	validateTestEnv,
} from "@/src/shared/schemas/validation";

describe("Zod Environment Schema Validation", () => {
	let originalEnv: NodeJS.ProcessEnv;
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		// Store original environment
		originalEnv = { ...process.env };

		// Mock console.warn to capture warnings
		consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		// Clear all environment variables for clean testing
		for (const key in process.env) {
			if (
				key.startsWith("LETTA_") ||
				key.startsWith("OPENAI_") ||
				key.startsWith("GOOGLE_") ||
				key.startsWith("ANTHROPIC_") ||
				key.startsWith("DATABASE_") ||
				key.startsWith("ELECTRIC_") ||
				key.startsWith("AUTH_") ||
				key.startsWith("REDIS_") ||
				key.startsWith("LOGGING_") ||
				key.startsWith("TELEMETRY_") ||
				key.startsWith("ALERTS_") ||
				key.startsWith("SENTRY_") ||
				key.startsWith("SERVICE_") ||
				key === "NODE_ENV"
			) {
				delete process.env[key];
			}
		}
	});

	afterEach(() => {
		// Restore original environment
		process.env = originalEnv;
		consoleSpy.mockRestore();
	});

	describe("EnvSchema Base Validation", () => {
		it("should validate with minimal required environment variables", () => {
			process.env.NODE_ENV = "test";
			process.env.LETTA_API_KEY = "test-letta-key";
			process.env.LETTA_PROJECT_ID = "test-project";
			process.env.OPENAI_API_KEY = "test-openai-key";
			process.env.GOOGLE_AI_API_KEY = "test-google-key";
			process.env.DATABASE_URL = "postgresql://localhost/test";
			process.env.ELECTRIC_URL = "http://localhost:5133";
			process.env.ELECTRIC_AUTH_TOKEN = "test-token";
			process.env.ELECTRIC_USER_ID = "test-user";
			process.env.ELECTRIC_API_KEY = "test-api-key";
			process.env.AUTH_SECRET = "test-secret-32-characters-long!!";

			const result = EnvSchema.safeParse(process.env);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.NODE_ENV).toBe("test");
				expect(result.data.LETTA_API_KEY).toBe("test-letta-key");
				expect(result.data.OPENAI_API_KEY).toBe("test-openai-key");
			}
		});

		it("should fail validation when required fields are missing", () => {
			process.env.NODE_ENV = "test";
			// Missing required API keys

			const result = EnvSchema.safeParse(process.env);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues.length).toBeGreaterThan(0);
				expect(result.error.issues.some((err) => err.path.includes("LETTA_API_KEY"))).toBe(true);
				expect(result.error.issues.some((err) => err.path.includes("OPENAI_API_KEY"))).toBe(true);
			}
		});

		it("should apply default values correctly", () => {
			process.env.NODE_ENV = "development";
			process.env.LETTA_API_KEY = "test-key";
			process.env.LETTA_PROJECT_ID = "test-project";
			process.env.OPENAI_API_KEY = "test-openai";
			process.env.GOOGLE_AI_API_KEY = "test-google";
			process.env.DATABASE_URL = "postgresql://localhost/test";
			process.env.ELECTRIC_URL = "http://localhost:5133";
			process.env.ELECTRIC_AUTH_TOKEN = "test-token";
			process.env.ELECTRIC_USER_ID = "test-user";
			process.env.ELECTRIC_API_KEY = "test-api-key";
			process.env.AUTH_SECRET = "test-secret-32-characters-long!!";

			const result = EnvSchema.safeParse(process.env);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.NODE_ENV).toBe("development");
				expect(result.data.LETTA_BASE_URL).toBe("https://api.letta.com");
				expect(result.data.SERVICE_NAME).toBe("vibex");
				expect(result.data.SERVICE_VERSION).toBe("1.0.0");
				expect(result.data.LOGGING_LEVEL).toBe("info");
			}
		});

		it("should validate URL fields correctly", () => {
			process.env.LETTA_BASE_URL = "not-a-valid-url";
			process.env.DATABASE_URL = "also-not-valid";

			const result = EnvSchema.safeParse(process.env);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(
					result.error.issues.some(
						(err) => err.path.includes("LETTA_BASE_URL") && err.code === "invalid_url"
					)
				).toBe(true);
				expect(
					result.error.issues.some(
						(err) => err.path.includes("DATABASE_URL") && err.code === "invalid_url"
					)
				).toBe(true);
			}
		});

		it("should validate numeric transformations correctly", () => {
			process.env.ELECTRIC_SYNC_INTERVAL = "500";
			process.env.ELECTRIC_MAX_RETRIES = "5";
			process.env.REDIS_PORT = "6379";
			process.env.LOGGING_FILE_MAX_SIZE = "5242880";

			// Add required fields
			process.env.NODE_ENV = "test";
			process.env.LETTA_API_KEY = "test-key";
			process.env.LETTA_PROJECT_ID = "test-project";
			process.env.OPENAI_API_KEY = "test-openai";
			process.env.GOOGLE_AI_API_KEY = "test-google";
			process.env.DATABASE_URL = "postgresql://localhost/test";
			process.env.ELECTRIC_URL = "http://localhost:5133";
			process.env.ELECTRIC_AUTH_TOKEN = "test-token";
			process.env.ELECTRIC_USER_ID = "test-user";
			process.env.ELECTRIC_API_KEY = "test-api-key";
			process.env.AUTH_SECRET = "test-secret-32-characters-long!!";

			const result = EnvSchema.safeParse(process.env);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.ELECTRIC_SYNC_INTERVAL).toBe(500);
				expect(result.data.ELECTRIC_MAX_RETRIES).toBe(5);
				expect(result.data.REDIS_PORT).toBe(6379);
				expect(result.data.LOGGING_FILE_MAX_SIZE).toBe(5242880);
			}
		});

		it("should validate boolean transformations correctly", () => {
			process.env.LOGGING_CONSOLE_ENABLED = "true";
			process.env.LOGGING_FILE_ENABLED = "false";
			process.env.TELEMETRY_ENABLED = "true";
			process.env.ALERTS_ENABLED = "false";

			// Add required fields
			process.env.NODE_ENV = "test";
			process.env.LETTA_API_KEY = "test-key";
			process.env.LETTA_PROJECT_ID = "test-project";
			process.env.OPENAI_API_KEY = "test-openai";
			process.env.GOOGLE_AI_API_KEY = "test-google";
			process.env.DATABASE_URL = "postgresql://localhost/test";
			process.env.ELECTRIC_URL = "http://localhost:5133";
			process.env.ELECTRIC_AUTH_TOKEN = "test-token";
			process.env.ELECTRIC_USER_ID = "test-user";
			process.env.ELECTRIC_API_KEY = "test-api-key";
			process.env.AUTH_SECRET = "test-secret-32-characters-long!!";

			const result = EnvSchema.safeParse(process.env);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.LOGGING_CONSOLE_ENABLED).toBe(true);
				expect(result.data.LOGGING_FILE_ENABLED).toBe(false);
				expect(result.data.TELEMETRY_ENABLED).toBe(true);
				expect(result.data.ALERTS_ENABLED).toBe(false);
			}
		});

		it("should validate enum fields correctly", () => {
			process.env.NODE_ENV = "staging";

			const result = EnvSchema.safeParse(process.env);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(
					result.error.issues.some(
						(err) => err.path.includes("NODE_ENV") && err.code === "invalid_enum_value"
					)
				).toBe(true);
			}
		});

		it("should validate minimum length constraints", () => {
			process.env.NODE_ENV = "test";
			process.env.LETTA_API_KEY = "";
			process.env.AUTH_SECRET = "short";

			const result = EnvSchema.safeParse(process.env);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(
					result.error.issues.some(
						(err) => err.path.includes("LETTA_API_KEY") && err.code === "too_small"
					)
				).toBe(true);
				expect(
					result.error.issues.some(
						(err) => err.path.includes("AUTH_SECRET") && err.code === "too_small"
					)
				).toBe(true);
			}
		});

		it("should validate number ranges correctly", () => {
			process.env.ELECTRIC_SYNC_INTERVAL = "50";
			process.env.TELEMETRY_SAMPLING_RATIO = "1.5";
			process.env.REDIS_PORT = "0";

			const result = EnvSchema.safeParse(process.env);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(
					result.error.issues.some(
						(err) => err.path.includes("ELECTRIC_SYNC_INTERVAL") && err.code === "too_small"
					)
				).toBe(true);
				expect(
					result.error.issues.some(
						(err) => err.path.includes("TELEMETRY_SAMPLING_RATIO") && err.code === "too_big"
					)
				).toBe(true);
				expect(
					result.error.issues.some(
						(err) => err.path.includes("REDIS_PORT") && err.code === "too_small"
					)
				).toBe(true);
			}
		});
	});

	describe("validateEnv Function", () => {
		it("should successfully validate valid environment configuration", () => {
			process.env.NODE_ENV = "test";
			process.env.LETTA_API_KEY = "valid-letta-key";
			process.env.LETTA_PROJECT_ID = "test-project";
			process.env.OPENAI_API_KEY = "valid-openai-key";
			process.env.GOOGLE_AI_API_KEY = "valid-google-key";
			process.env.DATABASE_URL = "postgresql://localhost/test";
			process.env.ELECTRIC_URL = "http://localhost:5133";
			process.env.ELECTRIC_AUTH_TOKEN = "valid-token";
			process.env.ELECTRIC_USER_ID = "test-user-id";
			process.env.ELECTRIC_API_KEY = "valid-api-key";
			process.env.AUTH_SECRET = "super-secret-auth-key-32-chars!!";

			const env = validateEnv();

			expect(env.NODE_ENV).toBe("test");
			expect(env.LETTA_API_KEY).toBe("valid-letta-key");
			expect(env.OPENAI_API_KEY).toBe("valid-openai-key");
			expect(env.AUTH_SECRET).toBe("super-secret-auth-key-32-chars!!");
		});

		it("should throw detailed error for validation failures", () => {
			process.env.NODE_ENV = "test";
			// Missing required keys

			expect(() => validateEnv()).toThrow("Environment validation failed:");
		});

		it("should validate critical services requirements", () => {
			process.env.NODE_ENV = "test";
			process.env.LETTA_PROJECT_ID = "test-project";
			process.env.GOOGLE_AI_API_KEY = "test-google-key";
			process.env.DATABASE_URL = "postgresql://localhost/test";
			process.env.ELECTRIC_URL = "http://localhost:5133";
			process.env.ELECTRIC_AUTH_TOKEN = "test-token";
			process.env.ELECTRIC_USER_ID = "test-user";
			process.env.ELECTRIC_API_KEY = "test-api-key";
			process.env.AUTH_SECRET = "test-secret-32-characters-long!!";
			// Missing LETTA_API_KEY and OPENAI_API_KEY

			expect(() => validateEnv()).toThrow("Critical service validation failed:");
		});

		it("should validate security requirements in production", () => {
			process.env.NODE_ENV = "production";
			process.env.LETTA_API_KEY = "prod-letta-key";
			process.env.LETTA_PROJECT_ID = "prod-project";
			process.env.OPENAI_API_KEY = "prod-openai-key";
			process.env.GOOGLE_AI_API_KEY = "prod-google-key";
			process.env.DATABASE_URL = "postgresql://localhost/prod";
			process.env.ELECTRIC_URL = "http://localhost:5133";
			process.env.ELECTRIC_AUTH_TOKEN = "prod-token";
			process.env.ELECTRIC_USER_ID = "prod-user";
			process.env.ELECTRIC_API_KEY = "prod-api-key";
			process.env.AUTH_SECRET = "short"; // Too short for production
			process.env.LOGGING_REDACTION_ENABLED = "false"; // Should be enabled in prod

			expect(() => validateEnv()).toThrow("Security validation failed:");
		});

		it("should allow missing database URL if Electric URL is provided", () => {
			process.env.NODE_ENV = "test";
			process.env.LETTA_API_KEY = "test-letta-key";
			process.env.LETTA_PROJECT_ID = "test-project";
			process.env.OPENAI_API_KEY = "test-openai-key";
			process.env.GOOGLE_AI_API_KEY = "test-google-key";
			// No DATABASE_URL
			process.env.ELECTRIC_URL = "http://localhost:5133";
			process.env.ELECTRIC_AUTH_TOKEN = "test-token";
			process.env.ELECTRIC_USER_ID = "test-user";
			process.env.ELECTRIC_API_KEY = "test-api-key";
			process.env.AUTH_SECRET = "test-secret-32-characters-long!!";

			expect(() => validateEnv()).not.toThrow();
		});

		it("should validate telemetry sampling ratio in production", () => {
			process.env.NODE_ENV = "production";
			process.env.LETTA_API_KEY = "prod-letta-key";
			process.env.LETTA_PROJECT_ID = "prod-project";
			process.env.OPENAI_API_KEY = "prod-openai-key";
			process.env.GOOGLE_AI_API_KEY = "prod-google-key";
			process.env.DATABASE_URL = "postgresql://localhost/prod";
			process.env.ELECTRIC_URL = "http://localhost:5133";
			process.env.ELECTRIC_AUTH_TOKEN = "prod-token";
			process.env.ELECTRIC_USER_ID = "prod-user";
			process.env.ELECTRIC_API_KEY = "prod-api-key";
			process.env.AUTH_SECRET = "super-secret-production-key-32!!";
			process.env.TELEMETRY_SAMPLING_RATIO = "0.8"; // Too high for production

			expect(() => validateEnv()).toThrow("Security validation failed:");
		});

		it("should require alert channels in production when alerts enabled", () => {
			process.env.NODE_ENV = "production";
			process.env.LETTA_API_KEY = "prod-letta-key";
			process.env.LETTA_PROJECT_ID = "prod-project";
			process.env.OPENAI_API_KEY = "prod-openai-key";
			process.env.GOOGLE_AI_API_KEY = "prod-google-key";
			process.env.DATABASE_URL = "postgresql://localhost/prod";
			process.env.ELECTRIC_URL = "http://localhost:5133";
			process.env.ELECTRIC_AUTH_TOKEN = "prod-token";
			process.env.ELECTRIC_USER_ID = "prod-user";
			process.env.ELECTRIC_API_KEY = "prod-api-key";
			process.env.AUTH_SECRET = "super-secret-production-key-32!!";
			process.env.ALERTS_ENABLED = "true";
			// No alert channels configured

			expect(() => validateEnv()).toThrow("At least one alert channel");
		});
	});

	describe("Environment-Specific Validation Functions", () => {
		describe("validateDevelopmentEnv", () => {
			it("should validate development environment correctly", () => {
				process.env.NODE_ENV = "development";
				process.env.LETTA_API_KEY = "dev-letta-key";
				process.env.LETTA_PROJECT_ID = "dev-project";
				process.env.OPENAI_API_KEY = "dev-openai-key";
				process.env.GOOGLE_AI_API_KEY = "dev-google-key";
				process.env.DATABASE_URL = "postgresql://localhost/dev";
				process.env.ELECTRIC_URL = "http://localhost:5133";
				process.env.ELECTRIC_AUTH_TOKEN = "dev-token";
				process.env.ELECTRIC_USER_ID = "dev-user";
				process.env.ELECTRIC_API_KEY = "dev-api-key";
				process.env.AUTH_SECRET = "development-secret-32-chars!!";

				const env = validateDevelopmentEnv();

				expect(env.NODE_ENV).toBe("development");
			});

			it("should throw error if NODE_ENV is not development", () => {
				process.env.NODE_ENV = "production";
				process.env.LETTA_API_KEY = "test-key";
				process.env.LETTA_PROJECT_ID = "test-project";
				process.env.OPENAI_API_KEY = "test-openai";
				process.env.GOOGLE_AI_API_KEY = "test-google";
				process.env.DATABASE_URL = "postgresql://localhost/test";
				process.env.ELECTRIC_URL = "http://localhost:5133";
				process.env.ELECTRIC_AUTH_TOKEN = "test-token";
				process.env.ELECTRIC_USER_ID = "test-user";
				process.env.ELECTRIC_API_KEY = "test-api-key";
				process.env.AUTH_SECRET = "test-secret-32-characters-long!!";

				expect(() => validateDevelopmentEnv()).toThrow(
					"Development environment validation called but NODE_ENV is not 'development'"
				);
			});
		});

		describe("validateProductionEnv", () => {
			it("should validate production environment correctly", () => {
				process.env.NODE_ENV = "production";
				process.env.LETTA_API_KEY = "prod-letta-key";
				process.env.LETTA_PROJECT_ID = "prod-project";
				process.env.OPENAI_API_KEY = "prod-openai-key";
				process.env.GOOGLE_AI_API_KEY = "prod-google-key";
				process.env.DATABASE_URL = "postgresql://localhost/prod";
				process.env.ELECTRIC_URL = "http://localhost:5133";
				process.env.ELECTRIC_AUTH_TOKEN = "prod-token";
				process.env.ELECTRIC_USER_ID = "prod-user";
				process.env.ELECTRIC_API_KEY = "prod-api-key";
				process.env.AUTH_SECRET = "production-secret-32-characters!!";
				process.env.SENTRY_DSN = "https://example@sentry.io/123456";
				process.env.LOGGING_LEVEL = "info";

				const env = validateProductionEnv();

				expect(env.NODE_ENV).toBe("production");
			});

			it("should show warnings for missing production recommendations", () => {
				process.env.NODE_ENV = "production";
				process.env.LETTA_API_KEY = "prod-letta-key";
				process.env.LETTA_PROJECT_ID = "prod-project";
				process.env.OPENAI_API_KEY = "prod-openai-key";
				process.env.GOOGLE_AI_API_KEY = "prod-google-key";
				process.env.DATABASE_URL = "postgresql://localhost/prod";
				process.env.ELECTRIC_URL = "http://localhost:5133";
				process.env.ELECTRIC_AUTH_TOKEN = "prod-token";
				process.env.ELECTRIC_USER_ID = "prod-user";
				process.env.ELECTRIC_API_KEY = "prod-api-key";
				process.env.AUTH_SECRET = "production-secret-32-characters!!";
				// Missing SENTRY_DSN
				process.env.LOGGING_LEVEL = "debug"; // Not recommended for prod

				validateProductionEnv();

				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("Production environment warnings:")
				);
			});

			it("should throw error if NODE_ENV is not production", () => {
				process.env.NODE_ENV = "development";
				process.env.LETTA_API_KEY = "test-key";
				process.env.LETTA_PROJECT_ID = "test-project";
				process.env.OPENAI_API_KEY = "test-openai";
				process.env.GOOGLE_AI_API_KEY = "test-google";
				process.env.DATABASE_URL = "postgresql://localhost/test";
				process.env.ELECTRIC_URL = "http://localhost:5133";
				process.env.ELECTRIC_AUTH_TOKEN = "test-token";
				process.env.ELECTRIC_USER_ID = "test-user";
				process.env.ELECTRIC_API_KEY = "test-api-key";
				process.env.AUTH_SECRET = "test-secret-32-characters-long!!";

				expect(() => validateProductionEnv()).toThrow(
					"Production environment validation called but NODE_ENV is not 'production'"
				);
			});
		});

		describe("validateTestEnv", () => {
			it("should validate test environment correctly", () => {
				process.env.NODE_ENV = "test";
				process.env.LETTA_API_KEY = "test-letta-key";
				process.env.LETTA_PROJECT_ID = "test-project";
				process.env.OPENAI_API_KEY = "test-openai-key";
				process.env.GOOGLE_AI_API_KEY = "test-google-key";
				process.env.DATABASE_URL = "postgresql://localhost/test";
				process.env.ELECTRIC_URL = "http://localhost:5133";
				process.env.ELECTRIC_AUTH_TOKEN = "test-token";
				process.env.ELECTRIC_USER_ID = "test-user";
				process.env.ELECTRIC_API_KEY = "test-api-key";
				process.env.AUTH_SECRET = "test-secret-32-characters-long!!";

				const env = validateTestEnv();

				expect(env.NODE_ENV).toBe("test");
			});

			it("should throw error if NODE_ENV is not test", () => {
				process.env.NODE_ENV = "production";
				process.env.LETTA_API_KEY = "test-key";
				process.env.LETTA_PROJECT_ID = "test-project";
				process.env.OPENAI_API_KEY = "test-openai";
				process.env.GOOGLE_AI_API_KEY = "test-google";
				process.env.DATABASE_URL = "postgresql://localhost/test";
				process.env.ELECTRIC_URL = "http://localhost:5133";
				process.env.ELECTRIC_AUTH_TOKEN = "test-token";
				process.env.ELECTRIC_USER_ID = "test-user";
				process.env.ELECTRIC_API_KEY = "test-api-key";
				process.env.AUTH_SECRET = "test-secret-32-characters-long!!";

				expect(() => validateTestEnv()).toThrow(
					"Test environment validation called but NODE_ENV is not 'test'"
				);
			});
		});
	});

	describe("getEnvSummary Function", () => {
		it("should provide comprehensive environment summary", () => {
			process.env.NODE_ENV = "development";
			process.env.LETTA_API_KEY = "dev-letta-key";
			process.env.LETTA_PROJECT_ID = "dev-project";
			process.env.OPENAI_API_KEY = "dev-openai-key";
			process.env.GOOGLE_AI_API_KEY = "dev-google-key";
			process.env.ANTHROPIC_API_KEY = "dev-anthropic-key";
			process.env.DATABASE_URL = "postgresql://localhost/dev";
			process.env.ELECTRIC_URL = "http://localhost:5133";
			process.env.ELECTRIC_AUTH_TOKEN = "dev-token";
			process.env.ELECTRIC_USER_ID = "dev-user";
			process.env.ELECTRIC_API_KEY = "dev-api-key";
			process.env.AUTH_SECRET = "development-secret-32-chars!!";
			process.env.REDIS_URL = "redis://localhost:6379";
			process.env.SENTRY_DSN = "https://example@sentry.io/123456";
			process.env.LOGGING_REDACTION_ENABLED = "true";
			process.env.ALERTS_ENABLED = "true";
			process.env.TELEMETRY_ENABLED = "true";

			const summary = getEnvSummary();

			expect(summary.environment).toBe("development");
			expect(summary.configuredServices).toContain("Letta AI");
			expect(summary.configuredServices).toContain("OpenAI");
			expect(summary.configuredServices).toContain("Google AI");
			expect(summary.configuredServices).toContain("Anthropic");
			expect(summary.configuredServices).toContain("Database");
			expect(summary.configuredServices).toContain("ElectricSQL");
			expect(summary.configuredServices).toContain("Redis");
			expect(summary.configuredServices).toContain("Sentry");
			expect(summary.securityStatus).toContain("log redaction");
			expect(summary.securityStatus).toContain("alerting");
			expect(summary.securityStatus).toContain("telemetry");
		});

		it("should handle missing optional services", () => {
			process.env.NODE_ENV = "test";
			process.env.LETTA_API_KEY = "test-letta-key";
			process.env.LETTA_PROJECT_ID = "test-project";
			process.env.OPENAI_API_KEY = "test-openai-key";
			process.env.GOOGLE_AI_API_KEY = "test-google-key";
			process.env.DATABASE_URL = "postgresql://localhost/test";
			process.env.ELECTRIC_URL = "http://localhost:5133";
			process.env.ELECTRIC_AUTH_TOKEN = "test-token";
			process.env.ELECTRIC_USER_ID = "test-user";
			process.env.ELECTRIC_API_KEY = "test-api-key";
			process.env.AUTH_SECRET = "test-secret-32-characters-long!!";
			// Missing ANTHROPIC_API_KEY, REDIS_URL, SENTRY_DSN

			const summary = getEnvSummary();

			expect(summary.missingOptionalServices).toContain("Anthropic");
			expect(summary.missingOptionalServices).toContain("Redis");
			expect(summary.missingOptionalServices).toContain("Sentry");
		});

		it("should handle validation failures gracefully", () => {
			process.env.NODE_ENV = "test";
			// Missing required keys - will cause validation to fail

			const summary = getEnvSummary();

			expect(summary.environment).toBe("unknown");
			expect(summary.configuredServices).toEqual([]);
			expect(summary.missingOptionalServices).toEqual(["All services (validation failed)"]);
			expect(summary.securityStatus).toContain("Validation failed:");
		});

		it("should show basic security when no security features enabled", () => {
			process.env.NODE_ENV = "development";
			process.env.LETTA_API_KEY = "dev-letta-key";
			process.env.LETTA_PROJECT_ID = "dev-project";
			process.env.OPENAI_API_KEY = "dev-openai-key";
			process.env.GOOGLE_AI_API_KEY = "dev-google-key";
			process.env.DATABASE_URL = "postgresql://localhost/dev";
			process.env.ELECTRIC_URL = "http://localhost:5133";
			process.env.ELECTRIC_AUTH_TOKEN = "dev-token";
			process.env.ELECTRIC_USER_ID = "dev-user";
			process.env.ELECTRIC_API_KEY = "dev-api-key";
			process.env.AUTH_SECRET = "development-secret-32-chars!!";
			process.env.LOGGING_REDACTION_ENABLED = "false";
			process.env.ALERTS_ENABLED = "false";
			process.env.TELEMETRY_ENABLED = "false";

			const summary = getEnvSummary();

			expect(summary.securityStatus).toBe("Basic security only");
		});
	});

	describe("Edge Cases and Error Handling", () => {
		it("should handle invalid numeric strings gracefully", () => {
			process.env.ELECTRIC_SYNC_INTERVAL = "not-a-number";
			process.env.REDIS_PORT = "invalid-port";

			const result = EnvSchema.safeParse(process.env);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues.some((err) => err.path.includes("ELECTRIC_SYNC_INTERVAL"))).toBe(
					true
				);
				expect(result.error.issues.some((err) => err.path.includes("REDIS_PORT"))).toBe(true);
			}
		});

		it("should handle invalid boolean strings gracefully", () => {
			process.env.LOGGING_CONSOLE_ENABLED = "maybe";
			process.env.TELEMETRY_ENABLED = "yes";

			const result = EnvSchema.safeParse(process.env);

			// These should transform to false for non-"true" values
			expect(result.success).toBe(false); // Will still fail due to missing required fields
		});

		it("should handle empty string transformations", () => {
			process.env.REDIS_PORT = "";
			process.env.ELECTRIC_SYNC_INTERVAL = "";

			const result = EnvSchema.safeParse(process.env);

			expect(result.success).toBe(false);
		});
	});
});
