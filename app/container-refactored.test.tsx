import { render, screen } from '@testing-library/react'
import React from 'react'
import Container from '@/app/container'

// Mock the hooks and components
mock('@/components/providers/realtime-provider', () => ({
  RealtimeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="realtime-provider">{children}</div>
  ),
}))

mock('@/components/providers/task-message-processor', () => ({
  TaskMessageProcessor: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="task-message-processor">{children}</div>
  ),
}))

mock('@/components/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}))

describe('Container Component (Refactored)', () => {
  beforeEach(() => {
    mock.restore()
  })

  it('renders children wrapped in provider components', () => {
    render(
      <Container>
        <div data-testid="test-child">Test Content</div>
      </Container>
    )

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
    expect(screen.getByTestId('realtime-provider')).toBeInTheDocument()
    expect(screen.getByTestId('task-message-processor')).toBeInTheDocument()
    expect(screen.getByTestId('test-child')).toBeInTheDocument()
  })

  it('maintains correct provider hierarchy', () => {
    render(
      <Container>
        <div data-testid="test-child">Test Content</div>
      </Container>
    )

    const errorBoundary = screen.getByTestId('error-boundary')
    const realtimeProvider = screen.getByTestId('realtime-provider')
    const taskMessageProcessor = screen.getByTestId('task-message-processor')
    const testChild = screen.getByTestId('test-child')

    // Check that the hierarchy is correct
    expect(errorBoundary).toContainElement(realtimeProvider)
    expect(realtimeProvider).toContainElement(taskMessageProcessor)
    expect(taskMessageProcessor).toContainElement(testChild)
  })

  it('is memoized and does not re-render unnecessarily', () => {
    const TestParent = () => {
      const [count, setCount] = React.useState(0)

      return (
        <div>
          <button onClick={() => setCount((c) => c + 1)}>Update Count</button>
          <span data-testid="count">{count}</span>
          <Container>
            <div data-testid="test-child">Test Content</div>
          </Container>
        </div>
      )
    }

    render(<TestParent />)

    const updateButton = screen.getByText('Update Count')
    const initialChild = screen.getByTestId('test-child')

    // Update parent state
    updateButton.click()

    // Container should not re-render due to memoization
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    expect(screen.getByTestId('test-child')).toBe(initialChild)
  })

  it('handles multiple children correctly', () => {
    render(
      <Container>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
      </Container>
    )

    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
    expect(screen.getByTestId('child-3')).toBeInTheDocument()
  })

  it('renders without children', () => {
    render(<Container>{null}</Container>)

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
    expect(screen.getByTestId('realtime-provider')).toBeInTheDocument()
    expect(screen.getByTestId('task-message-processor')).toBeInTheDocument()
  })
})
