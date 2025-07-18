import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMessageProcessor } from './use-message-processor'
import type { TaskMessage } from '../_types/message-types'

// Mock the message guards
vi.mock('../_utils/message-guards', () => ({
  isStreamingMessage: vi.fn(),
  isCompleteMessage: vi.fn(),
  isErrorMessage: vi.fn(),
  isStatusMessage: vi.fn(),
  isToolMessage: vi.fn(),
}))

// Mock the task store
const mockUpdateTask = vi.fn()
const mockAddMessage = vi.fn()
const mockSetMessages = vi.fn()

vi.mock('@/stores/tasks', () => ({
  useTaskStore: () => ({
    updateTask: mockUpdateTask,
    addMessage: mockAddMessage,
    setMessages: mockSetMessages,
  }),
}))

// Mock stream utilities
vi.mock('@/lib/stream-utils', () => ({
  parseStreamData: vi.fn(),
  handleStreamError: vi.fn(),
}))

const mockMessageGuards = vi.mocked(await import('../_utils/message-guards'))
const mockStreamUtils = vi.mocked(await import('@/lib/stream-utils'))

describe('useMessageProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useMessageProcessor('task-123'))

    expect(result.current.isProcessing).toBe(false)
    expect(result.current.streamingMessageId).toBeNull()
    expect(result.current.error).toBeNull()
    expect(typeof result.current.processMessage).toBe('function')
    expect(typeof result.current.processStreamChunk).toBe('function')
    expect(typeof result.current.startStreaming).toBe('function')
    expect(typeof result.current.stopStreaming).toBe('function')
    expect(typeof result.current.clearError).toBe('function')
  })

  it('should process complete message', async () => {
    mockMessageGuards.isCompleteMessage.mockReturnValue(true)
    mockMessageGuards.isStreamingMessage.mockReturnValue(false)
    mockMessageGuards.isErrorMessage.mockReturnValue(false)
    mockMessageGuards.isStatusMessage.mockReturnValue(false)
    mockMessageGuards.isToolMessage.mockReturnValue(false)

    const { result } = renderHook(() => useMessageProcessor('task-123'))

    const message: TaskMessage = {
      id: 'msg-1',
      type: 'assistant',
      content: 'Complete message',
      timestamp: Date.now(),
      status: 'complete'
    }

    await act(async () => {
      await result.current.processMessage(message)
    })

    expect(mockAddMessage).toHaveBeenCalledWith('task-123', message)
    expect(result.current.isProcessing).toBe(false)
  })

  it('should process streaming message', async () => {
    mockMessageGuards.isStreamingMessage.mockReturnValue(true)
    mockMessageGuards.isCompleteMessage.mockReturnValue(false)
    mockMessageGuards.isErrorMessage.mockReturnValue(false)
    mockMessageGuards.isStatusMessage.mockReturnValue(false)
    mockMessageGuards.isToolMessage.mockReturnValue(false)

    const { result } = renderHook(() => useMessageProcessor('task-123'))

    const message: TaskMessage = {
      id: 'msg-1',
      type: 'assistant',
      content: 'Streaming...',
      timestamp: Date.now(),
      status: 'streaming'
    }

    await act(async () => {
      await result.current.processMessage(message)
    })

    expect(mockAddMessage).toHaveBeenCalledWith('task-123', message)
    expect(result.current.streamingMessageId).toBe('msg-1')
    expect(result.current.isProcessing).toBe(true)
  })

  it('should process error message', async () => {
    mockMessageGuards.isErrorMessage.mockReturnValue(true)
    mockMessageGuards.isStreamingMessage.mockReturnValue(false)
    mockMessageGuards.isCompleteMessage.mockReturnValue(false)
    mockMessageGuards.isStatusMessage.mockReturnValue(false)
    mockMessageGuards.isToolMessage.mockReturnValue(false)

    const { result } = renderHook(() => useMessageProcessor('task-123'))

    const message: TaskMessage = {
      id: 'msg-1',
      type: 'error',
      content: 'Error occurred',
      timestamp: Date.now(),
      status: 'error'
    }

    await act(async () => {
      await result.current.processMessage(message)
    })

    expect(mockAddMessage).toHaveBeenCalledWith('task-123', message)
    expect(result.current.error).toBe('Error occurred')
    expect(result.current.isProcessing).toBe(false)
  })

  it('should process status message', async () => {
    mockMessageGuards.isStatusMessage.mockReturnValue(true)
    mockMessageGuards.isStreamingMessage.mockReturnValue(false)
    mockMessageGuards.isCompleteMessage.mockReturnValue(false)
    mockMessageGuards.isErrorMessage.mockReturnValue(false)
    mockMessageGuards.isToolMessage.mockReturnValue(false)

    const { result } = renderHook(() => useMessageProcessor('task-123'))

    const message: TaskMessage = {
      id: 'msg-1',
      type: 'status',
      content: 'Task started',
      timestamp: Date.now(),
      status: 'complete'
    }

    await act(async () => {
      await result.current.processMessage(message)
    })

    expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
      status: 'IN_PROGRESS',
      lastActivity: expect.any(Number)
    })
    expect(mockAddMessage).toHaveBeenCalledWith('task-123', message)
  })

  it('should process tool message', async () => {
    mockMessageGuards.isToolMessage.mockReturnValue(true)
    mockMessageGuards.isStreamingMessage.mockReturnValue(false)
    mockMessageGuards.isCompleteMessage.mockReturnValue(false)
    mockMessageGuards.isErrorMessage.mockReturnValue(false)
    mockMessageGuards.isStatusMessage.mockReturnValue(false)

    const { result } = renderHook(() => useMessageProcessor('task-123'))

    const message: TaskMessage = {
      id: 'msg-1',
      type: 'tool',
      content: 'Tool executed',
      timestamp: Date.now(),
      status: 'complete',
      tool: {
        name: 'file_read',
        input: { path: '/test.txt' },
        output: 'File content'
      }
    }

    await act(async () => {
      await result.current.processMessage(message)
    })

    expect(mockAddMessage).toHaveBeenCalledWith('task-123', message)
    expect(result.current.isProcessing).toBe(false)
  })

  it('should process stream chunk', async () => {
    mockStreamUtils.parseStreamData.mockReturnValue({
      type: 'content',
      data: { content: 'chunk data' }
    })

    const { result } = renderHook(() => useMessageProcessor('task-123'))

    // First start streaming
    act(() => {
      result.current.startStreaming('msg-1')
    })

    const chunk = new Uint8Array([1, 2, 3, 4])

    await act(async () => {
      await result.current.processStreamChunk(chunk)
    })

    expect(mockStreamUtils.parseStreamData).toHaveBeenCalledWith(chunk)
    expect(result.current.streamingMessageId).toBe('msg-1')
  })

  it('should handle stream chunk error', async () => {
    mockStreamUtils.parseStreamData.mockImplementation(() => {
      throw new Error('Parse error')
    })
    mockStreamUtils.handleStreamError.mockReturnValue('Parse error')

    const { result } = renderHook(() => useMessageProcessor('task-123'))

    act(() => {
      result.current.startStreaming('msg-1')
    })

    const chunk = new Uint8Array([1, 2, 3, 4])

    await act(async () => {
      await result.current.processStreamChunk(chunk)
    })

    expect(mockStreamUtils.handleStreamError).toHaveBeenCalledWith(expect.any(Error))
    expect(result.current.error).toBe('Parse error')
  })

  it('should start streaming', () => {
    const { result } = renderHook(() => useMessageProcessor('task-123'))

    act(() => {
      result.current.startStreaming('msg-1')
    })

    expect(result.current.isProcessing).toBe(true)
    expect(result.current.streamingMessageId).toBe('msg-1')
  })

  it('should stop streaming', () => {
    const { result } = renderHook(() => useMessageProcessor('task-123'))

    // First start streaming
    act(() => {
      result.current.startStreaming('msg-1')
    })

    expect(result.current.isProcessing).toBe(true)

    // Then stop streaming
    act(() => {
      result.current.stopStreaming()
    })

    expect(result.current.isProcessing).toBe(false)
    expect(result.current.streamingMessageId).toBeNull()
  })

  it('should clear error', () => {
    const { result } = renderHook(() => useMessageProcessor('task-123'))

    // Set error first
    act(() => {
      result.current.error = 'Test error'
    })

    // Then clear error
    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('should handle multiple messages in sequence', async () => {
    mockMessageGuards.isCompleteMessage.mockReturnValue(true)
    mockMessageGuards.isStreamingMessage.mockReturnValue(false)
    mockMessageGuards.isErrorMessage.mockReturnValue(false)
    mockMessageGuards.isStatusMessage.mockReturnValue(false)
    mockMessageGuards.isToolMessage.mockReturnValue(false)

    const { result } = renderHook(() => useMessageProcessor('task-123'))

    const messages: TaskMessage[] = [
      {
        id: 'msg-1',
        type: 'user',
        content: 'First message',
        timestamp: Date.now(),
        status: 'complete'
      },
      {
        id: 'msg-2',
        type: 'assistant',
        content: 'Second message',
        timestamp: Date.now(),
        status: 'complete'
      }
    ]

    for (const message of messages) {
      await act(async () => {
        await result.current.processMessage(message)
      })
    }

    expect(mockAddMessage).toHaveBeenCalledTimes(2)
    expect(mockAddMessage).toHaveBeenNthCalledWith(1, 'task-123', messages[0])
    expect(mockAddMessage).toHaveBeenNthCalledWith(2, 'task-123', messages[1])
  })

  it('should handle concurrent message processing', async () => {
    mockMessageGuards.isCompleteMessage.mockReturnValue(true)
    mockMessageGuards.isStreamingMessage.mockReturnValue(false)
    mockMessageGuards.isErrorMessage.mockReturnValue(false)
    mockMessageGuards.isStatusMessage.mockReturnValue(false)
    mockMessageGuards.isToolMessage.mockReturnValue(false)

    const { result } = renderHook(() => useMessageProcessor('task-123'))

    const messages: TaskMessage[] = [
      {
        id: 'msg-1',
        type: 'user',
        content: 'First message',
        timestamp: Date.now(),
        status: 'complete'
      },
      {
        id: 'msg-2',
        type: 'assistant',
        content: 'Second message',
        timestamp: Date.now(),
        status: 'complete'
      }
    ]

    await act(async () => {
      await Promise.all(
        messages.map(message => result.current.processMessage(message))
      )
    })

    expect(mockAddMessage).toHaveBeenCalledTimes(2)
  })

  it('should handle message processing errors', async () => {
    mockMessageGuards.isCompleteMessage.mockReturnValue(true)
    mockAddMessage.mockRejectedValue(new Error('Store error'))

    const { result } = renderHook(() => useMessageProcessor('task-123'))

    const message: TaskMessage = {
      id: 'msg-1',
      type: 'user',
      content: 'Test message',
      timestamp: Date.now(),
      status: 'complete'
    }

    await act(async () => {
      await result.current.processMessage(message)
    })

    expect(result.current.error).toBe('Store error')
  })

  it('should handle stream processing without active stream', async () => {
    const { result } = renderHook(() => useMessageProcessor('task-123'))

    const chunk = new Uint8Array([1, 2, 3, 4])

    await act(async () => {
      await result.current.processStreamChunk(chunk)
    })

    // Should not process chunk if no active stream
    expect(mockStreamUtils.parseStreamData).not.toHaveBeenCalled()
  })

  it('should handle message type changes during processing', async () => {
    mockMessageGuards.isStreamingMessage.mockReturnValue(true)
    mockMessageGuards.isCompleteMessage.mockReturnValue(false)
    mockMessageGuards.isErrorMessage.mockReturnValue(false)
    mockMessageGuards.isStatusMessage.mockReturnValue(false)
    mockMessageGuards.isToolMessage.mockReturnValue(false)

    const { result } = renderHook(() => useMessageProcessor('task-123'))

    const streamingMessage: TaskMessage = {
      id: 'msg-1',
      type: 'assistant',
      content: 'Streaming...',
      timestamp: Date.now(),
      status: 'streaming'
    }

    await act(async () => {
      await result.current.processMessage(streamingMessage)
    })

    expect(result.current.isProcessing).toBe(true)

    // Now message becomes complete
    mockMessageGuards.isStreamingMessage.mockReturnValue(false)
    mockMessageGuards.isCompleteMessage.mockReturnValue(true)

    const completeMessage: TaskMessage = {
      ...streamingMessage,
      content: 'Complete message',
      status: 'complete'
    }

    await act(async () => {
      await result.current.processMessage(completeMessage)
    })

    expect(result.current.isProcessing).toBe(false)
  })
})