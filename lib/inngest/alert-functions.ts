import { AlertService } from '../alerts/alert-service'
import { AlertNotificationStatus, type CriticalError } from '../alerts/types'
import { ComponentLogger } from '../logging/logger-factory'
import { redis } from '../redis/redis-client'
import { inngest } from './client'

const logger = new ComponentLogger('AlertFunctions')
const alertService = new AlertService(redis)

export const processAlert = inngest.createFunction(
  { id: 'process-alert' },
  { event: 'alert/process' },
  async ({ event, step }) => {
    const { criticalError, config } = event.data as {
      criticalError: CriticalError
      config?: any
    }

    await step.run('initialize-alert-service', async () => {
      await alertService.initialize()
    })

    const result = await step.run('process-alert', async () => {
      try {
        await alertService.getAlertManager().processAlert(criticalError, config)
        return { success: true, alertId: criticalError.id }
      } catch (error) {
        logger.error('Failed to process alert', {
          alertId: criticalError.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      }
    })

    return result
  }
)

export const escalateAlert = inngest.createFunction(
  { id: 'escalate-alert' },
  { event: 'alert/escalate' },
  async ({ event, step }) => {
    const { alertId, escalationChannels } = event.data as {
      alertId: string
      escalationChannels: any[]
    }

    await step.run('initialize-alert-service', async () => {
      await alertService.initialize()
    })

    const alert = await step.run('get-alert', async () => {
      const activeAlerts = await alertService.getActiveAlerts()
      return activeAlerts.find((a) => a.id === alertId)
    })

    if (!alert) {
      logger.warn('Alert not found for escalation', { alertId })
      return { success: false, reason: 'Alert not found' }
    }

    if (alert.resolved) {
      logger.info('Alert already resolved, skipping escalation', { alertId })
      return { success: false, reason: 'Alert already resolved' }
    }

    const result = await step.run('send-escalation-notifications', async () => {
      try {
        const escalationConfig = {
          enabled: true,
          channels: escalationChannels,
          rateLimiting: { maxAlertsPerHour: 50, cooldownMinutes: 5 },
          deduplication: { enabled: false, windowMinutes: 0 },
          escalation: { enabled: false, escalateAfterMinutes: 0, escalationChannels: [] },
        }

        await alertService.getAlertManager().processAlert(alert, escalationConfig)

        logger.info('Alert escalated successfully', {
          alertId,
          channelCount: escalationChannels.length,
        })

        return { success: true, alertId, escalatedChannels: escalationChannels.length }
      } catch (error) {
        logger.error('Failed to escalate alert', {
          alertId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      }
    })

    return result
  }
)

export const scheduleEscalation = inngest.createFunction(
  { id: 'schedule-escalation' },
  { event: 'alert/schedule-escalation' },
  async ({ event, step }) => {
    const { alertId, escalateAfterMinutes, escalationChannels } = event.data as {
      alertId: string
      escalateAfterMinutes: number
      escalationChannels: any[]
    }

    await step.sleep('wait-for-escalation', `${escalateAfterMinutes}m`)

    await step.sendEvent('trigger-escalation', {
      name: 'alert/escalate',
      data: {
        alertId,
        escalationChannels,
      },
    })

    return { success: true, alertId, escalatedAfter: escalateAfterMinutes }
  }
)

export const retryFailedNotification = inngest.createFunction(
  { id: 'retry-failed-notification' },
  { event: 'alert/retry-notification' },
  async ({ event, step }) => {
    const { notificationId, alertId, channel, maxRetries } = event.data as {
      notificationId: string
      alertId: string
      channel: any
      maxRetries: number
    }

    await step.run('initialize-alert-service', async () => {
      await alertService.initialize()
    })

    // Get current notification status from Redis or database
    const notificationData = await step.run('get-notification-status', async () => {
      try {
        const data = await redis.get(`notification:${notificationId}`)
        return data ? JSON.parse(data) : null
      } catch (error) {
        logger.error('Failed to get notification status', {
          notificationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        return null
      }
    })

    if (!notificationData) {
      logger.warn('Notification not found for retry', { notificationId })
      return { success: false, reason: 'Notification not found' }
    }

    if (notificationData.retryCount >= maxRetries) {
      logger.warn('Max retries exceeded for notification', {
        notificationId,
        retryCount: notificationData.retryCount,
        maxRetries,
      })
      return { success: false, reason: 'Max retries exceeded' }
    }

    if (notificationData.status === AlertNotificationStatus.DELIVERED) {
      logger.info('Notification already delivered, skipping retry', { notificationId })
      return { success: false, reason: 'Already delivered' }
    }

    const result = await step.run('retry-notification', async () => {
      try {
        // Get the original alert
        const activeAlerts = await alertService.getActiveAlerts()
        const alert = activeAlerts.find((a) => a.id === alertId)

        if (!alert) {
          throw new Error('Alert not found')
        }

        // Create new notification attempt
        const retryNotification = {
          ...notificationData,
          retryCount: notificationData.retryCount + 1,
          status: AlertNotificationStatus.PENDING,
        }

        // Attempt to send again
        await alertService.getTransportService().send(channel, alert, retryNotification)

        logger.info('Notification retry successful', {
          notificationId,
          retryCount: retryNotification.retryCount,
        })

        return { success: true, notificationId, retryCount: retryNotification.retryCount }
      } catch (error) {
        logger.error('Notification retry failed', {
          notificationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        // Schedule another retry if we haven't hit max retries
        if (notificationData.retryCount + 1 < maxRetries) {
          const delayMinutes = 2 ** (notificationData.retryCount + 1) // Exponential backoff

          await step.sendEvent('schedule-retry', {
            name: 'alert/retry-notification',
            data: { notificationId, alertId, channel, maxRetries },
            timestamp: new Date(Date.now() + delayMinutes * 60_000),
          })
        }

        throw error
      }
    })

    return result
  }
)

export const generateAlertMetrics = inngest.createFunction(
  { id: 'generate-alert-metrics' },
  { event: 'alert/generate-metrics' },
  async ({ event, step }) => {
    await step.run('initialize-alert-service', async () => {
      await alertService.initialize()
    })

    const metrics = await step.run('calculate-metrics', async () => {
      try {
        const now = new Date()
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        // Get recent alerts from alert history
        const allAlerts = await alertService.getAlertHistory(1000)
        const last24HourAlerts = allAlerts.filter((a) => a.timestamp >= last24Hours)
        const last7DayAlerts = allAlerts.filter((a) => a.timestamp >= last7Days)

        // Calculate metrics
        const totalAlerts = allAlerts.length
        const unresolvedAlerts = allAlerts.filter((a) => !a.resolved).length

        const alertsByType: Record<string, number> = {}
        const alertsByChannel: Record<string, number> = {}

        for (const alert of allAlerts) {
          alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1
        }

        // Calculate resolution times
        const resolvedAlerts = allAlerts.filter((a) => a.resolved && a.resolvedAt)
        const resolutionTimes = resolvedAlerts.map(
          (a) => a.resolvedAt!.getTime() - a.timestamp.getTime()
        )

        const averageResolutionTime =
          resolutionTimes.length > 0
            ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
            : 0

        const metricsData = {
          totalAlerts,
          alertsByType,
          alertsByChannel,
          averageResolutionTime,
          unresolvedAlerts,
          alertsLast24Hours: last24HourAlerts.length,
          alertsLast7Days: last7DayAlerts.length,
          meanTimeToAlert: 0, // Would need additional tracking
          meanTimeToResolution: averageResolutionTime,
        }

        logger.info('Alert metrics calculated', metricsData)
        return metricsData
      } catch (error) {
        logger.error('Failed to calculate alert metrics', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      }
    })

    return metrics
  }
)

// Cron function to clean up old alerts
export const cleanupOldAlerts = inngest.createFunction(
  { id: 'cleanup-old-alerts' },
  { cron: '0 2 * * *' }, // Run daily at 2 AM
  async ({ step }) => {
    await step.run('initialize-alert-service', async () => {
      await alertService.initialize()
    })

    const result = await step.run('cleanup-alerts', async () => {
      try {
        const retentionDays = Number.parseInt(process.env.ALERTS_RETENTION_DAYS || '30')
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

        // Clean up old alerts from Redis
        const oldAlertIds = await redis.zrangebyscore('alert_timeline', 0, cutoffDate.getTime())

        if (oldAlertIds.length > 0) {
          const pipeline = redis.pipeline()

          for (const alertId of oldAlertIds) {
            pipeline.del(`alert:${alertId}`)
            pipeline.zrem('alert_timeline', alertId)
          }

          await pipeline.exec()

          logger.info('Cleaned up old alerts', {
            count: oldAlertIds.length,
            cutoffDate: cutoffDate.toISOString(),
          })
        }

        return { cleanedUp: oldAlertIds.length, cutoffDate }
      } catch (error) {
        logger.error('Failed to cleanup old alerts', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      }
    })

    return result
  }
)

// Cron function to generate daily metrics
export const dailyMetricsGeneration = inngest.createFunction(
  { id: 'daily-metrics-generation' },
  { cron: '0 1 * * *' }, // Run daily at 1 AM
  async ({ step }) => {
    await step.sendEvent('generate-metrics', {
      name: 'alert/generate-metrics',
      data: { period: 'daily' },
    })

    return { success: true, scheduled: new Date().toISOString() }
  }
)
