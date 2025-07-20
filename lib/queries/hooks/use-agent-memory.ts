/**
 * TanStack Query hooks for Agent Memory with vector search and WASM optimization
 */

	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import type { AgentMemory, NewAgentMemory } from "@/db/schema";
import { electricClient } from "@/lib/electric/client";
import { observability } from "@/lib/observability";
import { wasmDetector } from "@/lib/wasm/detection";
import { mutationKeys, queryKeys } from "../keys";

// API types
export interface MemoryFilters {
	agentType?: string;
	contextKey?: string;
	minImportance?: number;
	expired?: boolean;
	limit?: number;
	offset?: number;
}

export interface MemorySearchResult {
	memory: AgentMemory;
	similarity: number;
	relevanceScore: number;
}

export interface MemoryStats {
	totalMemories: number;
	totalSize: number;
	byAgentType: Record<
		string,
		{
			count: number;
			avgImportance: number;
			avgAccessCount: number;
			totalSize: number;
			oldestMemory: Date;
			newestMemory: Date;
		}
	>;
	accessPatterns: {
		mostAccessed: Array<{
			id: string;
			contextKey: string;
			accessCount: number;
		}>;
		recentlyAccessed: Array<{
			id: string;
			contextKey: string;
			lastAccessedAt: Date;
		}>;
	};
	importanceDistribution: Record<number, number>;
	expiringMemories: number;
}

export interface UpdateMemoryInput {
	content?: string;
	embedding?: number[];
	metadata?: any;
	importance?: number;
	expiresAt?: Date;
}

// API functions
async function fetchMemories(
	filters: MemoryFilters = {},
): Promise<AgentMemory[]> {
	return observability.trackOperation("query.memory.fetch", async () => {
		const searchParams = new URLSearchParams();
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				searchParams.append(key, String(value));
			}
		});

		const response = await fetch(`/api/agent-memory?${searchParams}`);
		if (!response.ok) {
			throw new Error("Failed to fetch memories");
		}

		return response.json();
	});
}

async function fetchMemory(id: string): Promise<AgentMemory> {
	return observability.trackOperation("query.memory.fetch-one", async () => {
		const response = await fetch(`/api/agent-memory/${id}`);
		if (!response.ok) {
			if (response.status === 404) {
				throw new Error("Memory not found");
			}
			throw new Error("Failed to fetch memory");
		}

		// Update access count and timestamp
		await fetch(`/api/agent-memory/${id}/access`, { method: "POST" });

		return response.json();
	});
}

async function searchMemoryByText(
	query: string,
	agentType?: string,
	limit = 10,
): Promise<MemorySearchResult[]> {
	return observability.trackOperation("query.memory.search-text", async () => {
		const response = await fetch("/api/agent-memory/search", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ query, agentType, limit }),
		});

		if (!response.ok) {
			throw new Error("Failed to search memory");
		}

		return response.json();
	});
}

async function searchMemoryByVector(
	embedding: number[],
	agentType?: string,
	limit = 10,
): Promise<MemorySearchResult[]> {
	return observability.trackOperation(
		"query.memory.search-vector",
		async () => {
			if (wasmDetector.isVectorSearchSupported()) {
				// Use WASM-optimized vector search
				const response = await fetch("/api/agent-memory/vector-search", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ embedding, agentType, limit }),
				});

				if (!response.ok) {
					throw new Error("Vector search failed");
				}

				return response.json();
			}
			// Fallback to server-side vector search
			console.warn(
				"WASM vector search not available, using server-side search",
			);
			const response = await fetch("/api/agent-memory/vector-search-fallback", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ embedding, agentType, limit }),
			});

			if (!response.ok) {
				throw new Error("Vector search failed");
			}

			return response.json();
		},
	);
}

