/**
 * Migration Hook
 *
 * Provides a smooth transition from Zustand stores to TanStack Query hooks
 * with backward compatibility and progressive enhancement
 */

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTaskStore } from '@/stores/tasks'
import { useEnvironmentStore } from '@/stores/environments'
import { useTasks, useEnvironments, taskKeys, environmentKeys } from './index'

interface MigrationStatus {
  isUsingDatabase: boolean
  isLoading: boolean
  error: string | null
  hasLocalData: boolean
  migrationCompleted: boolean
}

/**
 * Hook to manage migration from localStorage/Zustand to database/TanStack Query
 */
export function useMigration() {
  const [status, setStatus] = useState<MigrationStatus>({
    isUsingDatabase: false,
    isLoading: true,
    error: null,
    hasLocalData: false,
    migrationCompleted: false,
  })

  const queryClient = useQueryClient()

  // Check if we have local data
  useEffect(() => {
    const checkLocalData = () => {
      try {
        const taskData = localStorage.getItem('task-store')
        const envData = localStorage.getItem('environments')

        const hasTaskData = taskData && JSON.parse(taskData)?.state?.tasks?.length > 0
        const hasEnvData = envData && JSON.parse(envData)?.state?.environments?.length > 0

        setStatus((prev) => ({
          ...prev,
          hasLocalData: Boolean(hasTaskData || hasEnvData),
          isLoading: false,
        }))
      } catch (error) {
        setStatus((prev) => ({
          ...prev,
          error: 'Failed to check local data',
          isLoading: false,
        }))
      }
    }

    checkLocalData()
  }, [])

  // Migration mutation
  const migrationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Migration failed')
      }

      return response.json()
    },
    onSuccess: () => {
      setStatus((prev) => ({
        ...prev,
        isUsingDatabase: true,
        migrationCompleted: true,
        error: null,
      }))

      // Invalidate all queries to refetch from database
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      queryClient.invalidateQueries({ queryKey: environmentKeys.all })
    },
    onError: (error: Error) => {
      setStatus((prev) => ({
        ...prev,
        error: error.message,
      }))
    },
  })

  const startMigration = () => {
    migrationMutation.mutate()
  }

  return {
    status,
    startMigration,
    isMigrating: migrationMutation.isPending,
    migrationError: migrationMutation.error?.message || status.error,
  }
}

/**
 * Hook that provides unified task data from either Zustand or TanStack Query
 * depending on migration status
 */
export function useUnifiedTasks() {
  const { status } = useMigration()

  // TanStack Query hooks
  const queryTasks = useTasks()

  // Zustand store hooks
  const zustandTasks = useTaskStore((state) => state.tasks)
  const zustandActions = useTaskStore((state) => ({
    addTask: state.addTask,
    updateTask: state.updateTask,
    removeTask: state.removeTask,
    archiveTask: state.archiveTask,
    unarchiveTask: state.unarchiveTask,
  }))

  // Return appropriate data source based on migration status
  if (status.isUsingDatabase || status.migrationCompleted) {
    return {
      tasks: queryTasks.data?.tasks || [],
      isLoading: queryTasks.isLoading,
      error: queryTasks.error?.message,
      // Note: Actions would come from TanStack Query mutations
      // This is a simplified example - you'd use the mutation hooks
      actions: {
        addTask: () => console.warn('Use useCreateTask hook instead'),
        updateTask: () => console.warn('Use useUpdateTask hook instead'),
        removeTask: () => console.warn('Use useDeleteTask hook instead'),
        archiveTask: () => console.warn('Use useArchiveTask hook instead'),
        unarchiveTask: () => console.warn('Use useUnarchiveTask hook instead'),
      },
      source: 'database' as const,
    }
  }

  return {
    tasks: zustandTasks,
    isLoading: false,
    error: null,
    actions: zustandActions,
    source: 'localStorage' as const,
  }
}

/**
 * Hook that provides unified environment data from either Zustand or TanStack Query
 */
export function useUnifiedEnvironments() {
  const { status } = useMigration()

  // TanStack Query hooks
  const queryEnvironments = useEnvironments()

  // Zustand store hooks
  const zustandEnvironments = useEnvironmentStore((state) => state.environments)
  const zustandActions = useEnvironmentStore((state) => ({
    createEnvironment: state.createEnvironment,
    updateEnvironment: state.updateEnvironment,
    deleteEnvironment: state.deleteEnvironment,
  }))

  // Return appropriate data source based on migration status
  if (status.isUsingDatabase || status.migrationCompleted) {
    return {
      environments: queryEnvironments.data?.environments || [],
      isLoading: queryEnvironments.isLoading,
      error: queryEnvironments.error?.message,
      actions: {
        createEnvironment: () => console.warn('Use useCreateEnvironment hook instead'),
        updateEnvironment: () => console.warn('Use useUpdateEnvironment hook instead'),
        deleteEnvironment: () => console.warn('Use useDeleteEnvironment hook instead'),
      },
      source: 'database' as const,
    }
  }

  return {
    environments: zustandEnvironments,
    isLoading: false,
    error: null,
    actions: zustandActions,
    source: 'localStorage' as const,
  }
}

/**
 * Hook to check if the app should use database or localStorage
 */
export function useDataSource() {
  const { status } = useMigration()

  return {
    useDatabase: status.isUsingDatabase || status.migrationCompleted,
    useLocalStorage: !status.isUsingDatabase && !status.migrationCompleted,
    isTransitioning: status.isLoading,
    hasLocalData: status.hasLocalData,
    migrationNeeded: status.hasLocalData && !status.migrationCompleted,
  }
}

/**
 * Development helper to reset migration state
 */
export function useResetMigration() {
  const queryClient = useQueryClient()

  return () => {
    if (process.env.NODE_ENV === 'development') {
      // Clear all query cache
      queryClient.clear()

      // Reset localStorage migration flags
      localStorage.removeItem('migration-completed')

      // Reload the page to reset state
      window.location.reload()
    }
  }
}

/**
 * Hook to prefetch data for smooth transitions
 */
export function usePrefetchData() {
  const queryClient = useQueryClient()

  const prefetchTasks = () => {
    queryClient.prefetchQuery({
      queryKey: taskKeys.lists(),
      queryFn: () => fetch('/api/tasks').then((res) => res.json()),
      staleTime: 1000 * 60 * 5, // 5 minutes
    })
  }

  const prefetchEnvironments = () => {
    queryClient.prefetchQuery({
      queryKey: environmentKeys.lists(),
      queryFn: () => fetch('/api/environments').then((res) => res.json()),
      staleTime: 1000 * 60 * 5, // 5 minutes
    })
  }

  return {
    prefetchTasks,
    prefetchEnvironments,
    prefetchAll: () => {
      prefetchTasks()
      prefetchEnvironments()
    },
  }
}
