/**
 * Time-Travel Debugging Hooks
 *
 * React hooks for time-travel debugging functionality including snapshots,
 * replay sessions, execution comparison, and rollback operations.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type {
	ExecutionComparison,
	ExecutionSnapshot,
	ReplaySession,
	RollbackPoint,
	SnapshotType,
	TimelineEntry,
} from "@/lib/time-travel/debug-service";

// API client functions
const api = {
	async createSnapshot(data: {
		executionId: string;
		stepNumber: number;
		state: Record<string, unknown>;
		type?: SnapshotType;
		description?: string;
		checkpoint?: boolean;
		metadata?: Record<string, unknown>;
	}) {
		const response = await fetch("/api/time-travel/snapshots", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to create snapshot");
		}

		return response.json();
	},

	async getSnapshots(
		executionId: string,
		options?: {
			fromStep?: number;
			toStep?: number;
			checkpointsOnly?: boolean;
		}
	) {
		const params = new URLSearchParams({ executionId });

		if (options?.fromStep !== undefined) {
			params.append("fromStep", options.fromStep.toString());
		}
		if (options?.toStep !== undefined) {
			params.append("toStep", options.toStep.toString());
		}
		if (options?.checkpointsOnly) {
			params.append("checkpointsOnly", "true");
		}

		const response = await fetch(`/api/time-travel/snapshots?${params}`);

		if (!response.ok) {
			throw new Error("Failed to get snapshots");
		}

		return response.json();
	},

	async getTimeline(executionId: string) {
		const response = await fetch(`/api/time-travel/timeline?executionId=${executionId}`);

		if (!response.ok) {
			throw new Error("Failed to get timeline");
		}

		return response.json();
	},

	async createReplaySession(executionId: string) {
		const response = await fetch("/api/time-travel/replay", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ executionId }),
		});

		if (!response.ok) {
			throw new Error("Failed to create replay session");
		}

		return response.json();
	},

	async updateReplaySession(data: {
		sessionId: string;
		currentStep?: number;
		isPlaying?: boolean;
		playbackSpeed?: number;
	}) {
		const response = await fetch("/api/time-travel/replay", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to update replay session");
		}

		return response.json();
	},

	async controlReplay(data: {
		sessionId: string;
		action: "step_forward" | "step_backward" | "jump_to_step";
		stepNumber?: number;
	}) {
		const response = await fetch("/api/time-travel/replay", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to control replay");
		}

		return response.json();
	},

	async getReplaySession(sessionId: string) {
		const response = await fetch(`/api/time-travel/replay?sessionId=${sessionId}`);

		if (!response.ok) {
			throw new Error("Failed to get replay session");
		}

		return response.json();
	},

	async destroyReplaySession(sessionId: string) {
		const response = await fetch(`/api/time-travel/replay?sessionId=${sessionId}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			throw new Error("Failed to destroy replay session");
		}

		return response.json();
	},

	async compareExecutions(executionIdA: string, executionIdB: string) {
		const response = await fetch("/api/time-travel/compare", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ executionIdA, executionIdB }),
		});

		if (!response.ok) {
			throw new Error("Failed to compare executions");
		}

		return response.json();
	},

	async getRollbackPoints(executionId: string) {
		const response = await fetch(`/api/time-travel/rollback?executionId=${executionId}`);

		if (!response.ok) {
			throw new Error("Failed to get rollback points");
		}

		return response.json();
	},

	async rollback(data: { executionId: string; checkpointId: string; reason: string }) {
		const response = await fetch("/api/time-travel/rollback", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to perform rollback");
		}

		return response.json();
	},
};

// Query keys
const queryKeys = {
	snapshots: (executionId: string, options?: any) => [
		"time-travel",
		"snapshots",
		executionId,
		options,
	],
	timeline: (executionId: string) => ["time-travel", "timeline", executionId],
	replaySession: (sessionId: string) => ["time-travel", "replay", sessionId],
	comparison: (executionIdA: string, executionIdB: string) => [
		"time-travel",
		"compare",
		executionIdA,
		executionIdB,
	],
	rollbackPoints: (executionId: string) => ["time-travel", "rollback", executionId],
};

/**
 * Hook for managing execution snapshots
 */
