import { afterEach, beforeEach, describe, expect, it, spyOn, test } from 'vitest'
import {
  createMessage,
  filterMessagesByStatus,
  filterMessagesByType,
  getLatestMessage,
  getMessageById,
  hasToolOutput,
  isAssistantMessage,
  isCompleteMessage,
  isErrorMessage,
  isMessageStatus,
  isMessageType,
  isStatusMessage,
  isStreamingMessage,
  isSystemMessage,
  isToolMessage,
  isUserMessage,
  sortMessagesByTimestamp,
  type TaskMessage,
  updateMessage,
  validateMessage,
} from './message-guards'

describe('message-guards', () => {
  const baseMessage = {
    id: 'msg-1',
    type: 'user' as const,
    content: 'Test message',
    timestamp: Date.now(),
    status: 'complete' as const,
  }

  describe('isStreamingMessage', () => {
    it('should return true for streaming message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        status: 'streaming',
      }
      expect(isStreamingMessage(message)).toBe(true)
    })

    it('should return false for non-streaming message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        status: 'complete',
      }
      expect(isStreamingMessage(message)).toBe(false)
    })
  })

  describe('isCompleteMessage', () => {
    it('should return true for complete message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        status: 'complete',
      }
      expect(isCompleteMessage(message)).toBe(true)
    })

    it('should return false for non-complete message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        status: 'streaming',
      }
      expect(isCompleteMessage(message)).toBe(false)
    })
  })

  describe('isErrorMessage', () => {
    it('should return true for error message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'error',
        status: 'error',
      }
      expect(isErrorMessage(message)).toBe(true)
    })

    it('should return false for non-error message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'user',
      }
      expect(isErrorMessage(message)).toBe(false)
    })
  })

  describe('isStatusMessage', () => {
    it('should return true for status message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'status',
      }
      expect(isStatusMessage(message)).toBe(true)
    })

    it('should return false for non-status message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'user',
      }
      expect(isStatusMessage(message)).toBe(false)
    })
  })

  describe('isToolMessage', () => {
    it('should return true for tool message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'tool',
        tool: {
          name: 'file_read',
          input: { path: '/test.txt' },
          output: 'File content',
        },
      }
      expect(isToolMessage(message)).toBe(true)
    })

    it('should return false for non-tool message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'user',
      }
      expect(isToolMessage(message)).toBe(false)
    })
  })

  describe('isUserMessage', () => {
    it('should return true for user message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'user',
      }
      expect(isUserMessage(message)).toBe(true)
    })

    it('should return false for non-user message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'assistant',
      }
      expect(isUserMessage(message)).toBe(false)
    })
  })

  describe('isAssistantMessage', () => {
    it('should return true for assistant message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'assistant',
      }
      expect(isAssistantMessage(message)).toBe(true)
    })

    it('should return false for non-assistant message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'user',
      }
      expect(isAssistantMessage(message)).toBe(false)
    })
  })

  describe('isSystemMessage', () => {
    it('should return true for system message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'system',
      }
      expect(isSystemMessage(message)).toBe(true)
    })

    it('should return false for non-system message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'user',
      }
      expect(isSystemMessage(message)).toBe(false)
    })
  })

  describe('hasToolOutput', () => {
    it('should return true for message with tool output', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'tool',
        tool: {
          name: 'file_read',
          input: { path: '/test.txt' },
          output: 'File content',
        },
      }
      expect(hasToolOutput(message)).toBe(true)
    })

    it('should return false for message without tool output', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'tool',
        tool: {
          name: 'file_read',
          input: { path: '/test.txt' },
        },
      }
      expect(hasToolOutput(message)).toBe(false)
    })

    it('should return false for non-tool message', () => {
      const message: TaskMessage = {
        ...baseMessage,
        type: 'user',
      }
      expect(hasToolOutput(message)).toBe(false)
    })
  })

  describe('isMessageType', () => {
    it('should return true for matching type', () => {
      expect(isMessageType(baseMessage, 'user')).toBe(true)
    })

    it('should return false for non-matching type', () => {
      expect(isMessageType(baseMessage, 'assistant')).toBe(false)
    })
  })

  describe('isMessageStatus', () => {
    it('should return true for matching status', () => {
      expect(isMessageStatus(baseMessage, 'complete')).toBe(true)
    })

    it('should return false for non-matching status', () => {
      expect(isMessageStatus(baseMessage, 'streaming')).toBe(false)
    })
  })

  describe('validateMessage', () => {
    it('should return true for valid message', () => {
      expect(validateMessage(baseMessage)).toBe(true)
    })

    it('should return false for message without id', () => {
      const invalidMessage = { ...baseMessage, id: undefined } as any
      expect(validateMessage(invalidMessage)).toBe(false)
    })

    it('should return false for message without type', () => {
      const invalidMessage = { ...baseMessage, type: undefined } as any
      expect(validateMessage(invalidMessage)).toBe(false)
    })

    it('should return false for message without content', () => {
      const invalidMessage = { ...baseMessage, content: undefined } as any
      expect(validateMessage(invalidMessage)).toBe(false)
    })

    it('should return false for message without timestamp', () => {
      const invalidMessage = { ...baseMessage, timestamp: undefined } as any
      expect(validateMessage(invalidMessage)).toBe(false)
    })

    it('should return false for message without status', () => {
      const invalidMessage = { ...baseMessage, status: undefined } as any
      expect(validateMessage(invalidMessage)).toBe(false)
    })

    it('should return false for message with invalid type', () => {
      const invalidMessage = { ...baseMessage, type: 'invalid' } as any
      expect(validateMessage(invalidMessage)).toBe(false)
    })

    it('should return false for message with invalid status', () => {
      const invalidMessage = { ...baseMessage, status: 'invalid' } as any
      expect(validateMessage(invalidMessage)).toBe(false)
    })
  })

  describe('createMessage', () => {
    it('should create valid message', () => {
      const message = createMessage({
        type: 'user',
        content: 'Test message',
      })

      expect(message.id).toBeDefined()
      expect(message.type).toBe('user')
      expect(message.content).toBe('Test message')
      expect(message.timestamp).toBeDefined()
      expect(message.status).toBe('complete')
    })

    it('should create message with custom status', () => {
      const message = createMessage({
        type: 'assistant',
        content: 'Streaming...',
        status: 'streaming',
      })

      expect(message.status).toBe('streaming')
    })

    it('should create tool message', () => {
      const message = createMessage({
        type: 'tool',
        content: 'Tool executed',
        tool: {
          name: 'file_read',
          input: { path: '/test.txt' },
          output: 'File content',
        },
      })

      expect(message.type).toBe('tool')
      expect(message.tool).toBeDefined()
      expect(message.tool?.name).toBe('file_read')
    })
  })

  describe('updateMessage', () => {
    it('should update message content', () => {
      const updatedMessage = updateMessage(baseMessage, {
        content: 'Updated content',
      })

      expect(updatedMessage.content).toBe('Updated content')
      expect(updatedMessage.id).toBe(baseMessage.id)
    })

    it('should update message status', () => {
      const updatedMessage = updateMessage(baseMessage, {
        status: 'streaming',
      })

      expect(updatedMessage.status).toBe('streaming')
    })

    it('should update multiple fields', () => {
      const updatedMessage = updateMessage(baseMessage, {
        content: 'New content',
        status: 'error',
        type: 'error',
      })

      expect(updatedMessage.content).toBe('New content')
      expect(updatedMessage.status).toBe('error')
      expect(updatedMessage.type).toBe('error')
    })
  })

  describe('filterMessagesByType', () => {
    const messages: TaskMessage[] = [
      { ...baseMessage, id: 'msg-1', type: 'user' },
      { ...baseMessage, id: 'msg-2', type: 'assistant' },
      { ...baseMessage, id: 'msg-3', type: 'user' },
      { ...baseMessage, id: 'msg-4', type: 'tool' },
    ]

    it('should filter messages by type', () => {
      const userMessages = filterMessagesByType(messages, 'user')
      expect(userMessages).toHaveLength(2)
      expect(userMessages[0].id).toBe('msg-1')
      expect(userMessages[1].id).toBe('msg-3')
    })

    it('should return empty array for non-matching type', () => {
      const statusMessages = filterMessagesByType(messages, 'status')
      expect(statusMessages).toHaveLength(0)
    })
  })

  describe('filterMessagesByStatus', () => {
    const messages: TaskMessage[] = [
      { ...baseMessage, id: 'msg-1', status: 'complete' },
      { ...baseMessage, id: 'msg-2', status: 'streaming' },
      { ...baseMessage, id: 'msg-3', status: 'complete' },
      { ...baseMessage, id: 'msg-4', status: 'error' },
    ]

    it('should filter messages by status', () => {
      const completeMessages = filterMessagesByStatus(messages, 'complete')
      expect(completeMessages).toHaveLength(2)
      expect(completeMessages[0].id).toBe('msg-1')
      expect(completeMessages[1].id).toBe('msg-3')
    })

    it('should return empty array for non-matching status', () => {
      const pendingMessages = filterMessagesByStatus(messages, 'pending')
      expect(pendingMessages).toHaveLength(0)
    })
  })

  describe('getLatestMessage', () => {
    const messages: TaskMessage[] = [
      { ...baseMessage, id: 'msg-1', timestamp: 1000 },
      { ...baseMessage, id: 'msg-2', timestamp: 3000 },
      { ...baseMessage, id: 'msg-3', timestamp: 2000 },
    ]

    it('should return latest message', () => {
      const latest = getLatestMessage(messages)
      expect(latest?.id).toBe('msg-2')
    })

    it('should return null for empty array', () => {
      const latest = getLatestMessage([])
      expect(latest).toBeNull()
    })
  })

  describe('getMessageById', () => {
    const messages: TaskMessage[] = [
      { ...baseMessage, id: 'msg-1' },
      { ...baseMessage, id: 'msg-2' },
      { ...baseMessage, id: 'msg-3' },
    ]

    it('should return message by id', () => {
      const message = getMessageById(messages, 'msg-2')
      expect(message?.id).toBe('msg-2')
    })

    it('should return null for non-existing id', () => {
      const message = getMessageById(messages, 'non-existing')
      expect(message).toBeNull()
    })
  })

  describe('sortMessagesByTimestamp', () => {
    const messages: TaskMessage[] = [
      { ...baseMessage, id: 'msg-1', timestamp: 3000 },
      { ...baseMessage, id: 'msg-2', timestamp: 1000 },
      { ...baseMessage, id: 'msg-3', timestamp: 2000 },
    ]

    it('should sort messages by timestamp ascending', () => {
      const sorted = sortMessagesByTimestamp(messages)
      expect(sorted[0].id).toBe('msg-2')
      expect(sorted[1].id).toBe('msg-3')
      expect(sorted[2].id).toBe('msg-1')
    })

    it('should sort messages by timestamp descending', () => {
      const sorted = sortMessagesByTimestamp(messages, 'desc')
      expect(sorted[0].id).toBe('msg-1')
      expect(sorted[1].id).toBe('msg-3')
      expect(sorted[2].id).toBe('msg-2')
    })
  })
})
