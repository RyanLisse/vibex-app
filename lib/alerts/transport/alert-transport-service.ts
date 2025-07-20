import { ComponentLogger } from '../../logging/logger-factory'
import { AlertChannel, CriticalError, AlertNotification, AlertChannelType } from '../types'
import { AlertTransport } from './types'
import { WebhookTransport } from './webhook-transport'
import { EmailTransport } from './email-transport'
import { SlackTransport } from './slack-transport'
import { LogTransport } from './log-transport'

export class AlertTransportService {
  private readonly logger: ComponentLogger
  private readonly transports: Map<AlertChannelType, AlertTransport>

  constructor() {
    this.logger = new ComponentLogger('AlertTransportService')
    this.transports = new Map()
    this.initializeTransports()
  }

  private initializeTransports(): void {
    this.transports.set(AlertChannelType.WEBHOOK, new WebhookTransport())
    this.transports.set(AlertChannelType.EMAIL, new EmailTransport())
    this.transports.set(AlertChannelType.SLACK, new SlackTransport())
    this.transports.set(AlertChannelType.LOG, new LogTransport())
  }

  async send(
    channel: AlertChannel,
    error: CriticalError,
    notification: AlertNotification
  ): Promise<void> {
    const transport = this.transports.get(channel.type)

    if (!transport) {
      throw new Error(`No transport available for channel type: ${channel.type}`)
    }

    if (!transport.validateConfig(channel.config)) {
      throw new Error(`Invalid configuration for channel: ${channel.name}`)
    }

    try {
      await transport.send(channel, error, notification)

      this.logger.debug('Alert sent successfully', {
        channelType: channel.type,
        channelName: channel.name,
        errorId: error.id,
        notificationId: notification.id,
      })
    } catch (transportError) {
      this.logger.error('Transport failed to send alert', {
        channelType: channel.type,
        channelName: channel.name,
        errorId: error.id,
        notificationId: notification.id,
        error: transportError instanceof Error ? transportError.message : 'Unknown error',
      })
      throw transportError
    }
  }

  validateChannelConfig(channel: AlertChannel): boolean {
    const transport = this.transports.get(channel.type)
    return transport ? transport.validateConfig(channel.config) : false
  }

  getSupportedChannelTypes(): AlertChannelType[] {
    return Array.from(this.transports.keys())
  }

  registerTransport(type: AlertChannelType, transport: AlertTransport): void {
    this.transports.set(type, transport)
    this.logger.info('Transport registered', { type })
  }
}
