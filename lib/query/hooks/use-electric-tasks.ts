/**
 * Enhanced TanStack Query Hooks for Tasks with ElectricSQL Real-time Integration
 *
 * Provides seamless integration between TanStack Query and ElectricSQL real-time sync
 * with Redis caching and conflict resolution.
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { z } from 'zod'
import type { NewTask, Task } from '@/db/schema'
import { conflictResolutionService } from '@/lib/electric/conflict-resolution'
import { electricDatabaseClient } from '@/lib/electric/database-client'
import { enhancedElectricSyncService } from '@/lib/electric/enhanced-sync-service'
import type { CreateTaskSchema, TaskSchema, UpdateTaskSchema } from '@/src/schemas/api-routes'

// Types
export type ElectricTask = z.infer<typeof TaskSchema>
export type CreateElectricTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateElectricTaskInput = z.infer<typeof UpdateTaskSchema>

export interface ElectricTaskFilters {
  status?: string[]
  priority?: string[]
  userId?: string
  search?: string
  archived?: boolean
  sessionId?: string
}

export interface ElectricTaskOptions {
  realtime?: boolean
  cacheFirst?: boolean
  conflictResolution?: 'last-write-wins' | 'user-priority' | 'field-merge' | 'server-wins'
  offlineSupport?: boolean
}

// Query keys for ElectricSQL integration
export const electricTaskKeys = {
  all: ['electric-tasks'] as const,
  lists: () => [...electricTaskKeys.all, 'list'] as const,
  list: (filters: ElectricTaskFilters) => [...electricTaskKeys.lists(), filters] as const,
  details: () => [...electricTaskKeys.all, 'detail'] as const,
  detail: (id: string) => [...electricTaskKeys.details(), id] as const,
  infinite: (filters: ElectricTaskFilters) =>
    [...electricTaskKeys.all, 'infinite', filters] as const,
}

/**
 * Enhanced hook for querying tasks with real-time ElectricSQL sync
 */
