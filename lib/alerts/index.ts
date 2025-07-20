// Main exports for the alert system

export { AlertManager } from './alert-manager'
export { AlertService } from './alert-service'
export { AlertWinstonTransport } from './alert-winston-transport'
export { CriticalErrorDetector } from './critical-error-detector'
export { AlertTransportService } from './transport/alert-transport-service'
export { EmailTransport } from './transport/email-transport'
export { LogTransport } from './transport/log-transport'
export { SlackTransport } from './transport/slack-transport'
// Transport implementations
export { WebhookTransport } from './transport/webhook-transport'

// Types
export type {
  AlertChannel,
  AlertConfig,
  AlertMetrics,
  AlertNotification,
  AlertTemplate,
  AlertTransport,
  CriticalError,
} from './types'

export {
  AlertChannelType,
  AlertNotificationStatus,
  AlertPriority,
  CriticalErrorType,
} from './types'

// Helper to initialize alerts with existing logger
import { LoggerFactory } from '../logging/logger-factory'
import { redis } from '../redis/redis-client'
import { AlertService } from './alert-service'

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
