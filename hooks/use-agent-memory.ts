/**
 * Agent Memory React Hooks
 *
 * Provides React hooks for agent memory management with TanStack Query integration
 */

import {
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type {
	AgentMemoryEntry,
	MemoryContext,
	MemoryInsight,
	MemorySearchOptions,
	VectorSearchResult,
} from "@/lib/agent-memory/memory-service";

// Query keys
export const agentMemoryKeys = {
	all: ["agent-memory"] as const,
	byAgent: (agentType: string) => [...agentMemoryKeys.all, "agent", agentType] as const,
	byContext: (agentType: string, contextKey: string) =>
		[...agentMemoryKeys.byAgent(agentType), "context", contextKey] as const,
	search: (agentType: string, query: string) =>
		[...agentMemoryKeys.byAgent(agentType), "search", query] as const,
	insights: (agentType: string) => [...agentMemoryKeys.byAgent(agentType), "insights"] as const,
	context: (agentType: string, taskDescription: string) =>
		[...agentMemoryKeys.byAgent(agentType), "task-context", taskDescription] as const,
};

// API functions
async function storeMemory(data: {
	agentType: string;
	contextKey: string;
	content: string;
	importance?: number;
	metadata?: Record<string, any>;
	expiresAt?: string;
	generateEmbedding?: boolean;
}): Promise<AgentMemoryEntry> {
	const response = await fetch("/api/agent-memory", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to store memory");
	}

	const result = await response.json();
	return result.data;
}

async function getMemoriesByContext(
	agentType: string,
	contextKey: string,
	options: {
		includeExpired?: boolean;
		orderBy?: "importance" | "recency" | "access";
		limit?: number;
	} = {}
): Promise<AgentMemoryEntry[]> {
	const params = new URLSearchParams({
		agentType,
		contextKey,
		...Object.fromEntries(Object.entries(options).map(([key, value]) => [key, String(value)])),
	});

	const response = await fetch(`/api/agent-memory?${params}`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to get memories");
	}

	const result = await response.json();
	return result.data;
}

async function searchMemories(
	query: string,
	options: MemorySearchOptions = {}
): Promise<VectorSearchResult[]> {
	const params = new URLSearchParams({
		query,
		...Object.fromEntries(
			Object.entries(options)
				.filter(([, value]) => value !== undefined)
				.map(([key, value]) => [key, String(value)])
		),
	});

	const response = await fetch(`/api/agent-memory?${params}`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to search memories");
	}

	const result = await response.json();
	return result.data;
}

async function getRelevantContext(data: {
	agentType: string;
	taskDescription: string;
	maxMemories?: number;
	includePatterns?: boolean;
	includeSummary?: boolean;
}): Promise<MemoryContext> {
	const response = await fetch("/api/agent-memory/context", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to get context");
	}

	const result = await response.json();
	return result.data;
}

async function shareKnowledge(data: {
	fromAgentType: string;
	toAgentType: string;
	contextKey: string;
	minImportance?: number;
	copyMetadata?: boolean;
	adjustImportance?: boolean;
}): Promise<{ shared: number; errors: number }> {
	const response = await fetch("/api/agent-memory/share", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to share knowledge");
	}

	const result = await response.json();
	return result.data;
}

async function getMemoryInsights(agentType: string): Promise<MemoryInsight> {
	const response = await fetch(`/api/agent-memory/insights?agentType=${agentType}`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to get insights");
	}

	const result = await response.json();
	return result.data;
}

async function archiveMemories(data: {
	olderThanDays?: number;
	maxImportance?: number;
	maxAccessCount?: number;
	dryRun?: boolean;
}): Promise<{ archived: number; errors: number }> {
	const response = await fetch("/api/agent-memory/archive", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to archive memories");
	}

	const result = await response.json();
	return result.data;
}

// Hooks
export function useStoreMemory(
	options?: UseMutationOptions<AgentMemoryEntry, Error, Parameters<typeof storeMemory>[0]>
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: storeMemory,
		onSuccess: (data, variables) => {
			// Invalidate relevant queries
			queryClient.invalidateQueries({
				queryKey: agentMemoryKeys.byAgent(variables.agentType),
			});
			queryClient.invalidateQueries({
				queryKey: agentMemoryKeys.byContext(variables.agentType, variables.contextKey),
			});
		},
		...options,
	});
}

