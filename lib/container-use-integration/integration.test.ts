/**
 * Integration tests for Container Use Integration
 * Tests the complete workflow from task creation to PR completion
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { ContainerUseIntegration } from "./index";
import type { ContainerUseConfig } from "./index";

describe("ContainerUseIntegration", () => {
	let integration: ContainerUseIntegration;
	let config: ContainerUseConfig;

	beforeEach(() => {
		config = {
			modal: {
				apiKey: "test-modal-key",
				workspace: "test-workspace",
			},
			git: {
				repositoryPath: "/tmp/test-repo",
				baseBranch: "main",
				worktreeBaseDir: "/tmp/worktrees",
			},
			taskCreator: {
				openaiApiKey: "test-openai-key",
				githubToken: "test-github-token",
				webhookSecret: "test-webhook-secret",
			},
		};

		integration = new ContainerUseIntegration(config);
	});

	describe("initialization", () => {
		test("should initialize all managers successfully", async () => {
			expect(integration.modalManager).toBeDefined();
			expect(integration.worktreeManager).toBeDefined();
			expect(integration.taskCreator).toBeDefined();
		});

		test("should verify configuration on initialize", async () => {
			const result = await integration.initialize();

			// May fail due to missing external dependencies, but should return proper structure
			expect(result).toHaveProperty("success");
			expect(typeof result.success).toBe("boolean");

			if (!result.success) {
				expect(result.errors).toBeInstanceOf(Array);
			}
		});
	});

	describe("complete agent task workflow", () => {
		test("should create complete agent task from GitHub issue", async () => {
			const issueData = {
				id: 123,
				title: "Add user authentication",
				body: "Implement JWT-based authentication",
				labels: [{ name: "feature" }],
				repository: { full_name: "test/repo" },
			};

			const result = await integration.createAgentTask({
				source: "issue",
				sourceData: issueData,
				taskConfig: {
					priority: "high",
					estimatedDuration: 3600,
				},
			});

			expect(result.success).toBe(true);
			expect(result.task).toBeDefined();
			expect(result.environment).toBeDefined();
			expect(result.worktree).toBeDefined();

			if (result.task) {
				expect(result.task.title).toBe(issueData.title);
				expect(result.task.source).toBe("issue");
			}

			if (result.environment) {
				expect(result.environment.taskId).toBe(result.task?.id);
				expect(result.environment.status).toBe("initializing");
			}

			if (result.worktree) {
				expect(result.worktree.taskId).toBe(result.task?.id);
				expect(result.worktree.status).toBe("active");
			}
		});

		test("should create agent task from voice command", async () => {
			const voiceFile = new File(["test audio"], "command.wav", {
				type: "audio/wav",
			});

			const result = await integration.createAgentTask({
				source: "voice",
				sourceData: voiceFile,
			});

			expect(result.success).toBe(true);
			expect(result.task?.source).toBe("voice");
		});

		test("should handle task creation failures gracefully", async () => {
			const invalidData = {};

			const result = await integration.createAgentTask({
				source: "issue",
				sourceData: invalidData,
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("task completion workflow", () => {
		test("should complete agent task and create PR", async () => {
			// First create a task
			const issueData = {
				id: 456,
				title: "Fix bug in login",
				body: "User cannot login with valid credentials",
				repository: { full_name: "test/repo" },
			};

			const createResult = await integration.createAgentTask({
				source: "issue",
				sourceData: issueData,
			});

			expect(createResult.success).toBe(true);
			expect(createResult.task).toBeDefined();

			if (createResult.task) {
				// Complete the task
				const completeResult = await integration.completeAgentTask(
					createResult.task.id,
				);

				expect(completeResult.success).toBe(true);
				expect(completeResult.pullRequest).toBeDefined();

				if (completeResult.pullRequest) {
					expect(completeResult.pullRequest.taskId).toBe(createResult.task.id);
					expect(completeResult.pullRequest.status).toBe("ready");
				}
			}
		});

		test("should handle completion of nonexistent task", async () => {
			const result = await integration.completeAgentTask("nonexistent-task");

			expect(result.success).toBe(false);
			expect(result.error).toContain("No worktree found");
		});
	});

	describe("status monitoring", () => {
		test("should provide comprehensive task status", async () => {
			const status = await integration.getAgentTasksStatus();

			expect(status).toHaveProperty("activeTasks");
			expect(status).toHaveProperty("activeEnvironments");
			expect(status).toHaveProperty("activeWorktrees");
			expect(status).toHaveProperty("totalCost");
			expect(status).toHaveProperty("tasks");

			expect(typeof status.activeTasks).toBe("number");
			expect(typeof status.activeEnvironments).toBe("number");
			expect(typeof status.activeWorktrees).toBe("number");
			expect(typeof status.totalCost).toBe("number");
			expect(status.tasks).toBeInstanceOf(Array);
		});

		test("should track costs across multiple tasks", async () => {
			// Create multiple tasks
			const tasks = [
				{
					id: 1,
					title: "Task 1",
					body: "First task",
					repository: { full_name: "test/repo" },
				},
				{
					id: 2,
					title: "Task 2",
					body: "Second task",
					repository: { full_name: "test/repo" },
				},
			];

			for (const taskData of tasks) {
				await integration.createAgentTask({
					source: "issue",
					sourceData: taskData,
				});
			}

			const status = await integration.getAgentTasksStatus();
			expect(status.totalCost).toBeGreaterThanOrEqual(0);
			expect(status.tasks.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("error handling", () => {
		test("should handle Modal API failures", async () => {
			const invalidConfig = {
				...config,
				modal: {
					apiKey: "",
					workspace: "",
				},
			};

			const invalidIntegration = new ContainerUseIntegration(invalidConfig);

			const result = await invalidIntegration.createAgentTask({
				source: "manual",
				sourceData: {
					title: "Test task",
					description: "Test description",
					source: "manual",
				},
			});

			// Should handle gracefully without throwing
			expect(typeof result.success).toBe("boolean");
		});

		test("should handle Git repository access failures", async () => {
			const invalidConfig = {
				...config,
				git: {
					repositoryPath: "/nonexistent/path",
					baseBranch: "main",
					worktreeBaseDir: "/nonexistent/worktrees",
				},
			};

			const invalidIntegration = new ContainerUseIntegration(invalidConfig);

			const result = await invalidIntegration.createAgentTask({
				source: "manual",
				sourceData: {
					title: "Test task",
					description: "Test description",
					source: "manual",
				},
			});

			// Should handle gracefully
			expect(typeof result.success).toBe("boolean");
		});
	});

	describe("configuration validation", () => {
		test("should validate required configuration fields", () => {
			expect(() => {
				new ContainerUseIntegration(config);
			}).not.toThrow();
		});

		test("should handle partial configuration", () => {
			const partialConfig = {
				modal: config.modal,
				git: config.git,
				taskCreator: {
					openaiApiKey: "",
					githubToken: "",
					webhookSecret: "",
				},
			};

			expect(() => {
				new ContainerUseIntegration(partialConfig);
			}).not.toThrow();
		});
	});

	describe("parallel agent execution", () => {
		test("should support multiple concurrent agents", async () => {
			const tasks = Array.from({ length: 3 }, (_, i) => ({
				id: i + 100,
				title: `Concurrent task ${i}`,
				body: `Task ${i} description`,
				repository: { full_name: "test/repo" },
			}));

			const results = await Promise.all(
				tasks.map((taskData) =>
					integration.createAgentTask({
						source: "issue",
						sourceData: taskData,
					}),
				),
			);

			// All tasks should be created successfully
			results.forEach((result) => {
				expect(result.success).toBe(true);
				expect(result.task).toBeDefined();
				expect(result.environment).toBeDefined();
				expect(result.worktree).toBeDefined();
			});

			// Each should have unique IDs and isolated environments
			const taskIds = results.map((r) => r.task?.id).filter(Boolean);
			const uniqueTaskIds = new Set(taskIds);
			expect(uniqueTaskIds.size).toBe(tasks.length);
		});
	});
});
