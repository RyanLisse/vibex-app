import { useCallback, useEffect, useMemo } from 'react'
import {
  isStatusData,
  isStatusTopic,
  isTasksChannel,
  isUpdateData,
  isUpdateTopic,
  type LatestData,
} from '@/lib/container-types'
import { MessageHandlers } from '@/lib/message-handlers'
import { useTaskStore } from '@/stores/tasks'

export function useTaskMessageProcessing(latestData: LatestData | null) {
  const { updateTask, getTaskById } = useTaskStore()

  const messageHandlers = useMemo(
    () => new MessageHandlers({ updateTask, getTaskById }),
    [updateTask, getTaskById]
  )

  const processMessage = useCallback(
    (data: LatestData) => {
      if (!isTasksChannel(data)) {
        return
      }

      if (isStatusTopic(data) && isStatusData(data.data)) {
        messageHandlers.handleStatusUpdate(data.data)
      } else if (isUpdateTopic(data) && isUpdateData(data.data)) {
        messageHandlers.handleUpdateMessage(data.data)
      }
    },
    [messageHandlers]
  )

  useEffect(() => {
    if (latestData) {
      processMessage(latestData)
    }
  }, [latestData, processMessage])

  return {
    processMessage,
  }
}
