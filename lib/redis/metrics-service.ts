/**
 * MetricsService - Redis/Valkey Real-time Analytics Implementation
 *
 * Provides comprehensive metrics collection, aggregation, and analytics
 */

import { randomUUID } from 'crypto'
import type Redis from 'ioredis'
import { ObservabilityService } from '../observability'
import { RedisClientManager } from './redis-client'

interface MetricAlert {
  type: 'threshold' | 'rate' | 'anomaly'
  operator: 'greater_than' | 'less_than' | 'equal_to'
  value: number
  severity: 'info' | 'warning' | 'critical'
  triggered?: boolean
}

interface TimeSeries {
  timestamp: number
  value: number
}

interface HistogramStats {
  count: number
  sum: number
  avg: number
  min: number
  max: number
  p50: number
  p95: number
  p99: number
}

export class MetricsService {
  private static instance: MetricsService
  private redisManager: RedisClientManager
  private observability = ObservabilityService.getInstance()
  private metricSubscriptions = new Map<string, { id: string; callback: (metric: any) => void }>()

  private constructor() {
    this.redisManager = RedisClientManager.getInstance()
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService()
    }
    return MetricsService.instance
  }

  // Counter Operations
  async incrementCounter(name: string, value = 1, tags?: Record<string, string>): Promise<void> {
    this.validateMetricName(name)
    this.validateMetricValue(value)

    const client = this.redisManager.getClient()
    const key = this.buildCounterKey(name, tags)

    try {
      await client.incrby(key, value)

      this.observability.recordEvent('metrics.counter.incremented', 1, {
        name,
        value: value.toString(),
        tags: JSON.stringify(tags || {}),
      })
    } catch (error) {
      this.observability.recordError('metrics.counter.error', error as Error)
    }
  }

  async incrementCounterWithTTL(
    name: string,
    value = 1,
    ttl: number,
    tags?: Record<string, string>
  ): Promise<void> {
    const client = this.redisManager.getClient()
    const key = this.buildCounterKey(name, tags)

    try {
      const pipeline = client.pipeline()
      pipeline.incrby(key, value)
      pipeline.expire(key, ttl)
      await pipeline.exec()
    } catch (error) {
      this.observability.recordError('metrics.counter.ttl.error', error as Error)
    }
  }

  async getCounter(name: string, tags?: Record<string, string>): Promise<number> {
    const client = this.redisManager.getClient()
    const key = this.buildCounterKey(name, tags)

    try {
      const value = await client.get(key)
      return value ? Number.parseInt(value) : 0
    } catch (error) {
      this.observability.recordError('metrics.counter.get.error', error as Error)
      return 0
    }
  }

  async getTopCounters(
    pattern: string,
    limit = 10
  ): Promise<Array<{ key: string; value: number }>> {
    const client = this.redisManager.getClient()

    try {
      const keys = await client.keys(pattern)
      const pipeline = client.pipeline()

      keys.forEach((key) => pipeline.get(key))
      const results = await pipeline.exec()

      const counters = keys.map((key, index) => ({
        key: key.replace('counter:', ''),
        value: Number.parseInt((results?.[index]?.[1] as string) || '0'),
      }))

      return counters.sort((a, b) => b.value - a.value).slice(0, limit)
    } catch (error) {
      this.observability.recordError('metrics.counter.top.error', error as Error)
      return []
    }
  }

  // Gauge Operations
  async setGauge(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    this.validateMetricName(name)
    this.validateMetricValue(value)

    const client = this.redisManager.getClient()
    const key = this.buildGaugeKey(name, tags)

    try {
      await client.set(key, value.toString())

      this.observability.recordEvent('metrics.gauge.set', 1, {
        name,
        value: value.toString(),
        tags: JSON.stringify(tags || {}),
      })
    } catch (error) {
      this.observability.recordError('metrics.gauge.error', error as Error)
    }
  }

  async getGauge(name: string, tags?: Record<string, string>): Promise<number> {
    const client = this.redisManager.getClient()
    const key = this.buildGaugeKey(name, tags)

    try {
      const value = await client.get(key)
      return value ? Number.parseFloat(value) : 0
    } catch (error) {
      this.observability.recordError('metrics.gauge.get.error', error as Error)
      return 0
    }
  }

  async incrementGauge(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    const client = this.redisManager.getClient()
    const key = this.buildGaugeKey(name, tags)

    try {
      await client.incrbyfloat(key, value)
    } catch (error) {
      this.observability.recordError('metrics.gauge.increment.error', error as Error)
    }
  }

  async decrementGauge(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    await this.incrementGauge(name, -value, tags)
  }

  async setGaugeWithHistory(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): Promise<void> {
    await this.setGauge(name, value, tags)

    // Store in time series for history
    const historyKey = this.buildTimeSeriesKey(name, tags)
    const client = this.redisManager.getClient()

    try {
      await client.zadd(historyKey, Date.now(), `${Date.now()}:${value}`)
      // Keep only last 1000 entries
      await client.zremrangebyrank(historyKey, 0, -1001)
    } catch (error) {
      this.observability.recordError('metrics.gauge.history.error', error as Error)
    }
  }

  async getGaugeHistory(
    name: string,
    limit = 100,
    tags?: Record<string, string>
  ): Promise<Array<{ value: number; timestamp: Date }>> {
    const client = this.redisManager.getClient()
    const historyKey = this.buildTimeSeriesKey(name, tags)

    try {
      const entries = await client.zrevrange(historyKey, 0, limit - 1)

      return entries.map((entry) => {
        const [timestamp, value] = entry.split(':')
        return {
          timestamp: new Date(Number.parseInt(timestamp)),
          value: Number.parseFloat(value),
        }
      })
    } catch (error) {
      this.observability.recordError('metrics.gauge.history.get.error', error as Error)
      return []
    }
  }

  // Histogram Operations
  async recordHistogram(name: string, value: number, tags?: Record<string, string>): Promise<void> {
    this.validateMetricName(name)

    if (value < 0) {
      throw new Error('Histogram values must be non-negative')
    }

    const client = this.redisManager.getClient()
    const key = this.buildHistogramKey(name, tags)

    try {
      const pipeline = client.pipeline()
      pipeline.hincrbyfloat(key, 'sum', value)
      pipeline.hincrby(key, 'count', 1)
      pipeline.zadd(`${key}:values`, Date.now(), value)

      // Update min/max
      const currentStats = await client.hmget(key, 'min', 'max')
      const currentMin = currentStats[0] ? Number.parseFloat(currentStats[0]) : value
      const currentMax = currentStats[1] ? Number.parseFloat(currentStats[1]) : value

      if (value < currentMin) {
        pipeline.hset(key, 'min', value.toString())
      }
      if (value > currentMax) {
        pipeline.hset(key, 'max', value.toString())
      }

      await pipeline.exec()

      // Keep only last 10000 values for percentile calculations
      await client.zremrangebyrank(`${key}:values`, 0, -10_001)

      this.observability.recordEvent('metrics.histogram.recorded', 1, {
        name,
        value: value.toString(),
      })
    } catch (error) {
      this.observability.recordError('metrics.histogram.error', error as Error)
    }
  }

  async getHistogramStats(name: string, tags?: Record<string, string>): Promise<HistogramStats> {
    const client = this.redisManager.getClient()
    const key = this.buildHistogramKey(name, tags)

    try {
      const stats = await client.hmget(key, 'count', 'sum', 'min', 'max')
      const count = Number.parseInt(stats[0] || '0')
      const sum = Number.parseFloat(stats[1] || '0')
      const min = Number.parseFloat(stats[2] || '0')
      const max = Number.parseFloat(stats[3] || '0')
      const avg = count > 0 ? sum / count : 0

      // Get percentiles from sorted values
      const values = await client.zrange(`${key}:values`, 0, -1)
      const numericValues = values.map((v) => Number.parseFloat(v)).sort((a, b) => a - b)

      const p50 = this.calculatePercentile(numericValues, 0.5)
      const p95 = this.calculatePercentile(numericValues, 0.95)
      const p99 = this.calculatePercentile(numericValues, 0.99)

      return { count, sum, avg, min, max, p50, p95, p99 }
    } catch (error) {
      this.observability.recordError('metrics.histogram.stats.error', error as Error)
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 }
    }
  }

  async initializeHistogram(name: string, buckets: number[]): Promise<void> {
    const client = this.redisManager.getClient()
    const bucketsKey = this.buildHistogramBucketsKey(name)

    try {
      // Initialize bucket counts
      const pipeline = client.pipeline()
      buckets.forEach((bucket) => {
        pipeline.hset(bucketsKey, bucket.toString(), '0')
      })
      pipeline.hset(bucketsKey, 'Infinity', '0')
      await pipeline.exec()
    } catch (error) {
      this.observability.recordError('metrics.histogram.init.error', error as Error)
    }
  }

  async getHistogramBuckets(name: string): Promise<Map<number, number>> {
    const client = this.redisManager.getClient()
    const bucketsKey = this.buildHistogramBucketsKey(name)

    try {
      const bucketData = await client.hgetall(bucketsKey)
      const buckets = new Map<number, number>()

      for (const [bucket, count] of Object.entries(bucketData)) {
        const bucketValue =
          bucket === 'Infinity' ? Number.POSITIVE_INFINITY : Number.parseFloat(bucket)
        buckets.set(bucketValue, Number.parseInt(count))
      }

      return buckets
    } catch (error) {
      this.observability.recordError('metrics.histogram.buckets.error', error as Error)
      return new Map()
    }
  }

  // Time Series Operations
  async recordTimeSeries(name: string, value: number, timestamp?: number): Promise<void> {
    this.validateMetricName(name)
    this.validateMetricValue(value)

    const client = this.redisManager.getClient()
    const key = this.buildTimeSeriesKey(name)
    const ts = timestamp || Date.now()

    try {
      await client.zadd(key, ts, `${ts}:${value}`)

      // Optionally limit the number of data points
      const maxPoints = 100_000
      const currentCount = await client.zcard(key)
      if (currentCount > maxPoints) {
        await client.zremrangebyrank(key, 0, currentCount - maxPoints - 1)
      }

      this.observability.recordEvent('metrics.timeseries.recorded', 1, { name })
    } catch (error) {
      this.observability.recordError('metrics.timeseries.error', error as Error)
    }
  }

  async getTimeSeries(name: string, startTime: number, endTime: number): Promise<TimeSeries[]> {
    const client = this.redisManager.getClient()
    const key = this.buildTimeSeriesKey(name)

    try {
      const entries = await client.zrangebyscore(key, startTime, endTime)

      return entries.map((entry) => {
        const [timestamp, value] = entry.split(':')
        return {
          timestamp: Number.parseInt(timestamp),
          value: Number.parseFloat(value),
        }
      })
    } catch (error) {
      this.observability.recordError('metrics.timeseries.get.error', error as Error)
      return []
    }
  }

  async aggregateTimeSeries(
    name: string,
    startTime: number,
    endTime: number,
    intervalMs: number,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count'
  ): Promise<TimeSeries[]> {
    const data = await this.getTimeSeries(name, startTime, endTime)
    const result: TimeSeries[] = []

    let currentWindow = Math.floor(startTime / intervalMs) * intervalMs

    while (currentWindow < endTime) {
      const windowEnd = currentWindow + intervalMs
      const windowData = data.filter(
        (point) => point.timestamp >= currentWindow && point.timestamp < windowEnd
      )

      if (windowData.length > 0) {
        let aggregatedValue = 0

        switch (aggregation) {
          case 'sum':
            aggregatedValue = windowData.reduce((sum, point) => sum + point.value, 0)
            break
          case 'avg':
            aggregatedValue =
              windowData.reduce((sum, point) => sum + point.value, 0) / windowData.length
            break
          case 'min':
            aggregatedValue = Math.min(...windowData.map((point) => point.value))
            break
          case 'max':
            aggregatedValue = Math.max(...windowData.map((point) => point.value))
            break
          case 'count':
            aggregatedValue = windowData.length
            break
        }

        result.push({
          timestamp: currentWindow,
          value: aggregatedValue,
        })
      }

      currentWindow = windowEnd
    }

    return result
  }

  // Dashboard and Real-time Features
  async getDashboardMetrics(metricNames: string[]): Promise<Record<string, any>> {
    const metrics: Record<string, any> = {}

    for (const name of metricNames) {
      try {
        // Determine metric type and get appropriate data
        if (name.includes('counter')) {
          metrics[name] = {
            type: 'counter',
            value: await this.getCounter(name),
            timestamp: new Date(),
          }
        } else if (name.includes('gauge')) {
          metrics[name] = {
            type: 'gauge',
            value: await this.getGauge(name),
            timestamp: new Date(),
          }
        } else {
          // Default to histogram
          metrics[name] = {
            type: 'histogram',
            stats: await this.getHistogramStats(name),
            timestamp: new Date(),
          }
        }
      } catch (error) {
        this.observability.recordError('metrics.dashboard.error', error as Error)
        metrics[name] = { type: 'error', error: (error as Error).message }
      }
    }

    return metrics
  }

  async subscribeToMetrics(
    streamName: string,
    callback: (metric: any) => void
  ): Promise<{ id: string }> {
    const subscriptionId = randomUUID()
    this.metricSubscriptions.set(subscriptionId, { id: subscriptionId, callback })

    return { id: subscriptionId }
  }

  async unsubscribeFromMetrics(subscriptionId: string): Promise<boolean> {
    return this.metricSubscriptions.delete(subscriptionId)
  }

  async publishMetric(streamName: string, metric: any): Promise<void> {
    // Notify all subscribers
    for (const subscription of this.metricSubscriptions.values()) {
      try {
        subscription.callback(metric)
      } catch (error) {
        this.observability.recordError('metrics.publish.callback.error', error as Error)
      }
    }
  }

  // Alert System
  async setAlert(metricName: string, alert: MetricAlert): Promise<void> {
    const client = this.redisManager.getClient()
    const alertKey = this.buildAlertKey(metricName)

    try {
      await client.hset(alertKey, JSON.stringify(alert))
    } catch (error) {
      this.observability.recordError('metrics.alert.set.error', error as Error)
    }
  }

  async checkAlerts(metricName: string): Promise<Array<MetricAlert & { triggered: boolean }>> {
    const client = this.redisManager.getClient()
    const alertKey = this.buildAlertKey(metricName)

    try {
      const alertData = await client.hgetall(alertKey)
      const alerts: Array<MetricAlert & { triggered: boolean }> = []

      const currentValue = await this.getGauge(metricName) // Assume gauge for simplicity

      for (const alertJson of Object.values(alertData)) {
        const alert = JSON.parse(alertJson) as MetricAlert
        let triggered = false

        switch (alert.operator) {
          case 'greater_than':
            triggered = currentValue > alert.value
            break
          case 'less_than':
            triggered = currentValue < alert.value
            break
          case 'equal_to':
            triggered = currentValue === alert.value
            break
        }

        alerts.push({ ...alert, triggered })
      }

      return alerts
    } catch (error) {
      this.observability.recordError('metrics.alert.check.error', error as Error)
      return []
    }
  }

  // Analytics Features (simplified implementations)
  async trackPageLoad(sessionId: string, path: string, metrics: any): Promise<void> {
    // Implementation would store page performance metrics
  }

  async getPerformanceMetrics(sessionId: string): Promise<any> {
    return { totalPageViews: 0, averageLoadTime: 0, pages: [] }
  }

  async trackUserAction(userId: string, action: string, data: any): Promise<void> {
    // Implementation would store user behavior data
  }

  async getUserMetrics(userId: string): Promise<any> {
    return { totalActions: 0, actionTypes: [] }
  }

  async initializeFunnel(funnelName: string, steps: string[]): Promise<void> {
    // Implementation would set up funnel tracking
  }

  async trackFunnelStep(funnelName: string, step: string, userId: string): Promise<void> {
    // Implementation would track funnel progression
  }

  async getFunnelAnalysis(funnelName: string): Promise<any> {
    return { steps: [], conversionRates: [], overallConversion: 0 }
  }

  // Business Intelligence (simplified implementations)
  async recordRevenue(date: string, amount: number, currency: string): Promise<void> {
    // Implementation would store revenue data
  }

  async getBusinessMetrics(date: string): Promise<any> {
    return { revenue: { total: 0 }, customers: { new: 0, churned: 0, net: 0 } }
  }

  async recordProductSale(productId: string, amount: number, currency: string): Promise<void> {
    // Implementation would store product sales data
  }

  async getProductMetrics(date: string): Promise<any> {
    return {}
  }

  async recordCustomerPurchase(customerId: string, amount: number, date: Date): Promise<void> {
    // Implementation would store customer purchase data
  }

  async calculateCustomerLifetimeValue(customerId: string): Promise<any> {
    return {
      totalRevenue: 0,
      averageOrderValue: 0,
      purchaseFrequency: 0,
      estimatedLifetimeValue: 0,
    }
  }

  async addUserToCohort(cohortMonth: string, userId: string): Promise<void> {
    // Implementation would add user to cohort
  }

  async recordCohortRetention(
    cohortMonth: string,
    monthsAfter: number,
    retainedUsers: number
  ): Promise<void> {
    // Implementation would record retention data
  }

  async getCohortAnalysis(cohortMonth: string): Promise<any> {
    return { cohortSize: 0, retentionRates: [] }
  }

  // Data Management
  async applyRetentionPolicy(metricName: string, retentionMs: number): Promise<number> {
    const client = this.redisManager.getClient()
    const key = this.buildTimeSeriesKey(metricName)
    const cutoff = Date.now() - retentionMs

    try {
      const removed = await client.zremrangebyscore(key, 0, cutoff)
      return removed
    } catch (error) {
      this.observability.recordError('metrics.retention.error', error as Error)
      return 0
    }
  }

  async cleanupExpiredMetrics(): Promise<number> {
    // Implementation would clean up expired metrics
    return 0
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up Metrics service...')

    // Clear subscriptions
    this.metricSubscriptions.clear()

    console.log('Metrics service cleaned up successfully')
  }

  // Private helper methods
  private validateMetricName(name: string): void {
    if (!name || name.trim() === '') {
      throw new Error('Metric name cannot be empty')
    }
  }

  private validateMetricValue(value: number): void {
    if (isNaN(value) || !isFinite(value)) {
      throw new Error('Metric value must be a valid number')
    }
  }

  private buildCounterKey(name: string, tags?: Record<string, string>): string {
    const tagString = tags
      ? `:${Object.entries(tags)
          .map(([k, v]) => `${k}=${v}`)
          .join(',')}`
      : ''
    return `counter:${name}${tagString}`
  }

  private buildGaugeKey(name: string, tags?: Record<string, string>): string {
    const tagString = tags
      ? `:${Object.entries(tags)
          .map(([k, v]) => `${k}=${v}`)
          .join(',')}`
      : ''
    return `gauge:${name}${tagString}`
  }

  private buildHistogramKey(name: string, tags?: Record<string, string>): string {
    const tagString = tags
      ? `:${Object.entries(tags)
          .map(([k, v]) => `${k}=${v}`)
          .join(',')}`
      : ''
    return `histogram:${name}${tagString}`
  }

  private buildHistogramBucketsKey(name: string): string {
    return `histogram:${name}:buckets`
  }

  private buildTimeSeriesKey(name: string, tags?: Record<string, string>): string {
    const tagString = tags
      ? `:${Object.entries(tags)
          .map(([k, v]) => `${k}=${v}`)
          .join(',')}`
      : ''
    return `timeseries:${name}${tagString}`
  }

  private buildAlertKey(metricName: string): string {
    return `alerts:${metricName}`
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0

    const index = Math.ceil(values.length * percentile) - 1
    return values[Math.max(0, Math.min(index, values.length - 1))]
  }
}
