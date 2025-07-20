import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { AgentNode } from '../agent-node'
import type { NodeProps } from '@xyflow/react'
import type { AgentNodeData } from '../agent-node'

// Mock React Flow components
jest.mock('@xyflow/react', () => ({
  Handle: () => <div data-testid="handle">Handle Mock</div>,
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left',
  },
}))

const createMockNodeProps = (overrides: Partial<AgentNodeData> = {}): NodeProps<AgentNodeData> => ({
  id: 'test-agent',
  data: {
    agent: {
      id: 'agent-1',
      name: 'Test Agent',
      type: 'coder',
      provider: 'claude',
      status: 'busy',
      capabilities: ['TypeScript', 'React', 'Node.js'],
      ...overrides.agent,
    },
    metrics: {
      totalTasks: 10,
      completedTasks: 8,
      failedTasks: 2,
      averageResponseTime: 1250,
      cpuUsage: 75,
      memoryUsage: 60,
      ...overrides.metrics,
    },
    currentTask: {
      id: 'task-1',
      name: 'Implement feature',
      progress: 65,
      estimatedCompletion: new Date('2024-01-01T12:00:00Z'),
      ...overrides.currentTask,
    },
  },
  type: 'agent',
  position: { x: 0, y: 0 },
  selected: false,
  zIndex: 1,
  isConnectable: true,
  xPos: 0,
  yPos: 0,
  dragging: false,
})

describe('AgentNode', () => {
  it('renders agent information correctly', () => {
    const props = createMockNodeProps()
    render(<AgentNode {...props} />)

    expect(screen.getByText('Test Agent')).toBeInTheDocument()
    expect(screen.getByText('claude')).toBeInTheDocument()
    expect(screen.getByText('coder')).toBeInTheDocument()
    expect(screen.getByText('3 capabilities')).toBeInTheDocument()
  })

  it('displays current task when agent is busy', () => {
    const props = createMockNodeProps({
      agent: { status: 'busy' },
      currentTask: {
        id: 'task-1',
        name: 'Building new feature',
        progress: 75,
        estimatedCompletion: new Date('2024-01-01T12:00:00Z'),
      },
    })
    render(<AgentNode {...props} />)

    expect(screen.getByText('Current Task')).toBeInTheDocument()
    expect(screen.getByText('Building new feature')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('does not show current task when agent is idle', () => {
    const props = createMockNodeProps({
      agent: { status: 'idle' },
      currentTask: undefined,
    })
    render(<AgentNode {...props} />)

    expect(screen.queryByText('Current Task')).not.toBeInTheDocument()
  })

  it('displays correct status icons', () => {
    const statusTests = [
      { status: 'idle' as const, expectedClass: 'text-yellow-500' },
      { status: 'busy' as const, expectedClass: 'text-green-500' },
      { status: 'error' as const, expectedClass: 'text-red-500' },
      { status: 'terminated' as const, expectedClass: 'text-gray-500' },
    ]

    statusTests.forEach(({ status, expectedClass }) => {
      const props = createMockNodeProps({ agent: { status } })
      const { container } = render(<AgentNode {...props} />)

      const statusIcon = container.querySelector(`svg.${expectedClass}`)
      expect(statusIcon).toBeInTheDocument()
    })
  })

  it('calculates and displays success rate correctly', () => {
    const props = createMockNodeProps({
      metrics: {
        totalTasks: 20,
        completedTasks: 18,
        failedTasks: 2,
        averageResponseTime: 1000,
        cpuUsage: 50,
        memoryUsage: 40,
      },
    })
    render(<AgentNode {...props} />)

    expect(screen.getByText('90.0% success')).toBeInTheDocument()
  })

  it('handles zero total tasks gracefully', () => {
    const props = createMockNodeProps({
      metrics: {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageResponseTime: 0,
        cpuUsage: 0,
        memoryUsage: 0,
      },
    })
    render(<AgentNode {...props} />)

    expect(screen.getByText('0% success')).toBeInTheDocument()
  })

  it('applies selected styling when selected', () => {
    const props = { ...createMockNodeProps(), selected: true }
    const { container } = render(<AgentNode {...props} />)

    const card = container.querySelector('.ring-2')
    expect(card).toBeInTheDocument()
  })

  it('displays performance metrics', () => {
    const props = createMockNodeProps()
    render(<AgentNode {...props} />)

    expect(screen.getByText('1250ms avg')).toBeInTheDocument()
    expect(screen.getByText('75% CPU')).toBeInTheDocument()
    expect(screen.getByText('60% memory')).toBeInTheDocument()
  })

  it('displays task statistics', () => {
    const props = createMockNodeProps()
    render(<AgentNode {...props} />)

    expect(screen.getByText('8 completed')).toBeInTheDocument()
    expect(screen.getByText('2 failed')).toBeInTheDocument()
    expect(screen.getByText('10 total')).toBeInTheDocument()
  })

  it('renders handles for connections', () => {
    const props = createMockNodeProps()
    render(<AgentNode {...props} />)

    const handles = screen.getAllByTestId('handle')
    expect(handles).toHaveLength(2) // Input and output handles
  })
})
