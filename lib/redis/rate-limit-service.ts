/**
 * RateLimitService - Redis/Valkey Rate Limiting Implementation
 *
 * Provides various rate limiting algorithms for API protection
 */

import type Redis from 'ioredis'
import { ObservabilityService } from '../observability'
import { RedisClientManager } from './redis-client'
import type { RateLimitOptions, RateLimitResult } from './types'

export class RateLimitService {
  private static instance: RateLimitService
  private redisManager: RedisClientManager
  private observability = ObservabilityService.getInstance()
  private systemLoad = 0.5 // Default 50% system load
  private stats = {
    totalRequests: 0,
    blockedRequests: 0,
    allowedRequests: 0,
    blockRate: 0,
    topLimitedKeys: [] as string[],
  }

  private constructor() {
    this.redisManager = RedisClientManager.getInstance()
  }

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService()
    }
    return RateLimitService.instance
  }

  async checkLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    this.validateKey(key)
    this.validateOptions(options)

    return this.observability.trackOperation('rate_limit.check', async () => {
      const client = this.redisManager.getClient(options.clientName)
      const rateLimitKey = this.buildKey(key, options.keyPrefix)
      const windowStart = this.getWindowStart(options.windowSize)
      const windowEnd = windowStart + options.windowSize * 1000

      try {
        // Use Lua script for atomic rate limit check
        const luaScript = `
          local key = KEYS[1]
          local window_start = tonumber(ARGV[1])
          local window_end = tonumber(ARGV[2])
          local max_requests = tonumber(ARGV[3])
          local current_time = tonumber(ARGV[4])
          
          -- Remove expired entries
          redis.call('ZREMRANGEBYSCORE', key, 0, window_start - 1)
          
          -- Count current requests in window
          local current_count = redis.call('ZCARD', key)
          
          if current_count < max_requests then
            -- Add current request
            redis.call('ZADD', key, current_time, current_time .. ':' .. math.random())
            redis.call('EXPIRE', key, math.ceil((window_end - window_start) / 1000))
            return {1, current_count + 1, max_requests - current_count - 1}
          else
            return {0, current_count, 0}
          end
        `

        const now = Date.now()
        const result = (await client.eval(
          luaScript,
          1,
          rateLimitKey,
          windowStart.toString(),
          windowEnd.toString(),
          options.maxRequests.toString(),
          now.toString()
        )) as [number, number, number]

        const [allowed, totalRequests, remaining] = result
        const isAllowed = allowed === 1

        this.updateStats(key, isAllowed)

        const rateLimitResult: RateLimitResult = {
          allowed: isAllowed,
          remaining,
          resetTime: new Date(windowEnd),
          totalRequests,
          windowStart: new Date(windowStart),
        }

        this.observability.recordEvent('rate_limit.checked', 1, {
          key,
          allowed: isAllowed.toString(),
          remaining: remaining.toString(),
        })

        return rateLimitResult
      } catch (error) {
        this.observability.recordError('rate_limit.check.error', error as Error, {
          key,
        })
        // Fail open - allow request if rate limiting fails
        return {
          allowed: true,
          remaining: options.maxRequests,
          resetTime: new Date(Date.now() + options.windowSize * 1000),
          totalRequests: 0,
          windowStart: new Date(),
        }
      }
    })
  }

  async checkSlidingWindowLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    this.validateKey(key)
    this.validateOptions(options)

    return this.observability.trackOperation('rate_limit.sliding_window', async () => {
      const client = this.redisManager.getClient(options.clientName)
      const rateLimitKey = this.buildKey(key, options.keyPrefix)
      const now = Date.now()
      const windowStart = now - options.windowSize * 1000

      try {
        const luaScript = `
          local key = KEYS[1]
          local window_start = tonumber(ARGV[1])
          local max_requests = tonumber(ARGV[2])
          local current_time = tonumber(ARGV[3])
          local ttl = tonumber(ARGV[4])
          
          -- Remove expired entries
          redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
          
          -- Count current requests in sliding window
          local current_count = redis.call('ZCARD', key)
          
          if current_count < max_requests then
            -- Add current request
            redis.call('ZADD', key, current_time, current_time .. ':' .. math.random())
            redis.call('EXPIRE', key, ttl)
            return {1, current_count + 1, max_requests - current_count - 1}
          else
            return {0, current_count, 0}
          end
        `

        const result = (await client.eval(
          luaScript,
          1,
          rateLimitKey,
          windowStart.toString(),
          options.maxRequests.toString(),
          now.toString(),
          options.windowSize.toString()
        )) as [number, number, number]

        const [allowed, totalRequests, remaining] = result
        const isAllowed = allowed === 1

        this.updateStats(key, isAllowed)

        return {
          allowed: isAllowed,
          remaining,
          resetTime: new Date(now + options.windowSize * 1000),
          totalRequests,
          windowStart: new Date(windowStart),
        }
      } catch (error) {
        this.observability.recordError('rate_limit.sliding_window.error', error as Error, {
          key,
        })
        return {
          allowed: true,
          remaining: options.maxRequests,
          resetTime: new Date(now + options.windowSize * 1000),
          totalRequests: 0,
          windowStart: new Date(windowStart),
        }
      }
    })
  }

  async initializeTokenBucket(key: string, bucketSize: number, refillRate: number): Promise<void> {
    const client = this.redisManager.getClient()
    const bucketKey = this.buildKey(key, 'bucket')

    const bucketData = {
      size: bucketSize,
      tokens: bucketSize,
      refillRate,
      lastRefill: Date.now(),
    }

    await client.hset(bucketKey, bucketData)
    await client.expire(bucketKey, 3600) // 1 hour TTL
  }

  async consumeTokens(key: string, tokens: number): Promise<RateLimitResult> {
    const client = this.redisManager.getClient()
    const bucketKey = this.buildKey(key, 'bucket')

    try {
      const luaScript = `
        local bucket_key = KEYS[1]
        local tokens_requested = tonumber(ARGV[1])
        local current_time = tonumber(ARGV[2])
        
        -- Get bucket data
        local bucket_data = redis.call('HMGET', bucket_key, 'size', 'tokens', 'refillRate', 'lastRefill')
        
        if not bucket_data[1] then
          return {0, 0, 0} -- Bucket not found
        end
        
        local bucket_size = tonumber(bucket_data[1])
        local current_tokens = tonumber(bucket_data[2])
        local refill_rate = tonumber(bucket_data[3])
        local last_refill = tonumber(bucket_data[4])
        
        -- Calculate tokens to add based on time elapsed
        local time_elapsed = math.max(0, current_time - last_refill)
        local tokens_to_add = math.floor((time_elapsed / 1000) * refill_rate)
        current_tokens = math.min(bucket_size, current_tokens + tokens_to_add)
        
        if current_tokens >= tokens_requested then
          -- Consume tokens
          current_tokens = current_tokens - tokens_requested
          redis.call('HMSET', bucket_key, 'tokens', current_tokens, 'lastRefill', current_time)
          return {1, current_tokens, current_tokens}
        else
          -- Not enough tokens
          redis.call('HMSET', bucket_key, 'tokens', current_tokens, 'lastRefill', current_time)
          return {0, current_tokens, current_tokens}
        end
      `

      const result = (await client.eval(
        luaScript,
        1,
        bucketKey,
        tokens.toString(),
        Date.now().toString()
      )) as [number, number, number]

      const [allowed, remaining] = result
      const isAllowed = allowed === 1

      this.updateStats(key, isAllowed)

      return {
        allowed: isAllowed,
        remaining,
        resetTime: new Date(Date.now() + 60000), // Rough estimate
        totalRequests: tokens,
        windowStart: new Date(),
      }
    } catch (error) {
      this.observability.recordError('rate_limit.token_bucket.error', error as Error, {
        key,
      })
      return {
        allowed: true,
        remaining: tokens,
        resetTime: new Date(),
        totalRequests: 0,
        windowStart: new Date(),
      }
    }
  }

  async setSystemLoad(load: number): Promise<void> {
    this.systemLoad = Math.max(0, Math.min(1, load))
  }

  async getAdaptiveLimits(baseOptions: RateLimitOptions): Promise<RateLimitOptions> {
    // Adjust limits based on system load
    const loadFactor = 1 - this.systemLoad
    const adaptedMaxRequests = Math.floor(baseOptions.maxRequests * (0.5 + loadFactor * 0.5))

    return {
      ...baseOptions,
      maxRequests: Math.max(1, adaptedMaxRequests),
    }
  }

  async initializeBudget(key: string, budget: number): Promise<void> {
    const client = this.redisManager.getClient()
    const budgetKey = this.buildKey(key, 'budget')

    await client.hset(budgetKey, {
      total: budget,
      remaining: budget,
      spent: 0,
    })
    await client.expire(budgetKey, 86400) // 24 hours TTL
  }

  async checkCostLimit(key: string, cost: number): Promise<RateLimitResult> {
    const client = this.redisManager.getClient()
    const budgetKey = this.buildKey(key, 'budget')

    try {
      const luaScript = `
        local budget_key = KEYS[1]
        local cost = tonumber(ARGV[1])
        
        local budget_data = redis.call('HMGET', budget_key, 'total', 'remaining', 'spent')
        
        if not budget_data[1] then
          return {0, 0, 0} -- Budget not found
        end
        
        local total = tonumber(budget_data[1])
        local remaining = tonumber(budget_data[2])
        local spent = tonumber(budget_data[3])
        
        if remaining >= cost then
          -- Deduct cost
          remaining = remaining - cost
          spent = spent + cost
          redis.call('HMSET', budget_key, 'remaining', remaining, 'spent', spent)
          return {1, remaining, spent}
        else
          -- Not enough budget
          return {0, remaining, spent}
        end
      `

      const result = (await client.eval(luaScript, 1, budgetKey, cost.toString())) as [
        number,
        number,
        number,
      ]

      const [allowed, remaining] = result
      const isAllowed = allowed === 1

      this.updateStats(key, isAllowed)

      return {
        allowed: isAllowed,
        remaining,
        resetTime: new Date(Date.now() + 86400000), // 24 hours
        totalRequests: cost,
        windowStart: new Date(),
      }
    } catch (error) {
      this.observability.recordError('rate_limit.cost_limit.error', error as Error, {
        key,
      })
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(),
        totalRequests: 0,
        windowStart: new Date(),
      }
    }
  }

  async getStats(): Promise<typeof this.stats> {
    this.stats.blockRate =
      this.stats.totalRequests > 0 ? this.stats.blockedRequests / this.stats.totalRequests : 0

    return { ...this.stats }
  }

  async getKeyStats(key: string): Promise<{
    totalRequests: number
    allowedRequests: number
    blockedRequests: number
    currentRemaining: number
    nextResetTime: Date
  }> {
    // This would be implemented with more detailed tracking
    return {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      currentRemaining: 0,
      nextResetTime: new Date(),
    }
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up RateLimit service...')

    // Reset stats
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      allowedRequests: 0,
      blockRate: 0,
      topLimitedKeys: [],
    }

    console.log('RateLimit service cleaned up successfully')
  }

  // Private helper methods
  private validateKey(key: string): void {
    if (!key || key.trim() === '') {
      throw new Error('Rate limit key cannot be empty')
    }
  }

  private validateOptions(options: RateLimitOptions): void {
    if (options.windowSize <= 0) {
      throw new Error('Window size must be greater than 0')
    }

    if (options.maxRequests <= 0) {
      throw new Error('Max requests must be greater than 0')
    }
  }

  private buildKey(key: string, prefix?: string): string {
    const baseKey = `rate_limit:${key}`
    return prefix ? `${baseKey}:${prefix}` : baseKey
  }

  private getWindowStart(windowSize: number): number {
    const now = Date.now()
    return Math.floor(now / (windowSize * 1000)) * (windowSize * 1000)
  }

  private updateStats(key: string, allowed: boolean): void {
    this.stats.totalRequests++

    if (allowed) {
      this.stats.allowedRequests++
    } else {
      this.stats.blockedRequests++

      // Track top limited keys
      if (!this.stats.topLimitedKeys.includes(key)) {
        this.stats.topLimitedKeys.push(key)
        if (this.stats.topLimitedKeys.length > 10) {
          this.stats.topLimitedKeys.shift()
        }
      }
    }
  }
}
