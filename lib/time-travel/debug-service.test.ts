/**
 * Time-Travel Debug Service Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimeTravelDebugService } from "./debug-service";

// Mock database
vi.mock("@/db/config", () => ({
	db: {
		insert: vi.fn().mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([{ id: "test-snapshot-id" }]),
			}),
		}),
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockResolvedValue([]),
				}),
			}),
		}),
		update: vi.fn().mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue({}),
			}),
		}),
	},
}));

// Mock observability
vi.mock("@/lib/observability/enhanced-events-system", () => ({
	enhancedObservability: {
		collectEvent: vi.fn().mockResolvedValue(undefined),
	},
}));

describe("TimeTravelDebugService", () => {
	let service: TimeTravelDebugService;

	beforeEach(() => {
		service = TimeTravelDebugService.getInstance();
		vi.clearAllMocks();
	});

	describe("createSnapshot", () => {
		it("should create a snapshot with required fields", async () => {
			const executionId = "test-execution-id";
			const stepNumber = 1;
			const state = { status: "running", data: "test" };

			const snapshotId = await service.createSnapshot(executionId, stepNumber, state);

			expect(snapshotId).toBe("test-snapshot-id");
		});

		it("should create a checkpoint snapshot", async () => {
			const executionId = "test-execution-id";
			const stepNumber = 5;
			const state = { status: "checkpoint", data: "test" };
			const description = "Test checkpoint";

			const snapshotId = await service.createCheckpoint(
				executionId,
				stepNumber,
				state,
				description
			);

			expect(snapshotId).toBe("test-snapshot-id");
		});
	});

	describe("createReplaySession", () => {
		it("should create a replay session", async () => {
			const executionId = "test-execution-id";

			const session = await service.createReplaySession(executionId);

			expect(session).toMatchObject({
				executionId,
				currentStep: 0,
				isPlaying: false,
				playbackSpeed: 1.0,
			});
			expect(session.id).toMatch(/^replay_/);
		});
	});

	describe("replay controls", () => {
		it("should step forward in replay", async () => {
			const executionId = "test-execution-id";
			const session = await service.createReplaySession(executionId);

			const updatedSession = service.stepForward(session.id);

			expect(updatedSession?.currentStep).toBe(0); // No snapshots, so stays at 0
		});

		it("should step backward in replay", async () => {
			const executionId = "test-execution-id";
			const session = await service.createReplaySession(executionId);

			// Move forward first
			service.updateReplaySession(session.id, { currentStep: 2 });

			const updatedSession = service.stepBackward(session.id);

			expect(updatedSession?.currentStep).toBe(1);
		});

		it("should jump to specific step", async () => {
			const executionId = "test-execution-id";
			const session = await service.createReplaySession(executionId);

			const updatedSession = service.jumpToStep(session.id, 3);

			expect(updatedSession?.currentStep).toBe(0); // No snapshots, so stays at 0
		});
	});

	describe("compareExecutions", () => {
		it("should compare two executions", async () => {
			const executionIdA = "execution-a";
			const executionIdB = "execution-b";

			// Mock database responses
			const mockExecutionA = {
				id: executionIdA,
				status: "completed",
				executionTimeMs: 1000,
				agentType: "test-agent",
				startedAt: new Date(),
			};

			const mockExecutionB = {
				id: executionIdB,
				status: "failed",
				executionTimeMs: 800,
				agentType: "test-agent",
				startedAt: new Date(),
			};

			// Mock the database calls
			vi.mocked(require("@/db/config").db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						then: vi
							.fn()
							.mockResolvedValueOnce([mockExecutionA])
							.mockResolvedValueOnce([mockExecutionB]),
					}),
				}),
			});

			const comparison = await service.compareExecutions(executionIdA, executionIdB);

			expect(comparison.executionA).toEqual(mockExecutionA);
			expect(comparison.executionB).toEqual(mockExecutionB);
			expect(comparison.summary.outcome).toEqual({
				a: "completed",
				b: "failed",
			});
		});
	});

	describe("rollback", () => {
		it("should rollback to checkpoint", async () => {
			const executionId = "test-execution-id";
			const checkpointId = "test-checkpoint-id";
			const reason = "Test rollback";

			// Mock checkpoint data
			const mockCheckpoint = {
				id: checkpointId,
				executionId,
				stepNumber: 3,
				state: { status: "checkpoint" },
				checkpoint: true,
			};

			vi.mocked(require("@/db/config").db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						then: vi.fn().mockResolvedValue([mockCheckpoint]),
					}),
				}),
			});

			const result = await service.rollbackToCheckpoint(executionId, checkpointId, reason);

			expect(result).toBe(true);
		});
	});

	describe("session management", () => {
		it("should track active sessions", async () => {
			const executionId = "test-execution-id";

			expect(service.getActiveSessionsCount()).toBe(0);

			const session = await service.createReplaySession(executionId);

			expect(service.getActiveSessionsCount()).toBe(1);
			expect(service.getReplaySession(session.id)).toBeDefined();

			service.destroySession(session.id);

			expect(service.getActiveSessionsCount()).toBe(0);
			expect(service.getReplaySession(session.id)).toBeUndefined();
		});

		it("should cleanup old sessions", async () => {
			const executionId = "test-execution-id";
			const session = await service.createReplaySession(executionId);

			// Mock old timestamp
			session.createdAt = new Date(Date.now() - 7200000); // 2 hours ago

			service.cleanupSessions(3600000); // 1 hour max age

			expect(service.getActiveSessionsCount()).toBe(0);
		});
	});
});
