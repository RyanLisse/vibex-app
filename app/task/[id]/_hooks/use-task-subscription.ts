import { useInngestSubscription } from '@inngest/realtime/hooks'
import { useEffect, useState } from 'react'
import { fetchRealtimeSubscriptionToken, type TaskChannelToken } from '@/app/actions/inngest'
import { safeAsync } from '@/lib/stream-utils'
import { useTaskStore } from '@/stores/tasks'
import type { StreamingMessage } from '../_types/message-types'
import {
  isCompletedStreamMessage,
  isStreamingMessage,
  isValidIncomingMessage,
} from '../_utils/message-guards'

interface UseTaskSubscriptionProps {
  taskId: string
  taskMessages?: unknown[]
}

export function useTaskSubscription({ taskId, taskMessages = [] }: UseTaskSubscriptionProps) {
  const { updateTask, pauseTask, resumeTask, cancelTask } = useTaskStore()
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true)
  const [streamingMessages, setStreamingMessages] = useState<Map<string, StreamingMessage>>(
    new Map()
  )

  const { latestData, disconnect } = useInngestSubscription({
    refreshToken: async () => {
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
    },
    bufferInterval: 0,
    enabled: subscriptionEnabled,
    onError: (error) => {
      console.error('Inngest subscription error:', error)
      // Don't disable subscription immediately for stream errors
      if (error?.message?.includes('ReadableStream') || error?.message?.includes('WebSocket')) {
        console.warn('Stream/WebSocket error, will retry connection')
      } else {
        setSubscriptionEnabled(false)
      }
    },
    onClose: () => {
      console.log('Inngest subscription closed')
      // Add a small delay before potentially reconnecting
      setTimeout(() => {
        if (subscriptionEnabled) {
          console.log('Attempting to reconnect Inngest subscription')
        }
      }, 1000)
    },
  })

  useEffect(() => {
    if (latestData?.channel === 'tasks') {
      if (latestData.topic === 'status') {
        const { taskId: dataTaskId, status } = latestData.data

        if (dataTaskId === taskId) {
          // Handle status updates (including pause/resume/cancel)
          switch (status) {
            case 'PAUSED':
              pauseTask(taskId)
              break
            case 'IN_PROGRESS':
              resumeTask(taskId)
              break
            case 'CANCELLED':
              cancelTask(taskId)
              break
            case 'DONE':
            case 'MERGED':
              updateTask(taskId, { status })
              break
          }
        }
      } else if (latestData.topic === 'update') {
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
    }
  }, [
    latestData,
    taskId,
    taskMessages,
    streamingMessages,
    updateTask,
    pauseTask,
    resumeTask,
    cancelTask,
  ])

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      setSubscriptionEnabled(false)
      // Properly disconnect the subscription to avoid stream cancellation errors
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
