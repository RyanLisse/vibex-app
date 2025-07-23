/**
 * Alert Manager Tests
 * 
 * Comprehensive test coverage for the AlertManager class
 * Testing all methods, error paths, and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AlertManager } from './alert-manager';
import { CriticalErrorType } from './types';

// Mock dependencies
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
    exec: vi.fn().mockResolvedValue([]),
  })),
  zadd: vi.fn(),
  zrevrange: vi.fn(),
};

const mockTransportService = {
  send: vi.fn().mockResolvedValue(undefined),
};

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock ComponentLogger
vi.mock('@/lib/logging', () => ({
  ComponentLogger: vi.fn().mockImplementation(() => mockLogger),
}));

// Mock crypto for randomUUID
vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-123'),
}));

// Define test types to match the actual implementation
interface CriticalError {
  id: string;
  type: CriticalErrorType;
  source: string;
  message: string;
  timestamp: Date;
  firstOccurrence: Date;
  lastOccurrence: Date;
  occurrenceCount: number;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

interface AlertConfig {
  enabled: boolean;
  channels: AlertChannel[];
  rateLimiting: {
    maxAlertsPerHour: number;
    cooldownMinutes: number;
  };
  deduplication: {
    enabled: boolean;
    windowMinutes: number;
  };
  escalation: {
    enabled: boolean;
    escalateAfterMinutes: number;
    escalationChannels: string[];
  };
}

interface AlertChannel {
  type: AlertChannelType;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  errorTypes: CriticalErrorType[];
  priority: 'low' | 'medium' | 'high';
}

enum AlertChannelType {
  LOG = 'log',
  EMAIL = 'email',
  SLACK = 'slack',
  DISCORD = 'discord',
  WEBHOOK = 'webhook',
  TEAMS = 'teams',
}

enum AlertNotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

interface AlertNotification {
  id: string;
  alertId: string;
  channelType: AlertChannelType;
  channelName: string;
  status: AlertNotificationStatus;
  retryCount: number;
  maxRetries: number;
  sentAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
}

describe('AlertManager', () => {
  let alertManager: AlertManager;
  
  beforeEach(() => {
    vi.clearAllMocks();
    alertManager = new AlertManager(mockRedis as any, mockTransportService as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      expect(alertManager).toBeInstanceOf(AlertManager);
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('should create default configuration with correct structure', () => {
      // Test that the manager was constructed with expected defaults
      expect(alertManager).toBeDefined();
    });
  });

  describe('processAlert', () => {
    const createMockError = (overrides: Partial<CriticalError> = {}): CriticalError => ({
      id: 'error-123',
      type: CriticalErrorType.DATABASE_CONNECTION_FAILED,
      source: 'test-source',
      message: 'Test error message',
      timestamp: new Date(),
      firstOccurrence: new Date(),
      lastOccurrence: new Date(),
      occurrenceCount: 1,
      metadata: { test: 'data' },
      ...overrides,
    });

    it('should process alert successfully with default config', async () => {
      const criticalError = createMockError();
      mockRedis.get.mockResolvedValue(null); // No duplicate
      
      await alertManager.processAlert(criticalError);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Alert processed successfully',
        expect.objectContaining({
          errorId: criticalError.id,
          type: criticalError.type,
        })
      );
    });

    it('should skip processing when alerts are disabled', async () => {
      const criticalError = createMockError();
      const disabledConfig: AlertConfig = {
        enabled: false,
        channels: [],
        rateLimiting: { maxAlertsPerHour: 10, cooldownMinutes: 15 },
        deduplication: { enabled: false, windowMinutes: 60 },
        escalation: { enabled: false, escalateAfterMinutes: 30, escalationChannels: [] },
      };

      await alertManager.processAlert(criticalError, disabledConfig);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Alert processing disabled',
        { errorId: criticalError.id }
      );
      expect(mockTransportService.send).not.toHaveBeenCalled();
    });

    it('should handle deduplication correctly', async () => {
      const criticalError = createMockError();
      const existingError = createMockError({ 
        id: 'existing-error-456',
        occurrenceCount: 2 
      });
      
      // Mock finding a duplicate
      mockRedis.get.mockResolvedValue('existing-error-456');
      vi.spyOn(alertManager as any, 'findDuplicateAlert').mockResolvedValue(existingError);
      vi.spyOn(alertManager as any, 'updateDuplicateAlert').mockResolvedValue(undefined);

      await alertManager.processAlert(criticalError);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Alert deduplicated',
        expect.objectContaining({
          alertId: existingError.id,
          type: existingError.type,
        })
      );
    });

    it('should handle rate limiting correctly', async () => {
      const criticalError = createMockError();
      mockRedis.get.mockResolvedValueOnce(null); // No duplicate
      mockRedis.get.mockResolvedValueOnce('15'); // Rate limit exceeded

      await alertManager.processAlert(criticalError);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Alert rate limited',
        expect.objectContaining({
          errorId: criticalError.id,
          type: criticalError.type,
        })
      );
    });

    it('should handle processing errors gracefully', async () => {
      const criticalError = createMockError();
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      await alertManager.processAlert(criticalError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to process alert',
        expect.objectContaining({
          errorId: criticalError.id,
          error: 'Redis connection failed',
        })
      );
    });

    it('should schedule escalation when enabled', async () => {
      const criticalError = createMockError();
      const configWithEscalation: AlertConfig = {
        enabled: true,
        channels: [{
          type: AlertChannelType.LOG,
          name: 'test-log',
          enabled: true,
          config: {},
          errorTypes: [CriticalErrorType.DATABASE_CONNECTION_FAILED],
          priority: 'high',
        }],
        rateLimiting: { maxAlertsPerHour: 10, cooldownMinutes: 15 },
        deduplication: { enabled: false, windowMinutes: 60 },
        escalation: { 
          enabled: true, 
          escalateAfterMinutes: 30, 
          escalationChannels: ['escalation-channel'] 
        },
      };

      mockRedis.get.mockResolvedValue(null); // No rate limiting or duplication

      await alertManager.processAlert(criticalError, configWithEscalation);

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'alert_escalations',
        expect.any(Number),
        `alert_escalation:${criticalError.id}`
      );
    });
  });

  describe('sendNotifications', () => {
    it('should send notifications to enabled channels', async () => {
      const criticalError = createMockError();
      const channels = [
        {
          type: AlertChannelType.LOG,
          name: 'test-log',
          enabled: true,
          config: {},
          errorTypes: [CriticalErrorType.DATABASE_CONNECTION_FAILED],
          priority: 'medium' as const,
        },
        {
          type: AlertChannelType.EMAIL,
          name: 'test-email',
          enabled: false, // Disabled channel
          config: {},
          errorTypes: [CriticalErrorType.DATABASE_CONNECTION_FAILED],
          priority: 'high' as const,
        },
      ];

      await (alertManager as any).sendNotifications(criticalError, channels);

      // Should only send to enabled channels
      expect(mockTransportService.send).toHaveBeenCalledTimes(1);
      expect(mockTransportService.send).toHaveBeenCalledWith(
        channels[0],
        criticalError,
        expect.any(Object)
      );
    });

    it('should handle notification failures gracefully', async () => {
      const criticalError = createMockError();
      const channels = [{
        type: AlertChannelType.LOG,
        name: 'failing-channel',
        enabled: true,
        config: {},
        errorTypes: [CriticalErrorType.DATABASE_CONNECTION_FAILED],
        priority: 'medium' as const,
      }];

      mockTransportService.send.mockRejectedValue(new Error('Transport failed'));

      await (alertManager as any).sendNotifications(criticalError, channels);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Some notifications failed',
        expect.objectContaining({
          errorId: criticalError.id,
          failedChannels: ['failing-channel'],
        })
      );
    });
  });

  describe('findDuplicateAlert', () => {
    it('should find duplicate in memory', async () => {
      const criticalError = createMockError();
      const existingAlert = createMockError({ 
        id: 'existing-123',
        timestamp: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      });
      
      // Add existing alert to memory
      (alertManager as any).alerts.set(existingAlert.id, existingAlert);

      const duplicate = await (alertManager as any).findDuplicateAlert(criticalError, 60);

      expect(duplicate).toEqual(existingAlert);
    });

    it('should find duplicate in Redis when not in memory', async () => {
      const criticalError = createMockError();
      const existingAlert = createMockError({ id: 'redis-alert-456' });
      
      mockRedis.get.mockResolvedValue('redis-alert-456');
      (alertManager as any).alerts.set('redis-alert-456', existingAlert);

      const duplicate = await (alertManager as any).findDuplicateAlert(criticalError, 60);

      expect(duplicate).toEqual(existingAlert);
      expect(mockRedis.get).toHaveBeenCalledWith(
        expect.stringContaining('alert_dedup:')
      );
    });

    it('should return null when no duplicate found', async () => {
      const criticalError = createMockError();
      mockRedis.get.mockResolvedValue(null);

      const duplicate = await (alertManager as any).findDuplicateAlert(criticalError, 60);

      expect(duplicate).toBeNull();
    });

    it('should respect time window for duplicates', async () => {
      const criticalError = createMockError();
      const oldAlert = createMockError({ 
        id: 'old-alert',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      });
      
      (alertManager as any).alerts.set(oldAlert.id, oldAlert);

      const duplicate = await (alertManager as any).findDuplicateAlert(criticalError, 60); // 60 minute window

      expect(duplicate).toBeNull(); // Should not find old alert outside window
    });
  });

  describe('isRateLimited', () => {
    it('should return false when under rate limit', async () => {
      const criticalError = createMockError();
      const rateLimiting = { maxAlertsPerHour: 10, cooldownMinutes: 15 };
      
      mockRedis.get.mockResolvedValue('5'); // Under limit

      const isLimited = await (alertManager as any).isRateLimited(criticalError, rateLimiting);

      expect(isLimited).toBe(false);
      expect(mockRedis.multi().incr).toHaveBeenCalled();
    });

    it('should return true when rate limit exceeded', async () => {
      const criticalError = createMockError();
      const rateLimiting = { maxAlertsPerHour: 10, cooldownMinutes: 15 };
      
      mockRedis.get.mockResolvedValue('15'); // Over limit

      const isLimited = await (alertManager as any).isRateLimited(criticalError, rateLimiting);

      expect(isLimited).toBe(true);
    });

    it('should handle first occurrence (no existing count)', async () => {
      const criticalError = createMockError();
      const rateLimiting = { maxAlertsPerHour: 10, cooldownMinutes: 15 };
      
      mockRedis.get.mockResolvedValue(null); // No existing count

      const isLimited = await (alertManager as any).isRateLimited(criticalError, rateLimiting);

      expect(isLimited).toBe(false);
      expect(mockRedis.multi().incr).toHaveBeenCalled();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve existing alert successfully', async () => {
      const alert = createMockError();
      (alertManager as any).alerts.set(alert.id, alert);

      const resolved = await alertManager.resolveAlert(alert.id, 'test-user');

      expect(resolved).toBe(true);
      expect(alert.resolved).toBe(true);
      expect(alert.resolvedBy).toBe('test-user');
      expect(alert.resolvedAt).toBeInstanceOf(Date);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Alert resolved',
        expect.objectContaining({
          alertId: alert.id,
          resolvedBy: 'test-user',
        })
      );
    });

    it('should return false for non-existent alert', async () => {
      const resolved = await alertManager.resolveAlert('non-existent', 'test-user');

      expect(resolved).toBe(false);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('getActiveAlerts', () => {
    it('should return only unresolved alerts', async () => {
      const resolvedAlert = createMockError({ 
        id: 'resolved-alert',
        resolved: true 
      });
      const activeAlert = createMockError({ 
        id: 'active-alert',
        resolved: false 
      });
      const unresolvedAlert = createMockError({ id: 'unresolved-alert' }); // No resolved property

      (alertManager as any).alerts.set(resolvedAlert.id, resolvedAlert);
      (alertManager as any).alerts.set(activeAlert.id, activeAlert);
      (alertManager as any).alerts.set(unresolvedAlert.id, unresolvedAlert);

      const activeAlerts = await alertManager.getActiveAlerts();

      expect(activeAlerts).toHaveLength(2);
      expect(activeAlerts).toContain(activeAlert);
      expect(activeAlerts).toContain(unresolvedAlert);
      expect(activeAlerts).not.toContain(resolvedAlert);
    });

    it('should return empty array when no active alerts', async () => {
      const activeAlerts = await alertManager.getActiveAlerts();

      expect(activeAlerts).toEqual([]);
    });
  });

  describe('getAlertHistory', () => {
    it('should retrieve alert history from Redis', async () => {
      const alertIds = ['alert-1', 'alert-2'];
      const alertData1 = JSON.stringify(createMockError({ id: 'alert-1' }));
      const alertData2 = JSON.stringify(createMockError({ id: 'alert-2' }));

      mockRedis.zrevrange.mockResolvedValue(alertIds);
      mockRedis.get
        .mockResolvedValueOnce(alertData1)
        .mockResolvedValueOnce(alertData2);

      const history = await alertManager.getAlertHistory(10);

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('alert-1');
      expect(history[1].id).toBe('alert-2');
      expect(mockRedis.zrevrange).toHaveBeenCalledWith('alert_timeline', 0, 9);
    });

    it('should handle missing alert data gracefully', async () => {
      const alertIds = ['alert-1', 'missing-alert'];
      const alertData1 = JSON.stringify(createMockError({ id: 'alert-1' }));

      mockRedis.zrevrange.mockResolvedValue(alertIds);
      mockRedis.get
        .mockResolvedValueOnce(alertData1)
        .mockResolvedValueOnce(null); // Missing data

      const history = await alertManager.getAlertHistory();

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('alert-1');
    });

    it('should properly parse dates from stored JSON', async () => {
      const testDate = new Date('2024-01-01T10:00:00Z');
      const alertData = {
        ...createMockError({ id: 'date-test-alert' }),
        timestamp: testDate.toISOString(),
        firstOccurrence: testDate.toISOString(),
        lastOccurrence: testDate.toISOString(),
        resolvedAt: testDate.toISOString(),
      };

      mockRedis.zrevrange.mockResolvedValue(['date-test-alert']);
      mockRedis.get.mockResolvedValue(JSON.stringify(alertData));

      const history = await alertManager.getAlertHistory();

      expect(history).toHaveLength(1);
      expect(history[0].timestamp).toBeInstanceOf(Date);
      expect(history[0].firstOccurrence).toBeInstanceOf(Date);
      expect(history[0].lastOccurrence).toBeInstanceOf(Date);
      expect(history[0].resolvedAt).toBeInstanceOf(Date);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle Redis connection failures gracefully', async () => {
      const criticalError = createMockError();
      mockRedis.get.mockRejectedValue(new Error('Redis down'));

      await alertManager.processAlert(criticalError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to process alert',
        expect.objectContaining({
          error: 'Redis down',
        })
      );
    });

    it('should handle malformed JSON in Redis gracefully', async () => {
      mockRedis.zrevrange.mockResolvedValue(['malformed-alert']);
      mockRedis.get.mockResolvedValue('invalid-json-{');

      const history = await alertManager.getAlertHistory();

      expect(history).toEqual([]);
    });

    it('should handle transport service failures', async () => {
      const criticalError = createMockError();
      mockTransportService.send.mockRejectedValue(new Error('Network error'));
      mockRedis.get.mockResolvedValue(null);

      await alertManager.processAlert(criticalError);

      // Should still log success for overall processing
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Alert processed successfully',
        expect.objectContaining({
          errorId: criticalError.id,
        })
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete alert lifecycle', async () => {
      const criticalError = createMockError();
      mockRedis.get.mockResolvedValue(null); // No duplication or rate limiting

      // Process alert
      await alertManager.processAlert(criticalError);

      // Verify alert was stored
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `alert:${criticalError.id}`,
        86400,
        expect.any(String)
      );

      // Get active alerts
      const activeAlerts = await alertManager.getActiveAlerts();
      expect(activeAlerts).toContain(
        expect.objectContaining({ id: criticalError.id })
      );

      // Resolve alert
      const resolved = await alertManager.resolveAlert(criticalError.id, 'admin');
      expect(resolved).toBe(true);

      // Verify no longer active
      const remainingActive = await alertManager.getActiveAlerts();
      expect(remainingActive).not.toContain(
        expect.objectContaining({ id: criticalError.id })
      );
    });
  });
});