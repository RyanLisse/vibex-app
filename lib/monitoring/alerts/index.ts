/**
 * Alert Manager Integration
 *
 * Manages alerts, rules, and integrations with Prometheus Alert Manager
 */

import { observability } from '@/lib/observability'
import { notificationManager } from '../notifications'
import { recordError } from '../prometheus'

export interface Alert {
  id: string
  name: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'firing' | 'resolved' | 'silenced'
  description: string
  expression: string
  value: number
  threshold: number
  labels: Record<string, string>
  annotations: Record<string, string>
  startsAt: Date
  endsAt?: Date
  fingerprint: string
}

export interface AlertRule {
  name: string
  expression: string
  for: string // Duration string (e.g., "5m")
  severity: Alert['severity']
  labels: Record<string, string>
  annotations: Record<string, string>
  thresholds?: {
    warning?: number
    critical?: number
  }
}

export interface AlertManagerConfig {
  url: string
  alertRules: AlertRule[]
}

// Alert rule definitions
export const defaultAlertRules: AlertRule[] = [
  // System alerts
  {
    name: 'HighErrorRate',
    expression: 'rate(errors_total[5m]) > 0.05',
    for: '5m',
    severity: 'high',
    labels: {
      category: 'system',
      component: 'application',
    },
    annotations: {
      summary: 'High error rate detected',
      description: 'Error rate is above 5% for the last 5 minutes',
    },
  },
  {
    name: 'HighMemoryUsage',
    expression: 'process_memory_usage_bytes{type="rss"} > 4e9',
    for: '10m',
    severity: 'medium',
    labels: {
      category: 'system',
      component: 'memory',
    },
    annotations: {
      summary: 'High memory usage',
      description: 'Process memory usage is above 4GB',
    },
  },
  {
    name: 'HighCPUUsage',
    expression: 'process_cpu_usage_percent > 80',
    for: '15m',
    severity: 'medium',
    labels: {
      category: 'system',
      component: 'cpu',
    },
    annotations: {
      summary: 'High CPU usage',
      description: 'CPU usage is above 80% for 15 minutes',
    },
  },

  // Database alerts
  {
    name: 'DatabaseConnectionPoolExhausted',
    expression: 'db_connection_pool_size{state="waiting"} > 10',
    for: '5m',
    severity: 'critical',
    labels: {
      category: 'database',
      component: 'connection_pool',
    },
    annotations: {
      summary: 'Database connection pool exhausted',
      description: 'More than 10 connections are waiting in the pool',
    },
  },
  {
    name: 'SlowDatabaseQueries',
    expression: 'histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 1',
    for: '10m',
    severity: 'medium',
    labels: {
      category: 'database',
      component: 'performance',
    },
    annotations: {
      summary: 'Slow database queries detected',
      description: '95th percentile query duration is above 1 second',
    },
  },
  {
    name: 'HighDatabaseReplicationLag',
    expression: 'db_replication_lag_seconds > 10',
    for: '5m',
    severity: 'high',
    labels: {
      category: 'database',
      component: 'replication',
    },
    annotations: {
      summary: 'High database replication lag',
      description: 'Replication lag is above 10 seconds',
    },
  },

  // API alerts
  {
    name: 'HighResponseTime',
    expression: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2',
    for: '10m',
    severity: 'medium',
    labels: {
      category: 'api',
      component: 'performance',
    },
    annotations: {
      summary: 'High API response time',
      description: '95th percentile response time is above 2 seconds',
    },
  },
  {
    name: 'LowCacheHitRate',
    expression:
      'rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) < 0.5',
    for: '15m',
    severity: 'low',
    labels: {
      category: 'performance',
      component: 'cache',
    },
    annotations: {
      summary: 'Low cache hit rate',
      description: 'Cache hit rate is below 50%',
    },
  },

  // Agent alerts
  {
    name: 'HighAgentFailureRate',
    expression:
      'rate(agent_executions_total{status="failure"}[5m]) / rate(agent_executions_total[5m]) > 0.1',
    for: '10m',
    severity: 'high',
    labels: {
      category: 'agents',
      component: 'execution',
    },
    annotations: {
      summary: 'High agent failure rate',
      description: 'Agent failure rate is above 10%',
    },
  },
  {
    name: 'ExcessiveTokenUsage',
    expression: 'rate(agent_token_usage_total[1h]) > 100000',
    for: '30m',
    severity: 'medium',
    labels: {
      category: 'agents',
      component: 'cost',
    },
    annotations: {
      summary: 'Excessive token usage',
      description: 'Token usage rate is above 100k tokens per hour',
    },
  },

  // SLA alerts
  {
    name: 'SLAViolationAvailability',
    expression:
      '(1 - (sum(rate(errors_total{severity="critical"}[5m])) / sum(rate(http_requests_total[5m])))) < 0.999',
    for: '15m',
    severity: 'critical',
    labels: {
      category: 'sla',
      component: 'availability',
    },
    annotations: {
      summary: 'SLA violation: Availability',
      description: 'Service availability is below 99.9%',
    },
  },
  {
    name: 'SLAViolationResponseTime',
    expression:
      '(sum(rate(http_request_duration_seconds_bucket{le="1"}[5m])) / sum(rate(http_request_duration_seconds_count[5m]))) < 0.95',
    for: '15m',
    severity: 'high',
    labels: {
      category: 'sla',
      component: 'performance',
    },
    annotations: {
      summary: 'SLA violation: Response time',
      description: 'Less than 95% of requests complete within 1 second',
    },
  },

  // Capacity alerts
  {
    name: 'StorageCapacityWarning',
    expression: 'predict_linear(sum(db_table_size_bytes)[1h], 7 * 24 * 3600) > 900e9',
    for: '1h',
    severity: 'medium',
    labels: {
      category: 'capacity',
      component: 'storage',
    },
    annotations: {
      summary: 'Storage capacity warning',
      description: 'Storage is predicted to exceed 900GB within 7 days',
    },
  },
  {
    name: 'MemoryCapacityWarning',
    expression: 'predict_linear(process_memory_usage_bytes{type="rss"}[1h], 24 * 3600) > 8e9',
    for: '30m',
    severity: 'medium',
    labels: {
      category: 'capacity',
      component: 'memory',
    },
    annotations: {
      summary: 'Memory capacity warning',
      description: 'Memory usage is predicted to exceed 8GB within 24 hours',
    },
  },
]

