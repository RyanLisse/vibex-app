/**
 * TanStack Query hooks for Agent Executions with performance tracking
 */

	type InfiniteData,
	type UseMutationOptions,
	type UseQueryOptions,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import type { AgentExecution, NewAgentExecution } from "@/db/schema";
import { electricClient } from "@/lib/electric/client";
import { observability } from "@/lib/observability";
import { mutationKeys, queryKeys } from "../keys";

// API types
export interface AgentExecutionFilters {
	taskId?: string;
	agentType?: string;
	status?: string;
	traceId?: string;
	startDate?: Date;
	endDate?: Date;
	limit?: number;
	offset?: number;
}

export interface ExecutionStats {
	totalExecutions: number;
	successRate: number;
	averageExecutionTime: number;
	totalTokens: number;
	totalCost: number;
	byAgentType: Record<
		string,
		{
			count: number;
			successRate: number;
			avgExecutionTime: number;
			avgTokens: number;
			avgCost: number;
		}
	>;
	byStatus: Record<string, number>;
	timeline: Array<{
		date: string;
		count: number;
		successCount: number;
		avgExecutionTime: number;
	}>;
}

export interface ExecutionPerformance {
	executionId: string;
	metrics: {
		startTime: Date;
		endTime?: Date;
		duration?: number;
		phases: Array<{
			name: string;
			startTime: Date;
			endTime: Date;
			duration: number;
			metadata?: any;
		}>;
		resourceUsage: {
			memory: number;
			cpu: number;
			network: number;
		};
		tokenUsage: {
			prompt: number;
			completion: number;
			total: number;
		};
		cost: {
			tokenCost: number;
			resourceCost: number;
			total: number;
		};
	};
}

export interface ExecutionsResponse {
	executions: AgentExecution[];
	total: number;
	hasMore: boolean;
	nextCursor?: string;
}

// API functions
async function fetchExecutions(
	filters: AgentExecutionFilters = {},
): Promise<ExecutionsResponse> {
	return observability.trackOperation("query.executions.fetch", async () => {
		const searchParams = new URLSearchParams();
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				if (value instanceof Date) {
					searchParams.append(key, value.toISOString());
				} else {
					searchParams.append(key, String(value));
				}
			}
		});

		const response = await fetch(`/api/agent-executions?${searchParams}`);
		if (!response.ok) {
			throw new Error("Failed to fetch executions");
		}

		return response.json();
	});
}

async function fetchExecution(id: string): Promise<AgentExecution> {
	return observability.trackOperation("query.execution.fetch", async () => {
		const response = await fetch(`/api/agent-executions/${id}`);
		if (!response.ok) {
			if (response.status === 404) {
				throw new Error("Execution not found");
			}
			throw new Error("Failed to fetch execution");
		}

		return response.json();
	});
}

async function fetchExecutionStats(
	filters?: AgentExecutionFilters,
): Promise<ExecutionStats> {
	return observability.trackOperation("query.execution.stats", async () => {
		const searchParams = new URLSearchParams();
		if (filters) {
			Object.entries(filters).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					if (value instanceof Date) {
						searchParams.append(key, value.toISOString());
					} else {
						searchParams.append(key, String(value));
					}
				}
			});
		}

		const response = await fetch(`/api/agent-executions/stats?${searchParams}`);
		if (!response.ok) {
			throw new Error("Failed to fetch execution stats");
		}

		return response.json();
	});
}

async function fetchExecutionPerformance(
	executionId: string,
): Promise<ExecutionPerformance> {
	return observability.trackOperation(
		"query.execution.performance",
		async () => {
			const response = await fetch(
				`/api/agent-executions/${executionId}/performance`,
			);
			if (!response.ok) {
				throw new Error("Failed to fetch execution performance");
			}

			return response.json();
		},
	);
}

async function createExecution(
	data: NewAgentExecution,
): Promise<AgentExecution> {
	return observability.trackOperation("mutation.execution.create", async () => {
		const response = await fetch("/api/agent-executions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to create execution");
		}

		return response.json();
	});
}

async function cancelExecution(id: string): Promise<AgentExecution> {
	return observability.trackOperation("mutation.execution.cancel", async () => {
		const response = await fetch(`/api/agent-executions/${id}/cancel`, {
			method: "POST",
		});

		if (!response.ok) {
			throw new Error("Failed to cancel execution");
		}

		return response.json();
	});
}

async function retryExecution(id: string): Promise<AgentExecution> {
	return observability.trackOperation("mutation.execution.retry", async () => {
		const response = await fetch(`/api/agent-executions/${id}/retry`, {
			method: "POST",
		});

		if (!response.ok) {
			throw new Error("Failed to retry execution");
		}

		return response.json();
	});
}

