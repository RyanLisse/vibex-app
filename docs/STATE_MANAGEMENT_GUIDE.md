# State Management Guide - TanStack Query

This guide covers the comprehensive state management architecture using TanStack Query, which replaced Zustand for server state management in the CloneDx application.

## Overview

TanStack Query provides powerful server state management with features like:

- **Intelligent Caching** - Automatic cache management with stale-while-revalidate
- **Background Updates** - Automatic refetching on focus/reconnect
- **Optimistic Updates** - Immediate UI feedback with rollback capability
- **Request Deduplication** - Prevents duplicate requests
- **Infinite Queries** - Built-in pagination support
- **WASM Optimization** - Enhanced performance for large datasets

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                         │
├─────────────────────────────────────────────────────────────┤
│  useQuery  │  useMutation  │  useInfiniteQuery  │  Custom   │
├─────────────────────────────────────────────────────────────┤
│                 TanStack Query Client                       │
├─────────────────────────────────────────────────────────────┤
│  Cache Layer  │  Background Sync  │  Optimistic Updates    │
├─────────────────────────────────────────────────────────────┤
│                   API Layer + ElectricSQL                   │
└─────────────────────────────────────────────────────────────┘
```

## Query Client Setup

### Enhanced Query Provider

```typescript
// components/providers/query-provider.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { observability } from '@/lib/observability'
import { wasmServices } from '@/lib/wasm/services'

// Enhanced query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Custom retry logic
        if (error?.status === 404) return false
        return failureCount < 3
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        // Global error handling
        observability.recordError('mutation_error', error as Error)
        console.error('Mutation error:', error)
      },
    },
  },
})

// Enhanced query hooks with WASM optimization
export function useEnhancedQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options?: {
    enableWASMOptimization?: boolean
    staleTime?: number
    cacheTime?: number
    refetchOnWindowFocus?: boolean
    refetchOnReconnect?: boolean
    enabled?: boolean
  }
) {
  const { enableWASMOptimization = false, ...queryOptions } = options || {}

  // WASM optimization for large datasets
  const optimizedQueryFn = useCallback(async () => {
    const startTime = performance.now()
    const data = await queryFn()

    if (enableWASMOptimization && Array.isArray(data) && data.length > 1000) {
      // Use WASM for large dataset processing
      const wasmUtils = wasmServices.getSQLiteUtils()
      return wasmUtils.optimizeDataset(data)
    }

    const duration = performance.now() - startTime
    observability.metrics.queryDuration(duration, 'query_execution', true)

    return data
  }, [queryFn, enableWASMOptimization])

  return useQuery({
    queryKey,
    queryFn: optimizedQueryFn,
    ...queryOptions,
  })
}

export function useEnhancedMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options?: {
    optimisticUpdate?: (variables: V) => any
    rollbackUpdate?: (context: any, error?: Error, variables?: V) => void
    invalidateQueries?: unknown[][]
    enableWASMOptimization?: boolean
  }
) {
  const queryClient = useQueryClient()
  const {
    optimisticUpdate,
    rollbackUpdate,
    invalidateQueries = [],
    enableWASMOptimization = false,
    ...mutationOptions
  } = options || {}

  return useMutation({
    mutationFn,
    onMutate: optimisticUpdate ? async (variables) => {
      // Cancel any outgoing refetches
      await Promise.all(
        invalidateQueries.map(key => queryClient.cancelQueries({ queryKey: key }))
      )

      // Snapshot previous values
      const previousData = invalidateQueries.reduce((acc, key) => {
        acc[key.join('.')] = queryClient.getQueryData(key)
        return acc
      }, {} as Record<string, any>)

      // Optimistically update
      const context = optimisticUpdate(variables)

      return { ...context, previousData }
    } : undefined,
    onError: rollbackUpdate ? (err, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([key, data]) => {
          const queryKey = key.split('.')
          queryClient.setQueryData(queryKey, data)
        })
      }

      rollbackUpdate(context, err, variables)
    } : undefined,
    onSettled: () => {
      // Invalidate and refetch
      invalidateQueries.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
    ...mutationOptions,
  })
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

