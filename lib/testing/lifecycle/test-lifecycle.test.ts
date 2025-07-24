import { vi } from "vitest";
import { TestLifecycleManager } from "./test-lifecycle";

describe("TestLifecycleManager", () => {
	let manager: TestLifecycleManager;

	beforeEach(() => {
		manager = new TestLifecycleManager();
	});

	describe("Hook Registration", () => {
		it("should register beforeEach hooks", () => {
			const hook = vi.fn();
			manager.registerBeforeEach("setup-db", hook);

			const hooks = manager.getHooks("beforeEach");
			expect(hooks).toHaveLength(1);
			expect(hooks[0].name).toBe("setup-db");
		});

		it("should register afterEach hooks", () => {
			const hook = vi.fn();
			manager.registerAfterEach("cleanup-db", hook);

			const hooks = manager.getHooks("afterEach");
			expect(hooks).toHaveLength(1);
			expect(hooks[0].name).toBe("cleanup-db");
		});

		it("should register beforeAll hooks", () => {
			const hook = vi.fn();
			manager.registerBeforeAll("start-server", hook);

			const hooks = manager.getHooks("beforeAll");
			expect(hooks).toHaveLength(1);
			expect(hooks[0].name).toBe("start-server");
		});

		it("should register afterAll hooks", () => {
			const hook = vi.fn();
			manager.registerAfterAll("stop-server", hook);

			const hooks = manager.getHooks("afterAll");
			expect(hooks).toHaveLength(1);
			expect(hooks[0].name).toBe("stop-server");
		});
	});

	describe("Hook Execution", () => {
		it("should execute beforeEach hooks in order", async () => {
			const execution: string[] = [];

			manager.registerBeforeEach("first", async () => {
				execution.push("first");
			});

			manager.registerBeforeEach("second", async () => {
				execution.push("second");
			});

			await manager.executeBeforeEach();

			expect(execution).toEqual(["first", "second"]);
		});

		it("should execute afterEach hooks in reverse order", async () => {
			const execution: string[] = [];

			manager.registerAfterEach("first", async () => {
				execution.push("first");
			});

			manager.registerAfterEach("second", async () => {
				execution.push("second");
			});

			await manager.executeAfterEach();

			expect(execution).toEqual(["second", "first"]);
		});

		it("should handle hook failures gracefully", async () => {
			manager.registerBeforeEach("failing-hook", async () => {
				throw new Error("Hook failed");
			});

			await expect(manager.executeBeforeEach()).rejects.toThrow("Hook failed");
		});

		it("should support conditional hooks", async () => {
			const hook = vi.fn();

			manager.registerBeforeEach("conditional", hook, {
				condition: () => process.env.NODE_ENV === "test",
			});

			await manager.executeBeforeEach();

			expect(hook).toHaveBeenCalled();
		});
	});

	describe("Resource Dependencies", () => {
		it("should resolve hook dependencies", async () => {
			const execution: string[] = [];

			manager.registerBeforeEach("database", async () => {
				execution.push("database");
			});

			manager.registerBeforeEach(
				"server",
				async () => {
					execution.push("server");
				},
				{ dependencies: ["database"] }
			);

			await manager.executeBeforeEach();

			expect(execution).toEqual(["database", "server"]);
		});

		it("should detect circular dependencies", () => {
			manager.registerBeforeEach("A", async () => {}, { dependencies: ["B"] });
			manager.registerBeforeEach("B", async () => {}, { dependencies: ["A"] });

			expect(() => manager.resolveDependencies("beforeEach")).toThrow(
				"Circular dependency detected"
			);
		});
	});
});

