"use client";

import {
	type InfiniteData,
	type UseInfiniteQueryOptions,
	type UseMutationOptions,
	type UseQueryOptions,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useElectricContext } from "@/components/providers/electric-provider";
import { getOptimizedQueryConfig, mutationKeys, queryKeys } from "@/lib/query/config";

/**
 * Enhanced query hook with WASM optimization and real-time sync
 */
export function useEnhancedQuery<TData = unknown, TError = Error>(
	queryKey: unknown[],
	queryFn: () => Promise<TData>,
	options?: UseQueryOptions<TData, TError> & {
		enableWASMOptimization?: boolean;
		enableRealTimeSync?: boolean;
		syncTable?: string;
	}
) {
	const queryClient = useQueryClient();
	const electricContext = useElectricContext();

	const config = getOptimizedQueryConfig(options);

	return useQuery({
		queryKey,
		queryFn,
		...config,
		...options,
	});
}

/**
 * Enhanced infinite query hook with virtualization support
 */
export function useEnhancedInfiniteQuery<TData = unknown, TError = Error>(
	queryKey: unknown[],
	queryFn: ({ pageParam }: { pageParam: unknown }) => Promise<TData>,
	options?: UseInfiniteQueryOptions<TData, TError> & {
		enableWASMOptimization?: boolean;
		enableVirtualization?: boolean;
		enableRealTimeSync?: boolean;
		syncTable?: string;
	}
) {
	const config = getOptimizedQueryConfig(options);

	return useInfiniteQuery({
		queryKey,
		queryFn,
		...config,
		...options,
	});
}

/**
 * Enhanced mutation hook with optimistic updates
 */
export function useEnhancedMutation<TData = unknown, TError = Error, TVariables = void>(
	mutationFn: (variables: TVariables) => Promise<TData>,
	options?: UseMutationOptions<TData, TError, TVariables> & {
		enableWASMOptimization?: boolean;
		enableRealTimeSync?: boolean;
		syncTable?: string;
		optimisticUpdate?: (variables: TVariables) => void;
		rollbackUpdate?: (context?: unknown) => void;
		invalidateQueries?: unknown[][];
	}
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn,
		onMutate: options?.optimisticUpdate,
		onError: options?.rollbackUpdate,
		onSuccess: () => {
			if (options?.invalidateQueries) {
				options.invalidateQueries.forEach((queryKey) => {
					queryClient.invalidateQueries({ queryKey });
				});
			}
		},
		...options,
	});
}

/**
 * Vector search query hook with WASM optimization
 */
export function useVectorSearchQuery<TData = unknown>(
	query: string,
	options?: {
		enabled?: boolean;
		filters?: Record<string, unknown>;
		limit?: number;
		threshold?: number;
	}
) {
	return useEnhancedQuery(
		["vector-search", query, options?.filters],
		async (): Promise<TData[]> => {
			if (!query.trim()) return [];

			const searchParams = new URLSearchParams();
			searchParams.append("q", query);
			if (options?.limit) searchParams.append("limit", options.limit.toString());
			if (options?.threshold) searchParams.append("threshold", options.threshold.toString());
			if (options?.filters) {
				Object.entries(options.filters).forEach(([key, value]) => {
					if (value !== undefined) {
						searchParams.append(key, String(value));
					}
				});
			}

			const response = await fetch(`/api/search/vector?${searchParams.toString()}`);
			if (!response.ok) {
				throw new Error(`Vector search failed: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data || [];
		},
		{
			enabled: options?.enabled !== false && query.length > 0,
			enableWASMOptimization: true,
			staleTime: 5 * 60 * 1000, // 5 minutes
		}
	);
}
