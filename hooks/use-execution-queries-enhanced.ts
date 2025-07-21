"use client";

import type { ObservabilityEvent } from "@/db/schema";
import { invalidateQueries, mutationKeys, queryKeys } from "@/lib/query/config";
import {
	useEnhancedMutation,
	useEnhancedQuery,
} from "./use-enhanced-query-new";

/**
 * Enhanced agent execution queries with comprehensive database integration, observability, and real-time sync
 */

export interface ExecutionFilters {
	taskId?: string;
	agentType?: string;
	status?: string[];
	userId?: string;
	dateRange?: {
		start: Date;
		end: Date;
	};
	traceId?: string;
	minDuration?: number;
	maxDuration?: number;
}

export interface ExecutionWithDetails extends AgentExecution {
	observabilityEvents?: ObservabilityEvent[];
	executionSnapshots?: ExecutionSnapshot[];
	task?: {
		id: string;
		title: string;
		status: string;
	};
	eventCount?: number;
	snapshotCount?: number;
	averageStepTime?: number;
	errorRate?: number;
}

export interface ExecutionMetrics {
	totalExecutions: number;
	successRate: number;
	averageDuration: number;
	errorCount: number;
	byAgentType: Record<
		string,
		{
			count: number;
			successRate: number;
			averageDuration: number;
		}
	>;
	byStatus: Record<string, number>;
	timeline: Array<{
		date: string;
		count: number;
		successCount: number;
		errorCount: number;
	}>;
}

/**
 * Hook for querying a single agent execution with full details
 */
export function useExecutionQuery(
	executionId: string,
	options?: { includeSnapshots?: boolean },
) {
	const { includeSnapshots = false } = options || {};

	return useEnhancedQuery(
		queryKeys.executions.detail(executionId),
		async (): Promise<ExecutionWithDetails> => {
			const searchParams = new URLSearchParams();
			searchParams.append("include", "events,task");
			if (includeSnapshots) {
				searchParams.append("include", "events,task,snapshots");
			}

			const response = await fetch(
				`/api/executions/${executionId}?${searchParams.toString()}`,
			);
			if (!response.ok) {
				if (response.status === 404) {
					throw new Error(`Execution with id ${executionId} not found`);
				}
				throw new Error(`Failed to fetch execution: ${response.statusText}`);
			}
			const result = await response.json();
			return result.data;
		},
		{
			enabled: !!executionId,
			staleTime: 30 * 1000, // 30 seconds for execution details
			enableWASMOptimization: false, // Single record doesn't need WASM optimization
			enableRealTimeSync: true,
			syncTable: "agent_executions",
		},
	);
}

/**
 * Hook for querying agent executions with enhanced filtering and real-time sync
 */
export function useExecutionsQuery(filters: ExecutionFilters = {}) {
	const {
		taskId,
		agentType,
		status,
		userId,
		dateRange,
		traceId,
		minDuration,
		maxDuration,
	} = filters;

	return useEnhancedQuery(
		queryKeys.executions.list(filters),
		async (): Promise<ExecutionWithDetails[]> => {
			const searchParams = new URLSearchParams();

			if (taskId) searchParams.append("taskId", taskId);
			if (agentType) searchParams.append("agentType", agentType);
			if (status?.length) searchParams.append("status", status.join(","));
			if (userId) searchParams.append("userId", userId);
			if (traceId) searchParams.append("traceId", traceId);
			if (minDuration)
				searchParams.append("minDuration", minDuration.toString());
			if (maxDuration)
				searchParams.append("maxDuration", maxDuration.toString());
			if (dateRange) {
				searchParams.append("startDate", dateRange.start.toISOString());
				searchParams.append("endDate", dateRange.end.toISOString());
			}

			const response = await fetch(
				`/api/executions?${searchParams.toString()}`,
			);
			if (!response.ok) {
				throw new Error(`Failed to fetch executions: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data;
		},
		{
			enableWASMOptimization: true,
			staleWhileRevalidate: true,
			enableRealTimeSync: true,
			syncTable: "agent_executions",
			wasmFallback: async () => {
				// Fallback to simpler query without complex filtering
				const response = await fetch("/api/executions");
				if (!response.ok) {
					throw new Error(`Failed to fetch executions: ${response.statusText}`);
				}
				const result = await response.json();

				// Apply client-side filtering as fallback
				let filteredExecutions = result.data;

				if (status?.length) {
					filteredExecutions = filteredExecutions.filter(
						(exec: AgentExecution) => status.includes(exec.status),
					);
				}

				if (agentType) {
					filteredExecutions = filteredExecutions.filter(
						(exec: AgentExecution) => exec.agentType === agentType,
					);
				}

				if (taskId) {
					filteredExecutions = filteredExecutions.filter(
						(exec: AgentExecution) => exec.taskId === taskId,
					);
				}

				return filteredExecutions;
			},
		},
	);
}

/**
 * Hook for querying executions by task ID
 */
export function useExecutionsByTaskQuery(taskId: string) {
	return useEnhancedQuery(
		queryKeys.executions.byTask(taskId),
		async (): Promise<ExecutionWithDetails[]> => {
			const response = await fetch(
				`/api/tasks/${taskId}/executions?include=events`,
			);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch executions for task: ${response.statusText}`,
				);
			}

			const result = await response.json();
			return result.data;
		},
		{
			enabled: !!taskId,
			staleTime: 30 * 1000, // 30 seconds
			enableRealTimeSync: true,
			syncTable: "agent_executions",
		},
	);
}

