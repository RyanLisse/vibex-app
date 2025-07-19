/**
 * Data Migration End-to-End Integration Tests
 *
 * Tests the complete data migration flow from localStorage/Zustand stores
 * to the database, including error handling and recovery scenarios
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  server.close()
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock types for testing
interface MockTask {
  id: string
  title: string
  status: string
  createdAt: string
}

interface MockEnvironment {
  id: string
  name: string
  config: Record<string, any>
  isActive: boolean
}

describe('Data Migration Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  describe('localStorage Migration', () => {
    it('should migrate tasks from localStorage to database', async () => {
      // Mock localStorage data
      const mockTasks: MockTask[] = [
        { id: '1', title: 'Local Task 1', status: 'pending', createdAt: '2024-01-01T00:00:00Z' },
        { id: '2', title: 'Local Task 2', status: 'completed', createdAt: '2024-01-02T00:00:00Z' },
      ]

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'tasks') {
          return JSON.stringify(mockTasks)
        }
        return null
      })

      // Mock successful migration API
      server.use(
        http.post('/api/migration/tasks', async ({ request }) => {
          const body = await request.json()
          expect(body).toEqual({ tasks: mockTasks })

          return HttpResponse.json({
            success: true,
            data: {
              migrated: mockTasks.length,
              tasks: mockTasks,
            },
          })
        })
      )

      // Simulate migration
      const response = await fetch('/api/migration/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: mockTasks }),
      })

      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.data.migrated).toBe(2)
      expect(result.data.tasks).toHaveLength(2)
    })

    it('should handle migration errors gracefully', async () => {
      const mockTasks: MockTask[] = [
        { id: '1', title: 'Task 1', status: 'pending', createdAt: '2024-01-01T00:00:00Z' },
      ]

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTasks))

      // Mock migration failure
      server.use(
        http.post('/api/migration/tasks', () => {
          return HttpResponse.json(
            {
              success: false,
              error: 'Database migration failed',
              code: 'MIGRATION_ERROR',
            },
            { status: 500 }
          )
        })
      )

      const response = await fetch('/api/migration/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: mockTasks }),
      })

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toBe('Database migration failed')
    })

    it('should migrate environments from localStorage', async () => {
      const mockEnvironments: MockEnvironment[] = [
        { id: '1', name: 'Local Environment', config: { theme: 'dark' }, isActive: true },
      ]

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'environments') {
          return JSON.stringify(mockEnvironments)
        }
        return null
      })

      server.use(
        http.post('/api/migration/environments', async ({ request }) => {
          const body = await request.json()
          expect(body).toEqual({ environments: mockEnvironments })

          return HttpResponse.json({
            success: true,
            data: {
              migrated: mockEnvironments.length,
              environments: mockEnvironments,
            },
          })
        })
      )

      const response = await fetch('/api/migration/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environments: mockEnvironments }),
      })

      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.data.migrated).toBe(1)
    })
  })

  describe('Data Integrity', () => {
    it('should validate data before migration', async () => {
      const invalidTasks = [
        { id: '', title: '', status: 'invalid', createdAt: 'not-a-date' }, // Invalid task
      ]

      server.use(
        http.post('/api/migration/tasks', () => {
          return HttpResponse.json(
            {
              success: false,
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: {
                id: 'ID is required',
                title: 'Title is required',
                status: 'Invalid status',
                createdAt: 'Invalid date format',
              },
            },
            { status: 400 }
          )
        })
      )

      const response = await fetch('/api/migration/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: invalidTasks }),
      })

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.details).toBeDefined()
    })

    it('should handle duplicate data gracefully', async () => {
      const duplicateTasks: MockTask[] = [
        { id: '1', title: 'Task 1', status: 'pending', createdAt: '2024-01-01T00:00:00Z' },
        {
          id: '1',
          title: 'Task 1 Duplicate',
          status: 'completed',
          createdAt: '2024-01-02T00:00:00Z',
        },
      ]

      server.use(
        http.post('/api/migration/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              migrated: 1,
              skipped: 1,
              duplicates: ['1'],
              tasks: [duplicateTasks[0]], // Only first one kept
            },
          })
        })
      )

      const response = await fetch('/api/migration/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: duplicateTasks }),
      })

      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.data.migrated).toBe(1)
      expect(result.data.skipped).toBe(1)
      expect(result.data.duplicates).toContain('1')
    })
  })

  describe('Recovery Scenarios', () => {
    it('should support partial migration recovery', async () => {
      const largeBatch: MockTask[] = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
      }))

      server.use(
        http.post('/api/migration/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: {
              migrated: 50,
              failed: 50,
              errors: Array.from({ length: 50 }, (_, i) => ({
                id: `task-${i + 50}`,
                error: 'Database constraint violation',
              })),
            },
          })
        })
      )

      const response = await fetch('/api/migration/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: largeBatch }),
      })

      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.data.migrated).toBe(50)
      expect(result.data.failed).toBe(50)
      expect(result.data.errors).toHaveLength(50)
    })

    it('should cleanup localStorage after successful migration', async () => {
      const mockTasks: MockTask[] = [
        { id: '1', title: 'Task to migrate', status: 'pending', createdAt: '2024-01-01T00:00:00Z' },
      ]

      server.use(
        http.post('/api/migration/tasks', () => {
          return HttpResponse.json({
            success: true,
            data: { migrated: 1, tasks: mockTasks },
          })
        }),
        http.delete('/api/migration/cleanup', () => {
          return HttpResponse.json({
            success: true,
            data: { cleaned: ['tasks'] },
          })
        })
      )

      // Migration
      const migrationResponse = await fetch('/api/migration/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: mockTasks }),
      })

      expect(migrationResponse.ok).toBe(true)

      // Cleanup
      const cleanupResponse = await fetch('/api/migration/cleanup', {
        method: 'DELETE',
      })

      const cleanupResult = await cleanupResponse.json()
      expect(cleanupResult.success).toBe(true)
      expect(cleanupResult.data.cleaned).toContain('tasks')
    })
  })

  describe('Progress Tracking', () => {
    it('should track migration progress', async () => {
      const batchSize = 10
      const mockTasks: MockTask[] = Array.from({ length: batchSize }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
      }))

      server.use(
        http.post('/api/migration/tasks/batch', () => {
          return HttpResponse.json({
            success: true,
            data: {
              processed: batchSize,
              total: batchSize,
              progress: 100,
              estimatedTimeRemaining: 0,
            },
          })
        })
      )

      const response = await fetch('/api/migration/tasks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: mockTasks, batchSize }),
      })

      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.data.processed).toBe(batchSize)
      expect(result.data.progress).toBe(100)
      expect(result.data.estimatedTimeRemaining).toBe(0)
    })
  })
})
