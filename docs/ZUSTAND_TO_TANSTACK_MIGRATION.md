# Zustand to TanStack Query Migration Guide

This document outlines the complete migration from Zustand stores to TanStack Query hooks for state management in the application.

## Overview

The migration replaces localStorage-based Zustand stores with database-backed TanStack Query hooks that provide:

- **Database persistence**: Data is stored in PostgreSQL instead of localStorage
- **Real-time synchronization**: ElectricSQL integration for real-time updates
- **Optimistic updates**: Immediate UI updates with rollback on errors
- **Better caching**: Intelligent caching with stale-while-revalidate patterns
- **Error handling**: Comprehensive error handling and retry logic

## Migration Mapping

### Task Store Migration

#### Before (Zustand)
```typescript
import { useTaskStore } from "@/stores/tasks";

// Get all tasks
const tasks = useTaskStore((state) => state.getTasks());

// Get active tasks
const activeTasks = useTaskStore((state) => state.getActiveTasks());

// Get task by ID
const task = useTaskStore((state) => state.getTaskById(taskId));

// Create task
const addTask = useTaskStore((state) => state.addTask);
addTask(newTaskData);

// Update task
const updateTask = useTaskStore((state) => state.updateTask);
updateTask(taskId, updates);

// Delete task
const removeTask = useTaskStore((state) => state.removeTask);
removeTask(taskId);
```

#### After (TanStack Query)
```typescript
import {
  useTasks,
  useActiveTasks,
  useTask,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "@/hooks/use-task-queries-enhanced";

// Get all tasks
const { data: tasks, isLoading, error } = useTasks();

// Get active tasks
const { data: activeTasks } = useActiveTasks(userId);

// Get task by ID
const { data: task } = useTask(taskId);

// Create task
const createTaskMutation = useCreateTaskMutation();
createTaskMutation.mutate(newTaskData);

// Update task
const updateTaskMutation = useUpdateTaskMutation();
updateTaskMutation.mutate({ taskId, updates });

// Delete task
const deleteTaskMutation = useDeleteTaskMutation();
deleteTaskMutation.mutate(taskId);
```

### Environment Store Migration

#### Before (Zustand)
```typescript
import { useEnvironmentStore } from "@/stores/environments";

// Get all environments
const environments = useEnvironmentStore((state) => state.listEnvironments());

// Create environment
const createEnvironment = useEnvironmentStore((state) => state.createEnvironment);
createEnvironment(newEnvironmentData);

// Update environment
const updateEnvironment = useEnvironmentStore((state) => state.updateEnvironment);
updateEnvironment(envId, updates);

// Delete environment
const deleteEnvironment = useEnvironmentStore((state) => state.deleteEnvironment);
deleteEnvironment(envId);
```

#### After (TanStack Query)
```typescript
import {
  useEnvironments,
  useCreateEnvironmentMutation,
  useUpdateEnvironmentMutation,
  useDeleteEnvironmentMutation,
  useActivateEnvironmentMutation,
} from "@/hooks/use-environment-queries-enhanced";

// Get all environments
const { data: environments, isLoading, error } = useEnvironments();

// Create environment
const createEnvironmentMutation = useCreateEnvironmentMutation();
createEnvironmentMutation.mutate(newEnvironmentData);

// Update environment
const updateEnvironmentMutation = useUpdateEnvironmentMutation();
updateEnvironmentMutation.mutate({ id: envId, data: updates });

// Delete environment
const deleteEnvironmentMutation = useDeleteEnvironmentMutation();
deleteEnvironmentMutation.mutate(envId);

// Activate environment
const activateEnvironmentMutation = useActivateEnvironmentMutation();
activateEnvironmentMutation.mutate(envId);
```

## Real-time Synchronization

### With ElectricSQL Integration

For real-time updates, use the enhanced hooks:

```typescript
// Tasks with real-time sync
const { data: tasks, isRealTimeEnabled } = useTasksWithRealTimeSync();

// Single task with real-time sync
const { data: task, isRealTimeEnabled } = useTaskWithRealTimeSync(taskId);

// Environments with real-time sync
const { data: environments, isRealTimeEnabled } = useEnvironmentsWithRealTimeSync();

// Single environment with real-time sync
const { data: environment, isRealTimeEnabled } = useEnvironmentWithRealTimeSync(envId);
```

