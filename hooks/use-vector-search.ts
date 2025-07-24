import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

export interface VectorSearchResult {
	id: string;
	title?: string;
	description?: string;
	content?: string;
	agentType?: string;
	contextKey?: string;
	similarity: number;
	[key: string]: any;
}

export interface VectorSearchOptions {
	threshold?: number;
	limit?: number;
	userId?: string;
	agentType?: string;
	minImportance?: number;
}

export interface VectorSearchStats {
	totalTasks?: number;
	tasksWithEmbeddings?: number;
	tasksWithoutEmbeddings?: number;
	totalMemories?: number;
	memoriesWithEmbeddings?: number;
	memoriesWithoutEmbeddings?: number;
	avgImportance?: number;
	expiredMemories?: number;
	wasm: {
		available: boolean;
		capabilities: {
			webAssembly: boolean;
			sharedArrayBuffer: boolean;
			crossOriginIsolated: boolean;
			memoryInfo: any;
		};
	};
}

// Query keys for vector search
export const vectorSearchKeys = {
	taskSearch: (query: string, options: VectorSearchOptions) =>
		["vector-search", "tasks", query, options] as const,
	memorySearch: (query: string, options: VectorSearchOptions) =>
		["vector-search", "memory", query, options] as const,
	taskStats: (userId?: string) => ["vector-search", "tasks", "stats", userId] as const,
	memoryStats: (agentType?: string) => ["vector-search", "memory", "stats", agentType] as const,
};

/**
 * Hook for searching tasks using vector similarity
 */
export const useTaskVectorSearch = (query: string, options: VectorSearchOptions = {}) => {
	const [isSearching, setIsSearching] = useState(false);

	return useQuery({
		queryKey: vectorSearchKeys.taskSearch(query, options),
		queryFn: async (): Promise<{
			results: VectorSearchResult[];
			query: string;
			method: string;
			count: number;
		}> => {
			if (!query.trim()) {
				return { results: [], query, method: "none", count: 0 };
			}

			setIsSearching(true);
			try {
				const response = await fetch("/api/vector-search/tasks", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ query, ...options }),
				});

				if (!response.ok) {
					throw new Error(`Search failed: ${response.statusText}`);
				}

				return await response.json();
			} finally {
				setIsSearching(false);
			}
		},
		enabled: !!query.trim(),
		staleTime: 30000, // 30 seconds
		retry: 2,
	});
};

/**
 * Hook for searching agent memory using vector similarity
 */
export const useMemoryVectorSearch = (query: string, options: VectorSearchOptions = {}) => {
	const [isSearching, setIsSearching] = useState(false);

	return useQuery({
		queryKey: vectorSearchKeys.memorySearch(query, options),
		queryFn: async (): Promise<{
			results: VectorSearchResult[];
			query: string;
			method: string;
			count: number;
		}> => {
			if (!query.trim()) {
				return { results: [], query, method: "none", count: 0 };
			}

			setIsSearching(true);
			try {
				const response = await fetch("/api/vector-search/memory", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ query, ...options }),
				});

				if (!response.ok) {
					throw new Error(`Memory search failed: ${response.statusText}`);
				}

				return await response.json();
			} finally {
				setIsSearching(false);
			}
		},
		enabled: !!query.trim(),
		staleTime: 30000, // 30 seconds
		retry: 2,
	});
};

/**
 * Hook for storing agent memory with vector embedding
 */
export const useStoreMemory = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (memory: {
			agentType: string;
			contextKey: string;
			content: string;
			importance?: number;
			metadata?: Record<string, any>;
			expiresAt?: string;
		}) => {
			const response = await fetch("/api/vector-search/memory", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(memory),
			});

			if (!response.ok) {
				throw new Error(`Failed to store memory: ${response.statusText}`);
			}

			return await response.json();
		},
		onSuccess: () => {
			// Invalidate memory search queries
			queryClient.invalidateQueries({
				queryKey: ["vector-search", "memory"],
			});
		},
	});
};

/**
 * Hook for generating embeddings
 */
