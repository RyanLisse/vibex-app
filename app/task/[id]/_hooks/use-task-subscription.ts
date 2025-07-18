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
  // Start with subscription disabled by default to prevent errors
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false)
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

  // Check if Inngest is available on mount
  useEffect(() => {
    const checkInngest = async () => {
      try {
        const response = await fetch('/api/test-inngest')
        const data = await response.json()
        if (data.status === 'ok' && data.config.isDev) {
          console.log('Inngest is configured, enabling subscription...')
          setSubscriptionEnabled(true)
        } else {
          console.log('Inngest not properly configured, subscription disabled')
        }
      } catch (error) {
        console.log('Failed to check Inngest status:', error)
      }
    }
    
    checkInngest()
  }, [])

  const refreshToken = useCallback(async () => {
    console.log('Attempting to refresh Inngest subscription token...')
    const token = await safeAsync(
      () => fetchRealtimeSubscriptionToken(),
      null,
      'Failed to refresh Inngest token:'
    )

    if (!token) {
      console.log('Inngest subscription disabled: No token available')
      console.log('Make sure Inngest dev server is running with: bunx inngest-cli@latest dev')
      setSubscriptionEnabled(false)
      return null as unknown as TaskChannelToken
    }

    console.log('Inngest subscription token received successfully')
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
