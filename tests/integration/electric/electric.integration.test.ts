
import { beforeEach, describe, expect, it, vi } from "vitest";

// Set up test environment variables
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.ELECTRIC_URL = "ws://localhost:5133";
process.env.ELECTRIC_AUTH_TOKEN = "test-token";

// Mock ElectricSQL dependencies before importing
vi.mock("@electric-sql/client", () => ({
	ElectricClient: class MockElectricClient {
		async connect() {
			return Promise.resolve();
		}
		async disconnect() {
			return Promise.resolve();
		}
		subscribe() {
			return () => {};
		}
		async sync() {
			return Promise.resolve();
		}
		on() {}
		get db() {
			return {
				tasks: {
					findMany: vi.fn().mockResolvedValue([]),
					create: vi.fn().mockResolvedValue({}),
				},
			};
		}
	},
}));

vi.mock("@electric-sql/pglite", () => ({
	PGlite: class MockPGlite {
		async close() {
			return Promise.resolve();
		}
	},
}));

vi.mock("@opentelemetry/api", () => ({
	trace: {
		getTracer: () => ({
			startSpan: () => ({
				setStatus: vi.fn(),
				recordException: vi.fn(),
				setAttributes: vi.fn(),
				addEvent: vi.fn(),
				end: vi.fn(),
			}),
		}),
		getActiveSpan: () => null,
		setSpan: () => ({}),
	},
	context: {
		with: (_ctx: any, fn: any) => fn(),
		active: () => ({}),
	},
	SpanStatusCode: { OK: 1, ERROR: 2 },
	SpanKind: { INTERNAL: 3 },
}));

