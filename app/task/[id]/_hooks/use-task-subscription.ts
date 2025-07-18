import { useInngestSubscription } from '@inngest/realtime/hooks'
import { useEffect, useState, useCallback } from 'react'
import { fetchRealtimeSubscriptionToken, type TaskChannelToken } from '@/app/actions/inngest'
import { safeAsync } from '@/lib/stream-utils'
import type { StreamingMessage } from '../_types/message-types'
import { useMessageProcessor } from './use-message-processor'
import { useStatusProcessor } from './use-status-processor'

interface UseTaskSubscriptionProps {
  taskId: string
  taskMessages?: Array<{ role: 'user' | 'assistant'; type: string; data: Record<string, unknown> }>
}

export function useTaskSubscription({ taskId, taskMessages = [] }: UseTaskSubscriptionProps) {
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true)
  const [streamingMessages, setStreamingMessages] = useState<Map<string, StreamingMessage>>(
    new Map()
  )

  const { processMessage } = useMessageProcessor({
    taskId,
    taskMessages,
    streamingMessages,
    setStreamingMessages,
  })

  const { processStatusUpdate } = useStatusProcessor({ taskId })

  const refreshToken = useCallback(async () => {
    const token = await safeAsync(
      () => fetchRealtimeSubscriptionToken(),
      null,
      'Failed to refresh Inngest token:'
    )

    if (!token) {
      console.log('Inngest subscription disabled: No token available')
      setSubscriptionEnabled(false)
      return null as unknown as TaskChannelToken
    }

    return token
  }, [])

  // Error handling temporarily disabled - removed from subscription config
  // const handleError = useCallback((error: unknown) => {
  //   console.error('Inngest subscription error:', error)
  //   if (
  //     (error as Error)?.message?.includes('ReadableStream') ||
  //     (error as Error)?.message?.includes('WebSocket')
  //   ) {
  //     console.warn('Stream/WebSocket error, will retry connection')
  //   } else {
  //     setSubscriptionEnabled(false)
  //   }
  // }, [])

  // const handleClose = useCallback(() => {
  //   console.log('Inngest subscription closed')
  //   setTimeout(() => {
  //     if (subscriptionEnabled) {
  //       console.log('Attempting to reconnect Inngest subscription')
  //     }
  //   }, 1000)
  // }, [subscriptionEnabled])

  const subscriptionResult = useInngestSubscription({
    refreshToken,
    bufferInterval: 0,
    enabled: subscriptionEnabled,
  })

  const { latestData } = subscriptionResult
  const disconnect = (subscriptionResult as { disconnect?: () => void })?.disconnect

  useEffect(() => {
    if (latestData?.channel !== 'tasks') return

    if (latestData.topic === 'status') {
      processStatusUpdate(latestData.data)
    } else if (latestData.topic === 'update') {
      const data = latestData.data as { taskId: string; message: unknown }
      if (data.taskId === taskId && data.message) {
        processMessage(data.message)
      }
    }
  }, [latestData, taskId, processStatusUpdate, processMessage])

  useEffect(() => {
    return () => {
      setSubscriptionEnabled(false)
      if (disconnect) {
        safeAsync(() => disconnect(), undefined, 'Error disconnecting Inngest subscription:')
      }
    }
  }, [disconnect])

  return {
    streamingMessages,
    subscriptionEnabled,
  }
}
