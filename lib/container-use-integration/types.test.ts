/**
 * Container Use Integration Types Tests
 *
 * Comprehensive test coverage for Modal Labs integration types,
 * git worktree management, task creation, and agent coordination types.
 */

import { describe, expect, it } from "vitest";
import {
	type AgentEnvironment,
	AgentMessage,
	type AgentPR,
	type AgentState,
	type ContainerUseError,
	GitCommit,
	type GitWorktree,
	isAgentEnvironment,
	isGitWorktree,
	isScreenshotAnalysis,
	isTask,
	isVoiceCommand,
	type LogEntry,
	type ModalFunctionConfig,
	type ModalFunctionResponse,
	type MountConfig,
	type ScreenshotAnalysis,
	type Task,
	type TaskCreationResult,
	type VoiceCommand,
	type WorktreeOperationResult,
} from "./types";

describe("Container Use Integration Types", () => {
	describe("ModalFunctionConfig Interface", () => {
		it("should define valid modal function configuration", () => {
			const config: ModalFunctionConfig = {
				name: "test-function",
				image: "python:3.11",
				cpu: 2,
				memory: 4096,
				timeout: 300,
				secrets: ["API_KEY", "DATABASE_URL"],
				mounts: [
					{
						local_path: "/local/code",
						remote_path: "/app/code",
						condition: "always",
					},
				],
				environment: {
					NODE_ENV: "production",
					DEBUG: "false",
				},
				retries: 3,
				concurrency: 5,
			};

			expect(config.name).toBe("test-function");
			expect(config.cpu).toBe(2);
			expect(config.memory).toBe(4096);
			expect(config.secrets).toContain("API_KEY");
			expect(config.mounts).toHaveLength(1);
			expect(config.environment.NODE_ENV).toBe("production");
		});

		it("should handle mount configurations", () => {
			const mount: MountConfig = {
				local_path: "/host/data",
				remote_path: "/container/data",
				condition: "if-exists",
			};

			expect(mount.local_path).toBe("/host/data");
			expect(mount.remote_path).toBe("/container/data");
			expect(mount.condition).toBe("if-exists");
		});
	});

	describe("AgentEnvironment Interface", () => {
		it("should define complete agent environment", () => {
			const environment: AgentEnvironment = {
				id: "env-123",
				taskId: "task-456",
				modalFunctionId: "func-789",
				status: "running",
				worktreePath: "/workspaces/task-456",
				branchName: "feature/task-456",
				dependencies: ["nodejs", "python", "git"],
				environmentVariables: {
					PATH: "/usr/bin:/bin",
					HOME: "/workspace",
				},
				resourceUsage: {
					cpu: 1.5,
					memory: 2048,
					executionTime: 120,
					cost: 0.05,
				},
				logs: [
					{
						id: "log-1",
						timestamp: new Date(),
						level: "info",
						message: "Environment initialized",
						metadata: { phase: "init" },
					},
				],
				createdAt: new Date(),
				destroyedAt: undefined,
			};

			expect(environment.id).toBe("env-123");
			expect(environment.status).toBe("running");
			expect(["initializing", "ready", "running", "completed", "failed"]).toContain(
				environment.status
			);
			expect(environment.resourceUsage.cpu).toBe(1.5);
			expect(environment.logs).toHaveLength(1);
			expect(environment.logs[0].level).toBe("info");
		});

		it("should support all valid statuses", () => {
			const validStatuses = ["initializing", "ready", "running", "completed", "failed"];

			validStatuses.forEach((status) => {
				const environment: Partial<AgentEnvironment> = {
					status: status as AgentEnvironment["status"],
				};

				expect(validStatuses).toContain(environment.status);
			});
		});

		it("should handle log entries with different levels", () => {
			const logLevels: LogEntry["level"][] = ["debug", "info", "warn", "error"];

			logLevels.forEach((level) => {
				const log: LogEntry = {
					id: `log-${level}`,
					timestamp: new Date(),
					level,
					message: `Test ${level} message`,
					metadata: { level },
				};

				expect(log.level).toBe(level);
				expect(["debug", "info", "warn", "error"]).toContain(log.level);
			});
		});
	});

	describe("GitWorktree Interface", () => {
		it("should define complete git worktree", () => {
			const worktree: GitWorktree = {
				id: "wt-123",
				taskId: "task-456",
				path: "/workspaces/task-456",
				branchName: "feature/new-feature",
				baseBranch: "main",
				status: "active",
				commits: [
					{
						hash: "abc123def",
						message: "Initial commit for task",
						author: "agent@example.com",
						timestamp: new Date(),
						files: ["src/index.ts", "tests/index.test.ts"],
					},
				],
				conflictStatus: {
					hasConflicts: false,
					conflictFiles: [],
					resolutionStrategy: "auto",
				},
				createdAt: new Date(),
				mergedAt: undefined,
				cleanedUpAt: undefined,
			};

			expect(worktree.id).toBe("wt-123");
			expect(worktree.status).toBe("active");
			expect(["active", "merged", "abandoned"]).toContain(worktree.status);
			expect(worktree.commits).toHaveLength(1);
			expect(worktree.commits[0].hash).toBe("abc123def");
			expect(worktree.conflictStatus?.hasConflicts).toBe(false);
		});

		it("should handle conflict scenarios", () => {
			const conflictWorktree: GitWorktree = {
				id: "wt-conflict",
				taskId: "task-conflict",
				path: "/workspaces/conflict",
				branchName: "feature/conflict",
				baseBranch: "main",
				status: "active",
				commits: [],
				conflictStatus: {
					hasConflicts: true,
					conflictFiles: ["src/app.ts", "package.json"],
					resolutionStrategy: "manual",
				},
				createdAt: new Date(),
			};

			expect(conflictWorktree.conflictStatus?.hasConflicts).toBe(true);
			expect(conflictWorktree.conflictStatus?.conflictFiles).toContain("src/app.ts");
			expect(conflictWorktree.conflictStatus?.resolutionStrategy).toBe("manual");
			expect(["auto", "manual", "escalate"]).toContain(
				conflictWorktree.conflictStatus?.resolutionStrategy
			);
		});
	});

	describe("Task Interface", () => {
		it("should define complete task structure", () => {
			const task: Task = {
				id: "task-123",
				title: "Implement user authentication",
				description: "Add JWT-based authentication system",
				source: "issue",
				sourceId: "issue-456",
				priority: "high",
				status: "in_progress",
				assignedAgent: "agent-auth-specialist",
				modalFunctionId: "func-auth",
				worktreePath: "/workspaces/task-123",
				branchName: "feature/auth-system",
				estimatedDuration: 240,
				actualDuration: 180,
				createdAt: new Date(),
				updatedAt: new Date(),
				completedAt: undefined,
				metadata: {
					complexity: "high",
					tags: ["authentication", "security"],
					requirements: ["JWT", "bcrypt", "rate-limiting"],
				},
			};

			expect(task.id).toBe("task-123");
			expect(task.source).toBe("issue");
			expect(["issue", "pr_comment", "voice", "screenshot", "manual"]).toContain(task.source);
			expect(task.priority).toBe("high");
			expect(["low", "medium", "high", "urgent"]).toContain(task.priority);
			expect(task.status).toBe("in_progress");
			expect(["queued", "assigned", "in_progress", "completed", "failed"]).toContain(task.status);
			expect(task.estimatedDuration).toBe(240);
		});

		it("should support all task sources", () => {
			const sources: Task["source"][] = ["issue", "pr_comment", "voice", "screenshot", "manual"];

			sources.forEach((source) => {
				const task: Partial<Task> = {
					source,
					sourceId: `${source}-123`,
				};

				expect(sources).toContain(task.source);
			});
		});

		it("should support all priority levels", () => {
			const priorities: Task["priority"][] = ["low", "medium", "high", "urgent"];

			priorities.forEach((priority) => {
				const task: Partial<Task> = {
					priority,
				};

				expect(priorities).toContain(task.priority);
			});
		});
	});

	describe("VoiceCommand Interface", () => {
		it("should define complete voice command", () => {
			const voiceCommand: VoiceCommand = {
				id: "voice-123",
				audioUrl: "https://storage.example.com/audio/voice-123.wav",
				transcription: "Create a new task for implementing user dashboard",
				confidence: 0.95,
				intent: {
					action: "create_task",
					parameters: {
						title: "Implement user dashboard",
						priority: "medium",
						description: "Create responsive user dashboard with analytics",
					},
				},
				taskId: "task-from-voice-123",
				processedAt: new Date(),
				status: "completed",
			};

			expect(voiceCommand.id).toBe("voice-123");
			expect(voiceCommand.confidence).toBe(0.95);
			expect(voiceCommand.intent.action).toBe("create_task");
			expect(["create_task", "check_status", "modify_task"]).toContain(voiceCommand.intent.action);
			expect(voiceCommand.status).toBe("completed");
			expect(["processing", "completed", "failed"]).toContain(voiceCommand.status);
		});

		it("should handle different voice command intents", () => {
			const intents: VoiceCommand["intent"]["action"][] = [
				"create_task",
				"check_status",
				"modify_task",
			];

			intents.forEach((action) => {
				const voiceCommand: Partial<VoiceCommand> = {
					intent: {
						action,
						parameters: { action },
					},
				};

				expect(intents).toContain(voiceCommand.intent?.action);
			});
		});
	});

	describe("ScreenshotAnalysis Interface", () => {
		it("should define complete screenshot analysis", () => {
			const analysis: ScreenshotAnalysis = {
				id: "screenshot-123",
				imageUrl: "https://storage.example.com/screenshots/bug-123.png",
				analysis: {
					detectedIssues: [
						"Button alignment is off by 2px",
						"Color contrast ratio below WCAG standards",
					],
					suggestedFixes: [
						"Adjust button margin-left to 16px",
						"Change button background color to #0066cc",
					],
					affectedComponents: ["LoginButton", "HeaderNav"],
					severity: "medium",
				},
				taskId: "task-from-screenshot-123",
				processedAt: new Date(),
				confidence: 0.87,
			};

			expect(analysis.id).toBe("screenshot-123");
			expect(analysis.analysis.detectedIssues).toHaveLength(2);
			expect(analysis.analysis.severity).toBe("medium");
			expect(["low", "medium", "high"]).toContain(analysis.analysis.severity);
			expect(analysis.confidence).toBe(0.87);
			expect(analysis.confidence).toBeGreaterThan(0);
			expect(analysis.confidence).toBeLessThanOrEqual(1);
		});
	});

	describe("AgentPR Interface", () => {
		it("should define complete agent PR", () => {
			const agentPR: AgentPR = {
				id: "pr-123",
				taskId: "task-456",
				githubPRNumber: 142,
				title: "feat: implement user authentication system",
				description: "Comprehensive JWT-based authentication with rate limiting",
				branchName: "feature/auth-system",
				status: "ready",
				reviewStatus: {
					automated: "passed",
					human: "pending",
				},
				ciStatus: {
					tests: "passed",
					quality: "passed",
					security: "pending",
				},
				autoMergeEligible: false,
				createdAt: new Date(),
				mergedAt: undefined,
			};

			expect(agentPR.githubPRNumber).toBe(142);
			expect(agentPR.status).toBe("ready");
			expect(["draft", "ready", "approved", "merged", "closed"]).toContain(agentPR.status);
			expect(agentPR.reviewStatus.automated).toBe("passed");
			expect(["pending", "passed", "failed"]).toContain(agentPR.reviewStatus.automated);
			expect(agentPR.autoMergeEligible).toBe(false);
		});
	});

	describe("AgentState Interface", () => {
		it("should define complete agent state", () => {
			const agentState: AgentState = {
				id: "agent-123",
				taskId: "task-456",
				status: "working",
				currentOperation: "Implementing authentication middleware",
				context: {
					currentFile: "src/auth/middleware.ts",
					lastAction: "file_edit",
					progress: 0.65,
				},
				memory: {
					userPreferences: { theme: "dark", language: "typescript" },
					recentPatterns: ["jwt", "middleware", "express"],
				},
				performance: {
					tasksCompleted: 23,
					averageCompletionTime: 145,
					successRate: 0.91,
					lastActiveAt: new Date(),
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			expect(agentState.id).toBe("agent-123");
			expect(agentState.status).toBe("working");
			expect(["idle", "initializing", "working", "waiting", "completed", "failed"]).toContain(
				agentState.status
			);
			expect(agentState.performance.successRate).toBe(0.91);
			expect(agentState.performance.tasksCompleted).toBe(23);
		});
	});

	describe("Type Guards", () => {
		describe("isTask", () => {
			it("should validate valid task objects", () => {
				const validTask: Task = {
					id: "task-123",
					title: "Test Task",
					description: "Test Description",
					source: "manual",
					sourceId: "manual-123",
					priority: "medium",
					status: "queued",
					createdAt: new Date(),
					updatedAt: new Date(),
					metadata: {},
				};

				expect(isTask(validTask)).toBe(true);
			});

			it("should reject invalid task objects", () => {
				const invalidTasks = [
					null,
					undefined,
					{},
					{ id: "task-123" }, // Missing required fields
					{
						id: "task-123",
						title: "Test",
						description: "Test",
						source: "invalid_source", // Invalid source
						sourceId: "test",
						priority: "medium",
						status: "queued",
						createdAt: new Date(),
						updatedAt: new Date(),
						metadata: {},
					},
					{
						id: "task-123",
						title: "Test",
						description: "Test",
						source: "manual",
						sourceId: "test",
						priority: "invalid_priority", // Invalid priority
						status: "queued",
						createdAt: new Date(),
						updatedAt: new Date(),
						metadata: {},
					},
				];

				invalidTasks.forEach((task) => {
					expect(isTask(task)).toBe(false);
				});
			});
		});

		describe("isAgentEnvironment", () => {
			it("should validate valid agent environment objects", () => {
				const validEnvironment: AgentEnvironment = {
					id: "env-123",
					taskId: "task-456",
					modalFunctionId: "func-789",
					status: "ready",
					worktreePath: "/workspace",
					branchName: "main",
					dependencies: [],
					environmentVariables: {},
					resourceUsage: { cpu: 1, memory: 1024, executionTime: 60, cost: 0.01 },
					logs: [],
					createdAt: new Date(),
				};

				expect(isAgentEnvironment(validEnvironment)).toBe(true);
			});

			it("should reject invalid agent environment objects", () => {
				const invalidEnvironments = [
					null,
					undefined,
					{},
					{ id: "env-123" }, // Missing required fields
					{
						id: "env-123",
						taskId: "task-456",
						modalFunctionId: "func-789",
						status: "invalid_status", // Invalid status
						worktreePath: "/workspace",
						branchName: "main",
						dependencies: [],
						environmentVariables: {},
						resourceUsage: { cpu: 1, memory: 1024, executionTime: 60, cost: 0.01 },
						logs: [],
						createdAt: new Date(),
					},
				];

				invalidEnvironments.forEach((env) => {
					expect(isAgentEnvironment(env)).toBe(false);
				});
			});
		});

		describe("isGitWorktree", () => {
			it("should validate valid git worktree objects", () => {
				const validWorktree: GitWorktree = {
					id: "wt-123",
					taskId: "task-456",
					path: "/workspace",
					branchName: "feature-branch",
					baseBranch: "main",
					status: "active",
					commits: [],
					createdAt: new Date(),
				};

				expect(isGitWorktree(validWorktree)).toBe(true);
			});

			it("should reject invalid git worktree objects", () => {
				const invalidWorktrees = [
					null,
					undefined,
					{},
					{ id: "wt-123" }, // Missing required fields
					{
						id: "wt-123",
						taskId: "task-456",
						path: "/workspace",
						branchName: "feature-branch",
						baseBranch: "main",
						status: "invalid_status", // Invalid status
						commits: [],
						createdAt: new Date(),
					},
				];

				invalidWorktrees.forEach((worktree) => {
					expect(isGitWorktree(worktree)).toBe(false);
				});
			});
		});

		describe("isVoiceCommand", () => {
			it("should validate valid voice command objects", () => {
				const validVoiceCommand: VoiceCommand = {
					id: "voice-123",
					audioUrl: "https://example.com/audio.wav",
					transcription: "Create a new task",
					confidence: 0.95,
					intent: {
						action: "create_task",
						parameters: {},
					},
					processedAt: new Date(),
					status: "completed",
				};

				expect(isVoiceCommand(validVoiceCommand)).toBe(true);
			});

			it("should reject invalid voice command objects", () => {
				const invalidVoiceCommands = [
					null,
					undefined,
					{},
					{ id: "voice-123" }, // Missing required fields
					{
						id: "voice-123",
						audioUrl: "https://example.com/audio.wav",
						transcription: "Create a new task",
						confidence: "invalid", // Invalid confidence type
						intent: { action: "create_task", parameters: {} },
						processedAt: new Date(),
						status: "completed",
					},
				];

				invalidVoiceCommands.forEach((command) => {
					expect(isVoiceCommand(command)).toBe(false);
				});
			});
		});

		describe("isScreenshotAnalysis", () => {
			it("should validate valid screenshot analysis objects", () => {
				const validAnalysis: ScreenshotAnalysis = {
					id: "screenshot-123",
					imageUrl: "https://example.com/image.png",
					analysis: {
						detectedIssues: [],
						suggestedFixes: [],
						affectedComponents: [],
						severity: "low",
					},
					processedAt: new Date(),
					confidence: 0.85,
				};

				expect(isScreenshotAnalysis(validAnalysis)).toBe(true);
			});

			it("should reject invalid screenshot analysis objects", () => {
				const invalidAnalyses = [
					null,
					undefined,
					{},
					{ id: "screenshot-123" }, // Missing required fields
					{
						id: "screenshot-123",
						imageUrl: "https://example.com/image.png",
						analysis: "invalid", // Invalid analysis type
						processedAt: new Date(),
						confidence: 0.85,
					},
				];

				invalidAnalyses.forEach((analysis) => {
					expect(isScreenshotAnalysis(analysis)).toBe(false);
				});
			});
		});
	});

	describe("Response and Result Types", () => {
		it("should define modal function response", () => {
			const response: ModalFunctionResponse = {
				functionId: "func-123",
				status: "completed",
				result: { success: true, data: { processed: 100 } },
				error: undefined,
				logs: [
					{
						id: "log-1",
						timestamp: new Date(),
						level: "info",
						message: "Function completed successfully",
					},
				],
				resourceUsage: {
					cpu: 1.2,
					memory: 2048,
					executionTime: 45,
					cost: 0.02,
				},
			};

			expect(response.functionId).toBe("func-123");
			expect(response.status).toBe("completed");
			expect(["pending", "running", "completed", "failed"]).toContain(response.status);
			expect(response.result).toBeDefined();
			expect(response.logs).toHaveLength(1);
		});

		it("should define worktree operation result", () => {
			const successResult: WorktreeOperationResult = {
				success: true,
				worktree: {
					id: "wt-123",
					taskId: "task-456",
					path: "/workspace",
					branchName: "feature",
					baseBranch: "main",
					status: "active",
					commits: [],
					createdAt: new Date(),
				},
				error: undefined,
				conflicts: undefined,
			};

			const failureResult: WorktreeOperationResult = {
				success: false,
				worktree: undefined,
				error: "Failed to create worktree: branch already exists",
				conflicts: ["src/app.ts", "package.json"],
			};

			expect(successResult.success).toBe(true);
			expect(successResult.worktree).toBeDefined();
			expect(failureResult.success).toBe(false);
			expect(failureResult.error).toContain("branch already exists");
			expect(failureResult.conflicts).toHaveLength(2);
		});

		it("should define task creation result", () => {
			const result: TaskCreationResult = {
				success: true,
				task: {
					id: "task-123",
					title: "New Task",
					description: "Task description",
					source: "manual",
					sourceId: "manual-123",
					priority: "medium",
					status: "queued",
					createdAt: new Date(),
					updatedAt: new Date(),
					metadata: {},
				},
				error: undefined,
				warnings: ["Task priority was adjusted due to resource constraints"],
			};

			expect(result.success).toBe(true);
			expect(result.task).toBeDefined();
			expect(result.warnings).toHaveLength(1);
		});
	});

	describe("Error Types", () => {
		it("should define container use error", () => {
			const error: ContainerUseError = {
				code: "MODAL_FUNCTION_TIMEOUT",
				message: "Modal function execution exceeded timeout limit",
				details: {
					functionId: "func-123",
					timeoutLimit: 300,
					actualDuration: 450,
				},
				timestamp: new Date(),
				recoverable: true,
			};

			expect(error.code).toBe("MODAL_FUNCTION_TIMEOUT");
			expect(error.recoverable).toBe(true);
			expect(error.details?.functionId).toBe("func-123");
			expect(error.timestamp).toBeInstanceOf(Date);
		});
	});

	describe("Edge Cases and Boundaries", () => {
		it("should handle confidence score boundaries", () => {
			const voiceCommands = [
				{ confidence: 0 }, // Minimum
				{ confidence: 0.5 }, // Middle
				{ confidence: 1 }, // Maximum
			];

			voiceCommands.forEach((command, index) => {
				expect(command.confidence).toBeGreaterThanOrEqual(0);
				expect(command.confidence).toBeLessThanOrEqual(1);
			});
		});

		it("should handle empty arrays and optional fields", () => {
			const task: Task = {
				id: "minimal-task",
				title: "Minimal Task",
				description: "Description",
				source: "manual",
				sourceId: "manual-1",
				priority: "low",
				status: "queued",
				createdAt: new Date(),
				updatedAt: new Date(),
				metadata: {}, // Empty metadata
			};

			expect(isTask(task)).toBe(true);
			expect(Object.keys(task.metadata)).toHaveLength(0);
		});

		it("should handle complex metadata structures", () => {
			const complexTask: Task = {
				id: "complex-task",
				title: "Complex Task",
				description: "Complex Description",
				source: "voice",
				sourceId: "voice-complex",
				priority: "urgent",
				status: "in_progress",
				createdAt: new Date(),
				updatedAt: new Date(),
				metadata: {
					nested: {
						level1: {
							level2: ["array", "of", "strings"],
							level2b: { key: "value" },
						},
					},
					tags: ["complex", "nested", "metadata"],
					numbers: [1, 2, 3, 4, 5],
					boolean: true,
				},
			};

			expect(isTask(complexTask)).toBe(true);
			expect(Array.isArray((complexTask.metadata.nested as any).level1.level2)).toBe(true);
			expect((complexTask.metadata.tags as string[]).length).toBe(3);
		});
	});
});
