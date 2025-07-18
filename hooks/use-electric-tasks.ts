'use client'

import { useCallback, useMemo } from 'react'
import { useElectricQuery, useElectricSubscription } from './use-electric'
import type { Task, NewTask } from '@/db/schema'

// Hook for managing tasks with real-time sync
export function useElectricTasks(userId?: string) {
  // Query for user's tasks
  const tasksQuery = useMemo(() => {
    if (!userId) return 'SELECT * FROM tasks ORDER BY created_at DESC'
    return 'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC'
  }, [userId])

  const tasksParams = useMemo(() => {
    return userId ? [userId] : []
  }, [userId])

  // Get tasks with real-time updates
  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useElectricQuery<Task>(tasksQuery, tasksParams, {
    enabled: true,
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  })

  // Subscribe to real-time task updates
  const subscriptionFilter = userId ? `user_id = '${userId}'` : undefined
  
  const {
    data: realtimeTasks,
    loading: subscriptionLoading,
    error: subscriptionError,
  } = useElectricSubscription<Task>('tasks', subscriptionFilter, {
    enabled: true,
    onInsert: (task) => {
      console.log('New task created:', task.title)
    },
    onUpdate: (task) => {
      console.log('Task updated:', task.title)
    },
    onDelete: (task) => {
      console.log('Task deleted:', task.title)
    },
  })

  // Use subscription data if available, otherwise use query data
  const finalTasks = realtimeTasks.length > 0 ? realtimeTasks : tasks

  // Create a new task
  const createTask = useCallback(async (taskData: Omit<NewTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    // This would use the Electric client to insert data
    // For now, we'll simulate the operation
    const newTask: NewTask = {
      ...taskData,
      userId: userId || taskData.userId,
    }

    // In a real implementation, this would use Electric's insert method
    console.log('Creating task:', newTask)
    
    // Refetch to get updated data
    await refetchTasks()
    
    return newTask
  }, [userId, refetchTasks])

  // Update a task
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    // This would use the Electric client to update data
    console.log('Updating task:', taskId, updates)
    
    // Refetch to get updated data
    await refetchTasks()
  }, [refetchTasks])

  // Delete a task
  const deleteTask = useCallback(async (taskId: string) => {
    // This would use the Electric client to delete data
    console.log('Deleting task:', taskId)
    
    // Refetch to get updated data
    await refetchTasks()
  }, [refetchTasks])

  // Get tasks by status
  const getTasksByStatus = useCallback((status: string) => {
    return finalTasks.filter(task => task.status === status)
  }, [finalTasks])

  // Get tasks by priority
  const getTasksByPriority = useCallback((priority: string) => {
    return finalTasks.filter(task => task.priority === priority)
  }, [finalTasks])

  // Search tasks
  const searchTasks = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase()
    return finalTasks.filter(task => 
      task.title.toLowerCase().includes(lowercaseQuery) ||
      task.description?.toLowerCase().includes(lowercaseQuery)
    )
  }, [finalTasks])

  // Get task statistics
  const taskStats = useMemo(() => {
    const stats = {
      total: finalTasks.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      byPriority: {
        high: 0,
        medium: 0,
        low: 0,
      },
    }

    finalTasks.forEach(task => {
      // Count by status
      switch (task.status) {
        case 'pending':
          stats.pending++
          break
        case 'in_progress':
          stats.inProgress++
          break
        case 'completed':
          stats.completed++
          break
        case 'cancelled':
          stats.cancelled++
          break
      }

      // Count by priority
      switch (task.priority) {
        case 'high':
          stats.byPriority.high++
          break
        case 'medium':
          stats.byPriority.medium++
          break
        case 'low':
          stats.byPriority.low++
          break
      }
    })

    return stats
  }, [finalTasks])

  return {
    // Data
    tasks: finalTasks,
    taskStats,
    
    // Loading states
    loading: tasksLoading || subscriptionLoading,
    error: tasksError || subscriptionError,
    
    // Actions
    createTask,
    updateTask,
    deleteTask,
    refetch: refetchTasks,
    
    // Utilities
    getTasksByStatus,
    getTasksByPriority,
    searchTasks,
  }
}

