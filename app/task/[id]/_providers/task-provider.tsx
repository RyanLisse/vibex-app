'use client'

import { createContext, type ReactNode, useContext } from 'react'
import { TaskNotFound } from '@/app/task/[id]/_components/task-not-found'
import { useOptimizedTaskData } from '@/app/task/[id]/_hooks/use-optimized-task-data'
import { useTaskSubscription } from '@/app/task/[id]/_hooks/use-task-subscription'
import type { StreamingMessage } from '@/app/task/[id]/_types/message-types'
import type { Task } from '@/stores/tasks'
import { useTaskStore } from '@/stores/tasks'

interface TaskContextValue {
  task: Task
  regularMessages: Task['messages']
  shellMessages: Task['messages']
  streamingMessages: Map<string, StreamingMessage>
  hasStreamingMessages: boolean
  isTaskInProgress: boolean
  subscriptionEnabled: boolean
  isInitialized: boolean
  lastError: Error | null
}

const TaskContext = createContext<TaskContextValue | null>(null)

interface TaskProviderProps {
  taskId: string
  children: ReactNode
}

/**
 * TaskProvider manages all task-related state and provides it to child components
 * - Centralizes task state management
 * - Handles task not found scenarios
 * - Provides clean context API for child components
 */
export function TaskProvider({ taskId, children }: TaskProviderProps) {
  const { getTaskById } = useTaskStore()
  const task = getTaskById(taskId)

  const { streamingMessages, subscriptionEnabled, isInitialized, lastError } = useTaskSubscription({
    taskId,
    taskMessages: task?.messages,
  })

  const { regularMessages, shellMessages, hasStreamingMessages, isTaskInProgress } =
    useOptimizedTaskData({
      task,
      streamingMessages,
    })

  // Handle task not found
  if (!task) {
    return <TaskNotFound taskId={taskId} />
  }

  const contextValue: TaskContextValue = {
    task,
    regularMessages,
    shellMessages,
    streamingMessages,
    hasStreamingMessages,
    isTaskInProgress,
    subscriptionEnabled,
    isInitialized,
    lastError,
  }

  return <TaskContext.Provider value={contextValue}>{children}</TaskContext.Provider>
}

/**
 * Custom hook to access task context
 */
export function useTaskContext() {
  const context = useContext(TaskContext)
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider')
  }
  return context
}