// Global access to query client
if (typeof window !== 'undefined') {
  (window as any).__queryClient = queryClient
}
```

## Query Patterns

### 1. Query Keys Factory

```typescript
// hooks/query-keys.ts
export const queryKeys = {
  // Tasks
  tasks: {
    all: ["tasks"] as const,
    lists: () => [...queryKeys.tasks.all, "list"] as const,
    list: (filters: TaskFilters) =>
      [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
    infinite: (filters: TaskFilters) =>
      [...queryKeys.tasks.all, "infinite", filters] as const,
  },

  // Environments
  environments: {
    all: ["environments"] as const,
    lists: () => [...queryKeys.environments.all, "list"] as const,
    list: (filters: EnvironmentFilters) =>
      [...queryKeys.environments.lists(), filters] as const,
    details: () => [...queryKeys.environments.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.environments.details(), id] as const,
    active: (userId: string) =>
      [...queryKeys.environments.all, "active", userId] as const,
  },

  // Users
  users: {
    all: ["users"] as const,
    detail: (id: string) => [...queryKeys.users.all, id] as const,
    profile: () => [...queryKeys.users.all, "profile"] as const,
  },
};
```

### 2. Basic Query Hooks

```typescript
// hooks/use-task-queries.ts
import {
  useEnhancedQuery,
  useEnhancedMutation,
} from "@/components/providers/query-provider";
import { useElectricTasks } from "@/hooks/use-electric-tasks";
import { queryKeys } from "@/hooks/query-keys";

export interface TaskFilters {
  userId?: string;
  status?: "pending" | "in_progress" | "completed" | "failed";
  priority?: "low" | "medium" | "high" | "urgent";
  search?: string;
  assignee?: string;
}

// Hook for querying tasks with real-time integration
export function useTasksQuery(filters: TaskFilters = {}) {
  // Real-time data from ElectricSQL
  const {
    tasks: electricTasks,
    loading: electricLoading,
    error: electricError,
  } = useElectricTasks(filters);

  // API query with enhanced features
  const {
    data: apiTasks,
    isLoading: apiLoading,
    error: apiError,
    refetch,
    isStale,
    isFetching,
  } = useEnhancedQuery(
    queryKeys.tasks.list(filters),
    async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });

      const response = await fetch(`/api/tasks?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || [];
    },
    {
      enabled: true,
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      enableWASMOptimization: true, // Enable for large task lists
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  );

  // Combine data sources - prioritize real-time data
  const tasks = useMemo(() => {
    if (electricTasks && electricTasks.length > 0) {
      return electricTasks;
    }
    return apiTasks || [];
  }, [electricTasks, apiTasks]);

  // Determine loading and error states
  const loading = electricLoading || (apiLoading && !tasks.length);
  const error = electricError || apiError;

  return {
    tasks,
    loading,
    error,
    refetch,
    isStale,
    isFetching,
    // Additional computed properties
    tasksByStatus: useMemo(() => groupBy(tasks, "status"), [tasks]),
    completedTasksCount: useMemo(
      () => tasks.filter((t) => t.status === "completed").length,
      [tasks],
    ),
  };
}

// Hook for single task
export function useTaskQuery(taskId: string) {
  return useEnhancedQuery(
    queryKeys.tasks.detail(taskId),
    async () => {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Task with id ${taskId} not found`);
        }
        throw new Error(`Failed to fetch task: ${response.statusText}`);
      }
      return response.json();
    },
    {
      enabled: !!taskId,
      staleTime: 5 * 60 * 1000, // 5 minutes for individual tasks
      enableWASMOptimization: false, // Not needed for single records
    },
  );
}
```

### 3. Mutation Hooks with Optimistic Updates

```typescript
// hooks/use-task-mutations.ts
export function useCreateTaskMutation() {
  return useEnhancedMutation(
    async (taskData: CreateTaskData) => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create task");
      }

      const result = await response.json();
      return result.data;
    },
    {
      optimisticUpdate: (variables) => {
        // Create optimistic task
        const optimisticTask: Task = {
          id: `temp-${Date.now()}`,
          ...variables,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Update tasks cache immediately
        const queryClient = (window as any).__queryClient;
        if (queryClient) {
          queryClient.setQueryData(
            queryKeys.tasks.lists(),
            (old: Task[] = []) => [optimisticTask, ...old],
          );
        }

        return { optimisticTask };
      },
      rollbackUpdate: (context) => {
        if (context?.optimisticTask) {
          // Remove optimistic task from cache
          const queryClient = (window as any).__queryClient;
          if (queryClient) {
            queryClient.setQueryData(
              queryKeys.tasks.lists(),
              (old: Task[] = []) =>
                old.filter((task) => task.id !== context.optimisticTask.id),
            );
          }
        }
      },
      invalidateQueries: [queryKeys.tasks.all],
      enableWASMOptimization: false,
    },
  );
}