async function fetchMemoryStats(agentType?: string): Promise<MemoryStats> {
	return observability.trackOperation("query.memory.stats", async () => {
		const url = agentType
			? `/api/agent-memory/stats?agentType=${agentType}`
			: "/api/agent-memory/stats";

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error("Failed to fetch memory stats");
		}

		return response.json();
	});
}

async function createMemory(data: NewAgentMemory): Promise<AgentMemory> {
	return observability.trackOperation("mutation.memory.create", async () => {
		const response = await fetch("/api/agent-memory", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to create memory");
		}

		return response.json();
	});
}

async function updateMemory(
	id: string,
	data: UpdateMemoryInput,
): Promise<AgentMemory> {
	return observability.trackOperation("mutation.memory.update", async () => {
		const response = await fetch(`/api/agent-memory/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to update memory");
		}

		return response.json();
	});
}

async function deleteMemory(id: string): Promise<void> {
	return observability.trackOperation("mutation.memory.delete", async () => {
		const response = await fetch(`/api/agent-memory/${id}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			throw new Error("Failed to delete memory");
		}
	});
}

async function cleanupExpiredMemories(): Promise<{ deleted: number }> {
	return observability.trackOperation("mutation.memory.cleanup", async () => {
		const response = await fetch("/api/agent-memory/cleanup", {
			method: "POST",
		});

		if (!response.ok) {
			throw new Error("Failed to cleanup memories");
		}

		return response.json();
	});
}

async function refreshMemoryImportance(id: string): Promise<AgentMemory> {
	return observability.trackOperation("mutation.memory.refresh", async () => {
		const response = await fetch(`/api/agent-memory/${id}/refresh-importance`, {
			method: "POST",
		});

		if (!response.ok) {
			throw new Error("Failed to refresh memory importance");
		}

		return response.json();
	});
}

// Query hooks
export function useAgentMemories(
	filters: MemoryFilters = {},
	options?: UseQueryOptions<AgentMemory[], Error>,
) {
	return useQuery({
		queryKey: queryKeys.memory.list(filters),
		queryFn: () => fetchMemories(filters),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
		...options,
	});
}

export function useAgentMemory(
	id: string,
	options?: UseQueryOptions<AgentMemory, Error>,
) {
	return useQuery({
		queryKey: queryKeys.memory.detail(id),
		queryFn: () => fetchMemory(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 2, // 2 minutes - shorter due to access tracking
		gcTime: 1000 * 60 * 10, // 10 minutes
		...options,
	});
}

export function useMemorySearch(
	query: string,
	agentType?: string,
	limit = 10,
	options?: UseQueryOptions<MemorySearchResult[], Error>,
) {
	return useQuery({
		queryKey: queryKeys.memory.search(query, agentType, limit),
		queryFn: () => searchMemoryByText(query, agentType, limit),
		enabled: !!query && query.length > 0,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		...options,
	});
}

export function useMemoryVectorSearch(
	embedding: number[],
	agentType?: string,
	limit = 10,
	options?: UseQueryOptions<MemorySearchResult[], Error>,
) {
	return useQuery({
		queryKey: queryKeys.memory.vector(embedding, agentType, limit),
		queryFn: () => searchMemoryByVector(embedding, agentType, limit),
		enabled: embedding.length > 0,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		...options,
	});
}

export function useMemoryStats(
	agentType?: string,
	options?: UseQueryOptions<MemoryStats, Error>,
) {
	return useQuery({
		queryKey: queryKeys.memory.stats(agentType),
		queryFn: () => fetchMemoryStats(agentType),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		...options,
	});
}

export function useMemoriesByAgent(
	agentType: string,
	options?: UseQueryOptions<AgentMemory[], Error>,
) {
	return useAgentMemories(
		{ agentType },
		{
			...options,
			queryKey: queryKeys.memory.byAgent(agentType),
		},
	);
}

export function useMemoryByContext(
	agentType: string,
	contextKey: string,
	options?: UseQueryOptions<AgentMemory[], Error>,
) {
	return useAgentMemories(
		{ agentType, contextKey },
		{
			...options,
			queryKey: queryKeys.memory.byContext(agentType, contextKey),
		},
	);
}

// Mutation hooks
export function useCreateAgentMemory(
	options?: UseMutationOptions<AgentMemory, Error, NewAgentMemory>,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: mutationKeys.memory.create,
		mutationFn: createMemory,
		onMutate: async (newMemoryData) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.memory.all });

			const optimisticMemory: AgentMemory = {
				id: `temp-${Date.now()}`,
				...newMemoryData,
				createdAt: new Date(),
				lastAccessedAt: new Date(),
				accessCount: 0,
			} as AgentMemory;

			// Add to agent-specific cache if agentType is provided
			if (newMemoryData.agentType) {
				const previousMemories = queryClient.getQueryData<AgentMemory[]>(
					queryKeys.memory.byAgent(newMemoryData.agentType),
				);

				if (previousMemories) {
					queryClient.setQueryData<AgentMemory[]>(
						queryKeys.memory.byAgent(newMemoryData.agentType),
						[optimisticMemory, ...previousMemories],
					);
				}
			}

			return { optimisticMemory };
		},
		onError: (err, newMemory, context) => {
			observability.recordError("mutation.memory.create", err, {
				memory: newMemory,
			});
		},
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.memory.detail(data.id), data);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.memory.lists() });
			queryClient.invalidateQueries({ queryKey: queryKeys.memory.stats() });
		},
		...options,
	});
}

