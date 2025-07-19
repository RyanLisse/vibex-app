# TanStack Query Hooks for Database Operations

This directory contains comprehensive TanStack Query hooks for all database operations with type-safe query keys, optimistic updates, real-time subscription integration, and WASM optimization.

## Features

- 🔑 **Type-safe Query Keys**: Centralized query key factory with full TypeScript support
- ⚡ **Optimistic Updates**: Instant UI feedback with automatic rollback on errors
- 🔄 **Real-time Sync**: ElectricSQL integration for live data updates
- 🚀 **WASM Optimization**: Vector search and compute operations using WebAssembly
- 📊 **Performance Tracking**: Built-in observability for all operations
- ♾️ **Infinite Queries**: Efficient pagination for large datasets
- 🔒 **Cache Management**: Smart invalidation strategies and prefetching

## Directory Structure

```
lib/queries/
├── keys/
│   └── index.ts          # Type-safe query and mutation keys
├── hooks/
│   ├── use-tasks.ts      # Task operations with optimistic updates
│   ├── use-environments.ts # Environment management with real-time sync
│   ├── use-agent-executions.ts # Agent execution tracking with performance metrics
│   ├── use-observability-events.ts # Event monitoring with infinite queries
│   ├── use-agent-memory.ts # Memory operations with vector search
│   ├── use-workflows.ts  # Workflow orchestration and execution
│   └── index.ts          # Central export point
├── utils/
│   └── (utility functions)
└── README.md            # This file
```

## Usage

### Basic Query Example

```typescript
import { useTask, useTasks } from '@/lib/queries/hooks'

function TaskList() {
  const { data: tasks, isLoading, error } = useTasks({
    status: 'active',
    priority: 'high'
  })

  const { data: task } = useTask('task-id')

  if (isLoading) return <Loading />
  if (error) return <Error error={error} />

  return <TaskGrid tasks={tasks.tasks} />
}
```

### Optimistic Updates

```typescript
import { useCreateTask, useUpdateTask } from '@/lib/queries/hooks'

function TaskForm() {
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const handleSubmit = async (data) => {
    // Optimistic update happens automatically
    await createTask.mutateAsync({
      title: data.title,
      description: data.description,
      priority: 'high'
    })
  }

  const handleUpdate = async (id, data) => {
    // UI updates immediately, rolls back on error
    await updateTask.mutateAsync({ id, data })
  }
}
```

### Real-time Subscriptions

```typescript
import { useTasksSubscription } from '@/lib/queries/hooks'

function LiveTaskDashboard() {
  // Automatically updates when tasks change in the database
  useTasksSubscription(
    { status: 'active' },
    (updatedTasks) => {
      console.log('Tasks updated:', updatedTasks)
    }
  )

  // Regular query hook
  const { data: tasks } = useTasks({ status: 'active' })

  return <Dashboard tasks={tasks} />
}
```

### Infinite Queries

```typescript
import { useInfiniteObservabilityEvents } from '@/lib/queries/hooks'

function EventLog() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteObservabilityEvents({
    severity: 'error',
    limit: 100
  })

  return (
    <VirtualList
      items={data.pages.flatMap(page => page.events)}
      onEndReached={() => hasNextPage && fetchNextPage()}
      isLoading={isFetchingNextPage}
    />
  )
}
```

### Vector Search with WASM

```typescript
import { useMemoryVectorSearch } from '@/lib/queries/hooks'

function SemanticSearch({ embedding }) {
  const { data: results } = useMemoryVectorSearch(
    embedding,
    'assistant', // agent type
    10 // limit
  )

  return (
    <SearchResults
      results={results}
      showSimilarityScores
    />
  )
}
```

### Performance Monitoring

```typescript
import { useExecutionPerformanceMonitor } from '@/lib/queries/hooks'

function ExecutionMonitor({ executionId }) {
  const { execution, performance } = useExecutionPerformanceMonitor(executionId)

  return (
    <PerformanceChart
      metrics={performance?.metrics}
      phases={performance?.metrics.phases}
      tokenUsage={performance?.metrics.tokenUsage}
    />
  )
}
```

## Hook Categories

