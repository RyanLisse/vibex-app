/**
 * Time-Travel Replay Engine
 *
 * Provides step-by-step replay functionality with timeline visualization,
 * execution comparison, and rollback capabilities for debugging agent executions.
 */

import { SnapshotType, snapshotManager } from "./execution-snapshots";

// Replay state
export type ReplayState =
	| "idle"
	| "loading"
	| "ready"
	| "playing"
	| "paused"
	| "completed"
	| "error";

// Replay direction
export type ReplayDirection = "forward" | "backward";

// Replay speed
export type ReplaySpeed = 0.25 | 0.5 | 1 | 2 | 4 | 8;

// Replay event types
export interface ReplayEvents {
	stateChanged: (state: ReplayState) => void;
	snapshotChanged: (snapshot: ExecutionSnapshot, index: number) => void;
	progressChanged: (progress: number) => void;
	speedChanged: (speed: ReplaySpeed) => void;
	error: (error: Error) => void;
	completed: () => void;
}

// Replay session interface
export interface ReplaySession {
	id: string;
	executionId: string;
	snapshots: ExecutionSnapshot[];
	currentIndex: number;
	state: ReplayState;
	speed: ReplaySpeed;
	direction: ReplayDirection;
	startTime: Date;
	endTime?: Date;
	metadata: {
		totalSteps: number;
		duration: number;
		checkpoints: number[];
		errors: number[];
	};
}

// Time-travel replay engine
export class TimeTravelReplayEngine extends EventEmitter {
	private sessions: Map<string, ReplaySession> = new Map();
	private activeSessionId: string | null = null;
	private playbackTimer: NodeJS.Timeout | null = null;

	constructor() {
		super();
		this.setMaxListeners(100);
	}

	/**
	 * Create a new replay session
	 */
	async createReplaySession(
		executionId: string,
		options: {
			fromStep?: number;
			toStep?: number;
			includeCheckpointsOnly?: boolean;
		} = {},
	): Promise<string> {
		try {
			const sessionId = `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			// Load snapshots
			const snapshots = await snapshotManager.getExecutionSnapshots(
				executionId,
				{
					fromStep: options.fromStep,
					toStep: options.toStep,
					checkpointsOnly: options.includeCheckpointsOnly,
					limit: 1000, // Reasonable limit for replay
				},
			);

			if (snapshots.length === 0) {
				throw new Error("No snapshots found for execution");
			}

			// Create session
			const session: ReplaySession = {
				id: sessionId,
				executionId,
				snapshots: snapshots.reverse(), // Chronological order
				currentIndex: 0,
				state: "ready",
				speed: 1,
				direction: "forward",
				startTime: new Date(),
				metadata: {
					totalSteps: snapshots.length,
					duration: 0,
					checkpoints: snapshots
						.map((s, i) => (s.metadata.isCheckpoint ? i : -1))
						.filter((i) => i !== -1),
					errors: snapshots
						.map((s, i) => (s.type === "error_state" ? i : -1))
						.filter((i) => i !== -1),
				},
			};

			this.sessions.set(sessionId, session);

			// Record event
			await observability.events.collector.collectEvent(
				"system_event",
				"info",
				`Replay session created for execution ${executionId}`,
				{
					sessionId,
					executionId,
					snapshotCount: snapshots.length,
					options,
				},
				"time-travel",
				["replay", "session", "create"],
			);

			return sessionId;
		} catch (error) {
			await observability.events.collector.collectEvent(
				"system_event",
				"error",
				`Failed to create replay session for execution ${executionId}`,
				{
					executionId,
					error: error instanceof Error ? error.message : "Unknown error",
				},
				"time-travel",
				["replay", "session", "error"],
			);
			throw error;
		}
	}

	/**
	 * Start replay session
	 */
	async startReplay(sessionId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Replay session ${sessionId} not found`);
		}

		if (session.state === "playing") {
			return; // Already playing
		}

		this.activeSessionId = sessionId;
		session.state = "playing";
		this.emit("stateChanged", session.state);

		// Start playback
		this.scheduleNextStep(session);

