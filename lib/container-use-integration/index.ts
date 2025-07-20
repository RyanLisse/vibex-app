/**
 * Container Use Integration - Main Index
 *
 * This module provides Modal Labs integration for isolated agent environments,
 * Git worktree management for parallel development, and multi-source task creation.
 *
 * Implemented using Test-Driven Development (TDD) approach following the
 * specifications in .kiro/specs/container-use-integration/
 */

// Core Managers
import { ModalFunctionManager } from "./modal-manager";
import { GitWorktreeManager } from "./worktree-manager";
import { MultiSourceTaskCreator } from "./task-creator";

export { ModalFunctionManager, GitWorktreeManager, MultiSourceTaskCreator };

// Types
export type {
	// Modal Labs Types
	ModalFunctionConfig,
	AgentEnvironment,
	ModalFunctionResponse,
	LogEntry,
	// Git Worktree Types
	GitWorktree,
	WorktreeOperationResult,
	GitCommit,
	// Task Management Types
	Task,
	VoiceCommand,
	ScreenshotAnalysis,
	TaskCreationResult,
	AgentPR,
	AgentState,
	AgentMessage,
	// Utility Types
	ContainerUseError,
} from "./types";

// Type Guards
export {
	isTask,
	isAgentEnvironment,
	isGitWorktree,
	isVoiceCommand,
	isScreenshotAnalysis,
} from "./types";

/**
 * Container Use Integration Factory
 *
 * Provides a convenient way to initialize all managers with consistent configuration.
 */
export interface ContainerUseConfig {
	modal: {
		apiKey: string;
		workspace: string;
	};
	git: {
		repositoryPath: string;
		baseBranch: string;
		worktreeBaseDir: string;
	};
	taskCreator: {
		openaiApiKey: string;
		githubToken: string;
		webhookSecret: string;
	};
}

export class ContainerUseIntegration {
	public readonly modalManager: ModalFunctionManager;
	public readonly worktreeManager: GitWorktreeManager;
	public readonly taskCreator: MultiSourceTaskCreator;

	constructor(config: ContainerUseConfig) {
		this.modalManager = new ModalFunctionManager(config.modal);
		this.worktreeManager = new GitWorktreeManager(config.git);
		this.taskCreator = new MultiSourceTaskCreator(config.taskCreator);
	}

	/**
	 * Initialize all managers and verify configuration
	 */
	async initialize(): Promise<{ success: boolean; errors?: string[] }> {
		const errors: string[] = [];

		try {
			// Test Modal connection
			await this.modalManager.createAgentEnvironment("test-init", {
				name: "test-init",
				image: "node:18",
				cpu: 1,
				memory: 1024,
				timeout: 300,
				secrets: [],
				mounts: [],
				environment: {},
				retries: 1,
				concurrency: 1,
			});
		} catch (error) {
			errors.push(`Modal initialization failed: ${error}`);
		}

		try {
			// Test git repository access
			await this.worktreeManager.listWorktrees();
		} catch (error) {
			errors.push(`Git repository access failed: ${error}`);
		}

		return {
			success: errors.length === 0,
			errors: errors.length > 0 ? errors : undefined,
		};
	}

