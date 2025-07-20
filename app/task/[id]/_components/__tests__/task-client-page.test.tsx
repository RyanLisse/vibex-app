import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useAutoScroll } from '@/app/task/[id]/_hooks/use-auto-scroll'
import { useTaskData } from '@/app/task/[id]/_hooks/use-task-data'
import { useTaskSubscription } from '@/app/task/[id]/_hooks/use-task-subscription'
import TaskClientPage from '@/app/task/[id]/client-page'
import { useTaskStore } from '@/stores/tasks'

// Mock the stores and hooks
vi.mock('@/stores/tasks')
vi.mock('../../_hooks/use-task-subscription')
vi.mock('../../_hooks/use-auto-scroll')
vi.mock('../../_hooks/use-task-data')
vi.mock('@/components/navigation/task-navbar', () => ({
  default: ({ id }: { id: string }) => <div data-testid="task-navbar">TaskNavbar-{id}</div>,
}))
vi.mock('../../_components/message-input', () => ({
  default: ({ task }: { task: any }) => (
    <div data-testid="message-input">MessageInput-{task?.id}</div>
  ),
}))
vi.mock('../../_components/chat-messages-panel', () => ({
  ChatMessagesPanel: () => <div data-testid="chat-messages-panel">ChatMessagesPanel</div>,
}))
vi.mock('../../_components/shell-output-panel', () => ({
  ShellOutputPanel: () => <div data-testid="shell-output-panel">ShellOutputPanel</div>,
}))
vi.mock('../../_components/task-loading-state', () => ({
  TaskLoadingState: () => <div data-testid="task-loading-state">TaskLoadingState</div>,
}))

const mockTask = {
  id: 'test-task-1',
  title: 'Test Task',
  description: 'Test Description',
  messages: [
    {
      role: 'user' as const,
      type: 'message',
      data: { text: 'Hello', id: 'msg-1' },
    },
    {
      role: 'assistant' as const,
      type: 'message',
      data: { text: 'Hi there!', id: 'msg-2' },
    },
    {
      role: 'assistant' as const,
      type: 'local_shell_call',
      data: { call_id: 'call-1', action: { command: ['ls', '-la'] } },
    },
    {
      role: 'assistant' as const,
      type: 'local_shell_call_output',
      data: { call_id: 'call-1', output: 'file1.txt\nfile2.txt' },
    },
  ],
  status: 'IN_PROGRESS' as const,
  branch: 'main',
  sessionId: 'session-1',
  repository: 'user/repo',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  statusMessage: 'Processing...',
  isArchived: false,
  mode: 'code' as const,
  hasChanges: false,
}

const mockStreamingMessages = new Map()

const mockUseTaskStore = {
  getTaskById: vi.fn(),
  updateTask: vi.fn(),
}

const mockUseTaskSubscription = {
  streamingMessages: mockStreamingMessages,
  subscriptionEnabled: true,
}

const mockUseTaskData = {
  regularMessages: [],
  shellMessages: [],
  hasStreamingMessages: false,
  isTaskInProgress: false,
}

const mockUseAutoScroll = {
  current: null,
}

describe('TaskClientPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useTaskStore as any).mockReturnValue(mockUseTaskStore)
    ;(useTaskSubscription as any).mockReturnValue(mockUseTaskSubscription)
    ;(useAutoScroll as any).mockReturnValue(mockUseAutoScroll)
    ;(useTaskData as any).mockReturnValue(mockUseTaskData)
  })

  it('renders task not found when task is undefined', async () => {
    mockUseTaskStore.getTaskById.mockReturnValue(undefined)

    render(<TaskClientPage id="nonexistent-task" />)

    await waitFor(() => {
      expect(screen.getByText('Task not found')).toBeInTheDocument()
      expect(screen.getByText('The requested task could not be found.')).toBeInTheDocument()
    })
  })

  it('renders task content when task exists', async () => {
    mockUseTaskStore.getTaskById.mockReturnValue(mockTask)

    render(<TaskClientPage id="test-task-1" />)

    await waitFor(() => {
      expect(screen.getByTestId('task-navbar')).toBeInTheDocument()
      expect(screen.getByTestId('message-input')).toBeInTheDocument()
      expect(screen.getByText('Test Task')).toBeInTheDocument()
    })
  })

  it('shows loading state when task is in progress and no streaming messages', async () => {
    mockUseTaskStore.getTaskById.mockReturnValue(mockTask)

    render(<TaskClientPage id="test-task-1" />)

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })
  })

  it('calls updateTask to mark task as viewed on mount', async () => {
    mockUseTaskStore.getTaskById.mockReturnValue(mockTask)

    render(<TaskClientPage id="test-task-1" />)

    await waitFor(() => {
      expect(mockUseTaskStore.updateTask).toHaveBeenCalledWith('test-task-1', {
        hasChanges: false,
      })
    })
  })

  it('displays regular messages correctly', async () => {
    mockUseTaskStore.getTaskById.mockReturnValue(mockTask)

    render(<TaskClientPage id="test-task-1" />)

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByText('Hi there!')).toBeInTheDocument()
    })
  })

  it('displays shell outputs correctly', async () => {
    mockUseTaskStore.getTaskById.mockReturnValue(mockTask)

    render(<TaskClientPage id="test-task-1" />)

    await waitFor(() => {
      expect(screen.getByText('file1.txt')).toBeInTheDocument()
      expect(screen.getByText('file2.txt')).toBeInTheDocument()
    })
  })

  it('handles streaming messages', async () => {
    const streamingMessage = {
      role: 'assistant' as const,
      type: 'message',
      data: {
        text: 'Streaming response...',
        streamId: 'stream-1',
        chunkIndex: 0,
        totalChunks: 3,
      },
    }

    const streamingMessages = new Map([['stream-1', streamingMessage]])

    ;(useTaskSubscription as any).mockReturnValue({
      streamingMessages,
      subscriptionEnabled: true,
    })

    mockUseTaskStore.getTaskById.mockReturnValue(mockTask)

    render(<TaskClientPage id="test-task-1" />)

    await waitFor(() => {
      expect(screen.getByText('Streaming response...')).toBeInTheDocument()
    })
  })
})
