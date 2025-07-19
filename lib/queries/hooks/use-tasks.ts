/**
 * TanStack Query hooks for Tasks with optimistic updates and real-time sync
 */

import {
  type InfiniteData,
  type QueryClient,
  type UseMutationOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { NewTask, Task } from '@/db/schema'
import { electricClient } from '@/lib/electric/client'
import { observability } from '@/lib/observability'
import { wasmDetector } from '@/lib/wasm/detection'
import { mutationKeys, queryKeys } from '../keys'

// API types
export interface TasksResponse {
  tasks: Task[]
  total: number
  hasMore: boolean
  nextCursor?: string
}

export interface TaskFilters {
  status?: string
  priority?: string
  userId?: string
  search?: string
  archived?: boolean
  limit?: number
  offset?: number
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: string
  priority?: string
  metadata?: any
  isArchived?: boolean
}

// API functions
async function fetchTasks(filters: TaskFilters = {}): Promise<TasksResponse> {
  return observability.trackOperation('query.tasks.fetch', async () => {
    const searchParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })

    const response = await fetch(`/api/tasks?${searchParams}`)
    if (!response.ok) {
      throw new Error('Failed to fetch tasks')
    }

    return response.json()
  })
}

async function fetchTask(id: string): Promise<Task> {
  return observability.trackOperation('query.task.fetch', async () => {
    const response = await fetch(`/api/tasks/${id}`)
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Task not found')
      }
      throw new Error('Failed to fetch task')
    }

    return response.json()
  })
}

async function createTask(data: NewTask): Promise<Task> {
  return observability.trackOperation('mutation.task.create', async () => {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to create task')
    }

    return response.json()
  })
}

async function updateTask(id: string, data: UpdateTaskInput): Promise<Task> {
  return observability.trackOperation('mutation.task.update', async () => {
    const response = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to update task')
    }

    return response.json()
  })
}

async function deleteTask(id: string): Promise<void> {
  return observability.trackOperation('mutation.task.delete', async () => {
    const response = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete task')
    }
  })
}

// Vector search using WASM if available
async function searchTasksByVector(
  embedding: number[],
  limit = 10,
  filters?: TaskFilters
): Promise<Task[]> {
  return observability.trackOperation('query.tasks.vector-search', async () => {
    if (wasmDetector.isVectorSearchSupported()) {
      // Use WASM-optimized vector search
      const response = await fetch('/api/tasks/vector-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embedding, limit, filters }),
      })

      if (!response.ok) {
        throw new Error('Vector search failed')
      }

      return response.json()
    }
    // Fallback to regular search
    const result = await fetchTasks({ ...filters, limit })
    return result.tasks
  })
}

// Query hooks
export function useTasks(filters: TaskFilters = {}, options?: any) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => fetchTasks(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

export function useTask(id: string, options?: any) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => fetchTask(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  })
}

export function useInfiniteTasks(filters: TaskFilters = {}, options?: any) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks.infinite(filters),
    queryFn: ({ pageParam = 0 }) =>
      fetchTasks({ ...filters, offset: pageParam, limit: filters.limit || 20 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return
      return allPages.length * (filters.limit || 20)
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  })
}

