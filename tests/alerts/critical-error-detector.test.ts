import { beforeEach, describe, expect, it } from 'vitest'
import type { LogEntry } from 'winston'
import { CriticalErrorDetector } from '@/lib/alerts/critical-error-detector'
import { CriticalErrorType } from '@/lib/alerts/types'

describe('CriticalErrorDetector', () => {
  let detector: CriticalErrorDetector

  beforeEach(() => {
    detector = new CriticalErrorDetector()
  })

  describe('detectCriticalError', () => {
    it('should detect database connection failures', () => {
      const logEntry: LogEntry = {
        level: 'error',
        message: 'Database connection failed',
        meta: {},
        timestamp: new Date().toISOString(),
      }

      const result = detector.detectCriticalError(logEntry)

      expect(result).toBeTruthy()
      expect(result?.type).toBe(CriticalErrorType.DATABASE_CONNECTION_FAILURE)
      expect(result?.severity).toBe('critical')
      expect(result?.message).toContain('Database connection failed')
    })

    it('should detect Redis connection failures', () => {
      const logEntry: LogEntry = {
        level: 'error',
        message: 'Redis connection error occurred',
        meta: {},
        timestamp: new Date().toISOString(),
      }

      const result = detector.detectCriticalError(logEntry)

      expect(result).toBeTruthy()
      expect(result?.type).toBe(CriticalErrorType.REDIS_CONNECTION_FAILURE)
      expect(result?.severity).toBe('critical')
    })

    it('should detect authentication service failures', () => {
      const logEntry: LogEntry = {
        level: 'error',
        message: 'OAuth token exchange failed',
        meta: {},
        timestamp: new Date().toISOString(),
      }

      const result = detector.detectCriticalError(logEntry)

      expect(result).toBeTruthy()
      expect(result?.type).toBe(CriticalErrorType.AUTH_SERVICE_FAILURE)
      expect(result?.severity).toBe('critical')
    })

    it('should detect workflow execution failures', () => {
      const logEntry: LogEntry = {
        level: 'error',
        message: 'Workflow execution failed with error',
        meta: {},
        timestamp: new Date().toISOString(),
      }

      const result = detector.detectCriticalError(logEntry)

      expect(result).toBeTruthy()
      expect(result?.type).toBe(CriticalErrorType.WORKFLOW_EXECUTION_FAILURE)
      expect(result?.severity).toBe('high')
    })

    it('should detect system health failures', () => {
      const logEntry: LogEntry = {
        level: 'error',
        message: 'System health check failed',
        meta: {},
        timestamp: new Date().toISOString(),
      }

      const result = detector.detectCriticalError(logEntry)

      expect(result).toBeTruthy()
      expect(result?.type).toBe(CriticalErrorType.SYSTEM_HEALTH_FAILURE)
      expect(result?.severity).toBe('critical')
    })

    it('should not detect critical errors for non-error log levels', () => {
      const logEntry: LogEntry = {
        level: 'info',
        message: 'Database connection failed',
        meta: {},
        timestamp: new Date().toISOString(),
      }

      const result = detector.detectCriticalError(logEntry)

      expect(result).toBeNull()
    })

    it('should not detect critical errors for non-matching patterns', () => {
      const logEntry: LogEntry = {
        level: 'error',
        message: 'Regular application error',
        meta: {},
        timestamp: new Date().toISOString(),
      }

      const result = detector.detectCriticalError(logEntry)

      expect(result).toBeNull()
    })

    it('should include correlation ID when present', () => {
      const logEntry: LogEntry = {
        level: 'error',
        message: 'Database connection failed',
        correlationId: 'test-correlation-123',
        meta: {},
        timestamp: new Date().toISOString(),
      }

      const result = detector.detectCriticalError(logEntry)

      expect(result).toBeTruthy()
      expect(result?.correlationId).toBe('test-correlation-123')
    })

    it('should include user and session information when present', () => {
      const logEntry: LogEntry = {
        level: 'error',
        message: 'Authentication service failed',
        userId: 'user-123',
        sessionId: 'session-456',
        meta: {},
        timestamp: new Date().toISOString(),
      }

      const result = detector.detectCriticalError(logEntry)

      expect(result).toBeTruthy()
      expect(result?.userId).toBe('user-123')
      expect(result?.sessionId).toBe('session-456')
    })

    it('should include stack trace when present', () => {
      const logEntry: LogEntry = {
        level: 'error',
        message: 'Database connection failed',
        stack: 'Error: Database connection failed\n    at connect (db.js:123)',
        meta: {},
        timestamp: new Date().toISOString(),
      }

      const result = detector.detectCriticalError(logEntry)

      expect(result).toBeTruthy()
      expect(result?.stackTrace).toContain('Error: Database connection failed')
    })
  })

  describe('addCustomPattern', () => {
    it('should allow adding custom error patterns', () => {
      const customPattern = /custom.*critical.*error/i
      detector.addCustomPattern(CriticalErrorType.SYSTEM_HEALTH_FAILURE, customPattern)

      const logEntry: LogEntry = {
        level: 'error',
        message: 'Custom critical error detected',
        meta: {},
        timestamp: new Date().toISOString(),
      }

      const result = detector.detectCriticalError(logEntry)

      expect(result).toBeTruthy()
      expect(result?.type).toBe(CriticalErrorType.SYSTEM_HEALTH_FAILURE)
    })
  })

  describe('getTemplate', () => {
    it('should return the correct template for each error type', () => {
      const template = detector.getTemplate(CriticalErrorType.DATABASE_CONNECTION_FAILURE)

      expect(template).toBeTruthy()
      expect(template?.type).toBe(CriticalErrorType.DATABASE_CONNECTION_FAILURE)
      expect(template?.subject).toContain('Database Connection Failure')
      expect(template?.severity).toBe('critical')
    })

    it('should return undefined for non-existent error types', () => {
      const template = detector.getTemplate('non-existent-type' as CriticalErrorType)

      expect(template).toBeUndefined()
    })
  })
})