export function useUpdateTaskMutation() {
  return useEnhancedMutation(
    async ({ id, ...updates }: { id: string } & Partial<Task>) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update task");
      }

      const result = await response.json();
      return result.data;
    },
    {
      optimisticUpdate: (variables) => {
        const { id, ...updates } = variables;
        const queryClient = (window as any).__queryClient;

        if (queryClient) {
          // Update task in lists cache
          queryClient.setQueryData(
            queryKeys.tasks.lists(),
            (old: Task[] = []) =>
              old.map((task) =>
                task.id === id
                  ? { ...task, ...updates, updatedAt: new Date() }
                  : task,
              ),
          );

          // Update task in detail cache
          queryClient.setQueryData(
            queryKeys.tasks.detail(id),
            (old: Task | undefined) =>
              old ? { ...old, ...updates, updatedAt: new Date() } : undefined,
          );
        }

        return { taskId: id, updates };
      },
      rollbackUpdate: (context, error, variables) => {
        if (context?.taskId) {
          // Invalidate to refetch fresh data on error
          const queryClient = (window as any).__queryClient;
          if (queryClient) {
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
          }
        }
      },
      invalidateQueries: [queryKeys.tasks.all],
    },
  );
}

export function useDeleteTaskMutation() {
  return useEnhancedMutation(
    async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete task");
      }

      return taskId;
    },
    {
      optimisticUpdate: (taskId) => {
        const queryClient = (window as any).__queryClient;
        if (queryClient) {
          const previousTasks =
            (queryClient.getQueryData(queryKeys.tasks.lists()) as Task[]) || [];
          const taskToDelete = previousTasks.find((task) => task.id === taskId);

          // Remove task from cache immediately
          queryClient.setQueryData(
            queryKeys.tasks.lists(),
            (old: Task[] = []) => old.filter((task) => task.id !== taskId),
          );

          return { taskId, deletedTask: taskToDelete };
        }
        return { taskId };
      },
      rollbackUpdate: (context) => {
        if (context?.deletedTask) {
          // Re-add task to cache
          const queryClient = (window as any).__queryClient;
          if (queryClient) {
            queryClient.setQueryData(
              queryKeys.tasks.lists(),
              (old: Task[] = []) =>
                [...old, context.deletedTask].sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                ),
            );
          }
        }
      },
      invalidateQueries: [queryKeys.tasks.all],
    },
  );
}
```

### 4. Infinite Queries for Pagination

```typescript
// hooks/use-infinite-tasks.ts
export function useInfiniteTasksQuery(filters: TaskFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks.infinite(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined)
        ),
      })

      const response = await fetch(`/api/tasks?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const result = await response.json()
      return {
        tasks: result.data,
        pagination: result.pagination,
      }
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination
      return page < totalPages ? page + 1 : undefined
    },
    staleTime: 2 * 60 * 1000,
  })
}

// Usage in component
function TaskList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteTasksQuery({ status: 'pending' })

  const tasks = data?.pages.flatMap(page => page.tasks) ?? []

  return (
    <div>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
```

## Advanced Patterns

### 1. Dependent Queries

```typescript
// Query that depends on another query's result
export function useTaskCommentsQuery(taskId: string) {
  const { data: task } = useTaskQuery(taskId);

  return useEnhancedQuery(
    ["tasks", taskId, "comments"],
    async () => {
      const response = await fetch(`/api/tasks/${taskId}/comments`);
      return response.json();
    },
    {
      enabled: !!task && task.hasComments, // Only fetch if task exists and has comments
      staleTime: 1 * 60 * 1000, // 1 minute
    },
  );
}
```

### 2. Parallel Queries

```typescript
// Fetch multiple related data sources in parallel
export function useTaskDashboardData(userId: string) {
  const queries = useQueries({
    queries: [
      {
        queryKey: queryKeys.tasks.list({ userId, status: "pending" }),
        queryFn: () => fetchTasks({ userId, status: "pending" }),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: queryKeys.tasks.list({ userId, status: "completed" }),
        queryFn: () => fetchTasks({ userId, status: "completed" }),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: queryKeys.environments.list({ userId }),
        queryFn: () => fetchEnvironments({ userId }),
        staleTime: 10 * 60 * 1000,
      },
    ],
  });

  return {
    pendingTasks: queries[0].data || [],
    completedTasks: queries[1].data || [],
    environments: queries[2].data || [],
    isLoading: queries.some((q) => q.isLoading),
    errors: queries.map((q) => q.error).filter(Boolean),
  };
}
```

### 3. Real-time Integration with ElectricSQL

```typescript
// hooks/use-realtime-tasks.ts
export function useRealtimeTasksQuery(filters: TaskFilters = {}) {
  const queryClient = useQueryClient();

  // Standard TanStack Query
  const query = useTasksQuery(filters);

  // ElectricSQL real-time subscription
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupRealtimeSubscription = async () => {
      await electricClient.initialize();

      unsubscribe = electricClient.subscribe<Task>(
        "tasks",
        (realtimeData) => {
          // Update TanStack Query cache with real-time data
          queryClient.setQueryData(queryKeys.tasks.list(filters), realtimeData);

          // Update individual task caches
          realtimeData.forEach((task) => {
            queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
          });
        },
        {
          where: filters.userId ? { userId: filters.userId } : undefined,
          orderBy: { createdAt: "desc" },
        },
      );
    };

    setupRealtimeSubscription();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [filters, queryClient]);

  return query;
}
```

### 4. Background Sync Patterns

```typescript
// hooks/use-background-sync.ts
export function useBackgroundSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Refetch stale queries when user returns to tab
        queryClient.invalidateQueries({
          stale: true,
          refetchType: "active",
        });
      }
    };

    const handleOnline = () => {
      // Refetch all queries when connection restored
      queryClient.invalidateQueries();
    };

    const handleOffline = () => {
      // Pause background refetching when offline
      queryClient
        .getQueryCache()
        .getAll()
        .forEach((query) => {
          query.setOptions({ ...query.options, refetchInterval: false });
        });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [queryClient]);
}
```

## Performance Optimization

### 1. Query Result Transformation

```typescript
// Transform data at query level for performance
export function useTaskStatsQuery(userId: string) {
  return useEnhancedQuery(
    ["tasks", "stats", userId],
    async () => {
      const tasks = await fetchTasks({ userId });

      // Transform data immediately after fetch
      return {
        total: tasks.length,
        byStatus: tasks.reduce(
          (acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        byPriority: tasks.reduce(
          (acc, task) => {
            acc[task.priority] = (acc[task.priority] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        completionRate:
          tasks.filter((t) => t.status === "completed").length / tasks.length,
      };
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes for stats
      enableWASMOptimization: true,
    },
  );
}
```

### 2. Selective Cache Updates

```typescript
// Update only specific parts of cached data
export function useUpdateTaskStatusMutation() {
  return useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: string;
    }) => {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return response.json();
    },
    onMutate: async ({ taskId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });

      // Optimistically update the specific task
      queryClient.setQueryData(
        queryKeys.tasks.detail(taskId),
        (old: Task | undefined) =>
          old ? { ...old, status, updatedAt: new Date() } : undefined,
      );

      // Update task in all relevant list caches
      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.lists(), exact: false },
        (old: Task[] | undefined) =>
          old?.map((task) =>
            task.id === taskId
              ? { ...task, status, updatedAt: new Date() }
              : task,
          ),
      );
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}
```

### 3. Memory Management

```typescript
// Custom hook for managing query cache size
export function useQueryCacheManager() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(
      () => {
        const cache = queryClient.getQueryCache();
        const queries = cache.getAll();

        // Remove old cached queries to prevent memory leaks
        queries.forEach((query) => {
          const lastFetch = query.state.dataUpdatedAt;
          const isOld = Date.now() - lastFetch > 30 * 60 * 1000; // 30 minutes

          if (isOld && query.getObserversCount() === 0) {
            cache.remove(query);
          }
        });
      },
      5 * 60 * 1000,
    ); // Every 5 minutes

    return () => clearInterval(interval);
  }, [queryClient]);
}
```

## Testing TanStack Query

### Mock Query Client

```typescript
// __tests__/utils/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: Infinity, // Prevent garbage collection during tests
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export function createWrapper() {
  const testQueryClient = createTestQueryClient()

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### Testing Hooks

```typescript
// __tests__/hooks/use-tasks-query.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useTasksQuery } from "@/hooks/use-task-queries";
import { createWrapper } from "../utils/query-client";

// Mock API
const mockTasks = [
  { id: "1", title: "Task 1", status: "pending" },
  { id: "2", title: "Task 2", status: "completed" },
];

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: mockTasks }),
    }),
  ) as any;
});

