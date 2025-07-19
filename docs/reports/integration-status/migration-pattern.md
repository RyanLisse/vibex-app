# TanStack Query Migration Pattern

## Overview

This document outlines the migration pattern for converting components from Zustand stores to TanStack Query hooks.

## Analysis Results

### Current State

1. **task-list.tsx** - Already migrated to TanStack Query
   - Uses `useTasksQuery` for data fetching
   - Uses `useUpdateTaskMutation` and `useDeleteTaskMutation` for mutations
   - Implements proper loading states, error handling, and offline indicators
   - Integrates with ElectricSQL provider for real-time sync status

2. **enhanced-task-list.tsx** - Already migrated to TanStack Query
   - Similar pattern to task-list.tsx
   - Uses the same TanStack Query hooks
   - Has additional features like tab management

3. **environments-list.tsx** - Already migrated to TanStack Query
   - Uses `useEnvironmentsQuery` for data fetching
   - Uses `useDeleteEnvironmentMutation` and `useActivateEnvironmentMutation`
   - Follows the same pattern as task components

### Migration Pattern

#### 1. Import TanStack Query Hooks

Replace Zustand store imports with TanStack Query hooks:

```typescript
// Before
import { useTaskStore } from "@/stores/tasks";

// After
import {
  useTasksQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "@/hooks/use-task-queries";
```

#### 2. Replace Store Usage with Query Hooks

```typescript
// Before
const { tasks, loading, error } = useTaskStore();

// After
const { tasks, loading, error, refetch, isStale, isFetching } =
  useTasksQuery(filters);
```

#### 3. Implement Loading States

```typescript
const LoadingSkeleton = () => (
  <div className="flex flex-col gap-1">
    {Array.from({ length: 3 }).map((_, index) => (
      <Skeleton key={index} className="h-16 w-full" />
    ))}
  </div>
)

if (loading) {
  return <LoadingSkeleton />
}
```

#### 4. Implement Error Handling

```typescript
const ErrorDisplay = ({ error, onRetry }: { error: Error; onRetry: () => void }) => (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription className="flex items-center justify-between">
      <span>Failed to load data: {error.message}</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </AlertDescription>
  </Alert>
)

if (error) {
  return <ErrorDisplay error={error} onRetry={refetch} />
}
```

#### 5. Add Offline Indicators

```typescript
const { isConnected, isSyncing, error: electricError } = useElectricContext()

const ConnectionStatus = () => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    {isConnected ? (
      <>
        <Wifi className="h-4 w-4 text-green-500" />
        <span>Online</span>
        {isSyncing && <RefreshCw className="h-4 w-4 animate-spin" />}
      </>
    ) : (
      <>
        <WifiOff className="h-4 w-4 text-red-500" />
        <span>Offline</span>
      </>
    )}
  </div>
)
```

#### 6. Handle Mutations with Optimistic Updates

```typescript
const updateMutation = useUpdateTaskMutation();

const handleUpdate = async (id: string, updates: Partial<Task>) => {
  try {
    await updateMutation.mutateAsync({ id, data: updates });
  } catch (error) {
    console.error("Failed to update:", error);
  }
};
```

#### 7. Show Stale Data Indicators

```typescript
{isStale && (
  <Badge variant="outline" className="text-xs">
    Stale Data
  </Badge>
)}
```

#### 8. Add Manual Refresh

```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={handleRefresh}
  disabled={isFetching}
>
  <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
</Button>
```

## Components Requiring Migration

### Priority 1 - Task Page Components

1. **app/task/[id]/\_components/chat-messages-panel.tsx**
   - Currently uses direct task prop
   - Needs to use `useTaskQuery(taskId)` hook
   - Add loading and error states

2. **app/task/[id]/\_providers/task-provider.tsx**
   - May need to integrate TanStack Query hooks
   - Ensure proper data flow to child components

### Priority 2 - Other Components

1. Any remaining components using Zustand stores
2. Components that directly fetch data without TanStack Query

## Migration Checklist

- [ ] Replace Zustand store imports with TanStack Query hooks
- [ ] Implement proper loading states with skeletons
- [ ] Add error boundaries and error display components
- [ ] Integrate ElectricSQL context for offline indicators
- [ ] Add manual refresh capabilities
- [ ] Show stale data indicators
- [ ] Implement optimistic updates for mutations
- [ ] Add proper TypeScript types for all props and returns
- [ ] Test offline functionality
- [ ] Verify real-time sync works correctly

## Next Steps

1. Start with chat-messages-panel.tsx migration
2. Update task-provider.tsx if needed
3. Search for any remaining Zustand usage
4. Create reusable components for common patterns (ConnectionStatus, ErrorDisplay, LoadingSkeleton)
5. Document any custom hooks created during migration
