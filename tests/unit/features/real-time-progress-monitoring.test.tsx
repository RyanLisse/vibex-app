/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Components to be implemented
import { ProgressDashboard } from '@/components/features/progress/progress-dashboard'
import { TaskProgressCard } from '@/components/features/progress/task-progress-card'
import { ProgressIndicator } from '@/components/features/progress/progress-indicator'
import { AlertSystem } from '@/components/features/progress/alert-system'

// Types
import type { TaskProgress, ProgressMetrics } from '@/src/schemas/enhanced-task-schemas'

// Mock WebSocket for real-time updates
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
}

global.WebSocket = vi.fn(() => mockWebSocket) as any

// Mock data
const mockTaskProgress: TaskProgress[] = [
  {
    taskId: 'task-1',
    status: 'in_progress',
    completionPercentage: 75,
    timeSpent: 120, // 2 hours
    estimatedTimeRemaining: 30, // 30 minutes
    lastUpdated: new Date(),
    isOverdue: false,
    isBlocked: false,
  },
  {
    taskId: 'task-2',
    status: 'in_progress',
    completionPercentage: 25,
    timeSpent: 300, // 5 hours
    estimatedTimeRemaining: 180, // 3 hours
    lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    isOverdue: true,
    isBlocked: false,
  },
  {
    taskId: 'task-3',
    status: 'in_progress',
    completionPercentage: 10,
    timeSpent: 60, // 1 hour
    estimatedTimeRemaining: 0,
    lastUpdated: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    isOverdue: false,
    isBlocked: true,
  },
]

const mockProgressMetrics: ProgressMetrics = {
  totalTasks: 10,
  completedTasks: 4,
  inProgressTasks: 3,
  overdueTasks: 1,
  averageCompletionTime: 240, // 4 hours
}

