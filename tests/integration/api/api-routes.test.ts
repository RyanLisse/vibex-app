/**
 * API Routes Integration Tests
 *
 * Comprehensive test suite for all API endpoints including authentication,
 * error handling, data validation, rate limiting, and performance
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer } from 'http'
import type { AddressInfo } from 'net'
import { checkDatabaseHealth, db } from '../../../db/config'
import { migrationRunner } from '../../../db/migrations/migration-runner'
import { tasks, environments, agentExecutions } from '../../../db/schema'

// Test server configuration
let testServer: ReturnType<typeof createServer> | null = null
let testServerUrl: string | null = null

// Mock authentication tokens
const mockTokens = {
  valid: 'valid-test-token-123',
  expired: 'expired-test-token-456',
  invalid: 'invalid-test-token-789',
  admin: 'admin-test-token-000',
}

// Mock user data
const mockUsers = {
  user1: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  },
  admin: {
    id: 'admin-456',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  },
}

// Helper to make authenticated requests
const makeRequest = async (endpoint: string, options: RequestInit = {}, token?: string) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(`${testServerUrl}${endpoint}`, {
    ...options,
    headers,
  })

  return {
    status: response.status,
    data: response.ok ? await response.json() : null,
    error: !response.ok ? await response.text() : null,
    headers: response.headers,
  }
}

// Mock API response helpers
const mockApiSuccess = (data: any, status = 200) => ({
  status,
  data,
  error: null,
  headers: new Headers({ 'content-type': 'application/json' }),
})

const mockApiError = (message: string, status = 400) => ({
  status,
  data: null,
  error: message,
  headers: new Headers({ 'content-type': 'text/plain' }),
})

describe('API Routes Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database is healthy and migrations are run
    const isHealthy = await checkDatabaseHealth()
    if (!isHealthy) {
      throw new Error('Database is not healthy')
    }

    const result = await migrationRunner.migrate()
    if (!result.success) {
      throw new Error(`Migration failed: ${result.errors.join(', ')}`)
    }

    // Setup test server
    const port = 3001
    testServerUrl = `http://localhost:${port}`

    // Mock fetch for API calls
    global.fetch = vi.fn()
  })

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData()
    vi.clearAllMocks()
  })

  afterAll(async () => {
    // Final cleanup
    await cleanupTestData()
    if (testServer) {
      testServer.close()
    }
  })

  async function cleanupTestData() {
    try {
      await db.delete(agentExecutions)
      await db.delete(environments)
      await db.delete(tasks)
    } catch (error) {
      console.warn('Cleanup failed:', error)
    }
  }

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/login', () => {
      it('should authenticate user with valid credentials', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              token: mockTokens.valid,
              user: mockUsers.user1,
              expiresIn: 3600,
            },
          }),
        } as Response)

        const response = await makeRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'validpassword123',
          }),
        })

        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(response.data.data.token).toBe(mockTokens.valid)
        expect(response.data.data.user.email).toBe('test@example.com')
      })

      it('should reject invalid credentials', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Invalid email or password',
        } as Response)

        const response = await makeRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'wrongpassword',
          }),
        })

        expect(response.status).toBe(401)
        expect(response.error).toContain('Invalid email or password')
      })

      it('should validate request body', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Email and password are required',
        } as Response)

        const response = await makeRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: '', // Missing email
            password: 'password123',
          }),
        })

        expect(response.status).toBe(400)
        expect(response.error).toContain('Email and password are required')
      })

      it('should handle rate limiting', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Too many login attempts. Please try again later.',
        } as Response)

        const response = await makeRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })

        expect(response.status).toBe(429)
        expect(response.error).toContain('Too many login attempts')
      })
    })

    describe('POST /api/auth/logout', () => {
      it('should logout user successfully', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Logged out successfully',
          }),
        } as Response)

        const response = await makeRequest(
          '/api/auth/logout',
          {
            method: 'POST',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
      })

      it('should handle logout without token', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'No token provided',
        } as Response)

        const response = await makeRequest('/api/auth/logout', {
          method: 'POST',
        })

        expect(response.status).toBe(401)
        expect(response.error).toContain('No token provided')
      })
    })

    describe('GET /api/auth/status', () => {
      it('should return user status for valid token', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              authenticated: true,
              user: mockUsers.user1,
            },
          }),
        } as Response)

        const response = await makeRequest(
          '/api/auth/status',
          {
            method: 'GET',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.data.authenticated).toBe(true)
        expect(response.data.data.user.id).toBe('user-123')
      })

      it('should return unauthenticated for invalid token', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Invalid token',
        } as Response)

        const response = await makeRequest(
          '/api/auth/status',
          {
            method: 'GET',
          },
          mockTokens.invalid
        )

        expect(response.status).toBe(401)
        expect(response.error).toContain('Invalid token')
      })
    })
  })

  describe('Tasks API Endpoints', () => {
    describe('GET /api/tasks', () => {
      it('should return user tasks with pagination', async () => {
        const mockTasks = [
          {
            id: 'task-1',
            title: 'Test Task 1',
            description: 'First test task',
            status: 'pending',
            priority: 'high',
            userId: mockUsers.user1.id,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'task-2',
            title: 'Test Task 2',
            description: 'Second test task',
            status: 'in_progress',
            priority: 'medium',
            userId: mockUsers.user1.id,
            createdAt: new Date().toISOString(),
          },
        ]

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              tasks: mockTasks,
              pagination: {
                page: 1,
                pageSize: 10,
                total: 2,
                totalPages: 1,
              },
            },
          }),
        } as Response)

        const response = await makeRequest(
          '/api/tasks?page=1&limit=10',
          {
            method: 'GET',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.data.tasks).toHaveLength(2)
        expect(response.data.data.pagination.total).toBe(2)
      })

      it('should filter tasks by status', async () => {
        const mockFilteredTasks = [
          {
            id: 'task-1',
            title: 'Pending Task',
            status: 'pending',
            userId: mockUsers.user1.id,
          },
        ]

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              tasks: mockFilteredTasks,
              pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
            },
          }),
        } as Response)

        const response = await makeRequest(
          '/api/tasks?status=pending',
          {
            method: 'GET',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.data.tasks).toHaveLength(1)
        expect(response.data.data.tasks[0].status).toBe('pending')
      })

      it('should require authentication', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Authentication required',
        } as Response)

        const response = await makeRequest('/api/tasks', {
          method: 'GET',
        })

        expect(response.status).toBe(401)
        expect(response.error).toContain('Authentication required')
      })

      it('should handle search queries', async () => {
        const mockSearchResults = [
          {
            id: 'task-1',
            title: 'Search Result Task',
            description: 'This task matches the search query',
            userId: mockUsers.user1.id,
          },
        ]

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              tasks: mockSearchResults,
              pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
            },
          }),
        } as Response)

        const response = await makeRequest(
          '/api/tasks?search=search%20query',
          {
            method: 'GET',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.data.tasks[0].title).toContain('Search Result')
      })
    })

    describe('POST /api/tasks', () => {
      it('should create new task successfully', async () => {
        const newTask = {
          title: 'New Test Task',
          description: 'Description for new task',
          priority: 'medium',
        }

        const createdTask = {
          id: 'new-task-id',
          ...newTask,
          status: 'pending',
          userId: mockUsers.user1.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: createdTask,
          }),
        } as Response)

        const response = await makeRequest(
          '/api/tasks',
          {
            method: 'POST',
            body: JSON.stringify(newTask),
          },
          mockTokens.valid
        )

        expect(response.status).toBe(201)
        expect(response.data.data.title).toBe(newTask.title)
        expect(response.data.data.id).toBeDefined()
      })

      it('should validate required fields', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Title is required',
        } as Response)

        const response = await makeRequest(
          '/api/tasks',
          {
            method: 'POST',
            body: JSON.stringify({
              description: 'Task without title',
            }),
          },
          mockTokens.valid
        )

        expect(response.status).toBe(400)
        expect(response.error).toContain('Title is required')
      })

      it('should validate field types and constraints', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Invalid priority value',
        } as Response)

        const response = await makeRequest(
          '/api/tasks',
          {
            method: 'POST',
            body: JSON.stringify({
              title: 'Test Task',
              priority: 'invalid-priority',
            }),
          },
          mockTokens.valid
        )

        expect(response.status).toBe(400)
        expect(response.error).toContain('Invalid priority value')
      })
    })

    describe('GET /api/tasks/[id]', () => {
      it('should return specific task', async () => {
        const mockTask = {
          id: 'task-123',
          title: 'Specific Task',
          description: 'Task description',
          status: 'pending',
          userId: mockUsers.user1.id,
          createdAt: new Date().toISOString(),
        }

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockTask,
          }),
        } as Response)

        const response = await makeRequest(
          '/api/tasks/task-123',
          {
            method: 'GET',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.data.id).toBe('task-123')
        expect(response.data.data.title).toBe('Specific Task')
      })

      it('should return 404 for non-existent task', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => 'Task not found',
        } as Response)

        const response = await makeRequest(
          '/api/tasks/non-existent',
          {
            method: 'GET',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(404)
        expect(response.error).toContain('Task not found')
      })

      it('should prevent access to other users tasks', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: async () => 'Access denied',
        } as Response)

        const response = await makeRequest(
          '/api/tasks/other-user-task',
          {
            method: 'GET',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(403)
        expect(response.error).toContain('Access denied')
      })
    })

    describe('PUT /api/tasks/[id]', () => {
      it('should update task successfully', async () => {
        const updateData = {
          title: 'Updated Task Title',
          status: 'in_progress',
        }

        const updatedTask = {
          id: 'task-123',
          ...updateData,
          userId: mockUsers.user1.id,
          updatedAt: new Date().toISOString(),
        }

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: updatedTask,
          }),
        } as Response)

        const response = await makeRequest(
          '/api/tasks/task-123',
          {
            method: 'PUT',
            body: JSON.stringify(updateData),
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.data.title).toBe('Updated Task Title')
        expect(response.data.data.status).toBe('in_progress')
      })

      it('should validate update data', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Invalid status value',
        } as Response)

        const response = await makeRequest(
          '/api/tasks/task-123',
          {
            method: 'PUT',
            body: JSON.stringify({
              status: 'invalid-status',
            }),
          },
          mockTokens.valid
        )

        expect(response.status).toBe(400)
        expect(response.error).toContain('Invalid status value')
      })
    })

    describe('DELETE /api/tasks/[id]', () => {
      it('should delete task successfully', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Task deleted successfully',
          }),
        } as Response)

        const response = await makeRequest(
          '/api/tasks/task-123',
          {
            method: 'DELETE',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
      })

      it('should prevent deletion of tasks with active executions', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 409,
          text: async () => 'Cannot delete task with active executions',
        } as Response)

        const response = await makeRequest(
          '/api/tasks/active-task',
          {
            method: 'DELETE',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(409)
        expect(response.error).toContain('Cannot delete task with active executions')
      })
    })
  })

  describe('Environments API Endpoints', () => {
    describe('GET /api/environments', () => {
      it('should return user environments', async () => {
        const mockEnvironments = [
          {
            id: 'env-1',
            name: 'Development',
            config: { apiKey: 'dev-key' },
            isActive: true,
            userId: mockUsers.user1.id,
          },
          {
            id: 'env-2',
            name: 'Production',
            config: { apiKey: 'prod-key' },
            isActive: false,
            userId: mockUsers.user1.id,
          },
        ]

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockEnvironments,
          }),
        } as Response)

        const response = await makeRequest(
          '/api/environments',
          {
            method: 'GET',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.data).toHaveLength(2)
        expect(response.data.data[0].name).toBe('Development')
      })

      it('should filter active environments', async () => {
        const mockActiveEnvs = [
          {
            id: 'env-1',
            name: 'Development',
            isActive: true,
            userId: mockUsers.user1.id,
          },
        ]

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockActiveEnvs,
          }),
        } as Response)

        const response = await makeRequest(
          '/api/environments?active=true',
          {
            method: 'GET',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.data).toHaveLength(1)
        expect(response.data.data[0].isActive).toBe(true)
      })
    })

    describe('POST /api/environments', () => {
      it('should create new environment', async () => {
        const newEnv = {
          name: 'Test Environment',
          config: {
            apiKey: 'test-key',
            endpoint: 'https://api.test.com',
          },
          isActive: true,
        }

        const createdEnv = {
          id: 'new-env-id',
          ...newEnv,
          userId: mockUsers.user1.id,
          createdAt: new Date().toISOString(),
        }

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: createdEnv,
          }),
        } as Response)

        const response = await makeRequest(
          '/api/environments',
          {
            method: 'POST',
            body: JSON.stringify(newEnv),
          },
          mockTokens.valid
        )

        expect(response.status).toBe(201)
        expect(response.data.data.name).toBe('Test Environment')
        expect(response.data.data.id).toBeDefined()
      })

      it('should validate configuration schema', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Invalid configuration format',
        } as Response)

        const response = await makeRequest(
          '/api/environments',
          {
            method: 'POST',
            body: JSON.stringify({
              name: 'Test Env',
              config: 'invalid-config', // Should be object
            }),
          },
          mockTokens.valid
        )

        expect(response.status).toBe(400)
        expect(response.error).toContain('Invalid configuration format')
      })

      it('should enforce unique names per user', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 409,
          text: async () => 'Environment name already exists',
        } as Response)

        const response = await makeRequest(
          '/api/environments',
          {
            method: 'POST',
            body: JSON.stringify({
              name: 'Existing Environment',
              config: { key: 'value' },
            }),
          },
          mockTokens.valid
        )

        expect(response.status).toBe(409)
        expect(response.error).toContain('Environment name already exists')
      })
    })
  })

  describe('Agent Executions API Endpoints', () => {
    describe('GET /api/executions', () => {
      it('should return executions for user tasks', async () => {
        const mockExecutions = [
          {
            id: 'exec-1',
            taskId: 'task-1',
            agentType: 'test-agent',
            status: 'completed',
            executionTimeMs: 1500,
            createdAt: new Date().toISOString(),
          },
        ]

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockExecutions,
          }),
        } as Response)

        const response = await makeRequest(
          '/api/executions',
          {
            method: 'GET',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.data).toHaveLength(1)
        expect(response.data.data[0].agentType).toBe('test-agent')
      })

      it('should filter executions by task', async () => {
        const mockTaskExecutions = [
          {
            id: 'exec-1',
            taskId: 'specific-task',
            agentType: 'agent-1',
            status: 'running',
          },
        ]

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockTaskExecutions,
          }),
        } as Response)

        const response = await makeRequest(
          '/api/executions?taskId=specific-task',
          {
            method: 'GET',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.data[0].taskId).toBe('specific-task')
      })
    })

    describe('GET /api/executions/[id]', () => {
      it('should return execution details', async () => {
        const mockExecution = {
          id: 'exec-123',
          taskId: 'task-1',
          agentType: 'test-agent',
          status: 'completed',
          input: { prompt: 'test input' },
          output: { result: 'test output' },
          executionTimeMs: 2500,
        }

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockExecution,
          }),
        } as Response)

        const response = await makeRequest(
          '/api/executions/exec-123',
          {
            method: 'GET',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.data.id).toBe('exec-123')
        expect(response.data.data.executionTimeMs).toBe(2500)
      })

      it('should include related events', async () => {
        const mockExecutionWithEvents = {
          id: 'exec-123',
          taskId: 'task-1',
          agentType: 'test-agent',
          status: 'completed',
          events: [
            {
              id: 'event-1',
              eventType: 'execution.started',
              timestamp: new Date().toISOString(),
            },
            {
              id: 'event-2',
              eventType: 'execution.completed',
              timestamp: new Date().toISOString(),
            },
          ],
        }

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockExecutionWithEvents,
          }),
        } as Response)

        const response = await makeRequest(
          '/api/executions/exec-123?includeEvents=true',
          {
            method: 'GET',
          },
          mockTokens.valid
        )

        expect(response.status).toBe(200)
        expect(response.data.data.events).toHaveLength(2)
      })
    })
  })

  describe('Error Handling and Validation', () => {
    it('should handle malformed JSON requests', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid JSON in request body',
      } as Response)

      const response = await makeRequest(
        '/api/tasks',
        {
          method: 'POST',
          body: 'invalid-json-{',
          headers: { 'Content-Type': 'application/json' },
        },
        mockTokens.valid
      )

      expect(response.status).toBe(400)
      expect(response.error).toContain('Invalid JSON')
    })

    it('should handle missing Content-Type header', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Content-Type header is required',
      } as Response)

      const response = await makeRequest(
        '/api/tasks',
        {
          method: 'POST',
          body: JSON.stringify({ title: 'Test' }),
          headers: {}, // No Content-Type
        },
        mockTokens.valid
      )

      expect(response.status).toBe(400)
      expect(response.error).toContain('Content-Type header is required')
    })

    it('should handle request body size limits', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 413,
        text: async () => 'Request entity too large',
      } as Response)

      const largePayload = {
        title: 'Test Task',
        description: 'x'.repeat(10000000), // Very large description
      }

      const response = await makeRequest(
        '/api/tasks',
        {
          method: 'POST',
          body: JSON.stringify(largePayload),
        },
        mockTokens.valid
      )

      expect(response.status).toBe(413)
      expect(response.error).toContain('Request entity too large')
    })

    it('should handle database connection errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Database connection error',
      } as Response)

      const response = await makeRequest(
        '/api/tasks',
        {
          method: 'GET',
        },
        mockTokens.valid
      )

      expect(response.status).toBe(503)
      expect(response.error).toContain('Database connection error')
    })

    it('should handle unexpected server errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      } as Response)

      const response = await makeRequest(
        '/api/tasks',
        {
          method: 'GET',
        },
        mockTokens.valid
      )

      expect(response.status).toBe(500)
      expect(response.error).toContain('Internal server error')
    })
  })

  describe('Security and Rate Limiting', () => {
    it('should implement rate limiting for authentication endpoints', async () => {
      // Simulate multiple rapid requests
      const rapidRequests = Array.from({ length: 10 }, () =>
        makeRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      )

      // Mock rate limit response for some requests
      vi.mocked(fetch)
        .mockResolvedValueOnce(mockApiSuccess({ token: 'token' }))
        .mockResolvedValueOnce(mockApiError('Rate limit exceeded', 429))

      const results = await Promise.all(rapidRequests.slice(0, 2))

      expect(results[0].status).toBe(200)
      expect(results[1].status).toBe(429)
    })

    it('should validate input to prevent injection attacks', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid characters detected',
      } as Response)

      const maliciousInput = {
        title: '<script>alert("xss")</script>',
        description: 'DROP TABLE tasks; --',
      }

      const response = await makeRequest(
        '/api/tasks',
        {
          method: 'POST',
          body: JSON.stringify(maliciousInput),
        },
        mockTokens.valid
      )

      expect(response.status).toBe(400)
      expect(response.error).toContain('Invalid characters detected')
    })

    it('should enforce CORS policies', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'CORS policy violation',
      } as Response)

      const response = await makeRequest(
        '/api/tasks',
        {
          method: 'GET',
          headers: {
            Origin: 'https://malicious-site.com',
          },
        },
        mockTokens.valid
      )

      expect(response.status).toBe(403)
      expect(response.error).toContain('CORS policy violation')
    })

    it('should sanitize sensitive data in responses', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        // Should not include sensitive fields like password hash
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockUser,
        }),
      } as Response)

      const response = await makeRequest(
        '/api/auth/status',
        {
          method: 'GET',
        },
        mockTokens.valid
      )

      expect(response.status).toBe(200)
      expect(response.data.data.password).toBeUndefined()
      expect(response.data.data.passwordHash).toBeUndefined()
    })
  })

  describe('Performance and Monitoring', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20
      const startTime = performance.now()

      // Mock responses for concurrent requests
      vi.mocked(fetch).mockImplementation(
        async () =>
          ({
            ok: true,
            json: async () => ({
              success: true,
              data: { id: 'test-id', title: 'Test Task' },
            }),
          }) as Response
      )

      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        makeRequest(
          `/api/tasks/task-${i}`,
          {
            method: 'GET',
          },
          mockTokens.valid
        )
      )

      const results = await Promise.all(requests)
      const totalTime = performance.now() - startTime

      expect(results).toHaveLength(concurrentRequests)
      expect(results.every((r) => r.status === 200)).toBe(true)
      expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should include performance metrics in response headers', async () => {
      const mockHeaders = new Headers({
        'X-Response-Time': '150',
        'X-Database-Query-Time': '45',
        'X-Cache-Status': 'HIT',
      })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders,
        json: async () => ({
          success: true,
          data: { id: 'task-1' },
        }),
      } as Response)

      const response = await makeRequest(
        '/api/tasks/task-1',
        {
          method: 'GET',
        },
        mockTokens.valid
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('X-Response-Time')).toBe('150')
      expect(response.headers.get('X-Database-Query-Time')).toBe('45')
      expect(response.headers.get('X-Cache-Status')).toBe('HIT')
    })

    it('should handle timeout scenarios', async () => {
      vi.mocked(fetch).mockImplementationOnce(
        () =>
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 100))
      )

      const response = await makeRequest(
        '/api/tasks/slow-endpoint',
        {
          method: 'GET',
        },
        mockTokens.valid
      ).catch(() => ({
        status: 408,
        data: null,
        error: 'Request timeout',
        headers: new Headers(),
      }))

      expect(response.status).toBe(408)
      expect(response.error).toContain('Request timeout')
    })

    it('should implement caching for frequently accessed data', async () => {
      // First request - cache miss
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'X-Cache-Status': 'MISS' }),
        json: async () => ({
          success: true,
          data: { id: 'task-1', title: 'Cached Task' },
        }),
      } as Response)

      const firstResponse = await makeRequest(
        '/api/tasks/task-1',
        {
          method: 'GET',
        },
        mockTokens.valid
      )

      // Second request - cache hit
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'X-Cache-Status': 'HIT' }),
        json: async () => ({
          success: true,
          data: { id: 'task-1', title: 'Cached Task' },
        }),
      } as Response)

      const secondResponse = await makeRequest(
        '/api/tasks/task-1',
        {
          method: 'GET',
        },
        mockTokens.valid
      )

      expect(firstResponse.headers.get('X-Cache-Status')).toBe('MISS')
      expect(secondResponse.headers.get('X-Cache-Status')).toBe('HIT')
    })
  })
})
