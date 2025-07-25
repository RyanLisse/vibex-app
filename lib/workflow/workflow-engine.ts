/**
 * Workflow Orchestration Engine
 *
 * Provides workflow definition storage, execution engine with pause/resume,
 * checkpoint system, and real-time progress tracking.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { type Workflow, type WorkflowExecution, workflowExecutions, workflows } from "@/db/schema";
import { observability } from "@/lib/observability";

export interface WorkflowStep {
	id: string;
	name: string;
	type: "action" | "condition" | "parallel" | "sequential";
	config: Record<string, unknown>;
	dependencies?: string[];
	timeout?: number;
	retryPolicy?: {
		maxRetries: number;
		backoffMs: number;
		exponential: boolean;
	};
}

export interface WorkflowDefinition {
	id: string;
	name: string;
	description?: string;
	version: number;
	steps: WorkflowStep[];
	triggers?: {
		type: "manual" | "scheduled" | "event";
		config: Record<string, unknown>;
	}[];
	variables?: Record<string, unknown>;
	timeout?: number;
	tags?: string[];
}

export interface WorkflowExecutionState {
	currentStep: number;
	stepStates: Record<
		string,
		{
			status: "pending" | "running" | "completed" | "failed" | "skipped";
			startedAt?: Date;
			completedAt?: Date;
			result?: unknown;
			error?: string;
			retryCount: number;
		}
	>;
	variables: Record<string, unknown>;
	checkpoints: Array<{
		stepNumber: number;
		timestamp: Date;
		state: Record<string, unknown>;
	}>;
}

export interface WorkflowExecutionContext {
	executionId: string;
	workflowId: string;
	definition: WorkflowDefinition;
	state: WorkflowExecutionState;
	triggeredBy: string;
	parentExecutionId?: string;
}

export type WorkflowExecutionStatus =
	| "pending"
	| "running"
	| "paused"
	| "completed"
	| "failed"
	| "cancelled";

export interface WorkflowProgress {
	executionId: string;
	workflowId: string;
	status: WorkflowExecutionStatus;
	currentStep: number;
	totalSteps: number;
	completedSteps: number;
	progress: number; // 0-100
	currentStepName?: string;
	estimatedTimeRemaining?: number;
	startedAt: Date;
	lastUpdated: Date;
	error?: string;
}

/**
 * Workflow Orchestration Engine
 */
export class WorkflowEngine {
	private runningExecutions = new Map<string, WorkflowExecutionContext>();
	private stepExecutors = new Map<
		string,
		(step: WorkflowStep, context: WorkflowExecutionContext) => Promise<unknown>
	>();
	private progressListeners = new Map<string, Set<(progress: WorkflowProgress) => void>>();

	constructor() {
		this.registerDefaultExecutors();
	}

	/**
	 * Register default step executors
	 */
	private registerDefaultExecutors() {
		this.stepExecutors.set("action", this.executeActionStep.bind(this));
		this.stepExecutors.set("condition", this.executeConditionStep.bind(this));
		this.stepExecutors.set("parallel", this.executeParallelStep.bind(this));
		this.stepExecutors.set("sequential", this.executeSequentialStep.bind(this));
	}

	/**
	 * Create a new workflow definition
	 */
	async createWorkflow(definition: Omit<WorkflowDefinition, "id">): Promise<Workflow> {
		return observability.trackOperation("workflow.create", async () => {
			const [workflow] = await db
				.insert(workflows)
				.values({
					name: definition.name,
					description: definition.description,
					definition: definition as unknown as Record<string, unknown>,
					version: definition.version,
					tags: definition.tags,
				})
				.returning();

			observability.recordEvent("workflow.created", {
				workflowId: workflow.id,
				name: definition.name,
				version: definition.version,
				stepsCount: definition.steps.length,
			});

			return workflow;
		});
	}