export function useTaskVectorSearch(
  embedding: number[],
  limit = 10,
  filters?: TaskFilters,
  options?: any
) {
  return useQuery({
    queryKey: queryKeys.tasks.vector(embedding, limit),
    queryFn: () => searchTasksByVector(embedding, limit, filters),
    enabled: embedding.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

export function useTaskStats(userId?: string, options?: any) {
  return useQuery({
    queryKey: queryKeys.tasks.stats(userId),
    queryFn: async () => {
      const response = await fetch(`/api/tasks/stats${userId ? `?userId=${userId}` : ''}`)
      if (!response.ok) throw new Error('Failed to fetch task stats')
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// Mutation hooks with optimistic updates
export function useCreateTask(options?: UseMutationOptions<Task, Error, NewTask>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.tasks.create,
    mutationFn: createTask,
    onMutate: async (newTaskData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<TasksResponse>(queryKeys.tasks.list())

      // Optimistically update to the new value
      if (previousTasks) {
        const optimisticTask: Task = {
          id: `temp-${Date.now()}`,
          ...newTaskData,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Task

        queryClient.setQueryData<TasksResponse>(queryKeys.tasks.list(), {
          ...previousTasks,
          tasks: [optimisticTask, ...previousTasks.tasks],
          total: previousTasks.total + 1,
        })
      }

      // Return a context object with the snapshotted value
      return { previousTasks }
    },
    onError: (err, newTask, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.list(), context.previousTasks)
      }
      observability.recordError('mutation.task.create', err, { task: newTask })
    },
    onSuccess: (data) => {
      // Update the individual task cache
      queryClient.setQueryData(queryKeys.tasks.detail(data.id), data)
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.infinite({}) })
    },
    ...options,
  })
}

export function useUpdateTask(
  options?: UseMutationOptions<Task, Error, { id: string; data: UpdateTaskInput }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.tasks.update,
    mutationFn: ({ id, data }) => updateTask(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) })

      const previousTask = queryClient.getQueryData<Task>(queryKeys.tasks.detail(id))

      if (previousTask) {
        const updatedTask = {
          ...previousTask,
          ...data,
          updatedAt: new Date(),
        }
        queryClient.setQueryData(queryKeys.tasks.detail(id), updatedTask)

        // Update in lists
        queryClient.setQueriesData<TasksResponse>({ queryKey: queryKeys.tasks.lists() }, (old) => {
          if (!old) return old
          return {
            ...old,
            tasks: old.tasks.map((task) => (task.id === id ? updatedTask : task)),
          }
        })
      }

      return { previousTask }
    },
    onError: (err, variables, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(variables.id), context.previousTask)
      }
      observability.recordError('mutation.task.update', err, variables)
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.detail(variables.id),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
    },
    ...options,
  })
}

export function useDeleteTask(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.tasks.delete,
    mutationFn: deleteTask,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })

      const previousTasks = queryClient.getQueryData<TasksResponse>(queryKeys.tasks.list())

      if (previousTasks) {
        queryClient.setQueryData<TasksResponse>(queryKeys.tasks.list(), {
          ...previousTasks,
          tasks: previousTasks.tasks.filter((task) => task.id !== taskId),
          total: previousTasks.total - 1,
        })
      }

      return { previousTasks }
    },
    onError: (err, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.list(), context.previousTasks)
      }
      observability.recordError('mutation.task.delete', err, { taskId })
    },
    onSettled: (data, error, taskId) => {
      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.infinite({}) })
    },
    ...options,
  })
}

// Convenience hooks for common operations
export function useArchiveTask() {
  const updateTask = useUpdateTask()

  return useMutation({
    mutationFn: (id: string) => updateTask.mutateAsync({ id, data: { isArchived: true } }),
  })
}

export function useUnarchiveTask() {
  const updateTask = useUpdateTask()

  return useMutation({
    mutationFn: (id: string) => updateTask.mutateAsync({ id, data: { isArchived: false } }),
  })
}

export function useUpdateTaskStatus() {
  const updateTask = useUpdateTask()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTask.mutateAsync({ id, data: { status } }),
  })
}

export function useUpdateTaskPriority() {
  const updateTask = useUpdateTask()

  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: string }) =>
      updateTask.mutateAsync({ id, data: { priority } }),
  })
}

// Real-time subscription hook
export function useTasksSubscription(filters?: TaskFilters, onUpdate?: (tasks: Task[]) => void) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!electricClient.isConnected()) return

    const unsubscribe = electricClient.subscribe(
      'tasks',
      (tasks: Task[]) => {
        // Update query cache
        queryClient.setQueryData<TasksResponse>(queryKeys.tasks.list(filters), (old) => {
          if (!old) return { tasks, total: tasks.length, hasMore: false }

          // Merge new tasks with existing ones
          const taskMap = new Map(old.tasks.map((t) => [t.id, t]))
          tasks.forEach((task) => taskMap.set(task.id, task))

          return {
            ...old,
            tasks: Array.from(taskMap.values()),
            total: taskMap.size,
          }
        })

        // Call custom handler if provided
        onUpdate?.(tasks)
      },
      {
        where: filters,
        orderBy: { updatedAt: 'desc' },
      }
    )

    return () => unsubscribe()
  }, [queryClient, filters, onUpdate])
}

// Batch operations
export function useBulkUpdateTasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.tasks.bulkUpdate,
    mutationFn: async (updates: Array<{ id: string; data: UpdateTaskInput }>) => {
      const response = await fetch('/api/tasks/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      if (!response.ok) throw new Error('Failed to bulk update tasks')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}

// Helper to prefetch task data
export async function prefetchTask(queryClient: QueryClient, id: string) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => fetchTask(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Helper to prefetch tasks list
export async function prefetchTasks(queryClient: QueryClient, filters: TaskFilters = {}) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => fetchTasks(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

import { useEffect } from 'react'
