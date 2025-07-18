import { memo } from 'react'
import type { Task } from '@/stores/tasks'
import type { StreamingMessage } from '../_types/message-types'
import {
  getMessageKey,
  getMessageText,
  getRepositoryUrl,
  getStreamProgress,
} from '../_utils/message-utils'
import { ChatMessage } from './chat-message'
import { InitialTaskMessage } from './initial-task-message'

interface ChatMessagesPanelProps {
  task: Task
  regularMessages: Task['messages']
  streamingMessages: Map<string, StreamingMessage>
}

export const ChatMessagesPanel = memo(function ChatMessagesPanel({
  task,
  regularMessages,
  streamingMessages,
}: ChatMessagesPanelProps) {
  const repoUrl = getRepositoryUrl(task.repository)

  return (
    <>
      {/* Initial Task Message */}
      <InitialTaskMessage title={task.title} />

      {/* Regular Messages */}
      {regularMessages.map((message, index) => (
        <ChatMessage
          branch={task.branch}
          key={getMessageKey(message, index)}
          repoUrl={repoUrl}
          role={message.role}
          text={getMessageText(message.data)}
        />
      ))}

      {/* Streaming Messages */}
      {Array.from(streamingMessages.values()).map((message) => (
        <ChatMessage
          branch={task.branch}
          isStreaming={true}
          key={message.data.streamId as string}
          repoUrl={repoUrl}
          role={message.role}
          streamProgress={getStreamProgress(message)}
          text={getMessageText(message.data)}
        />
      ))}
    </>
  )
})
