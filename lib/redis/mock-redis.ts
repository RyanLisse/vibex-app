/**
 * Mock Redis Implementation
 *
 * Provides a mock Redis interface for testing and development
 * when Redis is not available.
 */

import type { CacheKey, CacheValue, CacheOptions } from './types'

export class MockRedisCache {
  private cache = new Map<string, { value: any; expiry?: number }>()

  async get<T>(key: CacheKey): Promise<T | null> {
    const fullKey = this.buildKey(key)
    const item = this.cache.get(fullKey)

    if (!item) {
      return null
    }

    // Check expiry
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(fullKey)
      return null
    }

    return item.value as T
  }

  async set<T>(key: CacheKey, value: CacheValue<T>, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.buildKey(key)
    const ttl = options?.ttl || 3600 // Default 1 hour
    const expiry = Date.now() + ttl * 1000

    this.cache.set(fullKey, {
      value,
      expiry,
    })

    return true
  }

  async delete(key: CacheKey): Promise<boolean> {
    const fullKey = this.buildKey(key)
    return this.cache.delete(fullKey)
  }

  async clear(): Promise<boolean> {
    this.cache.clear()
    return true
  }

  async exists(key: CacheKey): Promise<boolean> {
    const fullKey = this.buildKey(key)
    const item = this.cache.get(fullKey)

    if (!item) {
      return false
    }

    // Check expiry
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(fullKey)
      return false
    }

    return true
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return Array.from(this.cache.keys()).filter((key) => regex.test(key))
  }

  async ttl(key: CacheKey): Promise<number> {
    const fullKey = this.buildKey(key)
    const item = this.cache.get(fullKey)

    if (!item || !item.expiry) {
      return -1
    }

    const remaining = Math.max(0, item.expiry - Date.now())
    return Math.floor(remaining / 1000)
  }

  async expire(key: CacheKey, ttl: number): Promise<boolean> {
    const fullKey = this.buildKey(key)
    const item = this.cache.get(fullKey)

    if (!item) {
      return false
    }

    item.expiry = Date.now() + ttl * 1000
    return true
  }

  // Utility methods
  private buildKey(key: CacheKey): string {
    if (typeof key === 'string') {
      return `mock:${key}`
    }
    return `mock:${key.join(':')}`
  }

  // Mock-specific methods
  size(): number {
    return this.cache.size
  }

  getAllKeys(): string[] {
    return Array.from(this.cache.keys())
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: this.getAllKeys(),
    }
  }
}

export class MockRedisService {
  private static instance: MockRedisService
  public cache: MockRedisCache
  private isInitialized = false

  private constructor() {
    this.cache = new MockRedisCache()
  }

  static getInstance(): MockRedisService {
    if (!MockRedisService.instance) {
      MockRedisService.instance = new MockRedisService()
    }
    return MockRedisService.instance
  }

  async initialize(): Promise<void> {
    console.log('🔧 Using Mock Redis (Redis not available)')
    this.isInitialized = true
  }

  async shutdown(): Promise<void> {
    await this.cache.clear()
    this.isInitialized = false
  }

  isReady(): boolean {
    return this.isInitialized
  }

  getHealthStatus() {
    return {
      status: 'healthy',
      type: 'mock',
      uptime: 0,
      memory: {
        used: 0,
        peak: 0,
      },
      stats: this.cache.getStats(),
    }
  }
}

// Export singleton instance
export const mockRedisService = MockRedisService.getInstance()
export const mockRedisCache = mockRedisService.cache

// Mock initialization function
export async function initializeMockRedis(): Promise<void> {
  await mockRedisService.initialize()
}
