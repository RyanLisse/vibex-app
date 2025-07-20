import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VisualizationEngineWithProvider } from '../visualization-engine'

// Mock ReactFlow since it requires DOM APIs not available in test environment
jest.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-flow-provider">{children}</div>
  ),
  ReactFlow: () => <div data-testid="react-flow">React Flow Mock</div>,
  Controls: () => <div data-testid="controls">Controls Mock</div>,
  MiniMap: () => <div data-testid="minimap">MiniMap Mock</div>,
  Background: () => <div data-testid="background">Background Mock</div>,
  Panel: ({ children }: { children: React.ReactNode }) => <div data-testid="panel">{children}</div>,
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  useReactFlow: () => ({
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    fitView: jest.fn(),
  }),
  addEdge: jest.fn(),
  getBezierPath: () => ['M0,0 L100,100', 50, 50],
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Handle: () => <div data-testid="handle">Handle Mock</div>,
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left',
  },
}))

// Mock the ambient agent data hook
jest.mock('../../../hooks/ambient-agents/use-ambient-agent-data', () => ({
  useAmbientAgentData: () => ({
    agentData: [
      {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'coder',
        provider: 'claude',
        status: 'busy',
        capabilities: ['TypeScript', 'React'],
        metrics: {
          totalTasks: 10,
          completedTasks: 8,
          failedTasks: 2,
          averageResponseTime: 1000,
          cpuUsage: 50,
          memoryUsage: 40,
        },
      },
    ],
    taskData: {
      tasks: [],
      dependencies: [],
    },
    eventStream: [],
    memoryData: { namespaces: [] },
    communications: [],
    isLoading: false,
    error: null,
    connectionStatus: 'Open',
    refreshData: jest.fn(),
  }),
}))

// Mock the visualization state hook
jest.mock('../../../hooks/ambient-agents/use-visualization-state', () => ({
  useVisualizationState: () => ({
    visualizationState: {
      viewMode: 'agent-centric',
      layoutAlgorithm: 'force-directed',
      filters: {
        searchTerm: '',
        showInactive: true,
        showMetrics: true,
        nodeTypes: [],
        statusFilters: [],
      },
    },
    updateLayout: jest.fn(),
    applyFilters: jest.fn(),
    toggleNodeVisibility: jest.fn(),
    updateViewMode: jest.fn(),
  }),
}))

// Mock layout algorithms
jest.mock('../../../lib/ambient-agents/layout-algorithms', () => ({
  applyLayoutAlgorithm: (nodes: any[]) => nodes,
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('VisualizationEngine', () => {
  it('renders without crashing', () => {
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <VisualizationEngineWithProvider />
      </Wrapper>
    )

    expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument()
    expect(screen.getByTestId('react-flow')).toBeInTheDocument()
  })

  it('displays connection status', () => {
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <VisualizationEngineWithProvider />
      </Wrapper>
    )

    expect(screen.getByText('🟢 Connected')).toBeInTheDocument()
  })

  it('renders control panels', () => {
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <VisualizationEngineWithProvider showPerformanceMetrics={true} />
      </Wrapper>
    )

    // Should render visualization controls and performance monitor
    expect(screen.getAllByTestId('panel')).toHaveLength(2)
  })

  it('handles different view modes', () => {
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <VisualizationEngineWithProvider viewMode="task-centric" />
      </Wrapper>
    )

    expect(screen.getByTestId('react-flow')).toBeInTheDocument()
  })

  it('handles layout algorithm changes', () => {
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <VisualizationEngineWithProvider layoutAlgorithm="hierarchical" />
      </Wrapper>
    )

    expect(screen.getByTestId('react-flow')).toBeInTheDocument()
  })
})

describe('VisualizationEngine Error Handling', () => {
  beforeEach(() => {
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('displays error message when data loading fails', () => {
    // Mock the hook to return an error
    jest.doMock('../../../hooks/ambient-agents/use-ambient-agent-data', () => ({
      useAmbientAgentData: () => ({
        agentData: null,
        taskData: null,
        eventStream: [],
        memoryData: null,
        communications: [],
        isLoading: false,
        error: new Error('Failed to load data'),
        connectionStatus: 'Closed',
        refreshData: jest.fn(),
      }),
    }))

    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <VisualizationEngineWithProvider />
      </Wrapper>
    )

    expect(screen.getByText(/Error loading ambient agent data/)).toBeInTheDocument()
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
