import Redis from 'ioredis'
import { randomUUID } from 'crypto'
import { ComponentLogger } from '../logging/logger-factory'
import { CriticalError, AlertConfig, AlertChannel, AlertNotification, AlertNotificationStatus, CriticalErrorType, AlertChannelType } from './types'
import { AlertTransportService } from './transport/alert-transport-service'

export class AlertManager {
  private readonly logger: ComponentLogger
  private readonly redis: Redis
  private readonly transportService: AlertTransportService
  private readonly defaultConfig: AlertConfig
  private alerts: Map<string, CriticalError> = new Map()

  constructor(redis: Redis, transportService: AlertTransportService) {
    this.logger = new ComponentLogger('AlertManager')
    this.redis = redis
    this.transportService = transportService
    this.defaultConfig = this.getDefaultConfig()
  }

  private getDefaultConfig(): AlertConfig {
    return {
      enabled: true,
      channels: [
        {
          type: AlertChannelType.LOG,
          name: 'default-log',
          enabled: true,
          config: {},
          errorTypes: Object.values(CriticalErrorType),
          priority: 'medium'
        }
      ],
      rateLimiting: {
        maxAlertsPerHour: 10,
        cooldownMinutes: 15
      },
      deduplication: {
        enabled: true,
        windowMinutes: 60
      },
      escalation: {
        enabled: false,
        escalateAfterMinutes: 30,
        escalationChannels: []
      }
    }
  }