// Query hooks
export function useAgentExecutions(
	filters: AgentExecutionFilters = {},
	options?: UseQueryOptions<ExecutionsResponse, Error>,
) {
	return useQuery({
		queryKey: queryKeys.executions.list(filters),
		queryFn: () => fetchExecutions(filters),
		staleTime: 1000 * 60 * 1, // 1 minute - more frequent updates for live monitoring
		gcTime: 1000 * 60 * 5, // 5 minutes
		...options,
	});
}

export function useAgentExecution(
	id: string,
	options?: UseQueryOptions<AgentExecution, Error>,
) {
	return useQuery({
		queryKey: queryKeys.executions.detail(id),
		queryFn: () => fetchExecution(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		...options,
	});
}

export function useInfiniteAgentExecutions(
	filters: AgentExecutionFilters = {},
	options?: any,
) {
	return useInfiniteQuery({
		queryKey: queryKeys.executions.infinite(filters),
		queryFn: ({ pageParam = 0 }) =>
			fetchExecutions({
				...filters,
				offset: pageParam,
				limit: filters.limit || 50,
			}),
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) => {
			if (!lastPage.hasMore) return;
			return allPages.length * (filters.limit || 50);
		},
		staleTime: 1000 * 60 * 1, // 1 minute
		...options,
	});
}

export function useExecutionStats(
	filters?: AgentExecutionFilters,
	options?: UseQueryOptions<ExecutionStats, Error>,
) {
	return useQuery({
		queryKey: queryKeys.executions.stats(filters),
		queryFn: () => fetchExecutionStats(filters),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		...options,
	});
}

export function useExecutionPerformance(
	executionId: string,
	options?: UseQueryOptions<ExecutionPerformance, Error>,
) {
	return useQuery({
		queryKey: queryKeys.executions.performance(executionId),
		queryFn: () => fetchExecutionPerformance(executionId),
		enabled: !!executionId,
		staleTime: 1000 * 60 * 5, // 5 minutes - performance data is stable
		gcTime: 1000 * 60 * 30, // 30 minutes
		...options,
	});
}

export function useExecutionsByTask(
	taskId: string,
	options?: UseQueryOptions<ExecutionsResponse, Error>,
) {
	return useAgentExecutions(
		{ taskId },
		{
			...options,
			queryKey: queryKeys.executions.byTask(taskId),
		},
	);
}

export function useExecutionsByAgent(
	agentType: string,
	options?: UseQueryOptions<ExecutionsResponse, Error>,
) {
	return useAgentExecutions(
		{ agentType },
		{
			...options,
			queryKey: queryKeys.executions.byAgent(agentType),
		},
	);
}

export function useExecutionsByTrace(
	traceId: string,
	options?: UseQueryOptions<ExecutionsResponse, Error>,
) {
	return useAgentExecutions(
		{ traceId },
		{
			...options,
			queryKey: queryKeys.executions.byTrace(traceId),
		},
	);
}

// Mutation hooks
export function useCreateAgentExecution(
	options?: UseMutationOptions<AgentExecution, Error, NewAgentExecution>,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: mutationKeys.executions.create,
		mutationFn: createExecution,
		onMutate: async (newExecutionData) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.executions.all });

			const optimisticExecution: AgentExecution = {
				id: `temp-${Date.now()}`,
				...newExecutionData,
				startedAt: new Date(),
				completedAt: null,
				executionTimeMs: null,
				tokenUsage: null,
				cost: null,
			} as AgentExecution;

			// Update task executions if taskId is provided
			if (newExecutionData.taskId) {
				const previousTaskExecutions =
					queryClient.getQueryData<ExecutionsResponse>(
						queryKeys.executions.byTask(newExecutionData.taskId),
					);

				if (previousTaskExecutions) {
					queryClient.setQueryData<ExecutionsResponse>(
						queryKeys.executions.byTask(newExecutionData.taskId),
						{
							...previousTaskExecutions,
							executions: [
								optimisticExecution,
								...previousTaskExecutions.executions,
							],
							total: previousTaskExecutions.total + 1,
						},
					);
				}
			}

			return { optimisticExecution };
		},
		onError: (err, newExecution, context) => {
			observability.recordError("mutation.execution.create", err, {
				execution: newExecution,
			});
		},
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.executions.detail(data.id), data);

			// Start performance monitoring for the new execution
			observability.startTrace(`execution.${data.id}`, {
				executionId: data.id,
				agentType: data.agentType,
				taskId: data.taskId,
			});
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.executions.lists() });
			queryClient.invalidateQueries({ queryKey: queryKeys.executions.stats() });
		},
		...options,
	});
}

