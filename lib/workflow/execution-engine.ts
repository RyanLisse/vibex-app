/**
 * Workflow Execution Engine
 *
 * Handles workflow execution, step orchestration, pause/resume functionality,
 * and checkpoint recovery for robust workflow management.
 */

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/config";
import { executionSnapshots, workflowExecutions, workflows } from "@/db/schema";
import { observabilityService } from "@/lib/observability";

// Workflow step definition
const workflowStepSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(["action", "condition", "loop", "parallel", "wait"]),
	config: z.record(z.string(), z.any()).default({}),
	inputs: z.array(z.string()).default([]),
	outputs: z.array(z.string()).default([]),
	dependencies: z.array(z.string()).default([]),
	retryPolicy: z
		.object({
			maxRetries: z.number().default(3),
			backoffMs: z.number().default(1000),
			exponentialBackoff: z.boolean().default(true),
		})
		.optional(),
});

// Workflow definition
const workflowDefinitionSchema = z.object({
	steps: z.array(workflowStepSchema),
	variables: z.record(z.string(), z.any()).default({}),
	config: z
		.object({
			timeout: z.number().optional(),
			maxParallelSteps: z.number().default(10),
			enableCheckpoints: z.boolean().default(true),
			checkpointInterval: z.number().default(5), // steps
		})
		.default({}),
});

// Execution context
interface ExecutionContext {
	id: string;
	workflowId: string;
	status: "running" | "paused" | "completed" | "failed" | "stopped";
	currentStep: string | null;
	variables: Record<string, any>;
	stepStates: Record<string, StepState>;
	startedAt: Date;
	lastCheckpointAt?: Date;
	estimatedCompletion?: Date;
	progress: number;
}

interface StepState {
	status: "pending" | "running" | "completed" | "failed" | "skipped";
	startedAt?: Date;
	completedAt?: Date;
	input?: any;
	output?: any;
	error?: string;
	retryCount: number;
}

export class WorkflowExecutionEngine {
	private static instance: WorkflowExecutionEngine;
	private activeExecutions = new Map<string, ExecutionContext>();
	private stepExecutors = new Map<
		string,
		(step: any, context: ExecutionContext) => Promise<any>
	>();

	private constructor() {
		this.registerDefaultStepExecutors();
	}

	static getInstance(): WorkflowExecutionEngine {
		if (!WorkflowExecutionEngine.instance) {
			WorkflowExecutionEngine.instance = new WorkflowExecutionEngine();
		}
		return WorkflowExecutionEngine.instance;
	}

	/**
	 * Start workflow execution
	 */
	async startExecution(params: {
		workflowId: string;
		workflow: any;
		input: Record<string, any>;
		config: Record<string, any>;
	}): Promise<ExecutionContext> {
		const { workflowId, workflow, input, config } = params;

		// Validate workflow definition
		const definition = workflowDefinitionSchema.parse(workflow.definition);

		// Create execution record in database
		const [execution] = await db
			.insert(workflowExecutions)
			.values({
				workflowId,
				status: "running",
				input,
				startedAt: new Date(),
				stepsCompleted: 0,
				totalSteps: definition.steps.length,
				checkpoint: {},
			})
			.returning();

		// Create execution context
		const context: ExecutionContext = {
			id: execution.id,
			workflowId,
			status: "running",
			currentStep: null,
			variables: { ...definition.variables, ...input },
			stepStates: {},
			startedAt: execution.startedAt,
			progress: 0,
		};

		// Initialize step states
		definition.steps.forEach((step) => {
			context.stepStates[step.id] = {
				status: "pending",
				retryCount: 0,
			};
		});

		this.activeExecutions.set(execution.id, context);

		observabilityService.recordEvent({
			type: "execution",
			category: "workflow",
			message: "Workflow execution started",
			metadata: {
				executionId: execution.id,
				workflowId,
				totalSteps: definition.steps.length,
			},
		});

		// Start execution asynchronously
		this.executeWorkflow(execution.id, definition, config).catch((error) => {
			console.error(`Workflow execution failed: ${error.message}`);
			this.handleExecutionError(execution.id, error);
		});

		return context;
	}