describe("ResourceManager", () => {
	let resourceManager: ResourceManager;

	beforeEach(() => {
		resourceManager = new ResourceManager();
	});

	describe("Resource Registration", () => {
		it("should register database resource", async () => {
			const dbConfig = { host: "localhost", port: 5432 };

			await resourceManager.register("database", {
				setup: async () => dbConfig,
				cleanup: async () => {},
			});

			const db = await resourceManager.get("database");
			expect(db).toBe(dbConfig);
		});

		it("should register HTTP server resource", async () => {
			const server = { port: 3000, url: "http://localhost:3000" };

			await resourceManager.register("server", {
				setup: async () => server,
				cleanup: async () => {},
			});

			const serverInstance = await resourceManager.get("server");
			expect(serverInstance).toBe(server);
		});

		it("should register file system resource", async () => {
			const tempDir = "/tmp/test-files";

			await resourceManager.register("tempDir", {
				setup: async () => tempDir,
				cleanup: async () => {},
			});

			const dir = await resourceManager.get("tempDir");
			expect(dir).toBe(tempDir);
		});
	});

	describe("Resource Lifecycle", () => {
		it("should setup resource only once", async () => {
			const setupFn = vi.fn().mockResolvedValue("resource");

			await resourceManager.register("test-resource", {
				setup: setupFn,
				cleanup: async () => {},
			});

			// Get resource multiple times
			await resourceManager.get("test-resource");
			await resourceManager.get("test-resource");

			expect(setupFn).toHaveBeenCalledOnce();
		});

		it("should cleanup resources in reverse order", async () => {
			const cleanup: string[] = [];

			await resourceManager.register("first", {
				setup: async () => "first",
				cleanup: async () => cleanup.push("first"),
			});

			await resourceManager.register("second", {
				setup: async () => "second",
				cleanup: async () => cleanup.push("second"),
			});

			await resourceManager.cleanupAll();

			expect(cleanup).toEqual(["second", "first"]);
		});

		it("should handle cleanup failures gracefully", async () => {
			await resourceManager.register("failing", {
				setup: async () => "resource",
				cleanup: async () => {
					throw new Error("Cleanup failed");
				},
			});

			// Setup the resource first so it can be cleaned up
			await resourceManager.get("failing");

			// Should not throw during cleanup
			await resourceManager.cleanupAll();
			// If we reach this point, the test passes
		});
	});

	describe("Resource Dependencies", () => {
		it("should setup dependent resources in correct order", async () => {
			const setup: string[] = [];

			await resourceManager.register("database", {
				setup: async () => {
					setup.push("database");
					return "db";
				},
				cleanup: async () => {},
			});

			await resourceManager.register("server", {
				setup: async () => {
					setup.push("server");
					return "server";
				},
				cleanup: async () => {},
				dependencies: ["database"],
			});

			await resourceManager.get("server");

			expect(setup).toEqual(["database", "server"]);
		});

		it("should handle transitive dependencies", async () => {
			const setup: string[] = [];

			await resourceManager.register("A", {
				setup: async () => {
					setup.push("A");
					return "A";
				},
				cleanup: async () => {},
			});

			await resourceManager.register("B", {
				setup: async () => {
					setup.push("B");
					return "B";
				},
				cleanup: async () => {},
				dependencies: ["A"],
			});

			await resourceManager.register("C", {
				setup: async () => {
					setup.push("C");
					return "C";
				},
				cleanup: async () => {},
				dependencies: ["B"],
			});

			await resourceManager.get("C");

			expect(setup).toEqual(["A", "B", "C"]);
		});
	});
});

describe("SetupTeardownOrchestrator", () => {
	let orchestrator: SetupTeardownOrchestrator;

	beforeEach(() => {
		orchestrator = new SetupTeardownOrchestrator();
	});

	describe("Test Isolation", () => {
		it("should isolate tests with separate contexts", async () => {
			const context1 = await orchestrator.createTestContext("test-1");
			const context2 = await orchestrator.createTestContext("test-2");

			context1.set("data", "test-1-data");
			context2.set("data", "test-2-data");

			expect(context1.get("data")).toBe("test-1-data");
			expect(context2.get("data")).toBe("test-2-data");
		});

		it("should cleanup test context after test", async () => {
			const context = await orchestrator.createTestContext("test-1");
			const cleanupSpy = vi.fn();

			context.onCleanup(cleanupSpy);
			await orchestrator.cleanupTestContext("test-1");

			expect(cleanupSpy).toHaveBeenCalled();
		});

		it("should handle parallel test contexts", async () => {
			const contexts = await Promise.all([
				orchestrator.createTestContext("test-1"),
				orchestrator.createTestContext("test-2"),
				orchestrator.createTestContext("test-3"),
			]);

			contexts.forEach((context, index) => {
				context.set("id", `test-${index + 1}`);
			});

			expect(contexts[0].get("id")).toBe("test-1");
			expect(contexts[1].get("id")).toBe("test-2");
			expect(contexts[2].get("id")).toBe("test-3");
		});
	});

	describe("Global State Management", () => {
		it("should manage global test state", async () => {
			await orchestrator.setGlobalState("config", { debug: true });

			const config = orchestrator.getGlobalState("config");
			expect(config).toEqual({ debug: true });
		});

		it("should reset global state between test suites", async () => {
			await orchestrator.setGlobalState("counter", 1);
			await orchestrator.resetGlobalState();

			const counter = orchestrator.getGlobalState("counter");
			expect(counter).toBeUndefined();
		});

		it("should persist global state across test contexts", async () => {
			await orchestrator.setGlobalState("shared", "data");

			const context1 = await orchestrator.createTestContext("test-1");
			const context2 = await orchestrator.createTestContext("test-2");

			expect(context1.getGlobal("shared")).toBe("data");
			expect(context2.getGlobal("shared")).toBe("data");
		});
	});

	describe("Error Recovery", () => {
		it("should recover from setup failures", async () => {
			const failingSetup = vi.fn().mockRejectedValue(new Error("Setup failed"));
			const successfulSetup = vi.fn().mockResolvedValue("success");

			orchestrator.registerSetup("failing", failingSetup);
			orchestrator.registerSetup("successful", successfulSetup);

			await expect(orchestrator.runSetups()).rejects.toThrow("Setup failed");

			// Should still be able to run successful setups
			orchestrator.unregisterSetup("failing");
			// Should not throw after unregistering failing setup
			await orchestrator.runSetups();
			// If we reach this point, the test passes
		});

		it("should continue cleanup even if some cleanups fail", async () => {
			const successfulCleanup = vi.fn();
			const failingCleanup = vi.fn().mockRejectedValue(new Error("Cleanup failed"));

			orchestrator.registerCleanup("successful", successfulCleanup);
			orchestrator.registerCleanup("failing", failingCleanup);

			await orchestrator.runCleanups();

			expect(successfulCleanup).toHaveBeenCalled();
			expect(failingCleanup).toHaveBeenCalled();
		});
	});
});