export function useExecutionSnapshots(
	executionId: string,
	options?: {
		fromStep?: number;
		toStep?: number;
		checkpointsOnly?: boolean;
	}
) {
	return useQuery({
		queryKey: queryKeys.snapshots(executionId, options),
		queryFn: async () => {
			const result = await api.getSnapshots(executionId, options);
			return result.data as ExecutionSnapshot[];
		},
		enabled: !!executionId,
		staleTime: 30000, // 30 seconds
	});
}

/**
 * Hook for creating snapshots
 */
export function useCreateSnapshot() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.createSnapshot,
		onSuccess: (_, variables) => {
			// Invalidate snapshots for this execution
			queryClient.invalidateQueries({
				queryKey: ["time-travel", "snapshots", variables.executionId],
			});
			// Invalidate timeline
			queryClient.invalidateQueries({
				queryKey: queryKeys.timeline(variables.executionId),
			});
		},
	});
}

/**
 * Hook for getting execution timeline
 */
export function useExecutionTimeline(executionId: string) {
	return useQuery({
		queryKey: queryKeys.timeline(executionId),
		queryFn: async () => {
			const result = await api.getTimeline(executionId);
			return result.data as TimelineEntry[];
		},
		enabled: !!executionId,
		staleTime: 30000, // 30 seconds
	});
}

/**
 * Hook for managing replay sessions
 */
export function useReplaySession(executionId?: string) {
	const [sessionId, setSessionId] = useState<string | null>(null);
	const queryClient = useQueryClient();

	// Query for session data
	const sessionQuery = useQuery({
		queryKey: queryKeys.replaySession(sessionId!),
		queryFn: async () => {
			const result = await api.getReplaySession(sessionId!);
			return result.data as { session: ReplaySession; currentState: Record<string, unknown> };
		},
		enabled: !!sessionId,
		refetchInterval: 1000, // Refresh every second for real-time updates
	});

	// Create session mutation
	const createSession = useMutation({
		mutationFn: api.createReplaySession,
		onSuccess: (result) => {
			const session = result.data as ReplaySession;
			setSessionId(session.id);
		},
	});

	// Update session mutation
	const updateSession = useMutation({
		mutationFn: api.updateReplaySession,
		onSuccess: () => {
			if (sessionId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.replaySession(sessionId),
				});
			}
		},
	});

	// Control replay mutation
	const controlReplay = useMutation({
		mutationFn: api.controlReplay,
		onSuccess: () => {
			if (sessionId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.replaySession(sessionId),
				});
			}
		},
	});

	// Destroy session mutation
	const destroySession = useMutation({
		mutationFn: api.destroyReplaySession,
		onSuccess: () => {
			setSessionId(null);
		},
	});

	// Convenience methods
	const startSession = useCallback(() => {
		if (executionId) {
			createSession.mutate(executionId);
		}
	}, [executionId, createSession]);

	const stopSession = useCallback(() => {
		if (sessionId) {
			destroySession.mutate(sessionId);
		}
	}, [sessionId, destroySession]);

	const stepForward = useCallback(() => {
		if (sessionId) {
			controlReplay.mutate({
				sessionId,
				action: "step_forward",
			});
		}
	}, [sessionId, controlReplay]);

	const stepBackward = useCallback(() => {
		if (sessionId) {
			controlReplay.mutate({
				sessionId,
				action: "step_backward",
			});
		}
	}, [sessionId, controlReplay]);

	const jumpToStep = useCallback(
		(stepNumber: number) => {
			if (sessionId) {
				controlReplay.mutate({
					sessionId,
					action: "jump_to_step",
					stepNumber,
				});
			}
		},
		[sessionId, controlReplay]
	);

	const setPlaying = useCallback(
		(isPlaying: boolean) => {
			if (sessionId) {
				updateSession.mutate({
					sessionId,
					isPlaying,
				});
			}
		},
		[sessionId, updateSession]
	);

	const setPlaybackSpeed = useCallback(
		(playbackSpeed: number) => {
			if (sessionId) {
				updateSession.mutate({
					sessionId,
					playbackSpeed,
				});
			}
		},
		[sessionId, updateSession]
	);

	return {
		sessionId,
		session: sessionQuery.data?.session,
		currentState: sessionQuery.data?.currentState,
		isLoading: sessionQuery.isLoading || createSession.isPending,
		error: sessionQuery.error || createSession.error,

		// Actions
		startSession,
		stopSession,
		stepForward,
		stepBackward,
		jumpToStep,
		setPlaying,
		setPlaybackSpeed,

		// Mutation states
		isCreating: createSession.isPending,
		isUpdating: updateSession.isPending,
		isControlling: controlReplay.isPending,
		isDestroying: destroySession.isPending,
	};
}

