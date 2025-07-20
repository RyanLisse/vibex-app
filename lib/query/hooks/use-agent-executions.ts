/**
 * TanStack Query hooks for Agent Executions
 *
 * Comprehensive agent execution tracking with real-time updates,
 * time-travel debugging, and performance monitoring integration.
 */

	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { z } from "zod";
import { observability } from "@/lib/observability";
import { wasmServices } from "@/lib/wasm/services";
import { queryKeys } from "../config";

// Agent execution schemas
const AgentExecutionSchema = z.object({
	id: z.string(),
	taskId: z.string().nullable(),
	agentType: z.string(),
	status: z.enum(["pending", "running", "completed", "failed", "cancelled"]),
	startedAt: z.date(),
	completedAt: z.date().nullable(),
	input: z.any().nullable(),
	output: z.any().nullable(),
	error: z.string().nullable(),
	metadata: z.any().nullable(),
	traceId: z.string().nullable(),
	executionTimeMs: z.number().nullable(),
	tokenUsage: z.any().nullable(),
	cost: z.any().nullable(),
});

const CreateAgentExecutionSchema = z.object({
	taskId: z.string().optional(),
	agentType: z.string(),
	input: z.any().optional(),
	metadata: z.any().optional(),
});

const UpdateAgentExecutionSchema = z.object({
	status: z
		.enum(["pending", "running", "completed", "failed", "cancelled"])
		.optional(),
	output: z.any().optional(),
	error: z.string().optional(),
	metadata: z.any().optional(),
	executionTimeMs: z.number().optional(),
	tokenUsage: z.any().optional(),
	cost: z.any().optional(),
});

// Types
export type AgentExecution = z.infer<typeof AgentExecutionSchema>;
export type CreateAgentExecutionInput = z.infer<
	typeof CreateAgentExecutionSchema
>;
export type UpdateAgentExecutionInput = z.infer<
	typeof UpdateAgentExecutionSchema
>;

// API functions
async function fetchAgentExecutions(params: {
	page?: number;
	limit?: number;
	taskId?: string;
	agentType?: string;
	status?: string;
	timeRange?: { start: Date; end: Date };
	includeSnapshots?: boolean;
}): Promise<{ executions: AgentExecution[]; total: number; hasMore: boolean }> {
	const searchParams = new URLSearchParams();

	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			if (key === "timeRange" && value) {
				searchParams.append("startTime", value.start.toISOString());
				searchParams.append("endTime", value.end.toISOString());
			} else {
				searchParams.append(key, String(value));
			}
		}
	});

	return observability.trackOperation(
		"api.fetch-agent-executions",
		async () => {
			const response = await fetch(`/api/agents/executions?${searchParams}`);
			if (!response.ok) {
				throw new Error("Failed to fetch agent executions");
			}
			return response.json();
		},
	);
}

async function fetchAgentExecution(
	id: string,
	options?: { includeSnapshots?: boolean; includeEvents?: boolean },
): Promise<
	AgentExecution & {
		snapshots?: any[];
		observabilityEvents?: any[];
	}
> {
	const searchParams = new URLSearchParams();
	if (options?.includeSnapshots)
		searchParams.append("includeSnapshots", "true");
	if (options?.includeEvents) searchParams.append("includeEvents", "true");

	return observability.trackOperation("api.fetch-agent-execution", async () => {
		const response = await fetch(
			`/api/agents/executions/${id}?${searchParams}`,
		);
		if (!response.ok) {
			throw new Error("Failed to fetch agent execution");
		}
		return response.json();
	});
}

async function createAgentExecution(
	data: CreateAgentExecutionInput,
): Promise<AgentExecution> {
	return observability.trackOperation(
		"api.create-agent-execution",
		async () => {
			const response = await fetch("/api/agents/executions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error("Failed to create agent execution");
			}

			return response.json();
		},
	);
}