// Hook for managing task executions with real-time sync
export function useElectricTaskExecutions(taskId?: string) {
  // Query for task executions
  const executionsQuery = useMemo(() => {
    if (!taskId) return 'SELECT * FROM agent_executions ORDER BY started_at DESC'
    return 'SELECT * FROM agent_executions WHERE task_id = $1 ORDER BY started_at DESC'
  }, [taskId])

  const executionsParams = useMemo(() => {
    return taskId ? [taskId] : []
  }, [taskId])

  // Get executions with real-time updates
  const {
    data: executions,
    loading: executionsLoading,
    error: executionsError,
    refetch: refetchExecutions,
  } = useElectricQuery(executionsQuery, executionsParams, {
    enabled: true,
  })

  // Subscribe to real-time execution updates
  const subscriptionFilter = taskId ? `task_id = '${taskId}'` : undefined
  
  const {
    data: realtimeExecutions,
    loading: subscriptionLoading,
    error: subscriptionError,
  } = useElectricSubscription('agent_executions', subscriptionFilter, {
    enabled: true,
    onInsert: (execution) => {
      console.log('New execution started:', execution.agentType)
    },
    onUpdate: (execution) => {
      console.log('Execution updated:', execution.agentType, execution.status)
    },
  })

  // Use subscription data if available, otherwise use query data
  const finalExecutions = realtimeExecutions.length > 0 ? realtimeExecutions : executions

  // Get execution statistics
  const executionStats = useMemo(() => {
    const stats = {
      total: finalExecutions.length,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      averageExecutionTime: 0,
      byAgentType: {} as Record<string, number>,
    }

    let totalExecutionTime = 0
    let completedCount = 0

    finalExecutions.forEach(execution => {
      // Count by status
      switch (execution.status) {
        case 'running':
          stats.running++
          break
        case 'completed':
          stats.completed++
          completedCount++
          if (execution.executionTimeMs) {
            totalExecutionTime += execution.executionTimeMs
          }
          break
        case 'failed':
          stats.failed++
          break
        case 'cancelled':
          stats.cancelled++
          break
      }

      // Count by agent type
      stats.byAgentType[execution.agentType] = (stats.byAgentType[execution.agentType] || 0) + 1
    })

    // Calculate average execution time
    if (completedCount > 0) {
      stats.averageExecutionTime = Math.round(totalExecutionTime / completedCount)
    }

    return stats
  }, [finalExecutions])

  return {
    // Data
    executions: finalExecutions,
    executionStats,
    
    // Loading states
    loading: executionsLoading || subscriptionLoading,
    error: executionsError || subscriptionError,
    
    // Actions
    refetch: refetchExecutions,
  }
}

// Hook for managing environments with real-time sync
export function useElectricEnvironments(userId?: string) {
  // Query for user's environments
  const environmentsQuery = useMemo(() => {
    if (!userId) return 'SELECT * FROM environments ORDER BY created_at DESC'
    return 'SELECT * FROM environments WHERE user_id = $1 ORDER BY created_at DESC'
  }, [userId])

  const environmentsParams = useMemo(() => {
    return userId ? [userId] : []
  }, [userId])

  // Get environments with real-time updates
  const {
    data: environments,
    loading: environmentsLoading,
    error: environmentsError,
    refetch: refetchEnvironments,
  } = useElectricQuery(environmentsQuery, environmentsParams, {
    enabled: true,
  })

  // Subscribe to real-time environment updates
  const subscriptionFilter = userId ? `user_id = '${userId}'` : undefined
  
  const {
    data: realtimeEnvironments,
    loading: subscriptionLoading,
    error: subscriptionError,
  } = useElectricSubscription('environments', subscriptionFilter, {
    enabled: true,
    onInsert: (environment) => {
      console.log('New environment created:', environment.name)
    },
    onUpdate: (environment) => {
      console.log('Environment updated:', environment.name)
    },
    onDelete: (environment) => {
      console.log('Environment deleted:', environment.name)
    },
  })

  // Use subscription data if available, otherwise use query data
  const finalEnvironments = realtimeEnvironments.length > 0 ? realtimeEnvironments : environments

  // Get active environment
  const activeEnvironment = useMemo(() => {
    return finalEnvironments.find(env => env.isActive)
  }, [finalEnvironments])

  // Create a new environment
  const createEnvironment = useCallback(async (environmentData: any) => {
    // This would use the Electric client to insert data
    console.log('Creating environment:', environmentData)
    
    // Refetch to get updated data
    await refetchEnvironments()
  }, [refetchEnvironments])

  // Update an environment
  const updateEnvironment = useCallback(async (environmentId: string, updates: any) => {
    // This would use the Electric client to update data
    console.log('Updating environment:', environmentId, updates)
    
    // Refetch to get updated data
    await refetchEnvironments()
  }, [refetchEnvironments])

  // Delete an environment
  const deleteEnvironment = useCallback(async (environmentId: string) => {
    // This would use the Electric client to delete data
    console.log('Deleting environment:', environmentId)
    
    // Refetch to get updated data
    await refetchEnvironments()
  }, [refetchEnvironments])

  // Activate an environment
  const activateEnvironment = useCallback(async (environmentId: string) => {
    // Deactivate all environments first, then activate the selected one
    console.log('Activating environment:', environmentId)
    
    // Refetch to get updated data
    await refetchEnvironments()
  }, [refetchEnvironments])

  return {
    // Data
    environments: finalEnvironments,
    activeEnvironment,
    
    // Loading states
    loading: environmentsLoading || subscriptionLoading,
    error: environmentsError || subscriptionError,
    
    // Actions
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    activateEnvironment,
    refetch: refetchEnvironments,
  }
}
