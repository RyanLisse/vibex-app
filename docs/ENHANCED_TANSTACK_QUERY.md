# Enhanced TanStack Query Integration

This document describes the enhanced TanStack Query integration with WASM optimization support, intelligent caching strategies, and seamless ElectricSQL integration.

## Overview

The Enhanced TanStack Query integration provides:

- **WASM Optimization**: Automatic detection and utilization of WebAssembly for performance-critical operations
- **Optimistic Updates**: Immediate UI updates with automatic rollback on errors
- **Intelligent Caching**: Stale-while-revalidate patterns with WASM-aware cache strategies
- **Infinite Queries**: Virtualization support for large datasets
- **Real-time Integration**: Seamless integration with ElectricSQL real-time sync
- **Performance Monitoring**: Built-in query performance tracking and optimization

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  Enhanced Query │    │   ElectricSQL   │
│                 │    │     Hooks       │    │   Real-time     │
│ ┌─────────────┐ │    │                 │    │                 │
│ │  Components │◄┼────┤ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │             │ │    │ │ WASM Detect │ │    │ │   PGlite    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ │  (Local)    │ │
└─────────────────┘    │ ┌─────────────┐ │    │ └─────────────┘ │
                       │ │ Query Cache │ │    └─────────────────┘
                       │ └─────────────┘ │
                       │ ┌─────────────┐ │
                       │ │ Optimistic  │ │
                       │ │  Updates    │ │
                       │ └─────────────┘ │
                       └─────────────────┘
```

## Key Features

### 1. WASM Optimization Detection

Automatic detection of WebAssembly capabilities:

```typescript
import { wasmDetector, shouldUseWASMOptimization } from '@/lib/wasm/detection'

// Detect WASM capabilities
const capabilities = await wasmDetector.detectCapabilities()

// Check if specific optimization should be used
const useVectorSearch = shouldUseWASMOptimization('vector')
const useSQLiteOptimizations = shouldUseWASMOptimization('sqlite')
const useComputeOptimizations = shouldUseWASMOptimization('compute')
```

### 2. Enhanced Query Hooks

#### Basic Enhanced Query

```typescript
import { useEnhancedQuery } from '@/hooks/use-enhanced-query'

function TaskList() {
  const { data: tasks, loading, error } = useEnhancedQuery(
    ['tasks', { userId: 'user-123' }],
    async () => {
      // Query function with potential WASM optimization
      return await fetchTasks()
    },
    {
      enableWASMOptimization: true,
      wasmFallback: async () => {
        // Fallback implementation without WASM
        return await fetchTasksJS()
      },
      staleWhileRevalidate: true,
    }
  )

  return (
    <div>
      {tasks?.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  )
}
```

#### Infinite Queries with Virtualization

```typescript
import { useEnhancedInfiniteQuery } from '@/hooks/use-enhanced-query'

function InfiniteTaskList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isVirtualizationEnabled,
    virtualizedData,
  } = useEnhancedInfiniteQuery(
    ['tasks', 'infinite'],
    async ({ pageParam = 0 }) => {
      return await fetchTasksPage(pageParam)
    },
    {
      enableVirtualization: true,
      enableWASMOptimization: true,
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  )

  return (
    <VirtualizedList
      data={virtualizedData}
      enabled={isVirtualizationEnabled}
      onLoadMore={fetchNextPage}
      hasMore={hasNextPage}
    />
  )
}
```

### 3. Optimistic Updates with Rollback

```typescript
import { useEnhancedMutation } from '@/hooks/use-enhanced-query'

function TaskForm() {
  const createTaskMutation = useEnhancedMutation(
    async (newTask) => {
      return await createTask(newTask)
    },
    {
      optimisticUpdate: (variables) => {
        // Create optimistic task
        const optimisticTask = {
          id: `temp-${Date.now()}`,
          ...variables,
          createdAt: new Date(),
        }

        // Add to cache immediately
        queryClient.setQueryData(['tasks'], (old) => [optimisticTask, ...old])

        return { optimisticTask }
      },
      rollbackUpdate: (context) => {
        // Remove optimistic task on error
        queryClient.setQueryData(['tasks'], (old) => 
          old.filter(task => task.id !== context.optimisticTask.id)
        )
      },
      invalidateQueries: [['tasks']],
    }
  )

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      createTaskMutation.mutate(formData)
    }}>
      {/* Form fields */}
    </form>
  )
}
```

### 4. Vector Search with WASM

```typescript
import { useVectorSearchQuery } from '@/hooks/use-enhanced-query'

function SemanticSearch() {
  const [query, setQuery] = useState('')
  
  const { data: results, loading, isSemanticSearch } = useVectorSearchQuery(
    query,
    {
      enabled: query.length > 0,
      filters: { userId: 'user-123' },
      limit: 20,
      threshold: 0.7,
    }
  )

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tasks semantically..."
      />
      
      {isSemanticSearch && (
        <div className="text-sm text-blue-600">
          Using WASM vector search
        </div>
      )}
      
      {results?.map(result => (
        <SearchResult key={result.id} result={result} />
      ))}
    </div>
  )
}
```

## Configuration

### Query Client Configuration

The query client is automatically configured with WASM-aware settings:

```typescript
// lib/query/config.ts
export function getOptimizedQueryConfig(): QueryOptimizationConfig {
  const wasmConfig = wasmDetector.getOptimizationConfig()
  
  return {
    wasm: wasmConfig,
    caching: {
      // Longer stale time for WASM-optimized queries
      staleTime: wasmConfig.enableSQLiteOptimizations ? 5 * 60 * 1000 : 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: wasmConfig.enableComputeOptimizations ? 5 : 3,
    },
    mutations: {
      enableOptimisticUpdates: true,
      rollbackOnError: true,
      retryDelay: wasmConfig.performanceThreshold < 50 ? 500 : 1000,
    },
    infinite: {
      maxPages: wasmConfig.enableVectorSearch ? 50 : 20,
      enableVirtualization: wasmConfig.enableComputeOptimizations,
      pageSize: wasmConfig.enableSQLiteOptimizations ? 100 : 50,
    },
  }
}
```

### Environment Variables

```env
# Enable TanStack Query devtools
NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS=true

