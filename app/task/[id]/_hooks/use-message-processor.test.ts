import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import { vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useMessageProcessor } from '@/app/task/[id]/_hooks/use-message-processor'
import type { IncomingMessage, StreamingMessage } from '@/app/task/[id]/_types/message-types'

// Mock the message guards
vi.mock('../_utils/message-guards', () => ({
  isStreamingMessage: vi.fn(),
  isCompletedStreamMessage: vi.fn(),
  isValidIncomingMessage: vi.fn(),
}))

// Mock the task store
const mockUpdateTask = vi.fn()

vi.mock('@/stores/tasks', () => ({
  useTaskStore: () => ({
    updateTask: mockUpdateTask,
  }),
}))

// Mock React hooks
const mockSetStreamingMessages = vi.fn()

const mockMessageGuards = (await import('@/app/task/[id]/_utils/message-guards')) as any

describe('useMessageProcessor', () => {
  beforeEach(() => {
    mock.restore()
  })

  afterEach(() => {
    mock.restore()
  })

  it('should initialize with processMessage function', () => {
    const mockTaskMessages: Array<{
      role: 'user' | 'assistant'
      type: string
      data: Record<string, unknown>
    }> = []
    const mockStreamingMessages = new Map<string, StreamingMessage>()

    const { result } = renderHook(() =>
      useMessageProcessor({
        taskId: 'task-123',
        taskMessages: mockTaskMessages,
        streamingMessages: mockStreamingMessages,
        setStreamingMessages: mockSetStreamingMessages,
      })
    )

    expect(typeof result.current.processMessage).toBe('function')
  })

  it('should process regular message', async () => {
    mockMessageGuards.isValidIncomingMessage.mockReturnValue(true)
    mockMessageGuards.isStreamingMessage.mockReturnValue(false)
    mockMessageGuards.isCompletedStreamMessage.mockReturnValue(false)

    const mockTaskMessages: Array<{
      role: 'user' | 'assistant'
      type: string
      data: Record<string, unknown>
    }> = []
    const mockStreamingMessages = new Map<string, StreamingMessage>()

    const { result } = renderHook(() =>
      useMessageProcessor({
        taskId: 'task-123',
        taskMessages: mockTaskMessages,
        streamingMessages: mockStreamingMessages,
        setStreamingMessages: mockSetStreamingMessages,
      })
    )

    const message: IncomingMessage = {
      role: 'assistant',
      type: 'message',
      data: { text: 'Complete message' },
    }

    await act(async () => {
      result.current.processMessage(message)
    })

    expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
      messages: [message],
    })
  })

  it('should process streaming message', async () => {
    mockMessageGuards.isValidIncomingMessage.mockReturnValue(true)
    mockMessageGuards.isStreamingMessage.mockReturnValue(true)
    mockMessageGuards.isCompletedStreamMessage.mockReturnValue(false)

    const mockTaskMessages: Array<{
      role: 'user' | 'assistant'
      type: string
      data: Record<string, unknown>
    }> = []
    const mockStreamingMessages = new Map<string, StreamingMessage>()

    const { result } = renderHook(() =>
      useMessageProcessor({
        taskId: 'task-123',
        taskMessages: mockTaskMessages,
        streamingMessages: mockStreamingMessages,
        setStreamingMessages: mockSetStreamingMessages,
      })
    )

    const message: IncomingMessage & {
      data: { isStreaming: true; streamId: string }
    } = {
      role: 'assistant',
      type: 'message',
      data: { text: 'Streaming...', isStreaming: true, streamId: 'stream-1' },
    }

    await act(async () => {
      result.current.processMessage(message)
    })

    expect(mockSetStreamingMessages).toHaveBeenCalled()
  })

  it('should process completed stream message', async () => {
    mockMessageGuards.isValidIncomingMessage.mockReturnValue(true)
    mockMessageGuards.isStreamingMessage.mockReturnValue(false)
    mockMessageGuards.isCompletedStreamMessage.mockReturnValue(true)

    const existingStreamingMessage: StreamingMessage = {
      role: 'assistant',
      type: 'message',
      data: { text: 'Streaming...', isStreaming: true, streamId: 'stream-1' },
    }

    const mockTaskMessages: Array<{
      role: 'user' | 'assistant'
      type: string
      data: Record<string, unknown>
    }> = []
    const mockStreamingMessages = new Map<string, StreamingMessage>([
      ['stream-1', existingStreamingMessage],
    ])

    const { result } = renderHook(() =>
      useMessageProcessor({
        taskId: 'task-123',
        taskMessages: mockTaskMessages,
        streamingMessages: mockStreamingMessages,
        setStreamingMessages: mockSetStreamingMessages,
      })
    )

    const message: IncomingMessage & {
      data: { streamId: string; isStreaming: false }
    } = {
      role: 'assistant',
      type: 'message',
      data: {
        text: 'Complete message',
        streamId: 'stream-1',
        isStreaming: false,
      },
    }

    await act(async () => {
      result.current.processMessage(message)
    })

    expect(mockUpdateTask).toHaveBeenCalled()
    expect(mockSetStreamingMessages).toHaveBeenCalled()
  })

  it('should not process invalid message', async () => {
    mockMessageGuards.isValidIncomingMessage.mockReturnValue(false)

    const mockTaskMessages: Array<{
      role: 'user' | 'assistant'
      type: string
      data: Record<string, unknown>
    }> = []
    const mockStreamingMessages = new Map<string, StreamingMessage>()

    const { result } = renderHook(() =>
      useMessageProcessor({
        taskId: 'task-123',
        taskMessages: mockTaskMessages,
        streamingMessages: mockStreamingMessages,
        setStreamingMessages: mockSetStreamingMessages,
      })
    )

    const invalidMessage = { invalid: 'message' }

    await act(async () => {
      result.current.processMessage(invalidMessage)
    })

    expect(mockUpdateTask).not.toHaveBeenCalled()
    expect(mockSetStreamingMessages).not.toHaveBeenCalled()
  })
})
