/**
 * Query Performance Monitor
 *
 * Real-time monitoring system for database query performance with metrics collection,
 * alerting, and performance regression detection.
 */

import { db } from '@/db/config'
import { sql } from 'drizzle-orm'
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { observability } from '@/lib/observability'
import { metrics } from '@/lib/observability/metrics'

export interface QueryPerformanceMetrics {
  queryId: string
  query: string
  executionTime: number
  planningTime: number
  rows: number
  bufferHits: number
  bufferReads: number
  timestamp: Date
  userId?: string
  endpoint?: string
  success: boolean
  error?: string
}

export interface PerformanceAlert {
  id: string
  type: 'slow_query' | 'high_error_rate' | 'performance_regression' | 'resource_exhaustion'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  query?: string
  metrics: any
  timestamp: Date
  resolved: boolean
}

export interface PerformanceBaseline {
  queryPattern: string
  averageExecutionTime: number
  p95ExecutionTime: number
  p99ExecutionTime: number
  averageRows: number
  sampleSize: number
  lastUpdated: Date
}

export class QueryPerformanceMonitor {
  private static instance: QueryPerformanceMonitor
  private metricsBuffer: QueryPerformanceMetrics[] = []
  private alerts: PerformanceAlert[] = []
  private baselines = new Map<string, PerformanceBaseline>()
  private isMonitoring = false
  private flushInterval: NodeJS.Timeout | null = null

  // Configuration
  private readonly config = {
    slowQueryThreshold: 100, // ms
    bufferSize: 1000,
    flushIntervalMs: 30000, // 30 seconds
    baselineUpdateInterval: 24 * 60 * 60 * 1000, // 24 hours
    alertThresholds: {
      slowQuery: 1000, // ms
      errorRate: 5, // percent
      regressionFactor: 2.0, // 2x slower than baseline
    },
  }

  static getInstance(): QueryPerformanceMonitor {
    if (!QueryPerformanceMonitor.instance) {
      QueryPerformanceMonitor.instance = new QueryPerformanceMonitor()
    }
    return QueryPerformanceMonitor.instance
  }

  /**
   * Start monitoring query performance
   */
  startMonitoring(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    console.log('🔍 Query Performance Monitor started')

    // Set up periodic flushing of metrics
    this.flushInterval = setInterval(() => {
      this.flushMetrics()
    }, this.config.flushIntervalMs)

    // Load existing baselines
    this.loadBaselines()
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false

    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }

    // Flush remaining metrics
    this.flushMetrics()

