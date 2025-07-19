/**
 * Optimistic Updates and Cache Invalidation Tests
 *
 * Tests to verify that optimistic updates work correctly and cache invalidation
 * happens at the right times for TanStack Query hooks
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '@/db/schema'
import { useElectricTasks } from '@/hooks/use-electric-tasks'
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '@/lib/query/hooks'

// Mock fetch
global.fetch = vi.fn()

// Mock ElectricSQL
vi.mock('@/hooks/use-electric-tasks', () => ({
  useElectricTasks: vi.fn(),
}))

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('Optimistic Updates', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let queryClient: QueryClient

  beforeEach(() => {
    mockFetch = vi.mocked(fetch)
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })

    // Mock successful responses by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  describe('Task Creation Optimistic Updates', () => {
    it('should optimistically add task to cache before server response', async () => {
      const wrapper = createWrapper()

      // Setup initial tasks data
      const initialTasks = [{ id: '1', title: 'Existing Task', status: 'pending' }] as Task[]

      queryClient.setQueryData(['tasks', 'list', {}], {
        tasks: initialTasks,
        total: 1,
        hasMore: false,
      })

      const { result } = renderHook(
        () => {
          const createMutation = useCreateTask()
          const tasksQuery = useTasks()
          return { createMutation, tasksQuery }
        },
        { wrapper }
      )

      // Verify initial state
      expect(result.current.tasksQuery.data?.tasks).toHaveLength(1)

      // Create new task with optimistic update
      const newTask = {
        title: 'New Optimistic Task',
        description: 'Created optimistically',
        status: 'pending' as const,
        priority: 'medium' as const,
      }

      act(() => {
        result.current.createMutation.mutate(newTask)
      })

      // Should immediately show optimistic update
      await waitFor(() => {
        expect(result.current.tasksQuery.data?.tasks).toHaveLength(2)
      })

      const optimisticTask = result.current.tasksQuery.data?.tasks.find(
        (task) => task.title === 'New Optimistic Task'
      )
      expect(optimisticTask).toBeDefined()
      expect(optimisticTask?.id).toMatch(/^temp-/) // Temporary ID
    })

    it('should rollback optimistic update on server error', async () => {
      const wrapper = createWrapper()

      // Setup initial tasks data
      const initialTasks = [{ id: '1', title: 'Existing Task', status: 'pending' }] as Task[]

      queryClient.setQueryData(['tasks', 'list', {}], {
        tasks: initialTasks,
        total: 1,
        hasMore: false,
      })

      // Mock server error
      mockFetch.mockRejectedValueOnce(new Error('Server error'))

      const { result } = renderHook(
        () => {
          const createMutation = useCreateTask()
          const tasksQuery = useTasks()
          return { createMutation, tasksQuery }
        },
        { wrapper }
      )

      const newTask = {
        title: 'Failed Task',
        description: 'This will fail',
        status: 'pending' as const,
        priority: 'medium' as const,
      }

      act(() => {
        result.current.createMutation.mutate(newTask)
      })

      // Should show optimistic update initially
      await waitFor(() => {
        expect(result.current.tasksQuery.data?.tasks).toHaveLength(2)
      })

      // Should rollback after error
      await waitFor(() => {
        expect(result.current.tasksQuery.data?.tasks).toHaveLength(1)
      })

      expect(result.current.createMutation.isError).toBe(true)
    })
  })

  describe('Task Update Optimistic Updates', () => {
    it('should optimistically update task in cache', async () => {
      const wrapper = createWrapper()

      const initialTasks = [
        {
          id: '1',
          title: 'Task to Update',
          status: 'pending',
          priority: 'low',
        },
        { id: '2', title: 'Other Task', status: 'completed', priority: 'high' },
      ] as Task[]

      queryClient.setQueryData(['tasks', 'list', {}], {
        tasks: initialTasks,
        total: 2,
        hasMore: false,
      })

      const { result } = renderHook(
        () => {
          const updateMutation = useUpdateTask()
          const tasksQuery = useTasks()
          return { updateMutation, tasksQuery }
        },
        { wrapper }
      )

      const updates = {
        id: '1',
        title: 'Updated Task Title',
        priority: 'high' as const,
      }

      act(() => {
        result.current.updateMutation.mutate(updates)
      })

      // Should immediately show optimistic update
      await waitFor(() => {
        const updatedTask = result.current.tasksQuery.data?.tasks.find((t) => t.id === '1')
        expect(updatedTask?.title).toBe('Updated Task Title')
        expect(updatedTask?.priority).toBe('high')
      })
    })

    it('should rollback optimistic update on server error', async () => {
      const wrapper = createWrapper()

      const initialTasks = [
        {
          id: '1',
          title: 'Original Title',
          status: 'pending',
          priority: 'low',
        },
      ] as Task[]

      queryClient.setQueryData(['tasks', 'list', {}], {
        tasks: initialTasks,
        total: 1,
        hasMore: false,
      })

      // Mock server error
      mockFetch.mockRejectedValueOnce(new Error('Update failed'))

      const { result } = renderHook(
        () => {
          const updateMutation = useUpdateTask()
          const tasksQuery = useTasks()
          return { updateMutation, tasksQuery }
        },
        { wrapper }
      )

      const updates = {
        id: '1',
        title: 'Failed Update',
      }

      act(() => {
        result.current.updateMutation.mutate(updates)
      })

      // Should show optimistic update initially
      await waitFor(() => {
        const task = result.current.tasksQuery.data?.tasks.find((t) => t.id === '1')
        expect(task?.title).toBe('Failed Update')
      })

      // Should rollback to original after error
      await waitFor(() => {
        const task = result.current.tasksQuery.data?.tasks.find((t) => t.id === '1')
        expect(task?.title).toBe('Original Title')
      })

      expect(result.current.updateMutation.isError).toBe(true)
    })
  })

  describe('Task Deletion Optimistic Updates', () => {
    it('should optimistically remove task from cache', async () => {
      const wrapper = createWrapper()

      const initialTasks = [
        { id: '1', title: 'Task to Delete', status: 'pending' },
        { id: '2', title: 'Task to Keep', status: 'completed' },
      ] as Task[]

      queryClient.setQueryData(['tasks', 'list', {}], {
        tasks: initialTasks,
        total: 2,
        hasMore: false,
      })

      const { result } = renderHook(
        () => {
          const deleteMutation = useDeleteTask()
          const tasksQuery = useTasks()
          return { deleteMutation, tasksQuery }
        },
        { wrapper }
      )

      act(() => {
        result.current.deleteMutation.mutate('1')
      })

      // Should immediately remove task optimistically
      await waitFor(() => {
        expect(result.current.tasksQuery.data?.tasks).toHaveLength(1)
        expect(result.current.tasksQuery.data?.tasks[0].id).toBe('2')
      })
    })

    it('should restore task on deletion error', async () => {
      const wrapper = createWrapper()

      const initialTasks = [
        { id: '1', title: 'Task to Delete', status: 'pending' },
        { id: '2', title: 'Task to Keep', status: 'completed' },
      ] as Task[]

      queryClient.setQueryData(['tasks', 'list', {}], {
        tasks: initialTasks,
        total: 2,
        hasMore: false,
      })

      // Mock server error
      mockFetch.mockRejectedValueOnce(new Error('Deletion failed'))

      const { result } = renderHook(
        () => {
          const deleteMutation = useDeleteTask()
          const tasksQuery = useTasks()
          return { deleteMutation, tasksQuery }
        },
        { wrapper }
      )

      act(() => {
        result.current.deleteMutation.mutate('1')
      })

      // Should remove task optimistically
      await waitFor(() => {
        expect(result.current.tasksQuery.data?.tasks).toHaveLength(1)
      })

      // Should restore task after error
      await waitFor(() => {
        expect(result.current.tasksQuery.data?.tasks).toHaveLength(2)
        const restoredTask = result.current.tasksQuery.data?.tasks.find((t) => t.id === '1')
        expect(restoredTask?.title).toBe('Task to Delete')
      })

      expect(result.current.deleteMutation.isError).toBe(true)
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate related queries after successful mutation', async () => {
      const wrapper = createWrapper()

      const { result } = renderHook(
        () => {
          const createMutation = useCreateTask()
          const tasksQuery = useTasks()
          return { createMutation, tasksQuery }
        },
        { wrapper }
      )

      // Mock successful server response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'server-id',
            title: 'Server Task',
            status: 'pending',
            createdAt: new Date().toISOString(),
          }),
      } as Response)

      const newTask = {
        title: 'New Task',
        description: 'Test task',
        status: 'pending' as const,
        priority: 'medium' as const,
      }

      act(() => {
        result.current.createMutation.mutate(newTask)
      })

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.createMutation.isSuccess).toBe(true)
      })

      // Should have triggered cache invalidation and refetch
      expect(mockFetch).toHaveBeenCalledWith('/api/tasks', expect.any(Object))
    })

    it('should handle concurrent optimistic updates correctly', async () => {
      const wrapper = createWrapper()

      const initialTasks = [
        { id: '1', title: 'Task 1', status: 'pending', priority: 'low' },
      ] as Task[]

      queryClient.setQueryData(['tasks', 'list', {}], {
        tasks: initialTasks,
        total: 1,
        hasMore: false,
      })

      const { result } = renderHook(
        () => {
          const updateMutation = useUpdateTask()
          const tasksQuery = useTasks()
          return { updateMutation, tasksQuery }
        },
        { wrapper }
      )

      // Perform multiple concurrent updates
      act(() => {
        result.current.updateMutation.mutate({ id: '1', title: 'Update 1' })
        result.current.updateMutation.mutate({ id: '1', priority: 'high' })
      })

      // Should handle concurrent updates gracefully
      await waitFor(() => {
        const task = result.current.tasksQuery.data?.tasks.find((t) => t.id === '1')
        expect(task).toBeDefined()
        // Should have the latest optimistic update
        expect(task?.priority).toBe('high')
      })
    })
  })
})