async function updateAgentExecution(
	id: string,
	data: UpdateAgentExecutionInput,
): Promise<AgentExecution> {
	return observability.trackOperation(
		"api.update-agent-execution",
		async () => {
			const response = await fetch(`/api/agents/executions/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error("Failed to update agent execution");
			}

			return response.json();
		},
	);
}

async function cancelAgentExecution(id: string): Promise<void> {
	return observability.trackOperation(
		"api.cancel-agent-execution",
		async () => {
			const response = await fetch(`/api/agents/executions/${id}/cancel`, {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error("Failed to cancel agent execution");
			}
		},
	);
}

// Hooks
export function useAgentExecutions(
	filters: {
		taskId?: string;
		agentType?: string;
		status?: string;
		timeRange?: { start: Date; end: Date };
		includeSnapshots?: boolean;
	} = {},
) {
	return useQuery({
		queryKey: queryKeys.executions.list(filters),
		queryFn: () => fetchAgentExecutions({ ...filters, limit: 100 }),
		staleTime: 1000 * 30, // 30 seconds
		gcTime: 1000 * 60 * 5, // 5 minutes
		refetchInterval: 5000, // Real-time updates every 5 seconds
	});
}

export function useAgentExecution(
	id: string,
	options?: { includeSnapshots?: boolean; includeEvents?: boolean },
) {
	return useQuery({
		queryKey: queryKeys.executions.detail(id),
		queryFn: () => fetchAgentExecution(id, options),
		enabled: !!id,
		staleTime: 1000 * 60, // 1 minute
		gcTime: 1000 * 60 * 10, // 10 minutes
		refetchInterval: 2000, // Real-time updates every 2 seconds for active executions
	});
}

export function useInfiniteAgentExecutions(
	filters: {
		taskId?: string;
		agentType?: string;
		status?: string;
		timeRange?: { start: Date; end: Date };
	} = {},
) {
	return useInfiniteQuery({
		queryKey: queryKeys.executions.infinite(filters),
		queryFn: ({ pageParam = 1 }) =>
			fetchAgentExecutions({ ...filters, page: pageParam, limit: 20 }),
		initialPageParam: 1,
		getNextPageParam: (lastPage, allPages) =>
			lastPage.hasMore ? allPages.length + 1 : undefined,
		staleTime: 1000 * 30, // 30 seconds
	});
}

export function useCreateAgentExecution() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createAgentExecution,
		onMutate: async (newExecution) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: queryKeys.executions.all });

			// Optimistic update
			const tempId = `temp-${Date.now()}`;
			const optimisticExecution: AgentExecution = {
				id: tempId,
				taskId: newExecution.taskId || null,
				agentType: newExecution.agentType,
				status: "pending",
				startedAt: new Date(),
				completedAt: null,
				input: newExecution.input || null,
				output: null,
				error: null,
				metadata: newExecution.metadata || null,
				traceId: null,
				executionTimeMs: null,
				tokenUsage: null,
				cost: null,
			};

			queryClient.setQueryData(queryKeys.executions.all, (old: any) => {
				if (!old)
					return {
						executions: [optimisticExecution],
						total: 1,
						hasMore: false,
					};
				return {
					...old,
					executions: [optimisticExecution, ...old.executions],
					total: old.total + 1,
				};
			});

			return { tempId };
		},
		onSuccess: (newExecution, variables, context) => {
			// Replace optimistic update with real data
			queryClient.setQueryData(queryKeys.executions.all, (old: any) => {
				if (!old) return old;
				return {
					...old,
					executions: old.executions.map((exec: AgentExecution) =>
						exec.id === context?.tempId ? newExecution : exec,
					),
				};
			});

			// Set individual execution cache
			queryClient.setQueryData(
				queryKeys.executions.detail(newExecution.id),
				newExecution,
			);

			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: queryKeys.executions.all });
			if (newExecution.taskId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.executions.byTask(newExecution.taskId),
				});
			}
		},
		onError: (error, variables, context) => {
			// Remove optimistic update on error
			if (context?.tempId) {
				queryClient.setQueryData(queryKeys.executions.all, (old: any) => {
					if (!old) return old;
					return {
						...old,
						executions: old.executions.filter(
							(exec: AgentExecution) => exec.id !== context.tempId,
						),
						total: old.total - 1,
					};
				});
			}
		},
	});
}

export function useUpdateAgentExecution() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: UpdateAgentExecutionInput;
		}) => updateAgentExecution(id, data),
		onMutate: async ({ id, data }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: queryKeys.executions.detail(id),
			});

			// Snapshot previous value
			const previousExecution = queryClient.getQueryData(
				queryKeys.executions.detail(id),
			);

			// Optimistically update
			queryClient.setQueryData(
				queryKeys.executions.detail(id),
				(old: AgentExecution) => ({
					...old,
					...data,
					...(data.status === "completed" && { completedAt: new Date() }),
				}),
			);

			return { previousExecution };
		},
		onSuccess: (updatedExecution) => {
			// Update the individual execution cache
			queryClient.setQueryData(
				queryKeys.executions.detail(updatedExecution.id),
				updatedExecution,
			);

			// Update executions in lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.executions.all },
				(old: any) => {
					if (!old) return old;
					return {
						...old,
						executions: old.executions.map((exec: AgentExecution) =>
							exec.id === updatedExecution.id ? updatedExecution : exec,
						),
					};
				},
			);

			// Invalidate related queries
			queryClient.invalidateQueries({
				queryKey: queryKeys.executions.infinite({}),
			});
			if (updatedExecution.taskId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.executions.byTask(updatedExecution.taskId),
				});
			}
		},
		onError: (err, variables, context) => {
			// Rollback on error
			if (context?.previousExecution) {
				queryClient.setQueryData(
					queryKeys.executions.detail(variables.id),
					context.previousExecution,
				);
			}
		},
	});
}

export function useCancelAgentExecution() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: cancelAgentExecution,
		onMutate: async (id) => {
			// Optimistically update status
			await queryClient.cancelQueries({
				queryKey: queryKeys.executions.detail(id),
			});

			queryClient.setQueryData(
				queryKeys.executions.detail(id),
				(old: AgentExecution) => ({
					...old,
					status: "cancelled" as const,
					completedAt: new Date(),
				}),
			);
		},
		onSuccess: (_, id) => {
			// Refetch to get the actual updated data
			queryClient.invalidateQueries({
				queryKey: queryKeys.executions.detail(id),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.executions.all });
		},
	});
}

// Convenience hooks
export function useAgentExecutionsByTask(taskId: string) {
	return useQuery({
		queryKey: queryKeys.executions.byTask(taskId),
		queryFn: () => fetchAgentExecutions({ taskId, limit: 100 }),
		enabled: !!taskId,
		staleTime: 1000 * 60, // 1 minute
		refetchInterval: 5000, // Real-time updates
	});
}

export function useActiveAgentExecutions() {
	return useAgentExecutions({ status: "running" });
}

export function useRecentAgentExecutions(limit = 50) {
	const timeRange = {
		start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
		end: new Date(),
	};

	return useQuery({
		queryKey: [...queryKeys.executions.all, "recent", limit],
		queryFn: () => fetchAgentExecutions({ timeRange, limit }),
		staleTime: 1000 * 60, // 1 minute
		refetchInterval: 10_000, // 10 seconds
	});
}

export function useAgentExecutionStats(timeRange?: { start: Date; end: Date }) {
	return useQuery({
		queryKey: [...queryKeys.executions.all, "stats", timeRange],
		queryFn: async () => {
			const searchParams = new URLSearchParams();
			if (timeRange) {
				searchParams.append("startTime", timeRange.start.toISOString());
				searchParams.append("endTime", timeRange.end.toISOString());
			}

			return observability.trackOperation(
				"api.agent-execution-stats",
				async () => {
					const response = await fetch(
						`/api/agents/executions/stats?${searchParams}`,
					);
					if (!response.ok) {
						throw new Error("Failed to fetch execution stats");
					}
					return response.json();
				},
			);
		},
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
	});
}

// WASM-optimized search and filtering
export function useSearchAgentExecutions(query: string, filters: any = {}) {
	return useQuery({
		queryKey: [...queryKeys.executions.all, "search", query, filters],
		queryFn: async () => {
			if (!query.trim()) return { executions: [], total: 0, hasMore: false };

			// Use WASM for client-side search if available
			if (wasmServices.isReady()) {
				const wasmUtils = wasmServices.getSQLiteUtils();
				return wasmUtils.searchExecutions(query, filters);
			}

			// Fallback to server-side search
			const searchParams = new URLSearchParams({
				q: query,
				...filters,
			});

			return observability.trackOperation(
				"api.search-agent-executions",
				async () => {
					const response = await fetch(
						`/api/agents/executions/search?${searchParams}`,
					);
					if (!response.ok) {
						throw new Error("Failed to search agent executions");
					}
					return response.json();
				},
			);
		},
		enabled: !!query.trim(),
		staleTime: 1000 * 30, // 30 seconds
	});
}

// Export utility functions for external use
export const agentExecutionQueries = {
	all: () => queryKeys.executions.all,
	byTask: (taskId: string) => queryKeys.executions.byTask(taskId),
	detail: (id: string) => queryKeys.executions.detail(id),
	infinite: (filters: any) => queryKeys.executions.infinite(filters),
};