### Manual Subscription Setup

```typescript
// Set up real-time subscription for tasks
useTaskSubscription(); // All tasks
useTaskSubscription(taskId); // Specific task

// Set up real-time subscription for environments
useEnvironmentSubscription(); // All environments
useEnvironmentSubscription(envId); // Specific environment
```

## Key Benefits

### 1. Database Persistence
- Data survives browser sessions
- Shared across devices and users
- Proper data integrity and validation

### 2. Optimistic Updates
```typescript
const updateTaskMutation = useUpdateTaskMutation({
  onMutate: (variables) => {
    // Immediate UI update
    console.log("Optimistically updating task...");
  },
  onError: (error, variables, context) => {
    // Rollback on error
    console.log("Update failed, rolling back...");
  },
  onSuccess: (data) => {
    // Confirm success
    console.log("Task updated successfully!");
  },
});
```

### 3. Intelligent Caching
- Automatic cache invalidation
- Stale-while-revalidate patterns
- Background refetching
- Memory-efficient caching

### 4. Error Handling
```typescript
const { data, error, isLoading, refetch } = useTasks();

if (error) {
  return <ErrorMessage error={error} onRetry={refetch} />;
}

if (isLoading) {
  return <LoadingSpinner />;
}
```

### 5. Real-time Updates
- ElectricSQL integration for real-time sync
- Automatic conflict resolution
- Offline-first architecture
- Cross-client synchronization

## Migration Checklist

- [x] ✅ Create TanStack Query hooks for tasks
- [x] ✅ Create TanStack Query hooks for environments  
- [x] ✅ Add API routes for database operations
- [x] ✅ Implement optimistic updates
- [x] ✅ Add real-time synchronization with ElectricSQL
- [x] ✅ Update type definitions
- [x] ✅ Mark Zustand stores as deprecated
- [ ] 🔄 Update components to use new hooks
- [ ] 🔄 Add comprehensive error handling
- [ ] 🔄 Test real-time synchronization
- [ ] 🔄 Performance optimization
- [ ] 🔄 Remove deprecated Zustand stores

## Testing

### Unit Tests
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTasks } from '@/hooks/use-task-queries-enhanced';

test('should fetch tasks', async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(() => useTasks(), { wrapper });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(result.current.data).toBeDefined();
});
```

### Integration Tests
```typescript
test('should create task with optimistic update', async () => {
  const createTaskMutation = useCreateTaskMutation();
  
  act(() => {
    createTaskMutation.mutate({
      title: 'Test Task',
      description: 'Test Description',
    });
  });

  // Should immediately show optimistic update
  expect(screen.getByText('Test Task')).toBeInTheDocument();
  
  // Should confirm after API call
  await waitFor(() => {
    expect(createTaskMutation.isSuccess).toBe(true);
  });
});
```

## Performance Considerations

### Query Optimization
- Use specific query keys for targeted invalidation
- Implement proper stale time and cache time
- Use infinite queries for large datasets
- Implement virtual scrolling for performance

### Real-time Sync Optimization
- Debounce rapid updates
- Batch multiple operations
- Use selective subscriptions
- Implement conflict resolution strategies

## Troubleshooting

### Common Issues

1. **ElectricSQL not available**
   - Hooks automatically fall back to API calls
   - Check ElectricSQL configuration
   - Verify database connection

2. **Optimistic updates not working**
   - Check onMutate implementation
   - Verify query key matching
   - Ensure proper rollback logic

3. **Real-time sync not updating**
   - Check ElectricSQL subscription setup
   - Verify event listeners
   - Check network connectivity

4. **Performance issues**
   - Review query invalidation patterns
   - Optimize subscription filters
   - Check for memory leaks

## Next Steps

1. **Complete component migration**: Update all components to use new hooks
2. **Add comprehensive error boundaries**: Handle errors gracefully
3. **Implement offline support**: Add offline queue and sync
4. **Performance monitoring**: Add metrics and monitoring
5. **Remove deprecated code**: Clean up old Zustand stores