describe("ElectricSQL Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Configuration", () => {
		it("should validate configuration", async () => {
			const { validateElectricConfig } = await import("@/lib/electric/config");
			expect(() => validateElectricConfig()).not.toThrow();
		});

		it("should get final configuration", async () => {
			const { getFinalConfig } = await import("@/lib/electric/config");
			const config = getFinalConfig();
			expect(config).toHaveProperty("url");
			expect(config).toHaveProperty("sync");
			expect(config).toHaveProperty("offline");
		});
	});

	describe("ObservabilityService", () => {
		it("should create singleton instance", async () => {
			const { ObservabilityService } = await import("@/lib/observability");
			const obs1 = ObservabilityService.getInstance();
			const obs2 = ObservabilityService.getInstance();
			expect(obs1).toBe(obs2);
		});

		it("should track operations", async () => {
			const { ObservabilityService } = await import("@/lib/observability");
			const obs = ObservabilityService.getInstance();

			const result = await obs.trackOperation("test-operation", async () => {
				return "test-result";
			});

			expect(result).toBe("test-result");
		});

		it("should record events", async () => {
			const { ObservabilityService } = await import("@/lib/observability");
			const obs = ObservabilityService.getInstance();

			obs.recordEvent("test-event", { data: "test" });
			const events = obs.getEvents(10);

			expect(events.length).toBeGreaterThan(0);
			expect(events[events.length - 1].name).toBe("test-event");
		});

		it("should record errors", async () => {
			const { ObservabilityService } = await import("@/lib/observability");
			const obs = ObservabilityService.getInstance();

			const testError = new Error("Test error");
			obs.recordError("test-operation", testError);

			const errors = obs.getErrors(10);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[errors.length - 1].error.message).toBe("Test error");
		});

		it("should provide health status", async () => {
			const { ObservabilityService } = await import("@/lib/observability");
			const obs = ObservabilityService.getInstance();

			const health = obs.getHealthStatus();
			expect(health).toHaveProperty("isHealthy");
			expect(health).toHaveProperty("recentErrorRate");
			expect(health).toHaveProperty("averageResponseTime");
		});
	});

	describe("ElectricClient", () => {
		it("should create singleton instance", async () => {
			const { ElectricClient } = await import("@/lib/electric/client");
			const client1 = ElectricClient.getInstance();
			const client2 = ElectricClient.getInstance();
			expect(client1).toBe(client2);
		});

		it("should provide connection status", async () => {
			const { ElectricClient } = await import("@/lib/electric/client");
			const client = ElectricClient.getInstance();

			const status = client.getConnectionStatus();
			expect(status).toHaveProperty("isConnected");
			expect(status).toHaveProperty("syncStatus");
			expect(status).toHaveProperty("lastSyncTime");
			expect(status).toHaveProperty("offlineQueueSize");
			expect(status).toHaveProperty("conflictCount");
		});

		it("should handle subscriptions", async () => {
			const { ElectricClient } = await import("@/lib/electric/client");
			const client = ElectricClient.getInstance();

			const callback = vi.fn();
			const unsubscribe = client.subscribe("tasks", callback);

			expect(typeof unsubscribe).toBe("function");
			expect(() => unsubscribe()).not.toThrow();
		});

		it("should provide conflict log", async () => {
			const { ElectricClient } = await import("@/lib/electric/client");
			const client = ElectricClient.getInstance();

			const conflicts = client.getConflictLog();
			expect(Array.isArray(conflicts)).toBe(true);
		});
	});

	describe("ElectricAuthService", () => {
		it("should create singleton instance", async () => {
			const { ElectricAuthService } = await import("@/lib/electric/auth");
			const auth1 = ElectricAuthService.getInstance();
			const auth2 = ElectricAuthService.getInstance();
			expect(auth1).toBe(auth2);
		});

		it("should provide token information", async () => {
			const { ElectricAuthService } = await import("@/lib/electric/auth");
			const auth = ElectricAuthService.getInstance();

			const tokenInfo = auth.getTokenInfo();
			expect(tokenInfo).toHaveProperty("hasToken");
			expect(tokenInfo).toHaveProperty("isExpired");
			expect(tokenInfo).toHaveProperty("expiresAt");
			expect(tokenInfo).toHaveProperty("timeUntilExpiry");
		});

		it("should check authentication status", async () => {
			const { ElectricAuthService } = await import("@/lib/electric/auth");
			const auth = ElectricAuthService.getInstance();

			const isAuth = auth.isAuthenticated();
			expect(typeof isAuth).toBe("boolean");
		});

		it("should validate permissions", async () => {
			const { ElectricAuthService } = await import("@/lib/electric/auth");
			const auth = ElectricAuthService.getInstance();

			const hasRead = auth.hasPermission("read");
			const hasWrite = auth.hasPermission("write");

			expect(typeof hasRead).toBe("boolean");
			expect(typeof hasWrite).toBe("boolean");
		});

		it("should provide auth headers", async () => {
			const { ElectricAuthService } = await import("@/lib/electric/auth");
			const auth = ElectricAuthService.getInstance();

			const headers = auth.getAuthHeaders();
			expect(typeof headers).toBe("object");
		});
	});

	describe("ElectricSyncService", () => {
		it("should create singleton instance", async () => {
			const { ElectricSyncService } = await import(
				"@/lib/electric/sync-service"
			);
			const sync1 = ElectricSyncService.getInstance();
			const sync2 = ElectricSyncService.getInstance();
			expect(sync1).toBe(sync2);
		});

		it("should provide sync status", async () => {
			const { ElectricSyncService } = await import(
				"@/lib/electric/sync-service"
			);
			const sync = ElectricSyncService.getInstance();

			const status = sync.getSyncStatus();
			expect(status).toHaveProperty("isConnected");
			expect(status).toHaveProperty("syncStatus");
			expect(status).toHaveProperty("activeSubscriptions");
		});

		it("should handle table subscriptions", async () => {
			const { ElectricSyncService } = await import(
				"@/lib/electric/sync-service"
			);
			const sync = ElectricSyncService.getInstance();

			const callback = vi.fn();
			const unsubscribe = sync.subscribeToTable("tasks", callback);

			expect(typeof unsubscribe).toBe("function");
			expect(() => unsubscribe()).not.toThrow();
		});

		it("should provide conflict log", async () => {
			const { ElectricSyncService } = await import(
				"@/lib/electric/sync-service"
			);
			const sync = ElectricSyncService.getInstance();

			const conflicts = sync.getConflictLog();
			expect(Array.isArray(conflicts)).toBe(true);
		});
	});

	describe("Integration Functions", () => {
		it("should initialize ElectricSQL", async () => {
			const { initializeElectricSQL } = await import("@/lib/electric/index");

			// Should not throw in test environment
			await expect(
				initializeElectricSQL({
					enableHealthMonitoring: false,
				}),
			).resolves.not.toThrow();
		});

		it("should cleanup ElectricSQL", async () => {
			const { cleanupElectricSQL } = await import("@/lib/electric/index");

			await expect(cleanupElectricSQL()).resolves.not.toThrow();
		});

		it("should provide health status", async () => {
			const { getElectricSQLHealth } = await import("@/lib/electric/index");

			const health = getElectricSQLHealth();
			expect(health).toHaveProperty("auth");
			expect(health).toHaveProperty("sync");
		});
	});

	describe("Utility Functions", () => {
		it("should provide ElectricSQLUtils", async () => {
			const { ElectricSQLUtils } = await import("@/lib/electric/index");

			expect(ElectricSQLUtils).toBeDefined();
			expect(typeof ElectricSQLUtils.subscribeToTable).toBe("function");
			expect(typeof ElectricSQLUtils.forceSyncAll).toBe("function");
			expect(typeof ElectricSQLUtils.getConflictLog).toBe("function");
			expect(typeof ElectricSQLUtils.hasPermission).toBe("function");
			expect(typeof ElectricSQLUtils.getAuthHeaders).toBe("function");
		});
	});

	describe("Error Classes", () => {
		it("should define custom error classes", async () => {
			const {
				ElectricSQLError,
				ElectricSQLAuthError,
				ElectricSQLSyncError,
				ElectricSQLConflictError,
			} = await import("@/lib/electric/index");

			const baseError = new ElectricSQLError("Base error");
			expect(baseError.name).toBe("ElectricSQLError");

			const authError = new ElectricSQLAuthError("Auth error");
			expect(authError.name).toBe("ElectricSQLAuthError");

			const syncError = new ElectricSQLSyncError("Sync error");
			expect(syncError.name).toBe("ElectricSQLSyncError");

			const conflictError = new ElectricSQLConflictError("Conflict error", {});
			expect(conflictError.name).toBe("ElectricSQLConflictError");
		});
	});

	describe("React Hooks", () => {
		it("should provide status hooks", async () => {
			const { useElectricSQLStatus, useElectricSQLAuth } = await import(
				"@/lib/electric/index"
			);

			const status = useElectricSQLStatus();
			expect(status).toHaveProperty("isConnected");

			const auth = useElectricSQLAuth();
			expect(auth).toHaveProperty("hasToken");
		});
	});
});

