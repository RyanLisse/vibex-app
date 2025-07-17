import { useInngestSubscription } from '@inngest/realtime/hooks'
import { useEffect, useState } from 'react'
import { fetchRealtimeSubscriptionToken } from '@/app/actions/inngest'
import { useTaskStore } from '@/stores/tasks'
import { IncomingMessage, type StreamingMessage } from '../_types/message-types'
import {
  isCompletedStreamMessage,
  isStreamingMessage,
  isValidIncomingMessage,
} from '../_utils/message-guards'

interface UseTaskSubscriptionProps {
  taskId: string
  taskMessages?: any[]
}

export function useTaskSubscription({ taskId, taskMessages = [] }: UseTaskSubscriptionProps) {
  const { updateTask } = useTaskStore()
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true)
  const [streamingMessages, setStreamingMessages] = useState<Map<string, StreamingMessage>>(
    new Map()
  )

  const { latestData, disconnect } = useInngestSubscription({
    refreshToken: async () => {
      try {
        const token = await fetchRealtimeSubscriptionToken()
        if (!token) {
          console.log('Inngest subscription disabled: No token available')
          setSubscriptionEnabled(false)
          return null as any
        }
        return token
      } catch (error) {
        console.error('Failed to refresh Inngest token:', error)
        setSubscriptionEnabled(false)
        return null as any
      }
    },
    bufferInterval: 0,
    enabled: subscriptionEnabled,
    onError: (error) => {
      console.error('Inngest subscription error:', error)
      setSubscriptionEnabled(false)
    },
    onClose: () => {
      console.log('Inngest subscription closed')
    },
  })

  useEffect(() => {
    if (latestData?.channel === 'tasks' && latestData.topic === 'update') {
      const { taskId: dataTaskId, message } = latestData.data

      if (dataTaskId === taskId && message && isValidIncomingMessage(message)) {
        // Handle streaming messages
        if (isStreamingMessage(message)) {
          const streamId = message.data.streamId

          setStreamingMessages((prev) => {
            const newMap = new Map(prev)
            const existingMessage = newMap.get(streamId)

            if (existingMessage) {
              // Append to existing streaming message
              newMap.set(streamId, {
                ...existingMessage,
                data: {
                  ...existingMessage.data,
                  text: (existingMessage.data.text || '') + (message.data.text || ''),
                  chunkIndex: message.data.chunkIndex,
                  totalChunks: message.data.totalChunks,
                },
              })
            } else {
              // New streaming message
              newMap.set(streamId, message as StreamingMessage)
            }

            return newMap
          })
        } else if (isCompletedStreamMessage(message)) {
          // Stream ended, move to regular messages
          const streamId = message.data.streamId
          const streamingMessage = streamingMessages.get(streamId)

          if (streamingMessage) {
            updateTask(taskId, {
              messages: [
                ...taskMessages,
                {
                  ...streamingMessage,
                  data: {
                    ...streamingMessage.data,
                    text: message.data.text || streamingMessage.data.text,
                    isStreaming: false,
                  },
                },
              ],
            })

            setStreamingMessages((prev) => {
              const newMap = new Map(prev)
              newMap.delete(streamId)
              return newMap
            })
          }
        } else {
          // Regular non-streaming message
          updateTask(taskId, {
            messages: [...taskMessages, message],
          })
        }
      }
    }
  }, [latestData, taskId, taskMessages, streamingMessages, updateTask])

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      setSubscriptionEnabled(false)
      // Properly disconnect the subscription to avoid stream cancellation errors
      if (disconnect) {
        try {
          disconnect()
        } catch (error) {
          console.warn('Error disconnecting Inngest subscription:', error)
        }
      }
    }
  }, [disconnect])

  return {
    streamingMessages,
    subscriptionEnabled,
  }
}
