import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Task } from './tasks'
import { useTaskStore } from './tasks'

describe('useTasksStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTasksStore.setState({
      tasks: [],
      currentTask: null,
      isLoading: false,
      error: null,
    })
  })

  describe('initial state', () => {
    it('should have default values', () => {
      const state = useTasksStore.getState()
      expect(state.tasks).toEqual([])
      expect(state.currentTask).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('setTasks', () => {
    it('should set tasks array', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: 'pending',
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
        },
        {
          id: 'task-2',
          title: 'Task 2',
          status: 'in_progress',
          created_at: new Date('2024-01-02'),
          updated_at: new Date('2024-01-02'),
        },
      ]

      act(() => {
        useTasksStore.getState().setTasks(tasks)
      })

      expect(useTasksStore.getState().tasks).toEqual(tasks)
    })

    it('should replace existing tasks', () => {
      const oldTasks: Task[] = [
        {
          id: 'old-1',
          title: 'Old Task',
          status: 'completed',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      const newTasks: Task[] = [
        {
          id: 'new-1',
          title: 'New Task',
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      act(() => {
        const store = useTasksStore.getState()
        store.setTasks(oldTasks)
        store.setTasks(newTasks)
      })

      expect(useTasksStore.getState().tasks).toEqual(newTasks)
    })
  })

  describe('addTask', () => {
    it('should add a new task', () => {
      const newTask: Task = {
        id: 'task-1',
        title: 'New Task',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        useTasksStore.getState().addTask(newTask)
      })

      const state = useTasksStore.getState()
      expect(state.tasks).toHaveLength(1)
      expect(state.tasks[0]).toEqual(newTask)
    })

    it('should add task to existing tasks', () => {
      const existingTask: Task = {
        id: 'task-1',
        title: 'Existing Task',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      }

      const newTask: Task = {
        id: 'task-2',
        title: 'New Task',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        const store = useTasksStore.getState()
        store.addTask(existingTask)
        store.addTask(newTask)
      })

      const state = useTasksStore.getState()
      expect(state.tasks).toHaveLength(2)
      expect(state.tasks[0]).toEqual(existingTask)
      expect(state.tasks[1]).toEqual(newTask)
    })
  })

  describe('updateTask', () => {
    it('should update an existing task', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Original Title',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        useTasksStore.getState().addTask(task)
      })

      act(() => {
        useTasksStore.getState().updateTask('task-1', {
          title: 'Updated Title',
          status: 'in_progress',
        })
      })

      const state = useTasksStore.getState()
      expect(state.tasks[0].title).toBe('Updated Title')
      expect(state.tasks[0].status).toBe('in_progress')
    })

    it('should handle updating non-existent task', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Task',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        useTasksStore.getState().addTask(task)
      })

      act(() => {
        useTasksStore.getState().updateTask('non-existent', { status: 'completed' })
      })

      const state = useTasksStore.getState()
      expect(state.tasks[0].status).toBe('pending') // unchanged
    })

    it('should update currentTask if it matches', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Current Task',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        const store = useTasksStore.getState()
        store.addTask(task)
        store.setCurrentTask(task)
      })

      act(() => {
        useTasksStore.getState().updateTask('task-1', { status: 'completed' })
      })

      const state = useTasksStore.getState()
      expect(state.currentTask?.status).toBe('completed')
    })
  })

  describe('removeTask', () => {
    it('should remove a task by id', () => {
      const task1: Task = {
        id: 'task-1',
        title: 'Task 1',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }

      const task2: Task = {
        id: 'task-2',
        title: 'Task 2',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        const store = useTasksStore.getState()
        store.addTask(task1)
        store.addTask(task2)
      })

      act(() => {
        useTasksStore.getState().removeTask('task-1')
      })

      const state = useTasksStore.getState()
      expect(state.tasks).toHaveLength(1)
      expect(state.tasks[0].id).toBe('task-2')
    })

    it('should clear currentTask if removed', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Task',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        const store = useTasksStore.getState()
        store.addTask(task)
        store.setCurrentTask(task)
      })

      act(() => {
        useTasksStore.getState().removeTask('task-1')
      })

      const state = useTasksStore.getState()
      expect(state.currentTask).toBeNull()
    })
  })

  describe('setCurrentTask', () => {
    it('should set current task', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Current Task',
        status: 'in_progress',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        useTasksStore.getState().setCurrentTask(task)
      })

      expect(useTasksStore.getState().currentTask).toEqual(task)
    })

    it('should clear current task', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Task',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        const store = useTasksStore.getState()
        store.setCurrentTask(task)
        store.setCurrentTask(null)
      })

      expect(useTasksStore.getState().currentTask).toBeNull()
    })
  })

  describe('setLoading', () => {
    it('should set loading state', () => {
      act(() => {
        useTasksStore.getState().setLoading(true)
      })

      expect(useTasksStore.getState().isLoading).toBe(true)

      act(() => {
        useTasksStore.getState().setLoading(false)
      })

      expect(useTasksStore.getState().isLoading).toBe(false)
    })
  })

  describe('setError', () => {
    it('should set error message', () => {
      act(() => {
        useTasksStore.getState().setError('Task failed')
      })

      expect(useTasksStore.getState().error).toBe('Task failed')
    })

    it('should clear error message', () => {
      act(() => {
        const store = useTasksStore.getState()
        store.setError('Error')
        store.setError(null)
      })

      expect(useTasksStore.getState().error).toBeNull()
    })
  })

  describe('getTaskById', () => {
    it('should return task by id', () => {
      const task1: Task = {
        id: 'task-1',
        title: 'Task 1',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }

      const task2: Task = {
        id: 'task-2',
        title: 'Task 2',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        const store = useTasksStore.getState()
        store.addTask(task1)
        store.addTask(task2)
      })

      const foundTask = useTasksStore.getState().getTaskById('task-2')
      expect(foundTask).toEqual(task2)
    })

    it('should return undefined for non-existent task', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Task',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        useTasksStore.getState().addTask(task)
      })

      const foundTask = useTasksStore.getState().getTaskById('non-existent')
      expect(foundTask).toBeUndefined()
    })
  })

  describe('getTasksByStatus', () => {
    it('should return tasks by status', () => {
      const pendingTask: Task = {
        id: 'task-1',
        title: 'Pending Task',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }

      const inProgressTask: Task = {
        id: 'task-2',
        title: 'In Progress Task',
        status: 'in_progress',
        created_at: new Date(),
        updated_at: new Date(),
      }

      const completedTask: Task = {
        id: 'task-3',
        title: 'Completed Task',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        const store = useTasksStore.getState()
        store.addTask(pendingTask)
        store.addTask(inProgressTask)
        store.addTask(completedTask)
      })

      const pendingTasks = useTasksStore.getState().getTasksByStatus('pending')
      expect(pendingTasks).toHaveLength(1)
      expect(pendingTasks[0].id).toBe('task-1')

      const completedTasks = useTasksStore.getState().getTasksByStatus('completed')
      expect(completedTasks).toHaveLength(1)
      expect(completedTasks[0].id).toBe('task-3')
    })

    it('should return empty array for status with no tasks', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Task',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        useTasksStore.getState().addTask(task)
      })

      const failedTasks = useTasksStore.getState().getTasksByStatus('failed')
      expect(failedTasks).toEqual([])
    })
  })

  describe('clearTasks', () => {
    it('should clear all tasks and currentTask', () => {
      const task1: Task = {
        id: 'task-1',
        title: 'Task 1',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      }

      const task2: Task = {
        id: 'task-2',
        title: 'Task 2',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      }

      act(() => {
        const store = useTasksStore.getState()
        store.addTask(task1)
        store.addTask(task2)
        store.setCurrentTask(task1)
      })

      act(() => {
        useTasksStore.getState().clearTasks()
      })

      const state = useTasksStore.getState()
      expect(state.tasks).toEqual([])
      expect(state.currentTask).toBeNull()
    })
  })
})