export function useElectricTasks(
  filters: ElectricTaskFilters = {},
  options: ElectricTaskOptions = {}
) {
  const queryClient = useQueryClient()
  const [realtimeData, setRealtimeData] = useState<ElectricTask[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)

  const {
    realtime = true,
    cacheFirst = true,
    conflictResolution = 'last-write-wins',
    offlineSupport = true,
  } = options

  // Set up real-time subscription
  useEffect(() => {
    if (!realtime) return

    let unsubscribe: (() => void) | null = null

    const setupSubscription = async () => {
      try {
        unsubscribe = await enhancedElectricSyncService.subscribeToTable<ElectricTask>(
          'tasks',
          (tasks) => {
            setRealtimeData(tasks)
            // Update TanStack Query cache
            queryClient.setQueryData(electricTaskKeys.list(filters), tasks)
          },
          {
            userId: filters.userId,
            filters: {
              status: filters.status,
              archived: filters.archived,
              sessionId: filters.sessionId,
            },
            cacheFirst,
            realtime: true,
          }
        )
        setIsSubscribed(true)
      } catch (error) {
        console.error('Failed to set up task subscription:', error)
      }
    }

    setupSubscription()

    return () => {
      if (unsubscribe) {
        unsubscribe()
        setIsSubscribed(false)
      }
    }
  }, [
    realtime,
    filters,
    cacheFirst,
    queryClient,
  ])

  // TanStack Query for fallback and initial data
  const query = useQuery({
    queryKey: electricTaskKeys.list(filters),
    queryFn: async () => {
      const result = await electricDatabaseClient.executeOperation<ElectricTask[]>({
        table: 'tasks',
        operation: 'select',
        where: {
          ...(filters.status && { status: filters.status }),
          ...(filters.archived !== undefined && { archived: filters.archived }),
          ...(filters.sessionId && { sessionId: filters.sessionId }),
        },
        options: {
          userId: filters.userId,
          cache: true,
          realtime: false, // We handle realtime separately
        },
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tasks')
      }

      return result.data || []
    },
    enabled: !(isSubscribed && realtime), // Only query if not subscribed to realtime
    staleTime: realtime ? Number.POSITIVE_INFINITY : 1000 * 60 * 2, // 2 minutes if not realtime
    gcTime: 1000 * 60 * 10, // 10 minutes
  })

  // Use realtime data if available, otherwise fallback to query data
  const data = realtime && realtimeData.length > 0 ? realtimeData : query.data || []

  return {
    tasks: data,
    loading: query.isLoading && !isSubscribed,
    error: query.error,
    isSubscribed,
    isOnline: conflictResolutionService.isOnlineStatus(),
    refetch: query.refetch,
  }
}

/**
 * Enhanced hook for querying a single task with real-time updates
 */
export function useElectricTask(taskId: string, options: ElectricTaskOptions = {}) {
  const queryClient = useQueryClient()
  const [realtimeTask, setRealtimeTask] = useState<ElectricTask | null>(null)

  const { realtime = true, cacheFirst = true } = options

  // Set up real-time subscription for single task
  useEffect(() => {
    if (!(realtime && taskId)) return

    let unsubscribe: (() => void) | null = null

    const setupSubscription = async () => {
      try {
        unsubscribe = await enhancedElectricSyncService.subscribeToTable<ElectricTask>(
          'tasks',
          (tasks) => {
            const task = tasks.find((t) => t.id === taskId)
            if (task) {
              setRealtimeTask(task)
              queryClient.setQueryData(electricTaskKeys.detail(taskId), task)
            }
          },
          {
            filters: { id: taskId },
            cacheFirst,
            realtime: true,
          }
        )
      } catch (error) {
        console.error('Failed to set up task subscription:', error)
      }
    }

    setupSubscription()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [realtime, taskId, cacheFirst, queryClient])

  const query = useQuery({
    queryKey: electricTaskKeys.detail(taskId),
    queryFn: async () => {
      const result = await electricDatabaseClient.executeOperation<ElectricTask[]>({
        table: 'tasks',
        operation: 'select',
        where: { id: taskId },
        options: { cache: true },
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch task')
      }

      return result.data?.[0] || null
    },
    enabled: !!taskId && !(realtime && realtimeTask),
    staleTime: realtime ? Number.POSITIVE_INFINITY : 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })

  return {
    task: realtimeTask || query.data,
    loading: query.isLoading && !realtimeTask,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Enhanced mutation hook for creating tasks with conflict resolution
 */
export function useCreateElectricTask(options: ElectricTaskOptions = {}) {
  const queryClient = useQueryClient()
  const { conflictResolution = 'last-write-wins', offlineSupport = true } = options

  return useMutation({
    mutationFn: async (taskData: CreateElectricTaskInput) => {
      const result = await conflictResolutionService.executeOperationWithConflictResolution(
        {
          table: 'tasks',
          operation: 'insert',
          data: taskData,
          options: {
            userId: taskData.userId,
            realtime: true,
            cache: true,
          },
        },
        {
          conflictStrategy: conflictResolution,
          offlineSupport,
        }
      )

      return result
    },
    onSuccess: (newTask) => {
      if (newTask) {
        // Update individual task cache
        queryClient.setQueryData(electricTaskKeys.detail(newTask.id), newTask)

        // Update task lists
        queryClient.setQueriesData(
          { queryKey: electricTaskKeys.lists() },
          (old: ElectricTask[] | undefined) => {
            if (!old) return [newTask]
            return [newTask, ...old]
          }
        )

        // Invalidate infinite queries
        queryClient.invalidateQueries({ queryKey: electricTaskKeys.all })
      }
    },
    onError: (error) => {
      console.error('Failed to create task:', error)
    },
  })
}

/**
 * Enhanced mutation hook for updating tasks with conflict resolution
 */
export function useUpdateElectricTask(options: ElectricTaskOptions = {}) {
  const queryClient = useQueryClient()
  const { conflictResolution = 'last-write-wins', offlineSupport = true } = options

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateElectricTaskInput }) => {
      const result = await conflictResolutionService.executeOperationWithConflictResolution(
        {
          table: 'tasks',
          operation: 'update',
          data: { ...data, updatedAt: new Date() },
          where: { id },
          options: {
            userId: data.userId,
            realtime: true,
            cache: true,
          },
        },
        {
          conflictStrategy: conflictResolution,
          offlineSupport,
        }
      )

      return result
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: electricTaskKeys.detail(id),
      })

      // Snapshot previous value
      const previousTask = queryClient.getQueryData<ElectricTask>(electricTaskKeys.detail(id))

      // Optimistically update
      if (previousTask) {
        const optimisticTask = {
          ...previousTask,
          ...data,
          updatedAt: new Date(),
        }
        queryClient.setQueryData(electricTaskKeys.detail(id), optimisticTask)
      }

      return { previousTask }
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(electricTaskKeys.detail(id), context.previousTask)
      }
      console.error('Failed to update task:', error)
    },
    onSuccess: (updatedTask, { id }) => {
      if (updatedTask) {
        // Update individual task cache
        queryClient.setQueryData(electricTaskKeys.detail(id), updatedTask)

        // Update task in lists
        queryClient.setQueriesData(
          { queryKey: electricTaskKeys.lists() },
          (old: ElectricTask[] | undefined) => {
            if (!old) return old
            return old.map((task) => (task.id === id ? updatedTask : task))
          }
        )
      }
    },
  })
}

