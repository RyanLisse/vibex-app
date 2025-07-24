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
import { ContainerUseError } from "./types";

// Type Guards
export {
	isAgentEnvironment,
	isGitWorktree,
	isScreenshotAnalysis,
	isTask,
	isVoiceCommand,
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
					taskResult = await this.taskCreator.createTaskFromIssue(params.sourceData);
					break;
				case "pr_comment":
					taskResult = await this.taskCreator.createTaskFromPRComment(params.sourceData);
					break;
				case "voice":
					taskResult = await this.taskCreator.createTaskFromVoiceCommand(params.sourceData);
					break;
				case "screenshot":
					taskResult = await this.taskCreator.createTaskFromScreenshot(params.sourceData);
					break;
				case "manual":
					taskResult = await this.taskCreator.validateAndEnrichTask(params.sourceData);
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
			const worktreeResult = await this.worktreeManager.createWorktree(task.id, branchName);

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
					NODE_ENV: "production",
				},
			};

			return {
				task,
				environment: agentEnvironment,
				modalConfig,
			};
		} catch (error) {
			throw new ContainerUseError(
				`Failed to create agent task: ${(error as Error).message}`,
				"TASK_CREATION_FAILED",
				{ params }
			);
		}
	}
}
