/**
 * Workflow Step Executors
 *
 * Implements execution logic for each step type
 */

import type { WorkflowContext } from "./types";

// Base executor class
abstract class BaseStepExecutor<T extends StepConfig> implements StepExecutor<T> {
	abstract type: T["type"];

	abstract execute(step: T, context: WorkflowContext): Promise<StepExecutionResult>;

	validate(step: T): string[] {
		const errors: string[] = [];

		if (!step.id) {
			errors.push("Step ID is required");
		}

		if (!step.name) {
			errors.push("Step name is required");
		}

		return errors;
	}

	protected async handleError(error: any): Promise<StepError> {
		return {
			code: error.code || "STEP_ERROR",
			message: error.message || "Unknown error occurred",
			details: error.details || error,
			stack: error.stack,
		};
	}

	protected evaluateExpression(expression: string, context: WorkflowContext): any {
		try {
			// Create a scope with workflow variables
			const scope = {
				...context.variables,
				// Add utility functions
				now: () => new Date(),
				env: (key: string) => process.env[key],
				random: Math.random,
				uuid: () => crypto.randomUUID(),
			};

			// Use mathjs for safe expression evaluation
			return evaluate(expression, scope);
		} catch (error) {
			throw new Error(`Expression evaluation failed: ${error}`);
		}
	}

	protected async delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Action step executor
export class ActionStepExecutor extends BaseStepExecutor<ActionStepConfig> {
	type = "action" as const;

	private actionHandlers = new Map<
		string,
		(params: any, context: WorkflowContext) => Promise<any>
	>();

	constructor() {
		super();
		this.registerDefaultHandlers();
	}

	private registerDefaultHandlers() {
		// HTTP request handler
		this.actionHandlers.set("http.request", async (params) => {
			const response = await fetch(params.url, {
				method: params.method || "GET",
				headers: params.headers,
				body: params.body ? JSON.stringify(params.body) : undefined,
			});

			if (!response.ok) {
				throw new Error(`HTTP request failed: ${response.statusText}`);
			}

			return {
				status: response.status,
				headers: Object.fromEntries(response.headers.entries()),
				data: await response.json(),
			};
		});

		// Database operations
		this.actionHandlers.set("database.query", async (params) => {
			// This would integrate with your database
			context.log("info", "Database query", params);
			return { rows: [], count: 0 };
		});

		this.actionHandlers.set("database.insert", async (params) => {
			context.log("info", "Database insert", params);
			return { id: crypto.randomUUID(), success: true };
		});

		// Notification handlers
		this.actionHandlers.set("notification.send", async (params, context) => {
			context.log("info", "Sending notification", params);
			return { sent: true, timestamp: new Date() };
		});

		// Workflow control handlers
		this.actionHandlers.set("workflow.update", async (params, context) => {
			Object.entries(params).forEach(([path, value]) => {
				context.setVariable(path, value);
			});
			return { updated: true };
		});

		this.actionHandlers.set("error.throw", async (params) => {
			throw new Error(params.message || "Custom error");
		});
	}

	registerActionHandler(
		type: string,
		handler: (params: any, context: WorkflowContext) => Promise<any>
	) {
		this.actionHandlers.set(type, handler);
	}

	async execute(step: ActionStepConfig, context: WorkflowContext): Promise<StepExecutionResult> {
		try {
			context.log("debug", `Executing action step: ${step.name}`, {
				type: step.action.type,
			});

			const handler = this.actionHandlers.get(step.action.type);
			if (!handler) {
				throw new Error(`Unknown action type: ${step.action.type}`);
			}

			// Resolve parameters
			const resolvedParams = this.resolveParams(step.action.params, context);

			// Execute action
			const result = await handler(resolvedParams, context);

			// Apply output mapping
			if (step.action.outputMapping) {
				Object.entries(step.action.outputMapping).forEach(([from, to]) => {
					const value = this.getValueByPath(result, from);
					context.setVariable(to, value);
				});
			}

			return {
				status: "completed",
				output: result,
			};
		} catch (error) {
			return {
				status: "failed",
				error: await this.handleError(error),
			};
		}
	}

