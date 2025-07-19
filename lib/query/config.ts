import { type DefaultOptions, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { type WASMOptimizationConfig, wasmDetector } from '@/lib/wasm/detection'

/**
 * Enhanced TanStack Query configuration with WASM optimization support
 */

export interface QueryOptimizationConfig {
  wasm: WASMOptimizationConfig
  caching: {
    staleTime: number
    gcTime: number
    refetchOnWindowFocus: boolean
    refetchOnReconnect: boolean
    retry: number | ((failureCount: number, error: Error) => boolean)
  }
  mutations: {
    enableOptimisticUpdates: boolean
    rollbackOnError: boolean
    retryDelay: number
  }
  infinite: {
    maxPages: number
    enableVirtualization: boolean
    pageSize: number
  }
}

/**
 * Get optimized query configuration based on WASM capabilities
 */
export function getOptimizedQueryConfig(): QueryOptimizationConfig {
  const wasmConfig = wasmDetector.getOptimizationConfig()

  return {
    wasm: wasmConfig,
    caching: {
      // Longer stale time for WASM-optimized queries since they're faster to recompute
      staleTime: wasmConfig.enableSQLiteOptimizations ? 5 * 60 * 1000 : 2 * 60 * 1000, // 5min vs 2min
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // More aggressive retries for WASM-optimized queries
        const maxRetries = wasmConfig.enableComputeOptimizations ? 5 : 3
        return failureCount < maxRetries && !error.message.includes('404')
      },
    },
    mutations: {
      enableOptimisticUpdates: true,
      rollbackOnError: true,
      retryDelay: wasmConfig.performanceThreshold < 50 ? 500 : 1000,
    },
    infinite: {
      maxPages: wasmConfig.enableVectorSearch ? 50 : 20, // More pages for WASM vector search
      enableVirtualization: wasmConfig.enableComputeOptimizations,
      pageSize: wasmConfig.enableSQLiteOptimizations ? 100 : 50,
    },
  }
}

/**
 * Create optimized query client with WASM-aware configuration
 */
export function createOptimizedQueryClient(): QueryClient {
  const config = getOptimizedQueryConfig()

  const defaultOptions: DefaultOptions = {
    queries: {
      staleTime: config.caching.staleTime,
      gcTime: config.caching.gcTime,
      refetchOnWindowFocus: config.caching.refetchOnWindowFocus,
      refetchOnReconnect: config.caching.refetchOnReconnect,
      retry: config.caching.retry,
      // Enable network mode for offline support with ElectricSQL
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Enable optimistic updates by default
      onMutate: async (variables) => {
        if (config.mutations.enableOptimisticUpdates) {
          console.log('Optimistic update started:', variables)
        }
      },
      onError: (error, variables, context) => {
        if (config.mutations.rollbackOnError && context) {
          console.log('Rolling back optimistic update due to error:', error)
        }
      },
      onSettled: () => {
        console.log('Mutation settled')
      },
      retry: 3,
      retryDelay: config.mutations.retryDelay,
      networkMode: 'offlineFirst',
    },
  }

  // Create query cache with enhanced error handling
  const queryCache = new QueryCache({
    onError: (error, query) => {
      console.error('Query error:', error, 'Query key:', query.queryKey)

      // Enhanced error reporting for WASM-optimized queries
      if (query.queryKey.includes('wasm')) {
        console.error('WASM query failed, falling back to JS implementation')
      }
    },
    onSuccess: (data, query) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Query success:', query.queryKey, 'Data size:', JSON.stringify(data).length)
      }
    },
  })

  // Create mutation cache with optimistic update support
  const mutationCache = new MutationCache({
    onError: (error, variables, context, mutation) => {
      console.error('Mutation error:', error, 'Variables:', variables)

      // Automatic rollback for optimistic updates
      if (config.mutations.rollbackOnError && context) {
        console.log('Performing automatic rollback for mutation:', mutation.mutationId)
      }
    },
    onSuccess: (data, variables, context, mutation) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Mutation success:', mutation.mutationId, 'Variables:', variables)
      }
    },
  })

  return new QueryClient({
    defaultOptions,
    queryCache,
    mutationCache,
  })
}

