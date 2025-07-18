import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import Container from './container'

// Mock the dependencies
const mockUpdateTask = vi.fn()
const mockGetTaskById = vi.fn()
const mockFetchRealtimeSubscriptionToken = vi.fn()
const mockUseInngestSubscription = vi.fn()

vi.mock('@inngest/realtime/hooks', () => ({
  useInngestSubscription: () => mockUseInngestSubscription(),
  InngestSubscriptionState: {
    Closed: 'closed',
    Open: 'open',
    Error: 'error',
  },
}))

vi.mock('@/app/actions/inngest', () => ({
  fetchRealtimeSubscriptionToken: () => mockFetchRealtimeSubscriptionToken(),
}))

vi.mock('@/stores/tasks', () => ({
  useTaskStore: () => ({
    updateTask: mockUpdateTask,
    getTaskById: mockGetTaskById,
  }),
}))

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('Container', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchRealtimeSubscriptionToken.mockResolvedValue({
      token: 'test-token',
      channel: 'tasks',
    })
    mockUseInngestSubscription.mockReturnValue({
      latestData: null,
      error: null,
      state: 'open',
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render children', () => {
    render(
      <Container>
        <div data-testid="child-content">Test Content</div>
      </Container>
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should handle status updates', async () => {
    const statusData = {
      channel: 'tasks',
      topic: 'status',
      data: {
        taskId: 'task-123',
        status: 'IN_PROGRESS',
        sessionId: 'session-456',
      },
    }

    mockUseInngestSubscription.mockReturnValue({
      latestData: statusData,
      error: null,
      state: 'open',
    })

    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
        status: 'IN_PROGRESS',
        hasChanges: true,
        sessionId: 'session-456',
      })
    })
  })

  it('should handle git messages', async () => {
    const updateData = {
      channel: 'tasks',
      topic: 'update',
      data: {
        taskId: 'task-123',
        message: {
          type: 'git',
          output: 'Git operation completed',
        },
      },
    }

    mockUseInngestSubscription.mockReturnValue({
      latestData: updateData,
      error: null,
      state: 'open',
    })

    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
        statusMessage: 'Git operation completed',
      })
    })
  })

  it('should handle shell call messages', async () => {
    const existingTask = {
      id: 'task-123',
      messages: [{ role: 'user', type: 'message', data: { text: 'existing' } }],
    }

    mockGetTaskById.mockReturnValue(existingTask)

    const updateData = {
      channel: 'tasks',
      topic: 'update',
      data: {
        taskId: 'task-123',
        message: {
          type: 'local_shell_call',
          action: {
            command: ['npm', 'install'],
          },
        },
      },
    }

    mockUseInngestSubscription.mockReturnValue({
      latestData: updateData,
      error: null,
      state: 'open',
    })

    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
        statusMessage: 'Running command npm install',
        messages: [
          { role: 'user', type: 'message', data: { text: 'existing' } },
          {
            role: 'assistant',
            type: 'local_shell_call',
            data: updateData.data.message,
          },
        ],
      })
    })
  })

  it('should handle shell output messages', async () => {
    const existingTask = {
      id: 'task-123',
      messages: [{ role: 'user', type: 'message', data: { text: 'existing' } }],
    }

    mockGetTaskById.mockReturnValue(existingTask)

    const updateData = {
      channel: 'tasks',
      topic: 'update',
      data: {
        taskId: 'task-123',
        message: {
          type: 'local_shell_call_output',
          output: 'Command completed successfully',
        },
      },
    }

    mockUseInngestSubscription.mockReturnValue({
      latestData: updateData,
      error: null,
      state: 'open',
    })

    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
        messages: [
          { role: 'user', type: 'message', data: { text: 'existing' } },
          {
            role: 'assistant',
            type: 'local_shell_call_output',
            data: updateData.data.message,
          },
        ],
      })
    })
  })

  it('should handle assistant messages', async () => {
    const existingTask = {
      id: 'task-123',
      messages: [{ role: 'user', type: 'message', data: { text: 'existing' } }],
    }

    mockGetTaskById.mockReturnValue(existingTask)

    const updateData = {
      channel: 'tasks',
      topic: 'update',
      data: {
        taskId: 'task-123',
        message: {
          type: 'message',
          status: 'completed',
          role: 'assistant',
          content: [{ text: 'Assistant response' }],
        },
      },
    }

    mockUseInngestSubscription.mockReturnValue({
      latestData: updateData,
      error: null,
      state: 'open',
    })

    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
        messages: [
          { role: 'user', type: 'message', data: { text: 'existing' } },
          {
            role: 'assistant',
            type: 'message',
            data: { text: 'Assistant response' },
          },
        ],
      })
    })
  })

  it('should handle subscription errors', async () => {
    const error = new Error('Connection failed')

    mockUseInngestSubscription.mockReturnValue({
      latestData: null,
      error,
      state: 'error',
    })

    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith('Container Inngest subscription error:', error)
    })
  })

  it('should handle subscription state changes', async () => {
    mockUseInngestSubscription.mockReturnValue({
      latestData: null,
      error: null,
      state: 'closed',
    })

    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    await waitFor(() => {
      expect(mockConsoleLog).toHaveBeenCalledWith('Container Inngest subscription closed')
    })
  })

  it('should handle token fetch failure', async () => {
    mockFetchRealtimeSubscriptionToken.mockResolvedValue(null)

    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    await waitFor(() => {
      expect(mockConsoleLog).toHaveBeenCalledWith('Inngest subscription disabled: No token available')
    })
  })

  it('should handle token fetch error', async () => {
    const error = new Error('Token fetch failed')
    mockFetchRealtimeSubscriptionToken.mockRejectedValue(error)

    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to refresh Inngest token:', error)
    })
  })

  it('should ignore non-tasks channel messages', async () => {
    const updateData = {
      channel: 'other-channel',
      topic: 'update',
      data: {
        taskId: 'task-123',
        message: { type: 'git', output: 'test' },
      },
    }

    mockUseInngestSubscription.mockReturnValue({
      latestData: updateData,
      error: null,
      state: 'open',
    })

    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    await waitFor(() => {
      expect(mockUpdateTask).not.toHaveBeenCalled()
    })
  })

  it('should handle unknown message types', async () => {
    const updateData = {
      channel: 'tasks',
      topic: 'update',
      data: {
        taskId: 'task-123',
        message: {
          type: 'unknown-type',
          output: 'test',
        },
      },
    }

    mockUseInngestSubscription.mockReturnValue({
      latestData: updateData,
      error: null,
      state: 'open',
    })

    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    // Should not call updateTask for unknown message types
    await waitFor(() => {
      expect(mockUpdateTask).not.toHaveBeenCalled()
    })
  })

  it('should handle tasks with no existing messages', async () => {
    mockGetTaskById.mockReturnValue({ id: 'task-123', messages: undefined })

    const updateData = {
      channel: 'tasks',
      topic: 'update',
      data: {
        taskId: 'task-123',
        message: {
          type: 'local_shell_call',
          action: { command: ['ls'] },
        },
      },
    }

    mockUseInngestSubscription.mockReturnValue({
      latestData: updateData,
      error: null,
      state: 'open',
    })

    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('task-123', {
        statusMessage: 'Running command ls',
        messages: [
          {
            role: 'assistant',
            type: 'local_shell_call',
            data: updateData.data.message,
          },
        ],
      })
    })
  })

  it('should handle incomplete assistant messages', async () => {
    const updateData = {
      channel: 'tasks',
      topic: 'update',
      data: {
        taskId: 'task-123',
        message: {
          type: 'message',
          status: 'incomplete',
          role: 'assistant',
        },
      },
    }

    mockUseInngestSubscription.mockReturnValue({
      latestData: updateData,
      error: null,
      state: 'open',
    })

    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    // Should not process incomplete messages
    await waitFor(() => {
      expect(mockUpdateTask).not.toHaveBeenCalled()
    })
  })

  it('should handle multiple children', () => {
    render(
      <Container>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <span data-testid="child-3">Child 3</span>
      </Container>
    )

    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
    expect(screen.getByTestId('child-3')).toBeInTheDocument()
  })

  it('should handle empty children', () => {
    render(<Container>{null}</Container>)

    expect(screen.queryByText('Test')).not.toBeInTheDocument()
  })
})