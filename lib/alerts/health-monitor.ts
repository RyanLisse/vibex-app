import { ComponentLogger } from '../logging/logger-factory'
import { getAlertService } from './index'
import { CriticalErrorType } from './types'

interface AlertSystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: number
  checks: HealthCheck[]
  metrics: {
    totalActiveAlerts: number
    channelsConfigured: number
    enabledChannels: number
    lastAlertTimestamp?: Date
    alertsLast24Hours: number
    systemEnabled: boolean
  }
}

interface HealthCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message?: string
  duration?: number
}

export class AlertSystemHealthMonitor {
  private readonly logger: ComponentLogger
  private checkInterval: NodeJS.Timeout | null = null

  constructor() {
    this.logger = new ComponentLogger('AlertSystemHealthMonitor')
  }

  startMonitoring(intervalMs = 300_000): void {
    // 5 minutes
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    this.checkInterval = setInterval(async () => {
      const health = await this.checkHealth()
      this.reportHealth(health)
    }, intervalMs)

    this.logger.info('Alert system health monitoring started', { intervalMs })
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      this.logger.info('Alert system health monitoring stopped')
    }
  }

  async checkHealth(): Promise<AlertSystemHealth> {
    const startTime = Date.now()
    const checks: HealthCheck[] = []

    // Check if alert service is initialized
    checks.push(await this.checkAlertServiceHealth())

    // Check alert processing capability
    checks.push(await this.checkAlertProcessing())

    // Check transport connectivity
    checks.push(await this.checkTransportHealth())

    // Check rate limiting status
    checks.push(await this.checkRateLimiting())

    // Check database connectivity
    checks.push(await this.checkDatabaseHealth())

    const metrics = await this.collectMetrics()
    const overallStatus = this.determineOverallStatus(checks)

    return {
      status: overallStatus,
      timestamp: Date.now(),
      checks,
      metrics,
    }
  }

  private async checkAlertServiceHealth(): Promise<HealthCheck> {
    const startTime = Date.now()

    try {
      const alertService = getAlertService()

      if (!alertService) {
        return {
          name: 'alert_service_initialization',
          status: 'fail',
          message: 'Alert service not initialized',
          duration: Date.now() - startTime,
        }
      }

      const isEnabled = alertService.isEnabled()

      if (!isEnabled) {
        return {
          name: 'alert_service_initialization',
          status: 'warn',
          message: 'Alert service is disabled',
          duration: Date.now() - startTime,
        }
      }

      return {
        name: 'alert_service_initialization',
        status: 'pass',
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        name: 'alert_service_initialization',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      }
    }
  }

  private async checkAlertProcessing(): Promise<HealthCheck> {
    const startTime = Date.now()

    try {
      const alertService = getAlertService()
      if (!alertService) {
        return {
          name: 'alert_processing',
          status: 'fail',
          message: 'Alert service not available',
          duration: Date.now() - startTime,
        }
      }

      // Check if we can get the configuration
      const config = alertService.getConfig()

      if (!config || !config.channels || config.channels.length === 0) {
        return {
          name: 'alert_processing',
          status: 'warn',
          message: 'No alert channels configured',
          duration: Date.now() - startTime,
        }
      }

      const enabledChannels = config.channels.filter((c) => c.enabled)

      if (enabledChannels.length === 0) {
        return {
          name: 'alert_processing',
          status: 'warn',
          message: 'No alert channels enabled',
          duration: Date.now() - startTime,
        }
      }

      return {
        name: 'alert_processing',
        status: 'pass',
        message: `${enabledChannels.length} channels enabled`,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        name: 'alert_processing',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      }
    }
  }

  private async checkTransportHealth(): Promise<HealthCheck> {
    const startTime = Date.now()

    try {
      const alertService = getAlertService()
      if (!alertService) {
        return {
          name: 'transport_health',
          status: 'fail',
          message: 'Alert service not available',
          duration: Date.now() - startTime,
        }
      }

      const supportedTypes = alertService.getSupportedChannelTypes()

      if (supportedTypes.length === 0) {
        return {
          name: 'transport_health',
          status: 'fail',
          message: 'No transport types available',
          duration: Date.now() - startTime,
        }
      }

      return {
        name: 'transport_health',
        status: 'pass',
        message: `${supportedTypes.length} transport types available`,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        name: 'transport_health',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      }
    }
  }

  private async checkRateLimiting(): Promise<HealthCheck> {
    const startTime = Date.now()

    try {
      const alertService = getAlertService()
      if (!alertService) {
        return {
          name: 'rate_limiting',
          status: 'warn',
          message: 'Alert service not available',
          duration: Date.now() - startTime,
        }
      }

      const config = alertService.getConfig()
      const rateLimiting = config.rateLimiting

      if (rateLimiting.maxAlertsPerHour <= 0) {
        return {
          name: 'rate_limiting',
          status: 'warn',
          message: 'Rate limiting disabled',
          duration: Date.now() - startTime,
        }
      }

      // Check if rate limiting is reasonable (not too restrictive)
      if (rateLimiting.maxAlertsPerHour < 5) {
        return {
          name: 'rate_limiting',
          status: 'warn',
          message: 'Rate limiting may be too restrictive',
          duration: Date.now() - startTime,
        }
      }

      return {
        name: 'rate_limiting',
        status: 'pass',
        message: `Max ${rateLimiting.maxAlertsPerHour} alerts/hour`,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        name: 'rate_limiting',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      }
    }
  }

  private async checkDatabaseHealth(): Promise<HealthCheck> {
    const startTime = Date.now()

    try {
      // Simple database connectivity check
      // This would be replaced with actual database health check
      const dbUrl = process.env.DATABASE_URL

      if (!dbUrl) {
        return {
          name: 'database_connectivity',
          status: 'warn',
          message: 'Database URL not configured',
          duration: Date.now() - startTime,
        }
      }

      return {
        name: 'database_connectivity',
        status: 'pass',
        message: 'Database configured',
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        name: 'database_connectivity',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      }
    }
  }

  private async collectMetrics(): Promise<AlertSystemHealth['metrics']> {
    try {
      const alertService = getAlertService()

      if (!alertService) {
        return {
          totalActiveAlerts: 0,
          channelsConfigured: 0,
          enabledChannels: 0,
          alertsLast24Hours: 0,
          systemEnabled: false,
        }
      }

      const config = alertService.getConfig()
      const activeAlerts = await alertService.getActiveAlerts()
      const alertHistory = await alertService.getAlertHistory(1000)

      // Calculate alerts in last 24 hours
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const alertsLast24Hours = alertHistory.filter(
        (alert) => new Date(alert.timestamp) >= last24Hours
      ).length

      // Find most recent alert
      const lastAlertTimestamp =
        alertHistory.length > 0 ? new Date(alertHistory[0].timestamp) : undefined

      return {
        totalActiveAlerts: activeAlerts.length,
        channelsConfigured: config.channels.length,
        enabledChannels: config.channels.filter((c) => c.enabled).length,
        lastAlertTimestamp,
        alertsLast24Hours,
        systemEnabled: config.enabled,
      }
    } catch (error) {
      this.logger.error('Failed to collect alert system metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      return {
        totalActiveAlerts: 0,
        channelsConfigured: 0,
        enabledChannels: 0,
        alertsLast24Hours: 0,
        systemEnabled: false,
      }
    }
  }

  private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
    const failCount = checks.filter((c) => c.status === 'fail').length
    const warnCount = checks.filter((c) => c.status === 'warn').length

    if (failCount > 0) {
      return 'unhealthy'
    }
    if (warnCount > 1) {
      return 'degraded'
    }
    if (warnCount === 1) {
      return 'degraded'
    }
    return 'healthy'
  }

  private reportHealth(health: AlertSystemHealth): void {
    const logLevel =
      health.status === 'healthy' ? 'info' : health.status === 'degraded' ? 'warn' : 'error'

    this.logger[logLevel]('Alert System Health Check', {
      status: health.status,
      checks: health.checks,
      metrics: health.metrics,
      event: 'alert_system_health_check',
    })

    // Trigger an alert if the alert system itself is unhealthy
    // (This creates a chicken-and-egg situation, so we log directly)
    if (health.status === 'unhealthy') {
      this.logger.error('Alert system unhealthy - requires immediate attention', {
        status: health.status,
        failedChecks: health.checks.filter((c) => c.status === 'fail'),
        metrics: health.metrics,
        severity: 'critical',
        type: CriticalErrorType.SYSTEM_HEALTH_FAILURE,
      })
    }
  }

  async getHealthStatus(): Promise<AlertSystemHealth> {
    return await this.checkHealth()
  }
}