/**
 * Hook for infinite execution queries with virtualization support
 */
export function useInfiniteExecutionsQuery(
	filters: ExecutionFilters = {},
	pageSize = 50,
) {
	return useEnhancedInfiniteQuery(
		queryKeys.executions.infinite(filters),
		async ({ pageParam = 0 }) => {
			const searchParams = new URLSearchParams();
			searchParams.append("page", pageParam.toString());
			searchParams.append("limit", pageSize.toString());

			if (filters.taskId) searchParams.append("taskId", filters.taskId);
			if (filters.agentType)
				searchParams.append("agentType", filters.agentType);
			if (filters.status?.length)
				searchParams.append("status", filters.status.join(","));
			if (filters.dateRange) {
				searchParams.append("startDate", filters.dateRange.start.toISOString());
				searchParams.append("endDate", filters.dateRange.end.toISOString());
			}

			const response = await fetch(
				`/api/executions/infinite?${searchParams.toString()}`,
			);
			if (!response.ok) {
				throw new Error(`Failed to fetch executions: ${response.statusText}`);
			}

			const result = await response.json();
			return {
				executions: result.data,
				nextCursor: result.hasMore ? (pageParam as number) + 1 : undefined,
				hasMore: result.hasMore,
				total: result.total,
			};
		},
		{
			initialPageParam: 0,
			getNextPageParam: (lastPage) => lastPage.nextCursor,
			enableVirtualization: true,
			enableWASMOptimization: true,
			enableRealTimeSync: true,
			syncTable: "agent_executions",
			staleTime: 30 * 1000, // 30 seconds
		},
	);
}

/**
 * Hook for creating agent executions with real-time tracking
 */
