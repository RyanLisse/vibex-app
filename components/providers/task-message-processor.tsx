'use client'
import { type ReactNode, useCallback, useEffect } from 'react'
import { useRealtime } from '@/components/providers/realtime-provider'
import { useMessageFilters } from '@/hooks/use-message-filters'
import { useTaskMessageHandler } from '@/hooks/use-task-message-handler'
import type { LatestData } from '@/lib/container-types'

interface TaskMessageProcessorProps {
  children: ReactNode
}

export function TaskMessageProcessor({ children }: TaskMessageProcessorProps) {
  const { latestData } = useRealtime()
  const messageHandler = useTaskMessageHandler()
  const { isValidMessage, getMessageType } = useMessageFilters()

  const processMessage = useCallback(
    (data: LatestData) => {
      if (!isValidMessage(data)) {
        return
      }

      const messageType = getMessageType(data)
      messageHandler.handleMessage(data, messageType)
    },
    [isValidMessage, getMessageType, messageHandler]
  )

  useEffect(() => {
    if (latestData) {
      processMessage(latestData)
    }
  }, [latestData, processMessage])

  return <>{children}</>
}
