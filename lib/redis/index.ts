/**
 * Redis/Valkey Integration - Main Entry Point
 *
 * Provides a unified interface for all Redis/Valkey services including
 * caching, session management, pub/sub, distributed locks, and more.
 */

import { RedisClientManager } from './redis-client'
import { CacheService } from './cache-service'
import { getRedisServiceConfig, validateRedisEnvironment, redisFeatures } from './config'
import { ObservabilityService } from '../observability'
import type { RedisServiceConfig, RedisHealthStatus } from './types'

export class RedisService {
  private static instance: RedisService
  private clientManager: RedisClientManager
  private cacheService: CacheService
  private config: RedisServiceConfig
  private observability = ObservabilityService.getInstance()
  private isInitialized = false
  private healthCheckInterval?: NodeJS.Timeout
  private metricsInterval?: NodeJS.Timeout

  private constructor() {
    this.config = getRedisServiceConfig()
    this.clientManager = RedisClientManager.getInstance(this.config.redis)
    this.cacheService = CacheService.getInstance()
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService()
    }
    return RedisService.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    return this.observability.trackOperation('redis.service.initialize', async () => {
      try {
        // Validate environment
        const validation = validateRedisEnvironment()
        if (!validation.isValid) {
          throw new Error(`Redis environment validation failed: ${validation.errors.join(', ')}`)
        }

        // Initialize Redis client manager
        await this.clientManager.initialize()

        // Start monitoring if enabled
        if (this.config.monitoring.enableHealthChecks) {
          this.startHealthChecks()
        }

        if (this.config.monitoring.enableMetrics) {
          this.startMetricsCollection()
        }

        this.isInitialized = true
        console.log('Redis service initialized successfully')

        // Log enabled features
        const enabledFeatures = Object.entries(redisFeatures)
          .filter(([, enabled]) => enabled)
          .map(([feature]) => feature)

        console.log('Redis features enabled:', enabledFeatures.join(', '))
      } catch (error) {
        console.error('Failed to initialize Redis service:', error)
        throw error
      }
    })
  }

  // Cache Service Access
  get cache(): CacheService {
    this.ensureInitialized()
    return this.cacheService
  }

  // Client Manager Access
  get client(): RedisClientManager {
    this.ensureInitialized()
    return this.clientManager
  }

  // Health and Monitoring
  async getHealthStatus(): Promise<RedisHealthStatus> {
    this.ensureInitialized()
    return this.clientManager.healthCheck()
  }

  async getMetrics(): Promise<{
    cache: any
    connections: any
    health: RedisHealthStatus
  }> {
    this.ensureInitialized()

    const [cacheMetrics, healthStatus] = await Promise.all([
      this.cacheService.getMetrics(),
      this.clientManager.healthCheck(),
    ])

    const connectionMetrics = {
      total: this.clientManager.getConnectedClients().length,
      connected: this.clientManager.getConnectedClients(),
      timestamp: new Date(),
    }

    return {
      cache: cacheMetrics,
      connections: connectionMetrics,
      health: healthStatus,
    }
  }

  // Utility Methods
  async flushAll(): Promise<void> {
    this.ensureInitialized()
    await this.clientManager.flushAll()
    this.cacheService.resetMetrics()
    console.log('All Redis data flushed and metrics reset')
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down Redis service...')

    // Stop monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }

    // Shutdown client manager
    await this.clientManager.shutdown()

    this.isInitialized = false
    console.log('Redis service shut down successfully')
  }

  // Configuration Access
  getConfig(): RedisServiceConfig {
    return { ...this.config }
  }

  getFeatures(): typeof redisFeatures {
    return { ...redisFeatures }
  }

  // Private Methods
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Redis service not initialized. Call initialize() first.')
    }
  }

  private startHealthChecks(): void {
    const interval = this.config.monitoring.healthCheckInterval

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getHealthStatus()

        // Record health metrics
        this.observability.recordMetric('redis.health.overall', 1, {
          status: health.overall,
        })

        // Record individual client health
        Object.entries(health.clients).forEach(([clientName, clientHealth]) => {
          this.observability.recordMetric('redis.health.client', 1, {
            client: clientName,
            status: clientHealth.status,
            connected: clientHealth.connected.toString(),
          })

          if (clientHealth.responseTime) {
            this.observability.recordMetric(
              'redis.health.response_time',
              clientHealth.responseTime,
              {
                client: clientName,
              }
            )
          }
        })

        // Log warnings for unhealthy clients
        if (health.overall !== 'healthy') {
          const unhealthyClients = Object.entries(health.clients)
            .filter(([, client]) => client.status === 'unhealthy')
            .map(([name]) => name)

          console.warn(
            `Redis health check: ${health.overall} - Unhealthy clients: ${unhealthyClients.join(', ')}`
          )
        }
      } catch (error) {
        console.error('Redis health check failed:', error)
        this.observability.trackError('redis.health.check.error', error as Error)
      }
    }, interval)
  }

  private startMetricsCollection(): void {
    const interval = this.config.monitoring.metricsInterval

    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.getMetrics()

        // Record cache metrics
        const cacheMetrics = metrics.cache
        this.observability.recordMetric('redis.cache.hits', cacheMetrics.hits)
        this.observability.recordMetric('redis.cache.misses', cacheMetrics.misses)
        this.observability.recordMetric('redis.cache.hit_rate', cacheMetrics.hitRate)
        this.observability.recordMetric('redis.cache.operations', cacheMetrics.totalOperations)
        this.observability.recordMetric('redis.cache.errors', cacheMetrics.errors)

        // Record connection metrics
        this.observability.recordMetric('redis.connections.total', metrics.connections.total)

        // Log metrics summary in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Redis metrics:', {
            cache: {
              hitRate: `${(cacheMetrics.hitRate * 100).toFixed(1)}%`,
              operations: cacheMetrics.totalOperations,
              errors: cacheMetrics.errors,
            },
            connections: metrics.connections.total,
            health: metrics.health.overall,
          })
        }
      } catch (error) {
        console.error('Redis metrics collection failed:', error)
        this.observability.trackError('redis.metrics.collection.error', error as Error)
      }
    }, interval)
  }
}

// Convenience exports
export const redisService = RedisService.getInstance()
export const redisCache = redisService.cache
export const redisClient = redisService.client

// Initialize Redis service (call this in your app startup)
export async function initializeRedis(): Promise<void> {
  await redisService.initialize()
}

// Graceful shutdown (call this in your app shutdown)
export async function shutdownRedis(): Promise<void> {
  await redisService.shutdown()
}

// Re-export types and utilities
export * from './types'
export * from './config'
export { RedisClientManager } from './redis-client'
export { CacheService } from './cache-service'
