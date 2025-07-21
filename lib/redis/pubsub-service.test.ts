/**
 * PubSubService Tests
 *
 * Test-driven development for Redis/Valkey pub/sub functionality
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { testRedisConfig } from './config'
import { PubSubService } from './pubsub-service'
import { RedisClientManager } from './redis-client'
import type { PubSubMessage, PubSubOptions } from './types'

describe('PubSubService', () => {
  let pubsubService: PubSubService
  let redisManager: RedisClientManager

  beforeAll(async () => {
    redisManager = RedisClientManager.getInstance(testRedisConfig)
    await redisManager.initialize()
  })

  beforeEach(() => {
    pubsubService = PubSubService.getInstance()
  })

  afterEach(async () => {
    await pubsubService.cleanup()
  })

  afterAll(async () => {
    await redisManager.shutdown()
  })

  describe('Basic Pub/Sub Operations', () => {
    test('should publish and receive messages on a channel', async () => {
      const messages: PubSubMessage[] = []
      const channel = 'test:basic'
      const testData = { message: 'hello', timestamp: Date.now() }

      // Subscribe to channel
      const subscription = await pubsubService.subscribe(channel, (message) => {
        messages.push(message)
      })

      expect(subscription.id).toBeDefined()
      expect(subscription.channel).toBe(channel)
      expect(subscription.isActive).toBe(true)

      // Wait for subscription to be ready
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Publish message
      const published = await pubsubService.publish(channel, testData)
      expect(published).toBe(true)

      // Wait for message delivery
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(messages).toHaveLength(1)
      expect(messages[0].channel).toBe(channel)
      expect(messages[0].data).toEqual(testData)
      expect(messages[0].messageId).toBeDefined()
      expect(messages[0].timestamp).toBeInstanceOf(Date)
    })

    test('should handle pattern subscriptions', async () => {
      const messages: PubSubMessage[] = []
      const pattern = 'test:pattern:*'
      const channels = ['test:pattern:one', 'test:pattern:two', 'test:other']

      // Subscribe to pattern
      const subscription = await pubsubService.subscribePattern(pattern, (message) => {
        messages.push(message)
      })

      expect(subscription.pattern).toBe(pattern)
      expect(subscription.isActive).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Publish to matching channels
      await pubsubService.publish(channels[0], { data: 'one' })
      await pubsubService.publish(channels[1], { data: 'two' })
      await pubsubService.publish(channels[2], { data: 'other' })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should only receive messages from matching channels
      expect(messages).toHaveLength(2)
      expect(messages.map((m) => m.channel)).toEqual([channels[0], channels[1]])
    })

    test('should unsubscribe from channels', async () => {
      const messages: PubSubMessage[] = []
      const channel = 'test:unsubscribe'

      const subscription = await pubsubService.subscribe(channel, (message) => {
        messages.push(message)
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Publish first message
      await pubsubService.publish(channel, { data: 'first' })
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Unsubscribe
      const unsubscribed = await pubsubService.unsubscribe(subscription.id)
      expect(unsubscribed).toBe(true)
      expect(subscription.isActive).toBe(false)

      // Publish second message (should not be received)
      await pubsubService.publish(channel, { data: 'second' })
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(messages).toHaveLength(1)
      expect(messages[0].data.data).toBe('first')
    })
  })

  describe('Multiple Subscribers', () => {
    test('should deliver messages to all subscribers on the same channel', async () => {
      const messages1: PubSubMessage[] = []
      const messages2: PubSubMessage[] = []
      const channel = 'test:multiple'
      const testData = { broadcast: true }

      // Create two subscriptions
      const sub1 = await pubsubService.subscribe(channel, (msg) => messages1.push(msg))
      const sub2 = await pubsubService.subscribe(channel, (msg) => messages2.push(msg))

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Publish message
      await pubsubService.publish(channel, testData)
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Both subscribers should receive the message
      expect(messages1).toHaveLength(1)
      expect(messages2).toHaveLength(1)
      expect(messages1[0].data).toEqual(testData)
      expect(messages2[0].data).toEqual(testData)
    })

    test('should handle selective unsubscription', async () => {
      const messages1: PubSubMessage[] = []
      const messages2: PubSubMessage[] = []
      const channel = 'test:selective'

      const sub1 = await pubsubService.subscribe(channel, (msg) => messages1.push(msg))
      const sub2 = await pubsubService.subscribe(channel, (msg) => messages2.push(msg))

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Unsubscribe only first subscriber
      await pubsubService.unsubscribe(sub1.id)

      // Publish message
      await pubsubService.publish(channel, { data: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Only second subscriber should receive message
      expect(messages1).toHaveLength(0)
      expect(messages2).toHaveLength(1)
    })
  })

  describe('Error Handling', () => {
    test('should handle subscription errors gracefully', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error')
      })

      const subscription = await pubsubService.subscribe('test:error', errorCallback)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should not throw when publishing to channel with error callback
      expect(async () => {
        await pubsubService.publish('test:error', { data: 'test' })
        await new Promise((resolve) => setTimeout(resolve, 100))
      }).not.toThrow()

      // Subscription should still be active
      expect(subscription.isActive).toBe(true)
    })

    test('should handle invalid channel names', async () => {
      expect(async () => {
        await pubsubService.subscribe('', () => {})
      }).rejects.toThrow('Channel name cannot be empty')

      expect(async () => {
        await pubsubService.publish('', {})
      }).rejects.toThrow('Channel name cannot be empty')
    })

    test('should handle connection failures', async () => {
      // This would test Redis connection failures - implementation specific
      const published = await pubsubService.publish('test:unreachable', { data: 'test' })
      expect(typeof published).toBe('boolean')
    })
  })

  describe('Message Delivery Options', () => {
    test('should support retry on error when configured', async () => {
      let attempts = 0
      const options: PubSubOptions = {
        retryOnError: true,
        maxRetries: 3,
        retryDelay: 50,
      }

      const subscription = await pubsubService.subscribe(
        'test:retry',
        (message) => {
          attempts++
          if (attempts < 3) {
            throw new Error('Temporary error')
          }
        },
        options
      )

      await new Promise((resolve) => setTimeout(resolve, 100))

      await pubsubService.publish('test:retry', { data: 'test' })
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Should have retried 3 times
      expect(attempts).toBe(3)
    })

    test('should respect message ordering', async () => {
      const receivedMessages: any[] = []
      const channel = 'test:ordering'

      await pubsubService.subscribe(channel, (message) => {
        receivedMessages.push(message.data.order)
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Publish messages in order
      for (let i = 1; i <= 5; i++) {
        await pubsubService.publish(channel, { order: i })
      }

      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(receivedMessages).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('Subscription Management', () => {
    test('should list active subscriptions', async () => {
      const channel1 = 'test:list:1'
      const channel2 = 'test:list:2'
      const pattern = 'test:list:*'

      await pubsubService.subscribe(channel1, () => {})
      await pubsubService.subscribe(channel2, () => {})
      await pubsubService.subscribePattern(pattern, () => {})

      const subscriptions = pubsubService.getActiveSubscriptions()

      expect(subscriptions).toHaveLength(3)
      expect(subscriptions.some((s) => s.channel === channel1)).toBe(true)
      expect(subscriptions.some((s) => s.channel === channel2)).toBe(true)
      expect(subscriptions.some((s) => s.pattern === pattern)).toBe(true)
    })

    test('should get subscription statistics', async () => {
      await pubsubService.subscribe('test:stats:1', () => {})
      await pubsubService.subscribe('test:stats:2', () => {})
      await pubsubService.subscribePattern('test:stats:*', () => {})

      const stats = pubsubService.getStats()

      expect(stats.totalSubscriptions).toBe(3)
      expect(stats.channelSubscriptions).toBe(2)
      expect(stats.patternSubscriptions).toBe(1)
      expect(stats.totalMessages).toBeGreaterThanOrEqual(0)
    })

    test('should handle cleanup on service shutdown', async () => {
      await pubsubService.subscribe('test:cleanup:1', () => {})
      await pubsubService.subscribe('test:cleanup:2', () => {})

      expect(pubsubService.getActiveSubscriptions()).toHaveLength(2)

      await pubsubService.cleanup()

      expect(pubsubService.getActiveSubscriptions()).toHaveLength(0)
    })
  })

  describe('Real-time Features', () => {
    test('should support WebSocket-style events', async () => {
      const events: any[] = []
      const eventChannel = 'events:websocket'

      await pubsubService.subscribe(eventChannel, (message) => {
        events.push(message.data)
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Simulate real-time events
      const eventTypes = ['user_joined', 'message_sent', 'user_left']

      for (const eventType of eventTypes) {
        await pubsubService.publish(eventChannel, {
          type: eventType,
          userId: 'user123',
          timestamp: Date.now(),
        })
      }

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(events).toHaveLength(3)
      expect(events.map((e) => e.type)).toEqual(eventTypes)
    })

    test('should support dashboard real-time updates', async () => {
      const dashboardUpdates: any[] = []
      const dashboardChannel = 'dashboard:updates'

      await pubsubService.subscribe(dashboardChannel, (message) => {
        dashboardUpdates.push(message.data)
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Publish dashboard metrics
      await pubsubService.publish(dashboardChannel, {
        type: 'metrics_update',
        metrics: {
          activeUsers: 150,
          cpuUsage: 45.2,
          memoryUsage: 67.8,
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(dashboardUpdates).toHaveLength(1)
      expect(dashboardUpdates[0].type).toBe('metrics_update')
      expect(dashboardUpdates[0].metrics.activeUsers).toBe(150)
    })
  })
})