describe("useTasksQuery", () => {
  it("fetches and returns tasks", async () => {
    const { result } = renderHook(
      () => useTasksQuery({ userId: "test-user" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.tasks).toEqual(mockTasks);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/tasks?userId=test-user"),
    );
  });

  it("handles loading states", () => {
    const { result } = renderHook(() => useTasksQuery(), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);
  });

  it("computes derived data correctly", async () => {
    const { result } = renderHook(() => useTasksQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.tasksByStatus).toEqual({
        pending: [mockTasks[0]],
        completed: [mockTasks[1]],
      });
      expect(result.current.completedTasksCount).toBe(1);
    });
  });
});
```

### Testing Mutations

```typescript
// __tests__/hooks/use-task-mutations.test.ts
describe("useCreateTaskMutation", () => {
  it("creates task with optimistic update", async () => {
    const { result } = renderHook(() => useCreateTaskMutation(), {
      wrapper: createWrapper(),
    });

    const newTask = { title: "New Task", userId: "test-user" };

    act(() => {
      result.current.mutate(newTask);
    });

    // Should immediately show optimistic update
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    });
  });

  it("rolls back on error", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: "Error" }),
      }),
    ) as any;

    const { result } = renderHook(() => useCreateTaskMutation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ title: "New Task", userId: "test-user" });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should roll back optimistic updates
    // Test cache state here
  });
});
```

## Best Practices

### 1. Query Key Management

- Use consistent query key factories
- Include all relevant parameters in keys
- Consider key hierarchy for invalidation

### 2. Optimistic Updates

- Always provide rollback functionality
- Keep optimistic updates simple
- Test error scenarios thoroughly

### 3. Caching Strategy

- Set appropriate stale times based on data volatility
- Use different cache times for different data types
- Consider user behavior patterns

### 4. Performance

- Enable WASM optimization for large datasets
- Use query result transformation
- Implement proper memory management

### 5. Real-time Integration

- Combine TanStack Query with ElectricSQL efficiently
- Update caches from real-time data
- Handle connection state properly

This comprehensive guide provides the foundation for effective state management using TanStack Query in the CloneDx application.