# WASM optimization settings
NEXT_PUBLIC_ENABLE_WASM_VECTOR_SEARCH=true
NEXT_PUBLIC_ENABLE_WASM_SQLITE=true
NEXT_PUBLIC_ENABLE_WASM_COMPUTE=true
```

## Integration with ElectricSQL

The enhanced queries seamlessly integrate with ElectricSQL real-time sync:

```typescript
function TasksWithRealTimeSync() {
  // ElectricSQL provides real-time data
  const { tasks: electricTasks, loading: electricLoading } = useElectricTasks()
  
  // Enhanced query provides optimized filtering and caching
  const { tasks, loading, error } = useTasksQuery({
    status: ['pending', 'in_progress'],
    priority: ['high'],
  })

  // The hook automatically combines ElectricSQL real-time data
  // with enhanced query optimizations
  
  return (
    <div>
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  )
}
```

## Performance Monitoring

Built-in performance monitoring components:

```typescript
import { 
  QueryPerformanceMonitor, 
  QueryCacheStatus, 
  WASMOptimizationStatus 
} from '@/components/providers/query-provider'

function App() {
  return (
    <div>
      {/* Your app content */}
      
      {/* Development-only monitoring */}
      <QueryPerformanceMonitor />
      <WASMOptimizationStatus />
      
      {/* Always visible cache status */}
      <QueryCacheStatus />
    </div>
  )
}
```

## Best Practices

### 1. Query Key Management

Use the provided query key factories:

```typescript
import { queryKeys } from '@/lib/query/config'

// Good: Consistent query keys
const tasksQuery = useEnhancedQuery(
  queryKeys.tasks.list({ userId: 'user-123' }),
  fetchTasks
)

// Bad: Manual query keys
const tasksQuery = useEnhancedQuery(
  ['tasks', 'list', 'user-123'],
  fetchTasks
)
```

### 2. WASM Optimization

Enable WASM optimization for appropriate use cases:

```typescript
// Good: Enable for complex filtering/analytics
const analyticsQuery = useEnhancedQuery(
  queryKeys.executions.analytics(),
  calculateAnalytics,
  { enableWASMOptimization: true }
)

// Good: Disable for simple queries
const taskQuery = useEnhancedQuery(
  queryKeys.tasks.detail(taskId),
  fetchTask,
  { enableWASMOptimization: false }
)
```

### 3. Optimistic Updates

Implement proper rollback mechanisms:

```typescript
const updateTaskMutation = useEnhancedMutation(
  updateTask,
  {
    optimisticUpdate: (variables) => {
      // Store previous state for rollback
      const previousTask = queryClient.getQueryData(['tasks', variables.id])
      
      // Apply optimistic update
      queryClient.setQueryData(['tasks', variables.id], {
        ...previousTask,
        ...variables.updates,
      })
      
      return { previousTask, taskId: variables.id }
    },
    rollbackUpdate: (context) => {
      // Restore previous state on error
      queryClient.setQueryData(['tasks', context.taskId], context.previousTask)
    },
  }
)
```

### 4. Error Handling

Implement comprehensive error handling:

```typescript
const { data, error, isError } = useEnhancedQuery(
  queryKeys.tasks.list(),
  fetchTasks,
  {
    retry: (failureCount, error) => {
      // Don't retry on 404s
      if (error.status === 404) return false
      return failureCount < 3
    },
    onError: (error) => {
      // Log error for monitoring
      console.error('Task query failed:', error)
      
      // Show user-friendly error message
      toast.error('Failed to load tasks')
    },
  }
)
```

## Troubleshooting

### Common Issues

1. **WASM Not Loading**: Check browser compatibility and WASM file availability
2. **Optimistic Updates Not Rolling Back**: Ensure proper context is returned from optimisticUpdate
3. **Infinite Queries Not Virtualizing**: Check WASM compute optimization availability
4. **Cache Not Invalidating**: Verify query key consistency

### Debug Tools

- Use React Query DevTools for query inspection
- Enable QueryPerformanceMonitor for performance metrics
- Check WASMOptimizationStatus for WASM capability detection
- Monitor console logs for WASM fallback messages

## Migration Guide

### From Basic TanStack Query

1. Replace `useQuery` with `useEnhancedQuery`
2. Add WASM optimization flags where appropriate
3. Implement optimistic updates for mutations
4. Use query key factories for consistency

### From ElectricSQL Only

1. Wrap ElectricSQL hooks with enhanced query hooks
2. Add caching strategies for better performance
3. Implement optimistic updates for better UX
4. Add WASM optimization for complex operations
