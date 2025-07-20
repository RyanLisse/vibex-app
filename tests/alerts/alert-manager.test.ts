import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AlertManager } from '@/lib/alerts/alert-manager'
import { AlertTransportService } from '@/lib/alerts/transport/alert-transport-service'
import { CriticalError, CriticalErrorType, AlertConfig, AlertChannelType } from '@/lib/alerts/types'
import Redis from 'ioredis'

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  multi: vi.fn(() => ({
    incr: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    setex: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    zrem: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  })),
  zadd: vi.fn(),
  zrevrange: vi.fn(),
} as unknown as Redis

// Mock transport service
const mockTransportService = {
  send: vi.fn().mockResolvedValue(undefined),
  validateChannelConfig: vi.fn().mockReturnValue(true),
  getSupportedChannelTypes: vi.fn().mockReturnValue([AlertChannelType.LOG]),
  registerTransport: vi.fn(),
} as unknown as AlertTransportService

describe('AlertManager', () => {
  let alertManager: AlertManager
  let sampleCriticalError: CriticalError
  let sampleConfig: AlertConfig

  beforeEach(() => {
    vi.clearAllMocks()

    alertManager = new AlertManager(mockRedis, mockTransportService)

    sampleCriticalError = {
      id: 'test-alert-123',
      timestamp: new Date(),
      severity: 'critical',
      type: CriticalErrorType.DATABASE_CONNECTION_FAILURE,
      message: 'Test database connection failure',
      source: 'test-service',
      metadata: { test: true },
      environment: 'test',
      resolved: false,
      occurrenceCount: 1,
      lastOccurrence: new Date(),
      firstOccurrence: new Date(),
    }

    sampleConfig = {
      enabled: true,
      channels: [
        {
          type: AlertChannelType.LOG,
          name: 'test-log',
          enabled: true,
          config: {},
          errorTypes: [CriticalErrorType.DATABASE_CONNECTION_FAILURE],
          priority: 'medium',
        },
      ],
      rateLimiting: {
        maxAlertsPerHour: 10,
        cooldownMinutes: 15,
      },
      deduplication: {
        enabled: true,
        windowMinutes: 60,
      },
      escalation: {
        enabled: false,
        escalateAfterMinutes: 30,
        escalationChannels: [],
      },
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('processAlert', () => {
    it('should process alert successfully when enabled', async () => {
      mockRedis.get.mockResolvedValue(null) // No existing alert
      mockRedis.get.mockResolvedValueOnce(null) // No rate limiting

      await alertManager.processAlert(sampleCriticalError, sampleConfig)

      expect(mockTransportService.send).toHaveBeenCalledWith(
        sampleConfig.channels[0],
        sampleCriticalError,
        expect.any(Object)
      )
    })

    it('should skip processing when alerts are disabled', async () => {
      const disabledConfig = { ...sampleConfig, enabled: false }

      await alertManager.processAlert(sampleCriticalError, disabledConfig)

      expect(mockTransportService.send).not.toHaveBeenCalled()
    })

    it('should deduplicate similar alerts', async () => {
      // Mock existing alert found
      const existingAlert = { ...sampleCriticalError, occurrenceCount: 1 }
      alertManager['alerts'].set('existing-alert-id', existingAlert)

      await alertManager.processAlert(sampleCriticalError, sampleConfig)

      // Should update existing alert instead of creating new one
      expect(mockTransportService.send).not.toHaveBeenCalled()
    })

    it('should respect rate limiting', async () => {
      // Mock rate limit exceeded
      mockRedis.get.mockResolvedValueOnce('15') // Rate limit count

      await alertManager.processAlert(sampleCriticalError, sampleConfig)

      expect(mockTransportService.send).not.toHaveBeenCalled()
    })

    it('should handle transport failures gracefully', async () => {
      mockRedis.get.mockResolvedValue(null)
      mockTransportService.send.mockRejectedValue(new Error('Transport failed'))

      // Should not throw
      await expect(
        alertManager.processAlert(sampleCriticalError, sampleConfig)
      ).resolves.not.toThrow()
    })

    it('should send notifications to multiple channels', async () => {
      const multiChannelConfig = {
        ...sampleConfig,
        channels: [
          ...sampleConfig.channels,
          {
            type: AlertChannelType.SLACK,
            name: 'test-slack',
            enabled: true,
            config: { webhookUrl: 'https://hooks.slack.com/test' },
            errorTypes: [CriticalErrorType.DATABASE_CONNECTION_FAILURE],
            priority: 'high',
          },
        ],
      }

      mockRedis.get.mockResolvedValue(null)

      await alertManager.processAlert(sampleCriticalError, multiChannelConfig)

      expect(mockTransportService.send).toHaveBeenCalledTimes(2)
    })

    it('should filter channels by error type', async () => {
      const filteredConfig = {
        ...sampleConfig,
        channels: [
          {
            ...sampleConfig.channels[0],
            errorTypes: [CriticalErrorType.REDIS_CONNECTION_FAILURE], // Different error type
          },
        ],
      }

      mockRedis.get.mockResolvedValue(null)

      await alertManager.processAlert(sampleCriticalError, filteredConfig)

      expect(mockTransportService.send).not.toHaveBeenCalled()
    })
  })

  describe('resolveAlert', () => {
    it('should resolve existing alert', async () => {
      const alert = { ...sampleCriticalError, resolved: false }
      alertManager['alerts'].set(alert.id, alert)

      const result = await alertManager.resolveAlert(alert.id, 'test-user')

      expect(result).toBe(true)
      expect(alert.resolved).toBe(true)
      expect(alert.resolvedBy).toBe('test-user')
      expect(alert.resolvedAt).toBeInstanceOf(Date)
    })

    it('should return false for non-existent alert', async () => {
      const result = await alertManager.resolveAlert('non-existent-id', 'test-user')

      expect(result).toBe(false)
    })
  })

  describe('getActiveAlerts', () => {
    it('should return only unresolved alerts', async () => {
      const resolvedAlert = { ...sampleCriticalError, id: 'resolved', resolved: true }
      const activeAlert = { ...sampleCriticalError, id: 'active', resolved: false }

      alertManager['alerts'].set('resolved', resolvedAlert)
      alertManager['alerts'].set('active', activeAlert)

      const activeAlerts = await alertManager.getActiveAlerts()

      expect(activeAlerts).toHaveLength(1)
      expect(activeAlerts[0].id).toBe('active')
    })
  })

  describe('getAlertHistory', () => {
    it('should return alert history from Redis', async () => {
      const alertIds = ['alert-1', 'alert-2']
      const alertData = JSON.stringify(sampleCriticalError)

      mockRedis.zrevrange.mockResolvedValue(alertIds)
      mockRedis.get.mockResolvedValue(alertData)

      const history = await alertManager.getAlertHistory(10)

      expect(mockRedis.zrevrange).toHaveBeenCalledWith('alert_timeline', 0, 9)
      expect(history).toHaveLength(2)
    })

    it('should handle missing alert data gracefully', async () => {
      const alertIds = ['alert-1', 'alert-2']

      mockRedis.zrevrange.mockResolvedValue(alertIds)
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(sampleCriticalError))
      mockRedis.get.mockResolvedValueOnce(null) // Missing alert data

      const history = await alertManager.getAlertHistory(10)

      expect(history).toHaveLength(1)
    })
  })
})
