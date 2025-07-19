import { RedisConfig, RedisServiceConfig } from './types'

/**
 * Redis/Valkey Configuration
 *
 * Environment-based configuration for Redis/Valkey integration
 */

export function getRedisConfig(): RedisConfig {
  const isProduction = process.env.NODE_ENV === 'production'
  const redisUrl = process.env.REDIS_URL || process.env.VALKEY_URL

  // Parse Redis URL if provided
  if (redisUrl) {
    const url = new URL(redisUrl)
    const config: RedisConfig = {
      primary: {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        database: parseInt(url.pathname.slice(1)) || 0,
        type: 'standalone',
      },
    }

    // Add cluster configuration if specified
    if (process.env.REDIS_CLUSTER_NODES) {
      const nodes = process.env.REDIS_CLUSTER_NODES.split(',').map((node) => {
        const [host, port] = node.trim().split(':')
        return { host, port: parseInt(port) || 6379 }
      })

      config.primary = {
        ...config.primary,
        type: 'cluster',
        nodes,
      }
    }

    return config
  }

  // Default configuration for development/testing
  const defaultConfig: RedisConfig = {
    primary: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_DB || '0'),
      type: 'standalone',
      options: {
        // Connection options
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,

        // Production optimizations
        ...(isProduction && {
          enableReadyCheck: true,
          maxLoadingTimeout: 5000,
          enableOfflineQueue: false,
        }),
      },
    },
  }

  // Add replica configuration for production
  if (isProduction && process.env.REDIS_REPLICA_HOST) {
    defaultConfig.replicas = {
      read: {
        host: process.env.REDIS_REPLICA_HOST,
        port: parseInt(process.env.REDIS_REPLICA_PORT || '6379'),
        password: process.env.REDIS_REPLICA_PASSWORD || process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_REPLICA_DB || process.env.REDIS_DB || '0'),
        type: 'standalone',
      },
    }
  }

  // Add dedicated pub/sub client for high-throughput scenarios
  if (process.env.REDIS_PUBSUB_HOST || isProduction) {
    defaultConfig.pubsub = {
      host: process.env.REDIS_PUBSUB_HOST || defaultConfig.primary.host,
      port: parseInt(process.env.REDIS_PUBSUB_PORT || process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PUBSUB_PASSWORD || process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_PUBSUB_DB || '1'), // Use different DB for pub/sub
      type: 'standalone',
    }
  }

  return defaultConfig
}

export function getRedisServiceConfig(): RedisServiceConfig {
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    redis: getRedisConfig(),
    cache: {
      defaultTTL: parseInt(process.env.REDIS_CACHE_TTL || '3600'), // 1 hour
      maxKeyLength: parseInt(process.env.REDIS_MAX_KEY_LENGTH || '250'),
      enableCompression: process.env.REDIS_ENABLE_COMPRESSION === 'true',
      compressionThreshold: parseInt(process.env.REDIS_COMPRESSION_THRESHOLD || '1024'), // 1KB
    },
    session: {
      defaultTTL: parseInt(process.env.REDIS_SESSION_TTL || '86400'), // 24 hours
      cookieName: process.env.SESSION_COOKIE_NAME || 'session_id',
      autoExtend: process.env.REDIS_SESSION_AUTO_EXTEND !== 'false',
      slidingExpiration: process.env.REDIS_SESSION_SLIDING !== 'false',
    },
    pubsub: {
      maxSubscriptions: parseInt(process.env.REDIS_MAX_SUBSCRIPTIONS || '1000'),
      messageTimeout: parseInt(process.env.REDIS_MESSAGE_TIMEOUT || '30000'), // 30 seconds
      enablePatterns: process.env.REDIS_ENABLE_PATTERNS !== 'false',
    },
    locks: {
      defaultTTL: parseInt(process.env.REDIS_LOCK_TTL || '30'), // 30 seconds
      maxRetries: parseInt(process.env.REDIS_LOCK_MAX_RETRIES || '10'),
      retryDelay: parseInt(process.env.REDIS_LOCK_RETRY_DELAY || '100'), // 100ms
    },
    rateLimiting: {
      defaultWindowSize: parseInt(process.env.REDIS_RATE_LIMIT_WINDOW || '60'), // 1 minute
      defaultMaxRequests: parseInt(process.env.REDIS_RATE_LIMIT_MAX || '100'),
      enableDistributed: isProduction,
    },
    jobs: {
      defaultPriority: parseInt(process.env.REDIS_JOB_PRIORITY || '0'),
      defaultMaxAttempts: parseInt(process.env.REDIS_JOB_MAX_ATTEMPTS || '3'),
      cleanupInterval: parseInt(process.env.REDIS_JOB_CLEANUP_INTERVAL || '300000'), // 5 minutes
      retentionTime: parseInt(process.env.REDIS_JOB_RETENTION || '86400'), // 24 hours
    },
    monitoring: {
      enableMetrics: process.env.REDIS_ENABLE_METRICS !== 'false',
      metricsInterval: parseInt(process.env.REDIS_METRICS_INTERVAL || '60000'), // 1 minute
      enableHealthChecks: process.env.REDIS_ENABLE_HEALTH_CHECKS !== 'false',
      healthCheckInterval: parseInt(process.env.REDIS_HEALTH_CHECK_INTERVAL || '30000'), // 30 seconds
    },
  }
}

// Environment validation
export function validateRedisEnvironment(): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check required environment variables
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    errors.push('Either REDIS_URL or REDIS_HOST must be provided')
  }

  // Validate Redis URL format if provided
  if (process.env.REDIS_URL) {
    try {
      new URL(process.env.REDIS_URL)
    } catch {
      errors.push('REDIS_URL must be a valid URL')
    }
  }

  // Validate port numbers
  const ports = [
    process.env.REDIS_PORT,
    process.env.REDIS_REPLICA_PORT,
    process.env.REDIS_PUBSUB_PORT,
  ].filter(Boolean)

  for (const port of ports) {
    const portNum = parseInt(port!)
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.push(`Invalid port number: ${port}`)
    }
  }

  // Validate database numbers
  const databases = [
    process.env.REDIS_DB,
    process.env.REDIS_REPLICA_DB,
    process.env.REDIS_PUBSUB_DB,
  ].filter(Boolean)

  for (const db of databases) {
    const dbNum = parseInt(db!)
    if (isNaN(dbNum) || dbNum < 0 || dbNum > 15) {
      errors.push(`Invalid database number: ${db}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Default Redis configuration for testing
export const testRedisConfig: RedisConfig = {
  primary: {
    host: 'localhost',
    port: 6379,
    database: 15, // Use DB 15 for testing
    type: 'standalone',
    options: {
      connectTimeout: 5000,
      commandTimeout: 2000,
      retryDelayOnFailover: 50,
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    },
  },
}

// Redis feature flags
export const redisFeatures = {
  enableCaching: process.env.REDIS_ENABLE_CACHING !== 'false',
  enableSessions: process.env.REDIS_ENABLE_SESSIONS !== 'false',
  enablePubSub: process.env.REDIS_ENABLE_PUBSUB !== 'false',
  enableLocks: process.env.REDIS_ENABLE_LOCKS !== 'false',
  enableRateLimiting: process.env.REDIS_ENABLE_RATE_LIMITING !== 'false',
  enableJobs: process.env.REDIS_ENABLE_JOBS !== 'false',
  enableMetrics: process.env.REDIS_ENABLE_METRICS !== 'false',
  enableHealthChecks: process.env.REDIS_ENABLE_HEALTH_CHECKS !== 'false',
}
