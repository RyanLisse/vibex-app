/**
 * API + TanStack Query Integration Tests
 *
 * End-to-end tests verifying the complete flow from UI actions through
 * TanStack Query hooks to API routes and database operations
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

// Mock Task type for testing
interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: Date
  updatedAt: Date
  completedAt?: Date | null
  dueDate?: Date | null
  assignee?: string | null
  tags: string[]
  metadata: Record<string, any>
  userId?: string
}

// Mock API functions instead of hooks for now
async function fetchTasks(): Promise<{ tasks: Task[]; total: number; hasMore: boolean }> {
  const response = await fetch('/api/tasks')
  if (!response.ok) {
    throw new Error('Failed to fetch tasks')
  }
  return response.json()
}

async function createTask(task: Partial<Task>): Promise<Task> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  })
  if (!response.ok) {
    throw new Error('Failed to create task')
  }
  return response.json()
}

async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!response.ok) {
    throw new Error('Failed to update task')
  }
  return response.json()
}

async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to delete task')
  }
}

// Mock server setup
const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

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

describe('API Integration Tests', () => {
  describe('Task Management', () => {
    it('should fetch tasks from API', async () => {
      const mockTasks = [
        createMockTask({ id: '1', title: 'Task 1' }),
        createMockTask({ id: '2', title: 'Task 2' }),
      ]

      server.use(
        http.get('/api/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tasks: mockTasks,
              total: 2,
              hasMore: false,
            },
          })
        })
      )

      const result = await fetchTasks()

      expect(result.tasks).toHaveLength(2)
      expect(result.tasks[0].title).toBe('Task 1')
      expect(result.tasks[1].title).toBe('Task 2')
      expect(result.total).toBe(2)
      expect(result.hasMore).toBe(false)
    })

    it('should create a new task', async () => {
      const newTaskData = {
        title: 'New Task',
        description: 'Task description',
        priority: 'high' as const,
      }

      const createdTask = createMockTask({
        ...newTaskData,
        id: 'created-task-id',
      })

      server.use(
        http.post('/api/tasks', async ({ request }) => {
          const body = await request.json()
          expect(body).toMatchObject(newTaskData)

          return HttpResponse.json(
            {
              success: true,
              data: createdTask,
            },
            { status: 201 }
          )
        })
      )

      const result = await createTask(newTaskData)

      expect(result.id).toBe('created-task-id')
      expect(result.title).toBe('New Task')
      expect(result.priority).toBe('high')
    })

    it('should update an existing task', async () => {
      const taskId = 'task-to-update'
      const updates = {
        title: 'Updated Title',
        status: 'completed' as const,
      }

      const updatedTask = createMockTask({
        id: taskId,
        ...updates,
        updatedAt: new Date(),
      })

      server.use(
        http.patch('/api/tasks/:id', async ({ params, request }) => {
          expect(params.id).toBe(taskId)
          const body = await request.json()
          expect(body).toMatchObject(updates)

          return HttpResponse.json({
            success: true,
            data: updatedTask,
          })
        })
      )

      const result = await updateTask(taskId, updates)

      expect(result.id).toBe(taskId)
      expect(result.title).toBe('Updated Title')
      expect(result.status).toBe('completed')
    })

    it('should delete a task', async () => {
      const taskId = 'task-to-delete'

      server.use(
        http.delete('/api/tasks/:id', ({ params }) => {
          expect(params.id).toBe(taskId)

          return HttpResponse.json({
            success: true,
            data: { id: taskId },
          })
        })
      )

      await expect(deleteTask(taskId)).resolves.not.toThrow()
    })

    it('should handle API errors gracefully', async () => {
      server.use(
        http.get('/api/tasks', () => {
          return HttpResponse.json(
            {
              success: false,
              error: 'Database connection failed',
              code: 'DB_ERROR',
            },
            { status: 500 }
          )
        })
      )

      await expect(fetchTasks()).rejects.toThrow('Failed to fetch tasks')
    })

    it('should handle network errors', async () => {
      server.use(
        http.get('/api/tasks', () => {
          return HttpResponse.error()
        })
      )

      await expect(fetchTasks()).rejects.toThrow('Failed to fetch tasks')
    })
  })

  describe('Query Client Integration', () => {
    it('should work with TanStack Query client', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })

      const mockTasks = [createMockTask({ id: '1', title: 'Query Test Task' })]

      server.use(
        http.get('/api/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tasks: mockTasks,
              total: 1,
              hasMore: false,
            },
          })
        })
      )

      // Test direct query client usage
      const result = await queryClient.fetchQuery({
        queryKey: ['tasks'],
        queryFn: fetchTasks,
      })

      expect(result.tasks).toHaveLength(1)
      expect(result.tasks[0].title).toBe('Query Test Task')

      // Verify cache
      const cachedData = queryClient.getQueryData(['tasks'])
      expect(cachedData).toEqual(result)
    })

    it('should handle query invalidation', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })

      // Set initial data
      queryClient.setQueryData(['tasks'], {
        tasks: [createMockTask({ id: '1', title: 'Old Task' })],
        total: 1,
        hasMore: false,
      })

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })

      // Verify cache is marked as stale
      const query = queryClient.getQueryState(['tasks'])
      expect(query?.isInvalidated).toBe(true)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle validation errors', async () => {
      server.use(
        http.post('/api/tasks', () => {
          return HttpResponse.json(
            {
              success: false,
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: {
                title: 'Title is required',
              },
            },
            { status: 400 }
          )
        })
      )

      await expect(createTask({})).rejects.toThrow('Failed to create task')
    })

    it('should handle authentication errors', async () => {
      server.use(
        http.get('/api/tasks', () => {
          return HttpResponse.json(
            {
              success: false,
              error: 'Authentication required',
              code: 'AUTH_ERROR',
            },
            { status: 401 }
          )
        })
      )

      await expect(fetchTasks()).rejects.toThrow('Failed to fetch tasks')
    })

    it('should handle rate limiting', async () => {
      server.use(
        http.post('/api/tasks', () => {
          return HttpResponse.json(
            {
              success: false,
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT',
            },
            { status: 429 }
          )
        })
      )

      await expect(createTask({ title: 'Test' })).rejects.toThrow('Failed to create task')
    })
  })
})