// Alert manager instance
class AlertManager {
  private alerts: Map<string, Alert> = new Map()
  private rules: AlertRule[] = []
  private evaluationInterval: NodeJS.Timeout | null = null
  private config: AlertManagerConfig | null = null

  async initialize(config: AlertManagerConfig): Promise<void> {
    this.config = config
    this.rules = [...defaultAlertRules, ...config.alertRules]

    // Start alert evaluation
    this.startEvaluation()

    console.log(`🚨 Alert Manager initialized with ${this.rules.length} rules`)
  }

  private startEvaluation(): void {
    // Evaluate rules every 30 seconds
    this.evaluationInterval = setInterval(() => {
      this.evaluateRules()
    }, 30_000)

    // Initial evaluation
    this.evaluateRules()
  }

  private async evaluateRules(): Promise<void> {
    for (const rule of this.rules) {
      try {
        const result = await this.evaluateExpression(rule.expression)
        const fingerprint = this.generateFingerprint(rule)
        const existingAlert = this.alerts.get(fingerprint)

        if (result.firing && !existingAlert) {
          // Create new alert
          const alert: Alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: rule.name,
            severity: rule.severity,
            status: 'firing',
            description: rule.annotations.description || '',
            expression: rule.expression,
            value: result.value,
            threshold: result.threshold,
            labels: rule.labels,
            annotations: rule.annotations,
            startsAt: new Date(),
            fingerprint,
          }

          this.alerts.set(fingerprint, alert)
          await this.sendAlert(alert)
        } else if (!result.firing && existingAlert && existingAlert.status === 'firing') {
          // Resolve existing alert
          existingAlert.status = 'resolved'
          existingAlert.endsAt = new Date()
          await this.sendResolution(existingAlert)

          // Remove from active alerts after some time
          setTimeout(() => {
            this.alerts.delete(fingerprint)
          }, 300_000) // 5 minutes
        }
      } catch (error) {
        console.error(`Failed to evaluate alert rule ${rule.name}:`, error)
      }
    }
  }

  private async evaluateExpression(
    expression: string
  ): Promise<{ firing: boolean; value: number; threshold: number }> {
    // This is a simplified evaluation - in production, you would query Prometheus
    // For demo purposes, we'll use some mock logic

    // Extract comparison operator and threshold from expression
    const match = expression.match(/(.*?)\s*(>|<|>=|<=|==)\s*([\d.]+)/)
    if (!match) {
      return { firing: false, value: 0, threshold: 0 }
    }

    const [, metric, operator, thresholdStr] = match
    const threshold = Number.parseFloat(thresholdStr)

    // Get mock metric value (in production, query Prometheus)
    const value = this.getMockMetricValue(metric)

    let firing = false
    switch (operator) {
      case '>':
        firing = value > threshold
        break
      case '<':
        firing = value < threshold
        break
      case '>=':
        firing = value >= threshold
        break
      case '<=':
        firing = value <= threshold
        break
      case '==':
        firing = value === threshold
        break
    }

    return { firing, value, threshold }
  }

  private getMockMetricValue(metric: string): number {
    // Mock metric values for demo
    const mockValues: Record<string, number> = {
      'rate(errors_total[5m])': Math.random() * 0.1,
      'process_memory_usage_bytes{type="rss"}': 2e9 + Math.random() * 3e9,
      process_cpu_usage_percent: Math.random() * 100,
      'db_connection_pool_size{state="waiting"}': Math.floor(Math.random() * 15),
      'histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))': Math.random() * 2,
      db_replication_lag_seconds: Math.random() * 15,
      'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))': Math.random() * 3,
    }

    // Extract base metric name
    const baseMetric = Object.keys(mockValues).find((key) => metric.includes(key))
    return mockValues[baseMetric || ''] || Math.random()
  }

  private generateFingerprint(rule: AlertRule): string {
    const labelStr = Object.entries(rule.labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',')

    return `${rule.name}:${labelStr}`
  }

  private async sendAlert(alert: Alert): Promise<void> {
    console.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.name}`)
    console.warn(`   ${alert.description}`)
    console.warn(`   Value: ${alert.value.toFixed(2)}, Threshold: ${alert.threshold}`)

    // Record alert metric
    recordError('alert', alert.severity, alert.labels.component || 'unknown')

    // Send notifications
    await notificationManager.sendNotification({
      title: `🚨 Alert: ${alert.name}`,
      message: alert.description,
      severity: alert.severity,
      data: {
        alertId: alert.id,
        value: alert.value,
        threshold: alert.threshold,
        labels: alert.labels,
        startsAt: alert.startsAt,
      },
    })

    // Record in observability
    observability.recordEvent('alert.fired', {
      alert: alert.name,
      severity: alert.severity,
      value: alert.value,
      threshold: alert.threshold,
    })
  }

  private async sendResolution(alert: Alert): Promise<void> {
    console.log(`✅ RESOLVED: ${alert.name}`)

    // Send resolution notification
    await notificationManager.sendNotification({
      title: `✅ Resolved: ${alert.name}`,
      message: `Alert has been resolved after ${this.formatDuration(alert.startsAt, alert.endsAt!)}`,
      severity: 'low',
      data: {
        alertId: alert.id,
        duration: alert.endsAt!.getTime() - alert.startsAt.getTime(),
      },
    })

    // Record in observability
    observability.recordEvent('alert.resolved', {
      alert: alert.name,
      duration: alert.endsAt!.getTime() - alert.startsAt.getTime(),
    })
  }

  private formatDuration(start: Date, end: Date): string {
    const durationMs = end.getTime() - start.getTime()
    const minutes = Math.floor(durationMs / 60_000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  // Public methods

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((a) => a.status === 'firing')
  }

  getAlertHistory(limit = 100): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
      .slice(0, limit)
  }

  silenceAlert(alertId: string, duration: number): void {
    const alert = Array.from(this.alerts.values()).find((a) => a.id === alertId)
    if (alert) {
      alert.status = 'silenced'
      setTimeout(() => {
        if (alert.status === 'silenced') {
          alert.status = 'firing'
        }
      }, duration)
    }
  }

  addCustomRule(rule: AlertRule): void {
    this.rules.push(rule)
  }

  removeRule(ruleName: string): void {
    this.rules = this.rules.filter((r) => r.name !== ruleName)
  }

  stop(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval)
      this.evaluationInterval = null
    }
  }
}

// Export singleton instance
export const alertManager = new AlertManager()

// Initialize function
export async function initializeAlertManager(config: AlertManagerConfig): Promise<void> {
  await alertManager.initialize(config)
}