export function useUpdateAgentMemory(
	options?: UseMutationOptions<
		AgentMemory,
		Error,
		{ id: string; data: UpdateMemoryInput }
	>,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: mutationKeys.memory.update,
		mutationFn: ({ id, data }) => updateMemory(id, data),
		onMutate: async ({ id, data }) => {
			await queryClient.cancelQueries({
				queryKey: queryKeys.memory.detail(id),
			});

			const previousMemory = queryClient.getQueryData<AgentMemory>(
				queryKeys.memory.detail(id),
			);

			if (previousMemory) {
				const updatedMemory = {
					...previousMemory,
					...data,
					lastAccessedAt: new Date(),
				};
				queryClient.setQueryData(queryKeys.memory.detail(id), updatedMemory);
			}

			return { previousMemory };
		},
		onError: (err, variables, context) => {
			if (context?.previousMemory) {
				queryClient.setQueryData(
					queryKeys.memory.detail(variables.id),
					context.previousMemory,
				);
			}
			observability.recordError("mutation.memory.update", err, variables);
		},
		onSettled: (data, error, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.memory.detail(variables.id),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.memory.lists() });
			// Invalidate search results as embeddings might have changed
			queryClient.invalidateQueries({
				predicate: (query) =>
					query.queryKey[0] === "memory" &&
					(query.queryKey.includes("search") ||
						query.queryKey.includes("vector")),
			});
		},
		...options,
	});
}

export function useDeleteAgentMemory(
	options?: UseMutationOptions<void, Error, string>,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: mutationKeys.memory.delete,
		mutationFn: deleteMemory,
		onMutate: async (memoryId) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.memory.all });

			// Remove from all list caches
			queryClient.setQueriesData<AgentMemory[]>(
				{ queryKey: queryKeys.memory.lists() },
				(old) => {
					if (!old) return old;
					return old.filter((memory) => memory.id !== memoryId);
				},
			);

			return {};
		},
		onError: (err, memoryId) => {
			observability.recordError("mutation.memory.delete", err, { memoryId });
		},
		onSettled: (data, error, memoryId) => {
			queryClient.removeQueries({
				queryKey: queryKeys.memory.detail(memoryId),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.memory.lists() });
			queryClient.invalidateQueries({ queryKey: queryKeys.memory.stats() });
		},
		...options,
	});
}

