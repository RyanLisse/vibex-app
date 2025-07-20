import type Redis from 'ioredis'
import { Cluster } from 'ioredis'
import { AlertService } from '@/lib/alerts/alert-service'
import { getLogger } from '@/lib/logging'
import { getRedisConfig } from '@/lib/redis/config'
import { RedisClientManager } from '@/lib/redis/redis-client'

let alertService: AlertService | null = null

export function getAlertService(): AlertService {
  if (!alertService) {
    // Skip initialization during build
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      throw new Error('AlertService not available during build')
    }

    const redisConfig = getRedisConfig()
    const redisManager = RedisClientManager.getInstance(redisConfig)
    const redisClient = redisManager.getClient('primary')

    // AlertService expects a Redis instance, not Cluster
    if (redisClient instanceof Cluster) {
      throw new Error('AlertService does not support Redis Cluster mode')
    }

    alertService = new AlertService(redisClient as Redis)
  }
  return alertService
}

export const logger = getLogger('AlertsAPI')
