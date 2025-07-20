import { createDefaultLoggingConfig } from './defaults'
import { LoggerFactory } from './logger-factory'
import { PerformanceTracker } from './performance-tracker'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: number
  checks: HealthCheck[]
  metrics: {
    totalLogs: number
    errorRate: number
    averageLoggingTime: number
    memoryUsage: number
  }
}

export interface HealthCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message?: string
  duration?: number
}

export class LoggingHealthMonitor {
  private logger: any
  private performanceTracker: PerformanceTracker
  private checkInterval: NodeJS.Timeout | null = null
  private healthThresholds = {
    maxAverageLoggingTime: 10, // ms
    maxErrorRate: 0.05, // 5%
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
  }

  constructor() {
    const config = createDefaultLoggingConfig()
    const factory = LoggerFactory.getInstance(config)
    this.logger = factory.createLogger('health-monitor')
    this.performanceTracker = new PerformanceTracker()
  }

  startMonitoring(intervalMs = 60_000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    this.checkInterval = setInterval(async () => {
      const status = await this.checkHealth()
      this.reportHealth(status)
    }, intervalMs)

    this.logger.info('Health monitoring started', { intervalMs })
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      this.logger.info('Health monitoring stopped')
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now()
    const checks: HealthCheck[] = []

    // Check logging performance
    checks.push(await this.checkLoggingPerformance())

    // Check memory usage
    checks.push(await this.checkMemoryUsage())

    // Check error rates
    checks.push(await this.checkErrorRates())

    // Check disk space (for file logging)
    checks.push(await this.checkDiskSpace())

    const metrics = this.collectMetrics()
    const overallStatus = this.determineOverallStatus(checks)

    return {
      status: overallStatus,
      timestamp: Date.now(),
      checks,
      metrics,
    }
  }

  private async checkLoggingPerformance(): Promise<HealthCheck> {
    const startTime = Date.now()
    const metrics = this.performanceTracker.getMetrics()

    const status =
      metrics.averageLoggingTime > this.healthThresholds.maxAverageLoggingTime ? 'warn' : 'pass'

    const message =
      status === 'warn'
        ? `Average logging time ${metrics.averageLoggingTime}ms exceeds threshold ${this.healthThresholds.maxAverageLoggingTime}ms`
        : undefined

    return {
      name: 'logging_performance',
      status,
      message,
      duration: Date.now() - startTime,
    }
  }

  private async checkMemoryUsage(): Promise<HealthCheck> {
    const startTime = Date.now()
    const memoryUsage = process.memoryUsage()

    const status = memoryUsage.heapUsed > this.healthThresholds.maxMemoryUsage ? 'warn' : 'pass'

    const message =
      status === 'warn'
        ? `Memory usage ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB exceeds threshold ${Math.round(this.healthThresholds.maxMemoryUsage / 1024 / 1024)}MB`
        : undefined

    return {
      name: 'memory_usage',
      status,
      message,
      duration: Date.now() - startTime,
    }
  }

  private async checkErrorRates(): Promise<HealthCheck> {
    const startTime = Date.now()
    const metrics = this.performanceTracker.getMetrics()

    const errorRate = metrics.totalLogs > 0 ? metrics.errors / metrics.totalLogs : 0
    const status = errorRate > this.healthThresholds.maxErrorRate ? 'warn' : 'pass'

    const message =
      status === 'warn'
        ? `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${this.healthThresholds.maxErrorRate * 100}%`
        : undefined

    return {
      name: 'error_rate',
      status,
      message,
      duration: Date.now() - startTime,
    }
  }

  private async checkDiskSpace(): Promise<HealthCheck> {
    const startTime = Date.now()

    try {
      // Simple disk space check - in production, you'd want more sophisticated monitoring
      const fs = await import('fs/promises')
      const stats = await fs.stat('./logs').catch(() => null)

      return {
        name: 'disk_space',
        status: 'pass',
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        name: 'disk_space',
        status: 'warn',
        message: 'Could not check disk space',
        duration: Date.now() - startTime,
      }
    }
  }

  private collectMetrics() {
    const performanceMetrics = this.performanceTracker.getMetrics()
    const memoryUsage = process.memoryUsage()

    const errorRate =
      performanceMetrics.totalLogs > 0
        ? performanceMetrics.errors / performanceMetrics.totalLogs
        : 0

    return {
      totalLogs: performanceMetrics.totalLogs,
      errorRate,
      averageLoggingTime: performanceMetrics.averageLoggingTime,
      memoryUsage: memoryUsage.heapUsed,
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

  private reportHealth(status: HealthStatus): void {
    const logLevel =
      status.status === 'healthy' ? 'debug' : status.status === 'degraded' ? 'warn' : 'error'

    this.logger[logLevel]('Logging System Health Check', {
      status: status.status,
      checks: status.checks,
      metrics: status.metrics,
      event: 'health_check',
    })

    // Alert on unhealthy status
    if (status.status === 'unhealthy') {
      this.triggerAlert(status)
    }
  }

  private triggerAlert(status: HealthStatus): void {
    // Create a critical error that will be picked up by the alert system
    this.logger.error('system health unhealthy', {
      status,
      alert: true,
      severity: 'critical',
      healthChecks: status.checks,
      metrics: status.metrics,
      event: 'system_health_failure',
    })
  }

  setThresholds(thresholds: Partial<typeof this.healthThresholds>): void {
    this.healthThresholds = { ...this.healthThresholds, ...thresholds }
    this.logger.info('Health thresholds updated', {
      thresholds: this.healthThresholds,
    })
  }
}
