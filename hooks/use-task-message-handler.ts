import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { Task } from '@/db/schema'
import type { LatestData } from '@/lib/container-types'
import { MessageHandlers } from '@/lib/message-handlers'
import { taskKeys, useUpdateTask } from '@/lib/query/hooks'

export type MessageType = 'status' | 'update' | 'unknown'

export interface UseTaskMessageHandlerReturn {
  handleMessage: (data: LatestData, type: MessageType) => void
}

export function useTaskMessageHandler(): UseTaskMessageHandlerReturn {
  const updateTaskMutation = useUpdateTask()
  const queryClient = useQueryClient()

  // Create adapter functions to bridge TanStack Query with MessageHandlers interface
  const updateTaskAdapter = useCallback(
    (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
      updateTaskMutation.mutate({ id, ...updates })
    },
    [updateTaskMutation]
  )

  const getTaskByIdAdapter = useCallback(
    (id: string): Task | undefined => {
      return queryClient.getQueryData(taskKeys.detail(id))
    },
    [queryClient]
  )

  const messageHandlers = useMemo(
    () =>
      new MessageHandlers({
        updateTask: updateTaskAdapter,
        getTaskById: getTaskByIdAdapter,
      }),
    [updateTaskAdapter, getTaskByIdAdapter]
  )

  const handleMessage = useCallback(
    (data: LatestData, type: MessageType) => {
      switch (type) {
        case 'status':
          if ('status' in data.data && 'sessionId' in data.data) {
            messageHandlers.handleStatusUpdate(data.data)
          }
          break
        case 'update':
          if ('message' in data.data) {
            messageHandlers.handleUpdateMessage(data.data)
          }
          break
        case 'unknown':
          break
      }
    },
    [messageHandlers]
  )

  return {
    handleMessage,
  }
}