/**
 * Hook for comparing executions
 */
export function useExecutionComparison() {
	return useMutation({
		mutationFn: ({ executionIdA, executionIdB }: { executionIdA: string; executionIdB: string }) =>
			api.compareExecutions(executionIdA, executionIdB),
		onSuccess: (result, variables) => {
			// Cache the comparison result
			const queryClient = useQueryClient();
			queryClient.setQueryData(
				queryKeys.comparison(variables.executionIdA, variables.executionIdB),
				result.data
			);
		},
	});
}

/**
 * Hook for rollback operations
 */
export function useRollback(executionId: string) {
	const queryClient = useQueryClient();

	// Get rollback points
	const rollbackPointsQuery = useQuery({
		queryKey: queryKeys.rollbackPoints(executionId),
		queryFn: async () => {
			const result = await api.getRollbackPoints(executionId);
			return result.data as RollbackPoint[];
		},
		enabled: !!executionId,
		staleTime: 60000, // 1 minute
	});

	// Perform rollback
	const rollbackMutation = useMutation({
		mutationFn: api.rollback,
		onSuccess: () => {
			// Invalidate related queries
			queryClient.invalidateQueries({
				queryKey: ["time-travel", "snapshots", executionId],
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.timeline(executionId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.rollbackPoints(executionId),
			});
		},
	});

	return {
		rollbackPoints: rollbackPointsQuery.data,
		isLoading: rollbackPointsQuery.isLoading,
		error: rollbackPointsQuery.error,
		rollback: rollbackMutation.mutate,
		isRollingBack: rollbackMutation.isPending,
		rollbackError: rollbackMutation.error,
	};
}

/**
 * Hook for automatic snapshot creation during execution
 */
export function useAutoSnapshot(executionId: string, enabled = true) {
	const createSnapshot = useCreateSnapshot();
	const [stepCounter, setStepCounter] = useState(0);

	const snapshot = useCallback(
		(state: Record<string, unknown>, description?: string, checkpoint = false) => {
			if (!enabled || !executionId) return;

			createSnapshot.mutate({
				executionId,
				stepNumber: stepCounter,
				state,
				type: checkpoint ? "checkpoint" : "step_start",
				description,
				checkpoint,
			});

			setStepCounter((prev) => prev + 1);
		},
		[executionId, enabled, stepCounter, createSnapshot]
	);

	const checkpoint = useCallback(
		(state: Record<string, unknown>, description: string) => {
			snapshot(state, description, true);
		},
		[snapshot]
	);

	const reset = useCallback(() => {
		setStepCounter(0);
	}, []);

	return {
		snapshot,
		checkpoint,
		reset,
		stepCounter,
		isCreating: createSnapshot.isPending,
		error: createSnapshot.error,
	};
}

/**
 * Hook for time-travel debugging with automatic cleanup
 */
export function useTimeTravelDebug(executionId: string) {
	const snapshots = useExecutionSnapshots(executionId);
	const timeline = useExecutionTimeline(executionId);
	const replay = useReplaySession(executionId);
	const comparison = useExecutionComparison();
	const rollback = useRollback(executionId);
	const autoSnapshot = useAutoSnapshot(executionId);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (replay.sessionId) {
				replay.stopSession();
			}
		};
	}, [replay]);

	return {
		// Data
		snapshots: snapshots.data,
		timeline: timeline.data,
		rollbackPoints: rollback.rollbackPoints,

		// Replay
		replay,

		// Operations
		comparison,
		rollback: rollback.rollback,
		autoSnapshot,

		// Loading states
		isLoading: snapshots.isLoading || timeline.isLoading,
		isRollingBack: rollback.isRollingBack,

		// Errors
		error: snapshots.error || timeline.error || rollback.error,
	};
}
