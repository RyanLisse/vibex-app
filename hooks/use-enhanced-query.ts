'use client'

import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type UseInfiniteQueryOptions,
  type InfiniteData,
} from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { wasmDetector, shouldUseWASMOptimization } from '@/lib/wasm/detection'
import { queryKeys, mutationKeys, getOptimizedQueryConfig } from '@/lib/query/config'
import { useElectricContext } from '@/components/providers/electric-provider'

/**
 * Enhanced query hook with WASM optimization support
 */
export function useEnhancedQuery<TData = unknown, TError = Error>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    enableWASMOptimization?: boolean
    wasmFallback?: () => Promise<TData>
    staleWhileRevalidate?: boolean
  }
) {
  const { isReady: electricReady } = useElectricContext()
  const config = getOptimizedQueryConfig()

  const {
    enableWASMOptimization = false,
    wasmFallback,
    staleWhileRevalidate = true,
    ...queryOptions
  } = options || {}

  // Determine if WASM optimization should be used
  const shouldUseWASM = useMemo(() => {
    return enableWASMOptimization && shouldUseWASMOptimization('sqlite')
  }, [enableWASMOptimization])

  // Enhanced query function with WASM fallback
  const enhancedQueryFn = useCallback(async (): Promise<TData> => {
    try {
      if (shouldUseWASM) {
        console.log('Using WASM-optimized query for:', queryKey)
        return await queryFn()
      } else if (wasmFallback) {
        console.log('Using fallback query for:', queryKey)
        return await wasmFallback()
      } else {
        return await queryFn()
      }
    } catch (error) {
      // Fallback to JS implementation if WASM fails
      if (shouldUseWASM && wasmFallback) {
        console.warn('WASM query failed, falling back to JS:', error)
        return await wasmFallback()
      }
      throw error
    }
  }, [queryFn, wasmFallback, shouldUseWASM, queryKey])

  return useQuery({
    queryKey,
    queryFn: enhancedQueryFn,
    enabled: electricReady,
    staleTime: staleWhileRevalidate ? config.caching.staleTime : 0,
    gcTime: config.caching.gcTime,
    retry: config.caching.retry,
    ...queryOptions,
  })
}

/**
 * Enhanced mutation hook with optimistic updates and rollback
 */
export function useEnhancedMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables, TContext> & {
    optimisticUpdate?: (variables: TVariables) => TContext
    rollbackUpdate?: (context: TContext) => void
    invalidateQueries?: readonly unknown[][]
    enableWASMOptimization?: boolean
  }
) {
  const queryClient = useQueryClient()
  const config = getOptimizedQueryConfig()

  const {
    optimisticUpdate,
    rollbackUpdate,
    invalidateQueries = [],
    enableWASMOptimization = false,
    onMutate,
    onError,
    onSuccess,
    onSettled,
    ...mutationOptions
  } = options || {}

  // Determine if WASM optimization should be used
  const shouldUseWASM = useMemo(() => {
    return enableWASMOptimization && shouldUseWASMOptimization('compute')
  }, [enableWASMOptimization])

  // Enhanced mutation function with WASM optimization
  const enhancedMutationFn = useCallback(
    async (variables: TVariables): Promise<TData> => {
      if (shouldUseWASM) {
        console.log('Using WASM-optimized mutation')
      }
      return await mutationFn(variables)
    },
    [mutationFn, shouldUseWASM]
  )

  return useMutation({
    mutationFn: enhancedMutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await Promise.all(
        invalidateQueries.map((queryKey) => queryClient.cancelQueries({ queryKey }))
      )

      // Snapshot previous values
      const previousData = invalidateQueries.reduce(
        (acc, queryKey) => {
          acc[queryKey.join('.')] = queryClient.getQueryData(queryKey)
          return acc
        },
        {} as Record<string, unknown>
      )

      // Perform optimistic update
      let optimisticContext: TContext | undefined
      if (config.mutations.enableOptimisticUpdates && optimisticUpdate) {
        optimisticContext = optimisticUpdate(variables)
      }

      // Call user's onMutate
      const userContext = await onMutate?.(variables)

      return { previousData, optimisticContext, userContext } as TContext
    },
    onError: (error, variables, context: any) => {
      // Rollback optimistic updates
      if (config.mutations.rollbackOnError && context) {
        const { previousData, optimisticContext } = context

        // Restore previous data
        Object.entries(previousData || {}).forEach(([key, data]) => {
          const queryKey = key.split('.')
          queryClient.setQueryData(queryKey, data)
        })

        // Perform custom rollback
        if (rollbackUpdate && optimisticContext) {
          rollbackUpdate(optimisticContext)
        }
      }

      // Call user's onError
      onError?.(error, variables, context)
    },
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch queries
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey })
      })

      // Call user's onSuccess
      onSuccess?.(data, variables, context)
    },
    onSettled: (data, error, variables, context) => {
      // Ensure queries are refetched
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey })
      })

      // Call user's onSettled
      onSettled?.(data, error, variables, context)
    },
    retry: 3,
    retryDelay: config.mutations.retryDelay,
    ...mutationOptions,
  })
}

/**
 * Enhanced infinite query hook with virtualization support
 */
