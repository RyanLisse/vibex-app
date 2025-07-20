/**
 * Debug Session Manager
 *
 * Manages time-travel debugging sessions with comprehensive logging,
 * state tracking, and persistence capabilities.
 */

import { and, desc, eq, gte, lte } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "@/db/config";
import { agentExecutions, executionSnapshots, users } from "@/db/schema";
import { observability } from "@/lib/observability";
import type { ExecutionSnapshot, ExecutionState } from "@/lib/time-travel";
import { timeTravel } from "@/lib/time-travel";

// Debug session status
export type DebugSessionStatus = "active" | "paused" | "completed" | "archived";

// Debug session metadata
export interface DebugSessionMetadata {
	executionId: string;
	userId: string;
	agentType: string;
	taskId?: string;
	startedAt: Date;
	endedAt?: Date;
	breakpoints: number[];
	watchedVariables: string[];
	notes: string[];
	tags: string[];
}

// Debug session interface
export interface DebugSession {
	id: string;
	status: DebugSessionStatus;
	metadata: DebugSessionMetadata;
	replaySessionId?: string;
	currentSnapshot?: ExecutionSnapshot;
	currentStepNumber: number;
	totalSteps: number;
	checkpoints: number[];
	errors: Array<{
		stepNumber: number;
		error: Error;
		timestamp: Date;
	}>;
	performance: {
		snapshotLoadTime: number;
		totalReplayTime: number;
		averageStepTime: number;
	};
}

// Debug session storage
interface StoredDebugSession {
	id: string;
	userId: string;
	executionId: string;
	status: DebugSessionStatus;
	metadata: DebugSessionMetadata;
	createdAt: Date;
	updatedAt: Date;
	expiresAt?: Date;
}

// Debug session manager class
export class DebugSessionManager {
	private static instance: DebugSessionManager;
	private sessions: Map<string, DebugSession> = new Map();
	private sessionStorage: Map<string, StoredDebugSession> = new Map();
	private readonly MAX_ACTIVE_SESSIONS = 10;
	private readonly SESSION_EXPIRY_HOURS = 24;

	private constructor() {
		this.setupPeriodicCleanup();
	}

	static getInstance(): DebugSessionManager {
		if (!DebugSessionManager.instance) {
			DebugSessionManager.instance = new DebugSessionManager();
		}
		return DebugSessionManager.instance;
	}

	/**
	 * Create a new debug session
	 */
	async createSession(
		executionId: string,
		userId: string,
		options: {
			breakpoints?: number[];
			watchedVariables?: string[];
			tags?: string[];
		} = {},
	): Promise<DebugSession> {
		try {
			// Load execution details
			const [execution] = await db
				.select()
				.from(agentExecutions)
				.where(eq(agentExecutions.id, executionId))
				.limit(1);

			if (!execution) {
				throw new Error(`Execution ${executionId} not found`);
			}

			// Get snapshot count
			const snapshots = await db
				.select({ stepNumber: executionSnapshots.stepNumber })
				.from(executionSnapshots)
				.where(eq(executionSnapshots.executionId, executionId))
				.orderBy(desc(executionSnapshots.stepNumber));

			const totalSteps = snapshots.length;
			const checkpoints = snapshots
				.filter((s) => s.checkpoint)
				.map((s) => s.stepNumber);

			// Create session
			const sessionId = ulid();
			const session: DebugSession = {
				id: sessionId,
				status: "active",
				metadata: {
					executionId,
					userId,
					agentType: execution.agentType,
					taskId: execution.taskId || undefined,
					startedAt: new Date(),
					breakpoints: options.breakpoints || [],
					watchedVariables: options.watchedVariables || [],
					notes: [],
					tags: options.tags || ["debug", "time-travel"],
				},
				currentStepNumber: 0,
				totalSteps,
				checkpoints,
				errors: [],
				performance: {
					snapshotLoadTime: 0,
					totalReplayTime: 0,
					averageStepTime: 0,
				},
			};

			// Store session
			this.sessions.set(sessionId, session);

			// Create stored session
			const storedSession: StoredDebugSession = {
				id: sessionId,
				userId,
				executionId,
				status: "active",
				metadata: session.metadata,
				createdAt: new Date(),
				updatedAt: new Date(),
				expiresAt: new Date(
					Date.now() + this.SESSION_EXPIRY_HOURS * 60 * 60 * 1000,
				),
			};
			this.sessionStorage.set(sessionId, storedSession);

			// Create replay session
			const replaySessionId = await timeTravel.startReplay(executionId, {
				fromStep: 0,
				toStep: totalSteps - 1,
			});
			session.replaySessionId = replaySessionId;

			// Record event
			await observability.recordEvent("debug.session.created", {
				sessionId,
				executionId,
				userId,
				agentType: execution.agentType,
				totalSteps,
				checkpointCount: checkpoints.length,
			});

			// Clean up old sessions if needed
			await this.cleanupOldSessions(userId);

			return session;
		} catch (error) {
			await observability.recordError("debug.session.create", error as Error);
			throw error;
		}
	}

