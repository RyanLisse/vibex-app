/**
 * LockService - Redis/Valkey Distributed Locks Implementation
 * 
 * Provides distributed locking for coordination across multiple instances
 */

import { randomUUID } from 'crypto'
import type Redis from 'ioredis'
import { ObservabilityService } from '../observability'
import { RedisClientManager } from './redis-client'
import type { DistributedLock, LockOptions } from './types'

export class LockService {
  private static instance: LockService
  private redisManager: RedisClientManager
  private observability = ObservabilityService.getInstance()
  private activeLocks = new Map<string, DistributedLock>()
  private clientId: string
  private stats = {
    totalLocks: 0,
    activeLocks: 0,
    releasedLocks: 0,
    expiredLocks: 0,
    totalHoldTime: 0
  }

  private constructor() {
    this.redisManager = RedisClientManager.getInstance()
    this.clientId = randomUUID()
  }

  static getInstance(): LockService {
    if (!LockService.instance) {
      LockService.instance = new LockService()
    }
    return LockService.instance
  }

  async acquireLock(key: string, options?: LockOptions): Promise<DistributedLock | null> {
    this.validateLockKey(key)
    this.validateLockOptions(options)

    return this.observability.trackOperation('lock.acquire', async () => {
      const client = this.redisManager.getClient(options?.clientName)
      const lockKey = this.buildLockKey(key)
      const lockValue = this.generateLockValue()
      const ttl = options?.ttl || 30
      const maxRetries = options?.maxRetries || 0
      const retryDelay = options?.retryDelay || 100

      let attempts = 0
      const startTime = Date.now()

      while (attempts <= maxRetries) {
        try {
          // Try to acquire lock using SET with NX and EX
          const result = await client.set(lockKey, lockValue, 'EX', ttl, 'NX')
          
          if (result === 'OK') {
            const lock: DistributedLock = {
              key,
              value: lockValue,
              ttl,
              acquiredAt: new Date(),
              expiresAt: new Date(Date.now() + ttl * 1000),
              clientId: this.clientId
            }

            this.activeLocks.set(key, lock)
            this.stats.totalLocks++
            this.stats.activeLocks++

            this.observability.recordEvent('lock.acquired', 1, {
              key,
              ttl: ttl.toString(),
              attempts: attempts.toString()
            })

            return lock
          }

          // Lock is held by someone else, retry if configured
          if (attempts < maxRetries) {
            attempts++
            await new Promise(resolve => setTimeout(resolve, retryDelay))
          } else {
            break
          }
        } catch (error) {
          this.observability.recordError('lock.acquire.error', error as Error, {
            key,
            attempt: attempts.toString()
          })
          break
        }
      }

      this.observability.recordEvent('lock.acquire.failed', 1, {
        key,
        attempts: attempts.toString(),
        duration: (Date.now() - startTime).toString()
      })

      return null
    })
  }

  async releaseLock(lock: DistributedLock): Promise<boolean> {
    return this.observability.trackOperation('lock.release', async () => {
      const client = this.redisManager.getClient()
      const lockKey = this.buildLockKey(lock.key)

      try {
        // Use Lua script to atomically check value and delete
        const luaScript = `
          if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
          else
            return 0
          end
        `

        const result = await client.eval(luaScript, 1, lockKey, lock.value) as number

        if (result === 1) {
          const holdTime = Date.now() - lock.acquiredAt.getTime()
          this.stats.totalHoldTime += holdTime
          this.stats.activeLocks--
          this.stats.releasedLocks++

          this.activeLocks.delete(lock.key)

          this.observability.recordEvent('lock.released', 1, {
            key: lock.key,
            holdTime: holdTime.toString()
          })

          return true
        }

        // Lock was not owned by this client or already expired
        this.observability.recordEvent('lock.release.failed', 1, {
          key: lock.key,
          reason: 'not_owned_or_expired'
        })

        return false
      } catch (error) {
        this.observability.recordError('lock.release.error', error as Error, {
          key: lock.key
        })
        return false
      }
    })
  }

  async renewLock(lock: DistributedLock, newTtl: number): Promise<boolean> {
    return this.observability.trackOperation('lock.renew', async () => {
      const client = this.redisManager.getClient()
      const lockKey = this.buildLockKey(lock.key)

      try {
        // Use Lua script to atomically check value and extend TTL
        const luaScript = `
          if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("EXPIRE", KEYS[1], ARGV[2])
          else
            return 0
          end
        `

        const result = await client.eval(luaScript, 1, lockKey, lock.value, newTtl) as number

        if (result === 1) {
          lock.ttl = newTtl
          lock.expiresAt = new Date(Date.now() + newTtl * 1000)

          this.observability.recordEvent('lock.renewed', 1, {
            key: lock.key,
            newTtl: newTtl.toString()
          })

          return true
        }

        return false
      } catch (error) {
        this.observability.recordError('lock.renew.error', error as Error, {
          key: lock.key
        })
        return false
      }
    })
  }

