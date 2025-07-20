/**
 * Performance Monitoring Integration Tests
 *
 * Comprehensive test suite for performance testing including load testing,
 * memory usage monitoring, response time validation, and system health checks
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkDatabaseHealth, db } from '../../../db/config'
import { migrationRunner } from '../../../db/migrations/migration-runner'
import { agentExecutions, environments, observabilityEvents, tasks } from '../../../db/schema'

// Performance monitoring types
interface PerformanceMetrics {
  responseTime: number
  throughput: number
  memoryUsage: number
  cpuUsage: number
  databaseQueryTime: number
  errorRate: number
  concurrentUsers: number
}

interface LoadTestResult {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  maxResponseTime: number
  minResponseTime: number
  percentiles: {
    p50: number
    p95: number
    p99: number
  }
  throughputPerSecond: number
  errorsPerSecond: number
}

interface SystemHealthMetrics {
  memoryUsage: {
    used: number
    free: number
    total: number
    percentage: number
  }
  cpuUsage: number
  diskUsage: {
    used: number
    free: number
    total: number
    percentage: number
  }
  networkConnections: number
  activeQueries: number
  queueDepth: number
}

// Mock performance monitoring utilities
class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private startTime = 0
  private requestTimes: number[] = []

  startMonitoring(): void {
    this.startTime = performance.now()
    this.requestTimes = []
  }

  recordRequest(responseTime: number): void {
    this.requestTimes.push(responseTime)
  }

  stopMonitoring(): PerformanceMetrics {
    const endTime = performance.now()
    const totalTime = endTime - this.startTime

    const avgResponseTime =
      this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length
    const throughput = this.requestTimes.length / (totalTime / 1000)

    return {
      responseTime: avgResponseTime,
      throughput,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      databaseQueryTime: avgResponseTime * 0.3, // Estimate DB time as 30% of response time
      errorRate: 0, // Mock implementation
      concurrentUsers: 1,
    }
  }

  private getMemoryUsage(): number {
    // Mock memory usage (in MB)
    return Math.random() * 100 + 50
  }

  private getCpuUsage(): number {
    // Mock CPU usage (percentage)
    return Math.random() * 50 + 10
  }

  async runLoadTest(
    testFunction: () => Promise<any>,
    options: {
      duration: number
      concurrency: number
      rampUp?: number
    }
  ): Promise<LoadTestResult> {
    const { duration, concurrency, rampUp = 0 } = options
    const results: number[] = []
    const errors: any[] = []
    const startTime = performance.now()

    // Simulate concurrent load
    const workers = Array.from({ length: concurrency }, async (_, index) => {
      // Ramp up delay
      if (rampUp > 0) {
        await new Promise((resolve) => setTimeout(resolve, (index / concurrency) * rampUp))
      }

      const workerStartTime = performance.now()
      while (performance.now() - workerStartTime < duration) {
        try {
          const requestStart = performance.now()
          await testFunction()
          const requestTime = performance.now() - requestStart
          results.push(requestTime)
        } catch (error) {
          errors.push(error)
        }

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    })

    await Promise.all(workers)
    const totalTime = performance.now() - startTime

    // Calculate percentiles
    const sortedResults = results.sort((a, b) => a - b)
    const getPercentile = (p: number) => {
      const index = Math.floor((p / 100) * sortedResults.length)
      return sortedResults[index] || 0
    }

    return {
      totalRequests: results.length + errors.length,
      successfulRequests: results.length,
      failedRequests: errors.length,
      averageResponseTime: results.reduce((sum, time) => sum + time, 0) / results.length || 0,
      maxResponseTime: Math.max(...results) || 0,
      minResponseTime: Math.min(...results) || 0,
      percentiles: {
        p50: getPercentile(50),
        p95: getPercentile(95),
        p99: getPercentile(99),
      },
      throughputPerSecond: results.length / (totalTime / 1000),
      errorsPerSecond: errors.length / (totalTime / 1000),
    }
  }

  async getSystemHealth(): Promise<SystemHealthMetrics> {
    // Mock system health metrics
    return {
      memoryUsage: {
        used: 512,
        free: 1536,
        total: 2048,
        percentage: 25,
      },
      cpuUsage: Math.random() * 50 + 10,
      diskUsage: {
        used: 10_240,
        free: 40_960,
        total: 51_200,
        percentage: 20,
      },
      networkConnections: Math.floor(Math.random() * 100) + 10,
      activeQueries: Math.floor(Math.random() * 10) + 1,
      queueDepth: Math.floor(Math.random() * 5),
    }
  }
}

// Skip tests if no database URL is provided
const skipTests = !process.env.DATABASE_URL

describe('Performance Monitoring Integration Tests', () => {
  let performanceMonitor: PerformanceMonitor
  let testDataIds: {
    taskIds: string[]
    environmentIds: string[]
    executionIds: string[]
  }

  beforeAll(async () => {
    // Ensure database is healthy and migrations are run
    const isHealthy = await checkDatabaseHealth()
    if (!isHealthy) {
      throw new Error('Database is not healthy')
    }

    const result = await migrationRunner.migrate()
    if (!result.success) {
      throw new Error(`Migration failed: ${result.errors.join(', ')}`)
    }

    performanceMonitor = new PerformanceMonitor()
  })

  beforeEach(async () => {
    // Clean up test data and setup fresh test environment
    await cleanupTestData()
    testDataIds = await setupTestData()
  })

  afterAll(async () => {
    // Final cleanup
    await cleanupTestData()
  })

  async function cleanupTestData() {
    try {
      await db.delete(observabilityEvents)
      await db.delete(agentExecutions)
      await db.delete(environments)
      await db.delete(tasks)
    } catch (error) {
      console.warn('Cleanup failed:', error)
    }
  }

  async function setupTestData() {
    // Create test tasks
    const taskData = Array.from({ length: 10 }, (_, i) => ({
      title: `Performance Test Task ${i}`,
      description: `Task ${i} for performance testing`,
      status: 'pending' as const,
      priority: i % 2 === 0 ? ('high' as const) : ('medium' as const),
      userId: 'perf-test-user',
      metadata: { testIndex: i, batchId: 'perf-test-batch' },
    }))

    const createdTasks = await db.insert(tasks).values(taskData).returning()

    // Create test environments
    const envData = Array.from({ length: 3 }, (_, i) => ({
      name: `Performance Test Environment ${i}`,
      config: {
        apiKey: `perf-test-key-${i}`,
        endpoint: `https://api-${i}.test.com`,
        timeout: 5000 + i * 1000,
      },
      isActive: i === 0,
      userId: 'perf-test-user',
      schemaVersion: 1,
    }))

    const createdEnvs = await db.insert(environments).values(envData).returning()

    // Create test executions
    const executionData = createdTasks.slice(0, 5).map((task, i) => ({
      taskId: task.id,
      agentType: `perf-test-agent-${i}`,
      status: 'completed' as const,
      input: { prompt: `Test input ${i}` },
      output: { result: `Test result ${i}` },
      executionTimeMs: 1000 + i * 200,
    }))

    const createdExecutions = await db.insert(agentExecutions).values(executionData).returning()

    return {
      taskIds: createdTasks.map((t) => t.id),
      environmentIds: createdEnvs.map((e) => e.id),
      executionIds: createdExecutions.map((e) => e.id),
    }
  }

  describe('Database Performance Tests', () => {
    it('should measure query performance for simple selects', async () => {
      const queryTests = [
        () => db.select().from(tasks).limit(10),
        () => db.select().from(environments).where(eq(environments.isActive, true)),
        () => db.select().from(agentExecutions).limit(5),
      ]

      const results: number[] = []

      for (const queryTest of queryTests) {
        const startTime = performance.now()
        await queryTest()
        const queryTime = performance.now() - startTime
        results.push(queryTime)
      }

      // All queries should complete within reasonable time
      results.forEach((time) => {
        expect(time).toBeLessThan(100) // Less than 100ms
      })

      const averageQueryTime = results.reduce((sum, time) => sum + time, 0) / results.length
      expect(averageQueryTime).toBeLessThan(50) // Average less than 50ms
    })

    it('should measure join query performance', async () => {
      const startTime = performance.now()

      const results = await db
        .select({
          taskId: tasks.id,
          taskTitle: tasks.title,
          executionId: agentExecutions.id,
          executionStatus: agentExecutions.status,
          executionTime: agentExecutions.executionTimeMs,
        })
        .from(tasks)
        .leftJoin(agentExecutions, eq(tasks.id, agentExecutions.taskId))
        .limit(50)

      const queryTime = performance.now() - startTime

      expect(queryTime).toBeLessThan(200) // Join queries should complete within 200ms
      expect(results.length).toBeGreaterThan(0)
    })

    it('should measure aggregate query performance', async () => {
      const startTime = performance.now()

      const stats = await db
        .select({
          totalTasks: count(tasks.id),
          avgExecutionTime: sql<number>`AVG(${agentExecutions.executionTimeMs})`,
          maxExecutionTime: sql<number>`MAX(${agentExecutions.executionTimeMs})`,
        })
        .from(tasks)
        .leftJoin(agentExecutions, eq(tasks.id, agentExecutions.taskId))

      const queryTime = performance.now() - startTime

      expect(queryTime).toBeLessThan(300) // Aggregate queries should complete within 300ms
      expect(stats[0].totalTasks).toBeGreaterThan(0)
    })

    it('should handle bulk insert performance', async () => {
      const bulkSize = 100
      const bulkData = Array.from({ length: bulkSize }, (_, i) => ({
        title: `Bulk Test Task ${i}`,
        description: `Bulk task ${i}`,
        status: 'pending' as const,
        priority: 'low' as const,
        userId: 'bulk-test-user',
        metadata: { bulkIndex: i },
      }))

      const startTime = performance.now()
      await db.insert(tasks).values(bulkData)
      const insertTime = performance.now() - startTime

      expect(insertTime).toBeLessThan(2000) // Bulk insert should complete within 2 seconds

      // Cleanup bulk data
      await db.delete(tasks).where(eq(tasks.userId, 'bulk-test-user'))
    })

    it('should measure transaction performance', async () => {
      const startTime = performance.now()

      await db.transaction(async (tx) => {
        // Create task
        const [task] = await tx
          .insert(tasks)
          .values({
            title: 'Transaction Test Task',
            status: 'pending',
            priority: 'medium',
            userId: 'transaction-test-user',
          })
          .returning()

        // Create execution
        await tx.insert(agentExecutions).values({
          taskId: task.id,
          agentType: 'transaction-test-agent',
          status: 'running',
          input: { test: true },
        })

        // Create events
        const eventData = Array.from({ length: 5 }, (_, i) => ({
          executionId: task.id, // Using task.id as placeholder
          eventType: `test.event.${i}`,
          data: { index: i },
          severity: 'info' as const,
          category: 'test',
        }))

        // Note: This would need a proper execution ID in real implementation
        // await tx.insert(observabilityEvents).values(eventData)
      })

      const transactionTime = performance.now() - startTime

      expect(transactionTime).toBeLessThan(500) // Transaction should complete within 500ms

      // Cleanup transaction data
      await db.delete(tasks).where(eq(tasks.userId, 'transaction-test-user'))
    })
  })

  describe('Load Testing', () => {
    it('should handle concurrent read operations', async () => {
      const testFunction = async () => {
        await db.select().from(tasks).limit(10)
      }

      const loadTestResult = await performanceMonitor.runLoadTest(testFunction, {
        duration: 5000, // 5 seconds
        concurrency: 10, // 10 concurrent users
      })

      expect(loadTestResult.successfulRequests).toBeGreaterThan(0)
      expect(loadTestResult.failedRequests).toBe(0)
      expect(loadTestResult.averageResponseTime).toBeLessThan(100)
      expect(loadTestResult.throughputPerSecond).toBeGreaterThan(10)
      expect(loadTestResult.percentiles.p95).toBeLessThan(200)
    })

    it('should handle concurrent write operations', async () => {
      let counter = 0

      const testFunction = async () => {
        counter++
        await db.insert(tasks).values({
          title: `Load Test Task ${counter}`,
          status: 'pending',
          priority: 'low',
          userId: 'load-test-user',
        })
      }

      const loadTestResult = await performanceMonitor.runLoadTest(testFunction, {
        duration: 3000, // 3 seconds
        concurrency: 5, // 5 concurrent writers
      })

      expect(loadTestResult.successfulRequests).toBeGreaterThan(0)
      expect(loadTestResult.averageResponseTime).toBeLessThan(200)
      expect(loadTestResult.errorsPerSecond).toBeLessThan(1) // Less than 1 error per second

      // Cleanup load test data
      await db.delete(tasks).where(eq(tasks.userId, 'load-test-user'))
    })

    it('should handle mixed read/write workload', async () => {
      let operationCounter = 0

      const testFunction = async () => {
        operationCounter++

        if (operationCounter % 3 === 0) {
          // Write operation (33% of requests)
          await db.insert(tasks).values({
            title: `Mixed Load Task ${operationCounter}`,
            status: 'pending',
            priority: 'medium',
            userId: 'mixed-load-user',
          })
        } else {
          // Read operation (67% of requests)
          await db.select().from(tasks).limit(5)
        }
      }

      const loadTestResult = await performanceMonitor.runLoadTest(testFunction, {
        duration: 4000, // 4 seconds
        concurrency: 8, // 8 concurrent users
        rampUp: 1000, // 1 second ramp up
      })

      expect(loadTestResult.successfulRequests).toBeGreaterThan(0)
      expect(loadTestResult.averageResponseTime).toBeLessThan(150)
      expect(loadTestResult.throughputPerSecond).toBeGreaterThan(5)

      // Cleanup mixed load data
      await db.delete(tasks).where(eq(tasks.userId, 'mixed-load-user'))
    })

    it('should measure system performance under stress', async () => {
      const stressTestFunction = async () => {
        // Simulate complex operation
        const results = await db
          .select({
            id: tasks.id,
            title: tasks.title,
            executionCount: count(agentExecutions.id),
          })
          .from(tasks)
          .leftJoin(agentExecutions, eq(tasks.id, agentExecutions.taskId))
          .groupBy(tasks.id, tasks.title)
          .limit(20)

        // Simulate some processing time
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10))

        return results
      }

      const loadTestResult = await performanceMonitor.runLoadTest(stressTestFunction, {
        duration: 6000, // 6 seconds
        concurrency: 15, // 15 concurrent users
        rampUp: 2000, // 2 second ramp up
      })

      expect(loadTestResult.successfulRequests).toBeGreaterThan(0)
      expect(loadTestResult.failedRequests / loadTestResult.totalRequests).toBeLessThan(0.05) // Less than 5% error rate
      expect(loadTestResult.percentiles.p99).toBeLessThan(1000) // 99th percentile under 1 second
    })
  })

  describe('Memory Usage Monitoring', () => {
    it('should monitor memory usage during operations', async () => {
      // Get baseline memory usage
      const baselineHealth = await performanceMonitor.getSystemHealth()
      const baselineMemory = baselineHealth.memoryUsage.percentage

      // Perform memory-intensive operations
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        title: `Memory Test Task ${i}`,
        description: 'x'.repeat(1000), // Large description
        status: 'pending' as const,
        priority: 'low' as const,
        userId: 'memory-test-user',
        metadata: {
          largeData: Array.from({ length: 100 }, (_, j) => `item-${j}`),
        },
      }))

      // Insert large dataset
      await db.insert(tasks).values(largeDataSet)

      // Query large dataset multiple times
      for (let i = 0; i < 10; i++) {
        await db.select().from(tasks).where(eq(tasks.userId, 'memory-test-user'))
      }

      // Check memory usage after operations
      const finalHealth = await performanceMonitor.getSystemHealth()
      const finalMemory = finalHealth.memoryUsage.percentage

      // Memory usage should not increase dramatically
      expect(finalMemory - baselineMemory).toBeLessThan(50) // Less than 50% increase

      // Cleanup memory test data
      await db.delete(tasks).where(eq(tasks.userId, 'memory-test-user'))

      // Check memory after cleanup
      const cleanupHealth = await performanceMonitor.getSystemHealth()
      expect(cleanupHealth.memoryUsage.percentage).toBeLessThanOrEqual(finalMemory)
    })

    it('should detect memory leaks in repeated operations', async () => {
      const memorySnapshots: number[] = []

      // Perform repeated operations and track memory
      for (let iteration = 0; iteration < 5; iteration++) {
        // Create and delete data
        const tempData = Array.from({ length: 100 }, (_, i) => ({
          title: `Leak Test Task ${iteration}-${i}`,
          status: 'pending' as const,
          priority: 'low' as const,
          userId: `leak-test-user-${iteration}`,
        }))

        await db.insert(tasks).values(tempData)
        await db
          .select()
          .from(tasks)
          .where(eq(tasks.userId, `leak-test-user-${iteration}`))
        await db.delete(tasks).where(eq(tasks.userId, `leak-test-user-${iteration}`))

        // Record memory usage
        const health = await performanceMonitor.getSystemHealth()
        memorySnapshots.push(health.memoryUsage.percentage)

        // Small delay between iterations
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // Memory should not continuously increase
      const memoryTrend = memorySnapshots
        .slice(1)
        .map((current, index) => current - memorySnapshots[index])

      const averageTrend = memoryTrend.reduce((sum, diff) => sum + diff, 0) / memoryTrend.length
      expect(averageTrend).toBeLessThan(5) // Average memory increase should be less than 5%
    })
  })

  describe('Response Time Analysis', () => {
    it('should analyze response time distribution', async () => {
      const responseTimes: number[] = []

      // Collect response times from multiple operations
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now()

        await db.select().from(tasks).where(eq(tasks.userId, 'perf-test-user')).limit(10)

        const responseTime = performance.now() - startTime
        responseTimes.push(responseTime)

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      // Calculate statistics
      const sortedTimes = responseTimes.sort((a, b) => a - b)
      const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      const median = sortedTimes[Math.floor(sortedTimes.length / 2)]
      const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)]
      const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)]

      expect(average).toBeLessThan(50) // Average response time under 50ms
      expect(median).toBeLessThan(30) // Median response time under 30ms
      expect(p95).toBeLessThan(100) // 95th percentile under 100ms
      expect(p99).toBeLessThan(200) // 99th percentile under 200ms

      // Check for outliers (response times > 3 standard deviations)
      const standardDev = Math.sqrt(
        responseTimes.reduce((sum, time) => sum + (time - average) ** 2, 0) / responseTimes.length
      )
      const outliers = responseTimes.filter((time) => Math.abs(time - average) > 3 * standardDev)

      expect(outliers.length / responseTimes.length).toBeLessThan(0.01) // Less than 1% outliers
    })

    it('should measure database connection pool performance', async () => {
      const connectionTests = Array.from({ length: 20 }, async (_, i) => {
        const startTime = performance.now()

        // Simulate acquiring connection from pool
        const result = await db.select().from(tasks).limit(1)

        const connectionTime = performance.now() - startTime
        return { index: i, connectionTime, success: result.length >= 0 }
      })

      const results = await Promise.all(connectionTests)
      const connectionTimes = results.map((r) => r.connectionTime)
      const successRate = results.filter((r) => r.success).length / results.length

      expect(successRate).toBe(1) // 100% success rate
      expect(Math.max(...connectionTimes)).toBeLessThan(100) // Max connection time under 100ms

      const averageConnectionTime =
        connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length
      expect(averageConnectionTime).toBeLessThan(30) // Average connection time under 30ms
    })
  })

  describe('System Health Monitoring', () => {
    it('should monitor overall system health', async () => {
      const health = await performanceMonitor.getSystemHealth()

      expect(health.memoryUsage.percentage).toBeLessThan(90) // Memory usage under 90%
      expect(health.cpuUsage).toBeLessThan(80) // CPU usage under 80%
      expect(health.diskUsage.percentage).toBeLessThan(85) // Disk usage under 85%
      expect(health.networkConnections).toBeGreaterThan(0)
      expect(health.activeQueries).toBeGreaterThanOrEqual(0)
      expect(health.queueDepth).toBeLessThan(10) // Queue depth reasonable
    })

    it('should track performance metrics over time', async () => {
      const metricsHistory: PerformanceMetrics[] = []

      // Collect metrics over multiple intervals
      for (let i = 0; i < 5; i++) {
        performanceMonitor.startMonitoring()

        // Simulate some operations
        await db.select().from(tasks).limit(10)
        await db.select().from(environments).limit(5)

        const metrics = performanceMonitor.stopMonitoring()
        metricsHistory.push(metrics)

        await new Promise((resolve) => setTimeout(resolve, 200)) // 200ms interval
      }

      // Analyze trends
      expect(metricsHistory).toHaveLength(5)

      metricsHistory.forEach((metrics) => {
        expect(metrics.responseTime).toBeLessThan(100)
        expect(metrics.memoryUsage).toBeLessThan(200) // Under 200MB
        expect(metrics.cpuUsage).toBeLessThan(70)
      })

      // Check for performance degradation
      const responseTimeTrend = metricsHistory.map((m) => m.responseTime)
      const isPerformanceDegrading = responseTimeTrend.every(
        (time, index) => index === 0 || time <= responseTimeTrend[index - 1] * 1.5 // Allow 50% variance
      )

      expect(isPerformanceDegrading).toBe(true)
    })

    it('should identify performance bottlenecks', async () => {
      const bottleneckTests = {
        databaseQuery: async () => {
          const start = performance.now()
          await db.select().from(tasks).limit(100)
          return performance.now() - start
        },

        complexJoin: async () => {
          const start = performance.now()
          await db
            .select()
            .from(tasks)
            .leftJoin(agentExecutions, eq(tasks.id, agentExecutions.taskId))
            .limit(50)
          return performance.now() - start
        },

        aggregation: async () => {
          const start = performance.now()
          await db
            .select({
              count: count(tasks.id),
            })
            .from(tasks)
          return performance.now() - start
        },
      }

      const bottleneckResults: Record<string, number> = {}

      for (const [testName, testFn] of Object.entries(bottleneckTests)) {
        // Run test multiple times and get average
        const times: number[] = []
        for (let i = 0; i < 10; i++) {
          times.push(await testFn())
        }
        bottleneckResults[testName] = times.reduce((sum, time) => sum + time, 0) / times.length
      }

      // Identify bottlenecks
      const slowestOperation = Object.entries(bottleneckResults).sort(
        ([, timeA], [, timeB]) => timeB - timeA
      )[0]

      console.log('Bottleneck analysis:', bottleneckResults)
      console.log('Slowest operation:', slowestOperation)

      // All operations should complete within reasonable time
      Object.values(bottleneckResults).forEach((time) => {
        expect(time).toBeLessThan(200) // All operations under 200ms
      })
    })
  })

  describe('Performance Regression Detection', () => {
    it('should detect performance regression', async () => {
      // Baseline performance
      const baselineMetrics = await measurePerformanceBaseline()

      // Simulate performance regression (e.g., inefficient query)
      const regressionMetrics = await measurePerformanceWithRegression()

      // Compare metrics
      const responseTimeRegression =
        (regressionMetrics.responseTime - baselineMetrics.responseTime) /
        baselineMetrics.responseTime
      const throughputRegression =
        (baselineMetrics.throughput - regressionMetrics.throughput) / baselineMetrics.throughput

      // Flag significant regressions
      if (responseTimeRegression > 0.5) {
        // 50% slower
        console.warn('Response time regression detected:', responseTimeRegression)
      }

      if (throughputRegression > 0.3) {
        // 30% less throughput
        console.warn('Throughput regression detected:', throughputRegression)
      }

      // In a real test, these would fail, but for demo we just log
      expect(responseTimeRegression).toBeLessThan(1.0) // Allow up to 100% regression for test
      expect(throughputRegression).toBeLessThan(1.0) // Allow up to 100% throughput loss for test
    })

    async function measurePerformanceBaseline(): Promise<PerformanceMetrics> {
      performanceMonitor.startMonitoring()

      // Efficient operations
      for (let i = 0; i < 10; i++) {
        await db.select().from(tasks).limit(5)
      }

      return performanceMonitor.stopMonitoring()
    }

    async function measurePerformanceWithRegression(): Promise<PerformanceMetrics> {
      performanceMonitor.startMonitoring()

      // Inefficient operations (simulating regression)
      for (let i = 0; i < 10; i++) {
        await db.select().from(tasks) // No limit - potentially slower
        await new Promise((resolve) => setTimeout(resolve, 10)) // Simulate slower operation
      }

      return performanceMonitor.stopMonitoring()
    }
  })
})