	/**
	 * Get debug session
	 */
	getSession(sessionId: string): DebugSession | null {
		return this.sessions.get(sessionId) || null;
	}

	/**
	 * Get user's debug sessions
	 */
	async getUserSessions(userId: string): Promise<DebugSession[]> {
		const userSessions: DebugSession[] = [];

		for (const [sessionId, storedSession] of this.sessionStorage) {
			if (storedSession.userId === userId) {
				const session = this.sessions.get(sessionId);
				if (session) {
					userSessions.push(session);
				}
			}
		}

		return userSessions.sort(
			(a, b) => b.metadata.startedAt.getTime() - a.metadata.startedAt.getTime(),
		);
	}

	/**
	 * Update session status
	 */
	async updateSessionStatus(
		sessionId: string,
		status: DebugSessionStatus,
	): Promise<void> {
		const session = this.sessions.get(sessionId);
		const storedSession = this.sessionStorage.get(sessionId);

		if (!(session && storedSession)) {
			throw new Error(`Debug session ${sessionId} not found`);
		}

		session.status = status;
		storedSession.status = status;
		storedSession.updatedAt = new Date();

		if (status === "completed") {
			session.metadata.endedAt = new Date();
		}

		await observability.recordEvent("debug.session.status_changed", {
			sessionId,
			oldStatus: session.status,
			newStatus: status,
		});
	}