	/**
	 * Create a complete agent task workflow
	 */
	async createAgentTask(params: {
		source: "issue" | "pr_comment" | "voice" | "screenshot" | "manual";
		sourceData: any;
		taskConfig?: {
			priority?: Task["priority"];
			estimatedDuration?: number;
		};
		modalConfig?: Partial<ModalFunctionConfig>;
	}): Promise<{
		success: boolean;
		task?: Task;
		environment?: AgentEnvironment;
		worktree?: GitWorktree;
		error?: string;
	}> {
		try {
			// Step 1: Create task from source
			let taskResult;
			switch (params.source) {
				case "issue":
					taskResult = await this.taskCreator.createTaskFromIssue(
						params.sourceData,
					);
					break;
				case "pr_comment":
					taskResult = await this.taskCreator.createTaskFromPRComment(
						params.sourceData,
					);
					break;
				case "voice":
					taskResult = await this.taskCreator.createTaskFromVoiceCommand(
						params.sourceData,
					);
					break;
				case "screenshot":
					taskResult = await this.taskCreator.createTaskFromScreenshot(
						params.sourceData,
					);
					break;
				case "manual":
					taskResult = await this.taskCreator.validateAndEnrichTask(
						params.sourceData,
					);
					break;
				default:
					throw new Error(`Unsupported source type: ${params.source}`);
			}

			if (!taskResult.success || !taskResult.task) {
				return {
					success: false,
					error: taskResult.error || "Failed to create task",
				};
			}

			const task = taskResult.task;

			// Step 2: Create Git worktree
			const branchName = `feature/${task.id}`;
			const worktreeResult = await this.worktreeManager.createWorktree(
				task.id,
				branchName,
			);

			if (!worktreeResult.success || !worktreeResult.worktree) {
				return {
					success: false,
					task,
					error: worktreeResult.error || "Failed to create worktree",
				};
			}

			// Step 3: Create Modal environment
			const modalConfig: ModalFunctionConfig = {
				name: `agent-${task.id}`,
				image: "node:18",
				cpu: 2,
				memory: 4096,
				timeout: params.taskConfig?.estimatedDuration || 3600,
				secrets: ["github-token"],
				mounts: [],
				environment: {
					TASK_ID: task.id,
					BRANCH_NAME: branchName,
					WORKTREE_PATH: worktreeResult.worktree.path,
				},
				retries: 3,
				concurrency: 1,
				...params.modalConfig,
			};

			const envResult = await this.modalManager.createAgentEnvironment(
				task.id,
				modalConfig,
			);

			if (!envResult.success || !envResult.environment) {
				return {
					success: false,
					task,
					worktree: worktreeResult.worktree,
					error: envResult.error?.message || "Failed to create environment",
				};
			}

			return {
				success: true,
				task,
				environment: envResult.environment,
				worktree: worktreeResult.worktree,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Complete agent task workflow with PR creation
	 */
	async completeAgentTask(taskId: string): Promise<{
		success: boolean;
		pullRequest?: AgentPR;
		error?: string;
	}> {
		try {
			// Step 1: Commit changes in worktree
			const worktrees = await this.worktreeManager.listWorktrees({ taskId });
			if (worktrees.length === 0) {
				return {
					success: false,
					error: "No worktree found for task",
				};
			}

			const worktree = worktrees[0];

			// Step 2: Commit final changes
			await this.worktreeManager.commitChanges(
				worktree.id,
				`Complete task ${taskId}\n\n🤖 Generated with Claude Code\n\nCo-Authored-By: Agent <agent@terragonlabs.com>`,
			);

			// Step 3: Create pull request
			const mergeResult = await this.worktreeManager.mergeToMain(worktree.id, {
				createPR: true,
				prTitle: `Complete task: ${taskId}`,
			});

			if (!mergeResult.success || !mergeResult.pullRequest) {
				return {
					success: false,
					error: "Failed to create pull request",
				};
			}

			// Step 4: Cleanup environment
			const environments = await this.modalManager.cleanupEnvironment(
				worktree.id,
			);

			const pullRequest: AgentPR = {
				id: `pr-${taskId}`,
				taskId,
				githubPRNumber: mergeResult.pullRequest.number,
				title: mergeResult.pullRequest.title,
				description: `Automated task completion by AI agent`,
				branchName: worktree.branchName,
				status: "ready",
				reviewStatus: {
					automated: "pending",
					human: "pending",
				},
				ciStatus: {
					tests: "pending",
					quality: "pending",
					security: "pending",
				},
				autoMergeEligible: false,
				createdAt: new Date(),
			};

			return {
				success: true,
				pullRequest,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Get comprehensive status of all active agent tasks
	 */
	async getAgentTasksStatus(): Promise<{
		activeTasks: number;
		activeEnvironments: number;
		activeWorktrees: number;
		totalCost: number;
		tasks: Array<{
			task: Task;
			environment?: AgentEnvironment;
			worktree?: GitWorktree;
			status: "initializing" | "running" | "completed" | "failed";
		}>;
	}> {
		const worktrees = await this.worktreeManager.listWorktrees();
		const tasks: any[] = [];
		let totalCost = 0;

		for (const worktree of worktrees) {
			try {
				const costMetrics = await this.modalManager.getCostMetrics(worktree.id);
				totalCost += costMetrics.totalCost;

				tasks.push({
					task: {
						id: worktree.taskId,
						title: `Task ${worktree.taskId}`,
						description: "Agent task",
						source: "manual" as const,
						sourceId: worktree.taskId,
						priority: "medium" as const,
						status: worktree.status === "active" ? "in_progress" : "completed",
						createdAt: worktree.createdAt,
						updatedAt: new Date(),
						metadata: {},
					},
					worktree,
					status: worktree.status === "active" ? "running" : "completed",
				});
			} catch {
				// Skip if environment doesn't exist
			}
		}

		return {
			activeTasks: tasks.filter((t) => t.status === "running").length,
			activeEnvironments: tasks.filter((t) => t.environment).length,
			activeWorktrees: worktrees.filter((w) => w.status === "active").length,
			totalCost,
			tasks,
		};
	}
}

/**
 * Default export for easy importing
 */
export default ContainerUseIntegration;