	private resolveParams(params: any, context: WorkflowContext): any {
		if (typeof params === "string" && params.startsWith("${") && params.endsWith("}")) {
			const expression = params.slice(2, -1);
			return this.evaluateExpression(expression, context);
		}

		if (Array.isArray(params)) {
			return params.map((p) => this.resolveParams(p, context));
		}

		if (params && typeof params === "object") {
			const resolved: any = {};
			Object.entries(params).forEach(([key, value]) => {
				resolved[key] = this.resolveParams(value, context);
			});
			return resolved;
		}

		return params;
	}

	private getValueByPath(obj: any, path: string): any {
		return path.split(".").reduce((acc, part) => acc?.[part], obj);
	}
}

// Condition step executor
export class ConditionStepExecutor extends BaseStepExecutor<ConditionStepConfig> {
	type = "condition" as const;

	async execute(step: ConditionStepConfig, context: WorkflowContext): Promise<StepExecutionResult> {
		try {
			context.log("debug", `Evaluating condition: ${step.condition.expression}`);

			const result = this.evaluateExpression(step.condition.expression, context);
			const nextStepId = result ? step.condition.trueStepId : step.condition.falseStepId;

			context.log("info", `Condition evaluated to: ${result}`, { nextStepId });

			return {
				status: "completed",
				output: result,
				nextStepId,
			};
		} catch (error) {
			return {
				status: "failed",
				error: await this.handleError(error),
			};
		}
	}
}

// Parallel step executor
export class ParallelStepExecutor extends BaseStepExecutor<ParallelStepConfig> {
	type = "parallel" as const;

	constructor(
		private executeStep: (stepId: string, context: WorkflowContext) => Promise<StepExecutionResult>
	) {
		super();
	}

	async execute(step: ParallelStepConfig, context: WorkflowContext): Promise<StepExecutionResult> {
		try {
			context.log("info", `Executing ${step.parallel.steps.length} steps in parallel`);

			const promises = step.parallel.steps.map((stepId) =>
				this.executeStep(stepId, context).catch((error) => ({
					status: "failed" as const,
					error,
				}))
			);

			const results = await Promise.all(promises);

			const failures = results.filter((r) => r.status === "failed");

			if (failures.length > 0 && step.parallel.waitForAll && !step.parallel.continueOnError) {
				return {
					status: "failed",
					error: {
						code: "PARALLEL_EXECUTION_FAILED",
						message: `${failures.length} parallel steps failed`,
						details: failures.map((f) => f.error),
					},
				};
			}

			return {
				status: "completed",
				output: results,
				metadata: {
					total: results.length,
					succeeded: results.filter((r) => r.status === "completed").length,
					failed: failures.length,
				},
			};
		} catch (error) {
			return {
				status: "failed",
				error: await this.handleError(error),
			};
		}
	}
}

// Sequential step executor
export class SequentialStepExecutor extends BaseStepExecutor<SequentialStepConfig> {
	type = "sequential" as const;

	constructor(
		private executeStep: (stepId: string, context: WorkflowContext) => Promise<StepExecutionResult>
	) {
		super();
	}

	async execute(
		step: SequentialStepConfig,
		context: WorkflowContext
	): Promise<StepExecutionResult> {
		try {
			context.log("info", `Executing ${step.sequential.steps.length} steps sequentially`);

			const results: StepExecutionResult[] = [];

			for (const stepId of step.sequential.steps) {
				const result = await this.executeStep(stepId, context);
				results.push(result);

				if (result.status === "failed" && !step.sequential.continueOnError) {
					return {
						status: "failed",
						error: result.error!,
						metadata: {
							completedSteps: results.length - 1,
							totalSteps: step.sequential.steps.length,
						},
					};
				}
			}

			return {
				status: "completed",
				output: results,
			};
		} catch (error) {
			return {
				status: "failed",
				error: await this.handleError(error),
			};
		}
	}
}

// Loop step executor
export class LoopStepExecutor extends BaseStepExecutor<LoopStepConfig> {
	type = "loop" as const;

	constructor(
		private executeStep: (stepId: string, context: WorkflowContext) => Promise<StepExecutionResult>
	) {
		super();
	}