export function useCreateExecutionMutation() {
	const queryClient = useQueryClient();

	return useEnhancedMutation(
		async (newExecution: Omit<NewAgentExecution, "id" | "startedAt">) => {
			const response = await fetch("/api/executions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newExecution),
			});

			if (!response.ok) {
				throw new Error(`Failed to create execution: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data;
		},
		{
			optimisticUpdate: (variables) => {
				// Create optimistic execution
				const optimisticExecution: ExecutionWithDetails = {
					id: `temp-${Date.now()}`,
					...variables,
					startedAt: new Date(),
					observabilityEvents: [],
					executionSnapshots: [],
					eventCount: 0,
					snapshotCount: 0,
				} as ExecutionWithDetails;

				// Add to all relevant caches
				queryClient.setQueryData(
					queryKeys.executions.lists(),
					(old: ExecutionWithDetails[] = []) => [optimisticExecution, ...old],
				);

				// Add to task-specific cache if taskId exists
				if (variables.taskId) {
					queryClient.setQueryData(
						queryKeys.executions.byTask(variables.taskId),
						(old: ExecutionWithDetails[] = []) => [optimisticExecution, ...old],
					);
				}

				return { optimisticExecution };
			},
			rollbackUpdate: (context) => {
				if (context?.optimisticExecution) {
					// Remove optimistic execution from cache
					queryClient.setQueryData(
						queryKeys.executions.lists(),
						(old: ExecutionWithDetails[] = []) =>
							old.filter((exec) => exec.id !== context.optimisticExecution.id),
					);

					// Remove from task-specific cache
					if (context.optimisticExecution.taskId) {
						queryClient.setQueryData(
							queryKeys.executions.byTask(context.optimisticExecution.taskId),
							(old: ExecutionWithDetails[] = []) =>
								old.filter(
									(exec) => exec.id !== context.optimisticExecution.id,
								),
						);
					}
				}
			},
			invalidateQueries: [queryKeys.executions.all],
			enableRealTimeSync: true,
			syncTable: "agent_executions",
		},
	);
}

/**
 * Hook for updating execution status with real-time sync
 */
export function useUpdateExecutionMutation() {
	const queryClient = useQueryClient();

	return useEnhancedMutation(
		async ({
			executionId,
			updates,
		}: {
			executionId: string;
			updates: Partial<AgentExecution>;
		}) => {
			const response = await fetch(`/api/executions/${executionId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				throw new Error(`Failed to update execution: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data;
		},
		{
			optimisticUpdate: ({ executionId, updates }) => {
				const previousExecution = queryClient.getQueryData(
					queryKeys.executions.detail(executionId),
				) as ExecutionWithDetails;

				// Update execution in all relevant caches
				queryClient.setQueryData(
					queryKeys.executions.detail(executionId),
					(old: ExecutionWithDetails) => (old ? { ...old, ...updates } : old),
				);

				queryClient.setQueryData(
					queryKeys.executions.lists(),
					(old: ExecutionWithDetails[] = []) =>
						old.map((exec) =>
							exec.id === executionId ? { ...exec, ...updates } : exec,
						),
				);

				// Update task-specific cache
				if (previousExecution?.taskId) {
					queryClient.setQueryData(
						queryKeys.executions.byTask(previousExecution.taskId),
						(old: ExecutionWithDetails[] = []) =>
							old.map((exec) =>
								exec.id === executionId ? { ...exec, ...updates } : exec,
							),
					);
				}

				return { previousExecution, executionId };
			},
			rollbackUpdate: (context) => {
				if (context?.previousExecution && context?.executionId) {
					// Restore previous execution data
					queryClient.setQueryData(
						queryKeys.executions.detail(context.executionId),
						context.previousExecution,
					);

					queryClient.setQueryData(
						queryKeys.executions.lists(),
						(old: ExecutionWithDetails[] = []) =>
							old.map((exec) =>
								exec.id === context.executionId
									? context.previousExecution
									: exec,
							),
					);

					// Restore task-specific cache
					if (context.previousExecution.taskId) {
						queryClient.setQueryData(
							queryKeys.executions.byTask(context.previousExecution.taskId),
							(old: ExecutionWithDetails[] = []) =>
								old.map((exec) =>
									exec.id === context.executionId
										? context.previousExecution
										: exec,
								),
						);
					}
				}
			},
			invalidateQueries: [queryKeys.executions.all],
			enableRealTimeSync: true,
			syncTable: "agent_executions",
		},
	);
}

/**
 * Hook for canceling running executions
 */
export function useCancelExecutionMutation() {
	const queryClient = useQueryClient();

	return useEnhancedMutation(
		async (executionId: string) => {
			const response = await fetch(`/api/executions/${executionId}/cancel`, {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error(`Failed to cancel execution: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data;
		},
		{
			optimisticUpdate: (executionId) => {
				// Update execution status to cancelled
				queryClient.setQueryData(
					queryKeys.executions.detail(executionId),
					(old: ExecutionWithDetails) =>
						old
							? { ...old, status: "cancelled", completedAt: new Date() }
							: old,
				);

				queryClient.setQueryData(
					queryKeys.executions.lists(),
					(old: ExecutionWithDetails[] = []) =>
						old.map((exec) =>
							exec.id === executionId
								? { ...exec, status: "cancelled", completedAt: new Date() }
								: exec,
						),
				);

				return { executionId };
			},
			invalidateQueries: [queryKeys.executions.all],
			enableRealTimeSync: true,
			syncTable: "agent_executions",
		},
	);
}

/**
 * Hook for execution metrics and analytics
 */
export function useExecutionMetricsQuery(filters: ExecutionFilters = {}) {
	return useEnhancedQuery(
		[...queryKeys.executions.all, "metrics", filters],
		async (): Promise<ExecutionMetrics> => {
			const searchParams = new URLSearchParams();

			if (filters.taskId) searchParams.append("taskId", filters.taskId);
			if (filters.agentType)
				searchParams.append("agentType", filters.agentType);
			if (filters.userId) searchParams.append("userId", filters.userId);
			if (filters.dateRange) {
				searchParams.append("startDate", filters.dateRange.start.toISOString());
				searchParams.append("endDate", filters.dateRange.end.toISOString());
			}

			const response = await fetch(
				`/api/executions/metrics?${searchParams.toString()}`,
			);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch execution metrics: ${response.statusText}`,
				);
			}

			const result = await response.json();
			return result.data;
		},
		{
			staleTime: 2 * 60 * 1000, // 2 minutes for metrics
			enableWASMOptimization: true,
			enableRealTimeSync: true,
			syncTable: "agent_executions",
		},
	);
}

/**
 * Hook for execution observability events with infinite loading
 */
export function useExecutionEventsQuery(executionId: string) {
	return useEnhancedInfiniteQuery(
		queryKeys.events.byExecution(executionId),
		async ({ pageParam = 0 }) => {
			const response = await fetch(
				`/api/executions/${executionId}/events?page=${pageParam}&limit=50`,
			);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch execution events: ${response.statusText}`,
				);
			}

			const result = await response.json();
			return {
				events: result.data,
				nextCursor: result.hasMore ? (pageParam as number) + 1 : undefined,
				hasMore: result.hasMore,
				total: result.total,
			};
		},
		{
			enabled: !!executionId,
			initialPageParam: 0,
			getNextPageParam: (lastPage) => lastPage.nextCursor,
			enableRealTimeSync: true,
			syncTable: "observability_events",
			staleTime: 10 * 1000, // 10 seconds for real-time events
		},
	);
}

/**
 * Hook for execution snapshots (time-travel debugging)
 */
export function useExecutionSnapshotsQuery(executionId: string) {
	return useEnhancedQuery(
		[...queryKeys.executions.detail(executionId), "snapshots"],
		async (): Promise<ExecutionSnapshot[]> => {
			const response = await fetch(`/api/executions/${executionId}/snapshots`);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch execution snapshots: ${response.statusText}`,
				);
			}

			const result = await response.json();
			return result.data;
		},
		{
			enabled: !!executionId,
			staleTime: 60 * 1000, // 1 minute for snapshots
			enableRealTimeSync: true,
			syncTable: "execution_snapshots",
		},
	);
}

/**
 * Hook for execution performance analysis
 */
export function useExecutionPerformanceQuery(executionId: string) {
	return useEnhancedQuery(
		[...queryKeys.executions.detail(executionId), "performance"],
		async () => {
			const response = await fetch(
				`/api/executions/${executionId}/performance`,
			);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch execution performance: ${response.statusText}`,
				);
			}

			const result = await response.json();
			return result.data;
		},
		{
			enabled: !!executionId,
			staleTime: 5 * 60 * 1000, // 5 minutes for performance data
			enableWASMOptimization: true,
		},
	);
}

/**
 * Hook for execution trace analysis
 */
export function useExecutionTraceQuery(traceId: string) {
	return useEnhancedQuery(
		[...queryKeys.executions.all, "trace", traceId],
		async () => {
			const response = await fetch(`/api/executions/trace/${traceId}`);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch execution trace: ${response.statusText}`,
				);
			}

			const result = await response.json();
			return result.data;
		},
		{
			enabled: !!traceId,
			staleTime: 2 * 60 * 1000, // 2 minutes for trace data
			enableRealTimeSync: true,
			syncTable: "agent_executions",
		},
	);
}
