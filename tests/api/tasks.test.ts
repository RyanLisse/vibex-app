/**
 * API Routes Tests - Tasks
 *
 * Comprehensive tests for task-related API routes with database operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { GET, POST, PUT, DELETE } from '@/app/api/tasks/route'
import {
  GET as getTaskById,
  PUT as updateTaskById,
  DELETE as deleteTaskById,
} from '@/app/api/tasks/[id]/route'
import { db } from '@/db/config'
import { tasks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { Task } from '@/db/schema'

// Mock database
vi.mock('@/db/config', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {
      tasks: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  },
}))

// Mock observability
vi.mock('@/lib/observability', () => ({
  observability: {
    getTracer: vi.fn(() => ({
      startActiveSpan: vi.fn((name, fn) =>
        fn({
          setAttributes: vi.fn(),
          recordException: vi.fn(),
          setStatus: vi.fn(),
          end: vi.fn(),
        })
      ),
    })),
    recordError: vi.fn(),
  },
}))

describe('Tasks API Routes', () => {
  const mockDb = vi.mocked(db)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/tasks', () => {
    it('should return all tasks successfully', async () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Test Task 1',
          description: 'Description 1',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          title: 'Test Task 2',
          description: 'Description 2',
          status: 'completed',
          priority: 'high',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as Task[]

      mockDb.query.tasks.findMany.mockResolvedValue(mockTasks)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/tasks',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.tasks).toHaveLength(2)
      expect(data.data.tasks[0].title).toBe('Test Task 1')
    })

    it('should filter tasks by status', async () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Pending Task',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as Task[]

      mockDb.query.tasks.findMany.mockResolvedValue(mockTasks)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/tasks?status=pending',
        query: { status: 'pending' },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.tasks).toHaveLength(1)
      expect(data.data.tasks[0].status).toBe('pending')
    })

    it('should handle database errors', async () => {
      mockDb.query.tasks.findMany.mockRejectedValue(new Error('Database connection failed'))

      const { req } = createMocks({
        method: 'GET',
        url: '/api/tasks',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to fetch tasks')
    })
  })

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const newTask = {
        title: 'New Task',
        description: 'New task description',
        status: 'pending',
        priority: 'medium',
      }

      const createdTask = {
        id: 'new-task-id',
        ...newTask,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Task

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdTask]),
        }),
      })

      const { req } = createMocks({
        method: 'POST',
        url: '/api/tasks',
        body: newTask,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('New Task')
      expect(data.data.id).toBe('new-task-id')
    })

    it('should validate required fields', async () => {
      const invalidTask = {
        description: 'Missing title',
        status: 'pending',
      }

      const { req } = createMocks({
        method: 'POST',
        url: '/api/tasks',
        body: invalidTask,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request data')
    })

    it('should handle database insertion errors', async () => {
      const newTask = {
        title: 'New Task',
        status: 'pending',
        priority: 'medium',
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Insertion failed')),
        }),
      })

      const { req } = createMocks({
        method: 'POST',
        url: '/api/tasks',
        body: newTask,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to create task')
    })
  })

  describe('GET /api/tasks/[id]', () => {
    it('should return a specific task', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Specific Task',
        description: 'Task description',
        status: 'pending',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Task

      mockDb.query.tasks.findFirst.mockResolvedValue(mockTask)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/tasks/task-1',
      })

      const response = await getTaskById(req, { params: { id: 'task-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('task-1')
      expect(data.data.title).toBe('Specific Task')
    })

    it('should return 404 for non-existent task', async () => {
      mockDb.query.tasks.findFirst.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/tasks/non-existent',
      })

      const response = await getTaskById(req, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Task not found')
    })
  })

  describe('PUT /api/tasks/[id]', () => {
    it('should update a task successfully', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Original Title',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Task

      const updatedTask = {
        ...existingTask,
        title: 'Updated Title',
        status: 'completed',
        updatedAt: new Date(),
      } as Task

      mockDb.query.tasks.findFirst.mockResolvedValue(existingTask)
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedTask]),
          }),
        }),
      })

      const { req } = createMocks({
        method: 'PUT',
        url: '/api/tasks/task-1',
        body: {
          title: 'Updated Title',
          status: 'completed',
        },
      })

      const response = await updateTaskById(req, { params: { id: 'task-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('Updated Title')
      expect(data.data.status).toBe('completed')
    })

    it('should return 404 when updating non-existent task', async () => {
      mockDb.query.tasks.findFirst.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'PUT',
        url: '/api/tasks/non-existent',
        body: { title: 'Updated Title' },
      })

      const response = await updateTaskById(req, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Task not found')
    })
  })

  describe('DELETE /api/tasks/[id]', () => {
    it('should delete a task successfully', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Task to Delete',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Task

      mockDb.query.tasks.findFirst.mockResolvedValue(existingTask)
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([existingTask]),
        }),
      })

      const { req } = createMocks({
        method: 'DELETE',
        url: '/api/tasks/task-1',
      })

      const response = await deleteTaskById(req, { params: { id: 'task-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Task deleted successfully')
    })

    it('should return 404 when deleting non-existent task', async () => {
      mockDb.query.tasks.findFirst.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'DELETE',
        url: '/api/tasks/non-existent',
      })

      const response = await deleteTaskById(req, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Task not found')
    })
  })
})