    console.log('🔍 Query Performance Monitor stopped')
  }

  /**
   * Record query performance metrics
   */
  recordQuery(metrics: Omit<QueryPerformanceMetrics, 'queryId' | 'timestamp'>): void {
    if (!this.isMonitoring) return

    const queryMetrics: QueryPerformanceMetrics = {
      ...metrics,
      queryId: this.generateQueryId(metrics.query),
      timestamp: new Date(),
    }

    // Add to buffer
    this.metricsBuffer.push(queryMetrics)

    // Check for immediate alerts
    this.checkForAlerts(queryMetrics)

    // Record in observability system
    metrics.queryDuration(
      queryMetrics.executionTime,
      this.extractQueryType(queryMetrics.query),
      queryMetrics.success
    )

    // Flush buffer if it's getting full
    if (this.metricsBuffer.length >= this.config.bufferSize) {
      this.flushMetrics()
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): {
    totalQueries: number
    averageExecutionTime: number
    slowQueries: number
    errorRate: number
    recentAlerts: PerformanceAlert[]
  } {
    const recentMetrics = this.metricsBuffer.filter(
      (m) => Date.now() - m.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    )

    const totalQueries = recentMetrics.length
    const averageExecutionTime =
      totalQueries > 0
        ? recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries
        : 0
    const slowQueries = recentMetrics.filter(
      (m) => m.executionTime > this.config.slowQueryThreshold
    ).length
    const errorRate =
      totalQueries > 0 ? (recentMetrics.filter((m) => !m.success).length / totalQueries) * 100 : 0

    const recentAlerts = this.alerts
      .filter((a) => !a.resolved && Date.now() - a.timestamp.getTime() < 60 * 60 * 1000) // Last hour
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)

    return {
      totalQueries,
      averageExecutionTime: Math.round(averageExecutionTime),
      slowQueries,
      errorRate: Math.round(errorRate * 100) / 100,
      recentAlerts,
    }
  }

  /**
   * Get slow queries report
   */
  getSlowQueriesReport(timeRangeMs: number = 60 * 60 * 1000): QueryPerformanceMetrics[] {
    const cutoff = Date.now() - timeRangeMs

    return this.metricsBuffer
      .filter(
        (m) => m.timestamp.getTime() > cutoff && m.executionTime > this.config.slowQueryThreshold
      )
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 50) // Top 50 slowest queries
  }

  /**
   * Analyze query performance trends
   */
  analyzePerformanceTrends(): {
    trending: 'improving' | 'degrading' | 'stable'
    averageChange: number
    regressions: string[]
    improvements: string[]
  } {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const twoHoursAgo = now - 2 * 60 * 60 * 1000

    const recentMetrics = this.metricsBuffer.filter((m) => m.timestamp.getTime() > oneHourAgo)
    const previousMetrics = this.metricsBuffer.filter(
      (m) => m.timestamp.getTime() > twoHoursAgo && m.timestamp.getTime() <= oneHourAgo
    )

    if (recentMetrics.length === 0 || previousMetrics.length === 0) {
      return {
        trending: 'stable',
        averageChange: 0,
        regressions: [],
        improvements: [],
      }
    }

    const recentAvg =
      recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / recentMetrics.length
    const previousAvg =
      previousMetrics.reduce((sum, m) => sum + m.executionTime, 0) / previousMetrics.length

    const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100

    let trending: 'improving' | 'degrading' | 'stable' = 'stable'
    if (Math.abs(changePercent) > 10) {
      trending = changePercent > 0 ? 'degrading' : 'improving'
    }

    // Analyze individual query patterns
    const regressions: string[] = []
    const improvements: string[] = []

    const queryGroups = this.groupMetricsByQuery(recentMetrics)
    const previousQueryGroups = this.groupMetricsByQuery(previousMetrics)

    for (const [queryId, recentGroup] of queryGroups) {
      const previousGroup = previousQueryGroups.get(queryId)
      if (!previousGroup || previousGroup.length < 3) continue

      const recentAvgTime =
        recentGroup.reduce((sum, m) => sum + m.executionTime, 0) / recentGroup.length
      const previousAvgTime =
        previousGroup.reduce((sum, m) => sum + m.executionTime, 0) / previousGroup.length

      const queryChangePercent = ((recentAvgTime - previousAvgTime) / previousAvgTime) * 100

      if (queryChangePercent > 50) {
        regressions.push(`Query ${queryId}: ${Math.round(queryChangePercent)}% slower`)
      } else if (queryChangePercent < -30) {
        improvements.push(`Query ${queryId}: ${Math.round(Math.abs(queryChangePercent))}% faster`)
      }
    }

    return {
      trending,
      averageChange: Math.round(changePercent * 100) / 100,
      regressions: regressions.slice(0, 5),
      improvements: improvements.slice(0, 5),
    }
  }

  /**
   * Check for performance alerts
   */
  private checkForAlerts(metrics: QueryPerformanceMetrics): void {
    // Slow query alert
    if (metrics.executionTime > this.config.alertThresholds.slowQuery) {
      this.createAlert({
        type: 'slow_query',
        severity: metrics.executionTime > 5000 ? 'critical' : 'high',
        message: `Slow query detected: ${metrics.executionTime}ms execution time`,
        query: metrics.query,
        metrics: { executionTime: metrics.executionTime },
      })
    }

    // Performance regression alert
    const baseline = this.baselines.get(metrics.queryId)
    if (
      baseline &&
      metrics.executionTime >
        baseline.p95ExecutionTime * this.config.alertThresholds.regressionFactor
    ) {
      this.createAlert({
        type: 'performance_regression',
        severity: 'medium',
        message: `Performance regression detected: ${Math.round((metrics.executionTime / baseline.p95ExecutionTime) * 100)}% of baseline`,
        query: metrics.query,
        metrics: {
          currentTime: metrics.executionTime,
          baselineP95: baseline.p95ExecutionTime,
        },
      })
    }

    // Resource exhaustion alert
    if (metrics.bufferReads > metrics.bufferHits * 2) {
      this.createAlert({
        type: 'resource_exhaustion',
        severity: 'medium',
        message: 'Low cache hit ratio detected - potential memory pressure',
        query: metrics.query,
        metrics: {
          bufferHits: metrics.bufferHits,
          bufferReads: metrics.bufferReads,
        },
      })
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const newAlert: PerformanceAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
    }

    this.alerts.push(newAlert)

    // Log alert
    console.warn(`🚨 Performance Alert [${newAlert.severity.toUpperCase()}]: ${newAlert.message}`)

    // Keep only recent alerts
    this.alerts = this.alerts.filter(
      (a) => Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    )
  }

  /**
   * Generate query ID for grouping
   */
  private generateQueryId(query: string): string {
    // Normalize query by removing parameters and whitespace
    const normalized = query
      .replace(/\$\d+/g, '?') // Replace parameters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\d+/g, 'N') // Replace numbers
      .trim()
      .toLowerCase()

    // Create hash of normalized query
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return `query_${Math.abs(hash).toString(36)}`
  }

  /**
   * Extract query type from SQL
   */
  private extractQueryType(query: string): string {
    const trimmed = query.trim().toUpperCase()
    if (trimmed.startsWith('SELECT')) return 'SELECT'
    if (trimmed.startsWith('INSERT')) return 'INSERT'
    if (trimmed.startsWith('UPDATE')) return 'UPDATE'
    if (trimmed.startsWith('DELETE')) return 'DELETE'
    return 'OTHER'
  }

  /**
   * Group metrics by query ID
   */
  private groupMetricsByQuery(
    metrics: QueryPerformanceMetrics[]
  ): Map<string, QueryPerformanceMetrics[]> {
    const groups = new Map<string, QueryPerformanceMetrics[]>()

    for (const metric of metrics) {
      const existing = groups.get(metric.queryId) || []
      existing.push(metric)
      groups.set(metric.queryId, existing)
    }

    return groups
  }

  /**
   * Flush metrics to persistent storage
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return

    try {
      // In a real implementation, this would save to database
      // For now, we'll just update baselines and clear the buffer
      await this.updateBaselines()

      console.log(`📊 Flushed ${this.metricsBuffer.length} performance metrics`)
      this.metricsBuffer = []
    } catch (error) {
      console.error('Failed to flush performance metrics:', error)
    }
  }

  /**
   * Update performance baselines
   */
  private async updateBaselines(): Promise<void> {
    const queryGroups = this.groupMetricsByQuery(this.metricsBuffer)

    for (const [queryId, metrics] of queryGroups) {
      if (metrics.length < 5) continue // Need sufficient samples

      const executionTimes = metrics.map((m) => m.executionTime).sort((a, b) => a - b)
      const rows = metrics.map((m) => m.rows)

      const baseline: PerformanceBaseline = {
        queryPattern: metrics[0].query.substring(0, 100),
        averageExecutionTime: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
        p95ExecutionTime: executionTimes[Math.floor(executionTimes.length * 0.95)],
        p99ExecutionTime: executionTimes[Math.floor(executionTimes.length * 0.99)],
        averageRows: rows.reduce((a, b) => a + b, 0) / rows.length,
        sampleSize: metrics.length,
        lastUpdated: new Date(),
      }

      this.baselines.set(queryId, baseline)
    }
  }

  /**
   * Load existing baselines (placeholder for database loading)
   */
  private async loadBaselines(): Promise<void> {
    // In a real implementation, this would load from database
    console.log('📈 Performance baselines loaded')
  }
}

export const queryPerformanceMonitor = QueryPerformanceMonitor.getInstance()