/**
 * Enhanced mutation hook for deleting tasks
 */
export function useDeleteElectricTask(options: ElectricTaskOptions = {}) {
  const queryClient = useQueryClient()
  const { offlineSupport = true } = options

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await conflictResolutionService.executeOperationWithConflictResolution(
        {
          table: 'tasks',
          operation: 'delete',
          where: { id },
          options: {
            realtime: true,
            cache: true,
          },
        },
        {
          offlineSupport,
        }
      )

      return result
    },
    onSuccess: (_, deletedId) => {
      // Remove from individual cache
      queryClient.removeQueries({
        queryKey: electricTaskKeys.detail(deletedId),
      })

      // Remove from lists
      queryClient.setQueriesData(
        { queryKey: electricTaskKeys.lists() },
        (old: ElectricTask[] | undefined) => {
          if (!old) return old
          return old.filter((task) => task.id !== deletedId)
        }
      )

      // Invalidate infinite queries
      queryClient.invalidateQueries({ queryKey: electricTaskKeys.all })
    },
    onError: (error) => {
      console.error('Failed to delete task:', error)
    },
  })
}

/**
 * Hook for offline queue status
 */
export function useOfflineTaskStatus() {
  const [status, setStatus] = useState(conflictResolutionService.getOfflineQueueStatus())

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(conflictResolutionService.getOfflineQueueStatus())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return {
    ...status,
    isOnline: conflictResolutionService.isOnlineStatus(),
    processQueue: useCallback(async () => {
      try {
        return await conflictResolutionService.processOfflineQueue()
      } catch (error) {
        console.error('Failed to process offline queue:', error)
        throw error
      }
    }, []),
  }
}

/**
 * Hook for forcing sync of all tasks
 */
export function useForceTaskSync() {
  const queryClient = useQueryClient()

  return useCallback(
    async (userId?: string) => {
      try {
        await enhancedElectricSyncService.forceSyncTable('tasks', userId)

        // Invalidate all task queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: electricTaskKeys.all })

        console.log('Task sync completed')
      } catch (error) {
        console.error('Failed to force sync tasks:', error)
        throw error
      }
    },
    [queryClient]
  )
}

/**
 * Convenience hooks for common task operations
 */
export function useActiveTasks(userId?: string, options?: ElectricTaskOptions) {
  return useElectricTasks({ archived: false, userId }, options)
}

export function useArchivedTasks(userId?: string, options?: ElectricTaskOptions) {
  return useElectricTasks({ archived: true, userId }, options)
}

export function useTasksByStatus(status: string[], userId?: string, options?: ElectricTaskOptions) {
  return useElectricTasks({ status, userId }, options)
}

export function useTasksBySession(
  sessionId: string,
  userId?: string,
  options?: ElectricTaskOptions
) {
  return useElectricTasks({ sessionId, userId }, options)
}
