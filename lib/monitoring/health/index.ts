/**
 * Health Check System
 *
 * Provides health check endpoints and monitoring for external systems
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { sql } from 'drizzle-orm'
import { db } from '@/db/config'
import { observability } from '@/lib/observability'
import { queryPerformanceMonitor } from '@/lib/performance/query-performance-monitor'
import { metrics } from '../prometheus'

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  details?: Record<string, any>
  responseTime?: number
}

export interface HealthCheck {
  name: string
  type: 'database' | 'api' | 'service' | 'custom'
  interval: number
  timeout: number
  check: () => Promise<HealthCheckResult>
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: Date
  checks: {
    name: string
    status: HealthCheckResult['status']
    message?: string
    responseTime?: number
    lastChecked: Date
  }[]
  uptime: number
  version: string
}

// Built-in health checks
const builtInChecks: HealthCheck[] = [
  {
    name: 'database',
    type: 'database',
    interval: 30_000, // 30 seconds
    timeout: 5000, // 5 seconds
    check: async () => {
      const start = Date.now()
      try {
        // Simple query to check database connectivity
        const result = await db.execute(sql`SELECT 1 as health_check`)
        const responseTime = Date.now() - start

        if (responseTime > 1000) {
          return {
            status: 'degraded',
            message: 'Database response time is high',
            details: { responseTime },
            responseTime,
          }
        }

        return {
          status: 'healthy',
          message: 'Database is responsive',
          responseTime,
        }
      } catch (error) {
        return {
          status: 'unhealthy',
          message: 'Database connection failed',
          details: { error: (error as Error).message },
          responseTime: Date.now() - start,
        }
      }
    },
  },
  {
    name: 'memory',
    type: 'service',
    interval: 60_000, // 1 minute
    timeout: 1000,
    check: async () => {
      const memoryUsage = process.memoryUsage()
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024
      const rssMB = memoryUsage.rss / 1024 / 1024

      if (rssMB > 4096) {
        // 4GB
        return {
          status: 'unhealthy',
          message: 'Memory usage is critically high',
          details: {
            heapUsedMB: Math.round(heapUsedMB),
            heapTotalMB: Math.round(heapTotalMB),
            rssMB: Math.round(rssMB),
          },
        }
      }

      if (rssMB > 2048) {
        // 2GB
        return {
          status: 'degraded',
          message: 'Memory usage is high',
          details: {
            heapUsedMB: Math.round(heapUsedMB),
            heapTotalMB: Math.round(heapTotalMB),
            rssMB: Math.round(rssMB),
          },
        }
      }

      return {
        status: 'healthy',
        message: 'Memory usage is normal',
        details: {
          heapUsedMB: Math.round(heapUsedMB),
          heapTotalMB: Math.round(heapTotalMB),
          rssMB: Math.round(rssMB),
        },
      }
    },
  },
  {
    name: 'disk_space',
    type: 'service',
    interval: 300_000, // 5 minutes
    timeout: 5000,
    check: async () => {
      try {
        // Get disk usage (simplified - in production use proper disk monitoring)
        const { execSync } = await import('child_process')
        const output = execSync('df -h /').toString()
        const lines = output.trim().split('\n')
        const diskInfo = lines[1].split(/\s+/)
        const usagePercent = Number.parseInt(diskInfo[4].replace('%', ''))

        if (usagePercent > 90) {
          return {
            status: 'unhealthy',
            message: 'Disk space is critically low',
            details: { usagePercent },
          }
        }

        if (usagePercent > 80) {
          return {
            status: 'degraded',
            message: 'Disk space is running low',
            details: { usagePercent },
          }
        }

        return {
          status: 'healthy',
          message: 'Disk space is adequate',
          details: { usagePercent },
        }
      } catch (error) {
        return {
          status: 'unhealthy',
          message: 'Failed to check disk space',
          details: { error: (error as Error).message },
        }
      }
    },
  },
  {
    name: 'query_performance',
    type: 'database',
    interval: 60_000, // 1 minute
    timeout: 5000,
    check: async () => {
      const perfMetrics = queryPerformanceMonitor.getCurrentMetrics()

      if (perfMetrics.errorRate > 10) {
        return {
          status: 'unhealthy',
          message: 'Database query error rate is high',
          details: {
            errorRate: perfMetrics.errorRate,
            averageExecutionTime: perfMetrics.averageExecutionTime,
          },
        }
      }

      if (perfMetrics.averageExecutionTime > 1000) {
        return {
          status: 'degraded',
          message: 'Database queries are slow',
          details: {
            averageExecutionTime: perfMetrics.averageExecutionTime,
            slowQueries: perfMetrics.slowQueries,
          },
        }
      }

      return {
        status: 'healthy',
        message: 'Query performance is normal',
        details: {
          averageExecutionTime: perfMetrics.averageExecutionTime,
          totalQueries: perfMetrics.totalQueries,
        },
      }
    },
  },
  {
    name: 'observability',
    type: 'service',
    interval: 120_000, // 2 minutes
    timeout: 5000,
    check: async () => {
      const health = observability.getHealthStatus()

      if (!health.isHealthy) {
        return {
          status: 'degraded',
          message: 'Observability system is experiencing issues',
          details: {
            errorRate: health.recentErrorRate,
            avgResponseTime: health.averageResponseTime,
          },
        }
      }

      return {
        status: 'healthy',
        message: 'Observability system is functioning normally',
        details: {
          errorRate: health.recentErrorRate,
          avgResponseTime: health.averageResponseTime,
        },
      }
    },
  },
]

// Health check manager
class HealthCheckManager {
  private checks: Map<string, HealthCheck> = new Map()
  private results: Map<string, { result: HealthCheckResult; lastChecked: Date }> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private server: any = null
  private startTime = Date.now()

  async initialize(config: any): Promise<void> {
    // Add built-in checks
    for (const check of builtInChecks) {
      this.addCheck(check)
    }

    // Add custom checks from config
    for (const check of config.checks || []) {
      this.addCheck(check)
    }

    // Start health check server
    if (config.enabled) {
      this.startServer(config.path || '/health')
    }

    console.log(`🏥 Health check system initialized with ${this.checks.size} checks`)
  }

  addCheck(check: HealthCheck): void {
    this.checks.set(check.name, check)

    // Run initial check
    this.runCheck(check.name)

    // Schedule periodic checks
    const interval = setInterval(() => {
      this.runCheck(check.name)
    }, check.interval)

    this.intervals.set(check.name, interval)
  }

  removeCheck(name: string): void {
    this.checks.delete(name)

    const interval = this.intervals.get(name)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(name)
    }

    this.results.delete(name)
  }

  private async runCheck(name: string): Promise<void> {
    const check = this.checks.get(name)
    if (!check) return

    try {
      const start = Date.now()
      const timeoutPromise = new Promise<HealthCheckResult>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), check.timeout)
      })

      const result = await Promise.race([check.check(), timeoutPromise])

      result.responseTime = Date.now() - start

      this.results.set(name, {
        result,
        lastChecked: new Date(),
      })

      // Record metrics
      const statusValue = result.status === 'healthy' ? 1 : result.status === 'degraded' ? 0.5 : 0
      metrics.memoryUsageBytes.set({ type: `health_${name}` }, statusValue)

      // Log if status changed
      const previousResult = this.results.get(name)
      if (previousResult && previousResult.result.status !== result.status) {
        console.log(`Health check ${name}: ${previousResult.result.status} → ${result.status}`)
        observability.recordEvent('health.status_changed', {
          check: name,
          from: previousResult.result.status,
          to: result.status,
          message: result.message,
        })
      }
    } catch (error) {
      this.results.set(name, {
        result: {
          status: 'unhealthy',
          message: (error as Error).message,
        },
        lastChecked: new Date(),
      })
    }
  }

  getStatus(): HealthStatus {
    const checks = Array.from(this.results.entries()).map(([name, data]) => ({
      name,
      status: data.result.status,
      message: data.result.message,
      responseTime: data.result.responseTime,
      lastChecked: data.lastChecked,
    }))

    // Overall status is the worst status of all checks
    let overallStatus: HealthStatus['status'] = 'healthy'
    for (const check of checks) {
      if (check.status === 'unhealthy') {
        overallStatus = 'unhealthy'
        break
      }
      if (check.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded'
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      checks,
      uptime: Date.now() - this.startTime,
      version: process.env.SERVICE_VERSION || '1.0.0',
    }
  }

  private startServer(path: string): void {
    const port = Number.parseInt(process.env.HEALTH_CHECK_PORT || '3001', 10)

    this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.url === path && req.method === 'GET') {
        const status = this.getStatus()
        const httpStatus =
          status.status === 'healthy' ? 200 : status.status === 'degraded' ? 503 : 503

        res.writeHead(httpStatus, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(status, null, 2))
      } else if (req.url === `${path}/live` && req.method === 'GET') {
        // Simple liveness probe
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('OK')
      } else if (req.url === `${path}/ready` && req.method === 'GET') {
        // Readiness probe
        const status = this.getStatus()
        if (status.status === 'healthy') {
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('READY')
        } else {
          res.writeHead(503, { 'Content-Type': 'text/plain' })
          res.end('NOT READY')
        }
      } else {
        res.writeHead(404)
        res.end('Not found')
      }
    })

    this.server.listen(port, () => {
      console.log(`🏥 Health check endpoint listening on port ${port}${path}`)
    })
  }

  stop(): void {
    // Clear all intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval)
    }
    this.intervals.clear()

    // Close server
    if (this.server) {
      this.server.close()
      this.server = null
    }
  }
}

// Export singleton instance
export const healthCheckManager = new HealthCheckManager()

// Initialize health checks
export async function initializeHealthChecks(config: any): Promise<void> {
  await healthCheckManager.initialize(config)
}

// Convenience functions
export function getHealthStatus(): HealthStatus {
  return healthCheckManager.getStatus()
}

export function addCustomHealthCheck(check: HealthCheck): void {
  healthCheckManager.addCheck(check)
}

export function removeHealthCheck(name: string): void {
  healthCheckManager.removeCheck(name)
}

// Express/Next.js middleware for health checks
export function healthCheckMiddleware(path = '/health') {
  return async (req: any, res: any, next: any) => {
    if (req.path === path) {
      const status = getHealthStatus()
      const httpStatus = status.status === 'healthy' ? 200 : 503
      res.status(httpStatus).json(status)
    } else if (req.path === `${path}/live`) {
      res.status(200).send('OK')
    } else if (req.path === `${path}/ready`) {
      const status = getHealthStatus()
      if (status.status === 'healthy') {
        res.status(200).send('READY')
      } else {
        res.status(503).send('NOT READY')
      }
    } else {
      next()
    }
  }
}
