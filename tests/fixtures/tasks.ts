import type { Task } from '@/stores/tasks'

export function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'mock-task-id',
    title: 'Mock Task',
    description: 'This is a mock task for testing',
    status: 'IN_PROGRESS',
    statusMessage: 'Task is in progress',
    sessionId: 'mock-session-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false,
    ...overrides,
  }
}

export function createMockTasks(count: number = 3): Task[] {
  return Array.from({ length: count }, (_, index) =>
    createMockTask({
      id: `mock-task-${index + 1}`,
      title: `Mock Task ${index + 1}`,
      description: `This is mock task number ${index + 1}`,
      status: index === 0 ? 'IN_PROGRESS' : index === 1 ? 'PAUSED' : 'DONE',
    })
  )
}

export const mockTaskInProgress = createMockTask({
  id: 'task-in-progress',
  title: 'Task In Progress',
  status: 'IN_PROGRESS',
  statusMessage: 'Currently working on this task',
})

export const mockTaskPaused = createMockTask({
  id: 'task-paused',
  title: 'Paused Task',
  status: 'PAUSED',
  statusMessage: 'Task has been paused',
})

export const mockTaskDone = createMockTask({
  id: 'task-done',
  title: 'Completed Task',
  status: 'DONE',
  statusMessage: 'Task completed successfully',
})

export const mockTaskCancelled = createMockTask({
  id: 'task-cancelled',
  title: 'Cancelled Task',
  status: 'CANCELLED',
  statusMessage: 'Task was cancelled',
})

export const mockTaskMerged = createMockTask({
  id: 'task-merged',
  title: 'Merged Task',
  status: 'MERGED',
  statusMessage: 'Task has been merged',
})
