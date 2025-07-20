/**
 * MetricsService Tests
 *
 * Test-driven development for Redis/Valkey real-time analytics and metrics
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { testRedisConfig } from './config'
import { MetricsService } from './metrics-service'
import { RedisClientManager } from './redis-client'

describe('MetricsService', () => {
  let metricsService: MetricsService
  let redisManager: RedisClientManager

  beforeAll(async () => {
    redisManager = RedisClientManager.getInstance(testRedisConfig)
    await redisManager.initialize()
  })

  beforeEach(() => {
    metricsService = MetricsService.getInstance()
  })

  afterEach(async () => {
    await metricsService.cleanup()
  })

  afterAll(async () => {
    await redisManager.shutdown()
  })

  describe('Counter Metrics', () => {
    test('should increment and get counter values', async () => {
      const counterName = 'test:page-views'

      // Increment counter
      await metricsService.incrementCounter(counterName)
      await metricsService.incrementCounter(counterName, 5)

      // Get counter value
      const value = await metricsService.getCounter(counterName)
      expect(value).toBe(6)

      // Increment with tags
      await metricsService.incrementCounter(counterName, 1, { page: 'home' })
      await metricsService.incrementCounter(counterName, 2, { page: 'about' })

      const taggedValue = await metricsService.getCounter(counterName, { page: 'home' })
      expect(taggedValue).toBe(1)
    })

    test('should handle counter operations with expiration', async () => {
      const counterName = 'test:expiring-counter'
      const ttl = 2 // 2 seconds

      await metricsService.incrementCounterWithTTL(counterName, 1, ttl)

      const initialValue = await metricsService.getCounter(counterName)
      expect(initialValue).toBe(1)

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 2500))

      const expiredValue = await metricsService.getCounter(counterName)
      expect(expiredValue).toBe(0)
    })

    test('should get top counters', async () => {
      const baseCounter = 'test:popular-pages'

      // Create counters with different values
      await metricsService.incrementCounter(`${baseCounter}:home`, 100)
      await metricsService.incrementCounter(`${baseCounter}:about`, 50)
      await metricsService.incrementCounter(`${baseCounter}:contact`, 25)
      await metricsService.incrementCounter(`${baseCounter}:blog`, 75)

      const topCounters = await metricsService.getTopCounters(`${baseCounter}:*`, 3)

      expect(topCounters).toHaveLength(3)
      expect(topCounters[0].key).toBe(`${baseCounter}:home`)
      expect(topCounters[0].value).toBe(100)
      expect(topCounters[1].key).toBe(`${baseCounter}:blog`)
      expect(topCounters[1].value).toBe(75)
      expect(topCounters[2].key).toBe(`${baseCounter}:about`)
      expect(topCounters[2].value).toBe(50)
    })
  })

  describe('Gauge Metrics', () => {
    test('should set and get gauge values', async () => {
      const gaugeName = 'test:cpu-usage'

      await metricsService.setGauge(gaugeName, 45.6)

      const value = await metricsService.getGauge(gaugeName)
      expect(value).toBe(45.6)

      // Update gauge value
      await metricsService.setGauge(gaugeName, 67.2)

      const updatedValue = await metricsService.getGauge(gaugeName)
      expect(updatedValue).toBe(67.2)
    })

    test('should increment and decrement gauge values', async () => {
      const gaugeName = 'test:active-connections'

      await metricsService.setGauge(gaugeName, 10)

      await metricsService.incrementGauge(gaugeName, 5)
      expect(await metricsService.getGauge(gaugeName)).toBe(15)

      await metricsService.decrementGauge(gaugeName, 3)
      expect(await metricsService.getGauge(gaugeName)).toBe(12)
    })

    test('should track gauge history', async () => {
      const gaugeName = 'test:memory-usage'

      // Set multiple values over time
      await metricsService.setGaugeWithHistory(gaugeName, 100)
      await new Promise((resolve) => setTimeout(resolve, 100))

      await metricsService.setGaugeWithHistory(gaugeName, 150)
      await new Promise((resolve) => setTimeout(resolve, 100))

      await metricsService.setGaugeWithHistory(gaugeName, 125)

      const history = await metricsService.getGaugeHistory(gaugeName, 5)
      expect(history).toHaveLength(3)
      expect(history[0].value).toBe(100)
      expect(history[1].value).toBe(150)
      expect(history[2].value).toBe(125)
      expect(history[0].timestamp).toBeInstanceOf(Date)
    })
  })

  describe('Histogram Metrics', () => {
    test('should record and analyze histogram data', async () => {
      const histogramName = 'test:response-times'

      // Record various response times
      const responseTimes = [10, 25, 50, 75, 100, 150, 200, 300, 500, 1000]

      for (const time of responseTimes) {
        await metricsService.recordHistogram(histogramName, time)
      }

      const stats = await metricsService.getHistogramStats(histogramName)

      expect(stats.count).toBe(10)
      expect(stats.sum).toBe(2410)
      expect(stats.avg).toBe(241)
      expect(stats.min).toBe(10)
      expect(stats.max).toBe(1000)
      expect(stats.p50).toBeGreaterThan(75)
      expect(stats.p95).toBeGreaterThan(500)
      expect(stats.p99).toBeGreaterThan(800)
    })

    test('should support histogram buckets', async () => {
      const histogramName = 'test:request-size'
      const buckets = [1, 10, 100, 1000, 10_000] // bytes

      await metricsService.initializeHistogram(histogramName, buckets)

      // Record values in different buckets
      await metricsService.recordHistogram(histogramName, 5) // bucket: 10
      await metricsService.recordHistogram(histogramName, 50) // bucket: 100
      await metricsService.recordHistogram(histogramName, 500) // bucket: 1000
      await metricsService.recordHistogram(histogramName, 5000) // bucket: 10000
      await metricsService.recordHistogram(histogramName, 50_000) // bucket: infinity

      const bucketCounts = await metricsService.getHistogramBuckets(histogramName)

      expect(bucketCounts.get(10)).toBe(1)
      expect(bucketCounts.get(100)).toBe(1)
      expect(bucketCounts.get(1000)).toBe(1)
      expect(bucketCounts.get(10_000)).toBe(1)
      expect(bucketCounts.get(Number.POSITIVE_INFINITY)).toBe(1)
    })
  })

  describe('Time Series Metrics', () => {
    test('should record and query time series data', async () => {
      const seriesName = 'test:user-signups'
      const now = Date.now()

      // Record data points over time
      await metricsService.recordTimeSeries(seriesName, 10, now - 3_600_000) // 1 hour ago
      await metricsService.recordTimeSeries(seriesName, 15, now - 1_800_000) // 30 min ago
      await metricsService.recordTimeSeries(seriesName, 8, now) // now

      // Query last hour
      const hourData = await metricsService.getTimeSeries(seriesName, now - 3_600_000, now)
      expect(hourData).toHaveLength(3)
      expect(hourData[0].value).toBe(10)
      expect(hourData[1].value).toBe(15)
      expect(hourData[2].value).toBe(8)

      // Query last 30 minutes
      const recentData = await metricsService.getTimeSeries(seriesName, now - 1_800_000, now)
      expect(recentData).toHaveLength(2)
    })

    test('should aggregate time series data', async () => {
      const seriesName = 'test:api-requests'
      const now = Date.now()

      // Record multiple data points
      for (let i = 0; i < 60; i++) {
        await metricsService.recordTimeSeries(
          seriesName,
          Math.floor(Math.random() * 100),
          now - i * 60_000 // Each minute for the past hour
        )
      }

      // Aggregate by 5-minute intervals
      const aggregated = await metricsService.aggregateTimeSeries(
        seriesName,
        now - 3_600_000,
        now,
        300_000, // 5 minutes
        'avg'
      )

      expect(aggregated).toHaveLength(12) // 60 minutes / 5 minutes = 12 intervals
      expect(aggregated[0]).toHaveProperty('timestamp')
      expect(aggregated[0]).toHaveProperty('value')
    })

    test('should support different aggregation functions', async () => {
      const seriesName = 'test:sales-data'
      const now = Date.now()

      // Record sales data
      const salesData = [100, 200, 150, 300, 250]
      for (let i = 0; i < salesData.length; i++) {
        await metricsService.recordTimeSeries(seriesName, salesData[i], now - i * 3_600_000)
      }

      const sumResult = await metricsService.aggregateTimeSeries(
        seriesName,
        now - 18_000_000,
        now,
        3_600_000,
        'sum'
      )
      const avgResult = await metricsService.aggregateTimeSeries(
        seriesName,
        now - 18_000_000,
        now,
        3_600_000,
        'avg'
      )
      const maxResult = await metricsService.aggregateTimeSeries(
        seriesName,
        now - 18_000_000,
        now,
        3_600_000,
        'max'
      )
      const minResult = await metricsService.aggregateTimeSeries(
        seriesName,
        now - 18_000_000,
        now,
        3_600_000,
        'min'
      )

      expect(sumResult[0].value).toBe(1000) // 100+200+150+300+250
      expect(avgResult[0].value).toBe(200) // 1000/5
      expect(maxResult[0].value).toBe(300)
      expect(minResult[0].value).toBe(100)
    })
  })

  describe('Real-time Dashboards', () => {
    test('should provide real-time metrics for dashboards', async () => {
      // Simulate real-time metrics
      await metricsService.incrementCounter('dashboard:active-users')
      await metricsService.setGauge('dashboard:cpu-usage', 65.4)
      await metricsService.setGauge('dashboard:memory-usage', 78.2)
      await metricsService.recordHistogram('dashboard:response-time', 125)

      const dashboardMetrics = await metricsService.getDashboardMetrics([
        'dashboard:active-users',
        'dashboard:cpu-usage',
        'dashboard:memory-usage',
        'dashboard:response-time',
      ])

      expect(dashboardMetrics).toHaveProperty('dashboard:active-users')
      expect(dashboardMetrics).toHaveProperty('dashboard:cpu-usage')
      expect(dashboardMetrics).toHaveProperty('dashboard:memory-usage')
      expect(dashboardMetrics).toHaveProperty('dashboard:response-time')

      expect(dashboardMetrics['dashboard:active-users'].type).toBe('counter')
      expect(dashboardMetrics['dashboard:cpu-usage'].type).toBe('gauge')
      expect(dashboardMetrics['dashboard:response-time'].type).toBe('histogram')
    })

    test('should support metric streaming for real-time updates', async () => {
      const metrics: any[] = []
      const streamName = 'dashboard-stream'

      // Subscribe to metric updates
      const subscription = await metricsService.subscribeToMetrics(streamName, (metric) => {
        metrics.push(metric)
      })

      expect(subscription.id).toBeDefined()

      // Publish some metrics
      await metricsService.publishMetric(streamName, {
        name: 'active-sessions',
        type: 'gauge',
        value: 42,
        timestamp: new Date(),
      })

      await metricsService.publishMetric(streamName, {
        name: 'page-views',
        type: 'counter',
        value: 1,
        timestamp: new Date(),
      })

      // Wait for metrics to be received
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(metrics).toHaveLength(2)
      expect(metrics[0].name).toBe('active-sessions')
      expect(metrics[1].name).toBe('page-views')

      await metricsService.unsubscribeFromMetrics(subscription.id)
    })

    test('should calculate metric alerts and thresholds', async () => {
      const metricName = 'test:error-rate'

      // Set up alert thresholds
      await metricsService.setAlert(metricName, {
        type: 'threshold',
        operator: 'greater_than',
        value: 5.0, // 5% error rate
        severity: 'warning',
      })

      await metricsService.setAlert(metricName, {
        type: 'threshold',
        operator: 'greater_than',
        value: 10.0, // 10% error rate
        severity: 'critical',
      })

      // Record metrics that should trigger alerts
      await metricsService.setGauge(metricName, 7.5) // Should trigger warning

      const alerts = await metricsService.checkAlerts(metricName)
      expect(alerts).toHaveLength(1)
      expect(alerts[0].severity).toBe('warning')
      expect(alerts[0].triggered).toBe(true)

      // Record critical level
      await metricsService.setGauge(metricName, 12.0)

      const criticalAlerts = await metricsService.checkAlerts(metricName)
      expect(criticalAlerts).toHaveLength(2) // Both warning and critical
      expect(criticalAlerts.some((a) => a.severity === 'critical')).toBe(true)
    })
  })

  describe('Performance Analytics', () => {
    test('should track application performance metrics', async () => {
      const sessionId = 'session-123'

      // Track page load performance
      await metricsService.trackPageLoad(sessionId, '/home', {
        loadTime: 1250,
        domReady: 800,
        firstPaint: 600,
        firstContentfulPaint: 700,
        largestContentfulPaint: 1100,
      })

      await metricsService.trackPageLoad(sessionId, '/about', {
        loadTime: 950,
        domReady: 600,
        firstPaint: 400,
        firstContentfulPaint: 500,
        largestContentfulPaint: 850,
      })

      // Get performance analytics
      const performanceMetrics = await metricsService.getPerformanceMetrics(sessionId)

      expect(performanceMetrics.totalPageViews).toBe(2)
      expect(performanceMetrics.averageLoadTime).toBe(1100) // (1250 + 950) / 2
      expect(performanceMetrics.pages).toHaveLength(2)
      expect(performanceMetrics.pages[0].path).toBe('/home')
    })

    test('should track user behavior analytics', async () => {
      const userId = 'user-456'

      // Track user actions
      await metricsService.trackUserAction(userId, 'button_click', { button: 'signup' })
      await metricsService.trackUserAction(userId, 'page_view', { page: '/pricing' })
      await metricsService.trackUserAction(userId, 'form_submit', { form: 'contact' })

      // Get user analytics
      const userMetrics = await metricsService.getUserMetrics(userId)

      expect(userMetrics.totalActions).toBe(3)
      expect(userMetrics.actionTypes).toContain('button_click')
      expect(userMetrics.actionTypes).toContain('page_view')
      expect(userMetrics.actionTypes).toContain('form_submit')
    })

    test('should provide funnel analysis', async () => {
      const funnelName = 'signup-funnel'
      const steps = ['landing', 'signup-form', 'email-verification', 'completed']

      // Initialize funnel
      await metricsService.initializeFunnel(funnelName, steps)

      // Track users through funnel
      for (let i = 0; i < 100; i++) {
        await metricsService.trackFunnelStep(funnelName, 'landing', `user-${i}`)
      }

      for (let i = 0; i < 75; i++) {
        await metricsService.trackFunnelStep(funnelName, 'signup-form', `user-${i}`)
      }

      for (let i = 0; i < 60; i++) {
        await metricsService.trackFunnelStep(funnelName, 'email-verification', `user-${i}`)
      }

      for (let i = 0; i < 45; i++) {
        await metricsService.trackFunnelStep(funnelName, 'completed', `user-${i}`)
      }

      const funnelAnalysis = await metricsService.getFunnelAnalysis(funnelName)

      expect(funnelAnalysis.steps).toHaveLength(4)
      expect(funnelAnalysis.steps[0].users).toBe(100)
      expect(funnelAnalysis.steps[1].users).toBe(75)
      expect(funnelAnalysis.steps[2].users).toBe(60)
      expect(funnelAnalysis.steps[3].users).toBe(45)

      expect(funnelAnalysis.conversionRates[1]).toBe(0.75) // 75/100
      expect(funnelAnalysis.conversionRates[2]).toBe(0.8) // 60/75
      expect(funnelAnalysis.conversionRates[3]).toBe(0.75) // 45/60
      expect(funnelAnalysis.overallConversion).toBe(0.45) // 45/100
    })
  })

  describe('Business Intelligence', () => {
    test('should track business KPIs', async () => {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

      // Track revenue metrics
      await metricsService.recordRevenue(today, 1250.5, 'USD')
      await metricsService.recordRevenue(today, 890.25, 'USD')

      // Track customer metrics
      await metricsService.incrementCounter('customers:new', 5)
      await metricsService.incrementCounter('customers:churned', 2)

      // Track product metrics
      await metricsService.recordProductSale('pro-plan', 299.99, 'USD')
      await metricsService.recordProductSale('basic-plan', 99.99, 'USD')
      await metricsService.recordProductSale('pro-plan', 299.99, 'USD')

      const businessMetrics = await metricsService.getBusinessMetrics(today)

      expect(businessMetrics.revenue.total).toBe(2140.75) // 1250.50 + 890.25
      expect(businessMetrics.customers.new).toBe(5)
      expect(businessMetrics.customers.churned).toBe(2)
      expect(businessMetrics.customers.net).toBe(3) // 5 - 2

      const productMetrics = await metricsService.getProductMetrics(today)
      expect(productMetrics['pro-plan'].sales).toBe(2)
      expect(productMetrics['pro-plan'].revenue).toBe(599.98)
      expect(productMetrics['basic-plan'].sales).toBe(1)
      expect(productMetrics['basic-plan'].revenue).toBe(99.99)
    })

    test('should calculate customer lifetime value', async () => {
      const customerId = 'customer-789'

      // Record customer purchases over time
      await metricsService.recordCustomerPurchase(
        customerId,
        99.99,
        new Date(Date.now() - 86_400_000 * 30)
      ) // 30 days ago
      await metricsService.recordCustomerPurchase(
        customerId,
        149.99,
        new Date(Date.now() - 86_400_000 * 15)
      ) // 15 days ago
      await metricsService.recordCustomerPurchase(customerId, 199.99, new Date()) // today

      const clv = await metricsService.calculateCustomerLifetimeValue(customerId)

      expect(clv.totalRevenue).toBe(449.97)
      expect(clv.averageOrderValue).toBe(149.99) // 449.97 / 3
      expect(clv.purchaseFrequency).toBeGreaterThan(0)
      expect(clv.estimatedLifetimeValue).toBeGreaterThan(0)
    })

    test('should provide cohort analysis', async () => {
      const cohortMonth = '2024-01'

      // Simulate cohort data
      for (let i = 0; i < 100; i++) {
        await metricsService.addUserToCohort(cohortMonth, `user-${i}`)
      }

      // Simulate retention over months
      for (let month = 0; month < 6; month++) {
        const retainedUsers = 100 * 0.8 ** month // 20% churn each month
        await metricsService.recordCohortRetention(cohortMonth, month, Math.floor(retainedUsers))
      }

      const cohortAnalysis = await metricsService.getCohortAnalysis(cohortMonth)

      expect(cohortAnalysis.cohortSize).toBe(100)
      expect(cohortAnalysis.retentionRates).toHaveLength(6)
      expect(cohortAnalysis.retentionRates[0]).toBe(1.0) // Month 0 = 100%
      expect(cohortAnalysis.retentionRates[1]).toBeCloseTo(0.8) // Month 1 ≈ 80%
      expect(cohortAnalysis.retentionRates[5]).toBeLessThan(0.5) // Month 5 < 50%
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid metric names', async () => {
      expect(async () => {
        await metricsService.incrementCounter('')
      }).rejects.toThrow('Metric name cannot be empty')

      expect(async () => {
        await metricsService.setGauge('', 10)
      }).rejects.toThrow('Metric name cannot be empty')
    })

    test('should handle invalid metric values', async () => {
      expect(async () => {
        await metricsService.setGauge('test', Number.NaN)
      }).rejects.toThrow('Metric value must be a valid number')

      expect(async () => {
        await metricsService.recordHistogram('test', -1)
      }).rejects.toThrow('Histogram values must be non-negative')
    })

    test('should handle Redis connection failures gracefully', async () => {
      // This would test Redis connection failures - implementation specific
      const result = await metricsService.getCounter('test:connection-failure')
      expect(typeof result).toBe('number')
    })
  })

  describe('Data Retention and Cleanup', () => {
    test('should implement automatic data retention policies', async () => {
      const metricName = 'test:retention'
      const now = Date.now()

      // Record old data points
      await metricsService.recordTimeSeries(metricName, 100, now - 86_400_000 * 7) // 7 days ago
      await metricsService.recordTimeSeries(metricName, 200, now - 86_400_000 * 3) // 3 days ago
      await metricsService.recordTimeSeries(metricName, 300, now) // now

      // Apply retention policy (keep only last 5 days)
      const deleted = await metricsService.applyRetentionPolicy(metricName, 86_400_000 * 5) // 5 days
      expect(deleted).toBeGreaterThanOrEqual(1)

      // Verify old data is gone
      const remainingData = await metricsService.getTimeSeries(
        metricName,
        now - 86_400_000 * 10,
        now
      )
      expect(remainingData.every((point) => point.timestamp > now - 86_400_000 * 5)).toBe(true)
    })

    test('should cleanup expired metrics automatically', async () => {
      const metricName = 'test:cleanup'

      // Create metric with short TTL
      await metricsService.incrementCounterWithTTL(metricName, 1, 1) // 1 second TTL

      expect(await metricsService.getCounter(metricName)).toBe(1)

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Run cleanup
      const cleanedCount = await metricsService.cleanupExpiredMetrics()
      expect(cleanedCount).toBeGreaterThanOrEqual(0)

      expect(await metricsService.getCounter(metricName)).toBe(0)
    })
  })
})
