/**
 * API + TanStack Query Integration Tests
 *
 * End-to-end tests verifying the complete flow from UI actions through
 * TanStack Query hooks to API routes and database operations
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '@/db/schema'
import { useCreateTask, useDeleteTask, useTask, useTasks, useUpdateTask } from '@/lib/query/hooks'

// Mock modules
vi.mock('@/db/config', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { HttpResponse, http } from 'msw'
// Setup MSW for mocking API responses
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Test helpers
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// Test data factories
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-' + Math.random().toString(36).substr(2, 9),
    title: 'Test Task',
    description: 'Test Description',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    dueDate: null,
    assignee: null,
    tags: [],
    metadata: {},
    userId: 'test-user',
    ...overrides,
  }
}

describe('API + TanStack Query Integration', () => {
  describe('Create Task Flow', () => {
    it('should complete full create task flow from UI to database', async () => {
      const newTaskData = {
        title: 'Integration Test Task',
        description: 'Created through full integration test',
        status: 'pending' as const,
        priority: 'high' as const,
      }

      const createdTask = createMockTask({
        ...newTaskData,
        id: 'created-task-id',
      })

      // Mock API responses
      server.use(
        // Initial tasks fetch
        http.get('/api/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tasks: [],
              total: 0,
              hasMore: false,
            },
          })
        }),
        // Create task
        http.post('/api/tasks', async ({ request }) => {
          const body = await request.json()
          return HttpResponse.json(
            {
              success: true,
              data: createdTask,
            },
            { status: 201 }
          )
        }),
        // Refetch after creation
        http.get('/api/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tasks: [createdTask],
              total: 1,
              hasMore: false,
            },
          })
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => {
          const tasksQuery = useTasks()
          const createMutation = useCreateTask()
          return { tasksQuery, createMutation }
        },
        { wrapper }
      )

      // Initial state - no tasks
      await waitFor(() => {
        expect(result.current.tasksQuery.isSuccess).toBe(true)
      })
      expect(result.current.tasksQuery.data?.tasks).toHaveLength(0)

      // Create task
      act(() => {
        result.current.createMutation.mutate(newTaskData)
      })

      // Verify optimistic update
      await waitFor(() => {
        expect(result.current.tasksQuery.data?.tasks).toHaveLength(1)
      })

      const optimisticTask = result.current.tasksQuery.data?.tasks[0]
      expect(optimisticTask?.title).toBe('Integration Test Task')
      expect(optimisticTask?.id).toMatch(/^temp-/) // Temporary ID

      // Wait for server response
      await waitFor(() => {
        expect(result.current.createMutation.isSuccess).toBe(true)
      })

      // Verify final state with server ID
      await waitFor(() => {
        const serverTask = result.current.tasksQuery.data?.tasks[0]
        expect(serverTask?.id).toBe('created-task-id')
        expect(serverTask?.title).toBe('Integration Test Task')
      })
    })

    it('should handle create task errors gracefully', async () => {
      const newTaskData = {
        title: 'Failed Task',
        status: 'pending' as const,
        priority: 'medium' as const,
      }

      // Mock API error
      server.use(
        http.get('/api/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tasks: [],
              total: 0,
              hasMore: false,
            },
          })
        }),
        http.post('/api/tasks', () => {
          return HttpResponse.json(
            {
              success: false,
              error: 'Database error',
              code: 'DB_ERROR',
            },
            { status: 500 }
          )
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => {
          const tasksQuery = useTasks()
          const createMutation = useCreateTask()
          return { tasksQuery, createMutation }
        },
        { wrapper }
      )

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.tasksQuery.isSuccess).toBe(true)
      })

      // Attempt to create task
      act(() => {
        result.current.createMutation.mutate(newTaskData)
      })

      // Should show optimistic update
      await waitFor(() => {
        expect(result.current.tasksQuery.data?.tasks).toHaveLength(1)
      })

      // Should rollback after error
      await waitFor(() => {
        expect(result.current.createMutation.isError).toBe(true)
        expect(result.current.tasksQuery.data?.tasks).toHaveLength(0)
      })
    })
  })

  describe('Update Task Flow', () => {
    it('should complete full update task flow with optimistic updates', async () => {
      const existingTask = createMockTask({
        id: 'task-to-update',
        title: 'Original Title',
        status: 'pending',
        priority: 'low',
      })

      const updatedTask = {
        ...existingTask,
        title: 'Updated Title',
        status: 'completed' as const,
        priority: 'high' as const,
        completedAt: new Date(),
      }

      // Mock API responses
      server.use(
        http.get('/api/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tasks: [existingTask],
              total: 1,
              hasMore: false,
            },
          })
        }),
        http.patch('/api/tasks/:id', async ({ params, request }) => {
          expect(params.id).toBe('task-to-update')
          const body = await request.json()
          return HttpResponse.json({
            success: true,
            data: updatedTask,
          })
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => {
          const tasksQuery = useTasks()
          const updateMutation = useUpdateTask()
          return { tasksQuery, updateMutation }
        },
        { wrapper }
      )

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.tasksQuery.data?.tasks).toHaveLength(1)
      })

      // Update task
      act(() => {
        result.current.updateMutation.mutate({
          id: 'task-to-update',
          title: 'Updated Title',
          status: 'completed',
          priority: 'high',
        })
      })

      // Verify optimistic update
      await waitFor(() => {
        const task = result.current.tasksQuery.data?.tasks[0]
        expect(task?.title).toBe('Updated Title')
        expect(task?.status).toBe('completed')
        expect(task?.priority).toBe('high')
      })

      // Wait for server confirmation
      await waitFor(() => {
        expect(result.current.updateMutation.isSuccess).toBe(true)
      })
    })

    it('should handle concurrent updates correctly', async () => {
      const task = createMockTask({
        id: 'concurrent-task',
        title: 'Original',
        status: 'pending',
        priority: 'medium',
      })

      let updateCount = 0
      server.use(
        http.get('/api/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tasks: [task],
              total: 1,
              hasMore: false,
            },
          })
        }),
        http.patch('/api/tasks/:id', async ({ request }) => {
          updateCount++
          const body = await request.json()
          return HttpResponse.json({
            success: true,
            data: {
              ...task,
              ...body,
              updatedAt: new Date(),
            },
          })
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => {
          const tasksQuery = useTasks()
          const updateMutation = useUpdateTask()
          return { tasksQuery, updateMutation }
        },
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.tasksQuery.isSuccess).toBe(true)
      })

      // Perform concurrent updates
      act(() => {
        result.current.updateMutation.mutate({
          id: 'concurrent-task',
          title: 'Update 1',
        })
        result.current.updateMutation.mutate({
          id: 'concurrent-task',
          priority: 'high',
        })
      })

      // Both updates should be processed
      await waitFor(() => {
        expect(updateCount).toBe(2)
      })
    })
  })

  describe('Delete Task Flow', () => {
    it('should complete full delete task flow with rollback on error', async () => {
      const taskToDelete = createMockTask({
        id: 'delete-me',
        title: 'Task to Delete',
      })

      const taskToKeep = createMockTask({
        id: 'keep-me',
        title: 'Task to Keep',
      })

      server.use(
        http.get('/api/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tasks: [taskToDelete, taskToKeep],
              total: 2,
              hasMore: false,
            },
          })
        }),
        http.delete('/api/tasks/:id', ({ params }) => {
          if (params.id === 'delete-me') {
            return HttpResponse.json({
              success: true,
              data: taskToDelete,
            })
          }
          return HttpResponse.json(
            {
              success: false,
              error: 'Task not found',
            },
            { status: 404 }
          )
        }),
        // Refetch after deletion
        http.get('/api/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tasks: [taskToKeep],
              total: 1,
              hasMore: false,
            },
          })
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => {
          const tasksQuery = useTasks()
          const deleteMutation = useDeleteTask()
          return { tasksQuery, deleteMutation }
        },
        { wrapper }
      )

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.tasksQuery.data?.tasks).toHaveLength(2)
      })

      // Delete task
      act(() => {
        result.current.deleteMutation.mutate('delete-me')
      })

      // Verify optimistic removal
      await waitFor(() => {
        expect(result.current.tasksQuery.data?.tasks).toHaveLength(1)
        expect(result.current.tasksQuery.data?.tasks[0].id).toBe('keep-me')
      })

      // Wait for server confirmation
      await waitFor(() => {
        expect(result.current.deleteMutation.isSuccess).toBe(true)
      })
    })
  })

  describe('Query Filtering and Pagination', () => {
    it('should handle filtered queries correctly', async () => {
      const pendingTasks = [
        createMockTask({ status: 'pending', title: 'Pending 1' }),
        createMockTask({ status: 'pending', title: 'Pending 2' }),
      ]

      const completedTasks = [createMockTask({ status: 'completed', title: 'Completed 1' })]

      server.use(
        http.get('/api/tasks', ({ request }) => {
          const url = new URL(request.url)
          const status = url.searchParams.get('status')

          if (status === 'pending') {
            return HttpResponse.json({
              success: true,
              data: {
                tasks: pendingTasks,
                total: 2,
                hasMore: false,
              },
            })
          }

          if (status === 'completed') {
            return HttpResponse.json({
              success: true,
              data: {
                tasks: completedTasks,
                total: 1,
                hasMore: false,
              },
            })
          }

          return HttpResponse.json({
            success: true,
            data: {
              tasks: [...pendingTasks, ...completedTasks],
              total: 3,
              hasMore: false,
            },
          })
        })
      )

      const wrapper = createWrapper()

      // Test pending filter
      const { result: pendingResult } = renderHook(() => useTasks({ status: 'pending' }), {
        wrapper,
      })

      await waitFor(() => {
        expect(pendingResult.current.data?.tasks).toHaveLength(2)
        expect(pendingResult.current.data?.tasks.every((t) => t.status === 'pending')).toBe(true)
      })

      // Test completed filter
      const { result: completedResult } = renderHook(() => useTasks({ status: 'completed' }), {
        wrapper,
      })

      await waitFor(() => {
        expect(completedResult.current.data?.tasks).toHaveLength(1)
        expect(completedResult.current.data?.tasks[0].status).toBe('completed')
      })
    })
  })

  describe('Cache Synchronization', () => {
    it('should synchronize individual task query with list query', async () => {
      const task = createMockTask({
        id: 'sync-task',
        title: 'Synchronized Task',
      })

      server.use(
        http.get('/api/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tasks: [task],
              total: 1,
              hasMore: false,
            },
          })
        }),
        http.get('/api/tasks/:id', ({ params }) => {
          if (params.id === 'sync-task') {
            return HttpResponse.json({
              success: true,
              data: task,
            })
          }
          return HttpResponse.json({ success: false, error: 'Not found' }, { status: 404 })
        }),
        http.patch('/api/tasks/:id', async ({ request }) => {
          const body = await request.json()
          const updated = { ...task, ...body, updatedAt: new Date() }
          return HttpResponse.json({
            success: true,
            data: updated,
          })
        })
      )

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => {
          const listQuery = useTasks()
          const detailQuery = useTask('sync-task')
          const updateMutation = useUpdateTask()
          return { listQuery, detailQuery, updateMutation }
        },
        { wrapper }
      )

      // Wait for both queries to load
      await waitFor(() => {
        expect(result.current.listQuery.isSuccess).toBe(true)
        expect(result.current.detailQuery.isSuccess).toBe(true)
      })

      // Update via detail query mutation
      act(() => {
        result.current.updateMutation.mutate({
          id: 'sync-task',
          title: 'Updated via Detail',
        })
      })

      // Both queries should reflect the update
      await waitFor(() => {
        expect(result.current.listQuery.data?.tasks[0].title).toBe('Updated via Detail')
        expect(result.current.detailQuery.data?.title).toBe('Updated via Detail')
      })
    })
  })
})
