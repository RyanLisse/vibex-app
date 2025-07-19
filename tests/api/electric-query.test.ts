/**
 * API Routes Tests - ElectricSQL Query
 *
 * Tests for the ElectricSQL query API route that provides server-side fallback
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/electric/query/route'
import { db } from '@/db/config'
import { sql } from 'drizzle-orm'

// Mock database
vi.mock('@/db/config', () => ({
  db: {
    execute: vi.fn(),
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
  },
}))

// Mock SQL helper
vi.mock('drizzle-orm', () => ({
  sql: {
    raw: vi.fn(),
  },
}))

describe('ElectricSQL Query API', () => {
  const mockDb = vi.mocked(db)
  const mockSql = vi.mocked(sql)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/electric/query', () => {
    it('should return health check information', async () => {
      mockDb.execute.mockResolvedValue([{ health: 1 }])

      const { req } = createMocks({
        method: 'GET',
        url: '/api/electric/query',
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.status).toBe('ok')
      expect(data.data.healthy).toBe(true)
      expect(data.data.config).toBeDefined()
      expect(data.data.config.allowedQueryTypes).toContain('SELECT')
    })

    it('should handle health check database errors', async () => {
      mockDb.execute.mockRejectedValue(new Error('Database connection failed'))

      const { req } = createMocks({
        method: 'GET',
        url: '/api/electric/query',
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Health check failed')
    })
  })

  describe('POST /api/electric/query', () => {
    it('should execute SELECT query successfully', async () => {
      const mockResults = [
        { id: '1', title: 'Task 1', status: 'pending' },
        { id: '2', title: 'Task 2', status: 'completed' },
      ]

      mockDb.execute.mockResolvedValue(mockResults)
      mockSql.raw.mockReturnValue('mocked-sql-query')

      const { req } = createMocks({
        method: 'POST',
        url: '/api/electric/query',
        body: {
          query: 'SELECT * FROM tasks',
          params: [],
          syncMode: 'server-first',
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.data).toEqual(mockResults)
      expect(data.data.rowCount).toBe(2)
      expect(data.data.source).toBe('server')
      expect(data.data.syncTimestamp).toBeDefined()
    })

    it('should add user filtering when userId is provided', async () => {
      const mockResults = [{ id: '1', title: 'User Task', status: 'pending', user_id: 'user-123' }]

      mockDb.execute.mockResolvedValue(mockResults)
      mockSql.raw.mockReturnValue('mocked-sql-query-with-user-filter')

      const { req } = createMocks({
        method: 'POST',
        url: '/api/electric/query',
        body: {
          query: 'SELECT * FROM tasks',
          params: [],
          userId: 'user-123',
          syncMode: 'hybrid',
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.data).toEqual(mockResults)

      // Verify that user filtering was applied
      expect(mockSql.raw).toHaveBeenCalledWith('SELECT * FROM tasks WHERE user_id = $1', [
        'user-123',
      ])
    })

    it('should reject non-SELECT queries', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/electric/query',
        body: {
          query: 'DELETE FROM tasks WHERE id = 1',
          params: [],
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Only SELECT queries are allowed')
    })

    it('should validate request data', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/electric/query',
        body: {
          // Missing required 'query' field
          params: [],
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request data')
    })

    it('should handle database execution errors', async () => {
      mockDb.execute.mockRejectedValue(new Error('Query execution failed'))
      mockSql.raw.mockReturnValue('mocked-failing-query')

      const { req } = createMocks({
        method: 'POST',
        url: '/api/electric/query',
        body: {
          query: 'SELECT * FROM non_existent_table',
          params: [],
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to execute query')
    })

    it('should handle complex queries with parameters', async () => {
      const mockResults = [
        {
          id: '1',
          title: 'Filtered Task',
          status: 'pending',
          priority: 'high',
        },
      ]

      mockDb.execute.mockResolvedValue(mockResults)
      mockSql.raw.mockReturnValue('mocked-complex-query')

      const { req } = createMocks({
        method: 'POST',
        url: '/api/electric/query',
        body: {
          query: 'SELECT * FROM tasks WHERE status = $1 AND priority = $2',
          params: ['pending', 'high'],
          syncMode: 'local-first',
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.data).toEqual(mockResults)

      // Verify parameters were passed correctly
      expect(mockSql.raw).toHaveBeenCalledWith(
        'SELECT * FROM tasks WHERE status = $1 AND priority = $2',
        ['pending', 'high']
      )
    })

    it('should include execution metadata in response', async () => {
      const mockResults = [{ id: '1', title: 'Task' }]
      mockDb.execute.mockResolvedValue(mockResults)
      mockSql.raw.mockReturnValue('mocked-query')

      const { req } = createMocks({
        method: 'POST',
        url: '/api/electric/query',
        body: {
          query: 'SELECT * FROM tasks LIMIT 1',
          params: [],
          syncMode: 'hybrid',
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.metadata).toBeDefined()
      expect(data.metadata.executionTime).toBeDefined()
      expect(data.metadata.syncMode).toBe('hybrid')
      expect(data.metadata.source).toBe('server')
    })

    it('should handle empty query results', async () => {
      mockDb.execute.mockResolvedValue([])
      mockSql.raw.mockReturnValue('mocked-empty-query')

      const { req } = createMocks({
        method: 'POST',
        url: '/api/electric/query',
        body: {
          query: 'SELECT * FROM tasks WHERE status = $1',
          params: ['non_existent_status'],
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.data).toEqual([])
      expect(data.data.rowCount).toBe(0)
    })

    it('should validate sync mode parameter', async () => {
      const mockResults = [{ id: '1', title: 'Task' }]
      mockDb.execute.mockResolvedValue(mockResults)
      mockSql.raw.mockReturnValue('mocked-query')

      const { req } = createMocks({
        method: 'POST',
        url: '/api/electric/query',
        body: {
          query: 'SELECT * FROM tasks',
          params: [],
          syncMode: 'invalid-mode', // Invalid sync mode
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request data')
    })
  })
})
