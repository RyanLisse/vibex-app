/**
 * PubSubService - Redis/Valkey Pub/Sub Implementation
 * 
 * Provides real-time messaging and event broadcasting capabilities
 */

import { randomUUID } from 'crypto'
import type Redis from 'ioredis'
import { ObservabilityService } from '../observability'
import { RedisClientManager } from './redis-client'
import type { PubSubMessage, PubSubOptions, PubSubSubscription } from './types'

export class PubSubService {
  private static instance: PubSubService
  private redisManager: RedisClientManager
  private observability = ObservabilityService.getInstance()
  private subscriptions = new Map<string, PubSubSubscription>()
  private subscriberClient?: Redis
  private publisherClient?: Redis
  private isInitialized = false

  private constructor() {
    this.redisManager = RedisClientManager.getInstance()
  }

  static getInstance(): PubSubService {
    if (!PubSubService.instance) {
      PubSubService.instance = new PubSubService()
    }
    return PubSubService.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    return this.observability.trackOperation('pubsub.initialize', async () => {
      try {
        // Get dedicated pub/sub clients
        this.subscriberClient = this.redisManager.getClient('pubsub')
        this.publisherClient = this.redisManager.getClient('primary')

        this.isInitialized = true
        console.log('PubSub service initialized successfully')
      } catch (error) {
        console.error('Failed to initialize PubSub service:', error)
        throw error
      }
    })
  }

  async subscribe(
    channel: string,
    callback: (message: PubSubMessage) => void,
    options?: PubSubOptions
  ): Promise<PubSubSubscription> {
    this.validateChannel(channel)
    await this.ensureInitialized()

    return this.observability.trackOperation('pubsub.subscribe', async () => {
      const subscriptionId = randomUUID()
      const subscription: PubSubSubscription = {
        id: subscriptionId,
        channel,
        callback: this.wrapCallback(callback, options),
        options,
        createdAt: new Date(),
        isActive: true
      }

      this.subscriptions.set(subscriptionId, subscription)

      // Subscribe to Redis channel
      await this.subscriberClient!.subscribe(channel)

      // Set up message handler if this is the first subscription
      if (this.subscriptions.size === 1) {
        this.setupMessageHandler()
      }

      this.observability.recordMetric('pubsub.subscription.created', 1, {
        channel,
        subscriptions: this.subscriptions.size.toString()
      })

      return subscription
    })
  }

  async subscribePattern(
    pattern: string,
    callback: (message: PubSubMessage) => void,
    options?: PubSubOptions
  ): Promise<PubSubSubscription> {
    this.validateChannel(pattern)
    await this.ensureInitialized()

    return this.observability.trackOperation('pubsub.subscribe_pattern', async () => {
      const subscriptionId = randomUUID()
      const subscription: PubSubSubscription = {
        id: subscriptionId,
        channel: '',
        pattern,
        callback: this.wrapCallback(callback, options),
        options,
        createdAt: new Date(),
        isActive: true
      }

      this.subscriptions.set(subscriptionId, subscription)

      // Subscribe to Redis pattern
      await this.subscriberClient!.psubscribe(pattern)

      // Set up pattern message handler if this is the first pattern subscription
      if (this.subscriptions.size === 1) {
        this.setupPatternMessageHandler()
      }

      this.observability.recordMetric('pubsub.pattern_subscription.created', 1, {
        pattern,
        subscriptions: this.subscriptions.size.toString()
      })

      return subscription
    })
  }

  async unsubscribe(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) {
      return false
    }

