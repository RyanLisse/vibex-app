import * as Sentry from '@sentry/nextjs'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  addBreadcrumb,
  clearSentryUser,
  instrumentApiRoute,
  instrumentDatabaseOperation,
  instrumentInngestFunction,
  instrumentServerAction,
  setSentryUser,
} from '../../lib/sentry/instrumentation'

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  startSpan: vi.fn((options, callback) => callback()),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  setContext: vi.fn(),
  setTags: vi.fn(),
  metrics: {
    gauge: vi.fn(),
    increment: vi.fn(),
    distribution: vi.fn(),
    set: vi.fn(),
  },
}))

// Mock OpenTelemetry
vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => ({
      startSpan: vi.fn(() => ({
        end: vi.fn(),
        recordException: vi.fn(),
        setAttributes: vi.fn(),
      })),
    })),
  },
}))

describe('Sentry Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('instrumentApiRoute', () => {
    test('should instrument successful API route', async () => {
      const handler = vi.fn().mockResolvedValue({ data: 'test' })

      const result = await instrumentApiRoute('GET', '/api/test', handler)

      expect(result).toEqual({ data: 'test' })
      expect(handler).toHaveBeenCalled()
      expect(Sentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          op: 'http.server',
          name: 'GET /api/test',
        }),
        expect.any(Function)
      )
    })

    test('should handle API route errors', async () => {
      const error = new Error('API Error')
      const handler = vi.fn().mockRejectedValue(error)

      await expect(instrumentApiRoute('POST', '/api/test', handler)).rejects.toThrow('API Error')
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('instrumentDatabaseOperation', () => {
    test('should instrument successful database operation', async () => {
      const operation = vi.fn().mockResolvedValue([{ id: 1, name: 'Test' }])

      const result = await instrumentDatabaseOperation('select', 'SELECT * FROM users', operation)

      expect(result).toEqual([{ id: 1, name: 'Test' }])
      expect(operation).toHaveBeenCalled()
      expect(Sentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          op: 'db.select',
          name: expect.stringContaining('SELECT * FROM users'),
        }),
        expect.any(Function)
      )
    })

    test('should handle database errors', async () => {
      const error = new Error('Database Error')
      const operation = vi.fn().mockRejectedValue(error)

      await expect(
        instrumentDatabaseOperation('insert', 'INSERT INTO users', operation)
      ).rejects.toThrow('Database Error')
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('instrumentServerAction', () => {
    test('should instrument successful server action', async () => {
      const action = vi.fn().mockResolvedValue({ success: true })

      const result = await instrumentServerAction('createTask', action)

      expect(result).toEqual({ success: true })
      expect(action).toHaveBeenCalled()
      expect(Sentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          op: 'action.createTask',
          name: 'Server Action: createTask',
        }),
        expect.any(Function)
      )
    })

    test('should handle server action errors', async () => {
      const error = new Error('Action Error')
      const action = vi.fn().mockRejectedValue(error)

      await expect(instrumentServerAction('failedAction', action)).rejects.toThrow('Action Error')
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('instrumentInngestFunction', () => {
    test('should instrument Inngest function', async () => {
      const handler = vi.fn().mockResolvedValue({ processed: true })
      const instrumentedHandler = instrumentInngestFunction('processJob', handler)

      const result = await instrumentedHandler('arg1', 'arg2')

      expect(result).toEqual({ processed: true })
      expect(handler).toHaveBeenCalledWith('arg1', 'arg2')
      expect(Sentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          op: 'job.processJob',
          name: 'Background Job: processJob',
        }),
        expect.any(Function)
      )
    })
  })

  describe('Sentry utilities', () => {
    test('should add breadcrumb', () => {
      const data = { userId: '123' }
      addBreadcrumb('Test breadcrumb', 'test', 'info', data)

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Test breadcrumb',
        category: 'test',
        level: 'info',
        data,
        timestamp: expect.any(Number),
      })
    })

    test('should set user context', () => {
      const user = { id: '123', email: 'test@example.com' }
      setSentryUser(user)

      expect(Sentry.setUser).toHaveBeenCalledWith(user)
    })

    test('should clear user context', () => {
      clearSentryUser()

      expect(Sentry.setUser).toHaveBeenCalledWith(null)
    })
  })
})
