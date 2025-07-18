import { useEffect, useMemo, useRef } from 'react'
import type { StreamingMessage } from '@/app/task/[id]/_types/message-types'
import type { Task } from '@/stores/tasks'
import { useTaskStore } from '@/stores/tasks'
import {
  filterChatMessages,
  filterShellMessages,
  hasStreamingMessages,
  isTaskInProgress,
} from '../_utils/message-utils'

interface UseOptimizedTaskDataProps {
  task: Task | undefined
  streamingMessages: Map<string, StreamingMessage>
}

interface UseOptimizedTaskDataReturn {
  regularMessages: Task['messages']
  shellMessages: Task['messages']
  hasStreamingMessages: boolean
  isTaskInProgress: boolean
}

/**
 * Optimized task data hook with improved performance
 * - Reduces unnecessary re-renders with shallow comparison
 * - Memoizes expensive computations
 * - Handles task state updates efficiently
 */
export function useOptimizedTaskData({
  task,
  streamingMessages,
}: UseOptimizedTaskDataProps): UseOptimizedTaskDataReturn {
  const { updateTask } = useTaskStore()
  const previousTaskId = useRef<string | null>(null)
  const isFirstRender = useRef(true)

  // Mark task as viewed when component mounts or task changes
  useEffect(() => {
    if (task && (task.id !== previousTaskId.current || isFirstRender.current)) {
      updateTask(task.id, { hasChanges: false })
      previousTaskId.current = task.id
      isFirstRender.current = false
    }
  }, [task?.id, updateTask])

  // Memoize filtered messages with stable references
  const regularMessages = useMemo(() => {
    if (!task?.messages) {
      return []
    }
    return filterChatMessages(task.messages)
  }, [task?.messages])

  const shellMessages = useMemo(() => {
    if (!task?.messages) {
      return []
    }
    return filterShellMessages(task.messages)
  }, [task?.messages])

  // Memoize streaming state checks
  const hasStreamingMessagesValue = useMemo(() => {
    return hasStreamingMessages(streamingMessages)
  }, [streamingMessages])

  const isTaskInProgressValue = useMemo(() => {
    return task ? isTaskInProgress(task) : false
  }, [task?.status])

  return {
    regularMessages,
    shellMessages,
    hasStreamingMessages: hasStreamingMessagesValue,
    isTaskInProgress: isTaskInProgressValue,
  }
}