export function useCancelAgentExecution(
	options?: UseMutationOptions<AgentExecution, Error, string>,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: mutationKeys.executions.cancel,
		mutationFn: cancelExecution,
		onMutate: async (executionId) => {
			await queryClient.cancelQueries({
				queryKey: queryKeys.executions.detail(executionId),
			});

			const previousExecution = queryClient.getQueryData<AgentExecution>(
				queryKeys.executions.detail(executionId),
			);

			if (previousExecution) {
				const cancelledExecution = {
					...previousExecution,
					status: "cancelled",
					completedAt: new Date(),
				};
				queryClient.setQueryData(
					queryKeys.executions.detail(executionId),
					cancelledExecution,
				);
			}

			return { previousExecution };
		},
		onError: (err, executionId, context) => {
			if (context?.previousExecution) {
				queryClient.setQueryData(
					queryKeys.executions.detail(executionId),
					context.previousExecution,
				);
			}
			observability.recordError("mutation.execution.cancel", err, {
				executionId,
			});
		},
		onSuccess: (data) => {
			// End performance monitoring
			observability.endTrace(`execution.${data.id}`);
		},
		onSettled: (data, error, executionId) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.executions.detail(executionId),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.executions.lists() });
			queryClient.invalidateQueries({ queryKey: queryKeys.executions.stats() });
		},
		...options,
	});
}

export function useRetryAgentExecution(
	options?: UseMutationOptions<AgentExecution, Error, string>,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: mutationKeys.executions.retry,
		mutationFn: retryExecution,
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.executions.detail(data.id), data);

			// Start new performance trace for retry
			observability.startTrace(`execution.${data.id}`, {
				executionId: data.id,
				agentType: data.agentType,
				taskId: data.taskId,
				isRetry: true,
			});
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.executions.lists() });
			queryClient.invalidateQueries({ queryKey: queryKeys.executions.stats() });
		},
		...options,
	});
}

// Real-time subscription hook with performance monitoring
export function useExecutionsSubscription(
	filters?: AgentExecutionFilters,
	onUpdate?: (executions: AgentExecution[]) => void,
) {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!electricClient.isConnected()) return;

		const unsubscribe = electricClient.subscribe(
			"agentExecutions",
			(executions: AgentExecution[]) => {
				// Track performance of real-time updates
				observability.trackOperation("realtime.executions.update", () => {
					// Update query cache
					queryClient.setQueryData<ExecutionsResponse>(
						queryKeys.executions.list(filters),
						(old) => {
							if (!old)
								return { executions, total: executions.length, hasMore: false };

							// Merge new executions with existing ones
							const executionMap = new Map(
								old.executions.map((e) => [e.id, e]),
							);
							executions.forEach((execution) => {
								executionMap.set(execution.id, execution);

								// Update individual execution cache
								queryClient.setQueryData(
									queryKeys.executions.detail(execution.id),
									execution,
								);

								// Track completion if status changed to completed
								if (
									execution.status === "completed" ||
									execution.status === "failed"
								) {
									observability.endTrace(`execution.${execution.id}`);
								}
							});

							return {
								...old,
								executions: Array.from(executionMap.values()),
								total: executionMap.size,
							};
						},
					);

					// Invalidate stats as they might have changed
					queryClient.invalidateQueries({
						queryKey: queryKeys.executions.stats(),
					});

					// Call custom handler if provided
					onUpdate?.(executions);
				});
			},
			{
				where: filters,
				orderBy: { startedAt: "desc" },
			},
		);

		return () => unsubscribe();
	}, [queryClient, filters, onUpdate]);
}

// Performance monitoring hooks
export function useExecutionPerformanceMonitor(executionId: string) {
	const { data: execution } = useAgentExecution(executionId);
	const { data: performance } = useExecutionPerformance(executionId);

	useEffect(() => {
		if (!(execution && performance)) return;

		// Report performance metrics to observability
		if (execution.status === "completed" || execution.status === "failed") {
			observability.recordMetrics("execution.performance", {
				executionId,
				agentType: execution.agentType,
				status: execution.status,
				duration: performance.metrics.duration,
				tokenUsage: performance.metrics.tokenUsage.total,
				cost: performance.metrics.cost.total,
				phases: performance.metrics.phases.length,
			});
		}
	}, [execution, performance, executionId]);

	return { execution, performance };
}

// Helper to prefetch execution data
export async function prefetchExecution(queryClient: QueryClient, id: string) {
	await queryClient.prefetchQuery({
		queryKey: queryKeys.executions.detail(id),
		queryFn: () => fetchExecution(id),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

// Helper to prefetch execution stats
export async function prefetchExecutionStats(
	queryClient: QueryClient,
	filters?: AgentExecutionFilters,
) {
	await queryClient.prefetchQuery({
		queryKey: queryKeys.executions.stats(filters),
		queryFn: () => fetchExecutionStats(filters),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

import type { QueryClient } from "@tanstack/react-query";
