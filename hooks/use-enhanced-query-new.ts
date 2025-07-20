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
import { useCallback, useEffect, useMemo } from "react";
import { useElectricContext } from "@/components/providers/electric-provider";
import { ObservabilityService } from "@/lib/observability";
import {
	getOptimizedQueryConfig,
	mutationKeys,
	queryKeys,
} from "@/lib/query/config";
import { shouldUseWASMOptimization, wasmDetector } from "@/lib/wasm/detection";

/**
 * Enhanced query hook with WASM optimization support and ElectricSQL integration
 */
export function useEnhancedQuery<TData = unknown, TError = Error>(
	queryKey: readonly unknown[],
	queryFn: () => Promise<TData>,
	options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn"> & {
		enableWASMOptimization?: boolean;
		wasmFallback?: () => Promise<TData>;
		staleWhileRevalidate?: boolean;
		enableRealTimeSync?: boolean;
		syncTable?: string;
	},
) {
	const { isReady: electricReady, client: electricClient } =
		useElectricContext();
	const config = getOptimizedQueryConfig();
	const observability = ObservabilityService.getInstance();

	const {
		enableWASMOptimization = false,
		wasmFallback,
		staleWhileRevalidate = true,
		enableRealTimeSync = true,
		syncTable,
		...queryOptions
	} = options || {};

	// Determine if WASM optimization should be used
	const shouldUseWASM = useMemo(() => {
		return enableWASMOptimization && shouldUseWASMOptimization("sqlite");
	}, [enableWASMOptimization]);

	// Enhanced query function with WASM fallback and observability
	const enhancedQueryFn = useCallback(async (): Promise<TData> => {
		return observability.trackOperation(
			`query.${queryKey.join(".")}`,
			async () => {
				try {
					if (shouldUseWASM) {
						console.log("Using WASM-optimized query for:", queryKey);
						return await queryFn();
					}
					if (wasmFallback) {
						console.log("Using fallback query for:", queryKey);
						return await wasmFallback();
					}
					return await queryFn();
				} catch (error) {
					// Fallback to JS implementation if WASM fails
					if (shouldUseWASM && wasmFallback) {
						console.warn("WASM query failed, falling back to JS:", error);
						observability.recordError("wasm.query.fallback", error as Error);
						return await wasmFallback();
					}
					throw error;
				}
			},
		);
	}, [queryFn, wasmFallback, shouldUseWASM, queryKey, observability]);

	// Set up real-time sync subscription
	const queryClient = useQueryClient();
	useEffect(() => {
		if (!(enableRealTimeSync && syncTable && electricClient && electricReady)) {
			return;
		}

		const unsubscribe = electricClient.subscribe(syncTable, (data: any[]) => {
			// Invalidate related queries when data changes
			queryClient.invalidateQueries({ queryKey });
			observability.recordEvent("electric.sync.invalidate", {
				table: syncTable,
				queryKey: queryKey.join("."),
				dataCount: data.length,
			});
		});

		return unsubscribe;
	}, [
		enableRealTimeSync,
		syncTable,
		electricClient,
		electricReady,
		queryClient,
		queryKey,
		observability,
	]);

	return useQuery({
		queryKey,
		queryFn: enhancedQueryFn,
		enabled: electricReady && (queryOptions.enabled ?? true),
		staleTime: staleWhileRevalidate ? config.caching.staleTime : 0,
		gcTime: config.caching.gcTime,
		retry: config.caching.retry,
		refetchOnWindowFocus: config.caching.refetchOnWindowFocus,
		refetchOnReconnect: config.caching.refetchOnReconnect,
		networkMode: "offlineFirst",
		...queryOptions,
	});
}

/**
 * Enhanced mutation hook with optimistic updates, rollback, and ElectricSQL integration
 */
export function useEnhancedMutation<
	TData = unknown,
	TError = Error,
	TVariables = void,
	TContext = unknown,