    return this.observability.trackOperation('pubsub.unsubscribe', async () => {
      try {
        subscription.isActive = false

        if (subscription.pattern) {
          await this.subscriberClient!.punsubscribe(subscription.pattern)
          this.observability.recordMetric('pubsub.pattern_subscription.removed', 1, {
            pattern: subscription.pattern
          })
        } else {
          await this.subscriberClient!.unsubscribe(subscription.channel)
          this.observability.recordMetric('pubsub.subscription.removed', 1, {
            channel: subscription.channel
          })
        }

        this.subscriptions.delete(subscriptionId)
        return true
      } catch (error) {
        this.observability.trackError('pubsub.unsubscribe.error', error as Error, {
          subscriptionId
        })
        return false
      }
    })
  }

  async publish(channel: string, data: any): Promise<boolean> {
    this.validateChannel(channel)
    await this.ensureInitialized()

    return this.observability.trackOperation('pubsub.publish', async () => {
      try {
        const message: PubSubMessage = {
          channel,
          data,
          timestamp: new Date(),
          messageId: randomUUID()
        }

        const serializedMessage = JSON.stringify(message)
        const subscriberCount = await this.publisherClient!.publish(channel, serializedMessage)

        this.observability.recordMetric('pubsub.message.published', 1, {
          channel,
          subscribers: subscriberCount.toString()
        })

        return true
      } catch (error) {
        this.observability.trackError('pubsub.publish.error', error as Error, {
          channel
        })
        return false
      }
    })
  }

  getActiveSubscriptions(): PubSubSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.isActive)
  }

  getStats() {
    const activeSubscriptions = this.getActiveSubscriptions()
    const channelSubscriptions = activeSubscriptions.filter(sub => !sub.pattern).length
    const patternSubscriptions = activeSubscriptions.filter(sub => sub.pattern).length

    return {
      totalSubscriptions: activeSubscriptions.length,
      channelSubscriptions,
      patternSubscriptions,
      totalMessages: 0 // This would be tracked in a real implementation
    }
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up PubSub service...')

    // Unsubscribe from all channels and patterns
    const unsubscribePromises = Array.from(this.subscriptions.keys()).map(id => 
      this.unsubscribe(id)
    )
    await Promise.all(unsubscribePromises)

    this.subscriptions.clear()
    this.isInitialized = false

    console.log('PubSub service cleaned up successfully')
  }

  // Private helper methods
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  private validateChannel(channel: string): void {
    if (!channel || channel.trim() === '') {
      throw new Error('Channel name cannot be empty')
    }
  }

  private wrapCallback(
    callback: (message: PubSubMessage) => void,
    options?: PubSubOptions
  ): (message: PubSubMessage) => void {
    return async (message: PubSubMessage) => {
      try {
        await callback(message)
      } catch (error) {
        console.error('PubSub callback error:', error)
        this.observability.trackError('pubsub.callback.error', error as Error, {
          channel: message.channel
        })

        // Retry logic if enabled
        if (options?.retryOnError && options.maxRetries && options.maxRetries > 0) {
          await this.retryCallback(callback, message, options)
        }
      }
    }
  }

  private async retryCallback(
    callback: (message: PubSubMessage) => void,
    message: PubSubMessage,
    options: PubSubOptions,
    attempt = 1
  ): Promise<void> {
    if (attempt > (options.maxRetries || 3)) {
      return
    }

    try {
      // Wait for retry delay
      if (options.retryDelay) {
        await new Promise(resolve => setTimeout(resolve, options.retryDelay))
      }

      await callback(message)
    } catch (error) {
      console.error(`PubSub callback retry ${attempt} failed:`, error)
      await this.retryCallback(callback, message, options, attempt + 1)
    }
  }

  private setupMessageHandler(): void {
    this.subscriberClient!.on('message', (channel: string, messageData: string) => {
      try {
        const message: PubSubMessage = JSON.parse(messageData)
        
        // Find matching subscriptions
        const matchingSubscriptions = Array.from(this.subscriptions.values())
          .filter(sub => sub.isActive && sub.channel === channel)

        for (const subscription of matchingSubscriptions) {
          subscription.callback(message)
        }

        this.observability.recordMetric('pubsub.message.received', 1, {
          channel,
          subscribers: matchingSubscriptions.length.toString()
        })
      } catch (error) {
        console.error('Failed to process PubSub message:', error)
        this.observability.trackError('pubsub.message.processing.error', error as Error, {
          channel
        })
      }
    })
  }

  private setupPatternMessageHandler(): void {
    this.subscriberClient!.on('pmessage', (pattern: string, channel: string, messageData: string) => {
      try {
        const message: PubSubMessage = JSON.parse(messageData)
        message.pattern = pattern
        
        // Find matching pattern subscriptions
        const matchingSubscriptions = Array.from(this.subscriptions.values())
          .filter(sub => sub.isActive && sub.pattern === pattern)

        for (const subscription of matchingSubscriptions) {
          subscription.callback(message)
        }

        this.observability.recordMetric('pubsub.pattern_message.received', 1, {
          pattern,
          channel,
          subscribers: matchingSubscriptions.length.toString()
        })
      } catch (error) {
        console.error('Failed to process PubSub pattern message:', error)
        this.observability.trackError('pubsub.pattern_message.processing.error', error as Error, {
          pattern,
          channel
        })
      }
    })
  }
}