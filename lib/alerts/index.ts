// Main exports for the alert system
export { AlertService } from './alert-service'
export { AlertManager } from './alert-manager'
export { CriticalErrorDetector } from './critical-error-detector'
export { AlertTransportService } from './transport/alert-transport-service'
export { AlertWinstonTransport } from './alert-winston-transport'

// Transport implementations
export { WebhookTransport } from './transport/webhook-transport'
export { EmailTransport } from './transport/email-transport'
export { SlackTransport } from './transport/slack-transport'
export { LogTransport } from './transport/log-transport'

// Types
export type {
  CriticalError,
  AlertConfig,
  AlertChannel,
  AlertNotification,
  AlertTemplate,
  AlertMetrics,
  AlertTransport,
} from './types'

export {
  CriticalErrorType,
  AlertChannelType,
  AlertPriority,
  AlertNotificationStatus,
} from './types'

// Helper to initialize alerts with existing logger
import { LoggerFactory } from '../logging/logger-factory'
import { AlertService } from './alert-service'
import { redis } from '../redis/redis-client'

let alertServiceInstance: AlertService | null = null

export async function initializeAlerts(): Promise<AlertService> {
  if (!alertServiceInstance) {
    alertServiceInstance = new AlertService(redis)
    await alertServiceInstance.initialize()

    // Add the alert transport to the existing winston logger
    const loggerFactory = LoggerFactory.getInstance()
    if (loggerFactory && alertServiceInstance) {
      const alertTransport = alertServiceInstance.getWinstonTransport()
      // This would require modifying the LoggerFactory to accept additional transports
      // For now, we'll document this as a manual integration step
    }
  }

  return alertServiceInstance
}

export function getAlertService(): AlertService | null {
  return alertServiceInstance
}