export function useEnhancedInfiniteQuery<TData = unknown, TError = Error>(
  queryKey: readonly unknown[],
  queryFn: ({ pageParam }: { pageParam: unknown }) => Promise<TData>,
  options?: Omit<UseInfiniteQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    enableVirtualization?: boolean
    enableWASMOptimization?: boolean
    wasmFallback?: ({ pageParam }: { pageParam: unknown }) => Promise<TData>
  }
) {
  const { isReady: electricReady } = useElectricContext()
  const config = getOptimizedQueryConfig()

  const {
    enableVirtualization = false,
    enableWASMOptimization = false,
    wasmFallback,
    ...queryOptions
  } = options || {}

  // Determine if WASM optimization should be used
  const shouldUseWASM = useMemo(() => {
    return enableWASMOptimization && shouldUseWASMOptimization('sqlite')
  }, [enableWASMOptimization])

  // Enhanced query function with WASM fallback
  const enhancedQueryFn = useCallback(
    async ({ pageParam }: { pageParam: unknown }): Promise<TData> => {
      try {
        if (shouldUseWASM) {
          console.log('Using WASM-optimized infinite query for:', queryKey, 'page:', pageParam)
          return await queryFn({ pageParam })
        } else if (wasmFallback) {
          console.log('Using fallback infinite query for:', queryKey, 'page:', pageParam)
          return await wasmFallback({ pageParam })
        } else {
          return await queryFn({ pageParam })
        }
      } catch (error) {
        // Fallback to JS implementation if WASM fails
        if (shouldUseWASM && wasmFallback) {
          console.warn('WASM infinite query failed, falling back to JS:', error)
          return await wasmFallback({ pageParam })
        }
        throw error
      }
    },
    [queryFn, wasmFallback, shouldUseWASM, queryKey]
  )

  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn: enhancedQueryFn,
    enabled: electricReady,
    staleTime: config.caching.staleTime,
    gcTime: config.caching.gcTime,
    retry: config.caching.retry,
    maxPages: config.infinite.maxPages,
    ...queryOptions,
  })

  // Virtualization helpers
  const virtualizedData = useMemo(() => {
    if (!enableVirtualization || !infiniteQuery.data) {
      return infiniteQuery.data
    }

    // Flatten pages for virtualization
    const allItems = infiniteQuery.data.pages.flat()

    return {
      ...infiniteQuery.data,
      virtualizedItems: allItems,
      totalCount: allItems.length,
    }
  }, [infiniteQuery.data, enableVirtualization])

  return {
    ...infiniteQuery,
    virtualizedData,
    isVirtualizationEnabled: enableVirtualization && config.infinite.enableVirtualization,
  }
}

/**
 * Hook for WASM-optimized vector search queries
 */
export function useVectorSearchQuery<TData = unknown>(
  searchQuery: string,
  options?: {
    enabled?: boolean
    filters?: Record<string, any>
    limit?: number
    threshold?: number
  }
) {
  const { enabled = true, filters, limit = 10, threshold = 0.7 } = options || {}

  return useEnhancedQuery(
    queryKeys.wasm.vectorSearch(searchQuery, { filters, limit, threshold }),
    async () => {
      // This would be implemented with actual WASM vector search
      console.log('Performing WASM vector search:', searchQuery)

      // Placeholder implementation
      return [] as TData[]
    },
    {
      enabled: enabled && searchQuery.length > 0,
      enableWASMOptimization: true,
      wasmFallback: async () => {
        // Fallback to regular text search
        console.log('Falling back to text search for:', searchQuery)
        return [] as TData[]
      },
      staleTime: 5 * 60 * 1000, // 5 minutes for search results
    }
  )
}

/**
 * Hook for managing query prefetching with WASM optimization
 */
export function useQueryPrefetching() {
  const queryClient = useQueryClient()
  const config = getOptimizedQueryConfig()

  const prefetchQuery = useCallback(
    async <TData>(
      queryKey: readonly unknown[],
      queryFn: () => Promise<TData>,
      options?: {
        staleTime?: number
        enableWASMOptimization?: boolean
      }
    ) => {
      const { staleTime = config.caching.staleTime, enableWASMOptimization = false } = options || {}

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: enableWASMOptimization && shouldUseWASMOptimization('sqlite') ? queryFn : queryFn,
        staleTime,
      })
    },
    [queryClient, config.caching.staleTime]
  )

  const prefetchInfiniteQuery = useCallback(
    async <TData>(
      queryKey: readonly unknown[],
      queryFn: ({ pageParam }: { pageParam: unknown }) => Promise<TData>,
      options?: {
        staleTime?: number
        enableWASMOptimization?: boolean
      }
    ) => {
      const { staleTime = config.caching.staleTime, enableWASMOptimization = false } = options || {}

      await queryClient.prefetchInfiniteQuery({
        queryKey,
        queryFn: enableWASMOptimization && shouldUseWASMOptimization('sqlite') ? queryFn : queryFn,
        staleTime,
        initialPageParam: 0,
      })
    },
    [queryClient, config.caching.staleTime]
  )

  return {
    prefetchQuery,
    prefetchInfiniteQuery,
  }
}
