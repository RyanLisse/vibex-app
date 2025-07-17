import { IncomingMessage } from '../_types/message-types'

// Type guard to check if a message has streaming properties
export function isStreamingMessage(message: unknown): message is IncomingMessage & {
  data: { isStreaming: true; streamId: string }
} {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === 'message' &&
    'data' in message &&
    typeof message.data === 'object' &&
    message.data !== null &&
    'isStreaming' in message.data &&
    message.data.isStreaming === true &&
    'streamId' in message.data &&
    typeof message.data.streamId === 'string'
  )
}

// Type guard to check if a message is a completed stream
export function isCompletedStreamMessage(message: unknown): message is IncomingMessage & {
  data: { streamId: string; isStreaming: false }
} {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === 'message' &&
    'data' in message &&
    typeof message.data === 'object' &&
    message.data !== null &&
    'streamId' in message.data &&
    typeof message.data.streamId === 'string' &&
    (!('isStreaming' in message.data) || message.data.isStreaming === false)
  )
}

// Type guard to check if message is a valid incoming message
export function isValidIncomingMessage(message: unknown): message is IncomingMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'role' in message &&
    'type' in message &&
    'data' in message &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.type === 'string' &&
    typeof message.data === 'object'
  )
}