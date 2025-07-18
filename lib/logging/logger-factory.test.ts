import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LoggerFactory, ComponentLogger } from './logger-factory'
import { createDefaultLoggingConfig } from './config'
import { LoggingConfig } from './types'

describe('LoggerFactory', () => {
  let config: LoggingConfig

  beforeEach(() => {
    config = createDefaultLoggingConfig()
    config.console.enabled = false // Disable console output in tests
    config.file.enabled = false // Disable file output in tests
    config.silent = true // Make winston silent
  })

  afterEach(() => {
    // Reset singleton instance
    ;(LoggerFactory as any).instance = undefined
  })

  describe('getInstance', () => {
    it('should create a singleton instance', () => {
      const factory1 = LoggerFactory.getInstance(config)
      const factory2 = LoggerFactory.getInstance()

      expect(factory1).toBe(factory2)
    })

    it('should throw error if no config provided on first call', () => {
      expect(() => LoggerFactory.getInstance()).toThrow(
        'LoggerFactory requires configuration on first initialization'
      )
    })
  })

  describe('createLogger', () => {
    it('should create a component logger', () => {
      const factory = LoggerFactory.getInstance(config)
      const logger = factory.createLogger('test-component')

      expect(logger).toBeInstanceOf(ComponentLogger)
    })

    it('should create different loggers for different components', () => {
      const factory = LoggerFactory.getInstance(config)
      const logger1 = factory.createLogger('component1')
      const logger2 = factory.createLogger('component2')

      expect(logger1).not.toBe(logger2)
    })
  })

  describe('withContext', () => {
    it('should execute function with context', () => {
      const factory = LoggerFactory.getInstance(config)
      const context = { userId: 'test-user', operation: 'test-op' }

      const result = factory.withContext(context, () => {
        return 'test-result'
      })

      expect(result).toBe('test-result')
    })

    it('should execute async function with context', async () => {
      const factory = LoggerFactory.getInstance(config)
      const context = { userId: 'test-user', operation: 'test-op' }

      const result = await factory.withContextAsync(context, async () => {
        return Promise.resolve('async-result')
      })

      expect(result).toBe('async-result')
    })
  })

  describe('updateLogLevel', () => {
    it('should update log level', () => {
      const factory = LoggerFactory.getInstance(config)

      factory.updateLogLevel('error')

      const updatedConfig = factory.getConfig()
      expect(updatedConfig.level).toBe('error')
    })
  })

  describe('getMetrics', () => {
    it('should return logging metrics', () => {
      const factory = LoggerFactory.getInstance(config)
      const metrics = factory.getMetrics()

      expect(metrics).toHaveProperty('totalLogs')
      expect(metrics).toHaveProperty('logsByLevel')
      expect(metrics).toHaveProperty('averageLoggingTime')
      expect(metrics).toHaveProperty('operationMetrics')
      expect(metrics).toHaveProperty('errors')
    })
  })
})

describe('ComponentLogger', () => {
  let factory: LoggerFactory
  let logger: ComponentLogger

  beforeEach(() => {
    const config = createDefaultLoggingConfig()
    config.console.enabled = false
    config.file.enabled = false
    config.silent = true

    factory = LoggerFactory.getInstance(config)
    logger = factory.createLogger('test-component')
  })

  afterEach(() => {
    ;(LoggerFactory as any).instance = undefined
  })

  describe('log methods', () => {
    it('should have all log level methods', () => {
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.trace).toBe('function')
    })

    it('should not throw when logging', () => {
      expect(() => logger.info('test message')).not.toThrow()
      expect(() => logger.error('test error', new Error('test'))).not.toThrow()
      expect(() => logger.warn('test warning', { meta: 'data' })).not.toThrow()
    })
  })

  describe('specialized logging methods', () => {
    it('should have API request logging', () => {
      const mockReq = { method: 'GET', url: '/test', headers: {}, ip: '127.0.0.1' }
      const mockRes = { statusCode: 200 }

      expect(() => logger.apiRequest(mockReq, mockRes, 100)).not.toThrow()
    })

    it('should have API error logging', () => {
      const mockReq = { method: 'POST', url: '/test', headers: {}, ip: '127.0.0.1' }
      const error = new Error('Test error')

      expect(() => logger.apiError(mockReq, error)).not.toThrow()
    })

    it('should have agent operation logging', () => {
      expect(() =>
        logger.agentOperation('agent-1', 'task-execution', { taskId: 'task-123' })
      ).not.toThrow()
    })

    it('should have agent error logging', () => {
      const error = new Error('Agent error')
      const context = { taskId: 'task-123' }

      expect(() => logger.agentError('agent-1', error, context)).not.toThrow()
    })

    it('should have database query logging', () => {
      expect(() => logger.databaseQuery('SELECT * FROM users', 150)).not.toThrow()
    })

    it('should have database error logging', () => {
      const error = new Error('Database error')

      expect(() => logger.databaseError('SELECT * FROM users', error)).not.toThrow()
    })

    it('should have performance logging', () => {
      expect(() => logger.performance('operation-test', 250)).not.toThrow()
    })
  })
})