export function useCleanupMemories(
	options?: UseMutationOptions<{ deleted: number }, Error, void>,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: mutationKeys.memory.cleanup,
		mutationFn: cleanupExpiredMemories,
		onSuccess: (data) => {
			observability.recordMetrics("memory.cleanup", {
				deletedCount: data.deleted,
			});
		},
		onSettled: () => {
			// Invalidate all memory queries as cleanup affects multiple memories
			queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
		},
		...options,
	});
}

export function useRefreshMemoryImportance(
	options?: UseMutationOptions<AgentMemory, Error, string>,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: mutationKeys.memory.refresh,
		mutationFn: refreshMemoryImportance,
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.memory.detail(data.id), data);
		},
		onSettled: (data) => {
			if (data) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.memory.detail(data.id),
				});
				queryClient.invalidateQueries({
					queryKey: queryKeys.memory.byAgent(data.agentType),
				});
			}
		},
		...options,
	});
}

// Real-time subscription hook
export function useMemorySubscription(
	filters?: { agentType?: string },
	onUpdate?: (memories: AgentMemory[]) => void,
) {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!electricClient.isConnected()) return;

		const unsubscribe = electricClient.subscribe(
			"agentMemory",
			(memories: AgentMemory[]) => {
				observability.trackOperation("realtime.memory.update", () => {
					// Update query cache
					if (filters?.agentType) {
						queryClient.setQueryData<AgentMemory[]>(
							queryKeys.memory.byAgent(filters.agentType),
							memories,
						);
					} else {
						queryClient.setQueryData<AgentMemory[]>(
							queryKeys.memory.list(),
							memories,
						);
					}

					// Update individual memory caches
					memories.forEach((memory) => {
						queryClient.setQueryData(
							queryKeys.memory.detail(memory.id),
							memory,
						);
					});

					// Invalidate search results as they might be stale
					queryClient.invalidateQueries({
						predicate: (query) =>
							query.queryKey[0] === "memory" &&
							(query.queryKey.includes("search") ||
								query.queryKey.includes("vector")),
					});

					// Call custom handler if provided
					onUpdate?.(memories);
				});
			},
			{
				where: filters,
				orderBy: { importance: "desc", lastAccessedAt: "desc" },
			},
		);

		return () => unsubscribe();
	}, [queryClient, filters, onUpdate]);
}

// WASM-optimized hooks
export function useWASMVectorSearch(
	embedding: number[],
	filters?: { agentType?: string; limit?: number },
) {
	const queryClient = useQueryClient();

	return useQuery({
		queryKey: queryKeys.wasm.vectorSearch("agentMemory", embedding, filters),
		queryFn: async () => {
			if (!wasmDetector.isVectorSearchSupported()) {
				throw new Error("WASM vector search not supported");
			}

			return observability.trackOperation(
				"wasm.memory.vector-search",
				async () => {
					// This would integrate with the WASM module for local vector search
					const response = await fetch("/api/agent-memory/wasm-vector-search", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ embedding, ...filters }),
					});

					if (!response.ok) {
						throw new Error("WASM vector search failed");
					}

					return response.json();
				},
			);
		},
		enabled: embedding.length > 0 && wasmDetector.isVectorSearchSupported(),
		staleTime: 1000 * 60 * 10, // 10 minutes - WASM results are stable
		gcTime: 1000 * 60 * 30, // 30 minutes
	});
}

// Helper to prefetch memory data
export async function prefetchMemory(queryClient: QueryClient, id: string) {
	await queryClient.prefetchQuery({
		queryKey: queryKeys.memory.detail(id),
		queryFn: () => fetchMemory(id),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

// Helper to prefetch memory stats
export async function prefetchMemoryStats(
	queryClient: QueryClient,
	agentType?: string,
) {
	await queryClient.prefetchQuery({
		queryKey: queryKeys.memory.stats(agentType),
		queryFn: () => fetchMemoryStats(agentType),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

import type { QueryClient } from "@tanstack/react-query";
