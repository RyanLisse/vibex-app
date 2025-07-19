import { AlertTransport } from './alert-transport-service'
import { AlertChannel, CriticalError, AlertNotification } from '../types'
import { ComponentLogger } from '../../logging/logger-factory'

interface DiscordConfig {
  webhookUrl: string
  username?: string
  avatarUrl?: string
  mentionRoles?: string[]
  mentionUsers?: string[]
  mentionEveryone?: boolean
}

interface DiscordEmbed {
  title: string
  description: string
  color: number
  fields: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  footer: {
    text: string
  }
  timestamp: string
}

export class DiscordTransport implements AlertTransport {
  private readonly logger: ComponentLogger

  constructor() {
    this.logger = new ComponentLogger('DiscordTransport')
  }

  async send(channel: AlertChannel, error: CriticalError, notification: AlertNotification): Promise<void> {
    const config = channel.config as DiscordConfig
    const payload = this.buildPayload(config, error, notification)

    let lastError: Error | null = null
    const maxRetries = 3

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ClaudeFlow-AlertSystem/1.0'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000)
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Discord webhook error: ${response.status} - ${errorText}`)
        }

        this.logger.debug('Discord webhook sent successfully', {
          webhookUrl: config.webhookUrl,
          status: response.status,
          attempt,
          notificationId: notification.id
        })

        return

      } catch (requestError) {
        lastError = requestError instanceof Error ? requestError : new Error('Unknown error')
        
        this.logger.warn('Discord webhook attempt failed', {
          webhookUrl: config.webhookUrl,
          attempt,
          maxRetries,
          error: lastError.message,
          notificationId: notification.id
        })

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('All Discord webhook attempts failed')
  }

  private buildPayload(config: DiscordConfig, error: CriticalError, notification: AlertNotification) {
    const embed = this.buildEmbed(error, notification)
    const mentions = this.buildMentions(config)

    return {
      username: config.username || 'Claude Flow Alerts',
      avatar_url: config.avatarUrl,
      content: mentions ? `${mentions} Critical error detected!` : undefined,
      embeds: [embed]
    }
  }

  private buildEmbed(error: CriticalError, notification: AlertNotification): DiscordEmbed {
    const severityColor = this.getSeverityColor(error.severity)
    const severityIcon = this.getSeverityIcon(error.severity)

    return {
      title: `${severityIcon} ${error.type.replace(/_/g, ' ').toUpperCase()}`,
      description: error.message,
      color: severityColor,
      fields: [
        {
          name: 'Environment',
          value: error.environment,
          inline: true
        },
        {
          name: 'Severity',
          value: error.severity.toUpperCase(),
          inline: true
        },
        {
          name: 'Source',
          value: error.source,
          inline: true
        },
        {
          name: 'Timestamp',
          value: `<t:${Math.floor(error.timestamp.getTime() / 1000)}:F>`,
          inline: false
        },
        ...(error.occurrenceCount > 1 ? [{
          name: 'Occurrences',
          value: `${error.occurrenceCount} times`,
          inline: true
        }] : []),
        ...(error.correlationId ? [{
          name: 'Correlation ID',
          value: `\`${error.correlationId}\``,
          inline: true
        }] : [])
      ],
      footer: {
        text: `Alert ID: ${error.id} | Claude Flow Alert System`
      },
      timestamp: error.timestamp.toISOString()
    }
  }

  private buildMentions(config: DiscordConfig): string {
    const mentions: string[] = []

    if (config.mentionEveryone) {
      mentions.push('@everyone')
    }

    if (config.mentionRoles && config.mentionRoles.length > 0) {
      mentions.push(...config.mentionRoles.map(roleId => `<@&${roleId}>`))
    }

    if (config.mentionUsers && config.mentionUsers.length > 0) {
      mentions.push(...config.mentionUsers.map(userId => `<@${userId}>`))
    }

    return mentions.join(' ')
  }

  private getSeverityColor(severity: string): number {
    switch (severity) {
      case 'critical': return 0xff0000 // Red
      case 'high': return 0xff6600 // Orange
      case 'medium': return 0xffcc00 // Yellow
      case 'low': return 0x00ccff // Light Blue
      default: return 0x808080 // Gray
    }
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

  validateConfig(config: Record<string, any>): boolean {
    const discordConfig = config as DiscordConfig

    if (!discordConfig.webhookUrl) {
      return false
    }

    try {
      const url = new URL(discordConfig.webhookUrl)
      if (!url.hostname.includes('discord.com') && !url.hostname.includes('discordapp.com')) {
        return false
      }
    } catch {
      return false
    }

    if (discordConfig.mentionRoles) {
      if (!Array.isArray(discordConfig.mentionRoles)) {
        return false
      }
    }

    if (discordConfig.mentionUsers) {
      if (!Array.isArray(discordConfig.mentionUsers)) {
        return false
      }
    }

    return true
  }
}