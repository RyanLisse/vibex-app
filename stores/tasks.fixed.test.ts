import { afterEach, beforeEach, describe, expect, it, mock, spyOn, test } from 'bun:test'
import type { Task } from '@/stores/tasks'
import { useTaskStore } from '@/stores/tasks'

// Mock crypto.randomUUID for consistent testing
let uuidCounter = 0
const mockRandomUUID = mock(() => `test-uuid-${++uuidCounter}`)
globalThis.crypto = {
  ...globalThis.crypto,
  randomUUID: mockRandomUUID,
}

describe('useTaskStore', () => {
  beforeEach(() => {
    // Clear store state before each test
    useTaskStore.getState().clear()
    mockRandomUUID.mockClear()
    uuidCounter = 0
  })

  afterEach(() => {
    // Clean up after each test
    useTaskStore.getState().clear()
  })

  describe('initial state', () => {
    it('should have empty tasks array', () => {
      const state = useTaskStore.getState()
      expect(state.tasks).toEqual([])
    })
  })

  describe('addTask', () => {
    it('should add a new task with generated id and timestamps', () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      }

      const result = useTaskStore.getState().addTask(taskData)

      expect(result.id).toBe('test-uuid-1')
      expect(result.title).toBe('Test Task')
      expect(result.description).toBe('Test description')
      expect(result.status).toBe('IN_PROGRESS')
      expect(result.isArchived).toBe(false)
      expect(result.createdAt).toBeDefined()
      expect(result.updatedAt).toBeDefined()
      expect(result.createdAt).toBe(result.updatedAt)

      const state = useTaskStore.getState()
      expect(state.tasks).toHaveLength(1)
      expect(state.tasks[0]).toEqual(result)
    })

    it('should add multiple tasks', () => {
      const task1Data = {
        title: 'Task 1',
        description: 'Description 1',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'repo-1',
        mode: 'code' as const,
        hasChanges: false,
      }

      const task2Data = {
        title: 'Task 2',
        description: 'Description 2',
        messages: [],
        status: 'DONE' as const,
        branch: 'feature',
        sessionId: 'session-2',
        repository: 'repo-2',
        mode: 'ask' as const,
        hasChanges: true,
      }

      const task1 = useTaskStore.getState().addTask(task1Data)
      const task2 = useTaskStore.getState().addTask(task2Data)

      const state = useTaskStore.getState()
      expect(state.tasks).toHaveLength(2)
      expect(state.tasks[0]).toEqual(task1)
      expect(state.tasks[1]).toEqual(task2)
    })

    it('should handle tasks with pullRequest data', () => {
      const taskData = {
        title: 'PR Task',
        description: 'Task with PR',
        messages: [{ role: 'user' as const, type: 'text', data: { content: 'test' } }],
        status: 'MERGED' as const,
        branch: 'feature-branch',
        sessionId: 'session-pr',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: true,
        pullRequest: {
          number: 123,
          url: 'https://github.com/test/repo/pull/123',
          title: 'Test PR',
          state: 'open',
        },
      }

      const result = useTaskStore.getState().addTask(taskData)

      expect(result.pullRequest).toEqual({
        number: 123,
        url: 'https://github.com/test/repo/pull/123',
        title: 'Test PR',
        state: 'open',
      })
    })
  })

  describe('updateTask', () => {
    it('should update an existing task', () => {
      const taskData = {
        title: 'Original Task',
        description: 'Original description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      }

      const task = useTaskStore.getState().addTask(taskData)

      const updates = {
        title: 'Updated Task',
        status: 'DONE' as const,
        hasChanges: true,
        statusMessage: 'Task completed successfully',
      }

      useTaskStore.getState().updateTask(task.id, updates)

      const state = useTaskStore.getState()
      const updatedTask = state.tasks[0]

      expect(updatedTask.title).toBe('Updated Task')
      expect(updatedTask.status).toBe('DONE')
      expect(updatedTask.hasChanges).toBe(true)
      expect(updatedTask.statusMessage).toBe('Task completed successfully')
      expect(updatedTask.description).toBe('Original description') // unchanged
      expect(updatedTask.createdAt).toBe(task.createdAt) // unchanged
      expect(updatedTask.updatedAt).toBeDefined()
    })

    it('should handle updating non-existent task gracefully', () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      }

      const task = useTaskStore.getState().addTask(taskData)

      // Try to update non-existent task
      useTaskStore.getState().updateTask('non-existent-id', { title: 'Updated' })

      const state = useTaskStore.getState()
      expect(state.tasks).toHaveLength(1)
      expect(state.tasks[0].title).toBe('Test Task') // unchanged
    })

    it('should update pullRequest data', () => {
      const taskData = {
        title: 'PR Task',
        description: 'Task description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'feature',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: true,
      }

      const task = useTaskStore.getState().addTask(taskData)

      const prUpdate = {
        pullRequest: {
          number: 456,
          url: 'https://github.com/test/repo/pull/456',
          title: 'Updated PR',
          state: 'merged',
        },
      }

      useTaskStore.getState().updateTask(task.id, prUpdate)

      const state = useTaskStore.getState()
      expect(state.tasks[0].pullRequest).toEqual(prUpdate.pullRequest)
    })
  })

  describe('setTasks', () => {
    it('should replace all tasks', () => {
      // Add initial task
      useTaskStore.getState().addTask({
        title: 'Initial Task',
        description: 'Initial description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const newTasks: Task[] = [
        {
          id: 'task-1',
          title: 'New Task 1',
          description: 'Description 1',
          messages: [],
          status: 'DONE' as const,
          branch: 'main',
          sessionId: 'session-2',
          repository: 'new-repo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isArchived: false,
          mode: 'ask' as const,
          hasChanges: true,
        },
        {
          id: 'task-2',
          title: 'New Task 2',
          description: 'Description 2',
          messages: [],
          status: 'PAUSED' as const,
          branch: 'feature',
          sessionId: 'session-3',
          repository: 'new-repo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isArchived: false,
          mode: 'code' as const,
          hasChanges: false,
        },
      ]

      useTaskStore.getState().setTasks(newTasks)

      const state = useTaskStore.getState()
      expect(state.tasks).toEqual(newTasks)
      expect(state.tasks).toHaveLength(2)
    })

    it('should handle empty tasks array', () => {
      // Add initial tasks
      useTaskStore.getState().addTask({
        title: 'Task 1',
        description: 'Description 1',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      useTaskStore.getState().setTasks([])

      const state = useTaskStore.getState()
      expect(state.tasks).toEqual([])
    })
  })

  describe('removeTask', () => {
    it('should remove task by id', () => {
      const task1 = useTaskStore.getState().addTask({
        title: 'Task 1',
        description: 'Description 1',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const task2 = useTaskStore.getState().addTask({
        title: 'Task 2',
        description: 'Description 2',
        messages: [],
        status: 'DONE' as const,
        branch: 'feature',
        sessionId: 'session-2',
        repository: 'test-repo',
        mode: 'ask' as const,
        hasChanges: true,
      })

      useTaskStore.getState().removeTask(task1.id)

      const state = useTaskStore.getState()
      expect(state.tasks).toHaveLength(1)
      expect(state.tasks[0].id).toBe(task2.id)
    })

    it('should handle removing non-existent task', () => {
      const task = useTaskStore.getState().addTask({
        title: 'Test Task',
        description: 'Test description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      useTaskStore.getState().removeTask('non-existent-id')

      const state = useTaskStore.getState()
      expect(state.tasks).toHaveLength(1)
      expect(state.tasks[0]).toEqual(task)
    })
  })

  describe('archiveTask', () => {
    it('should archive a task', () => {
      const task = useTaskStore.getState().addTask({
        title: 'Task to Archive',
        description: 'Description',
        messages: [],
        status: 'DONE' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      useTaskStore.getState().archiveTask(task.id)

      const state = useTaskStore.getState()
      const archivedTask = state.tasks[0]

      expect(archivedTask.isArchived).toBe(true)
      expect(archivedTask.id).toBe(task.id)
      expect(archivedTask.title).toBe(task.title) // other fields unchanged
      expect(archivedTask.updatedAt).toBeDefined()
    })

    it('should handle archiving non-existent task', () => {
      const task = useTaskStore.getState().addTask({
        title: 'Test Task',
        description: 'Test description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      useTaskStore.getState().archiveTask('non-existent-id')

      const state = useTaskStore.getState()
      expect(state.tasks[0].isArchived).toBe(false) // unchanged
    })
  })

  describe('unarchiveTask', () => {
    it('should unarchive a task', () => {
      const task = useTaskStore.getState().addTask({
        title: 'Archived Task',
        description: 'Description',
        messages: [],
        status: 'DONE' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      // First archive it
      useTaskStore.getState().archiveTask(task.id)
      expect(useTaskStore.getState().tasks[0].isArchived).toBe(true)

      // Then unarchive it
      useTaskStore.getState().unarchiveTask(task.id)

      const state = useTaskStore.getState()
      const unarchivedTask = state.tasks[0]

      expect(unarchivedTask.isArchived).toBe(false)
      expect(unarchivedTask.id).toBe(task.id)
      expect(unarchivedTask.updatedAt).toBeDefined()
    })

    it('should handle unarchiving non-existent task', () => {
      const task = useTaskStore.getState().addTask({
        title: 'Test Task',
        description: 'Test description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      useTaskStore.getState().unarchiveTask('non-existent-id')

      const state = useTaskStore.getState()
      expect(state.tasks[0].isArchived).toBe(false) // unchanged
    })
  })

  describe('pauseTask', () => {
    it('should pause a task', () => {
      const task = useTaskStore.getState().addTask({
        title: 'Running Task',
        description: 'Description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      useTaskStore.getState().pauseTask(task.id)

      const state = useTaskStore.getState()
      const pausedTask = state.tasks[0]

      expect(pausedTask.status).toBe('PAUSED')
      expect(pausedTask.statusMessage).toBe('Task paused')
      expect(pausedTask.id).toBe(task.id)
      expect(pausedTask.updatedAt).toBeDefined()
    })

    it('should handle pausing non-existent task', () => {
      const task = useTaskStore.getState().addTask({
        title: 'Test Task',
        description: 'Test description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      useTaskStore.getState().pauseTask('non-existent-id')

      const state = useTaskStore.getState()
      expect(state.tasks[0].status).toBe('IN_PROGRESS') // unchanged
    })
  })

  describe('resumeTask', () => {
    it('should resume a paused task', () => {
      const task = useTaskStore.getState().addTask({
        title: 'Paused Task',
        description: 'Description',
        messages: [],
        status: 'PAUSED' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      useTaskStore.getState().resumeTask(task.id)

      const state = useTaskStore.getState()
      const resumedTask = state.tasks[0]

      expect(resumedTask.status).toBe('IN_PROGRESS')
      expect(resumedTask.statusMessage).toBe('Task resumed')
      expect(resumedTask.id).toBe(task.id)
      expect(resumedTask.updatedAt).toBeDefined()
    })

    it('should handle resuming non-existent task', () => {
      const task = useTaskStore.getState().addTask({
        title: 'Test Task',
        description: 'Test description',
        messages: [],
        status: 'PAUSED' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      useTaskStore.getState().resumeTask('non-existent-id')

      const state = useTaskStore.getState()
      expect(state.tasks[0].status).toBe('PAUSED') // unchanged
    })
  })

  describe('cancelTask', () => {
    it('should cancel a task', () => {
      const task = useTaskStore.getState().addTask({
        title: 'Running Task',
        description: 'Description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      useTaskStore.getState().cancelTask(task.id)

      const state = useTaskStore.getState()
      const cancelledTask = state.tasks[0]

      expect(cancelledTask.status).toBe('CANCELLED')
      expect(cancelledTask.statusMessage).toBe('Task cancelled')
      expect(cancelledTask.id).toBe(task.id)
      expect(cancelledTask.updatedAt).toBeDefined()
    })

    it('should handle cancelling non-existent task', () => {
      const task = useTaskStore.getState().addTask({
        title: 'Test Task',
        description: 'Test description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      useTaskStore.getState().cancelTask('non-existent-id')

      const state = useTaskStore.getState()
      expect(state.tasks[0].status).toBe('IN_PROGRESS') // unchanged
    })
  })

  describe('clear', () => {
    it('should clear all tasks', () => {
      useTaskStore.getState().addTask({
        title: 'Task 1',
        description: 'Description 1',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      useTaskStore.getState().addTask({
        title: 'Task 2',
        description: 'Description 2',
        messages: [],
        status: 'DONE' as const,
        branch: 'feature',
        sessionId: 'session-2',
        repository: 'test-repo',
        mode: 'ask' as const,
        hasChanges: true,
      })

      expect(useTaskStore.getState().tasks).toHaveLength(2)

      useTaskStore.getState().clear()

      const state = useTaskStore.getState()
      expect(state.tasks).toEqual([])
    })

    it('should handle clearing empty store', () => {
      expect(useTaskStore.getState().tasks).toEqual([])

      useTaskStore.getState().clear()

      const state = useTaskStore.getState()
      expect(state.tasks).toEqual([])
    })
  })

  describe('getTasks', () => {
    it('should return all tasks', () => {
      const task1 = useTaskStore.getState().addTask({
        title: 'Task 1',
        description: 'Description 1',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const task2 = useTaskStore.getState().addTask({
        title: 'Task 2',
        description: 'Description 2',
        messages: [],
        status: 'DONE' as const,
        branch: 'feature',
        sessionId: 'session-2',
        repository: 'test-repo',
        mode: 'ask' as const,
        hasChanges: true,
      })

      const tasks = useTaskStore.getState().getTasks()

      expect(tasks).toHaveLength(2)
      expect(tasks[0]).toEqual(task1)
      expect(tasks[1]).toEqual(task2)
    })

    it('should return empty array when no tasks', () => {
      const tasks = useTaskStore.getState().getTasks()
      expect(tasks).toEqual([])
    })
  })

  describe('getActiveTasks', () => {
    it('should return only non-archived tasks in reverse order', () => {
      const task1 = useTaskStore.getState().addTask({
        title: 'Task 1',
        description: 'Description 1',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const task2 = useTaskStore.getState().addTask({
        title: 'Task 2',
        description: 'Description 2',
        messages: [],
        status: 'DONE' as const,
        branch: 'feature',
        sessionId: 'session-2',
        repository: 'test-repo',
        mode: 'ask' as const,
        hasChanges: true,
      })

      const task3 = useTaskStore.getState().addTask({
        title: 'Task 3',
        description: 'Description 3',
        messages: [],
        status: 'PAUSED' as const,
        branch: 'hotfix',
        sessionId: 'session-3',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      // Archive task2
      useTaskStore.getState().archiveTask(task2.id)

      const activeTasks = useTaskStore.getState().getActiveTasks()

      expect(activeTasks).toHaveLength(2)
      // Should be in reverse order (newest first)
      expect(activeTasks[0].id).toBe(task3.id)
      expect(activeTasks[1].id).toBe(task1.id)
      expect(activeTasks.every(task => !task.isArchived)).toBe(true)
    })

    it('should return empty array when all tasks are archived', () => {
      const task = useTaskStore.getState().addTask({
        title: 'Task',
        description: 'Description',
        messages: [],
        status: 'DONE' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      useTaskStore.getState().archiveTask(task.id)

      const activeTasks = useTaskStore.getState().getActiveTasks()
      expect(activeTasks).toEqual([])
    })
  })

  describe('getArchivedTasks', () => {
    it('should return only archived tasks', () => {
      const task1 = useTaskStore.getState().addTask({
        title: 'Task 1',
        description: 'Description 1',
        messages: [],
        status: 'DONE' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const task2 = useTaskStore.getState().addTask({
        title: 'Task 2',
        description: 'Description 2',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'feature',
        sessionId: 'session-2',
        repository: 'test-repo',
        mode: 'ask' as const,
        hasChanges: true,
      })

      const task3 = useTaskStore.getState().addTask({
        title: 'Task 3',
        description: 'Description 3',
        messages: [],
        status: 'CANCELLED' as const,
        branch: 'hotfix',
        sessionId: 'session-3',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      // Archive task1 and task3
      useTaskStore.getState().archiveTask(task1.id)
      useTaskStore.getState().archiveTask(task3.id)

      const archivedTasks = useTaskStore.getState().getArchivedTasks()

      expect(archivedTasks).toHaveLength(2)
      expect(archivedTasks.every(task => task.isArchived)).toBe(true)
      expect(archivedTasks.map(t => t.id)).toContain(task1.id)
      expect(archivedTasks.map(t => t.id)).toContain(task3.id)
      expect(archivedTasks.map(t => t.id)).not.toContain(task2.id)
    })

    it('should return empty array when no tasks are archived', () => {
      useTaskStore.getState().addTask({
        title: 'Active Task',
        description: 'Description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const archivedTasks = useTaskStore.getState().getArchivedTasks()
      expect(archivedTasks).toEqual([])
    })
  })

  describe('getTaskById', () => {
    it('should return task by id', () => {
      const task1 = useTaskStore.getState().addTask({
        title: 'Task 1',
        description: 'Description 1',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const task2 = useTaskStore.getState().addTask({
        title: 'Task 2',
        description: 'Description 2',
        messages: [],
        status: 'DONE' as const,
        branch: 'feature',
        sessionId: 'session-2',
        repository: 'test-repo',
        mode: 'ask' as const,
        hasChanges: true,
      })

      const foundTask = useTaskStore.getState().getTaskById(task2.id)
      expect(foundTask).toEqual(task2)

      const foundTask1 = useTaskStore.getState().getTaskById(task1.id)
      expect(foundTask1).toEqual(task1)
    })

    it('should return undefined for non-existent task', () => {
      useTaskStore.getState().addTask({
        title: 'Test Task',
        description: 'Description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const foundTask = useTaskStore.getState().getTaskById('non-existent-id')
      expect(foundTask).toBeUndefined()
    })

    it('should return undefined when store is empty', () => {
      const foundTask = useTaskStore.getState().getTaskById('any-id')
      expect(foundTask).toBeUndefined()
    })
  })

  describe('getTasksByStatus', () => {
    it('should return tasks by status', () => {
      const inProgressTask = useTaskStore.getState().addTask({
        title: 'In Progress Task',
        description: 'Description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const doneTask1 = useTaskStore.getState().addTask({
        title: 'Done Task 1',
        description: 'Description',
        messages: [],
        status: 'DONE' as const,
        branch: 'feature',
        sessionId: 'session-2',
        repository: 'test-repo',
        mode: 'ask' as const,
        hasChanges: true,
      })

      const doneTask2 = useTaskStore.getState().addTask({
        title: 'Done Task 2',
        description: 'Description',
        messages: [],
        status: 'DONE' as const,
        branch: 'hotfix',
        sessionId: 'session-3',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const pausedTask = useTaskStore.getState().addTask({
        title: 'Paused Task',
        description: 'Description',
        messages: [],
        status: 'PAUSED' as const,
        branch: 'experimental',
        sessionId: 'session-4',
        repository: 'test-repo',
        mode: 'ask' as const,
        hasChanges: true,
      })

      const inProgressTasks = useTaskStore.getState().getTasksByStatus('IN_PROGRESS')
      expect(inProgressTasks).toHaveLength(1)
      expect(inProgressTasks[0]).toEqual(inProgressTask)

      const doneTasks = useTaskStore.getState().getTasksByStatus('DONE')
      expect(doneTasks).toHaveLength(2)
      expect(doneTasks.map(t => t.id)).toContain(doneTask1.id)
      expect(doneTasks.map(t => t.id)).toContain(doneTask2.id)

      const pausedTasks = useTaskStore.getState().getTasksByStatus('PAUSED')
      expect(pausedTasks).toHaveLength(1)
      expect(pausedTasks[0]).toEqual(pausedTask)

      const mergedTasks = useTaskStore.getState().getTasksByStatus('MERGED')
      expect(mergedTasks).toEqual([])

      const cancelledTasks = useTaskStore.getState().getTasksByStatus('CANCELLED')
      expect(cancelledTasks).toEqual([])
    })

    it('should return empty array for status with no tasks', () => {
      useTaskStore.getState().addTask({
        title: 'In Progress Task',
        description: 'Description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const cancelledTasks = useTaskStore.getState().getTasksByStatus('CANCELLED')
      expect(cancelledTasks).toEqual([])
    })
  })

  describe('getTasksBySessionId', () => {
    it('should return tasks by session id', () => {
      const task1 = useTaskStore.getState().addTask({
        title: 'Task 1',
        description: 'Description 1',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-A',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const task2 = useTaskStore.getState().addTask({
        title: 'Task 2',
        description: 'Description 2',
        messages: [],
        status: 'DONE' as const,
        branch: 'feature',
        sessionId: 'session-B',
        repository: 'test-repo',
        mode: 'ask' as const,
        hasChanges: true,
      })

      const task3 = useTaskStore.getState().addTask({
        title: 'Task 3',
        description: 'Description 3',
        messages: [],
        status: 'PAUSED' as const,
        branch: 'hotfix',
        sessionId: 'session-A',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const sessionATasks = useTaskStore.getState().getTasksBySessionId('session-A')
      expect(sessionATasks).toHaveLength(2)
      expect(sessionATasks.map(t => t.id)).toContain(task1.id)
      expect(sessionATasks.map(t => t.id)).toContain(task3.id)

      const sessionBTasks = useTaskStore.getState().getTasksBySessionId('session-B')
      expect(sessionBTasks).toHaveLength(1)
      expect(sessionBTasks[0]).toEqual(task2)

      const sessionCTasks = useTaskStore.getState().getTasksBySessionId('session-C')
      expect(sessionCTasks).toEqual([])
    })

    it('should return empty array for non-existent session', () => {
      useTaskStore.getState().addTask({
        title: 'Task',
        description: 'Description',
        messages: [],
        status: 'IN_PROGRESS' as const,
        branch: 'main',
        sessionId: 'session-1',
        repository: 'test-repo',
        mode: 'code' as const,
        hasChanges: false,
      })

      const tasks = useTaskStore.getState().getTasksBySessionId('non-existent-session')
      expect(tasks).toEqual([])
    })
  })
})