	async execute(step: LoopStepConfig, context: WorkflowContext): Promise<StepExecutionResult> {
		try {
			const items = context.getVariable(step.loop.items);

			if (!Array.isArray(items)) {
				throw new Error(`Loop items must be an array, got ${typeof items}`);
			}

			context.log("info", `Starting loop over ${items.length} items`);

			const results: any[] = [];
			const maxIterations = step.loop.maxIterations || items.length;

			for (let i = 0; i < Math.min(items.length, maxIterations); i++) {
				// Set loop variables
				context.setVariable(step.loop.itemVariable, items[i]);
				if (step.loop.indexVariable) {
					context.setVariable(step.loop.indexVariable, i);
				}

				const result = await this.executeStep(step.loop.bodyStepId, context);
				results.push(result);

				if (result.status === "failed") {
					return {
						status: "failed",
						error: result.error!,
						metadata: {
							iteration: i,
							totalIterations: items.length,
						},
					};
				}
			}

			return {
				status: "completed",
				output: results,
			};
		} catch (error) {
			return {
				status: "failed",
				error: await this.handleError(error),
			};
		}
	}
}

// Wait step executor
export class WaitStepExecutor extends BaseStepExecutor<WaitStepConfig> {
	type = "wait" as const;

	async execute(step: WaitStepConfig, context: WorkflowContext): Promise<StepExecutionResult> {
		try {
			let waitTime: number;

			if (step.wait.duration) {
				waitTime = step.wait.duration;
			} else if (step.wait.until) {
				const untilDate = new Date(step.wait.until);
				waitTime = Math.max(0, untilDate.getTime() - Date.now());
			} else if (step.wait.event) {
				// For event-based waiting, we would pause the workflow
				return {
					status: "paused",
					metadata: {
						waitingFor: step.wait.event,
					},
				};
			} else {
				throw new Error("Wait step must specify duration, until, or event");
			}

			context.log("info", `Waiting for ${waitTime}ms`);
			await this.delay(waitTime);

			return {
				status: "completed",
			};
		} catch (error) {
			return {
				status: "failed",
				error: await this.handleError(error),
			};
		}
	}
}

// Human approval step executor
export class HumanApprovalStepExecutor extends BaseStepExecutor<HumanApprovalStepConfig> {
	type = "human_approval" as const;

	async execute(
		step: HumanApprovalStepConfig,
		context: WorkflowContext
	): Promise<StepExecutionResult> {
		try {
			context.log("info", "Requesting human approval", {
				approvers: step.approval.approvers,
				title: step.approval.title,
			});

			// In a real implementation, this would:
			// 1. Create an approval request in the database
			// 2. Notify approvers
			// 3. Pause the workflow
			// 4. Resume when approval is received

			// For now, we'll just pause the workflow
			return {
				status: "paused",
				metadata: {
					approvalRequested: true,
					approvers: step.approval.approvers,
					title: step.approval.title,
					timeout: step.approval.timeout,
				},
			};
		} catch (error) {
			return {
				status: "failed",
				error: await this.handleError(error),
			};
		}
	}
}

// Webhook step executor
export class WebhookStepExecutor extends BaseStepExecutor<WebhookStepConfig> {
	type = "webhook" as const;

	async execute(step: WebhookStepConfig, context: WorkflowContext): Promise<StepExecutionResult> {
		try {
			context.log("info", `Calling webhook: ${step.webhook.url}`);

			const headers: HeadersInit = {
				"Content-Type": "application/json",
				...step.webhook.headers,
			};

			// Add authentication
			if (step.webhook.authentication) {
				switch (step.webhook.authentication.type) {
					case "bearer":
						headers["Authorization"] = `Bearer ${step.webhook.authentication.credentials}`;
						break;
					case "basic":
						headers["Authorization"] = `Basic ${step.webhook.authentication.credentials}`;
						break;
					case "api_key":
						headers["X-API-Key"] = step.webhook.authentication.credentials;
						break;
				}
			}

			const response = await fetch(step.webhook.url, {
				method: step.webhook.method,
				headers,
				body: step.webhook.body ? JSON.stringify(step.webhook.body) : undefined,
			});

			if (!response.ok) {
				throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			// Apply response mapping
			if (step.webhook.responseMapping) {
				Object.entries(step.webhook.responseMapping).forEach(([from, to]) => {
					const value = this.getValueByPath(data, from);
					context.setVariable(to, value);
				});
			}

			return {
				status: "completed",
				output: data,
			};
		} catch (error) {
			return {
				status: "failed",
				error: await this.handleError(error),
			};
		}
	}

	private getValueByPath(obj: any, path: string): any {
		return path.split(".").reduce((acc, part) => acc?.[part], obj);
	}
}

// Transform step executor
export class TransformStepExecutor extends BaseStepExecutor<TransformStepConfig> {
	type = "transform" as const;