	/**
	 * Add breakpoint to session
	 */
	async addBreakpoint(sessionId: string, stepNumber: number): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Debug session ${sessionId} not found`);
		}

		if (!session.metadata.breakpoints.includes(stepNumber)) {
			session.metadata.breakpoints.push(stepNumber);
			session.metadata.breakpoints.sort((a, b) => a - b);
		}

		await observability.recordEvent("debug.breakpoint.added", {
			sessionId,
			stepNumber,
			totalBreakpoints: session.metadata.breakpoints.length,
		});
	}

	/**
	 * Remove breakpoint from session
	 */
	async removeBreakpoint(sessionId: string, stepNumber: number): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Debug session ${sessionId} not found`);
		}

		session.metadata.breakpoints = session.metadata.breakpoints.filter(
			(bp) => bp !== stepNumber,
		);

		await observability.recordEvent("debug.breakpoint.removed", {
			sessionId,
			stepNumber,
			remainingBreakpoints: session.metadata.breakpoints.length,
		});
	}

	/**
	 * Add watched variable
	 */
	async addWatchedVariable(sessionId: string, variable: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Debug session ${sessionId} not found`);
		}

		if (!session.metadata.watchedVariables.includes(variable)) {
			session.metadata.watchedVariables.push(variable);
		}

		await observability.recordEvent("debug.watch.added", {
			sessionId,
			variable,
			totalWatches: session.metadata.watchedVariables.length,
		});
	}

	/**
	 * Remove watched variable
	 */
	async removeWatchedVariable(
		sessionId: string,
		variable: string,
	): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Debug session ${sessionId} not found`);
		}

		session.metadata.watchedVariables =
			session.metadata.watchedVariables.filter((v) => v !== variable);

		await observability.recordEvent("debug.watch.removed", {
			sessionId,
			variable,
			remainingWatches: session.metadata.watchedVariables.length,
		});
	}

	/**
	 * Add note to session
	 */
	async addNote(sessionId: string, note: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Debug session ${sessionId} not found`);
		}

		session.metadata.notes.push(note);

		await observability.recordEvent("debug.note.added", {
			sessionId,
			noteLength: note.length,
			totalNotes: session.metadata.notes.length,
		});
	}

	/**
	 * Step to specific snapshot
	 */
	async stepTo(
		sessionId: string,
		stepNumber: number,
	): Promise<ExecutionSnapshot | null> {
		const session = this.sessions.get(sessionId);
		if (!(session && session.replaySessionId)) {
			throw new Error(
				`Debug session ${sessionId} not found or not initialized`,
			);
		}

		const startTime = Date.now();

		try {
			// Use replay engine to step to the snapshot
			await timeTravel.controlReplay(session.replaySessionId, "step-forward", {
				index: stepNumber,
			});

			// Get the current snapshot
			const replaySession = timeTravel.replay.getSession(
				session.replaySessionId,
			);
			if (!replaySession) {
				throw new Error("Replay session not found");
			}

			const snapshot = replaySession.snapshots[stepNumber];
			if (!snapshot) {
				throw new Error(`Snapshot at step ${stepNumber} not found`);
			}

			// Update session
			session.currentSnapshot = snapshot;
			session.currentStepNumber = stepNumber;

			// Update performance metrics
			const loadTime = Date.now() - startTime;
			session.performance.snapshotLoadTime = loadTime;
			session.performance.totalReplayTime += loadTime;
			session.performance.averageStepTime =
				session.performance.totalReplayTime / (session.currentStepNumber + 1);

			// Check for breakpoints
			if (session.metadata.breakpoints.includes(stepNumber)) {
				await this.handleBreakpoint(sessionId, stepNumber);
			}

			// Check for errors in snapshot
			if (snapshot.type === "error_state" && snapshot.state.error) {
				session.errors.push({
					stepNumber,
					error: new Error(snapshot.state.error.message),
					timestamp: new Date(),
				});
			}

			await observability.recordEvent("debug.step", {
				sessionId,
				stepNumber,
				snapshotType: snapshot.type,
				loadTime,
			});

			return snapshot;
		} catch (error) {
			await observability.recordError("debug.step", error as Error);
			throw error;
		}
	}

	/**
	 * Step forward
	 */
	async stepForward(sessionId: string): Promise<ExecutionSnapshot | null> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Debug session ${sessionId} not found`);
		}

		const nextStep = Math.min(
			session.currentStepNumber + 1,
			session.totalSteps - 1,
		);
		return this.stepTo(sessionId, nextStep);
	}

	/**
	 * Step backward
	 */
	async stepBackward(sessionId: string): Promise<ExecutionSnapshot | null> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Debug session ${sessionId} not found`);
		}

		const prevStep = Math.max(session.currentStepNumber - 1, 0);
		return this.stepTo(sessionId, prevStep);
	}

	/**
	 * Continue to next breakpoint
	 */
	async continueToBreakpoint(
		sessionId: string,
	): Promise<ExecutionSnapshot | null> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Debug session ${sessionId} not found`);
		}

		const nextBreakpoint = session.metadata.breakpoints.find(
			(bp) => bp > session.currentStepNumber,
		);

		if (nextBreakpoint !== undefined) {
			return this.stepTo(sessionId, nextBreakpoint);
		}

		// No more breakpoints, go to end
		return this.stepTo(sessionId, session.totalSteps - 1);
	}

	/**
	 * Get watched variables at current step
	 */
	async getWatchedVariables(sessionId: string): Promise<Record<string, any>> {
		const session = this.sessions.get(sessionId);
		if (!(session && session.currentSnapshot)) {
			throw new Error(
				`Debug session ${sessionId} not found or no current snapshot`,
			);
		}

		const watchedValues: Record<string, any> = {};
		const state = session.currentSnapshot.state;

		for (const variable of session.metadata.watchedVariables) {
			// Parse variable path (e.g., "memory.shortTerm.userId")
			const value = this.getNestedValue(state, variable);
			watchedValues[variable] = value;
		}

		return watchedValues;
	}

	/**
	 * Export session data
	 */
	async exportSession(sessionId: string): Promise<any> {
		const session = this.sessions.get(sessionId);
		const storedSession = this.sessionStorage.get(sessionId);

		if (!(session && storedSession)) {
			throw new Error(`Debug session ${sessionId} not found`);
		}

		// Get all snapshots for the execution
		const snapshots = await timeTravel.snapshots.getExecutionSnapshots(
			session.metadata.executionId,
		);

		const exportData = {
			session: {
				id: session.id,
				status: session.status,
				metadata: session.metadata,
				currentStepNumber: session.currentStepNumber,
				totalSteps: session.totalSteps,
				checkpoints: session.checkpoints,
				errors: session.errors,
				performance: session.performance,
			},
			snapshots: snapshots.map((s) => ({
				id: s.id,
				type: s.type,
				stepNumber: s.stepNumber,
				timestamp: s.timestamp,
				state: s.state,
				metadata: s.metadata,
			})),
			exportedAt: new Date(),
			version: "1.0.0",
		};

		await observability.recordEvent("debug.session.exported", {
			sessionId,
			snapshotCount: snapshots.length,
			exportSize: JSON.stringify(exportData).length,
		});

		return exportData;
	}

	/**
	 * Close debug session
	 */
	async closeSession(sessionId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		// Stop replay if active
		if (session.replaySessionId) {
			await timeTravel.replay.deleteSession(session.replaySessionId);
		}

		// Update status
		await this.updateSessionStatus(sessionId, "completed");

		// Record final metrics
		await observability.recordEvent("debug.session.closed", {
			sessionId,
			duration: session.metadata.endedAt
				? session.metadata.endedAt.getTime() -
					session.metadata.startedAt.getTime()
				: Date.now() - session.metadata.startedAt.getTime(),
			stepsAnalyzed: session.currentStepNumber,
			errorsFound: session.errors.length,
			performance: session.performance,
		});

		// Remove from active sessions
		this.sessions.delete(sessionId);
	}

	/**
	 * Handle breakpoint hit
	 */
	private async handleBreakpoint(
		sessionId: string,
		stepNumber: number,
	): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		// Pause the session
		await this.updateSessionStatus(sessionId, "paused");

		// Record breakpoint hit
		await observability.recordEvent("debug.breakpoint.hit", {
			sessionId,
			stepNumber,
			currentState: session.currentSnapshot?.state,
		});
	}

	/**
	 * Get nested value from object
	 */
	private getNestedValue(obj: any, path: string): any {
		const keys = path.split(".");
		let value = obj;

		for (const key of keys) {
			if (value && typeof value === "object" && key in value) {
				value = value[key];
			} else {
				return;
			}
		}

		return value;
	}

	/**
	 * Clean up old sessions
	 */
	private async cleanupOldSessions(userId: string): Promise<void> {
		const userSessions = await this.getUserSessions(userId);

		// Keep only the most recent sessions
		if (userSessions.length > this.MAX_ACTIVE_SESSIONS) {
			const sessionsToRemove = userSessions
				.slice(this.MAX_ACTIVE_SESSIONS)
				.filter((s) => s.status !== "active");

			for (const session of sessionsToRemove) {
				await this.closeSession(session.id);
				this.sessionStorage.delete(session.id);
			}
		}
	}

	/**
	 * Setup periodic cleanup
	 */
	private setupPeriodicCleanup(): void {
		setInterval(
			async () => {
				const now = Date.now();

				for (const [sessionId, storedSession] of this.sessionStorage) {
					if (
						storedSession.expiresAt &&
						storedSession.expiresAt.getTime() < now &&
						storedSession.status !== "active"
					) {
						await this.closeSession(sessionId);
						this.sessionStorage.delete(sessionId);
					}
				}
			},
			60 * 60 * 1000,
		); // Every hour
	}
}

// Export singleton instance
export const debugSessionManager = DebugSessionManager.getInstance();
