import type { IncomingMessage } from '../_types/message-types'

function isValidObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasRequiredMessageProperties(obj: Record<string, unknown>): boolean {
  return 'type' in obj && 'data' in obj
}

function isMessageType(obj: Record<string, unknown>): boolean {
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
  if (!validateMessageBase(message)) return false

  const data = message.data as Record<string, unknown>
  return hasStreamingProperties(data)
}

export function isCompletedStreamMessage(message: unknown): message is IncomingMessage & {
  data: { streamId: string; isStreaming: false }
} {
  if (!validateMessageBase(message)) return false

  const data = message.data as Record<string, unknown>
  return hasStreamIdProperty(data) && isStreamingComplete(data)
}

export function isValidIncomingMessage(message: unknown): message is IncomingMessage {
  return validateIncomingMessage(message)
}
