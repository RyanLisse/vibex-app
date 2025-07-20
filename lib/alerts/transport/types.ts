import { AlertChannel, CriticalError, AlertNotification } from '../types'

export interface AlertTransport {
  send(channel: AlertChannel, error: CriticalError, notification: AlertNotification): Promise<void>
  validateConfig(config: Record<string, any>): boolean
}
