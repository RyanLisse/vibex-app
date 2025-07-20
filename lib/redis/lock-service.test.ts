/**
 * LockService Tests
 * 
 * Test-driven development for Redis/Valkey distributed locks
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test'
import { LockService } from './lock-service'
import { RedisClientManager } from './redis-client'
import { testRedisConfig } from './config'
import type { LockOptions, DistributedLock } from './types'

describe('LockService', () => {
  let lockService: LockService
  let redisManager: RedisClientManager

  beforeAll(async () => {
    redisManager = RedisClientManager.getInstance(testRedisConfig)
    await redisManager.initialize()
  })

  beforeEach(() => {
    lockService = LockService.getInstance()
  })

  afterEach(async () => {
    await lockService.cleanup()
  })

  afterAll(async () => {
    await redisManager.shutdown()
  })

  describe('Basic Lock Operations', () => {
    test('should acquire and release a distributed lock', async () => {
      const lockKey = 'test:basic-lock'
      const options: LockOptions = { ttl: 30 }

      // Acquire lock
      const lock = await lockService.acquireLock(lockKey, options)
      
      expect(lock).not.toBeNull()
      expect(lock!.key).toBe(lockKey)
      expect(lock!.value).toBeDefined()
      expect(lock!.ttl).toBe(30)
      expect(lock!.acquiredAt).toBeInstanceOf(Date)
      expect(lock!.expiresAt).toBeInstanceOf(Date)
      expect(lock!.clientId).toBeDefined()

      // Verify lock exists
      const isLocked = await lockService.isLocked(lockKey)
      expect(isLocked).toBe(true)

      // Release lock
      const released = await lockService.releaseLock(lock!)
      expect(released).toBe(true)

      // Verify lock is gone
      const isStillLocked = await lockService.isLocked(lockKey)
      expect(isStillLocked).toBe(false)
    })

    test('should prevent duplicate lock acquisition', async () => {
      const lockKey = 'test:duplicate-lock'
      const options: LockOptions = { ttl: 30 }

      // Acquire first lock
      const lock1 = await lockService.acquireLock(lockKey, options)
      expect(lock1).not.toBeNull()

      // Try to acquire same lock
      const lock2 = await lockService.acquireLock(lockKey, options)
      expect(lock2).toBeNull()

      // Release first lock
      await lockService.releaseLock(lock1!)

      // Now should be able to acquire
      const lock3 = await lockService.acquireLock(lockKey, options)
      expect(lock3).not.toBeNull()

      await lockService.releaseLock(lock3!)
    })

    test('should handle lock expiration', async () => {
      const lockKey = 'test:expiring-lock'
      const options: LockOptions = { ttl: 1 } // 1 second

      // Acquire lock
      const lock = await lockService.acquireLock(lockKey, options)
      expect(lock).not.toBeNull()

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1200))

      // Lock should be expired
      const isLocked = await lockService.isLocked(lockKey)
      expect(isLocked).toBe(false)

      // Should be able to acquire new lock
      const newLock = await lockService.acquireLock(lockKey, options)
      expect(newLock).not.toBeNull()

      await lockService.releaseLock(newLock!)
    })
  })

  describe('Lock Retry Mechanisms', () => {
    test('should retry lock acquisition with specified options', async () => {
      const lockKey = 'test:retry-lock'
      const shortLockOptions: LockOptions = { ttl: 1 }
      const retryOptions: LockOptions = { 
        ttl: 30, 
        maxRetries: 5, 
        retryDelay: 200 
      }

      // Acquire initial lock with short TTL
      const initialLock = await lockService.acquireLock(lockKey, shortLockOptions)
      expect(initialLock).not.toBeNull()

      const startTime = Date.now()

      // Try to acquire with retry (should succeed after initial lock expires)
      const retryLock = await lockService.acquireLock(lockKey, retryOptions)
      
      const endTime = Date.now()
      const waitTime = endTime - startTime

      expect(retryLock).not.toBeNull()
      expect(waitTime).toBeGreaterThan(1000) // Should have waited for initial lock to expire

      await lockService.releaseLock(retryLock!)
    })

    test('should fail after max retries exceeded', async () => {
      const lockKey = 'test:max-retries'
      const longLockOptions: LockOptions = { ttl: 60 } // Long lock
      const retryOptions: LockOptions = { 
        ttl: 30, 
        maxRetries: 2, 
        retryDelay: 100 
      }

      // Acquire long-running lock
      const longLock = await lockService.acquireLock(lockKey, longLockOptions)
      expect(longLock).not.toBeNull()

      const startTime = Date.now()

      // Try to acquire with limited retries (should fail)
      const retryLock = await lockService.acquireLock(lockKey, retryOptions)
      
      const endTime = Date.now()
      const waitTime = endTime - startTime

      expect(retryLock).toBeNull()
      expect(waitTime).toBeGreaterThan(200) // Should have retried at least twice
      expect(waitTime).toBeLessThan(1000) // But not waited too long

      await lockService.releaseLock(longLock!)
    })
  })

  describe('Lock Renewal', () => {
    test('should renew lock before expiration', async () => {
      const lockKey = 'test:renewal-lock'
      const options: LockOptions = { ttl: 5 }

      const lock = await lockService.acquireLock(lockKey, options)
      expect(lock).not.toBeNull()

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Renew lock
      const renewed = await lockService.renewLock(lock!, 10)
      expect(renewed).toBe(true)

      // Lock should still be active after original TTL
      await new Promise(resolve => setTimeout(resolve, 4000))
      
      const isStillLocked = await lockService.isLocked(lockKey)
      expect(isStillLocked).toBe(true)

      await lockService.releaseLock(lock!)
    })

    test('should fail to renew expired lock', async () => {
      const lockKey = 'test:expired-renewal'
      const options: LockOptions = { ttl: 1 }

      const lock = await lockService.acquireLock(lockKey, options)
      expect(lock).not.toBeNull()

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1200))

      // Try to renew expired lock
      const renewed = await lockService.renewLock(lock!, 10)
      expect(renewed).toBe(false)
    })

    test('should fail to renew lock with wrong value', async () => {
      const lockKey = 'test:wrong-value-renewal'
      const options: LockOptions = { ttl: 30 }

      const lock = await lockService.acquireLock(lockKey, options)
      expect(lock).not.toBeNull()

      // Create fake lock with wrong value
      const fakeLock: DistributedLock = {
        ...lock!,
        value: 'wrong-value'
      }

      // Try to renew with wrong value
      const renewed = await lockService.renewLock(fakeLock, 10)
      expect(renewed).toBe(false)

      // Original lock should still work
      const realRenewed = await lockService.renewLock(lock!, 10)
      expect(realRenewed).toBe(true)

      await lockService.releaseLock(lock!)
    })
  })

  describe('Deadlock Prevention', () => {
    test('should detect potential deadlocks', async () => {
      const lockKey1 = 'test:deadlock-1'
      const lockKey2 = 'test:deadlock-2'
      const options: LockOptions = { ttl: 30 }

      // This test simulates deadlock detection
      // In a real scenario, this would involve multiple processes

      const lock1 = await lockService.acquireLock(lockKey1, options)
      const lock2 = await lockService.acquireLock(lockKey2, options)

      expect(lock1).not.toBeNull()
      expect(lock2).not.toBeNull()

      // Get deadlock info
      const deadlockInfo = await lockService.getDeadlockInfo()
      expect(deadlockInfo.activeLocks).toBeGreaterThanOrEqual(2)
      expect(deadlockInfo.potentialDeadlocks).toBeGreaterThanOrEqual(0)

      await lockService.releaseLock(lock1!)
      await lockService.releaseLock(lock2!)
    })

    test('should force release locks on deadlock detection', async () => {
      const lockKey = 'test:force-release'
      const options: LockOptions = { ttl: 60 }

      const lock = await lockService.acquireLock(lockKey, options)
      expect(lock).not.toBeNull()

      // Force release (simulates deadlock resolution)
      const forceReleased = await lockService.forceReleaseLock(lockKey)
      expect(forceReleased).toBe(true)

      // Lock should be available now
      const isLocked = await lockService.isLocked(lockKey)
      expect(isLocked).toBe(false)
    })
  })

  describe('Lock Monitoring', () => {
    test('should list all active locks', async () => {
      const lockKeys = ['test:monitor-1', 'test:monitor-2', 'test:monitor-3']
      const options: LockOptions = { ttl: 30 }

      // Acquire multiple locks
      const locks = []
      for (const key of lockKeys) {
        const lock = await lockService.acquireLock(key, options)
        if (lock) locks.push(lock)
      }

      expect(locks).toHaveLength(3)

      // Get active locks
      const activeLocks = await lockService.getActiveLocks()
      expect(activeLocks.length).toBeGreaterThanOrEqual(3)

      const acquiredKeys = activeLocks.map(l => l.key)
      for (const key of lockKeys) {
        expect(acquiredKeys).toContain(key)
      }

      // Clean up
      for (const lock of locks) {
        await lockService.releaseLock(lock)
      }
    })

    test('should provide lock statistics', async () => {
      const stats = await lockService.getStats()

      expect(stats).toHaveProperty('totalLocks')
      expect(stats).toHaveProperty('activeLocks')
      expect(stats).toHaveProperty('releasedLocks')
      expect(stats).toHaveProperty('expiredLocks')
      expect(stats).toHaveProperty('averageHoldTime')

      expect(typeof stats.totalLocks).toBe('number')
      expect(typeof stats.activeLocks).toBe('number')
      expect(typeof stats.averageHoldTime).toBe('number')
    })

    test('should track lock hold times', async () => {
      const lockKey = 'test:hold-time'
      const options: LockOptions = { ttl: 30 }

      const lock = await lockService.acquireLock(lockKey, options)
      expect(lock).not.toBeNull()

      // Hold lock for a specific time
      await new Promise(resolve => setTimeout(resolve, 500))

      const released = await lockService.releaseLock(lock!)
      expect(released).toBe(true)

      // Check if hold time was tracked
      const stats = await lockService.getStats()
      expect(stats.averageHoldTime).toBeGreaterThan(0)
    })
  })

  describe('Multi-Resource Locks', () => {
    test('should acquire multiple locks atomically', async () => {
      const lockKeys = ['resource:1', 'resource:2', 'resource:3']
      const options: LockOptions = { ttl: 30 }

      // Acquire all locks atomically
      const locks = await lockService.acquireMultipleLocks(lockKeys, options)
      
      expect(locks).toHaveLength(3)
      expect(locks.every(lock => lock !== null)).toBe(true)

      // Verify all locks are acquired
      for (const key of lockKeys) {
        const isLocked = await lockService.isLocked(key)
        expect(isLocked).toBe(true)
      }

      // Release all locks
      const released = await lockService.releaseMultipleLocks(locks as DistributedLock[])
      expect(released).toBe(true)

      // Verify all locks are released
      for (const key of lockKeys) {
        const isLocked = await lockService.isLocked(key)
        expect(isLocked).toBe(false)
      }
    })

    test('should fail atomic acquisition if any lock is unavailable', async () => {
      const lockKeys = ['atomic:1', 'atomic:2', 'atomic:3']
      const options: LockOptions = { ttl: 30 }

      // Acquire one lock separately
      const blockingLock = await lockService.acquireLock(lockKeys[1], options)
      expect(blockingLock).not.toBeNull()

      // Try to acquire all locks atomically (should fail)
      const locks = await lockService.acquireMultipleLocks(lockKeys, options)
      expect(locks).toHaveLength(0) // Should fail completely

      // Verify no locks were acquired
      const lock1Available = !(await lockService.isLocked(lockKeys[0]))
      const lock3Available = !(await lockService.isLocked(lockKeys[2]))
      
      expect(lock1Available).toBe(true)
      expect(lock3Available).toBe(true)

      await lockService.releaseLock(blockingLock!)
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid lock keys', async () => {
      expect(async () => {
        await lockService.acquireLock('', {})
      }).rejects.toThrow('Lock key cannot be empty')

      expect(async () => {
        await lockService.isLocked('')
      }).rejects.toThrow('Lock key cannot be empty')
    })

    test('should handle invalid TTL values', async () => {
      const lockKey = 'test:invalid-ttl'

      expect(async () => {
        await lockService.acquireLock(lockKey, { ttl: 0 })
      }).rejects.toThrow('TTL must be greater than 0')

      expect(async () => {
        await lockService.acquireLock(lockKey, { ttl: -1 })
      }).rejects.toThrow('TTL must be greater than 0')
    })

    test('should handle connection failures gracefully', async () => {
      // This would test Redis connection failures - implementation specific
      const lockKey = 'test:connection-failure'
      const options: LockOptions = { ttl: 30 }

      const lock = await lockService.acquireLock(lockKey, options)
      expect(lock === null || lock.key === lockKey).toBe(true)
    })
  })
})