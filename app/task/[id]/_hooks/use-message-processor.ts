import { useCallback } from 'react'
import { useTaskStore } from '@/stores/tasks'
import type { StreamingMessage } from '../_types/message-types'
import {
  isCompletedStreamMessage,
  isStreamingMessage,
  isValidIncomingMessage,
} from '../_utils/message-guards'

interface UseMessageProcessorProps {
  taskId: string
  taskMessages: unknown[]
  streamingMessages: Map<string, StreamingMessage>
  setStreamingMessages: React.Dispatch<React.SetStateAction<Map<string, StreamingMessage>>>
}

export function useMessageProcessor({
  taskId,
  taskMessages,
  streamingMessages,
  setStreamingMessages,
}: UseMessageProcessorProps) {
  const { updateTask } = useTaskStore()

  const processStreamingMessage = useCallback(
    (message: IncomingMessage & { data: { isStreaming: true; streamId: string } }) => {
      const streamId = message.data.streamId

      setStreamingMessages((prev) => {
        const newMap = new Map(prev)
        const existingMessage = newMap.get(streamId)

        if (existingMessage) {
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
          newMap.set(streamId, message as StreamingMessage)
        }

        return newMap
      })
    },
    [setStreamingMessages]
  )

  const processCompletedStream = useCallback(
    (message: IncomingMessage & { data: { streamId: string; isStreaming: false } }) => {
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
    },
    [taskId, taskMessages, streamingMessages, updateTask, setStreamingMessages]
  )

  const processRegularMessage = useCallback(
    (message: IncomingMessage) => {
      updateTask(taskId, {
        messages: [...taskMessages, message],
      })
    },
    [taskId, taskMessages, updateTask]
  )

  const processMessage = useCallback(
    (message: unknown) => {
      if (!isValidIncomingMessage(message)) return

      if (isStreamingMessage(message)) {
        processStreamingMessage(message)
      } else if (isCompletedStreamMessage(message)) {
        processCompletedStream(message)
      } else {
        processRegularMessage(message)
      }
    },
    [processStreamingMessage, processCompletedStream, processRegularMessage]
  )

  return { processMessage }
}