describe('Real-time Progress Monitoring Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('ProgressDashboard', () => {
    it('should render progress dashboard with metrics', () => {
      render(
        <ProgressDashboard 
          taskProgress={mockTaskProgress}
          metrics={mockProgressMetrics}
        />
      )
      
      expect(screen.getByText('Progress Dashboard')).toBeInTheDocument()
      expect(screen.getByText('10 Total Tasks')).toBeInTheDocument()
      expect(screen.getByText('4 Completed')).toBeInTheDocument()
      expect(screen.getByText('3 In Progress')).toBeInTheDocument()
      expect(screen.getByText('1 Overdue')).toBeInTheDocument()
    })

    it('should display real-time progress indicators', () => {
      render(
        <ProgressDashboard 
          taskProgress={mockTaskProgress}
          metrics={mockProgressMetrics}
        />
      )
      
      // Should show progress for each task
      expect(screen.getByText('75%')).toBeInTheDocument()
      expect(screen.getByText('25%')).toBeInTheDocument()
      expect(screen.getByText('10%')).toBeInTheDocument()
    })

    it('should update progress without page refresh', async () => {
      const { rerender } = render(
        <ProgressDashboard 
          taskProgress={mockTaskProgress}
          metrics={mockProgressMetrics}
        />
      )
      
      // Simulate real-time update
      const updatedProgress = mockTaskProgress.map(task => 
        task.taskId === 'task-1' 
          ? { ...task, completionPercentage: 90 }
          : task
      )
      
      rerender(
        <ProgressDashboard 
          taskProgress={updatedProgress}
          metrics={mockProgressMetrics}
        />
      )
      
      expect(screen.getByText('90%')).toBeInTheDocument()
      expect(screen.queryByText('75%')).not.toBeInTheDocument()
    })

    it('should highlight overdue tasks', () => {
      render(
        <ProgressDashboard 
          taskProgress={mockTaskProgress}
          metrics={mockProgressMetrics}
        />
      )
      
      const overdueTask = screen.getByTestId('task-progress-task-2')
      expect(overdueTask).toHaveClass('overdue')
      expect(overdueTask).toContainElement(screen.getByTestId('overdue-warning'))
    })

    it('should flag potentially blocked tasks', () => {
      render(
        <ProgressDashboard 
          taskProgress={mockTaskProgress}
          metrics={mockProgressMetrics}
        />
      )
      
      const blockedTask = screen.getByTestId('task-progress-task-3')
      expect(blockedTask).toHaveClass('blocked')
      expect(blockedTask).toContainElement(screen.getByTestId('blocked-indicator'))
    })

    it('should show individual contributor progress', () => {
      const progressWithAssignees = mockTaskProgress.map((task, index) => ({
        ...task,
        assignee: ['John Doe', 'Jane Smith', 'Bob Wilson'][index],
      }))
      
      render(
        <ProgressDashboard 
          taskProgress={progressWithAssignees}
          metrics={mockProgressMetrics}
        />
      )
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    })
  })

  describe('TaskProgressCard', () => {
    const taskProgress = mockTaskProgress[0]
    
    it('should render task progress card with all information', () => {
      render(
        <TaskProgressCard 
          progress={taskProgress}
          taskTitle="Fix login bug"
        />
      )
      
      expect(screen.getByText('Fix login bug')).toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument()
      expect(screen.getByText('2h spent')).toBeInTheDocument()
      expect(screen.getByText('30m remaining')).toBeInTheDocument()
    })

    it('should show completion percentage with visual indicator', () => {
      render(
        <TaskProgressCard 
          progress={taskProgress}
          taskTitle="Fix login bug"
        />
      )
      
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '75')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('should display time tracking information', () => {
      render(
        <TaskProgressCard 
          progress={taskProgress}
          taskTitle="Fix login bug"
        />
      )
      
      expect(screen.getByText(/2h spent/i)).toBeInTheDocument()
      expect(screen.getByText(/30m remaining/i)).toBeInTheDocument()
    })

    it('should show overdue warning when task is overdue', () => {
      const overdueProgress = { ...taskProgress, isOverdue: true }
      
      render(
        <TaskProgressCard 
          progress={overdueProgress}
          taskTitle="Overdue task"
        />
      )
      
      expect(screen.getByTestId('overdue-warning')).toBeInTheDocument()
      expect(screen.getByText(/overdue/i)).toBeInTheDocument()
    })

    it('should show blocked indicator when task is blocked', () => {
      const blockedProgress = { ...taskProgress, isBlocked: true }
      
      render(
        <TaskProgressCard 
          progress={blockedProgress}
          taskTitle="Blocked task"
        />
      )
      
      expect(screen.getByTestId('blocked-indicator')).toBeInTheDocument()
      expect(screen.getByText(/blocked/i)).toBeInTheDocument()
    })

    it('should allow manual progress updates', async () => {
      const mockOnProgressUpdate = vi.fn()
      
      render(
        <TaskProgressCard 
          progress={taskProgress}
          taskTitle="Fix login bug"
          onProgressUpdate={mockOnProgressUpdate}
        />
      )
      
      const updateButton = screen.getByText(/update progress/i)
      await userEvent.click(updateButton)
      
      // Should open update modal
      expect(screen.getByText(/update task progress/i)).toBeInTheDocument()
      
      // Update completion percentage
      const progressInput = screen.getByLabelText(/completion/i)
      await userEvent.clear(progressInput)
      await userEvent.type(progressInput, '85')
      
      const saveButton = screen.getByText(/save/i)
      await userEvent.click(saveButton)
      
      expect(mockOnProgressUpdate).toHaveBeenCalledWith({
        taskId: 'task-1',
        completionPercentage: 85,
      })
    })
  })

  describe('ProgressIndicator', () => {
    it('should render circular progress indicator', () => {
      render(
        <ProgressIndicator 
          percentage={75}
          size="large"
          color="blue"
        />
      )
      
      const progressIndicator = screen.getByRole('progressbar')
      expect(progressIndicator).toBeInTheDocument()
      expect(progressIndicator).toHaveAttribute('aria-valuenow', '75')
    })

    it('should show different colors based on progress', () => {
      const { rerender } = render(
        <ProgressIndicator percentage={25} />
      )
      
      expect(screen.getByTestId('progress-indicator')).toHaveClass('progress-low')
      
      rerender(<ProgressIndicator percentage={75} />)
      expect(screen.getByTestId('progress-indicator')).toHaveClass('progress-high')
      
      rerender(<ProgressIndicator percentage={100} />)
      expect(screen.getByTestId('progress-indicator')).toHaveClass('progress-complete')
    })

    it('should animate progress changes', async () => {
      const { rerender } = render(
        <ProgressIndicator percentage={0} animated />
      )
      
      rerender(<ProgressIndicator percentage={75} animated />)
      
      // Should have animation class
      expect(screen.getByTestId('progress-indicator')).toHaveClass('animated')
    })

    it('should support different sizes', () => {
      const { rerender } = render(
        <ProgressIndicator percentage={50} size="small" />
      )
      
      expect(screen.getByTestId('progress-indicator')).toHaveClass('size-small')
      
      rerender(<ProgressIndicator percentage={50} size="large" />)
      expect(screen.getByTestId('progress-indicator')).toHaveClass('size-large')
    })
  })

  describe('AlertSystem', () => {
    it('should show overdue task notifications', () => {
      render(
        <AlertSystem 
          taskProgress={mockTaskProgress}
          onDismiss={vi.fn()}
        />
      )
      
      expect(screen.getByText(/task is overdue/i)).toBeInTheDocument()
      expect(screen.getByTestId('overdue-alert')).toBeInTheDocument()
    })

    it('should show blocked task alerts', () => {
      render(
        <AlertSystem 
          taskProgress={mockTaskProgress}
          onDismiss={vi.fn()}
        />
      )
      
      expect(screen.getByText(/task appears to be blocked/i)).toBeInTheDocument()
      expect(screen.getByTestId('blocked-alert')).toBeInTheDocument()
    })

    it('should allow dismissing alerts', async () => {
      const mockOnDismiss = vi.fn()
      
      render(
        <AlertSystem 
          taskProgress={mockTaskProgress}
          onDismiss={mockOnDismiss}
        />
      )
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      await userEvent.click(dismissButton)
      
      expect(mockOnDismiss).toHaveBeenCalledWith('overdue-alert-task-2')
    })

    it('should group similar alerts', () => {
      const multipleOverdueTasks = [
        ...mockTaskProgress,
        {
          ...mockTaskProgress[1],
          taskId: 'task-4',
          isOverdue: true,
        },
      ]
      
      render(
        <AlertSystem 
          taskProgress={multipleOverdueTasks}
          onDismiss={vi.fn()}
        />
      )
      
      expect(screen.getByText(/2 tasks are overdue/i)).toBeInTheDocument()
    })

    it('should prioritize alerts by severity', () => {
      render(
        <AlertSystem 
          taskProgress={mockTaskProgress}
          onDismiss={vi.fn()}
        />
      )
      
      const alerts = screen.getAllByTestId(/alert/)
      // Blocked alerts should come before overdue alerts
      expect(alerts[0]).toHaveAttribute('data-testid', 'blocked-alert')
      expect(alerts[1]).toHaveAttribute('data-testid', 'overdue-alert')
    })
  })

  describe('WebSocket Real-time Updates', () => {
    it('should establish WebSocket connection for real-time updates', () => {
      render(
        <ProgressDashboard 
          taskProgress={mockTaskProgress}
          metrics={mockProgressMetrics}
          enableRealTime
        />
      )
      
      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3000/ws/progress')
    })

    it('should handle incoming progress updates', async () => {
      const { rerender } = render(
        <ProgressDashboard 
          taskProgress={mockTaskProgress}
          metrics={mockProgressMetrics}
          enableRealTime
        />
      )
      
      // Simulate WebSocket message
      const updateMessage = {
        type: 'PROGRESS_UPDATE',
        data: {
          taskId: 'task-1',
          completionPercentage: 85,
          timeSpent: 150,
        },
      }
      
      // Simulate message event
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')[1]
      
      messageHandler({ data: JSON.stringify(updateMessage) })
      
      // Should trigger re-render with updated data
      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument()
      })
    })

    it('should handle WebSocket connection errors gracefully', () => {
      render(
        <ProgressDashboard 
          taskProgress={mockTaskProgress}
          metrics={mockProgressMetrics}
          enableRealTime
        />
      )
      
      // Simulate connection error
      const errorHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'error')[1]
      
      errorHandler(new Error('Connection failed'))
      
      expect(screen.getByText(/real-time updates unavailable/i)).toBeInTheDocument()
    })

    it('should retry WebSocket connection on failure', async () => {
      render(
        <ProgressDashboard 
          taskProgress={mockTaskProgress}
          metrics={mockProgressMetrics}
          enableRealTime
        />
      )
      
      // Simulate connection close
      const closeHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'close')[1]
      
      closeHandler({ code: 1006 }) // Abnormal closure
      
      // Should attempt reconnection after delay
      vi.advanceTimersByTime(5000)
      
      await waitFor(() => {
        expect(global.WebSocket).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Time Tracking Integration', () => {
    it('should automatically track time spent on tasks', () => {
      vi.setSystemTime(new Date('2024-01-01 10:00:00'))
      
      render(
        <ProgressDashboard 
          taskProgress={mockTaskProgress}
          metrics={mockProgressMetrics}
          autoTimeTracking
        />
      )
      
      // Advance time by 1 hour
      vi.advanceTimersByTime(60 * 60 * 1000)
      
      // Should update time spent
      expect(screen.getByText(/3h spent/i)).toBeInTheDocument()
    })

    it('should estimate remaining time based on progress', () => {
      const taskWithEstimate = {
        ...mockTaskProgress[0],
        completionPercentage: 50,
        timeSpent: 120, // 2 hours
      }
      
      render(
        <TaskProgressCard 
          progress={taskWithEstimate}
          taskTitle="Task with estimate"
        />
      )
      
      // Should estimate remaining time: 2h more needed to complete
      expect(screen.getByText(/2h remaining/i)).toBeInTheDocument()
    })
  })

  describe('Performance Monitoring', () => {
    it('should calculate team productivity metrics', () => {
      render(
        <ProgressDashboard 
          taskProgress={mockTaskProgress}
          metrics={mockProgressMetrics}
        />
      )
      
      expect(screen.getByText(/4h average completion/i)).toBeInTheDocument()
      expect(screen.getByText(/70% team velocity/i)).toBeInTheDocument()
    })

    it('should identify productivity bottlenecks', () => {
      const bottleneckMetrics = {
        ...mockProgressMetrics,
        averageCompletionTime: 480, // 8 hours - high
        overdueTasks: 5, // High number of overdue tasks
      }
      
      render(
        <ProgressDashboard 
          taskProgress={mockTaskProgress}
          metrics={bottleneckMetrics}
        />
      )
      
      expect(screen.getByText(/productivity concern/i)).toBeInTheDocument()
      expect(screen.getByTestId('bottleneck-warning')).toBeInTheDocument()
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete progress monitoring workflow', async () => {
      const mockUpdateProgress = vi.fn()
      
      render(
        <div>
          <ProgressDashboard 
            taskProgress={mockTaskProgress}
            metrics={mockProgressMetrics}
            enableRealTime
          />
          <AlertSystem 
            taskProgress={mockTaskProgress}
            onDismiss={vi.fn()}
          />
        </div>
      )
      
      // Should show dashboard and alerts
      expect(screen.getByText('Progress Dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('overdue-alert')).toBeInTheDocument()
      
      // Update progress via real-time update
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')[1]
      
      messageHandler({ 
        data: JSON.stringify({
          type: 'PROGRESS_UPDATE',
          data: { taskId: 'task-2', completionPercentage: 100, isOverdue: false }
        })
      })
      
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument()
      })
    })
  })
})