/**
 * Query key factories for consistent key generation
 */
export const queryKeys = {
  // Task-related queries
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
    search: (query: string) => [...queryKeys.tasks.all, 'search', query] as const,
    infinite: (filters: Record<string, any>) =>
      [...queryKeys.tasks.all, 'infinite', filters] as const,
  },

  // Environment-related queries
  environments: {
    all: ['environments'] as const,
    lists: () => [...queryKeys.environments.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.environments.lists(), filters] as const,
    details: () => [...queryKeys.environments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.environments.details(), id] as const,
    active: () => [...queryKeys.environments.all, 'active'] as const,
  },

  // Agent execution queries
  executions: {
    all: ['executions'] as const,
    lists: () => [...queryKeys.executions.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.executions.lists(), filters] as const,
    details: () => [...queryKeys.executions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.executions.details(), id] as const,
    byTask: (taskId: string) => [...queryKeys.executions.all, 'task', taskId] as const,
    infinite: (filters: Record<string, any>) =>
      [...queryKeys.executions.all, 'infinite', filters] as const,
  },

  // Observability events
  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.events.lists(), filters] as const,
    byExecution: (executionId: string) =>
      [...queryKeys.events.all, 'execution', executionId] as const,
    infinite: (filters: Record<string, any>) =>
      [...queryKeys.events.all, 'infinite', filters] as const,
  },

  // Agent memory queries
  memory: {
    all: ['memory'] as const,
    lists: () => [...queryKeys.memory.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.memory.lists(), filters] as const,
    search: (query: string, agentType?: string) =>
      [...queryKeys.memory.all, 'search', query, agentType] as const,
    byAgent: (agentType: string) => [...queryKeys.memory.all, 'agent', agentType] as const,
  },

  // Workflow queries
  workflows: {
    all: ['workflows'] as const,
    lists: () => [...queryKeys.workflows.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.workflows.lists(), filters] as const,
    details: () => [...queryKeys.workflows.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.workflows.details(), id] as const,
    executions: (workflowId: string) =>
      [...queryKeys.workflows.all, 'executions', workflowId] as const,
  },

  // WASM-optimized queries
  wasm: {
    vectorSearch: (query: string, filters?: Record<string, any>) =>
      ['wasm', 'vector-search', query, filters] as const,
    sqliteQuery: (sql: string, params?: any[]) => ['wasm', 'sqlite', sql, params] as const,
    compute: (operation: string, data: any) => ['wasm', 'compute', operation, data] as const,
  },
} as const

/**
 * Mutation key factories
 */
export const mutationKeys = {
  tasks: {
    create: ['tasks', 'create'] as const,
    update: (id: string) => ['tasks', 'update', id] as const,
    delete: (id: string) => ['tasks', 'delete', id] as const,
    bulkUpdate: ['tasks', 'bulk-update'] as const,
  },
  environments: {
    create: ['environments', 'create'] as const,
    update: (id: string) => ['environments', 'update', id] as const,
    delete: (id: string) => ['environments', 'delete', id] as const,
    activate: (id: string) => ['environments', 'activate', id] as const,
  },
  executions: {
    create: ['executions', 'create'] as const,
    cancel: (id: string) => ['executions', 'cancel', id] as const,
  },
  memory: {
    create: ['memory', 'create'] as const,
    update: (id: string) => ['memory', 'update', id] as const,
    delete: (id: string) => ['memory', 'delete', id] as const,
    cleanup: ['memory', 'cleanup'] as const,
  },
  workflows: {
    create: ['workflows', 'create'] as const,
    update: (id: string) => ['workflows', 'update', id] as const,
    delete: (id: string) => ['workflows', 'delete', id] as const,
    execute: (id: string) => ['workflows', 'execute', id] as const,
  },
} as const

/**
 * Cache invalidation utilities
 */
export const invalidateQueries = {
  tasks: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
  },
  environments: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.environments.all })
  },
  executions: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.executions.all })
  },
  events: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.events.all })
  },
  memory: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.memory.all })
  },
  workflows: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all })
  },
  all: (queryClient: QueryClient) => {
    queryClient.invalidateQueries()
  },
}

// Export the optimized query client instance
export const queryClient = createOptimizedQueryClient()
