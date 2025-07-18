import type { StreamingMessage, StreamProgress } from '@/app/task/[id]/_types/task-types'
import type { Task } from '@/stores/tasks'

/**
 * Generates a unique key for a message in the chat
 */
export function getMessageKey(message: Task['messages'][0], index: number): string {
  const messageId = (message.data as { id?: string })?.id
  return messageId || `message-${index}-${message.role}`
}

/**
 * Extracts stream progress information from a streaming message
 */
export function getStreamProgress(message: StreamingMessage): StreamProgress | undefined {
  if (message.data.chunkIndex !== undefined && message.data.totalChunks !== undefined) {
    return {
      chunkIndex: message.data.chunkIndex,
      totalChunks: message.data.totalChunks,
    }
  }
  return
}

/**
 * Filters messages to only include chat messages (user and assistant messages)
 */
export function filterChatMessages(messages: Task['messages']): Task['messages'] {
  return messages.filter(
    (message) =>
      (message.role === 'assistant' || message.role === 'user') && message.type === 'message'
  )
}

/**
 * Filters messages to only include shell call messages
 */
export function filterShellMessages(messages: Task['messages']): Task['messages'] {
  return messages.filter((message) => message.type === 'local_shell_call')
}

/**
 * Finds the output message for a given shell call ID
 */
export function findOutputForCall(
  messages: Task['messages'],
  callId: string
): Task['messages'][0] | undefined {
  return messages.find(
    (message) => message.type === 'local_shell_call_output' && message.data?.call_id === callId
  )
}

/**
 * Safely extracts text from a message data object
 */
export function getMessageText(data: Record<string, unknown>): string {
  return (data?.text as string) || ''
}

/**
 * Safely extracts command from a shell call message
 */
export function getShellCommand(data: Record<string, unknown>): string[] | undefined {
  return (data as { action?: { command?: string[] } })?.action?.command
}

/**
 * Safely extracts output from a shell output message
 */
export function getShellOutput(data: Record<string, unknown>): string | undefined {
  return (data as { output?: string })?.output
}

/**
 * Generates repository URL from repository name
 */
export function getRepositoryUrl(repository?: string): string | undefined {
  return repository ? `https://github.com/${repository}` : undefined
}

/**
 * Checks if a task is currently in progress
 */
export function isTaskInProgress(task: Task): boolean {
  return task.status === 'IN_PROGRESS'
}

/**
 * Checks if streaming messages are present
 */
export function hasStreamingMessages(streamingMessages: Map<string, StreamingMessage>): boolean {
  return streamingMessages.size > 0
}
