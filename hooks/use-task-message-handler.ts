import { useCallback, useMemo } from 'react'
import type { LatestData } from '@/lib/container-types'
import { MessageHandlers } from '@/lib/message-handlers'
import { useTaskStore } from '@/stores/tasks'

export type MessageType = 'status' | 'update' | 'unknown'

export interface UseTaskMessageHandlerReturn {
  handleMessage: (data: LatestData, type: MessageType) => void
}

export function useTaskMessageHandler(): UseTaskMessageHandlerReturn {
  const { updateTask, getTaskById } = useTaskStore()

  const messageHandlers = useMemo(
    () => new MessageHandlers({ updateTask, getTaskById }),
    [updateTask, getTaskById]
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
