import { ObservabilityService } from '../observability'
import type { RedisClientManager } from './redis-client'
import type { CacheKey, CacheMetrics, CacheOptions, CacheValue } from './types'

export class CacheService {
  private static instance: CacheService
  private redisManager: RedisClientManager
  private observability = ObservabilityService.getInstance()
  private defaultTTL = 3600 // 1 hour
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    totalOperations: 0,
    hitRate: 0,
  }

  private constructor() {
    // RedisManager will be set during initialization
    this.redisManager = null as any
  }

  setRedisManager(manager: RedisClientManager): void {
    this.redisManager = manager
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  async get<T>(key: CacheKey, options?: CacheOptions): Promise<T | null> {
    return this.observability.trackOperation('cache.get', async () => {
      const client = this.redisManager.getClient(options?.clientName)
      const fullKey = this.buildKey(key)

      try {
        const value = await client.get(fullKey)
        this.metrics.totalOperations++

        if (value === null) {
          this.metrics.misses++
          this.observability.recordEvent('cache.miss', 1, { key: fullKey })
          this.updateHitRate()
          return null
        }

        this.metrics.hits++
        this.observability.recordEvent('cache.hit', 1, { key: fullKey })
        this.updateHitRate()

        return JSON.parse(value) as T
      } catch (error) {
        this.metrics.errors++
        this.observability.recordError('cache.get.error', error as Error, {
          key: fullKey,
        })
        return null
      }
    })
  }

  async set<T>(key: CacheKey, value: CacheValue<T>, options?: CacheOptions): Promise<boolean> {
    return this.observability.trackOperation('cache.set', async () => {
      const client = this.redisManager.getClient(options?.clientName)
      const fullKey = this.buildKey(key)
      const ttl = options?.ttl || this.defaultTTL

      try {
        const serializedValue = JSON.stringify(value)
        const result = await client.setex(fullKey, ttl, serializedValue)

        this.metrics.sets++
        this.metrics.totalOperations++
        this.observability.recordEvent('cache.set', 1, {
          key: fullKey,
          ttl: ttl.toString(),
          status: 'success',
        })

        return result === 'OK'
      } catch (error) {
        this.metrics.errors++
        this.observability.recordError('cache.set.error', error as Error, {
          key: fullKey,
        })
        return false
      }
    })
  }

  async delete(key: CacheKey, options?: CacheOptions): Promise<boolean> {
    return this.observability.trackOperation('cache.delete', async () => {
      const client = this.redisManager.getClient(options?.clientName)
      const fullKey = this.buildKey(key)

      try {
        const result = await client.del(fullKey)

        this.metrics.deletes++
        this.metrics.totalOperations++
        this.observability.recordEvent('cache.delete', 1, {
          key: fullKey,
          status: 'success',
        })

        return result > 0
      } catch (error) {
        this.metrics.errors++
        this.observability.recordError('cache.delete.error', error as Error, {
          key: fullKey,
        })
        return false
      }
    })
  }

  async mget<T>(keys: CacheKey[], options?: CacheOptions): Promise<(T | null)[]> {
    return this.observability.trackOperation('cache.mget', async () => {
      const client = this.redisManager.getClient(options?.clientName)
      const fullKeys = keys.map((key) => this.buildKey(key))

      try {
        const values = await client.mget(...fullKeys)
        this.metrics.totalOperations++

        return values.map((value, index) => {
          if (value === null) {
            this.metrics.misses++
            this.observability.recordEvent('cache.miss', 1, {
              key: fullKeys[index],
            })
            return null
          }

          this.metrics.hits++
          this.observability.recordEvent('cache.hit', 1, {
            key: fullKeys[index],
          })
          return JSON.parse(value) as T
        })
      } catch (error) {
        this.metrics.errors++
        this.observability.recordError('cache.mget.error', error as Error, {
          keys: fullKeys,
        })
        return keys.map(() => null)
      } finally {
        this.updateHitRate()
      }
    })
  }

  async mset<T>(
    entries: Array<{ key: CacheKey; value: CacheValue<T>; ttl?: number }>,
    options?: CacheOptions
  ): Promise<boolean> {
    return this.observability.trackOperation('cache.mset', async () => {
      const client = this.redisManager.getClient(options?.clientName)

      try {
        const pipeline = client.pipeline()

        entries.forEach(({ key, value, ttl }) => {
          const fullKey = this.buildKey(key)
          const serializedValue = JSON.stringify(value)
          const finalTTL = ttl || this.defaultTTL

          pipeline.setex(fullKey, finalTTL, serializedValue)
        })

        const results = await pipeline.exec()
        const success = results?.every(([error, result]) => error === null && result === 'OK')

        this.metrics.sets += entries.length
        this.metrics.totalOperations++
        this.observability.recordEvent('cache.mset', 1, {
          count: entries.length.toString(),
          status: success ? 'success' : 'error',
        })

        return success
      } catch (error) {
        this.metrics.errors++
        this.observability.recordError('cache.mset.error', error as Error, {
          count: entries.length,
        })
        return false
      }
    })
  }

  async invalidatePattern(pattern: string, options?: CacheOptions): Promise<number> {
    return this.observability.trackOperation('cache.invalidate_pattern', async () => {
      const client = this.redisManager.getClient(options?.clientName)
      const fullPattern = this.buildKey(pattern)

      try {
        const keys = await client.keys(fullPattern)

        if (keys.length === 0) {
          return 0
        }

        const result = await client.del(...keys)

        this.metrics.deletes += result
        this.metrics.totalOperations++
        this.observability.recordEvent('cache.invalidate_pattern', 1, {
          pattern: fullPattern,
          count: result.toString(),
          status: 'success',
        })

        return result
      } catch (error) {
        this.metrics.errors++
        this.observability.recordError('cache.invalidate_pattern.error', error as Error, {
          pattern: fullPattern,
        })
        return 0
      }
    })
  }

  // Specialized caching methods for different use cases
  async cacheApiResponse<T>(
    endpoint: string,
    params: Record<string, any>,
    response: T,
    ttl = 300
  ): Promise<boolean> {
    const key = `api:${endpoint}:${this.hashParams(params)}`
    return this.set(key, response, { ttl })
  }

  async getCachedApiResponse<T>(endpoint: string, params: Record<string, any>): Promise<T | null> {
    const key = `api:${endpoint}:${this.hashParams(params)}`
    return this.get<T>(key)
  }

  async cacheAgentContext<T>(agentId: string, context: T, ttl = 1800): Promise<boolean> {
    const key = `agent:context:${agentId}`
    return this.set(key, context, { ttl })
  }

  async getAgentContext<T>(agentId: string): Promise<T | null> {
    const key = `agent:context:${agentId}`
    return this.get<T>(key)
  }

  async cacheLLMResponse<T>(
    provider: string,
    prompt: string,
    response: T,
    ttl = 3600
  ): Promise<boolean> {
    const key = `llm:${provider}:${this.hashString(prompt)}`
    return this.set(key, response, { ttl })
  }

  async getCachedLLMResponse<T>(provider: string, prompt: string): Promise<T | null> {
    const key = `llm:${provider}:${this.hashString(prompt)}`
    return this.get<T>(key)
  }

  // Utility methods
  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalOperations: 0,
      hitRate: 0,
    }
  }

  private updateHitRate(): void {
    const totalCacheOps = this.metrics.hits + this.metrics.misses
    this.metrics.hitRate = totalCacheOps > 0 ? this.metrics.hits / totalCacheOps : 0
  }

  private buildKey(key: CacheKey): string {
    if (typeof key === 'string') {
      return `cache:${key}`
    }
    return `cache:${key.namespace}:${key.key}`
  }

  private hashParams(params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (result, key) => {
          result[key] = params[key]
          return result
        },
        {} as Record<string, any>
      )

    return this.hashString(JSON.stringify(sortedParams))
  }

  private hashString(str: string): string {
    // Simple hash function for cache keys
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  // Session-specific caching methods
  async cacheSession<T>(
    sessionId: string,
    sessionData: T,
    ttl = 1800 // 30 minutes
  ): Promise<boolean> {
    const key = `session:${sessionId}`
    return this.set(key, sessionData, { ttl })
  }

  async getSession<T>(sessionId: string): Promise<T | null> {
    const key = `session:${sessionId}`
    return this.get<T>(key)
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const key = `session:${sessionId}`
    return this.delete(key)
  }

  async extendSession(sessionId: string, additionalTTL: number): Promise<boolean> {
    const client = this.redisManager.getClient()
    const key = this.buildKey(`session:${sessionId}`)

    try {
      const currentTTL = await client.ttl(key)
      if (currentTTL <= 0) {
        return false
      }

      const newTTL = currentTTL + additionalTTL
      const result = await client.expire(key, newTTL)
      return result === 1
    } catch (error) {
      this.observability.recordError('cache.extend_session.error', error as Error, {
        sessionId,
      })
      return false
    }
  }
}