	/**
	 * Get workflow definition by ID
	 */
	async getWorkflow(workflowId: string): Promise<Workflow | null> {
		const [workflow] = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowId))
			.limit(1);

		return workflow || null;
	}

	/**
	 * List all workflows
	 */
	async listWorkflows(isActive?: boolean, limit = 50, offset = 0): Promise<Workflow[]> {
		return observability.trackOperation("workflow.list", async () => {
			const conditions = [];

			if (isActive !== undefined) {
				conditions.push(eq(workflows.isActive, isActive));
			}

			const whereClause =
				conditions.length > 0
					? conditions.length === 1
						? conditions[0]
						: and(...conditions)
					: undefined;

			return db
				.select()
				.from(workflows)
				.where(whereClause)
				.orderBy(desc(workflows.createdAt))
				.limit(limit)
				.offset(offset);
		});
	}

	/**
	 * Update workflow definition
	 */
	async updateWorkflow(
		workflowId: string,
		updates: Partial<WorkflowDefinition>
	): Promise<Workflow> {
		return observability.trackOperation("workflow.update", async () => {
			const [workflow] = await db
				.update(workflows)
				.set({
					name: updates.name,
					description: updates.description,
					definition: updates as unknown as Record<string, unknown>,
					version: updates.version,
					tags: updates.tags,
				})
				.where(eq(workflows.id, workflowId))
				.returning();

			observability.recordEvent("workflow.updated", {
				workflowId,
				version: updates.version,
			});

			return workflow;
		});
	}

	/**
	 * Start workflow execution
	 */
	async startExecution(
		workflowId: string,
		triggeredBy: string,
		initialVariables: Record<string, unknown> = {},
		parentExecutionId?: string
	): Promise<string> {
		return observability.trackOperation("workflow.start-execution", async () => {
			const workflow = await this.getWorkflow(workflowId);
			if (!workflow) {
				throw new Error(`Workflow ${workflowId} not found`);
			}

			const definition = workflow.definition as WorkflowDefinition;
			const initialState: WorkflowExecutionState = {
				currentStep: 0,
				stepStates: {},
				variables: { ...definition.variables, ...initialVariables },
				checkpoints: [],
			};

			// Initialize step states
			definition.steps.forEach((step) => {
				initialState.stepStates[step.id] = {
					status: "pending",
					retryCount: 0,
				};
			});

			const [execution] = await db
				.insert(workflowExecutions)
				.values({
					workflowId,
					status: "running",
					currentStep: 0,
					totalSteps: definition.steps.length,
					state: initialState,
					triggeredBy,
					parentExecutionId,
				})
				.returning();

			const context: WorkflowExecutionContext = {
				executionId: execution.id,
				workflowId,
				definition,
				state: initialState,
				triggeredBy,
				parentExecutionId,
			};

			this.runningExecutions.set(execution.id, context);

			observability.recordEvent("workflow.execution-started", {
				executionId: execution.id,
				workflowId,
				triggeredBy,
				stepsCount: definition.steps.length,
			});

			// Start execution in background
			this.executeWorkflow(context).catch((error) => {
				observability.recordError("workflow.execution-failed", error, {
					executionId: execution.id,
					workflowId,
				});
			});

			return execution.id;
		});
	}

	/**
	 * Execute workflow steps
	 */
	private async executeWorkflow(context: WorkflowExecutionContext): Promise<void> {
		const { executionId, definition, state } = context;

		try {
			while (state.currentStep < definition.steps.length) {
				const step = definition.steps[state.currentStep];
				const stepState = state.stepStates[step.id];

				// Check if execution is paused
				const execution = await this.getExecution(executionId);
				if (execution?.status === "paused") {
					observability.recordEvent("workflow.execution-paused", {
						executionId,
						currentStep: state.currentStep,
					});
					return;
				}

				// Skip if step is already completed
				if (stepState.status === "completed") {
					state.currentStep++;
					continue;
				}

				// Check dependencies
				if (step.dependencies && !this.areDependenciesMet(step.dependencies, state)) {
					stepState.status = "skipped";
					state.currentStep++;
					continue;
				}

				// Execute step
				stepState.status = "running";
				stepState.startedAt = new Date();

				await this.updateExecutionState(executionId, state);

				try {
					const executor = this.stepExecutors.get(step.type);
					if (!executor) {
						throw new Error(`No executor found for step type: ${step.type}`);
					}

					const result = await this.executeStepWithTimeout(step, context, executor);

					stepState.status = "completed";
					stepState.completedAt = new Date();
					stepState.result = result;

					observability.recordEvent("workflow.step-completed", {
						executionId,
						stepId: step.id,
						stepName: step.name,
						stepNumber: state.currentStep,
					});
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : "Unknown error";
					stepState.error = errorMessage;

					// Handle retries
					if (step.retryPolicy && stepState.retryCount < step.retryPolicy.maxRetries) {
						stepState.retryCount++;
						stepState.status = "pending";

						const backoffMs = step.retryPolicy.exponential
							? step.retryPolicy.backoffMs * 2 ** (stepState.retryCount - 1)
							: step.retryPolicy.backoffMs;

						observability.recordEvent("workflow.step-retry", {
							executionId,
							stepId: step.id,
							retryCount: stepState.retryCount,
							backoffMs,
						});

						await new Promise((resolve) => setTimeout(resolve, backoffMs));
						continue; // Retry the step
					}
					stepState.status = "failed";
					stepState.completedAt = new Date();

					observability.recordError("workflow.step-failed", error as Error, {
						executionId,
						stepId: step.id,
						stepName: step.name,
					});

					// Fail the entire workflow
					await this.failExecution(executionId, errorMessage);
					return;
				}

				// Create checkpoint
				await this.createCheckpoint(context);

				state.currentStep++;
				await this.updateExecutionState(executionId, state);

				// Emit progress update
				this.emitProgress(context);
			}

			// All steps completed
			await this.completeExecution(executionId);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			await this.failExecution(executionId, errorMessage);
			throw error;
		} finally {
			this.runningExecutions.delete(executionId);
		}
	}

	/**
	 * Execute step with timeout
	 */
	private async executeStepWithTimeout(
		step: WorkflowStep,
		context: WorkflowExecutionContext,
		executor: (step: WorkflowStep, context: WorkflowExecutionContext) => Promise<unknown>
	): Promise<unknown> {
		const timeout = step.timeout || 300000; // 5 minutes default

		return Promise.race([
			executor(step, context),
			new Promise((_, reject) => {
				setTimeout(() => {
					reject(new Error(`Step ${step.name} timed out after ${timeout}ms`));
				}, timeout);
			}),
		]);
	}

	/**
	 * Check if step dependencies are met
	 */
	private areDependenciesMet(dependencies: string[], state: WorkflowExecutionState): boolean {
		return dependencies.every((depId) => {
			const depState = state.stepStates[depId];
			return depState && depState.status === "completed";
		});
	}

	/**
	 * Create execution checkpoint
	 */
	private async createCheckpoint(context: WorkflowExecutionContext): Promise<void> {
		const checkpoint = {
			stepNumber: context.state.currentStep,
			timestamp: new Date(),
			state: JSON.parse(JSON.stringify(context.state)),
		};

		context.state.checkpoints.push(checkpoint);

		// Keep only last 10 checkpoints
		if (context.state.checkpoints.length > 10) {
			context.state.checkpoints = context.state.checkpoints.slice(-10);
		}

		observability.recordEvent("workflow.checkpoint-created", {
			executionId: context.executionId,
			stepNumber: checkpoint.stepNumber,
		});
	}

	/**
	 * Update execution state in database
	 */
	private async updateExecutionState(
		executionId: string,
		state: WorkflowExecutionState
	): Promise<void> {
		await db
			.update(workflowExecutions)
			.set({
				currentStep: state.currentStep,
				state: state,
			})
			.where(eq(workflowExecutions.id, executionId));
	}

	/**
	 * Complete workflow execution
	 */
	private async completeExecution(executionId: string): Promise<void> {
		await db
			.update(workflowExecutions)
			.set({
				status: "completed",
				completedAt: new Date(),
			})
			.where(eq(workflowExecutions.id, executionId));

		observability.recordEvent("workflow.execution-completed", {
			executionId,
		});
	}

	/**
	 * Fail workflow execution
	 */
	private async failExecution(executionId: string, error: string): Promise<void> {
		await db
			.update(workflowExecutions)
			.set({
				status: "failed",
				error,
				completedAt: new Date(),
			})
			.where(eq(workflowExecutions.id, executionId));

		observability.recordEvent("workflow.execution-failed", {
			executionId,
			error,
		});
	}

	/**
	 * Pause workflow execution
	 */
	async pauseExecution(executionId: string): Promise<void> {
		await db
			.update(workflowExecutions)
			.set({ status: "paused" })
			.where(eq(workflowExecutions.id, executionId));

		observability.recordEvent("workflow.execution-paused", {
			executionId,
		});
	}

	/**
	 * Resume workflow execution
	 */
	async resumeExecution(executionId: string): Promise<void> {
		const execution = await this.getExecution(executionId);
		if (!execution) {
			throw new Error(`Execution ${executionId} not found`);
		}

		await db
			.update(workflowExecutions)
			.set({ status: "running" })
			.where(eq(workflowExecutions.id, executionId));

		// Rebuild context and continue execution
		const workflow = await this.getWorkflow(execution.workflowId);
		if (!workflow) {
			throw new Error(`Workflow ${execution.workflowId} not found`);
		}

		const context: WorkflowExecutionContext = {
			executionId,
			workflowId: execution.workflowId,
			definition: workflow.definition as WorkflowDefinition,
			state: execution.state as WorkflowExecutionState,
			triggeredBy: execution.triggeredBy || "system",
			parentExecutionId: execution.parentExecutionId || undefined,
		};

		this.runningExecutions.set(executionId, context);

		observability.recordEvent("workflow.execution-resumed", {
			executionId,
		});

		// Continue execution
		this.executeWorkflow(context).catch((error) => {
			observability.recordError("workflow.execution-failed", error, {
				executionId,
			});
		});
	}

	/**
	 * Cancel workflow execution
	 */
	async cancelExecution(executionId: string): Promise<void> {
		await db
			.update(workflowExecutions)
			.set({
				status: "cancelled",
				completedAt: new Date(),
			})
			.where(eq(workflowExecutions.id, executionId));

		this.runningExecutions.delete(executionId);

		observability.recordEvent("workflow.execution-cancelled", {
			executionId,
		});
	}

	/**
	 * Get workflow execution
	 */
	async getExecution(executionId: string): Promise<WorkflowExecution | null> {
		const [execution] = await db
			.select()
			.from(workflowExecutions)
			.where(eq(workflowExecutions.id, executionId))
			.limit(1);

		return execution || null;
	}

	/**
	 * Get workflow executions
	 */
	async getExecutions(
		workflowId?: string,
		status?: WorkflowExecutionStatus,
		limit = 50
	): Promise<WorkflowExecution[]> {
		const conditions = [];

		if (workflowId) {
			conditions.push(eq(workflowExecutions.workflowId, workflowId));
		}

		if (status) {
			conditions.push(eq(workflowExecutions.status, status));
		}

		const whereClause =
			conditions.length > 0
				? conditions.length === 1
					? conditions[0]
					: and(...conditions)
				: undefined;

		return db
			.select()
			.from(workflowExecutions)
			.where(whereClause)
			.orderBy(desc(workflowExecutions.startedAt))
			.limit(limit);
	}

	/**
	 * Rollback to checkpoint
	 */
	async rollbackToCheckpoint(executionId: string, checkpointIndex: number): Promise<void> {
		return observability.trackOperation("workflow.rollback", async () => {
			const execution = await this.getExecution(executionId);
			if (!execution) {
				throw new Error(`Execution ${executionId} not found`);
			}

			const state = execution.state as WorkflowExecutionState;
			const checkpoint = state.checkpoints[checkpointIndex];
			if (!checkpoint) {
				throw new Error(`Checkpoint ${checkpointIndex} not found`);
			}

			// Restore state from checkpoint
			const restoredState = checkpoint.state;

			await db
				.update(workflowExecutions)
				.set({
					currentStep: restoredState.currentStep,
					state: restoredState,
					status: "running",
				})
				.where(eq(workflowExecutions.id, executionId));

			observability.recordEvent("workflow.rollback-completed", {
				executionId,
				checkpointIndex,
				restoredStep: restoredState.currentStep,
			});
		});
	}

	// Step Executors

	/**
	 * Execute action step
	 */
	private async executeActionStep(
		step: WorkflowStep,
		context: WorkflowExecutionContext
	): Promise<unknown> {
		const { config } = step;

		// This is a placeholder - in a real implementation, you would
		// dispatch to specific action handlers based on config.type
		switch (config.type) {
			case "http_request":
				return this.executeHttpRequest(config, context);
			case "database_query":
				return this.executeDatabaseQuery(config, context);
			case "ai_agent_call":
				return this.executeAIAgentCall(config, context);
			default:
				throw new Error(`Unknown action type: ${config.type}`);
		}
	}

	/**
	 * Execute condition step
	 */
	private async executeConditionStep(
		step: WorkflowStep,
		context: WorkflowExecutionContext
	): Promise<boolean> {
		const { config } = step;
		const condition = config.condition as string;
		const variables = (config.variables as Record<string, unknown>) || {};

		// Simple condition evaluation - in practice, you'd want a more robust expression evaluator
		const result = this.evaluateCondition(condition, {
			...context.state.variables,
			...variables,
		});

		return result;
	}

	/**
	 * Execute parallel step
	 */
	private async executeParallelStep(
		step: WorkflowStep,
		context: WorkflowExecutionContext
	): Promise<unknown[]> {
		const { config } = step;
		const steps = config.steps as WorkflowStep[];

		const promises = steps.map((subStep: WorkflowStep) => {
			const executor = this.stepExecutors.get(subStep.type);
			if (!executor) {
				throw new Error(`No executor found for step type: ${subStep.type}`);
			}
			return executor(subStep, context);
		});

		return Promise.all(promises);
	}

	/**
	 * Execute sequential step
	 */
	private async executeSequentialStep(
		step: WorkflowStep,
		context: WorkflowExecutionContext
	): Promise<unknown[]> {
		const { config } = step;
		const steps = config.steps as WorkflowStep[];
		const results = [];

		for (const subStep of steps) {
			const executor = this.stepExecutors.get(subStep.type);
			if (!executor) {
				throw new Error(`No executor found for step type: ${subStep.type}`);
			}
			const result = await executor(subStep, context);
			results.push(result);
		}

		return results;
	}

	// Helper methods for action execution

	private async executeHttpRequest(
		config: Record<string, unknown>,
		_context: WorkflowExecutionContext
	): Promise<unknown> {
		// Placeholder implementation - in production, implement actual HTTP request logic
		observability.recordEvent("workflow.http-request", { config });
		return { status: "success", data: "HTTP request executed", config };
	}

	private async executeDatabaseQuery(
		config: Record<string, unknown>,
		_context: WorkflowExecutionContext
	): Promise<unknown> {
		// Placeholder implementation - in production, implement actual database query logic
		observability.recordEvent("workflow.database-query", { config });
		return { status: "success", data: "Database query executed", config };
	}

	private async executeAIAgentCall(
		config: Record<string, unknown>,
		_context: WorkflowExecutionContext
	): Promise<unknown> {
		// Placeholder implementation - in production, implement actual AI agent call logic
		observability.recordEvent("workflow.ai-agent-call", { config });
		return { status: "success", data: "AI agent call executed", config };
	}

	private evaluateCondition(condition: string, variables: Record<string, unknown>): boolean {
		// Simple condition evaluation - replace with proper expression evaluator
		try {
			// This is unsafe in production - use a proper expression evaluator
			const func = new Function(...Object.keys(variables), `return ${condition}`);
			return func(...Object.values(variables));
		} catch (error) {
			observability.recordError("workflow.condition-evaluation-failed", error as Error);
			return false;
		}
	}

	/**
	 * Register custom step executor
	 */
	registerStepExecutor(
		type: string,
		executor: (step: WorkflowStep, context: WorkflowExecutionContext) => Promise<unknown>
	): void {
		this.stepExecutors.set(type, executor);
	}

	/**
	 * Subscribe to workflow progress updates
	 */
	subscribeToProgress(
		executionId: string,
		callback: (progress: WorkflowProgress) => void
	): () => void {
		if (!this.progressListeners.has(executionId)) {
			this.progressListeners.set(executionId, new Set());
		}

		const listeners = this.progressListeners.get(executionId)!;
		listeners.add(callback);

		// Return unsubscribe function
		return () => {
			listeners.delete(callback);
			if (listeners.size === 0) {
				this.progressListeners.delete(executionId);
			}
		};
	}

	/**
	 * Emit progress update to all listeners
	 */
	private emitProgress(context: WorkflowExecutionContext): void {
		const listeners = this.progressListeners.get(context.executionId);
		if (!listeners || listeners.size === 0) return;

		const completedSteps = Object.values(context.state.stepStates).filter(
			(state) => state.status === "completed"
		).length;

		const currentStep = context.definition.steps[context.state.currentStep];

		const progress: WorkflowProgress = {
			executionId: context.executionId,
			workflowId: context.workflowId,
			status: "running", // This should be fetched from database in real implementation
			currentStep: context.state.currentStep,
			totalSteps: context.definition.steps.length,
			completedSteps,
			progress: Math.round((completedSteps / context.definition.steps.length) * 100),
			currentStepName: currentStep?.name,
			startedAt: new Date(), // This should be from execution record
			lastUpdated: new Date(),
		};

		listeners.forEach((callback) => {
			try {
				callback(progress);
			} catch (error) {
				observability.recordError("workflow.progress-callback-failed", error as Error);
			}
		});
	}

	/**
	 * Get current workflow progress
	 */
	async getProgress(executionId: string): Promise<WorkflowProgress | null> {
		return observability.trackOperation("workflow.get-progress", async () => {
			const execution = await this.getExecution(executionId);
			if (!execution) return null;

			const workflow = await this.getWorkflow(execution.workflowId);
			if (!workflow) return null;

			const definition = workflow.definition as WorkflowDefinition;
			const state = execution.state as WorkflowExecutionState;

			const completedSteps = Object.values(state.stepStates).filter(
				(stepState) => stepState.status === "completed"
			).length;

			const currentStep = definition.steps[state.currentStep];

			return {
				executionId,
				workflowId: execution.workflowId,
				status: execution.status as WorkflowExecutionStatus,
				currentStep: state.currentStep,
				totalSteps: definition.steps.length,
				completedSteps,
				progress: Math.round((completedSteps / definition.steps.length) * 100),
				currentStepName: currentStep?.name,
				startedAt: execution.startedAt,
				lastUpdated: new Date(),
				error: execution.error || undefined,
			};
		});
	}

	/**
	 * Get workflow statistics
	 */
	async getWorkflowStats(workflowId?: string): Promise<{
		totalExecutions: number;
		completedExecutions: number;
		failedExecutions: number;
		averageExecutionTime: number;
		successRate: number;
	}> {
		const [stats] = await db
			.select({
				total: sql<number>`count(*)`,
				completed: sql<number>`count(*) filter (where status = 'completed')`,
				failed: sql<number>`count(*) filter (where status = 'failed')`,
				avgTime: sql<number>`avg(extract(epoch from (completed_at - started_at))) filter (where completed_at is not null)`,
			})
			.from(workflowExecutions)
			.where(workflowId ? eq(workflowExecutions.workflowId, workflowId) : undefined);

		return {
			totalExecutions: stats?.total || 0,
			completedExecutions: stats?.completed || 0,
			failedExecutions: stats?.failed || 0,
			averageExecutionTime: stats?.avgTime || 0,
			successRate: stats?.total ? (stats.completed / stats.total) * 100 : 0,
		};
	}
}

// Singleton instance
export const workflowEngine = new WorkflowEngine();
