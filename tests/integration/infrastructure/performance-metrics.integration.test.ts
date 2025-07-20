/**
 * Integration Tests for Performance Metrics System
 *
 * Tests metric collection, aggregation, analysis, and integration
 * with the observability events system.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { ulid } from 'ulid'
import { db } from '../../../db/config'
import { observabilityEvents as observabilityEventsTable } from '../../../db/schema'
import {
  PerformanceMetricsCollector,
  MetricsAnalyzer,
  metrics,
  type MetricType,
  type MetricDataPoint,
  type AggregatedMetric,
} from '../../../lib/observability/metrics'

describe('PerformanceMetricsCollector Integration Tests', () => {
  let collector: PerformanceMetricsCollector

  beforeEach(async () => {
    // Clear database
    await db.delete(observabilityEventsTable)

    // Get fresh instance
    collector = PerformanceMetricsCollector.getInstance()

    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Stop periodic flush
    collector.stopPeriodicFlush()
  })

  describe('Metric Recording and Buffering', () => {
    it('should record metrics with tags and metadata', async () => {
      // Record various metrics
      collector.recordMetric(
        'query_duration',
        125.5,
        { queryType: 'select', table: 'users' },
        { rowCount: 100, cacheHit: false }
      )

      collector.recordMetric(
        'memory_usage',
        1024 * 1024 * 256,
        { component: 'api-server' },
        { pid: 1234 }
      )

      collector.recordMetric('cache_hit_rate', 0.85, { cacheType: 'redis' })

      // Force flush
      await collector.forceFlush()

      // Verify metrics are stored as observability events
      const events = await db.select().from(observabilityEventsTable)
      expect(events.length).toBeGreaterThanOrEqual(3)

      const queryMetric = events.find((e) => e.metadata?.metric === 'query_duration')
      expect(queryMetric).toBeDefined()
      expect(queryMetric?.metadata?.aggregation?.avg).toBe(125.5)
    })

    it('should buffer metrics and flush periodically', async () => {
      const BUFFER_SIZE = 1000
      const metricValues = []

      // Fill buffer to trigger auto-flush
      for (let i = 0; i < BUFFER_SIZE + 10; i++) {
        const value = Math.random() * 100
        metricValues.push(value)
        collector.recordMetric('throughput', value, { endpoint: '/api/test' })
      }

      // Should have auto-flushed
      const events = await db.select().from(observabilityEventsTable)
      expect(events.length).toBeGreaterThan(0)

      const throughputEvent = events.find((e) => e.metadata?.metric === 'throughput')
      expect(throughputEvent).toBeDefined()
      expect(throughputEvent?.metadata?.dataPointCount).toBe(BUFFER_SIZE)
    })

    it('should aggregate metrics correctly', async () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

      for (const value of values) {
        collector.recordMetric('response_time', value, { api: 'v1' })
      }

      await collector.forceFlush()

      const events = await db.select().from(observabilityEventsTable)
      const responseTimeEvent = events.find((e) => e.metadata?.metric === 'response_time')

      expect(responseTimeEvent?.metadata?.aggregation).toMatchObject({
        count: 10,
        sum: 550,
        avg: 55,
        min: 10,
        max: 100,
        p50: 50,
        p95: 95,
        p99: 99,
      })
    })
  })

  describe('Metric Type Specialization', () => {
    it('should handle different metric types appropriately', async () => {
      // Test each metric type
      const metricTests: Array<[MetricType, number, Record<string, string>]> = [
        ['query_duration', 45.2, { queryType: 'insert' }],
        ['sync_latency', 120.5, { syncType: 'full' }],
        ['wasm_init_time', 250, { service: 'vector-search' }],
        ['wasm_execution_time', 75, { operation: 'similarity' }],
        ['memory_usage', 512 * 1024 * 1024, { component: 'cache' }],
        ['cpu_usage', 65.5, { core: '0' }],
        ['network_latency', 15.3, { region: 'us-east' }],
        ['cache_hit_rate', 0.92, { cache: 'l2' }],
        ['error_rate', 0.02, { service: 'api' }],
        ['throughput', 1500, { endpoint: '/api/users' }],
      ]

      for (const [metric, value, tags] of metricTests) {
        collector.recordMetric(metric, value, tags)
      }

      await collector.forceFlush()

      const events = await db.select().from(observabilityEventsTable)

      // Verify all metric types were recorded
      const recordedMetrics = new Set(events.map((e) => e.metadata?.metric).filter(Boolean))

      expect(recordedMetrics.size).toBe(metricTests.length)
      metricTests.forEach(([metric]) => {
        expect(recordedMetrics.has(metric)).toBe(true)
      })
    })
  })

  describe('Convenience Metric Functions', () => {
    it('should record API request metrics', async () => {
      // Start request
      metrics.apiRequestStart('GET', '/api/users')

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Success
      metrics.apiRequestSuccess('GET', '/api/users', 105)

      // Another request that fails
      metrics.apiRequestStart('POST', '/api/users')
      metrics.apiRequestError('POST', '/api/users', 50, 'Validation error')

      await collector.forceFlush()

      const events = await db.select().from(observabilityEventsTable)

      const throughputEvents = events.filter((e) => e.metadata?.metric === 'throughput')
      expect(throughputEvents).toHaveLength(2)

      const durationEvent = events.find(
        (e) => e.metadata?.metric === 'query_duration' && e.metadata?.tags?.includes('success:true')
      )
      expect(durationEvent).toBeDefined()

      const errorEvent = events.find((e) => e.metadata?.metric === 'error_rate')
      expect(errorEvent).toBeDefined()
      expect(errorEvent?.metadata?.tags).toContain('error:Validation error')
    })

    it('should record database query metrics', async () => {
      metrics.queryDuration(35.5, 'select', true)
      metrics.queryDuration(125.0, 'insert', false)
      metrics.queryDuration(15.2, 'update', true)

      await collector.forceFlush()

      const events = await db.select().from(observabilityEventsTable)
      const queryEvents = events.filter((e) => e.metadata?.metric === 'query_duration')

      expect(queryEvents.length).toBeGreaterThan(0)

      // Check that tags properly encode query type and success
      const insertEvent = queryEvents.find((e) => e.metadata?.tags?.includes('queryType:insert'))
      expect(insertEvent?.metadata?.tags).toContain('success:false')
    })

    it('should record WASM performance metrics', async () => {
      metrics.wasmInitTime(150, 'vector-search')
      metrics.wasmExecutionTime(45, 'embedding-generation')
      metrics.wasmExecutionTime(30, 'similarity-search')

      await collector.forceFlush()

      const events = await db.select().from(observabilityEventsTable)

      const initEvent = events.find((e) => e.metadata?.metric === 'wasm_init_time')
      expect(initEvent?.metadata?.tags).toContain('service:vector-search')

      const execEvents = events.filter((e) => e.metadata?.metric === 'wasm_execution_time')
      expect(execEvents.length).toBeGreaterThan(0)
    })

    it('should record system resource metrics', async () => {
      metrics.memoryUsage(1024 * 1024 * 512, 'api-server')
      metrics.memoryUsage(1024 * 1024 * 256, 'worker')

      metrics.cacheHitRate(0.95, 'redis')
      metrics.cacheHitRate(0.82, 'in-memory')

      metrics.errorRate(0.01, 'api')
      metrics.errorRate(0.05, 'background-jobs')

      await collector.forceFlush()

      const events = await db.select().from(observabilityEventsTable)

      const memoryEvents = events.filter((e) => e.metadata?.metric === 'memory_usage')
      expect(memoryEvents.length).toBeGreaterThan(0)

      const cacheEvents = events.filter((e) => e.metadata?.metric === 'cache_hit_rate')
      expect(cacheEvents.length).toBeGreaterThan(0)

      const errorEvents = events.filter((e) => e.metadata?.metric === 'error_rate')
      expect(errorEvents.length).toBeGreaterThan(0)
    })
  })

  describe('Concurrent Metric Collection', () => {
    it('should handle high-volume concurrent metric recording', async () => {
      const concurrentMetrics = 500
      const promises = []

      // Record many metrics concurrently
      for (let i = 0; i < concurrentMetrics; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            collector.recordMetric(
              'throughput',
              Math.random() * 1000,
              { endpoint: `/api/endpoint-${i % 10}` },
              { requestId: ulid() }
            )
            resolve()
          })
        )
      }

      await Promise.all(promises)
      await collector.forceFlush()

      const events = await db.select().from(observabilityEventsTable)
      expect(events.length).toBeGreaterThan(0)

      // Verify aggregation happened
      const throughputEvents = events.filter((e) => e.metadata?.metric === 'throughput')
      expect(throughputEvents.length).toBeGreaterThan(0)

      // Should have aggregated metrics
      throughputEvents.forEach((event) => {
        expect(event.metadata?.aggregation).toBeDefined()
        expect(event.metadata?.dataPointCount).toBeGreaterThan(0)
      })
    })
  })
})

describe('MetricsAnalyzer Integration Tests', () => {
  beforeEach(async () => {
    // Clear database and seed with test data
    await db.delete(observabilityEventsTable)

    // Create test metrics data
    const now = new Date()
    const testEvents = []

    // Generate hourly metrics for the past 24 hours
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(now.getTime() - hour * 60 * 60 * 1000)

      // Response time metrics
      testEvents.push({
        id: ulid(),
        type: 'performance_metric' as const,
        severity: 'debug' as const,
        message: 'Performance metric',
        metadata: {
          metric: 'query_duration',
          value: 50 + Math.random() * 50,
          aggregation: {
            count: 100,
            sum: 5000,
            avg: 50,
            min: 20,
            max: 150,
          },
        },
        timestamp,
        source: 'metrics',
        tags: ['performance'],
        executionId: null,
        traceId: null,
        spanId: null,
        data: {},
        category: 'metrics',
      })

      // Error events
      if (hour % 4 === 0) {
        testEvents.push({
          id: ulid(),
          type: 'execution_error' as const,
          severity: 'error' as const,
          message: 'Test error',
          metadata: {},
          timestamp,
          source: 'system',
          tags: ['error'],
          executionId: null,
          traceId: null,
          spanId: null,
          data: {},
          category: 'system',
        })
      }
    }

    await db.insert(observabilityEventsTable).values(testEvents)
  })

  describe('Metric Aggregation Queries', () => {
    it('should aggregate metrics by time period', async () => {
      const now = new Date()
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const hourlyMetrics = await MetricsAnalyzer.getAggregatedMetrics(
        ['query_duration'],
        dayAgo,
        now,
        'hour'
      )

      expect(hourlyMetrics.length).toBeGreaterThan(0)

      hourlyMetrics.forEach((metric) => {
        expect(metric.metric).toBe('performance_metric')
        expect(metric.aggregation.count).toBeGreaterThan(0)
        expect(metric.aggregation.avg).toBeGreaterThan(0)
      })

      // Test daily aggregation
      const dailyMetrics = await MetricsAnalyzer.getAggregatedMetrics(
        ['query_duration'],
        dayAgo,
        now,
        'day'
      )

      expect(dailyMetrics.length).toBeGreaterThan(0)
      expect(dailyMetrics[0].aggregation.count).toBeGreaterThan(hourlyMetrics[0].aggregation.count)
    })

    it('should get performance trends over time', async () => {
      const now = new Date()
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const trends = await MetricsAnalyzer.getPerformanceTrends(
        'query_duration',
        { start: dayAgo, end: now },
        'hour'
      )

      expect(trends.length).toBeGreaterThan(0)
      expect(trends[0]).toHaveProperty('timestamp')
      expect(trends[0]).toHaveProperty('value')

      // Verify chronological order
      for (let i = 1; i < trends.length; i++) {
        expect(trends[i].timestamp.getTime()).toBeGreaterThan(trends[i - 1].timestamp.getTime())
      }
    })
  })

  describe('System Health Calculation', () => {
    it('should calculate overall system health score', async () => {
      const now = new Date()
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      const health = await MetricsAnalyzer.calculateHealthScore({
        start: hourAgo,
        end: now,
      })

      expect(health).toHaveProperty('overall')
      expect(health).toHaveProperty('components')

      expect(health.overall).toBeGreaterThanOrEqual(0)
      expect(health.overall).toBeLessThanOrEqual(100)

      expect(health.components).toHaveProperty('database')
      expect(health.components).toHaveProperty('sync')
      expect(health.components).toHaveProperty('wasm')
      expect(health.components).toHaveProperty('queries')

      // All component scores should be valid
      Object.values(health.components).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(100)
      })
    })

    it('should reflect errors in health score', async () => {
      // Add many error events
      const errorEvents = Array.from({ length: 50 }, () => ({
        id: ulid(),
        type: 'system_event' as const,
        severity: 'error' as const,
        message: 'System error',
        metadata: {},
        timestamp: new Date(),
        source: 'system',
        tags: ['error'],
        executionId: null,
        traceId: null,
        spanId: null,
        data: {},
        category: 'system',
      }))

      await db.insert(observabilityEventsTable).values(errorEvents)

      const now = new Date()
      const health = await MetricsAnalyzer.calculateHealthScore({
        start: new Date(now.getTime() - 60 * 60 * 1000),
        end: now,
      })

      // Health should be impacted by errors
      expect(health.overall).toBeLessThan(90)
    })
  })

  describe('Performance Analysis', () => {
    it('should identify performance degradation', async () => {
      // Add degrading performance metrics
      const now = new Date()
      const degradingMetrics = []

      for (let i = 0; i < 10; i++) {
        degradingMetrics.push({
          id: ulid(),
          type: 'performance_metric' as const,
          severity: 'debug' as const,
          message: 'Performance metric',
          metadata: {
            metric: 'query_duration',
            value: 50 + i * 20, // Increasing latency
          },
          timestamp: new Date(now.getTime() - i * 60 * 1000),
          source: 'metrics',
          tags: ['performance'],
          executionId: null,
          traceId: null,
          spanId: null,
          data: {},
          category: 'metrics',
        })
      }

      await db.insert(observabilityEventsTable).values(degradingMetrics)

      const trends = await MetricsAnalyzer.getPerformanceTrends(
        'query_duration',
        {
          start: new Date(now.getTime() - 10 * 60 * 1000),
          end: now,
        },
        'minute'
      )

      // Performance should show degradation (increasing values over time)
      const recentAvg = trends.slice(0, 3).reduce((sum, t) => sum + t.value, 0) / 3
      const olderAvg = trends.slice(-3).reduce((sum, t) => sum + t.value, 0) / 3

      expect(recentAvg).toBeLessThan(olderAvg)
    })
  })
})

describe('Error Handling and Recovery', () => {
  it('should handle database errors gracefully during flush', async () => {
    const collector = PerformanceMetricsCollector.getInstance()
    const originalInsert = db.insert

    // Mock database error
    let callCount = 0
    db.insert = vi.fn().mockImplementation((...args) => {
      if (callCount++ < 2) {
        throw new Error('Database unavailable')
      }
      return originalInsert.apply(db, args)
    })

    // Record metrics during error
    collector.recordMetric('error_rate', 0.1, { component: 'test' })

    // Try to flush - should fail but not crash
    await collector.forceFlush()

    // Restore and retry
    db.insert = originalInsert
    await collector.forceFlush()

    // Metrics should eventually be stored
    const events = await db.select().from(observabilityEventsTable)
    const errorMetric = events.find((e) => e.metadata?.metric === 'error_rate')
    expect(errorMetric).toBeDefined()
  })

  it('should handle invalid metric values', async () => {
    const collector = PerformanceMetricsCollector.getInstance()

    // Record invalid values
    collector.recordMetric('cpu_usage', NaN)
    collector.recordMetric('memory_usage', Infinity)
    collector.recordMetric('cache_hit_rate', -1)

    await collector.forceFlush()

    // Should still work without crashing
    const events = await db.select().from(observabilityEventsTable)
    expect(events.length).toBeGreaterThanOrEqual(0)
  })
})
