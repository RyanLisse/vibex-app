import { AlertTransport } from './alert-transport-service'
import { AlertChannel, CriticalError, AlertNotification } from '../types'
import { ComponentLogger } from '../../logging/logger-factory'

interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'resend'
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject?: string
  smtp?: {
    host: string
    port: number
    secure: boolean
    username: string
    password: string
  }
  apiKey?: string
  region?: string
}

export class EmailTransport implements AlertTransport {
  private readonly logger: ComponentLogger

  constructor() {
    this.logger = new ComponentLogger('EmailTransport')
  }

  async send(channel: AlertChannel, error: CriticalError, notification: AlertNotification): Promise<void> {
    const config = channel.config as EmailConfig

    switch (config.provider) {
      case 'smtp':
        await this.sendViaSMTP(config, error, notification)
        break
      case 'sendgrid':
        await this.sendViaSendGrid(config, error, notification)
        break
      case 'ses':
        await this.sendViaSES(config, error, notification)
        break
      case 'resend':
        await this.sendViaResend(config, error, notification)
        break
      default:
        throw new Error(`Unsupported email provider: ${config.provider}`)
    }
  }

  private async sendViaSMTP(config: EmailConfig, error: CriticalError, notification: AlertNotification): Promise<void> {
    // For now, we'll log that SMTP would be sent
    // In a real implementation, you'd use nodemailer or similar
    this.logger.info('SMTP email would be sent', {
      to: config.to,
      subject: this.buildSubject(config, error),
      notificationId: notification.id
    })

    // Placeholder implementation
    throw new Error('SMTP transport not implemented - requires nodemailer dependency')
  }

  private async sendViaSendGrid(config: EmailConfig, error: CriticalError, notification: AlertNotification): Promise<void> {
    if (!config.apiKey) {
      throw new Error('SendGrid API key is required')
    }

    const payload = {
      personalizations: [{
        to: config.to.map(email => ({ email })),
        cc: config.cc?.map(email => ({ email })),
        bcc: config.bcc?.map(email => ({ email })),
        subject: this.buildSubject(config, error)
      }],
      from: { email: config.from },
      content: [{
        type: 'text/html',
        value: this.buildHTMLContent(error, notification)
      }, {
        type: 'text/plain',
        value: this.buildTextContent(error, notification)
      }]
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`)
    }

    this.logger.debug('SendGrid email sent successfully', {
      to: config.to,
      notificationId: notification.id
    })
  }

  private async sendViaSES(config: EmailConfig, error: CriticalError, notification: AlertNotification): Promise<void> {
    // AWS SES implementation would go here
    // Requires AWS SDK
    this.logger.info('SES email would be sent', {
      to: config.to,
      subject: this.buildSubject(config, error),
      notificationId: notification.id
    })

    throw new Error('SES transport not implemented - requires AWS SDK')
  }

  private async sendViaResend(config: EmailConfig, error: CriticalError, notification: AlertNotification): Promise<void> {
    if (!config.apiKey) {
      throw new Error('Resend API key is required')
    }

    const payload = {
      from: config.from,
      to: config.to,
      cc: config.cc,
      bcc: config.bcc,
      subject: this.buildSubject(config, error),
      html: this.buildHTMLContent(error, notification),
      text: this.buildTextContent(error, notification)
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Resend API error: ${response.status} - ${errorText}`)
    }

