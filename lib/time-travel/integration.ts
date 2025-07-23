/**
 * Time-Travel Integration
 *
 * Integrates time-travel debugging with the existing observability system
 * to automatically create snapshots during agent executions.
 */

import { enhancedObservability } from "@/lib/observability/enhanced-events-system";
import { timeTravel, timeTravelDebug } from "./debug-service";

// Configuration for automatic snapshot creation
interface SnapshotConfig {
	enabled: boolean;
	autoCheckpoints: boolean;
	checkpointInterval: number; // steps
	maxSnapshots: number;
	includeState: boolean;
	includeMetadata: boolean;
}

const defaultConfig: SnapshotConfig = {
	enabled: true,
	autoCheckpoints: true,
	checkpointInterval: 5,
	maxSnapshots: 1000,
	includeState: true,
	includeMetadata: true,
};

class TimeTravelIntegration {
	private static instance: TimeTravelIntegration;
	private config: SnapshotConfig = defaultConfig;
	private executionStepCounters: Map<string, number> = new Map();

	private constructor() {
		this.setupObservabilityHooks();
	}

	static getInstance(): TimeTravelIntegration {
		if (!TimeTravelIntegration.instance) {
			TimeTravelIntegration.instance = new TimeTravelIntegration();
		}
		return TimeTravelIntegration.instance;
	}

