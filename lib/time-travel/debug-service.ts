/**
 * Time-Travel Debugging Service
 *
 * Provides comprehensive time-travel debugging capabilities for agent executions,
 * including execution snapshots, step-by-step replay, execution comparison,
 * and rollback functionality.
 */

import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/config";
import {
	type AgentExecution,
	agentExecutions,
	type ExecutionSnapshot,
	executionSnapshots,
	type NewExecutionSnapshot,
	type ObservabilityEvent,
	observabilityEvents,
} from "@/db/schema";
import { enhancedObservability } from "@/lib/observability/enhanced-events-system";

// Execution state snapshot
export interface ExecutionState {
	stepNumber: number;
	timestamp: Date;
	state: Record<string, unknown>;
	description?: string;
	checkpoint: boolean;
	type: SnapshotType;
	metadata?: Record<string, unknown>;
}

// Snapshot types
export type SnapshotType =
	| "step_start"
	| "step_end"
	| "checkpoint"
	| "error"
	| "rollback"
	| "manual";

// Timeline entry for visualization
export interface TimelineEntry {
	id: string;
	executionId: string;
	stepNumber: number;
	timestamp: Date;
	type: "snapshot" | "event";
	title: string;
	description?: string;
	data: Record<string, unknown>;
	severity?: "info" | "warn" | "error" | "debug";
	checkpoint: boolean;
}

// Execution comparison result
export interface ExecutionComparison {
	executionA: AgentExecution;
	executionB: AgentExecution;
	differences: ExecutionDifference[];
	commonSteps: number;
	divergencePoint?: number;
	summary: ComparisonSummary;
}

// Execution difference
export interface ExecutionDifference {
	stepNumber: number;
	type: "missing" | "different" | "extra";
	field: string;
	valueA?: unknown;
	valueB?: unknown;
	description: string;
}

// Comparison summary
export interface ComparisonSummary {
	totalSteps: { a: number; b: number };
	commonSteps: number;
	differences: number;
	divergencePoint?: number;
	outcome: { a: string; b: string };
	executionTime: { a: number; b: number };
}

// Replay session
export interface ReplaySession {
	id: string;
	executionId: string;
	currentStep: number;
	totalSteps: number;
	isPlaying: boolean;
	playbackSpeed: number;
	snapshots: ExecutionSnapshot[];
	events: ObservabilityEvent[];
	timeline: TimelineEntry[];
	createdAt: Date;
}

// Rollback point
export interface RollbackPoint {
	id: string;
	executionId: string;
	stepNumber: number;
	timestamp: Date;
	state: Record<string, unknown>;
	description: string;
	canRollback: boolean;
	metadata?: Record<string, unknown>;
}

export class TimeTravelDebugService {
	private static instance: TimeTravelDebugService;
	private activeSessions: Map<string, ReplaySession> = new Map();

	private constructor() {}

	static getInstance(): TimeTravelDebugService {
		if (!TimeTravelDebugService.instance) {
			TimeTravelDebugService.instance = new TimeTravelDebugService();
		}
		return TimeTravelDebugService.instance;
	}

	/**
	 * Create an execution snapshot
	 */
	async createSnapshot(
		executionId: string,
		stepNumber: number,
		state: Record<string, unknown>,
		type: SnapshotType = "step_start",
		description?: string,
		checkpoint = false,
		metadata?: Record<string, unknown>
	): Promise<string> {
		const snapshot: NewExecutionSnapshot = {
			executionId,
			stepNumber,
			timestamp: new Date(),
			state,
			description,
			checkpoint,
			type,
			metadata,
		};

		const [created] = await db
			.insert(executionSnapshots)
			.values(snapshot)
			.returning({ id: executionSnapshots.id });

		// Record observability event
		await enhancedObservability["collectEvent"](
			"snapshot_created",
			"debug",
			`Execution snapshot created: step ${stepNumber}`,
			{
				executionId,
				stepNumber,
				snapshotId: created.id,
				type,
				checkpoint,
				description,
			},
			"time-travel",
			["snapshot", "debug", type]
		);

		return created.id;
	}

