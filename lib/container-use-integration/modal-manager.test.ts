/**
 * Test suite for Modal Labs function manager
 * Tests the core functionality for creating, managing, and monitoring
 * Modal functions for agent environments.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { ModalFunctionManager } from "./modal-manager";
import type {
  ModalFunctionConfig,
  AgentEnvironment,
  ModalFunctionResponse,
  ContainerUseError,
} from "./types";

describe("ModalFunctionManager", () => {
  let modalManager: ModalFunctionManager;

  beforeEach(() => {
    modalManager = new ModalFunctionManager({
      apiKey: "test-api-key",
      workspace: "test-workspace",
    });
  });

  describe("createAgentEnvironment", () => {
    test("should create a new agent environment with Modal function", async () => {
      // This test will fail initially (RED phase)
      const taskId = "task-123";
      const config: ModalFunctionConfig = {
        name: "agent-task-123",
        image: "python:3.11",
        cpu: 2,
        memory: 4096,
        timeout: 3600,
        secrets: ["github-token"],
        mounts: [],
        environment: { NODE_ENV: "production" },
        retries: 3,
        concurrency: 1,
      };

      const result = await modalManager.createAgentEnvironment(taskId, config);

      expect(result.success).toBe(true);
      expect(result.environment).toBeDefined();
      expect(result.environment?.taskId).toBe(taskId);
      expect(result.environment?.status).toBe("initializing");
      expect(result.environment?.modalFunctionId).toBeDefined();
    });

    test("should handle Modal function creation failures", async () => {
      const taskId = "task-fail";
      const config: ModalFunctionConfig = {
        name: "invalid-config",
        image: "",
        cpu: -1,
        memory: 0,
        timeout: 0,
        secrets: [],
        mounts: [],
        environment: {},
        retries: 0,
        concurrency: 0,
      };

      const result = await modalManager.createAgentEnvironment(taskId, config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("MODAL_CREATION_FAILED");
    });

    test("should validate configuration before creating function", async () => {
      const taskId = "task-validation";
      const invalidConfig = {} as ModalFunctionConfig;

      const result = await modalManager.createAgentEnvironment(
        taskId,
        invalidConfig,
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_CONFIG");
    });
  });

  describe("executeFunction", () => {
    test("should execute Modal function and return results", async () => {
      const functionId = "func-123";
      const payload = { command: "git status", workdir: "/app" };

      const result = await modalManager.executeFunction(functionId, payload);

      expect(result.functionId).toBe(functionId);
      expect(["pending", "running", "completed"]).toContain(result.status);
      expect(result.logs).toBeInstanceOf(Array);
    });

    test("should handle function execution timeouts", async () => {
      const functionId = "func-timeout";
      const payload = { command: "sleep 3700" }; // Longer than timeout

      const result = await modalManager.executeFunction(functionId, payload);

      expect(result.status).toBe("failed");
      expect(result.error).toContain("timeout");
    });

    test("should track resource usage during execution", async () => {
      const functionId = "func-resource";
      const payload = { command: "npm install" };

      const result = await modalManager.executeFunction(functionId, payload);

      expect(result.resourceUsage).toBeDefined();
      expect(result.resourceUsage.cpu).toBeGreaterThanOrEqual(0);
      expect(result.resourceUsage.memory).toBeGreaterThanOrEqual(0);
      expect(result.resourceUsage.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("monitorEnvironment", () => {
    test("should provide real-time monitoring of agent environment", async () => {
      const environmentId = "env-123";

      const monitoringStream = modalManager.monitorEnvironment(environmentId);

      const updates: AgentEnvironment[] = [];
      for await (const update of monitoringStream) {
        updates.push(update);
        if (updates.length >= 3) break; // Stop after a few updates
      }

      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0].id).toBe(environmentId);
      expect([
        "initializing",
        "ready",
        "running",
        "completed",
        "failed",
      ]).toContain(updates[0].status);
    });

    test("should handle monitoring connection failures", async () => {
      const invalidEnvironmentId = "nonexistent-env";

      expect(async () => {
        const stream = modalManager.monitorEnvironment(invalidEnvironmentId);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const update of stream) {
          // Should not reach here
        }
      }).rejects.toThrow("Environment not found");
    });
  });

  describe("cleanupEnvironment", () => {
    test("should properly cleanup Modal function and resources", async () => {
      const environmentId = "env-cleanup";

      const result = await modalManager.cleanupEnvironment(environmentId);

      expect(result.success).toBe(true);
      expect(result.resourcesFreed).toBeDefined();
      expect(result.finalCost).toBeGreaterThanOrEqual(0);
    });

    test("should handle cleanup of already destroyed environments", async () => {
      const environmentId = "env-already-destroyed";

      const result = await modalManager.cleanupEnvironment(environmentId);

      expect(result.success).toBe(true);
      expect(result.warning).toContain("already destroyed");
    });

    test("should force cleanup when normal cleanup fails", async () => {
      const environmentId = "env-force-cleanup";

      const result = await modalManager.cleanupEnvironment(environmentId, {
        force: true,
      });

      expect(result.success).toBe(true);
      expect(result.forcedCleanup).toBe(true);
    });
  });

  describe("getEnvironmentLogs", () => {
    test("should retrieve logs from Modal function", async () => {
      const environmentId = "env-logs";

      const logs = await modalManager.getEnvironmentLogs(environmentId);

      expect(logs).toBeInstanceOf(Array);
      expect(logs.length).toBeGreaterThanOrEqual(0);
      if (logs.length > 0) {
        expect(logs[0]).toHaveProperty("timestamp");
        expect(logs[0]).toHaveProperty("level");
        expect(logs[0]).toHaveProperty("message");
      }
    });

    test("should filter logs by level and time range", async () => {
      const environmentId = "env-filtered-logs";
      const since = new Date(Date.now() - 3600000); // 1 hour ago

      const logs = await modalManager.getEnvironmentLogs(environmentId, {
        level: "error",
        since,
        limit: 100,
      });

      expect(logs).toBeInstanceOf(Array);
      logs.forEach((log) => {
        expect(log.level).toBe("error");
        expect(log.timestamp).toBeInstanceOf(Date);
        expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(since.getTime());
      });
    });
  });

  describe("cost optimization", () => {
    test("should optimize resource allocation based on task requirements", async () => {
      const taskRequirements = {
        cpuIntensive: false,
        memoryIntensive: true,
        networkIntensive: false,
        estimatedDuration: 600, // 10 minutes
      };

      const optimizedConfig = await modalManager.optimizeConfiguration(
        taskRequirements,
      );

      expect(optimizedConfig.memory).toBeGreaterThan(2048); // Should allocate more memory
      expect(optimizedConfig.cpu).toBeLessThanOrEqual(2); // Should not over-allocate CPU
      expect(optimizedConfig.timeout).toBeGreaterThanOrEqual(600);
    });

    test("should track and report cost metrics", async () => {
      const environmentId = "env-cost";

      const costMetrics = await modalManager.getCostMetrics(environmentId);

      expect(costMetrics).toHaveProperty("totalCost");
      expect(costMetrics).toHaveProperty("cpuCost");
      expect(costMetrics).toHaveProperty("memoryCost");
      expect(costMetrics).toHaveProperty("networkCost");
      expect(costMetrics.totalCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe("error handling", () => {
    test("should handle Modal API rate limits gracefully", async () => {
      // Simulate rate limit by making many requests
      const promises = Array.from({ length: 100 }, (_, i) =>
        modalManager.createAgentEnvironment(`task-${i}`, {
          name: `agent-${i}`,
          image: "node:18",
          cpu: 1,
          memory: 1024,
          timeout: 300,
          secrets: [],
          mounts: [],
          environment: {},
          retries: 1,
          concurrency: 1,
        }),
      );

      const results = await Promise.allSettled(promises);
      const rateLimitedResults = results.filter(
        (result) =>
          result.status === "fulfilled" &&
          !result.value.success &&
          result.value.error?.code === "RATE_LIMITED",
      );

      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });

    test("should implement circuit breaker for failing functions", async () => {
      const functionId = "func-circuit-breaker";

      // Simulate multiple failures to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await modalManager.executeFunction(functionId, {
          command: "exit 1", // Command that will fail
        });
      }

      // Next call should be rejected by circuit breaker
      const result = await modalManager.executeFunction(functionId, {
        command: "echo 'test'",
      });

      expect(result.status).toBe("failed");
      expect(result.error).toContain("circuit breaker");
    });
  });
});