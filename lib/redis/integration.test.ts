/**
 * Redis/Valkey Integration Test
 * 
 * Integration test that verifies all services can be imported and instantiated
 */

import { describe, test, expect } from 'bun:test'

describe('Redis/Valkey Integration', () => {
  test('should export all Redis services', async () => {
    // Test that all services can be imported
    const { 
      RedisService,
      CacheService,
      PubSubService,
      LockService,
      RateLimitService,
      JobQueueService,
      MetricsService,
      SessionService,
      redisService,
      getRedisCache,
      getRedisPubSub,
      getRedisLocks,
      getRedisRateLimit,
      getRedisJobQueue,
      getRedisMetrics,
      getRedisSessions
    } = await import('./index')

    // Verify all classes exist
    expect(RedisService).toBeDefined()
    expect(CacheService).toBeDefined()
    expect(PubSubService).toBeDefined()
    expect(LockService).toBeDefined()
    expect(RateLimitService).toBeDefined()
    expect(JobQueueService).toBeDefined()
    expect(MetricsService).toBeDefined()
    expect(SessionService).toBeDefined()

    // Verify singleton instance exists
    expect(redisService).toBeDefined()
    expect(typeof redisService.getConfig).toBe('function')
    expect(typeof redisService.getFeatures).toBe('function')

    // Verify convenience getters exist
    expect(getRedisCache).toBeDefined()
    expect(getRedisPubSub).toBeDefined()
    expect(getRedisLocks).toBeDefined()
    expect(getRedisRateLimit).toBeDefined()
    expect(getRedisJobQueue).toBeDefined()
    expect(getRedisMetrics).toBeDefined()
    expect(getRedisSessions).toBeDefined()
  })

  test('should provide service instances via singleton pattern', async () => {
    const { 
      CacheService,
      PubSubService,
      LockService,
      RateLimitService,
      JobQueueService,
      MetricsService,
      SessionService
    } = await import('./index')

    // Test singleton pattern - multiple calls should return same instance
    const cache1 = CacheService.getInstance()
    const cache2 = CacheService.getInstance()
    expect(cache1).toBe(cache2)

    const pubsub1 = PubSubService.getInstance()
    const pubsub2 = PubSubService.getInstance()
    expect(pubsub1).toBe(pubsub2)

    const lock1 = LockService.getInstance()
    const lock2 = LockService.getInstance()
    expect(lock1).toBe(lock2)

    const rateLimit1 = RateLimitService.getInstance()
    const rateLimit2 = RateLimitService.getInstance()
    expect(rateLimit1).toBe(rateLimit2)

    const jobQueue1 = JobQueueService.getInstance()
    const jobQueue2 = JobQueueService.getInstance()
    expect(jobQueue1).toBe(jobQueue2)

    const metrics1 = MetricsService.getInstance()
    const metrics2 = MetricsService.getInstance()
    expect(metrics1).toBe(metrics2)

    const session1 = SessionService.getInstance()
    const session2 = SessionService.getInstance()
    expect(session1).toBe(session2)
  })

  test('should expose service configuration', async () => {
    const { redisService, redisFeatures } = await import('./index')

    // Test configuration access
    const config = redisService.getConfig()
    expect(config).toBeDefined()
    expect(config.redis).toBeDefined()
    expect(config.cache).toBeDefined()
    expect(config.session).toBeDefined()
    expect(config.monitoring).toBeDefined()

    // Test features
    const features = redisService.getFeatures()
    expect(features).toBeDefined()
    expect(typeof features.enableCaching).toBe('boolean')
    expect(typeof features.enableSessions).toBe('boolean')
    expect(typeof features.enablePubSub).toBe('boolean')
    expect(typeof features.enableLocks).toBe('boolean')
    expect(typeof features.enableRateLimiting).toBe('boolean')
    expect(typeof features.enableJobs).toBe('boolean')
    expect(typeof features.enableMetrics).toBe('boolean')
  })

  test('should provide comprehensive type exports', async () => {
    // Test that types can be imported (compilation check)
    const types = await import('./types')
    expect(types).toBeDefined()
    
    // These should not throw TypeScript errors if types are properly exported
    expect(typeof types).toBe('object')
  })

  test('should handle service cleanup gracefully', async () => {
    const { 
      CacheService,
      PubSubService,
      LockService,
      RateLimitService,
      JobQueueService,
      MetricsService,
      SessionService
    } = await import('./index')

    // Test that cleanup methods exist and can be called
    const services = [
      PubSubService.getInstance(),
      LockService.getInstance(),
      RateLimitService.getInstance(),
      JobQueueService.getInstance(),
      MetricsService.getInstance(),
      SessionService.getInstance()
    ]

    for (const service of services) {
      expect(typeof service.cleanup).toBe('function')
      // Cleanup should not throw
      await expect(service.cleanup()).resolves.not.toThrow()
    }
  })

  test('should provide mock Redis fallback capability', async () => {
    const { MockRedisService, MockRedisCache } = await import('./mock-redis')
    
    expect(MockRedisService).toBeDefined()
    expect(MockRedisCache).toBeDefined()

    const mockService = MockRedisService.getInstance()
    expect(mockService).toBeDefined()
    expect(typeof mockService.initialize).toBe('function')
    expect(typeof mockService.shutdown).toBe('function')
    expect(typeof mockService.isReady).toBe('function')
    expect(typeof mockService.getHealthStatus).toBe('function')

    const mockCache = new MockRedisCache()
    expect(typeof mockCache.get).toBe('function')
    expect(typeof mockCache.set).toBe('function')
    expect(typeof mockCache.delete).toBe('function')
    expect(typeof mockCache.clear).toBe('function')
  })

  test('should provide Redis configuration utilities', async () => {
    const { 
      getRedisConfig, 
      getRedisServiceConfig, 
      validateRedisEnvironment,
      testRedisConfig,
      redisFeatures 
    } = await import('./config')

    expect(getRedisConfig).toBeDefined()
    expect(getRedisServiceConfig).toBeDefined()
    expect(validateRedisEnvironment).toBeDefined()
    expect(testRedisConfig).toBeDefined()
    expect(redisFeatures).toBeDefined()

    // Test configuration functions
    const config = getRedisConfig()
    expect(config.primary).toBeDefined()
    expect(config.primary.host).toBeDefined()
    expect(config.primary.port).toBeDefined()
    expect(config.primary.type).toBeDefined()

    const serviceConfig = getRedisServiceConfig()
    expect(serviceConfig.redis).toBeDefined()
    expect(serviceConfig.cache).toBeDefined()
    expect(serviceConfig.session).toBeDefined()

    const validation = validateRedisEnvironment()
    expect(validation.isValid).toBeDefined()
    expect(Array.isArray(validation.errors)).toBe(true)
  })
})