  async processAlert(criticalError: CriticalError, config?: AlertConfig): Promise<void> {
    const alertConfig = config || this.defaultConfig

    if (!alertConfig.enabled) {
      this.logger.debug('Alert processing disabled', { errorId: criticalError.id })
      return
    }

    try {
      // Check for deduplication
      if (alertConfig.deduplication.enabled) {
        const existingAlert = await this.findDuplicateAlert(criticalError, alertConfig.deduplication.windowMinutes)
        if (existingAlert) {
          await this.updateDuplicateAlert(existingAlert, criticalError)
          return
        }
      }

      // Check rate limiting
      if (await this.isRateLimited(criticalError, alertConfig.rateLimiting)) {
        this.logger.warn('Alert rate limited', {
          errorId: criticalError.id,
          type: criticalError.type
        })
        return
      }

      // Store the alert
      this.alerts.set(criticalError.id, criticalError)
      await this.storeAlert(criticalError)

      // Send notifications
      await this.sendNotifications(criticalError, alertConfig.channels)

      // Schedule escalation if enabled
      if (alertConfig.escalation.enabled) {
        await this.scheduleEscalation(criticalError, alertConfig.escalation)
      }

      this.logger.info('Alert processed successfully', {
        errorId: criticalError.id,
        type: criticalError.type,
        channelCount: alertConfig.channels.filter(c => c.enabled).length
      })

    } catch (error) {
      this.logger.error('Failed to process alert', {
        errorId: criticalError.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  }

  private async findDuplicateAlert(criticalError: CriticalError, windowMinutes: number): Promise<CriticalError | null> {
    const key = this.getDeduplicationKey(criticalError)
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

    // Check in-memory alerts first
    for (const alert of this.alerts.values()) {
      if (alert.type === criticalError.type && 
          alert.source === criticalError.source &&
          alert.timestamp >= windowStart) {
        return alert
      }
    }

    // Check Redis for persistent deduplication
    const existingAlertId = await this.redis.get(key)
    if (existingAlertId) {
      return this.alerts.get(existingAlertId) || null
    }

    return null
  }

  private async updateDuplicateAlert(existingAlert: CriticalError, newError: CriticalError): Promise<void> {
    existingAlert.occurrenceCount += 1
    existingAlert.lastOccurrence = newError.timestamp
    existingAlert.metadata = {
      ...existingAlert.metadata,
      ...newError.metadata,
      occurrenceCount: existingAlert.occurrenceCount
    }

    await this.storeAlert(existingAlert)
    
    this.logger.debug('Alert deduplicated', {
      alertId: existingAlert.id,
      occurrenceCount: existingAlert.occurrenceCount,
      type: existingAlert.type
    })
  }

  private async isRateLimited(criticalError: CriticalError, rateLimiting: AlertConfig['rateLimiting']): Promise<boolean> {
    const key = `alert_rate_limit:${criticalError.type}:${criticalError.source}`
    const count = await this.redis.get(key)
    
    if (count && parseInt(count) >= rateLimiting.maxAlertsPerHour) {
      return true
    }

    // Increment rate limit counter
    await this.redis.multi()
      .incr(key)
      .expire(key, 3600) // 1 hour
      .exec()

    return false
  }

  private async sendNotifications(criticalError: CriticalError, channels: AlertChannel[]): Promise<void> {
    const applicableChannels = channels.filter(channel => 
      channel.enabled && 
      channel.errorTypes.includes(criticalError.type)
    )

    const notifications = await Promise.allSettled(
      applicableChannels.map(channel => this.sendNotification(criticalError, channel))
    )

    const failures = notifications
      .map((result, index) => ({ result, channel: applicableChannels[index] }))
      .filter(({ result }) => result.status === 'rejected')

    if (failures.length > 0) {
      this.logger.warn('Some notifications failed', {
        errorId: criticalError.id,
        failedChannels: failures.map(f => f.channel.name),
        errors: failures.map(f => f.result.status === 'rejected' ? f.result.reason : 'Unknown')
      })
    }
  }

  private async sendNotification(criticalError: CriticalError, channel: AlertChannel): Promise<AlertNotification> {
    const notification: AlertNotification = {
      id: randomUUID(),
      alertId: criticalError.id,
      channelType: channel.type,
      channelName: channel.name,
      status: AlertNotificationStatus.PENDING,
      retryCount: 0,
      maxRetries: 3
    }

    try {
      await this.transportService.send(channel, criticalError, notification)
      notification.status = AlertNotificationStatus.SENT
      notification.sentAt = new Date()
      
      this.logger.debug('Notification sent', {
        notificationId: notification.id,
        channel: channel.name,
        type: channel.type
      })
      
    } catch (error) {
      notification.status = AlertNotificationStatus.FAILED
      notification.failedAt = new Date()
      notification.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      this.logger.error('Notification failed', {
        notificationId: notification.id,
        channel: channel.name,
        error: notification.errorMessage
      })
    }

    await this.storeNotification(notification)
    return notification
  }

  private async scheduleEscalation(criticalError: CriticalError, escalation: AlertConfig['escalation']): Promise<void> {
    const escalationKey = `alert_escalation:${criticalError.id}`
    const escalationTime = Date.now() + (escalation.escalateAfterMinutes * 60 * 1000)
    
    await this.redis.zadd('alert_escalations', escalationTime, escalationKey)
    
    this.logger.debug('Escalation scheduled', {
      alertId: criticalError.id,
      escalateAt: new Date(escalationTime).toISOString(),
      escalationChannels: escalation.escalationChannels.length
    })
  }

  private getDeduplicationKey(criticalError: CriticalError): string {
    return `alert_dedup:${criticalError.type}:${criticalError.source}`
  }

  private async storeAlert(alert: CriticalError): Promise<void> {
    const key = `alert:${alert.id}`
    const deduplicationKey = this.getDeduplicationKey(alert)
    
    await this.redis.multi()
      .setex(key, 86400, JSON.stringify(alert)) // Store for 24 hours
      .setex(deduplicationKey, 3600, alert.id) // Deduplication window of 1 hour
      .zadd('alert_timeline', alert.timestamp.getTime(), alert.id)
      .exec()
  }

  private async storeNotification(notification: AlertNotification): Promise<void> {
    const key = `notification:${notification.id}`
    await this.redis.setex(key, 86400, JSON.stringify(notification))
  }

  async resolveAlert(alertId: string, resolvedBy: string): Promise<boolean> {
    const alert = this.alerts.get(alertId)
    if (!alert) {
      return false
    }

    alert.resolved = true
    alert.resolvedAt = new Date()
    alert.resolvedBy = resolvedBy

    await this.storeAlert(alert)
    
    this.logger.info('Alert resolved', {
      alertId,
      resolvedBy,
      type: alert.type,
      duration: alert.resolvedAt.getTime() - alert.timestamp.getTime()
    })

    return true
  }

  async getActiveAlerts(): Promise<CriticalError[]> {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved)
  }

  async getAlertHistory(limit: number = 100): Promise<CriticalError[]> {
    const alertIds = await this.redis.zrevrange('alert_timeline', 0, limit - 1)
    const alerts: CriticalError[] = []

    for (const alertId of alertIds) {
      const alertData = await this.redis.get(`alert:${alertId}`)
      if (alertData) {
        const alert = JSON.parse(alertData) as CriticalError
        alert.timestamp = new Date(alert.timestamp)
        alert.firstOccurrence = new Date(alert.firstOccurrence)
        alert.lastOccurrence = new Date(alert.lastOccurrence)
        if (alert.resolvedAt) {
          alert.resolvedAt = new Date(alert.resolvedAt)
        }
        alerts.push(alert)
      }
    }

    return alerts
  }
}