	/**
	 * Create a checkpoint snapshot
	 */
	async createCheckpoint(
		executionId: string,
		stepNumber: number,
		state: Record<string, unknown>,
		description: string,
		metadata?: Record<string, unknown>
	): Promise<string> {
		return this.createSnapshot(
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
	 * Get execution snapshots
	 */
	async getExecutionSnapshots(
		executionId: string,
		options?: {
			fromStep?: number;
			toStep?: number;
			checkpointsOnly?: boolean;
		}
	): Promise<ExecutionSnapshot[]> {
		let query = db
			.select()
			.from(executionSnapshots)
			.where(eq(executionSnapshots.executionId, executionId));

		const conditions = [eq(executionSnapshots.executionId, executionId)];

		if (options?.fromStep !== undefined) {
			conditions.push(gte(executionSnapshots.stepNumber, options.fromStep));
		}

		if (options?.toStep !== undefined) {
			conditions.push(lte(executionSnapshots.stepNumber, options.toStep));
		}

		if (options?.checkpointsOnly) {
			conditions.push(eq(executionSnapshots.checkpoint, true));
		}

		if (conditions.length > 1) {
			query = query.where(and(...conditions));
		}

		return query.orderBy(executionSnapshots.stepNumber);
	}

	/**
	 * Get execution timeline
	 */
	async getExecutionTimeline(executionId: string): Promise<TimelineEntry[]> {
		// Get snapshots and events
		const [snapshots, events] = await Promise.all([
			this.getExecutionSnapshots(executionId),
			db
				.select()
				.from(observabilityEvents)
				.where(eq(observabilityEvents.executionId, executionId))
				.orderBy(observabilityEvents.timestamp),
		]);

		const timeline: TimelineEntry[] = [];

		// Add snapshots to timeline
		for (const snapshot of snapshots) {
			timeline.push({
				id: snapshot.id,
				executionId,
				stepNumber: snapshot.stepNumber,
				timestamp: snapshot.timestamp,
				type: "snapshot",
				title: `Step ${snapshot.stepNumber}: ${snapshot.type}`,
				description: snapshot.description || undefined,
				data: snapshot.state,
				checkpoint: snapshot.checkpoint,
			});
		}

		// Add events to timeline
		for (const event of events) {
			timeline.push({
				id: event.id,
				executionId,
				stepNumber: (event.metadata as any)?.stepNumber || 0,
				timestamp: event.timestamp,
				type: "event",
				title: event.type,
				description: event.message,
				data: event.data || {},
				severity: event.severity as any,
				checkpoint: false,
			});
		}

		// Sort by timestamp
		return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
	}

	/**
	 * Create a replay session
	 */
	async createReplaySession(executionId: string): Promise<ReplaySession> {
		const sessionId = `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// Get execution data
		const [snapshots, events, timeline] = await Promise.all([
			this.getExecutionSnapshots(executionId),
			db
				.select()
				.from(observabilityEvents)
				.where(eq(observabilityEvents.executionId, executionId))
				.orderBy(observabilityEvents.timestamp),
			this.getExecutionTimeline(executionId),
		]);

		const session: ReplaySession = {
			id: sessionId,
			executionId,
			currentStep: 0,
			totalSteps: snapshots.length,
			isPlaying: false,
			playbackSpeed: 1.0,
			snapshots,
			events,
			timeline,
			createdAt: new Date(),
		};

		this.activeSessions.set(sessionId, session);

		return session;
	}

	/**
	 * Get replay session
	 */
	getReplaySession(sessionId: string): ReplaySession | undefined {
		return this.activeSessions.get(sessionId);
	}

	/**
	 * Update replay session
	 */
	updateReplaySession(
		sessionId: string,
		updates: Partial<Pick<ReplaySession, "currentStep" | "isPlaying" | "playbackSpeed">>
	): ReplaySession | undefined {
		const session = this.activeSessions.get(sessionId);
		if (!session) return undefined;

		Object.assign(session, updates);
		return session;
	}

	/**
	 * Step forward in replay
	 */
	stepForward(sessionId: string): ReplaySession | undefined {
		const session = this.activeSessions.get(sessionId);
		if (!session) return undefined;

		if (session.currentStep < session.totalSteps - 1) {
			session.currentStep++;
		}

		return session;
	}

	/**
	 * Step backward in replay
	 */
	stepBackward(sessionId: string): ReplaySession | undefined {
		const session = this.activeSessions.get(sessionId);
		if (!session) return undefined;

		if (session.currentStep > 0) {
			session.currentStep--;
		}

		return session;
	}

	/**
	 * Jump to specific step
	 */
	jumpToStep(sessionId: string, stepNumber: number): ReplaySession | undefined {
		const session = this.activeSessions.get(sessionId);
		if (!session) return undefined;

		if (stepNumber >= 0 && stepNumber < session.totalSteps) {
			session.currentStep = stepNumber;
		}

		return session;
	}

	/**
	 * Get current state at step
	 */
	getCurrentState(sessionId: string): Record<string, unknown> | undefined {
		const session = this.activeSessions.get(sessionId);
		if (!session || session.currentStep >= session.snapshots.length) {
			return undefined;
		}

		return session.snapshots[session.currentStep].state;
	}

	/**
	 * Compare two executions
	 */
	async compareExecutions(
		executionIdA: string,
		executionIdB: string
	): Promise<ExecutionComparison> {
		// Get execution data
		const [executionA, executionB, snapshotsA, snapshotsB] = await Promise.all([
			db
				.select()
				.from(agentExecutions)
				.where(eq(agentExecutions.id, executionIdA))
				.then((rows) => rows[0]),
			db
				.select()
				.from(agentExecutions)
				.where(eq(agentExecutions.id, executionIdB))
				.then((rows) => rows[0]),
			this.getExecutionSnapshots(executionIdA),
			this.getExecutionSnapshots(executionIdB),
		]);

		if (!executionA || !executionB) {
			throw new Error("One or both executions not found");
		}

		// Find differences
		const differences: ExecutionDifference[] = [];
		const maxSteps = Math.max(snapshotsA.length, snapshotsB.length);
		let commonSteps = 0;
		let divergencePoint: number | undefined;

		for (let i = 0; i < maxSteps; i++) {
			const snapshotA = snapshotsA[i];
			const snapshotB = snapshotsB[i];

			if (!snapshotA) {
				differences.push({
					stepNumber: i,
					type: "missing",
					field: "snapshot",
					valueB: snapshotB?.state,
					description: `Step ${i} missing in execution A`,
				});
			} else if (snapshotB) {
				// Compare states
				const stateA = JSON.stringify(snapshotA.state);
				const stateB = JSON.stringify(snapshotB.state);

				if (stateA === stateB) {
					commonSteps++;
				} else {
					if (divergencePoint === undefined) {
						divergencePoint = i;
					}

					differences.push({
						stepNumber: i,
						type: "different",
						field: "state",
						valueA: snapshotA.state,
						valueB: snapshotB.state,
						description: `State differs at step ${i}`,
					});
				}
			} else {
				differences.push({
					stepNumber: i,
					type: "extra",
					field: "snapshot",
					valueA: snapshotA?.state,
					description: `Step ${i} missing in execution B`,
				});
			}
		}

		// Create summary
		const summary: ComparisonSummary = {
			totalSteps: { a: snapshotsA.length, b: snapshotsB.length },
			commonSteps,
			differences: differences.length,
			divergencePoint,
			outcome: { a: executionA.status, b: executionB.status },
			executionTime: {
				a: executionA.executionTimeMs || 0,
				b: executionB.executionTimeMs || 0,
			},
		};

		return {
			executionA,
			executionB,
			differences,
			commonSteps,
			divergencePoint,
			summary,
		};
	}

	/**
	 * Get rollback points for an execution
	 */
	async getRollbackPoints(executionId: string): Promise<RollbackPoint[]> {
		const checkpoints = await this.getExecutionSnapshots(executionId, {
			checkpointsOnly: true,
		});

		return checkpoints.map((checkpoint) => ({
			id: checkpoint.id,
			executionId,
			stepNumber: checkpoint.stepNumber,
			timestamp: checkpoint.timestamp,
			state: checkpoint.state,
			description: checkpoint.description || `Checkpoint at step ${checkpoint.stepNumber}`,
			canRollback: true,
			metadata: checkpoint.metadata,
		}));
	}

	/**
	 * Perform rollback to a specific checkpoint
	 */
	async rollbackToCheckpoint(
		executionId: string,
		checkpointId: string,
		reason: string
	): Promise<boolean> {
		// Get checkpoint
		const checkpoint = await db
			.select()
			.from(executionSnapshots)
			.where(
				and(
					eq(executionSnapshots.id, checkpointId),
					eq(executionSnapshots.executionId, executionId),
					eq(executionSnapshots.checkpoint, true)
				)
			)
			.then((rows) => rows[0]);

		if (!checkpoint) {
			throw new Error("Checkpoint not found or not a valid rollback point");
		}

		// Create rollback snapshot
		await this.createSnapshot(
			executionId,
			checkpoint.stepNumber,
			checkpoint.state,
			"rollback",
			`Rolled back to checkpoint: ${reason}`,
			true,
			{
				originalCheckpointId: checkpointId,
				rollbackReason: reason,
				rollbackTimestamp: new Date().toISOString(),
			}
		);

		// Record observability event
		await enhancedObservability["collectEvent"](
			"execution_rollback",
			"warn",
			`Execution rolled back to step ${checkpoint.stepNumber}`,
			{
				executionId,
				checkpointId,
				stepNumber: checkpoint.stepNumber,
				reason,
			},
			"time-travel",
			["rollback", "debug"]
		);

		return true;
	}

	/**
	 * Get execution statistics
	 */
	async getExecutionStatistics(executionId: string): Promise<{
		totalSnapshots: number;
		checkpoints: number;
		totalSteps: number;
		duration: number;
		averageStepTime: number;
		errorSteps: number;
		rollbacks: number;
	}> {
		const [snapshots, execution] = await Promise.all([
			this.getExecutionSnapshots(executionId),
			db
				.select()
				.from(agentExecutions)
				.where(eq(agentExecutions.id, executionId))
				.then((rows) => rows[0]),
		]);

		if (!execution) {
			throw new Error("Execution not found");
		}

		const checkpoints = snapshots.filter((s) => s.checkpoint).length;
		const errorSteps = snapshots.filter((s) => s.type === "error").length;
		const rollbacks = snapshots.filter((s) => s.type === "rollback").length;

		const duration = execution.executionTimeMs || 0;
		const averageStepTime = snapshots.length > 0 ? duration / snapshots.length : 0;

		return {
			totalSnapshots: snapshots.length,
			checkpoints,
			totalSteps: snapshots.length,
			duration,
			averageStepTime: Math.round(averageStepTime),
			errorSteps,
			rollbacks,
		};
	}

	/**
	 * Clean up old replay sessions
	 */
	cleanupSessions(maxAge = 3600000): void {
		// 1 hour default
		const cutoff = Date.now() - maxAge;

		for (const [sessionId, session] of this.activeSessions.entries()) {
			if (session.createdAt.getTime() < cutoff) {
				this.activeSessions.delete(sessionId);
			}
		}
	}

	/**
	 * Get active sessions count
	 */
	getActiveSessionsCount(): number {
		return this.activeSessions.size;
	}

	/**
	 * Destroy replay session
	 */
	destroySession(sessionId: string): boolean {
		return this.activeSessions.delete(sessionId);
	}
}

// Export singleton instance
export const timeTravelDebug = TimeTravelDebugService.getInstance();

// Convenience functions
export const timeTravel = {
	/**
	 * Create snapshot with automatic step tracking
	 */
	async snapshot(
		executionId: string,
		state: Record<string, unknown>,
		description?: string,
		checkpoint = false
	): Promise<string> {
		// Get current step number
		const snapshots = await timeTravelDebug.getExecutionSnapshots(executionId);
		const stepNumber = snapshots.length;

		return timeTravelDebug.createSnapshot(
			executionId,
			stepNumber,
			state,
			"step_start",
			description,
			checkpoint
		);
	},

	/**
	 * Create checkpoint
	 */
	async checkpoint(
		executionId: string,
		state: Record<string, unknown>,
		description: string
	): Promise<string> {
		const snapshots = await timeTravelDebug.getExecutionSnapshots(executionId);
		const stepNumber = snapshots.length;

		return timeTravelDebug.createCheckpoint(executionId, stepNumber, state, description);
	},

	/**
	 * Start replay session
	 */
	async startReplay(executionId: string): Promise<ReplaySession> {
		return timeTravelDebug.createReplaySession(executionId);
	},

	/**
	 * Compare executions
	 */
	async compare(executionIdA: string, executionIdB: string): Promise<ExecutionComparison> {
		return timeTravelDebug.compareExecutions(executionIdA, executionIdB);
	},

	/**
	 * Get rollback points
	 */
	async getRollbackPoints(executionId: string): Promise<RollbackPoint[]> {
		return timeTravelDebug.getRollbackPoints(executionId);
	},

	/**
	 * Rollback to checkpoint
	 */
	async rollback(executionId: string, checkpointId: string, reason: string): Promise<boolean> {
		return timeTravelDebug.rollbackToCheckpoint(executionId, checkpointId, reason);
	},
};