export const useGenerateEmbedding = () => {
	return useMutation({
		mutationFn: async (data: { text: string; type?: "text" | "task" | "memory" }) => {
			const response = await fetch("/api/vector-search/embeddings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error(`Failed to generate embedding: ${response.statusText}`);
			}

			return await response.json();
		},
	});
};

/**
 * Hook for batch generating embeddings
 */
export const useBatchGenerateEmbeddings = () => {
	return useMutation({
		mutationFn: async (data: { texts: string[]; type?: "text" | "task" | "memory" }) => {
			const response = await fetch("/api/vector-search/embeddings", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error(`Failed to generate embeddings: ${response.statusText}`);
			}

			return await response.json();
		},
	});
};

/**
 * Hook for updating task embeddings
 */
export const useUpdateTaskEmbeddings = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: { taskIds?: string[]; batchSize?: number } = {}) => {
			const response = await fetch("/api/vector-search/embeddings?target=tasks", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error(`Failed to update task embeddings: ${response.statusText}`);
			}

			return await response.json();
		},
		onSuccess: () => {
			// Invalidate task search queries and stats
			queryClient.invalidateQueries({
				queryKey: ["vector-search", "tasks"],
			});
		},
	});
};

/**
 * Hook for updating memory embeddings
 */
export const useUpdateMemoryEmbeddings = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: { agentType?: string; batchSize?: number } = {}) => {
			const response = await fetch("/api/vector-search/embeddings?target=memory", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error(`Failed to update memory embeddings: ${response.statusText}`);
			}

			return await response.json();
		},
		onSuccess: () => {
			// Invalidate memory search queries and stats
			queryClient.invalidateQueries({
				queryKey: ["vector-search", "memory"],
			});
		},
	});
};

/**
 * Hook for getting task vector search statistics
 */
export const useTaskVectorStats = (userId?: string) => {
	return useQuery({
		queryKey: vectorSearchKeys.taskStats(userId),
		queryFn: async (): Promise<VectorSearchStats> => {
			const params = new URLSearchParams();
			if (userId) params.set("userId", userId);

			const response = await fetch(`/api/vector-search/tasks?${params}`);

			if (!response.ok) {
				throw new Error(`Failed to get task stats: ${response.statusText}`);
			}

			return await response.json();
		},
		staleTime: 60000, // 1 minute
	});
};

/**
 * Hook for getting memory vector search statistics
 */
export const useMemoryVectorStats = (agentType?: string) => {
	return useQuery({
		queryKey: vectorSearchKeys.memoryStats(agentType),
		queryFn: async (): Promise<VectorSearchStats> => {
			const params = new URLSearchParams();
			if (agentType) params.set("agentType", agentType);

			const response = await fetch(`/api/vector-search/memory?${params}`);

			if (!response.ok) {
				throw new Error(`Failed to get memory stats: ${response.statusText}`);
			}

			return await response.json();
		},
		staleTime: 60000, // 1 minute
	});
};

/**
 * Combined hook for vector search with debouncing
 */
export const useVectorSearch = () => {
	const [query, setQuery] = useState("");
	const [searchType, setSearchType] = useState<"tasks" | "memory">("tasks");
	const [options, setOptions] = useState<VectorSearchOptions>({});

	// Debounced search
	const [debouncedQuery, setDebouncedQuery] = useState("");

	const updateQuery = useCallback((newQuery: string) => {
		setQuery(newQuery);

		// Debounce the search query
		const timer = setTimeout(() => {
			setDebouncedQuery(newQuery);
		}, 300);

		return () => clearTimeout(timer);
	}, []);

	const taskSearch = useTaskVectorSearch(searchType === "tasks" ? debouncedQuery : "", options);

	const memorySearch = useMemoryVectorSearch(
		searchType === "memory" ? debouncedQuery : "",
		options
	);

	const currentSearch = searchType === "tasks" ? taskSearch : memorySearch;

	return {
		query,
		setQuery: updateQuery,
		searchType,
		setSearchType,
		options,
		setOptions,
		results: currentSearch.data?.results || [],
		isLoading: currentSearch.isLoading,
		error: currentSearch.error,
		method: currentSearch.data?.method,
		count: currentSearch.data?.count || 0,
	};
};