>(
	mutationFn: (variables: TVariables) => Promise<TData>,
	options?: UseMutationOptions<TData, TError, TVariables, TContext> & {
		optimisticUpdate?: (variables: TVariables) => TContext;
		rollbackUpdate?: (context: TContext) => void;
		invalidateQueries?: readonly unknown[][];
		enableWASMOptimization?: boolean;
		enableRealTimeSync?: boolean;
		syncTable?: string;
	},
) {
	const queryClient = useQueryClient();
	const config = getOptimizedQueryConfig();
	const observability = ObservabilityService.getInstance();
	const { client: electricClient } = useElectricContext();

	const {
		optimisticUpdate,
		rollbackUpdate,
		invalidateQueries = [],
		enableWASMOptimization = false,
		enableRealTimeSync = true,
		syncTable,
		onMutate,
		onError,
		onSuccess,
		onSettled,
		...mutationOptions
	} = options || {};

	// Determine if WASM optimization should be used
	const shouldUseWASM = useMemo(() => {
		return enableWASMOptimization && shouldUseWASMOptimization("compute");
	}, [enableWASMOptimization]);

	// Enhanced mutation function with WASM optimization and observability
	const enhancedMutationFn = useCallback(
		async (variables: TVariables): Promise<TData> => {
			return observability.trackOperation("mutation", async () => {
				if (shouldUseWASM) {
					console.log("Using WASM-optimized mutation");
				}
				return await mutationFn(variables);
			});
		},
		[mutationFn, shouldUseWASM, observability],
	);

	return useMutation({
		mutationFn: enhancedMutationFn,
		onMutate: async (variables) => {
			// Cancel outgoing refetches
			await Promise.all(
				invalidateQueries.map((queryKey) =>
					queryClient.cancelQueries({ queryKey }),
				),
			);

			// Snapshot previous values
			const previousData = invalidateQueries.reduce(
				(acc, queryKey) => {
					acc[queryKey.join(".")] = queryClient.getQueryData(queryKey);
					return acc;
				},
				{} as Record<string, unknown>,
			);

			// Perform optimistic update
			let optimisticContext: TContext | undefined;
			if (config.mutations.enableOptimisticUpdates && optimisticUpdate) {
				optimisticContext = optimisticUpdate(variables);
				observability.recordEvent("mutation.optimistic.start", {
					variables,
					context: optimisticContext,
				});
			}

			// Call user's onMutate
			const userContext = await onMutate?.(variables);

			return { previousData, optimisticContext, userContext } as TContext;
		},
		onError: (error, variables, context: any) => {
			// Rollback optimistic updates
			if (config.mutations.rollbackOnError && context) {
				const { previousData, optimisticContext } = context;

				// Restore previous data
				Object.entries(previousData || {}).forEach(([key, data]) => {
					const queryKey = key.split(".");
					queryClient.setQueryData(queryKey, data);
				});

				// Perform custom rollback
				if (rollbackUpdate && optimisticContext) {
					rollbackUpdate(optimisticContext);
				}

				observability.recordEvent("mutation.optimistic.rollback", {
					error: error.message,
					variables,
				});
			}

			observability.recordError("mutation.error", error as Error);

			// Call user's onError
			onError?.(error, variables, context);
		},
		onSuccess: (data, variables, context) => {
			// Invalidate and refetch queries
			invalidateQueries.forEach((queryKey) => {
				queryClient.invalidateQueries({ queryKey });
			});

			// Trigger real-time sync if enabled
			if (enableRealTimeSync && syncTable && electricClient) {
				electricClient.forceSync().catch((error) => {
					console.warn("Failed to force sync after mutation:", error);
				});
			}

			observability.recordEvent("mutation.success", {
				variables,
				data,
			});

			// Call user's onSuccess
			onSuccess?.(data, variables, context);
		},
		onSettled: (data, error, variables, context) => {
			// Ensure queries are refetched
			invalidateQueries.forEach((queryKey) => {
				queryClient.invalidateQueries({ queryKey });
			});

			observability.recordEvent("mutation.settled", {
				success: !error,
				variables,
			});

			// Call user's onSettled
			onSettled?.(data, error, variables, context);
		},
		retry: 3,
		retryDelay: config.mutations.retryDelay,
		networkMode: "offlineFirst",
		...mutationOptions,
	});
}

/**
 * Hook for WASM-optimized vector search queries
 */
export function useVectorSearchQuery<TData = unknown>(
	searchQuery: string,
	options?: {
		enabled?: boolean;
		filters?: Record<string, any>;
		limit?: number;
		threshold?: number;
		model?: string;
	},
) {
	const {
		enabled = true,
		filters,
		limit = 10,
		threshold = 0.7,
		model = "default",
	} = options || {};
	const observability = ObservabilityService.getInstance();

	return useEnhancedQuery(
		queryKeys.wasm.vectorSearch(searchQuery, {
			filters,
			limit,
			threshold,
			model,
		}),
		async () => {
			return observability.trackOperation("vector-search", async () => {
				// This would be implemented with actual WASM vector search
				console.log("Performing WASM vector search:", searchQuery);

				// Placeholder implementation - would use actual WASM module
				const response = await fetch("/api/vector-search", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						query: searchQuery,
						filters,
						limit,
						threshold,
						model,
					}),
				});

				if (!response.ok) {
					throw new Error(`Vector search failed: ${response.statusText}`);
				}

				return response.json();
			});
		},
		{
			enabled: enabled && searchQuery.length > 0,
			enableWASMOptimization: true,
			wasmFallback: async () => {
				// Fallback to regular text search
				console.log("Falling back to text search for:", searchQuery);

				const response = await fetch("/api/search", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						query: searchQuery,
						filters,
						limit,
					}),
				});

				if (!response.ok) {
					throw new Error(`Text search failed: ${response.statusText}`);
				}

				return response.json();
			},
			staleTime: 5 * 60 * 1000, // 5 minutes for search results
		},
	);
}