	async execute(step: TransformStepConfig, context: WorkflowContext): Promise<StepExecutionResult> {
		try {
			context.log("debug", `Executing transform: ${step.transform.expression}`);

			const result = this.evaluateExpression(step.transform.expression, context);
			context.setVariable(step.transform.outputVariable, result);

			return {
				status: "completed",
				output: result,
			};
		} catch (error) {
			return {
				status: "failed",
				error: await this.handleError(error),
			};
		}
	}
}

// Aggregate step executor
export class AggregateStepExecutor extends BaseStepExecutor<AggregateStepConfig> {
	type = "aggregate" as const;

	async execute(step: AggregateStepConfig, context: WorkflowContext): Promise<StepExecutionResult> {
		try {
			context.log("info", `Aggregating data from ${step.aggregate.sources.length} sources`);

			const data = step.aggregate.sources.map((source) => context.getVariable(source));

			let result: any;

			switch (step.aggregate.operation) {
				case "merge":
					result = Object.assign({}, ...data);
					break;

				case "concat":
					result = data.flat();
					break;

				case "custom":
					if (!step.aggregate.customAggregator) {
						throw new Error("Custom aggregator not specified");
					}
					result = this.evaluateExpression(step.aggregate.customAggregator, {
						...context,
						variables: { ...context.variables, data },
					});
					break;

				default:
					throw new Error(`Unknown aggregation operation: ${step.aggregate.operation}`);
			}

			context.setVariable(step.aggregate.outputVariable, result);

			return {
				status: "completed",
				output: result,
			};
		} catch (error) {
			return {
				status: "failed",
				error: await this.handleError(error),
			};
		}
	}
}

// Branch step executor
export class BranchStepExecutor extends BaseStepExecutor<BranchStepConfig> {
	type = "branch" as const;

	async execute(step: BranchStepConfig, context: WorkflowContext): Promise<StepExecutionResult> {
		try {
			context.log("debug", `Evaluating ${step.branch.conditions.length} branch conditions`);

			for (const condition of step.branch.conditions) {
				const result = this.evaluateExpression(condition.expression, context);

				if (result) {
					context.log("info", `Branch condition matched: ${condition.expression}`);
					return {
						status: "completed",
						output: result,
						nextStepId: condition.stepId,
					};
				}
			}

			// No conditions matched, use default
			if (step.branch.defaultStepId) {
				context.log("info", "No branch conditions matched, using default");
				return {
					status: "completed",
					nextStepId: step.branch.defaultStepId,
				};
			}

			// No default specified
			return {
				status: "completed",
				output: null,
			};
		} catch (error) {
			return {
				status: "failed",
				error: await this.handleError(error),
			};
		}
	}
}

// Step executor registry
export class StepExecutorRegistry {
	private executors = new Map<string, StepExecutor>();

	constructor() {
		// Register default executors
		this.register(new ActionStepExecutor());
		this.register(new ConditionStepExecutor());
		this.register(new WaitStepExecutor());
		this.register(new HumanApprovalStepExecutor());
		this.register(new WebhookStepExecutor());
		this.register(new TransformStepExecutor());
		this.register(new AggregateStepExecutor());
		this.register(new BranchStepExecutor());
	}

	register(executor: StepExecutor): void {
		this.executors.set(executor.type, executor);
	}

	get(type: string): StepExecutor | undefined {
		return this.executors.get(type);
	}

	// Register executors that need step execution capability
	registerWithStepExecution(
		executeStep: (stepId: string, context: WorkflowContext) => Promise<StepExecutionResult>
	): void {
		this.register(new ParallelStepExecutor(executeStep));
		this.register(new SequentialStepExecutor(executeStep));
		this.register(new LoopStepExecutor(executeStep));
	}
}

// Create and export default registry
export const stepExecutorRegistry = new StepExecutorRegistry();
