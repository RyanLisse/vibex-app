/**
 * Test suite for environment configuration
 * Tests the lib/env.ts module for proper validation and exports
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "@/src/shared/schemas/validation";

// Mock the validation module before importing env
vi.mock("@/src/shared/schemas/validation", () => ({
	validateEnv: vi.fn(),
	type: {} as { Env: Env },
}));

describe("Environment Configuration", () => {
	let mockValidateEnv: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		mockValidateEnv = vi.mocked(
			await import("@/src/shared/schemas/validation"),
		).validateEnv;
	});

	describe("Environment Validation", () => {
		it("should successfully validate and export environment configuration", async () => {
			const mockEnv: Env = {
				NODE_ENV: "test",
				LETTA_API_KEY: "test-letta-key",
				LETTA_BASE_URL: "https://api.letta.com",
				LETTA_PROJECT_ID: "test-project-id",
				OPENAI_API_KEY: "test-openai-key",
				GOOGLE_AI_API_KEY: "test-google-key",
				DATABASE_URL: "postgresql://localhost/test",
				ELECTRIC_URL: "http://localhost:5133",
				ELECTRIC_WEBSOCKET_URL: "ws://localhost:5133",
				ELECTRIC_AUTH_TOKEN: "test-token",
				ELECTRIC_AUTH_ENDPOINT: "/api/auth/electric",
				ELECTRIC_USER_ID: "test-user-id",
				ELECTRIC_API_KEY: "test-api-key",
				ELECTRIC_SYNC_INTERVAL: 1000,
				ELECTRIC_MAX_RETRIES: 3,
				ELECTRIC_RETRY_BACKOFF: 1000,
				ELECTRIC_MAX_QUEUE_SIZE: 1000,
				ELECTRIC_CONNECTION_TIMEOUT: 10000,
				ELECTRIC_HEARTBEAT_INTERVAL: 30000,
				ELECTRIC_LOCAL_DB_PATH: "idb://electric-local",
				AUTH_SECRET: "test-secret-32-characters-long!!",
				JWT_EXPIRES_IN: "24h",
				SERVICE_NAME: "vibex",
				SERVICE_VERSION: "1.0.0",
				LOGGING_LEVEL: "info",
				LOGGING_CONSOLE_ENABLED: true,
				LOGGING_CONSOLE_LEVEL: "debug",
				LOGGING_FILE_ENABLED: true,
				LOGGING_FILE_PATH: "logs/app.log",
				LOGGING_ERROR_FILE_PATH: "logs/error.log",
				LOGGING_FILE_MAX_SIZE: 10485760,
				LOGGING_FILE_MAX_FILES: 5,
				LOGGING_FILE_LEVEL: "info",
				LOGGING_HTTP_ENABLED: false,
				LOGGING_HTTP_PATH: "/logs",
				LOGGING_HTTP_SSL: false,
				LOGGING_HTTP_LEVEL: "warn",
				LOGGING_SAMPLING_ENABLED: false,
				LOGGING_SAMPLING_RATE: 0.1,
				LOGGING_HIGH_VOLUME_THRESHOLD: 1000,
				LOGGING_TRACK_OPERATIONS: true,
				LOGGING_SLOW_THRESHOLD: 1000,
				LOGGING_REDACTION_ENABLED: true,
				TELEMETRY_ENABLED: true,
				TELEMETRY_BACKEND: "jaeger",
				TELEMETRY_SAMPLING_RATIO: 0.1,
				TELEMETRY_JAEGER_ENDPOINT: "http://localhost:14268/api/traces",
				TELEMETRY_ZIPKIN_ENDPOINT: "http://localhost:9411/api/v2/spans",
				ALERTS_ENABLED: true,
				ALERTS_MAX_PER_HOUR: 10,
				ALERTS_COOLDOWN_MINUTES: 15,
				ALERTS_DEDUPLICATION_ENABLED: true,
				ALERTS_DEDUPLICATION_WINDOW: 60,
				ALERTS_ESCALATION_ENABLED: false,
				ALERTS_ESCALATION_AFTER_MINUTES: 30,
				ALERTS_SLACK_CHANNEL: "#alerts",
				ALERTS_SLACK_MENTION_CHANNEL: false,
				ALERTS_EMAIL_PROVIDER: "smtp",
				ALERTS_EMAIL_REGION: "us-east-1",
				ALERTS_SMTP_SECURE: false,
			} as Env;

			mockValidateEnv.mockReturnValue(mockEnv);

			// Dynamically import to trigger validation
			const { env } = await import("@/lib/env");

			expect(mockValidateEnv).toHaveBeenCalled();
			expect(env.NODE_ENV).toBe("test");
			expect(env.LETTA_API_KEY).toBe("test-letta-key");
			expect(env.OPENAI_API_KEY).toBe("test-openai-key");
		});

		it("should handle validation failure in production and exit", async () => {
			const originalNodeEnv = process.env.NODE_ENV;
			const exitSpy = vi
				.spyOn(process, "exit")
				.mockImplementation(() => undefined as never);

			process.env.NODE_ENV = "production";
			mockValidateEnv.mockImplementation(() => {
				throw new Error("Validation failed");
			});

			// Re-import module to trigger validation
			delete require.cache[require.resolve("@/lib/env")];
			await import("@/lib/env");

			expect(exitSpy).toHaveBeenCalledWith(1);

			process.env.NODE_ENV = originalNodeEnv;
			exitSpy.mockRestore();
		});

		it("should provide fallback configuration in development on validation failure", async () => {
			process.env.NODE_ENV = "development";
			mockValidateEnv.mockImplementation(() => {
				throw new Error("Validation failed");
			});

			// Re-import module to trigger validation
			delete require.cache[require.resolve("@/lib/env")];
			const { env } = await import("@/lib/env");

			expect(env.NODE_ENV).toBe("development");
			expect(env.OPENAI_API_KEY).toBe(process.env.OPENAI_API_KEY || "");
		});
	});

	describe("API Keys Export", () => {
		it("should properly export API key configurations", async () => {
			const mockEnv: Partial<Env> = {
				LETTA_API_KEY: "test-letta-key",
				LETTA_BASE_URL: "https://api.letta.com",
				LETTA_PROJECT_ID: "test-project-id",
				OPENAI_API_KEY: "test-openai-key",
				NEXT_PUBLIC_OPENAI_API_KEY: "public-openai-key",
				GOOGLE_AI_API_KEY: "test-google-key",
				ANTHROPIC_API_KEY: "test-anthropic-key",
			};

			mockValidateEnv.mockReturnValue(mockEnv as Env);

			const { apiKeys } = await import("@/lib/env");

			expect(apiKeys.letta.apiKey).toBe("test-letta-key");
			expect(apiKeys.letta.baseUrl).toBe("https://api.letta.com");
			expect(apiKeys.letta.projectId).toBe("test-project-id");
			expect(apiKeys.openai.apiKey).toBe("test-openai-key");
			expect(apiKeys.openai.publicKey).toBe("public-openai-key");
			expect(apiKeys.google.apiKey).toBe("test-google-key");
			expect(apiKeys.anthropic.apiKey).toBe("test-anthropic-key");
		});
	});

	describe("Database Configuration Export", () => {
		it("should properly export database configurations", async () => {
			const mockEnv: Partial<Env> = {
				DATABASE_URL: "postgresql://localhost/test",
				ELECTRIC_URL: "http://localhost:5133",
				ELECTRIC_WEBSOCKET_URL: "ws://localhost:5133",
				ELECTRIC_AUTH_TOKEN: "test-token",
				ELECTRIC_AUTH_ENDPOINT: "/api/auth/electric",
				ELECTRIC_USER_ID: "test-user-id",
				ELECTRIC_API_KEY: "test-api-key",
				ELECTRIC_SYNC_INTERVAL: 1000,
				ELECTRIC_MAX_RETRIES: 3,
				REDIS_URL: "redis://localhost:6379",
				REDIS_PASSWORD: "test-password",
				REDIS_HOST: "localhost",
				REDIS_PORT: 6379,
				REDIS_DB: 0,
			};

			mockValidateEnv.mockReturnValue(mockEnv as Env);

			const { database } = await import("@/lib/env");

			expect(database.url).toBe("postgresql://localhost/test");
			expect(database.electric.url).toBe("http://localhost:5133");
			expect(database.electric.websocketUrl).toBe("ws://localhost:5133");
			expect(database.electric.sync.interval).toBe(1000);
			expect(database.electric.sync.maxRetries).toBe(3);
			expect(database.redis.url).toBe("redis://localhost:6379");
			expect(database.redis.host).toBe("localhost");
			expect(database.redis.port).toBe(6379);
		});
	});

	describe("Utility Functions", () => {
		beforeEach(() => {
			mockValidateEnv.mockReturnValue({
				NODE_ENV: "test",
			} as Env);
		});

		it("should correctly identify production environment", async () => {
			mockValidateEnv.mockReturnValue({ NODE_ENV: "production" } as Env);

			const { isProduction, isDevelopment, isTest } = await import("@/lib/env");

			expect(isProduction()).toBe(true);
			expect(isDevelopment()).toBe(false);
			expect(isTest()).toBe(false);
		});

		it("should correctly identify development environment", async () => {
			mockValidateEnv.mockReturnValue({ NODE_ENV: "development" } as Env);

			const { isProduction, isDevelopment, isTest } = await import("@/lib/env");

			expect(isProduction()).toBe(false);
			expect(isDevelopment()).toBe(true);
			expect(isTest()).toBe(false);
		});

		it("should correctly identify test environment", async () => {
			mockValidateEnv.mockReturnValue({ NODE_ENV: "test" } as Env);

			const { isProduction, isDevelopment, isTest } = await import("@/lib/env");

			expect(isProduction()).toBe(false);
			expect(isDevelopment()).toBe(false);
			expect(isTest()).toBe(true);
		});
	});

	describe("Service Configuration", () => {
		it("should properly export service information", async () => {
			const mockEnv: Partial<Env> = {
				SERVICE_NAME: "vibex-test",
				SERVICE_VERSION: "2.0.0",
				NODE_ENV: "test",
			};

			mockValidateEnv.mockReturnValue(mockEnv as Env);

			const { service } = await import("@/lib/env");

			expect(service.name).toBe("vibex-test");
			expect(service.version).toBe("2.0.0");
			expect(service.environment).toBe("test");
		});
	});

	describe("Logging Configuration", () => {
		it("should properly export logging configurations", async () => {
			const mockEnv: Partial<Env> = {
				LOGGING_LEVEL: "debug",
				LOGGING_CONSOLE_ENABLED: true,
				LOGGING_CONSOLE_LEVEL: "info",
				LOGGING_FILE_ENABLED: false,
				LOGGING_FILE_PATH: "custom/app.log",
				LOGGING_REDACTION_ENABLED: false,
			};

			mockValidateEnv.mockReturnValue(mockEnv as Env);

			const { logging } = await import("@/lib/env");

			expect(logging.level).toBe("debug");
			expect(logging.console.enabled).toBe(true);
			expect(logging.console.level).toBe("info");
			expect(logging.file.enabled).toBe(false);
			expect(logging.file.path).toBe("custom/app.log");
			expect(logging.redaction.enabled).toBe(false);
		});
	});

	describe("Authentication Configuration", () => {
		it("should properly export auth configurations", async () => {
			const mockEnv: Partial<Env> = {
				AUTH_SECRET: "super-secret-auth-key-32-chars!!",
				NEXTAUTH_SECRET: "nextauth-secret",
				JWT_SECRET: "jwt-secret",
				JWT_EXPIRES_IN: "48h",
			};

			mockValidateEnv.mockReturnValue(mockEnv as Env);

			const { auth } = await import("@/lib/env");

			expect(auth.secret).toBe("super-secret-auth-key-32-chars!!");
			expect(auth.nextAuthSecret).toBe("nextauth-secret");
			expect(auth.jwt.secret).toBe("jwt-secret");
			expect(auth.jwt.expiresIn).toBe("48h");
		});
	});

	describe("Module Re-validation", () => {
		it("should handle server-side re-validation warnings", async () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			// Mock window as undefined to simulate server-side
			Object.defineProperty(global, "window", {
				value: undefined,
				writable: true,
			});

			mockValidateEnv.mockImplementationOnce(() => {
				throw new Error("Re-validation warning");
			});

			// Re-import to trigger re-validation
			delete require.cache[require.resolve("@/lib/env")];
			await import("@/lib/env");

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"Environment validation warning on module load:",
				),
			);

			consoleSpy.mockRestore();
		});
	});
});
