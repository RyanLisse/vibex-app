import { useCallback, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  isStatusData,
  isStatusTopic,
  isTasksChannel,
  isUpdateData,
  isUpdateTopic,
  type LatestData,
} from '@/lib/container-types'
import { MessageHandlers } from '@/lib/message-handlers'
import { useUpdateTask, useTask, taskKeys } from '@/lib/query/hooks'
import type { Task } from '@/db/schema'

export function useTaskMessageProcessing(latestData: LatestData | null) {
  const updateTaskMutation = useUpdateTask()
  const queryClient = useQueryClient()

  // Create adapter functions to bridge TanStack Query with MessageHandlers interface
  const updateTaskAdapter = useCallback((id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    updateTaskMutation.mutate({ id, ...updates })
  }, [updateTaskMutation])

  const getTaskByIdAdapter = useCallback((id: string): Task | undefined => {
    return queryClient.getQueryData(taskKeys.detail(id))
  }, [queryClient])

  const messageHandlers = useMemo(
    () => new MessageHandlers({
      updateTask: updateTaskAdapter,
      getTaskById: getTaskByIdAdapter
    }),
    [updateTaskAdapter, getTaskByIdAdapter]
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