### Task Hooks
- `useTasks` - Query tasks with filters
- `useTask` - Query single task
- `useInfiniteTasks` - Infinite scrolling for tasks
- `useTaskVectorSearch` - Semantic task search
- `useCreateTask` - Create with optimistic updates
- `useUpdateTask` - Update with optimistic updates
- `useDeleteTask` - Delete with cache cleanup

### Environment Hooks
- `useEnvironments` - Query environments
- `useActiveEnvironment` - Get active environment
- `useValidateEnvironmentConfig` - Validate configuration
- `useActivateEnvironment` - Switch active environment

### Agent Execution Hooks
- `useAgentExecutions` - Query executions with filters
- `useExecutionStats` - Aggregated statistics
- `useExecutionPerformance` - Detailed performance metrics
- `useCancelAgentExecution` - Cancel running execution

### Observability Event Hooks
- `useObservabilityEvents` - Query events
- `useEventTimeline` - Timeline view of events
- `useEventAggregation` - Aggregated event analytics
- `useCriticalEvents` - Filter critical events only

### Agent Memory Hooks
- `useAgentMemories` - Query memory entries
- `useMemorySearch` - Text-based search
- `useMemoryVectorSearch` - Vector similarity search
- `useCleanupMemories` - Clean expired memories

### Workflow Hooks
- `useWorkflows` - Query workflow definitions
- `useWorkflowExecutions` - Query executions
- `useExecuteWorkflow` - Start workflow execution
- `usePauseWorkflowExecution` - Pause running workflow

## Query Keys

All query keys are centralized and type-safe:

```typescript
import { queryKeys } from '@/lib/queries/keys'

// Examples
queryKeys.tasks.all
queryKeys.tasks.detail('task-id')
queryKeys.tasks.list({ status: 'active' })
queryKeys.executions.byTask('task-id')
queryKeys.events.timeline('execution-id')
```

## Mutation Keys

Mutation keys for tracking operations:

```typescript
import { mutationKeys } from '@/lib/queries/keys'

// Examples
mutationKeys.tasks.create
mutationKeys.tasks.update('task-id')
mutationKeys.workflows.execute('workflow-id')
```

## Cache Invalidation

The hooks automatically handle cache invalidation, but you can also manually invalidate:

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/keys'

function RefreshButton() {
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    // Invalidate all task queries
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.tasks.all 
    })

    // Invalidate specific task
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.tasks.detail('task-id') 
    })
  }
}
```

## Prefetching

Prefetch data for instant navigation:

```typescript
import { prefetchTask, prefetchWorkflow } from '@/lib/queries/hooks'

function TaskLink({ taskId }) {
  const queryClient = useQueryClient()

  return (
    <Link
      href={`/task/${taskId}`}
      onMouseEnter={() => prefetchTask(queryClient, taskId)}
    >
      View Task
    </Link>
  )
}
```

## Error Handling

All hooks include built-in error handling with observability:

```typescript
const { data, error, isError } = useTask('task-id')

if (isError) {
  // Error is automatically logged to observability
  return <ErrorBoundary error={error} />
}
```

## Performance Optimization

1. **Stale Time**: Queries have optimized stale times based on data volatility
2. **Garbage Collection**: Unused data is automatically cleaned up
3. **Batched Updates**: Real-time updates are batched for performance
4. **WASM Optimization**: Heavy computations use WebAssembly when available
5. **Smart Refetching**: Only refetch when necessary

## Integration with ElectricSQL

The hooks automatically integrate with ElectricSQL for:
- Real-time data synchronization
- Offline-first functionality
- Conflict resolution
- Optimistic updates with automatic rollback

## Best Practices

1. **Use specific hooks**: Prefer `useTasksByStatus` over `useTasks` with filters
2. **Enable subscriptions selectively**: Only subscribe to real-time updates when needed
3. **Prefetch on hover**: Use prefetching for better perceived performance
4. **Handle loading states**: Always show loading indicators for better UX
5. **Use error boundaries**: Wrap components with error boundaries for graceful failures

## Contributing

When adding new hooks:
1. Follow the existing pattern for consistency
2. Include TypeScript types for all parameters and returns
3. Add optimistic updates for mutations
4. Include real-time subscription support
5. Add performance tracking with observability
6. Update the index file exports
7. Add documentation and examples