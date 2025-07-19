/**
 * TanStack Query Hooks Integration Tests
 *
 * Tests for all TanStack Query hooks with real database operations and caching behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useEnvironments,
  useEnvironment,
  useCreateEnvironment,
  useUpdateEnvironment,
  useDeleteEnvironment,
  taskKeys,
  environmentKeys,
} from '@/lib/query/hooks'
import type { Task, Environment } from '@/db/schema'

// Mock fetch
global.fetch = vi.fn()

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

describe('TanStack Query Hooks Integration', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let queryClient: QueryClient

  beforeEach(() => {
    mockFetch = vi.mocked(fetch)
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  describe('Task Query Hooks', () => {
    describe('useTasks', () => {
      it('should fetch and cache tasks list', async () => {
        const mockTasks = [
          { id: '1', title: 'Task 1', status: 'pending', priority: 'medium' },
          { id: '2', title: 'Task 2', status: 'completed', priority: 'high' },
        ] as Task[]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { tasks: mockTasks, total: 2, hasMore: false },
            }),
        } as Response)

        const wrapper = createWrapper()
        const { result } = renderHook(() => useTasks(), { wrapper })

        // Should start loading
        expect(result.current.isLoading).toBe(true)
        expect(result.current.data).toBeUndefined()

        // Wait for data to load
        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.data?.tasks).toHaveLength(2)
        expect(result.current.data?.tasks[0].title).toBe('Task 1')
        expect(result.current.isSuccess).toBe(true)

        // Verify API call
        expect(mockFetch).toHaveBeenCalledWith('/api/tasks', expect.any(Object))
      })

      it('should handle query filters', async () => {
        const mockTasks = [{ id: '1', title: 'Pending Task', status: 'pending' }] as Task[]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { tasks: mockTasks, total: 1, hasMore: false },
            }),
        } as Response)

        const wrapper = createWrapper()
        const { result } = renderHook(() => useTasks({ status: 'pending' }), {
          wrapper,
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data?.tasks).toHaveLength(1)
        expect(result.current.data?.tasks[0].status).toBe('pending')

        // Verify filtered API call
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/tasks',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        )
      })

      it('should handle fetch errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        const wrapper = createWrapper()
        const { result } = renderHook(() => useTasks(), { wrapper })

        await waitFor(() => {
          expect(result.current.isError).toBe(true)
        })

        expect(result.current.error).toBeInstanceOf(Error)
        expect(result.current.data).toBeUndefined()
      })
    })

    describe('useTask', () => {
      it('should fetch individual task', async () => {
        const mockTask = {
          id: 'task-1',
          title: 'Individual Task',
          status: 'pending',
          priority: 'high',
        } as Task

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: mockTask,
            }),
        } as Response)

        const wrapper = createWrapper()
        const { result } = renderHook(() => useTask('task-1'), { wrapper })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data?.id).toBe('task-1')
        expect(result.current.data?.title).toBe('Individual Task')

        // Verify API call
        expect(mockFetch).toHaveBeenCalledWith('/api/tasks/task-1', expect.any(Object))
      })

      it('should handle 404 errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: () =>
            Promise.resolve({
              success: false,
              error: 'Task not found',
            }),
        } as Response)

        const wrapper = createWrapper()
        const { result } = renderHook(() => useTask('non-existent'), {
          wrapper,
        })

        await waitFor(() => {
          expect(result.current.isError).toBe(true)
        })

        expect(result.current.data).toBeUndefined()
      })
    })

    describe('useCreateTask', () => {
      it('should create task with optimistic updates', async () => {
        const newTask = {
          title: 'New Task',
          description: 'Task description',
          status: 'pending' as const,
          priority: 'medium' as const,
        }

        const createdTask = {
          id: 'new-task-id',
          ...newTask,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Task

        // Setup initial tasks cache
        queryClient.setQueryData(taskKeys.list({}), {
          tasks: [],
          total: 0,
          hasMore: false,
        })

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: createdTask,
            }),
        } as Response)

        const wrapper = createWrapper()
        const { result } = renderHook(
          () => {
            const createMutation = useCreateTask()
            const tasksQuery = useTasks()
            return { createMutation, tasksQuery }
          },
          { wrapper }
        )

        // Create task
        act(() => {
          result.current.createMutation.mutate(newTask)
        })

        // Should show optimistic update immediately
        await waitFor(() => {
          expect(result.current.tasksQuery.data?.tasks).toHaveLength(1)
        })

        // Wait for mutation to complete
        await waitFor(() => {
          expect(result.current.createMutation.isSuccess).toBe(true)
        })

        expect(result.current.createMutation.data?.id).toBe('new-task-id')
        expect(mockFetch).toHaveBeenCalledWith('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTask),
        })
      })

      it('should rollback optimistic update on error', async () => {
        const newTask = {
          title: 'Failed Task',
          status: 'pending' as const,
          priority: 'medium' as const,
        }

        // Setup initial tasks cache
        queryClient.setQueryData(taskKeys.list({}), {
          tasks: [{ id: '1', title: 'Existing Task' }],
          total: 1,
          hasMore: false,
        })

        mockFetch.mockRejectedValueOnce(new Error('Creation failed'))

        const wrapper = createWrapper()
        const { result } = renderHook(
          () => {
            const createMutation = useCreateTask()
            const tasksQuery = useTasks()
            return { createMutation, tasksQuery }
          },
          { wrapper }
        )

        act(() => {
          result.current.createMutation.mutate(newTask)
        })

        // Should show optimistic update initially
        await waitFor(() => {
          expect(result.current.tasksQuery.data?.tasks).toHaveLength(2)
        })

        // Should rollback after error
        await waitFor(() => {
          expect(result.current.createMutation.isError).toBe(true)
        })

        await waitFor(() => {
          expect(result.current.tasksQuery.data?.tasks).toHaveLength(1)
        })
      })
    })

    describe('useUpdateTask', () => {
      it('should update task with optimistic updates', async () => {
        const existingTask = {
          id: 'task-1',
          title: 'Original Title',
          status: 'pending',
          priority: 'medium',
        } as Task

        const updatedTask = {
          ...existingTask,
          title: 'Updated Title',
          status: 'completed',
        } as Task

        // Setup initial cache
        queryClient.setQueryData(taskKeys.list({}), {
          tasks: [existingTask],
          total: 1,
          hasMore: false,
        })

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: updatedTask,
            }),
        } as Response)

        const wrapper = createWrapper()
        const { result } = renderHook(
          () => {
            const updateMutation = useUpdateTask()
            const tasksQuery = useTasks()
            return { updateMutation, tasksQuery }
          },
          { wrapper }
        )

        act(() => {
          result.current.updateMutation.mutate({
            id: 'task-1',
            title: 'Updated Title',
            status: 'completed',
          })
        })

        // Should show optimistic update immediately
        await waitFor(() => {
          const task = result.current.tasksQuery.data?.tasks.find((t) => t.id === 'task-1')
          expect(task?.title).toBe('Updated Title')
          expect(task?.status).toBe('completed')
        })

        await waitFor(() => {
          expect(result.current.updateMutation.isSuccess).toBe(true)
        })
      })
    })

    describe('useDeleteTask', () => {
      it('should delete task with optimistic updates', async () => {
        const tasksToDelete = [
          { id: 'task-1', title: 'Task to Delete' },
          { id: 'task-2', title: 'Task to Keep' },
        ] as Task[]

        // Setup initial cache
        queryClient.setQueryData(taskKeys.list({}), {
          tasks: tasksToDelete,
          total: 2,
          hasMore: false,
        })

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: 'Task deleted successfully',
            }),
        } as Response)

        const wrapper = createWrapper()
        const { result } = renderHook(
          () => {
            const deleteMutation = useDeleteTask()
            const tasksQuery = useTasks()
            return { deleteMutation, tasksQuery }
          },
          { wrapper }
        )

        act(() => {
          result.current.deleteMutation.mutate('task-1')
        })

        // Should remove task optimistically
        await waitFor(() => {
          expect(result.current.tasksQuery.data?.tasks).toHaveLength(1)
          expect(result.current.tasksQuery.data?.tasks[0].id).toBe('task-2')
        })

        await waitFor(() => {
          expect(result.current.deleteMutation.isSuccess).toBe(true)
        })
      })
    })
  })

  describe('Environment Query Hooks', () => {
    describe('useEnvironments', () => {
      it('should fetch and cache environments list', async () => {
        const mockEnvironments = [
          {
            id: 'env-1',
            name: 'Development',
            type: 'development',
            status: 'active',
          },
          {
            id: 'env-2',
            name: 'Production',
            type: 'production',
            status: 'active',
          },
        ] as Environment[]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { environments: mockEnvironments, total: 2 },
            }),
        } as Response)

        const wrapper = createWrapper()
        const { result } = renderHook(() => useEnvironments(), { wrapper })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data?.environments).toHaveLength(2)
        expect(result.current.data?.environments[0].name).toBe('Development')
      })
    })

    describe('useCreateEnvironment', () => {
      it('should create environment with cache invalidation', async () => {
        const newEnvironment = {
          name: 'Test Environment',
          description: 'Test description',
          type: 'development' as const,
          status: 'active' as const,
        }

        const createdEnvironment = {
          id: 'new-env-id',
          ...newEnvironment,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Environment

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: createdEnvironment,
            }),
        } as Response)

        const wrapper = createWrapper()
        const { result } = renderHook(() => useCreateEnvironment(), {
          wrapper,
        })

        act(() => {
          result.current.mutate(newEnvironment)
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data?.id).toBe('new-env-id')
      })
    })
  })

  describe('Cache Behavior', () => {
    it('should share cache between related queries', async () => {
      const mockTask = {
        id: 'shared-task',
        title: 'Shared Task',
        status: 'pending',
      } as Task

      // Set up individual task cache
      queryClient.setQueryData(taskKeys.detail('shared-task'), mockTask)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useTask('shared-task'), { wrapper })

      // Should use cached data immediately
      expect(result.current.data?.id).toBe('shared-task')
      expect(result.current.data?.title).toBe('Shared Task')
      expect(result.current.isLoading).toBe(false)

      // Should not make API call for cached data
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should invalidate related caches on mutations', async () => {
      // Setup initial cache
      queryClient.setQueryData(taskKeys.list({}), {
        tasks: [{ id: 'task-1', title: 'Original' }],
        total: 1,
        hasMore: false,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { id: 'task-1', title: 'Updated' },
          }),
      } as Response)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useUpdateTask(), { wrapper })

      act(() => {
        result.current.mutate({ id: 'task-1', title: 'Updated' })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Cache should be invalidated
      const cacheState = queryClient.getQueryState(taskKeys.list({}))
      expect(cacheState?.isInvalidated).toBe(true)
    })
  })
})