  async isLocked(key: string): Promise<boolean> {
    const client = this.redisManager.getClient()
    const lockKey = this.buildLockKey(key)

    try {
      const exists = await client.exists(lockKey)
      return exists === 1
    } catch (error) {
      this.observability.recordError('lock.check.error', error as Error)
      return false
    }
  }

  async forceReleaseLock(key: string): Promise<boolean> {
    return this.observability.trackOperation('lock.force_release', async () => {
      const client = this.redisManager.getClient()
      const lockKey = this.buildLockKey(key)

      try {
        const result = await client.del(lockKey)
        
        if (result === 1) {
          this.activeLocks.delete(key)
          this.stats.activeLocks--

          this.observability.recordEvent('lock.force_released', 1, { key })
          return true
        }

        return false
      } catch (error) {
        this.observability.recordError('lock.force_release.error', error as Error)
        return false
      }
    })
  }

  async acquireMultipleLocks(keys: string[], options?: LockOptions): Promise<DistributedLock[]> {
    // Sort keys to prevent deadlocks
    const sortedKeys = [...keys].sort()
    const acquiredLocks: DistributedLock[] = []

    try {
      for (const key of sortedKeys) {
        const lock = await this.acquireLock(key, options)
        if (!lock) {
          // Failed to acquire lock, release all previously acquired locks
          await this.releaseMultipleLocks(acquiredLocks)
          return []
        }
        acquiredLocks.push(lock)
      }

      this.observability.recordEvent('lock.multiple_acquired', 1, {
        count: acquiredLocks.length.toString()
      })

      return acquiredLocks
    } catch (error) {
      // Release any acquired locks in case of error
      await this.releaseMultipleLocks(acquiredLocks)
      this.observability.recordError('lock.multiple_acquire.error', error as Error, {
        keys: keys.join(',')
      })
      return []
    }
  }

  async releaseMultipleLocks(locks: DistributedLock[]): Promise<boolean> {
    const releasePromises = locks.map(lock => this.releaseLock(lock))
    const results = await Promise.all(releasePromises)
    
    const allReleased = results.every(result => result)
    
    this.observability.recordEvent('lock.multiple_released', 1, {
      count: locks.length.toString(),
      success: allReleased.toString()
    })

    return allReleased
  }

  async getActiveLocks(): Promise<DistributedLock[]> {
    return Array.from(this.activeLocks.values())
  }

  async getDeadlockInfo(): Promise<{
    activeLocks: number
    potentialDeadlocks: number
    locksByClient: Record<string, number>
  }> {
    const activeLocks = await this.getActiveLocks()
    const locksByClient: Record<string, number> = {}

    for (const lock of activeLocks) {
      locksByClient[lock.clientId] = (locksByClient[lock.clientId] || 0) + 1
    }

    // Simple deadlock detection - clients with multiple locks
    const potentialDeadlocks = Object.values(locksByClient)
      .filter(count => count > 1).length

    return {
      activeLocks: activeLocks.length,
      potentialDeadlocks,
      locksByClient
    }
  }

  async getStats(): Promise<typeof this.stats & { averageHoldTime: number }> {
    const averageHoldTime = this.stats.releasedLocks > 0 
      ? this.stats.totalHoldTime / this.stats.releasedLocks 
      : 0

    return {
      ...this.stats,
      averageHoldTime
    }
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up Lock service...')

    // Release all active locks
    const activeLocks = Array.from(this.activeLocks.values())
    await this.releaseMultipleLocks(activeLocks)

    this.activeLocks.clear()
    
    // Reset stats
    this.stats = {
      totalLocks: 0,
      activeLocks: 0,
      releasedLocks: 0,
      expiredLocks: 0,
      totalHoldTime: 0
    }

    console.log('Lock service cleaned up successfully')
  }

  // Private helper methods
  private validateLockKey(key: string): void {
    if (!key || key.trim() === '') {
      throw new Error('Lock key cannot be empty')
    }
  }

  private validateLockOptions(options?: LockOptions): void {
    if (options?.ttl !== undefined && options.ttl <= 0) {
      throw new Error('TTL must be greater than 0')
    }

    if (options?.maxRetries !== undefined && options.maxRetries < 0) {
      throw new Error('Max retries cannot be negative')
    }

    if (options?.retryDelay !== undefined && options.retryDelay < 0) {
      throw new Error('Retry delay cannot be negative')
    }
  }

  private buildLockKey(key: string): string {
    return `lock:${key}`
  }

  private generateLockValue(): string {
    return `${this.clientId}:${Date.now()}:${randomUUID()}`
  }
}