		// Record event
		await observability.events.collector.collectEvent(
			"user_action",
			"info",
			`Replay started for session ${sessionId}`,
			{
				sessionId,
				executionId: session.executionId,
				currentIndex: session.currentIndex,
				speed: session.speed,
			},
			"time-travel",
			["replay", "start"],
		);
	}

	/**
	 * Pause replay session
	 */
	async pauseReplay(sessionId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Replay session ${sessionId} not found`);
		}

		session.state = "paused";
		this.clearPlaybackTimer();
		this.emit("stateChanged", session.state);

		// Record event
		await observability.events.collector.collectEvent(
			"user_action",
			"info",
			`Replay paused for session ${sessionId}`,
			{
				sessionId,
				executionId: session.executionId,
				currentIndex: session.currentIndex,
			},
			"time-travel",
			["replay", "pause"],
		);
	}

	/**
	 * Stop replay session
	 */
	async stopReplay(sessionId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Replay session ${sessionId} not found`);
		}

		session.state = "idle";
		session.currentIndex = 0;
		session.endTime = new Date();
		this.clearPlaybackTimer();

		if (this.activeSessionId === sessionId) {
			this.activeSessionId = null;
		}

		this.emit("stateChanged", session.state);
		this.emit("snapshotChanged", session.snapshots[0], 0);
		this.emit("progressChanged", 0);

		// Record event
		await observability.events.collector.collectEvent(
			"user_action",
			"info",
			`Replay stopped for session ${sessionId}`,
			{
				sessionId,
				executionId: session.executionId,
				finalIndex: session.currentIndex,
				duration: session.endTime.getTime() - session.startTime.getTime(),
			},
			"time-travel",
			["replay", "stop"],
		);
	}

	/**
	 * Step to specific snapshot
	 */
	async stepTo(sessionId: string, index: number): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Replay session ${sessionId} not found`);
		}

		if (index < 0 || index >= session.snapshots.length) {
			throw new Error(`Invalid snapshot index: ${index}`);
		}

		const wasPlaying = session.state === "playing";
		if (wasPlaying) {
			this.clearPlaybackTimer();
		}

		session.currentIndex = index;
		const snapshot = session.snapshots[index];

		this.emit("snapshotChanged", snapshot, index);
		this.emit(
			"progressChanged",
			(index / (session.snapshots.length - 1)) * 100,
		);

		if (wasPlaying) {
			this.scheduleNextStep(session);
		}

		// Record event
		await observability.events.collector.collectEvent(
			"user_action",
			"debug",
			`Stepped to snapshot ${index} in session ${sessionId}`,
			{
				sessionId,
				executionId: session.executionId,
				snapshotId: snapshot.id,
				stepNumber: snapshot.stepNumber,
				snapshotType: snapshot.type,
			},
			"time-travel",
			["replay", "step"],
		);
	}

	/**
	 * Step forward one snapshot
	 */
	async stepForward(sessionId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Replay session ${sessionId} not found`);
		}

		const nextIndex = Math.min(
			session.currentIndex + 1,
			session.snapshots.length - 1,
		);
		await this.stepTo(sessionId, nextIndex);
	}

	/**
	 * Step backward one snapshot
	 */
	async stepBackward(sessionId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Replay session ${sessionId} not found`);
		}

		const prevIndex = Math.max(session.currentIndex - 1, 0);
		await this.stepTo(sessionId, prevIndex);
	}

	/**
	 * Jump to next checkpoint
	 */
	async jumpToNextCheckpoint(sessionId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Replay session ${sessionId} not found`);
		}

		const nextCheckpoint = session.metadata.checkpoints.find(
			(index) => index > session.currentIndex,
		);

		if (nextCheckpoint !== undefined) {
			await this.stepTo(sessionId, nextCheckpoint);
		}
	}

	/**
	 * Jump to previous checkpoint
	 */
	async jumpToPreviousCheckpoint(sessionId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Replay session ${sessionId} not found`);
		}

		const prevCheckpoint = session.metadata.checkpoints
			.slice()
			.reverse()
			.find((index) => index < session.currentIndex);

		if (prevCheckpoint !== undefined) {
			await this.stepTo(sessionId, prevCheckpoint);
		}
	}

	/**
	 * Set replay speed
	 */
	async setSpeed(sessionId: string, speed: ReplaySpeed): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Replay session ${sessionId} not found`);
		}

		session.speed = speed;
		this.emit("speedChanged", speed);

		// If playing, restart with new speed
		if (session.state === "playing") {
			this.clearPlaybackTimer();
			this.scheduleNextStep(session);
		}
	}

	/**
	 * Get session information
	 */
	getSession(sessionId: string): ReplaySession | null {
		return this.sessions.get(sessionId) || null;
	}

	/**
	 * Get current snapshot
	 */
	getCurrentSnapshot(sessionId: string): ExecutionSnapshot | null {
		const session = this.sessions.get(sessionId);
		if (!session) return null;

		return session.snapshots[session.currentIndex] || null;
	}

	/**
	 * Compare current snapshot with another
	 */
	compareWithSnapshot(sessionId: string, compareIndex: number): any {
		const session = this.sessions.get(sessionId);
		if (!session) return null;

		const currentSnapshot = session.snapshots[session.currentIndex];
		const compareSnapshot = session.snapshots[compareIndex];

		if (!(currentSnapshot && compareSnapshot)) return null;

		return snapshotManager.compareSnapshots(currentSnapshot, compareSnapshot);
	}

	/**
	 * Delete replay session
	 */
	async deleteSession(sessionId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		// Stop if active
		if (this.activeSessionId === sessionId) {
			await this.stopReplay(sessionId);
		}

		this.sessions.delete(sessionId);

		// Record event
		await observability.events.collector.collectEvent(
			"system_event",
			"info",
			`Replay session deleted: ${sessionId}`,
			{
				sessionId,
				executionId: session.executionId,
				duration: session.endTime
					? session.endTime.getTime() - session.startTime.getTime()
					: Date.now() - session.startTime.getTime(),
			},
			"time-travel",
			["replay", "session", "delete"],
		);
	}

	/**
	 * Schedule next step in playback
	 */
	private scheduleNextStep(session: ReplaySession): void {
		const delay = 1000 / session.speed; // Base delay of 1 second

		this.playbackTimer = setTimeout(async () => {
			if (session.state !== "playing") return;

			const nextIndex = session.currentIndex + 1;
			if (nextIndex >= session.snapshots.length) {
				// Replay completed
				session.state = "completed";
				session.endTime = new Date();
				this.emit("stateChanged", session.state);
				this.emit("completed");
				return;
			}

			await this.stepTo(session.id, nextIndex);
		}, delay);
	}

	/**
	 * Clear playback timer
	 */
	private clearPlaybackTimer(): void {
		if (this.playbackTimer) {
			clearTimeout(this.playbackTimer);
			this.playbackTimer = null;
		}
	}
}

// Export singleton instance
export const replayEngine = new TimeTravelReplayEngine();

// Export time travel service instance
export const timeTravelService = {
	startRecording: async () => ({ sessionId: "mock", startTime: new Date() }),
	stopRecording: async () => ({
		sessionId: "mock",
		endTime: new Date(),
		eventsCount: 0,
	}),
	replay: async () => ({ events: [], duration: 0 }),
	compareSnapshots: async () => ({ differences: [], similarity: 1 }),
	getSession: async () => null,
	listSessions: async () => [],
};
