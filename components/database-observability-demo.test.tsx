import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DatabaseObservabilityDemo } from './database-observability-demo'

// Mock the hooks and providers
vi.mock('@/hooks/use-electric-tasks', () => ({
  useElectricTasks: vi.fn(() => ({
    tasks: [],
    taskStats: { total: 0, pending: 0, inProgress: 0, completed: 0 },
    loading: false,
    error: null,
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  })),
  useElectricEnvironments: vi.fn(() => ({
    environments: [],
    activeEnvironment: null,
    loading: false,
    error: null,
    createEnvironment: vi.fn(),
    activateEnvironment: vi.fn(),
  })),
}))

vi.mock('@/components/providers/electric-provider', () => ({
  useElectricContext: vi.fn(() => ({
    isReady: true,
    isConnected: true,
    isSyncing: false,
    error: null,
  })),
  ElectricConnectionStatus: () => <div data-testid="electric-connection-status">Connected</div>,
  ElectricSyncButton: () => <button data-testid="electric-sync-button">Sync</button>,
  ElectricOfflineIndicator: () => <div data-testid="electric-offline-indicator">Online</div>,
}))

vi.mock('@/hooks/use-task-queries', () => ({
  useTasksQuery: vi.fn(() => ({
    tasks: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
    isStale: false,
    isFetching: false,
  })),
  useTaskSearchQuery: vi.fn(() => ({
    tasks: [],
    loading: false,
    isSemanticSearch: false,
  })),
  useCreateTaskMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useUpdateTaskMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('@/hooks/use-execution-queries', () => ({
  useExecutionAnalyticsQuery: vi.fn(() => ({
    analytics: null,
    loading: false,
  })),
}))

vi.mock('@/components/providers/query-provider', () => ({
  QueryPerformanceMonitor: () => (
    <div data-testid="query-performance-monitor">Performance Monitor</div>
  ),
  QueryCacheStatus: () => <div data-testid="query-cache-status">Cache Status</div>,
  WASMOptimizationStatus: () => <div data-testid="wasm-optimization-status">WASM Status</div>,
}))

vi.mock('@/lib/wasm/services', () => ({
  wasmServices: {
    healthCheck: vi.fn(() =>
      Promise.resolve({
        overall: 'healthy',
        details: {
          vectorSearch: 'healthy',
          sqliteUtils: 'healthy',
          computeEngine: 'healthy',
        },
      })
    ),
    getStats: vi.fn(() => ({
      capabilities: { isSupported: true },
      initializationTime: 150.5,
    })),
  },
}))

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('DatabaseObservabilityDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the main demo interface', async () => {
    render(
      <TestWrapper>
        <DatabaseObservabilityDemo />
      </TestWrapper>
    )

    // Check for main title
    expect(screen.getByText('Database Observability Demo')).toBeInTheDocument()

    // Check for description
    expect(screen.getByText(/Comprehensive showcase of ElectricSQL/)).toBeInTheDocument()

    // Check for status cards
    expect(screen.getByText('System Status')).toBeInTheDocument()
    expect(screen.getByText('Task Statistics')).toBeInTheDocument()
    expect(screen.getByText('User Activity')).toBeInTheDocument()
    expect(screen.getByText('Performance')).toBeInTheDocument()
  })

  it('displays tab navigation correctly', () => {
    render(
      <TestWrapper>
        <DatabaseObservabilityDemo />
      </TestWrapper>
    )

    // Check for all tabs
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Collaboration' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Smart Search' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Performance' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Monitoring' })).toBeInTheDocument()
  })

  it('allows user switching', () => {
    render(
      <TestWrapper>
        <DatabaseObservabilityDemo />
      </TestWrapper>
    )

    // Check for user buttons
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.getByText('Diana')).toBeInTheDocument()

    // Click on Bob to switch users
    const bobButton = screen.getByRole('button', { name: /Bob/ })
    fireEvent.click(bobButton)

    // The button should now be selected (default variant)
    expect(bobButton).toHaveClass('bg-primary')
  })

  it('handles network toggle', () => {
    render(
      <TestWrapper>
        <DatabaseObservabilityDemo />
      </TestWrapper>
    )

    // Find the network toggle button
    const networkButton = screen.getByRole('button', { name: 'Go Offline' })
    expect(networkButton).toBeInTheDocument()

    // Click to go offline
    fireEvent.click(networkButton)

    // Button text should change
    expect(screen.getByRole('button', { name: 'Go Online' })).toBeInTheDocument()
  })

  it('displays task creation form', () => {
    render(
      <TestWrapper>
        <DatabaseObservabilityDemo />
      </TestWrapper>
    )

    // Check for task creation form elements
    expect(screen.getByPlaceholderText('Task title')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Task description (optional)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Task' })).toBeInTheDocument()
  })

  it('handles task creation', async () => {
    const mockCreateTask = vi.fn()

    // Mock the create task mutation
    vi.mocked(require('@/hooks/use-task-queries').useCreateTaskMutation).mockReturnValue({
      mutateAsync: mockCreateTask,
      isPending: false,
    })

    render(
      <TestWrapper>
        <DatabaseObservabilityDemo />
      </TestWrapper>
    )

    // Fill in the form
    const titleInput = screen.getByPlaceholderText('Task title')
    const descriptionInput = screen.getByPlaceholderText('Task description (optional)')
    const createButton = screen.getByRole('button', { name: 'Create Task' })

    fireEvent.change(titleInput, { target: { value: 'Test Task' } })
    fireEvent.change(descriptionInput, {
      target: { value: 'Test Description' },
    })

    // Submit the form
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith({
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        priority: 'medium',
        userId: 'user-1',
      })
    })
  })

  it('switches between tabs correctly', () => {
    render(
      <TestWrapper>
        <DatabaseObservabilityDemo />
      </TestWrapper>
    )

    // Click on Collaboration tab
    const collaborationTab = screen.getByRole('tab', { name: 'Collaboration' })
    fireEvent.click(collaborationTab)

    // Should show collaboration content
    expect(screen.getByText('Real-Time Collaboration')).toBeInTheDocument()
    expect(
      screen.getByText('See how multiple users can work together with conflict resolution')
    ).toBeInTheDocument()

    // Click on Search tab
    const searchTab = screen.getByRole('tab', { name: 'Smart Search' })
    fireEvent.click(searchTab)

    // Should show search content
    expect(screen.getByText('Smart Search with WASM')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument()
  })

  it('displays performance metrics when available', async () => {
    render(
      <TestWrapper>
        <DatabaseObservabilityDemo />
      </TestWrapper>
    )

    // Wait for WASM status to load
    await waitFor(() => {
      expect(screen.getByTestId('wasm-optimization-status')).toBeInTheDocument()
    })

    // Check for performance monitor
    expect(screen.getByTestId('query-performance-monitor')).toBeInTheDocument()
  })

  it('handles metrics toggle', () => {
    render(
      <TestWrapper>
        <DatabaseObservabilityDemo />
      </TestWrapper>
    )

    // Find the metrics toggle button
    const metricsButton = screen.getByRole('button', { name: 'Hide Metrics' })
    expect(metricsButton).toBeInTheDocument()

    // Click to hide metrics
    fireEvent.click(metricsButton)

    // Button text should change
    expect(screen.getByRole('button', { name: 'Show Metrics' })).toBeInTheDocument()
  })
})