    this.logger.debug('Resend email sent successfully', {
      to: config.to,
      notificationId: notification.id
    })
  }

  private buildSubject(config: EmailConfig, error: CriticalError): string {
    if (config.subject) {
      return config.subject
        .replace('{severity}', error.severity)
        .replace('{type}', error.type)
        .replace('{environment}', error.environment)
    }

    const severityIcon = this.getSeverityIcon(error.severity)
    return `${severityIcon} [${error.environment.toUpperCase()}] ${error.type.replace(/_/g, ' ')}`
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨'
      case 'high': return '⚠️'
      case 'medium': return '📢'
      case 'low': return 'ℹ️'
      default: return '🔔'
    }
  }

  private buildHTMLContent(error: CriticalError, notification: AlertNotification): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Critical Error Alert</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: ${this.getSeverityColor(error.severity)}; color: white; padding: 20px; }
          .content { padding: 20px; }
          .metadata { background-color: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .footer { padding: 15px; background-color: #f8f9fa; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${this.getSeverityIcon(error.severity)} Critical Error Alert</h1>
            <p><strong>Type:</strong> ${error.type.replace(/_/g, ' ')}</p>
            <p><strong>Environment:</strong> ${error.environment}</p>
            <p><strong>Time:</strong> ${error.timestamp.toISOString()}</p>
          </div>
          <div class="content">
            <h2>Error Details</h2>
            <p><strong>Message:</strong> ${error.message}</p>
            <p><strong>Source:</strong> ${error.source}</p>
            <p><strong>Severity:</strong> ${error.severity}</p>
            
            ${error.occurrenceCount > 1 ? `
              <div class="metadata">
                <h3>Occurrence Information</h3>
                <p><strong>Count:</strong> ${error.occurrenceCount}</p>
                <p><strong>First Occurrence:</strong> ${error.firstOccurrence.toISOString()}</p>
                <p><strong>Last Occurrence:</strong> ${error.lastOccurrence.toISOString()}</p>
              </div>
            ` : ''}
            
            ${error.correlationId ? `
              <div class="metadata">
                <h3>Correlation</h3>
                <p><strong>Correlation ID:</strong> ${error.correlationId}</p>
              </div>
            ` : ''}
            
            ${Object.keys(error.metadata).length > 0 ? `
              <div class="metadata">
                <h3>Additional Metadata</h3>
                <pre>${JSON.stringify(error.metadata, null, 2)}</pre>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Alert ID: ${error.id} | Notification ID: ${notification.id}</p>
            <p>Generated by ClaudeFlow Alert System</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  private buildTextContent(error: CriticalError, notification: AlertNotification): string {
    return `
CRITICAL ERROR ALERT

Type: ${error.type.replace(/_/g, ' ')}
Environment: ${error.environment}
Time: ${error.timestamp.toISOString()}
Severity: ${error.severity}

ERROR DETAILS
Message: ${error.message}
Source: ${error.source}

${error.occurrenceCount > 1 ? `
OCCURRENCE INFORMATION
Count: ${error.occurrenceCount}
First Occurrence: ${error.firstOccurrence.toISOString()}
Last Occurrence: ${error.lastOccurrence.toISOString()}
` : ''}

${error.correlationId ? `
CORRELATION
Correlation ID: ${error.correlationId}
` : ''}

${Object.keys(error.metadata).length > 0 ? `
ADDITIONAL METADATA
${JSON.stringify(error.metadata, null, 2)}
` : ''}

Alert ID: ${error.id}
Notification ID: ${notification.id}

Generated by ClaudeFlow Alert System
    `.trim()
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#dc3545'
      case 'high': return '#fd7e14'
      case 'medium': return '#ffc107'
      case 'low': return '#20c997'
      default: return '#6c757d'
    }
  }

  validateConfig(config: Record<string, any>): boolean {
    const emailConfig = config as EmailConfig

    if (!emailConfig.provider || !['smtp', 'sendgrid', 'ses', 'resend'].includes(emailConfig.provider)) {
      return false
    }

    if (!emailConfig.from || !emailConfig.to || emailConfig.to.length === 0) {
      return false
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailConfig.from)) {
      return false
    }

    for (const email of emailConfig.to) {
      if (!emailRegex.test(email)) {
        return false
      }
    }

    if (emailConfig.cc) {
      for (const email of emailConfig.cc) {
        if (!emailRegex.test(email)) {
          return false
        }
      }
    }

    if (emailConfig.bcc) {
      for (const email of emailConfig.bcc) {
        if (!emailRegex.test(email)) {
          return false
        }
      }
    }

    // Provider-specific validation
    switch (emailConfig.provider) {
      case 'smtp':
        if (!emailConfig.smtp || !emailConfig.smtp.host || !emailConfig.smtp.port) {
          return false
        }
        break
      case 'sendgrid':
      case 'resend':
        if (!emailConfig.apiKey) {
          return false
        }
        break
      case 'ses':
        if (!emailConfig.apiKey || !emailConfig.region) {
          return false
        }
        break
    }

    return true
  }
}