	/**
	 * Resume workflow execution from checkpoint
	 */
	async resumeExecution(
		executionId: string,
		fromStep?: string,
	): Promise<ExecutionContext> {
		// Get execution from database
		const [execution] = await db
			.select()
			.from(workflowExecutions)
			.where(eq(workflowExecutions.id, executionId))
			.limit(1);

		if (!execution) {
			throw new Error("Execution not found");
		}

		if (execution.status === "completed") {
			throw new Error("Cannot resume completed execution");
		}

		// Get workflow definition
		const [workflow] = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, execution.workflowId))
			.limit(1);

		if (!workflow) {
			throw new Error("Workflow not found");
		}

		const definition = workflowDefinitionSchema.parse(workflow.definition);

		// Restore execution context from checkpoint
		const context: ExecutionContext = {
			id: executionId,
			workflowId: execution.workflowId,
			status: "running",
			currentStep: fromStep || execution.currentStep,
			variables: execution.checkpoint.variables || {},
			stepStates: execution.checkpoint.stepStates || {},
			startedAt: execution.startedAt,
			progress: execution.stepsCompleted / execution.totalSteps,
		};

		this.activeExecutions.set(executionId, context);

		// Update database status
		await db
			.update(workflowExecutions)
			.set({ status: "running" })
			.where(eq(workflowExecutions.id, executionId));

		observabilityService.recordEvent({
			type: "execution",
			category: "workflow",
			message: "Workflow execution resumed",
			metadata: {
				executionId,
				fromStep,
				progress: context.progress,
			},
		});

		// Resume execution
		this.executeWorkflow(executionId, definition, workflow.config).catch(
			(error) => {
				console.error(`Workflow execution failed on resume: ${error.message}`);
				this.handleExecutionError(executionId, error);
			},
		);

		return context;
	}

	/**
	 * Pause workflow execution
	 */
	async pauseExecution(
		executionId: string,
		reason?: string,
	): Promise<{ success: boolean; error?: string; checkpoint?: any }> {
		const context = this.activeExecutions.get(executionId);

		if (!context) {
			return { success: false, error: "Execution not found" };
		}

		if (context.status !== "running") {
			return { success: false, error: "Execution is not running" };
		}

		context.status = "paused";
		context.lastCheckpointAt = new Date();

		// Create checkpoint
		const checkpoint = {
			variables: context.variables,
			stepStates: context.stepStates,
			currentStep: context.currentStep,
			pausedAt: context.lastCheckpointAt,
			reason,
		};

		// Update database
		await db
			.update(workflowExecutions)
			.set({
				status: "paused",
				checkpoint,
			})
			.where(eq(workflowExecutions.id, executionId));

		observabilityService.recordEvent({
			type: "execution",
			category: "workflow",
			message: "Workflow execution paused",
			metadata: { executionId, reason },
		});

		return { success: true, checkpoint };
	}

	/**
	 * Stop workflow execution
	 */
	async stopExecution(
		executionId: string,
		reason?: string,
		forceStop = false,
	): Promise<{ success: boolean; error?: string; checkpoint?: any }> {
		const context = this.activeExecutions.get(executionId);

		if (!context) {
			return { success: false, error: "Execution not found" };
		}

		if (context.status === "completed") {
			return { success: false, error: "Execution already completed" };
		}

		context.status = "stopped";

		// Create final checkpoint
		const checkpoint = {
			variables: context.variables,
			stepStates: context.stepStates,
			currentStep: context.currentStep,
			stoppedAt: new Date(),
			reason,
			forceStop,
		};

		// Update database
		await db
			.update(workflowExecutions)
			.set({
				status: "stopped",
				completedAt: new Date(),
				checkpoint,
			})
			.where(eq(workflowExecutions.id, executionId));

		// Remove from active executions
		this.activeExecutions.delete(executionId);

		observabilityService.recordEvent({
			type: "execution",
			category: "workflow",
			message: "Workflow execution stopped",
			metadata: { executionId, reason, forceStop },
		});

		return { success: true, checkpoint };
	}

	/**
	 * Get execution status
	 */
	async getExecutionStatus(
		executionId: string,
	): Promise<ExecutionContext | null> {
		return this.activeExecutions.get(executionId) || null;
	}

	/**
	 * Execute workflow steps
	 */
	private async executeWorkflow(
		executionId: string,
		definition: z.infer<typeof workflowDefinitionSchema>,
		config: Record<string, any>,
	): Promise<void> {
		const context = this.activeExecutions.get(executionId);
		if (!context) return;

		try {
			const { steps } = definition;
			let completedSteps = 0;

			for (const step of steps) {
				if (context.status !== "running") {
					break; // Execution was paused or stopped
				}

				// Check dependencies
				if (!this.areDependenciesMet(step.dependencies, context)) {
					context.stepStates[step.id].status = "skipped";
					continue;
				}

				context.currentStep = step.id;
				context.stepStates[step.id].status = "running";
				context.stepStates[step.id].startedAt = new Date();

				try {
					// Execute step
					const output = await this.executeStep(step, context);

					context.stepStates[step.id].status = "completed";
					context.stepStates[step.id].completedAt = new Date();
					context.stepStates[step.id].output = output;

					completedSteps++;
					context.progress = completedSteps / steps.length;

					// Create checkpoint if enabled
					if (
						definition.config.enableCheckpoints &&
						completedSteps % definition.config.checkpointInterval === 0
					) {
						await this.createCheckpoint(executionId, context);
					}
				} catch (error) {
					const stepState = context.stepStates[step.id];

					if (stepState.retryCount < (step.retryPolicy?.maxRetries || 3)) {
						// Retry step
						stepState.retryCount++;
						stepState.status = "pending";

						const backoffMs = step.retryPolicy?.exponentialBackoff
							? (step.retryPolicy?.backoffMs || 1000) *
								2 ** (stepState.retryCount - 1)
							: step.retryPolicy?.backoffMs || 1000;

						await new Promise((resolve) => setTimeout(resolve, backoffMs));
					} else {
						// Step failed permanently
						stepState.status = "failed";
						stepState.error = error.message;
						throw error;
					}
				}
			}

			// Execution completed successfully
			context.status = "completed";
			context.progress = 1;

			await db
				.update(workflowExecutions)
				.set({
					status: "completed",
					completedAt: new Date(),
					stepsCompleted: completedSteps,
					checkpoint: {
						variables: context.variables,
						stepStates: context.stepStates,
					},
				})
				.where(eq(workflowExecutions.id, executionId));

			this.activeExecutions.delete(executionId);

			observabilityService.recordEvent({
				type: "execution",
				category: "workflow",
				message: "Workflow execution completed successfully",
				metadata: {
					executionId,
					completedSteps,
					totalSteps: steps.length,
				},
			});
		} catch (error) {
			await this.handleExecutionError(executionId, error);
		}
	}

	/**
	 * Execute individual workflow step
	 */
	private async executeStep(
		step: any,
		context: ExecutionContext,
	): Promise<any> {
		const executor = this.stepExecutors.get(step.type);

		if (!executor) {
			throw new Error(`Unknown step type: ${step.type}`);
		}

		observabilityService.recordEvent({
			type: "step",
			category: "workflow",
			message: `Executing workflow step: ${step.name}`,
			metadata: {
				executionId: context.id,
				stepId: step.id,
				stepType: step.type,
			},
		});

		return await executor(step, context);
	}

	/**
	 * Check if step dependencies are met
	 */
	private areDependenciesMet(
		dependencies: string[],
		context: ExecutionContext,
	): boolean {
		return dependencies.every(
			(depId) => context.stepStates[depId]?.status === "completed",
		);
	}

	/**
	 * Create execution checkpoint
	 */
	private async createCheckpoint(
		executionId: string,
		context: ExecutionContext,
	): Promise<void> {
		const checkpoint = {
			variables: context.variables,
			stepStates: context.stepStates,
			currentStep: context.currentStep,
			createdAt: new Date(),
		};

		await db
			.update(workflowExecutions)
			.set({ checkpoint })
			.where(eq(workflowExecutions.id, executionId));

		context.lastCheckpointAt = new Date();

		observabilityService.recordEvent({
			type: "execution",
			category: "workflow",
			message: "Workflow checkpoint created",
			metadata: { executionId, progress: context.progress },
		});
	}

	/**
	 * Handle execution errors
	 */
	private async handleExecutionError(
		executionId: string,
		error: any,
	): Promise<void> {
		const context = this.activeExecutions.get(executionId);

		if (context) {
			context.status = "failed";

			await db
				.update(workflowExecutions)
				.set({
					status: "failed",
					error: error.message,
					completedAt: new Date(),
					checkpoint: {
						variables: context.variables,
						stepStates: context.stepStates,
						error: error.message,
					},
				})
				.where(eq(workflowExecutions.id, executionId));

			this.activeExecutions.delete(executionId);
		}

		observabilityService.recordError(error, {
			context: "workflow_execution",
			executionId,
		});
	}

	/**
	 * Register default step executors
	 */
	private registerDefaultStepExecutors(): void {
		// Action step executor
		this.stepExecutors.set("action", async (step, context) => {
			const { action, params } = step.config;

			switch (action) {
				case "delay":
					await new Promise((resolve) =>
						setTimeout(resolve, params.duration || 1000),
					);
					return { delayed: params.duration || 1000 };

				case "set_variable":
					context.variables[params.name] = params.value;
					return { variable: params.name, value: params.value };

				case "log":
					console.log("Workflow log:", params.message);
					return { logged: params.message };

				default:
					throw new Error(`Unknown action: ${action}`);
			}
		});

		// Condition step executor
		this.stepExecutors.set("condition", async (step, context) => {
			const { condition } = step.config;
			// Simple condition evaluation - can be extended
			const result = this.evaluateCondition(condition, context.variables);
			return { condition, result };
		});

		// Wait step executor
		this.stepExecutors.set("wait", async (step, context) => {
			const { duration } = step.config;
			await new Promise((resolve) => setTimeout(resolve, duration || 1000));
			return { waited: duration || 1000 };
		});
	}

	/**
	 * Evaluate simple conditions safely without Function() constructor
	 */
	private evaluateCondition(
		condition: string,
		variables: Record<string, any>,
	): boolean {
		// Safe condition evaluation without eval or Function()
		try {
			// Support basic comparison operators
			const operators = [
				"===",
				"!==",
				"==",
				"!=",
				">=",
				"<=",
				">",
				"<",
				"&&",
				"||",
			];

			// Find the operator in the condition
			let operator = "";
			let parts: string[] = [];

			for (const op of operators) {
				if (condition.includes(op)) {
					operator = op;
					parts = condition.split(op).map((p) => p.trim());
					break;
				}
			}

			if (!operator || parts.length !== 2) {
				console.warn("Unsupported condition format:", condition);
				return false;
			}

			// Resolve variable references safely
			const resolveValue = (expr: string): any => {
				// Check if it's a variable reference
				if (expr.startsWith("$")) {
					const varName = expr.substring(1);
					return variables[varName];
				}

				// Try to parse as JSON (handles strings, numbers, booleans)
				try {
					return JSON.parse(expr);
				} catch {
					// If not valid JSON, treat as string
					return expr;
				}
			};

			const leftValue = resolveValue(parts[0]);
			const rightValue = resolveValue(parts[1]);

			// Perform safe comparison
			switch (operator) {
				case "===":
					return leftValue === rightValue;
				case "!==":
					return leftValue !== rightValue;
				case "==":
					return leftValue == rightValue;
				case "!=":
					return leftValue != rightValue;
				case ">=":
					return Number(leftValue) >= Number(rightValue);
				case "<=":
					return Number(leftValue) <= Number(rightValue);
				case ">":
					return Number(leftValue) > Number(rightValue);
				case "<":
					return Number(leftValue) < Number(rightValue);
				case "&&":
					return Boolean(leftValue) && Boolean(rightValue);
				case "||":
					return Boolean(leftValue) || Boolean(rightValue);
				default:
					return false;
			}
		} catch (error) {
			console.warn("Condition evaluation failed:", error);
			return false;
		}
	}
}

// Export singleton instance
export const workflowEngine = WorkflowExecutionEngine.getInstance();
