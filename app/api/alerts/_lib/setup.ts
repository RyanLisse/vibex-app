import { AlertService } from '@/lib/alerts/alert-service'
import { RedisClientManager } from '@/lib/redis/redis-client'
import { getRedisConfig } from '@/lib/redis/config'
import { ComponentLogger } from '@/lib/logging/logger-factory'

let alertService: AlertService | null = null

export function getAlertService(): AlertService {
  if (!alertService) {
    const redisConfig = getRedisConfig()
    const redisManager = RedisClientManager.getInstance(redisConfig)
    const redisClient = redisManager.getClient('primary')
    alertService = new AlertService(redisClient)
  }
  return alertService
}

export const logger = new ComponentLogger('AlertsAPI')