export function useMemoriesByContext(
	agentType: string,
	contextKey: string,
	options: {
		includeExpired?: boolean;
		orderBy?: "importance" | "recency" | "access";
		limit?: number;
	} = {},
	queryOptions?: UseQueryOptions<AgentMemoryEntry[], Error>
) {
	return useQuery({
		queryKey: agentMemoryKeys.byContext(agentType, contextKey),
		queryFn: () => getMemoriesByContext(agentType, contextKey, options),
		enabled: !!agentType && !!contextKey,
		staleTime: 30000, // 30 seconds
		...queryOptions,
	});
}

export function useSearchMemories(
	query: string,
	options: MemorySearchOptions = {},
	queryOptions?: UseQueryOptions<VectorSearchResult[], Error>
) {
	return useQuery({
		queryKey: agentMemoryKeys.search(options.agentType || "all", query),
		queryFn: () => searchMemories(query, options),
		enabled: !!query.trim(),
		staleTime: 60000, // 1 minute
		...queryOptions,
	});
}

export function useRelevantContext(
	agentType: string,
	taskDescription: string,
	options: {
		maxMemories?: number;
		includePatterns?: boolean;
		includeSummary?: boolean;
	} = {},
	queryOptions?: UseQueryOptions<MemoryContext, Error>
) {
	return useQuery({
		queryKey: agentMemoryKeys.context(agentType, taskDescription),
		queryFn: () =>
			getRelevantContext({
				agentType,
				taskDescription,
				...options,
			}),
		enabled: !!agentType && !!taskDescription,
		staleTime: 120000, // 2 minutes
		...queryOptions,
	});
}

export function useShareKnowledge(
	options?: UseMutationOptions<
		{ shared: number; errors: number },
		Error,
		Parameters<typeof shareKnowledge>[0]
	>
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: shareKnowledge,
		onSuccess: (data, variables) => {
			// Invalidate queries for both agent types
			queryClient.invalidateQueries({
				queryKey: agentMemoryKeys.byAgent(variables.fromAgentType),
			});
			queryClient.invalidateQueries({
				queryKey: agentMemoryKeys.byAgent(variables.toAgentType),
			});
		},
		...options,
	});
}

export function useMemoryInsights(
	agentType: string,
	queryOptions?: UseQueryOptions<MemoryInsight, Error>
) {
	return useQuery({
		queryKey: agentMemoryKeys.insights(agentType),
		queryFn: () => getMemoryInsights(agentType),
		enabled: !!agentType,
		staleTime: 300000, // 5 minutes
		...queryOptions,
	});
}

export function useArchiveMemories(
	options?: UseMutationOptions<
		{ archived: number; errors: number },
		Error,
		Parameters<typeof archiveMemories>[0]
	>
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: archiveMemories,
		onSuccess: () => {
			// Invalidate all memory queries as archiving affects all agents
			queryClient.invalidateQueries({
				queryKey: agentMemoryKeys.all,
			});
		},
		...options,
	});
}

// Utility hooks
export function useMemoryStats(agentType: string) {
	const { data: insights } = useMemoryInsights(agentType);

	return {
		totalMemories: insights?.frequentContexts.reduce((sum, ctx) => sum + ctx.count, 0) || 0,
		topContexts: insights?.frequentContexts.slice(0, 5) || [],
		importanceDistribution: insights?.importanceDistribution || {},
		recommendations: insights?.recommendations || [],
		patterns: insights?.patterns || [],
	};
}

export function useMemorySearch(initialQuery = "", agentType?: string) {
	const [query, setQuery] = useState(initialQuery);
	const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

	// Debounce search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(query);
		}, 300);

		return () => clearTimeout(timer);
	}, [query]);

	const searchResults = useSearchMemories(
		debouncedQuery,
		{ agentType, maxResults: 20 },
		{ enabled: debouncedQuery.length > 2 }
	);

	return {
		query,
		setQuery,
		results: searchResults.data || [],
		isLoading: searchResults.isLoading,
		error: searchResults.error,
	};
}
