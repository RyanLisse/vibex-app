import type { IncomingMessage } from '@/app/task/[id]/_types/message-types'

// Define TaskMessage type for compatibility
export interface TaskMessage {
  id: string
  type: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: number
  status: 'pending' | 'streaming' | 'complete' | 'error'
  role?: 'user' | 'assistant'
  data?: Record<string, unknown>
}

function isValidObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasRequiredMessageProperties(obj: Record<string, unknown>): boolean {
  return 'type' in obj && 'data' in obj
}

function _isMessageTypeInternal(obj: Record<string, unknown>): boolean {
  return obj.type === 'message'
}

function hasValidData(obj: Record<string, unknown>): boolean {
  return typeof obj.data === 'object' && obj.data !== null
}

function hasStreamingProperties(data: Record<string, unknown>): boolean {
  return (
    'isStreaming' in data &&
    data.isStreaming === true &&
    'streamId' in data &&
    typeof data.streamId === 'string'
  )
}

function hasStreamIdProperty(data: Record<string, unknown>): boolean {
  return 'streamId' in data && typeof data.streamId === 'string'
}

function isStreamingComplete(data: Record<string, unknown>): boolean {
  return !('isStreaming' in data) || data.isStreaming === false
}

function hasValidRole(obj: Record<string, unknown>): boolean {
  return 'role' in obj && (obj.role === 'user' || obj.role === 'assistant')
}

function hasValidType(obj: Record<string, unknown>): boolean {
  return 'type' in obj && typeof obj.type === 'string'
}

// Combined validation helpers
const validateMessageBase = (message: unknown): message is Record<string, unknown> => {
  return (
    isValidObject(message) &&
    hasRequiredMessageProperties(message) &&
    isMessageType(message) &&
    hasValidData(message)
  )
}

const validateIncomingMessage = (message: unknown): message is Record<string, unknown> => {
  return (
    isValidObject(message) &&
    hasValidRole(message) &&
    hasValidType(message) &&
    'data' in message &&
    typeof message.data === 'object'
  )
}

export function isStreamingMessage(message: unknown): message is IncomingMessage & {
  data: { isStreaming: true; streamId: string }
} {
  if (!validateMessageBase(message)) {
    return false
  }

  const data = message.data as Record<string, unknown>
  return hasStreamingProperties(data)
}

export function isCompletedStreamMessage(message: unknown): message is IncomingMessage & {
  data: { streamId: string; isStreaming: false }
} {
  if (!validateMessageBase(message)) {
    return false
  }

  const data = message.data as Record<string, unknown>
  return hasStreamIdProperty(data) && isStreamingComplete(data)
}

export function isValidIncomingMessage(message: unknown): message is IncomingMessage {
  return validateIncomingMessage(message)
}

// Additional guard functions for TaskMessage compatibility
export function isUserMessage(message: TaskMessage): boolean {
  return message.type === 'user'
}

export function isAssistantMessage(message: TaskMessage): boolean {
  return message.type === 'assistant'
}

export function isSystemMessage(message: TaskMessage): boolean {
  return message.type === 'system'
}

export function isToolMessage(message: TaskMessage): boolean {
  return message.type === 'tool'
}

export function isCompleteMessage(message: TaskMessage): boolean {
  return message.status === 'complete'
}

export function isErrorMessage(message: TaskMessage): boolean {
  return message.status === 'error'
}

export function isStatusMessage(message: TaskMessage): boolean {
  return ['pending', 'streaming', 'complete', 'error'].includes(message.status)
}

export function isMessageType(type: string): type is TaskMessage['type'] {
  return ['user', 'assistant', 'system', 'tool'].includes(type)
}

export function isMessageStatus(status: string): status is TaskMessage['status'] {
  return ['pending', 'streaming', 'complete', 'error'].includes(status)
}

export function hasToolOutput(message: TaskMessage): boolean {
  return message.type === 'tool' && Boolean(message.data?.output)
}

export function validateMessage(message: unknown): message is TaskMessage {
  if (!isValidObject(message)) {
    return false
  }

  const obj = message as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    isMessageType(obj.type as string) &&
    typeof obj.content === 'string' &&
    typeof obj.timestamp === 'number' &&
    isMessageStatus(obj.status as string)
  )
}

// Utility functions
export function createMessage(
  type: TaskMessage['type'],
  content: string,
  status: TaskMessage['status'] = 'pending'
): TaskMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    content,
    timestamp: Date.now(),
    status,
  }
}

export function updateMessage(message: TaskMessage, updates: Partial<TaskMessage>): TaskMessage {
  return { ...message, ...updates }
}

export function getMessageById(messages: TaskMessage[], id: string): TaskMessage | undefined {
  return messages.find((msg) => msg.id === id)
}

export function getLatestMessage(messages: TaskMessage[]): TaskMessage | undefined {
  return messages.length > 0 ? messages.at(-1) : undefined
}

export function sortMessagesByTimestamp(messages: TaskMessage[]): TaskMessage[] {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp)
}

export function filterMessagesByType(
  messages: TaskMessage[],
  type: TaskMessage['type']
): TaskMessage[] {
  return messages.filter((msg) => msg.type === type)
}

export function filterMessagesByStatus(
  messages: TaskMessage[],
  status: TaskMessage['status']
): TaskMessage[] {
  return messages.filter((msg) => msg.status === status)
}
