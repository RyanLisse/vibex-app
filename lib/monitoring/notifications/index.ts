/**
 * External Notification Systems
 *
 * Handles sending notifications through various channels (email, Slack, webhooks)
 */

import { createTransport, Transporter } from 'nodemailer'
import { observability } from '@/lib/observability'

export interface Notification {
  title: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp?: Date
  data?: Record<string, any>
}

export interface NotificationChannel {
  name: string
  enabled: boolean
  send(notification: Notification): Promise<void>
}

// Email notification channel
export class EmailChannel implements NotificationChannel {
  name = 'email'
  enabled: boolean
  private transporter: Transporter | null = null
  private config: any

  constructor(config: any) {
    this.config = config
    this.enabled = config.enabled

    if (this.enabled) {
      this.transporter = createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.auth,
      })
    }
  }

  async send(notification: Notification): Promise<void> {
    if (!this.enabled || !this.transporter) return

    const severityEmoji = {
      low: '📌',
      medium: '⚠️',
      high: '🚨',
      critical: '🔴',
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px 5px 0 0; }
            .severity { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
            .severity-low { background-color: #d4edda; color: #155724; }
            .severity-medium { background-color: #fff3cd; color: #856404; }
            .severity-high { background-color: #f8d7da; color: #721c24; }
            .severity-critical { background-color: #721c24; color: white; }
            .content { background-color: #fff; padding: 20px; border: 1px solid #ddd; }
            .data { background-color: #f9f9f9; padding: 10px; margin-top: 15px; border-radius: 3px; }
            .footer { background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #666; }
            pre { white-space: pre-wrap; word-wrap: break-word; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${severityEmoji[notification.severity]} ${notification.title}</h2>
              <span class="severity severity-${notification.severity}">${notification.severity.toUpperCase()}</span>
            </div>
            <div class="content">
              <p>${notification.message}</p>
              ${
                notification.data
                  ? `
                <div class="data">
                  <h4>Additional Information:</h4>
                  <pre>${JSON.stringify(notification.data, null, 2)}</pre>
                </div>
              `
                  : ''
              }
              <p><small>Time: ${(notification.timestamp || new Date()).toISOString()}</small></p>
            </div>
            <div class="footer">
              <p>This is an automated notification from Codex Clone Monitoring System</p>
            </div>
          </div>
        </body>
      </html>
    `

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: this.config.to.join(', '),
        subject: `[${notification.severity.toUpperCase()}] ${notification.title}`,
        html,
        text: `${notification.title}\n\n${notification.message}\n\n${
          notification.data ? JSON.stringify(notification.data, null, 2) : ''
        }`,
      })

      console.log(`📧 Email notification sent: ${notification.title}`)
    } catch (error) {
      console.error('Failed to send email notification:', error)
      throw error
    }
  }
}

// Slack notification channel
export class SlackChannel implements NotificationChannel {
  name = 'slack'
  enabled: boolean
  private config: any

  constructor(config: any) {
    this.config = config
    this.enabled = config.enabled
  }

  async send(notification: Notification): Promise<void> {
    if (!this.enabled) return

    const color = {
      low: '#36a64f',
      medium: '#ff9f00',
      high: '#ff6b6b',
      critical: '#dc3545',
    }

    const payload = {
      channel: this.config.channel,
      username: this.config.username,
      icon_emoji: this.config.iconEmoji,
      attachments: [
        {
          color: color[notification.severity],
          title: notification.title,
          text: notification.message,
          fields: notification.data
            ? Object.entries(notification.data).map(([key, value]) => ({
                title: key,
                value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                short: true,
              }))
            : [],
          footer: 'Codex Clone Monitoring',
          ts: Math.floor((notification.timestamp || new Date()).getTime() / 1000),
        },
      ],
    }

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`)
      }

      console.log(`💬 Slack notification sent: ${notification.title}`)
    } catch (error) {
      console.error('Failed to send Slack notification:', error)
      throw error
    }
  }
}

// Generic webhook notification channel
export class WebhookChannel implements NotificationChannel {
  name = 'webhook'
  enabled: boolean
  private config: any

  constructor(config: any) {
    this.config = config
    this.enabled = config.enabled
  }

  async send(notification: Notification): Promise<void> {
    if (!this.enabled) return

    const payload = {
      notification: {
        title: notification.title,
        message: notification.message,
        severity: notification.severity,
        timestamp: notification.timestamp || new Date(),
        data: notification.data,
      },
      metadata: {
        source: 'codex-clone-monitoring',
        version: '1.0.0',
      },
    }

    try {
      const response = await fetch(this.config.url, {
        method: this.config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status} ${response.statusText}`)
      }

      console.log(`🔗 Webhook notification sent: ${notification.title}`)
    } catch (error) {
      console.error('Failed to send webhook notification:', error)
      throw error
    }
  }
}

// Notification manager
export class NotificationManager {
  private channels: NotificationChannel[] = []
  private rateLimits: Map<string, { count: number; resetAt: number }> = new Map()
  private readonly RATE_LIMIT_WINDOW = 3600000 // 1 hour
  private readonly RATE_LIMIT_MAX = 100 // Max notifications per hour per channel

  addChannel(channel: NotificationChannel): void {
    this.channels.push(channel)
  }

  async sendNotification(notification: Notification): Promise<void> {
    // Add timestamp if not provided
    if (!notification.timestamp) {
      notification.timestamp = new Date()
    }

    // Record notification event
    observability.recordEvent('notification.sent', {
      title: notification.title,
      severity: notification.severity,
      channels: this.channels.filter((c) => c.enabled).map((c) => c.name),
    })

    // Send to all enabled channels
    const promises = this.channels
      .filter((channel) => channel.enabled && this.checkRateLimit(channel.name))
      .map((channel) =>
        channel.send(notification).catch((error) => {
          console.error(`Failed to send notification via ${channel.name}:`, error)
          observability.recordError(`notification.${channel.name}.failed`, error)
        })
      )

    await Promise.allSettled(promises)
  }

  private checkRateLimit(channelName: string): boolean {
    const now = Date.now()
    const limit = this.rateLimits.get(channelName)

    if (!limit || now > limit.resetAt) {
      // Reset rate limit
      this.rateLimits.set(channelName, {
        count: 1,
        resetAt: now + this.RATE_LIMIT_WINDOW,
      })
      return true
    }

    if (limit.count >= this.RATE_LIMIT_MAX) {
      console.warn(`Rate limit exceeded for channel: ${channelName}`)
      return false
    }

    limit.count++
    return true
  }

  // Batch notifications for digest
  private digestQueue: Map<string, Notification[]> = new Map()
  private digestInterval: NodeJS.Timeout | null = null

  startDigest(intervalMs: number = 300000): void {
    // 5 minutes default
    this.digestInterval = setInterval(() => {
      this.sendDigest()
    }, intervalMs)
  }

  stopDigest(): void {
    if (this.digestInterval) {
      clearInterval(this.digestInterval)
      this.digestInterval = null
    }
  }

  async queueForDigest(category: string, notification: Notification): Promise<void> {
    if (!this.digestQueue.has(category)) {
      this.digestQueue.set(category, [])
    }

    this.digestQueue.get(category)!.push(notification)
  }

  private async sendDigest(): Promise<void> {
    for (const [category, notifications] of this.digestQueue) {
      if (notifications.length === 0) continue

      const digest: Notification = {
        title: `${category} Digest - ${notifications.length} notifications`,
        message: this.formatDigest(notifications),
        severity: this.getHighestSeverity(notifications),
        data: {
          category,
          count: notifications.length,
          notifications: notifications.map((n) => ({
            title: n.title,
            severity: n.severity,
            timestamp: n.timestamp,
          })),
        },
      }

      await this.sendNotification(digest)
    }

    // Clear digest queue
    this.digestQueue.clear()
  }

  private formatDigest(notifications: Notification[]): string {
    const grouped = notifications.reduce(
      (acc, n) => {
        if (!acc[n.severity]) acc[n.severity] = []
        acc[n.severity].push(n)
        return acc
      },
      {} as Record<string, Notification[]>
    )

    let message = 'Summary of notifications:\n\n'

    for (const [severity, items] of Object.entries(grouped)) {
      message += `${severity.toUpperCase()} (${items.length}):\n`
      items.forEach((item) => {
        message += `  - ${item.title}\n`
      })
      message += '\n'
    }

    return message
  }

  private getHighestSeverity(notifications: Notification[]): Notification['severity'] {
    const severityOrder = ['low', 'medium', 'high', 'critical']
    let highest = 0

    for (const n of notifications) {
      const index = severityOrder.indexOf(n.severity)
      if (index > highest) highest = index
    }

    return severityOrder[highest] as Notification['severity']
  }
}

// Create singleton instance
export const notificationManager = new NotificationManager()

// Initialize notification channels from config
export function initializeNotifications(config: any): void {
  if (config.email) {
    notificationManager.addChannel(new EmailChannel(config.email))
  }

  if (config.slack) {
    notificationManager.addChannel(new SlackChannel(config.slack))
  }

  if (config.webhook) {
    notificationManager.addChannel(new WebhookChannel(config.webhook))
  }

  console.log('📢 Notification system initialized')
}

// Helper function for quick notifications
export async function notify(
  title: string,
  message: string,
  severity: Notification['severity'] = 'medium',
  data?: Record<string, any>
): Promise<void> {
  await notificationManager.sendNotification({
    title,
    message,
    severity,
    data,
  })
}
