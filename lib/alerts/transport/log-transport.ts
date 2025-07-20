import { AlertTransport } from './types'
import { AlertChannel, CriticalError, AlertNotification } from '../types'
import { ComponentLogger } from '../../logging/logger-factory'

interface LogConfig {
  level?: 'error' | 'warn' | 'info'
  format?: 'structured' | 'simple'
  includeStackTrace?: boolean
  includeMetadata?: boolean
}

export class LogTransport implements AlertTransport {
  private readonly logger: ComponentLogger

  constructor() {
    this.logger = new ComponentLogger('LogTransport')
  }

  async send(
    channel: AlertChannel,
    error: CriticalError,
    notification: AlertNotification
  ): Promise<void> {
    const config = channel.config as LogConfig
    const level = config.level || 'error'
    const format = config.format || 'structured'

    if (format === 'structured') {
      this.sendStructuredLog(level, error, notification, config)
    } else {
      this.sendSimpleLog(level, error, notification, config)
    }
  }

  private sendStructuredLog(
    level: string,
    error: CriticalError,
    notification: AlertNotification,
    config: LogConfig
  ): void {
    const logData = {
      alert: {
        id: error.id,
        type: error.type,
        severity: error.severity,
        message: error.message,
        source: error.source,
        environment: error.environment,
        timestamp: error.timestamp.toISOString(),
        resolved: error.resolved,
        occurrenceCount: error.occurrenceCount,
        firstOccurrence: error.firstOccurrence.toISOString(),
        lastOccurrence: error.lastOccurrence.toISOString(),
        correlationId: error.correlationId,
        userId: error.userId,
        sessionId: error.sessionId,
      },
      notification: {
        id: notification.id,
        channel: notification.channelName,
        status: notification.status,
      },
      ...(config.includeMetadata && { metadata: error.metadata }),
      ...(config.includeStackTrace && error.stackTrace && { stackTrace: error.stackTrace }),
    }

    const message = `🚨 CRITICAL ERROR ALERT: ${error.type.replace(/_/g, ' ')} - ${error.message}`

    switch (level) {
      case 'error':
        this.logger.error(message, logData)
        break
      case 'warn':
        this.logger.warn(message, logData)
        break
      case 'info':
        this.logger.info(message, logData)
        break
    }
  }

  private sendSimpleLog(
    level: string,
    error: CriticalError,
    notification: AlertNotification,
    config: LogConfig
  ): void {
    const severityIcon = this.getSeverityIcon(error.severity)
    const timestamp = error.timestamp.toISOString()

    let message = `${severityIcon} ALERT [${error.environment.toUpperCase()}] ${error.type.replace(/_/g, ' ').toUpperCase()}\n`
    message += `Time: ${timestamp}\n`
    message += `Severity: ${error.severity.toUpperCase()}\n`
    message += `Source: ${error.source}\n`
    message += `Message: ${error.message}\n`
    message += `Alert ID: ${error.id}\n`

    if (error.occurrenceCount > 1) {
      message += `Occurrences: ${error.occurrenceCount}\n`
      message += `First: ${error.firstOccurrence.toISOString()}\n`
      message += `Last: ${error.lastOccurrence.toISOString()}\n`
    }

    if (error.correlationId) {
      message += `Correlation ID: ${error.correlationId}\n`
    }

    if (config.includeMetadata && Object.keys(error.metadata).length > 0) {
      message += `Metadata: ${JSON.stringify(error.metadata, null, 2)}\n`
    }

    if (config.includeStackTrace && error.stackTrace) {
      message += `Stack Trace:\n${error.stackTrace}\n`
    }

    message += `Notification ID: ${notification.id}`

    const logData = {
      alertId: error.id,
      notificationId: notification.id,
      errorType: error.type,
      severity: error.severity,
      environment: error.environment,
      correlationId: error.correlationId,
    }

    switch (level) {
      case 'error':
        this.logger.error(message, logData)
        break
      case 'warn':
        this.logger.warn(message, logData)
        break
      case 'info':
        this.logger.info(message, logData)
        break
    }
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨'
      case 'high':
        return '⚠️'
      case 'medium':
        return '📢'
      case 'low':
        return 'ℹ️'
      default:
        return '🔔'
    }
  }

  validateConfig(config: Record<string, any>): boolean {
    const logConfig = config as LogConfig

    if (logConfig.level && !['error', 'warn', 'info'].includes(logConfig.level)) {
      return false
    }

    if (logConfig.format && !['structured', 'simple'].includes(logConfig.format)) {
      return false
    }

    return true
  }
}
