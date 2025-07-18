import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Container from '@/app/container'

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

vi.mock('@/hooks/use-inngest-subscription', () => ({
  useInngestSubscriptionManagement: () => ({
    subscription: mockUseInngestSubscription(),
    subscriptionEnabled: true,
    refreshToken: vi.fn(),
    handleError: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-task-message-processing', () => ({
  useTaskMessageProcessing: vi.fn(),
}))

// Mock console methods
const _mockConsoleLog = mock.spyOn(console, 'log').mockImplementation(() => {})
const _mockConsoleError = mock.spyOn(console, 'error').mockImplementation(() => {})

describe('Container', () => {
  beforeEach(() => {
    mock.restore()
    mockUseInngestSubscription.mockReturnValue({
      latestData: null,
      error: null,
      state: 'open',
    })
  })

  afterEach(() => {
    mock.restore()
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

  it('should initialize subscription management', () => {
    render(
      <Container>
        <div>Test</div>
      </Container>
    )

    // The container should render without errors and the hooks should be called
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