	/**
	 * Configure snapshot behavior
	 */
	configure(config: Partial<SnapshotConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Setup hooks into the observability system
	 */
	private setupObservabilityHooks(): void {
		// Hook into agent execution start
		this.hookExecutionStart();

		// Hook into execution steps
		this.hookExecutionSteps();

		// Hook into execution completion
		this.hookExecutionCompletion();

		// Hook into execution failures
		this.hookExecutionFailure();
	}

	/**
	 * Hook into agent execution start
	 */
	private hookExecutionStart(): void {
		const originalStartExecution =
			enhancedObservability.startAgentExecution.bind(enhancedObservability);

		enhancedObservability.startAgentExecution = async (
			agentType: string,
			operation: string,
			metadata: Record<string, any> = {},
			taskId?: string,
			userId?: string,
			sessionId?: string,
			parentExecutionId?: string
		): Promise<string> => {
			const executionId = await originalStartExecution(
				agentType,
				operation,
				metadata,
				taskId,
				userId,
				sessionId,
				parentExecutionId
			);

			if (this.config.enabled) {
				// Initialize step counter
				this.executionStepCounters.set(executionId, 0);

				// Create initial snapshot
				await this.createExecutionSnapshot(
					executionId,
					0,
					{
						agentType,
						operation,
						status: "started",
						metadata,
						taskId,
						userId,
						sessionId,
						parentExecutionId,
						startTime: new Date().toISOString(),
					},
					"step_start",
					`Execution started: ${agentType}.${operation}`,
					true // Initial snapshot is always a checkpoint
				);
			}

			return executionId;
		};
	}

	/**
	 * Hook into execution steps
	 */
	private hookExecutionSteps(): void {
		const originalRecordStep =
			enhancedObservability.recordExecutionStep.bind(enhancedObservability);

		enhancedObservability.recordExecutionStep = async (
			executionId: string,
			stepName: string,
			stepData: any,
			stepDuration?: number
		): Promise<void> => {
			await originalRecordStep(executionId, stepName, stepData, stepDuration);

			if (this.config.enabled) {
				const stepNumber = this.incrementStepCounter(executionId);
				const isCheckpoint =
					this.config.autoCheckpoints && stepNumber % this.config.checkpointInterval === 0;

				await this.createExecutionSnapshot(
					executionId,
					stepNumber,
					{
						stepName,
						stepData: this.config.includeState ? stepData : undefined,
						stepDuration,
						timestamp: new Date().toISOString(),
					},
					"step_start",
					`Step: ${stepName}`,
					isCheckpoint,
					{
						stepDuration,
						stepName,
					}
				);
			}
		};
	}

	/**
	 * Hook into execution completion
	 */
	private hookExecutionCompletion(): void {
		const originalCompleteExecution =
			enhancedObservability.completeAgentExecution.bind(enhancedObservability);

		enhancedObservability.completeAgentExecution = async (
			executionId: string,
			output?: any,
			performanceMetrics?: any
		): Promise<void> => {
			if (this.config.enabled) {
				const stepNumber = this.incrementStepCounter(executionId);

				await this.createExecutionSnapshot(
					executionId,
					stepNumber,
					{
						status: "completed",
						output: this.config.includeState ? output : undefined,
						performanceMetrics,
						endTime: new Date().toISOString(),
					},
					"step_end",
					"Execution completed successfully",
					true, // Completion is always a checkpoint
					{
						performanceMetrics,
					}
				);

				// Cleanup step counter
				this.executionStepCounters.delete(executionId);
			}

			await originalCompleteExecution(executionId, output, performanceMetrics);
		};
	}

	/**
	 * Hook into execution failures
	 */
	private hookExecutionFailure(): void {
		const originalFailExecution =
			enhancedObservability.failAgentExecution.bind(enhancedObservability);

		enhancedObservability.failAgentExecution = async (
			executionId: string,
			error: Error,
			performanceMetrics?: any
		): Promise<void> => {
			if (this.config.enabled) {
				const stepNumber = this.incrementStepCounter(executionId);

				await this.createExecutionSnapshot(
					executionId,
					stepNumber,
					{
						status: "failed",
						error: {
							name: error.name,
							message: error.message,
							stack: error.stack,
						},
						performanceMetrics,
						endTime: new Date().toISOString(),
					},
					"error",
					`Execution failed: ${error.message}`,
					true, // Failure is always a checkpoint
					{
						errorType: error.name,
						performanceMetrics,
					}
				);

				// Cleanup step counter
				this.executionStepCounters.delete(executionId);
			}

			await originalFailExecution(executionId, error, performanceMetrics);
		};
	}

	/**
	 * Create an execution snapshot
	 */
	private async createExecutionSnapshot(
		executionId: string,
		stepNumber: number,
		state: Record<string, unknown>,
		type: "step_start" | "step_end" | "checkpoint" | "error" | "rollback" | "manual",
		description: string,
		checkpoint = false,
		metadata?: Record<string, unknown>
	): Promise<void> {
		try {
			await timeTravelDebug.createSnapshot(
				executionId,
				stepNumber,
				state,
				type,
				description,
				checkpoint,
				metadata
			);
		} catch (error) {
			console.error("Failed to create execution snapshot:", error);
			// Don't throw - snapshot creation shouldn't break execution
		}
	}

	/**
	 * Increment and get step counter for execution
	 */
	private incrementStepCounter(executionId: string): number {
		const current = this.executionStepCounters.get(executionId) || 0;
		const next = current + 1;
		this.executionStepCounters.set(executionId, next);
		return next;
	}

	/**
	 * Get current step number for execution
	 */
	getCurrentStep(executionId: string): number {
		return this.executionStepCounters.get(executionId) || 0;
	}

	/**
	 * Manually create a checkpoint
	 */
	async createCheckpoint(
		executionId: string,
		state: Record<string, unknown>,
		description: string,
		metadata?: Record<string, unknown>
	): Promise<string> {
		const stepNumber = this.getCurrentStep(executionId);

		return timeTravelDebug.createSnapshot(
			executionId,
			stepNumber,
			state,
			"checkpoint",
			description,
			true,
			metadata
		);
	}

	/**
	 * Manually create a snapshot
	 */
	async createSnapshot(
		executionId: string,
		state: Record<string, unknown>,
		description?: string,
		metadata?: Record<string, unknown>
	): Promise<string> {
		const stepNumber = this.getCurrentStep(executionId);

		return timeTravelDebug.createSnapshot(
			executionId,
			stepNumber,
			state,
			"manual",
			description || `Manual snapshot at step ${stepNumber}`,
			false,
			metadata
		);
	}

	/**
	 * Get configuration
	 */
	getConfig(): SnapshotConfig {
		return { ...this.config };
	}

	/**
	 * Get active execution step counters
	 */
	getActiveExecutions(): string[] {
		return Array.from(this.executionStepCounters.keys());
	}

	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		this.executionStepCounters.clear();
	}
}

// Export singleton instance
export const timeTravelIntegration = TimeTravelIntegration.getInstance();

// Convenience functions
export const timeTravelHooks = {
	/**
	 * Configure automatic snapshot creation
	 */
	configure: (config: Partial<SnapshotConfig>) => {
		timeTravelIntegration.configure(config);
	},

	/**
	 * Create manual checkpoint
	 */
	checkpoint: async (
		executionId: string,
		state: Record<string, unknown>,
		description: string,
		metadata?: Record<string, unknown>
	) => {
		return timeTravelIntegration.createCheckpoint(executionId, state, description, metadata);
	},

	/**
	 * Create manual snapshot
	 */
	snapshot: async (
		executionId: string,
		state: Record<string, unknown>,
		description?: string,
		metadata?: Record<string, unknown>
	) => {
		return timeTravelIntegration.createSnapshot(executionId, state, description, metadata);
	},

	/**
	 * Get current step for execution
	 */
	getCurrentStep: (executionId: string) => {
		return timeTravelIntegration.getCurrentStep(executionId);
	},

	/**
	 * Get configuration
	 */
	getConfig: () => {
		return timeTravelIntegration.getConfig();
	},
};
