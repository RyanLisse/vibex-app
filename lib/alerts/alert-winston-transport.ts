import type { LogEntry } from 'winston'
import Transport from 'winston-transport'
import { ComponentLogger } from '../logging/logger-factory'
import type { AlertManager } from './alert-manager'
import { CriticalErrorDetector } from './critical-error-detector'
import type { AlertConfig } from './types'

interface AlertTransportOptions extends Transport.TransportStreamOptions {
  alertManager: AlertManager
  detector?: CriticalErrorDetector
  alertConfig?: AlertConfig
}

export class AlertWinstonTransport extends Transport {
  private readonly alertManager: AlertManager
  private readonly detector: CriticalErrorDetector
  private readonly alertConfig?: AlertConfig
  private readonly logger: ComponentLogger

  constructor(options: AlertTransportOptions) {
    super(options)

    this.alertManager = options.alertManager
    this.detector = options.detector || new CriticalErrorDetector()
    this.alertConfig = options.alertConfig
    this.logger = new ComponentLogger('AlertWinstonTransport')
  }

  log(info: LogEntry, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info)
    })

    // Process the log entry for critical errors
    this.processLogEntry(info)
      .then(() => callback())
      .catch((error) => {
        this.logger.error('Failed to process log entry for alerts', {
          error: error instanceof Error ? error.message : 'Unknown error',
          logLevel: info.level,
          logMessage: info.message,
        })
        callback()
      })
  }

  private async processLogEntry(info: LogEntry): Promise<void> {
    try {
      const criticalError = this.detector.detectCriticalError(info)

      if (criticalError) {
        this.logger.debug('Critical error detected in log entry', {
          errorId: criticalError.id,
          errorType: criticalError.type,
          severity: criticalError.severity,
        })

        await this.alertManager.processAlert(criticalError, this.alertConfig)
      }
    } catch (error) {
      this.logger.error('Error processing log entry for critical error detection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    }
  }

  updateAlertConfig(config: AlertConfig): void {
    this.alertConfig = config
    this.logger.info('Alert configuration updated', {
      enabled: config.enabled,
      channelCount: config.channels.length,
    })
  }

  addCustomErrorPattern(type: string, pattern: RegExp): void {
    this.detector.addCustomPattern(type as any, pattern)
    this.logger.info('Custom error pattern added', { type, pattern: pattern.source })
  }
}
