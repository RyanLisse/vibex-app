/**
 * TanStack Query hooks for Agent Memory System
 *
 * Provides semantic search, knowledge sharing, and context management
 * with vector embeddings and WASM optimization.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { observability } from "@/lib/observability";
import { wasmServices } from "@/lib/wasm/services";
import { queryKeys } from "../config";

// Agent memory schemas
const AgentMemorySchema = z.object({
	id: z.string(),
	agentType: z.string(),
	contextKey: z.string(),
	content: z.string(),
	embedding: z.array(z.number()).optional(),
	createdAt: z.date(),
	lastAccessedAt: z.date(),
	accessCount: z.number(),
	metadata: z.any().nullable(),
	importance: z.number().min(1).max(10),
	expiresAt: z.date().nullable(),
});

const CreateAgentMemorySchema = z.object({
	agentType: z.string(),
	contextKey: z.string(),
	content: z.string(),
	metadata: z.any().optional(),
	importance: z.number().min(1).max(10).default(5),
	expiresAt: z.date().optional(),
});

const UpdateAgentMemorySchema = z.object({
	content: z.string().optional(),
	metadata: z.any().optional(),
	importance: z.number().min(1).max(10).optional(),
	expiresAt: z.date().optional(),
});

// Types
export type AgentMemory = z.infer<typeof AgentMemorySchema>;
export type CreateAgentMemoryInput = z.infer<typeof CreateAgentMemorySchema>;
export type UpdateAgentMemoryInput = z.infer<typeof UpdateAgentMemorySchema>;

export interface SemanticSearchResult {
	memory: AgentMemory;
	similarity: number;
	relevanceScore: number;
}

export interface MemoryFilters {
	agentType?: string;
	contextKey?: string;
	minImportance?: number;
	timeRange?: { start: Date; end: Date };
	tags?: string[];
	includeExpired?: boolean;
}

export interface MemoryStats {
	totalMemories: number;
	memoriesByAgent: Record<string, number>;
	averageImportance: number;
	memoryUtilization: number;
	expiringCount: number;
	recentAccessCount: number;
}

// API functions
async function fetchAgentMemories(params: {
	page?: number;
	limit?: number;
	filters?: MemoryFilters;
}): Promise<{ memories: AgentMemory[]; total: number; hasMore: boolean }> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.append("page", params.page.toString());
	if (params.limit) searchParams.append("limit", params.limit.toString());

	if (params.filters) {
		Object.entries(params.filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				if (key === "timeRange" && value) {
					searchParams.append("startTime", value.start.toISOString());
					searchParams.append("endTime", value.end.toISOString());
				} else if (Array.isArray(value)) {
					value.forEach((item) => searchParams.append(key, item));
				} else {
					searchParams.append(key, String(value));
				}
			}
		});
	}

	return observability.trackOperation("api.fetch-agent-memories", async () => {
		const response = await fetch(`/api/agents/memory?${searchParams}`);
		if (!response.ok) {
			throw new Error("Failed to fetch agent memories");
		}
		return response.json();
	});
}

async function fetchAgentMemory(id: string): Promise<AgentMemory> {
	return observability.trackOperation("api.fetch-agent-memory", async () => {
		const response = await fetch(`/api/agents/memory/${id}`);
		if (!response.ok) {
			throw new Error("Failed to fetch agent memory");
		}
		return response.json();
	});
}

async function createAgentMemory(
	data: CreateAgentMemoryInput,
): Promise<AgentMemory> {
	return observability.trackOperation("api.create-agent-memory", async () => {
		const response = await fetch("/api/agents/memory", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to create agent memory");
		}

		return response.json();
	});
}

async function updateAgentMemory(
	id: string,
	data: UpdateAgentMemoryInput,
): Promise<AgentMemory> {
	return observability.trackOperation("api.update-agent-memory", async () => {
		const response = await fetch(`/api/agents/memory/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to update agent memory");
		}

		return response.json();
	});
}

async function deleteAgentMemory(id: string): Promise<void> {
	return observability.trackOperation("api.delete-agent-memory", async () => {
		const response = await fetch(`/api/agents/memory/${id}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			throw new Error("Failed to delete agent memory");
		}
	});
}

async function semanticSearchMemories(
	query: string,
	options?: {
		agentType?: string;
		limit?: number;
		similarityThreshold?: number;
		useWASM?: boolean;
	},
): Promise<SemanticSearchResult[]> {
	if (!query.trim()) {
		return [];
	}

	// Use WASM vector search if available and requested
	if (options?.useWASM && wasmServices.isReady()) {
		return observability.trackOperation("wasm.semantic-search", async () => {
			const vectorSearch = wasmServices.getVectorSearch();

			// Generate embedding for search query
			const queryEmbedding = await vectorSearch.generateEmbedding(query);

			// Perform vector similarity search
			const results = await vectorSearch.searchSimilar(
				queryEmbedding,
				options.limit || 10,
			);

			// Map results to our format
			return results.map((result) => ({
				memory: result.memory as AgentMemory,
				similarity: result.score,
				relevanceScore: result.score * 100,
			}));
		});
	}

	// Fallback to server-side semantic search
	const searchParams = new URLSearchParams({ q: query });

	if (options?.agentType) searchParams.append("agentType", options.agentType);
	if (options?.limit) searchParams.append("limit", options.limit.toString());
	if (options?.similarityThreshold) {
		searchParams.append("threshold", options.similarityThreshold.toString());
	}

	return observability.trackOperation(
		"api.semantic-search-memories",
		async () => {
			const response = await fetch(`/api/agents/memory/search?${searchParams}`);
			if (!response.ok) {
				throw new Error("Failed to perform semantic search");
			}
			return response.json();
		},
	);
}

async function fetchMemoryStats(
	agentType?: string,
	timeRange?: { start: Date; end: Date },
): Promise<MemoryStats> {
	const searchParams = new URLSearchParams();

	if (agentType) searchParams.append("agentType", agentType);
	if (timeRange) {
		searchParams.append("startTime", timeRange.start.toISOString());
		searchParams.append("endTime", timeRange.end.toISOString());
	}

	return observability.trackOperation("api.fetch-memory-stats", async () => {
		const response = await fetch(`/api/agents/memory/stats?${searchParams}`);
		if (!response.ok) {
			throw new Error("Failed to fetch memory stats");
		}
		return response.json();
	});
}

// Main query hooks
export function useAgentMemories(filters: MemoryFilters = {}) {
	return useQuery({
		queryKey: queryKeys.memory.list(filters),
		queryFn: () => fetchAgentMemories({ filters, limit: 100 }),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
	});
}

export function useAgentMemory(id: string) {
	return useQuery({
		queryKey: queryKeys.memory.all.concat("detail", id),
		queryFn: () => fetchAgentMemory(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
	});
}

export function useMemoriesByAgent(agentType: string) {
	return useQuery({
		queryKey: queryKeys.memory.byAgent(agentType),
		queryFn: () => fetchAgentMemories({ filters: { agentType }, limit: 1000 }),
		enabled: !!agentType,
		staleTime: 1000 * 60 * 3, // 3 minutes
	});
}

// Semantic search hooks
export function useSemanticSearch(
	query: string,
	options?: {
		agentType?: string;
		limit?: number;
		similarityThreshold?: number;
		useWASM?: boolean;
	},
) {
	return useQuery({
		queryKey: queryKeys.memory.search(query, options?.agentType),
		queryFn: () => semanticSearchMemories(query, options),
		enabled: !!query.trim(),
		staleTime: 1000 * 60, // 1 minute
		gcTime: 1000 * 60 * 5, // 5 minutes
	});
}

export function useSemanticSearchByAgent(
	agentType: string,
	query: string,
	options?: { limit?: number; similarityThreshold?: number },
) {
	return useSemanticSearch(query, { ...options, agentType });
}

// Memory management hooks
export function useCreateAgentMemory() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createAgentMemory,
		onSuccess: (newMemory) => {
			// Update the memories list cache
			queryClient.setQueryData(queryKeys.memory.lists(), (old: any) => {
				if (!old) return { memories: [newMemory], total: 1, hasMore: false };
				return {
					...old,
					memories: [newMemory, ...old.memories],
					total: old.total + 1,
				};
			});

			// Set the individual memory cache
			queryClient.setQueryData(
				queryKeys.memory.all.concat("detail", newMemory.id),
				newMemory,
			);

			// Update agent-specific cache
			queryClient.invalidateQueries({
				queryKey: queryKeys.memory.byAgent(newMemory.agentType),
			});

			// Invalidate search results as they might be affected
			queryClient.invalidateQueries({
				queryKey: queryKeys.memory.all.concat("search"),
			});
		},
	});
}

export function useUpdateAgentMemory() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateAgentMemoryInput }) =>
			updateAgentMemory(id, data),
		onMutate: async ({ id, data }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: queryKeys.memory.all.concat("detail", id),
			});

			// Snapshot previous value
			const previousMemory = queryClient.getQueryData(
				queryKeys.memory.all.concat("detail", id),
			);

			// Optimistically update
			queryClient.setQueryData(
				queryKeys.memory.all.concat("detail", id),
				(old: AgentMemory) => ({
					...old,
					...data,
					lastAccessedAt: new Date(),
					accessCount: old.accessCount + 1,
				}),
			);

			return { previousMemory };
		},
		onSuccess: (updatedMemory) => {
			// Update the individual memory cache
			queryClient.setQueryData(
				queryKeys.memory.all.concat("detail", updatedMemory.id),
				updatedMemory,
			);

			// Update memories in lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.memory.lists() },
				(old: any) => {
					if (!old) return old;
					return {
						...old,
						memories: old.memories.map((memory: AgentMemory) =>
							memory.id === updatedMemory.id ? updatedMemory : memory,
						),
					};
				},
			);

			// Invalidate related queries
			queryClient.invalidateQueries({
				queryKey: queryKeys.memory.byAgent(updatedMemory.agentType),
			});
		},
		onError: (err, variables, context) => {
			// Rollback on error
			if (context?.previousMemory) {
				queryClient.setQueryData(
					queryKeys.memory.all.concat("detail", variables.id),
					context.previousMemory,
				);
			}
		},
	});
}

export function useDeleteAgentMemory() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteAgentMemory,
		onSuccess: (_, deletedId) => {
			// Remove from individual memory cache
			queryClient.removeQueries({
				queryKey: queryKeys.memory.all.concat("detail", deletedId),
			});

			// Update memories in lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.memory.lists() },
				(old: any) => {
					if (!old) return old;
					return {
						...old,
						memories: old.memories.filter(
							(memory: AgentMemory) => memory.id !== deletedId,
						),
						total: old.total - 1,
					};
				},
			);

			// Invalidate all related queries since we don't know the agent type
			queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
		},
	});
}

// Stats and analytics hooks
export function useMemoryStats(
	agentType?: string,
	timeRange?: { start: Date; end: Date },
) {
	return useQuery({
		queryKey: [...queryKeys.memory.all, "stats", agentType, timeRange],
		queryFn: () => fetchMemoryStats(agentType, timeRange),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
	});
}

// Convenience hooks
export function useRecentMemories(agentType?: string, limit = 20) {
	const timeRange = {
		start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
		end: new Date(),
	};

	return useQuery({
		queryKey: [...queryKeys.memory.all, "recent", agentType, limit],
		queryFn: () =>
			fetchAgentMemories({
				filters: { agentType, timeRange },
				limit,
			}),
		staleTime: 1000 * 60, // 1 minute
	});
}

export function useImportantMemories(agentType?: string, minImportance = 8) {
	return useQuery({
		queryKey: [...queryKeys.memory.all, "important", agentType, minImportance],
		queryFn: () =>
			fetchAgentMemories({
				filters: { agentType, minImportance },
				limit: 50,
			}),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

export function useExpiringMemories(days = 7) {
	const expiryThreshold = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

	return useQuery({
		queryKey: [...queryKeys.memory.all, "expiring", days],
		queryFn: async () => {
			const response = await fetch(
				`/api/agents/memory?expiringBefore=${expiryThreshold.toISOString()}`,
			);
			if (!response.ok) {
				throw new Error("Failed to fetch expiring memories");
			}
			return response.json();
		},
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

// Memory cleanup and maintenance hooks
export function useCleanupExpiredMemories() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			return observability.trackOperation(
				"api.cleanup-expired-memories",
				async () => {
					const response = await fetch("/api/agents/memory/cleanup", {
						method: "POST",
					});
					if (!response.ok) {
						throw new Error("Failed to cleanup expired memories");
					}
					return response.json();
				},
			);
		},
		onSuccess: () => {
			// Invalidate all memory queries after cleanup
			queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
		},
	});
}

export function useArchiveOldMemories() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: {
			olderThanDays: number;
			minImportance?: number;
		}) => {
			return observability.trackOperation(
				"api.archive-old-memories",
				async () => {
					const response = await fetch("/api/agents/memory/archive", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(params),
					});
					if (!response.ok) {
						throw new Error("Failed to archive old memories");
					}
					return response.json();
				},
			);
		},
		onSuccess: () => {
			// Invalidate all memory queries after archival
			queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
		},
	});
}

// Knowledge sharing and context hooks
export function useSharedContext(agentTypes: string[], contextKey: string) {
	return useQuery({
		queryKey: [
			...queryKeys.memory.all,
			"shared",
			agentTypes.join(","),
			contextKey,
		],
		queryFn: async () => {
			const searchParams = new URLSearchParams();
			agentTypes.forEach((type) => searchParams.append("agentType", type));
			searchParams.append("contextKey", contextKey);

			return observability.trackOperation(
				"api.fetch-shared-context",
				async () => {
					const response = await fetch(
						`/api/agents/memory/shared?${searchParams}`,
					);
					if (!response.ok) {
						throw new Error("Failed to fetch shared context");
					}
					return response.json();
				},
			);
		},
		enabled: agentTypes.length > 0 && !!contextKey,
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

// Export utility functions
export const agentMemoryQueries = {
	all: () => queryKeys.memory.all,
	byAgent: (agentType: string) => queryKeys.memory.byAgent(agentType),
	search: (query: string, agentType?: string) =>
		queryKeys.memory.search(query, agentType),
	list: (filters: MemoryFilters) => queryKeys.memory.list(filters),
};
