import Redis, { Cluster, type ClusterOptions, type RedisOptions } from 'ioredis'
import { ObservabilityService } from '../observability'
import {
  ClientHealthStatus,
  type RedisConfig,
  type RedisConnectionConfig,
  type RedisHealthStatus,
} from './types'

export class RedisClientManager {
  private static instance: RedisClientManager
  private clients = new Map<string, Redis | Cluster>()
  private config: RedisConfig
  private observability = ObservabilityService.getInstance()
  private isInitialized = false

  private constructor(config: RedisConfig) {
    this.config = config
  }

  static getInstance(config?: RedisConfig): RedisClientManager {
    if (!RedisClientManager.instance) {
      if (!config) {
        // During build or when Redis is disabled, return a mock instance
        if (process.env.NODE_ENV === 'production' || process.env.REDIS_ENABLED === 'false') {
          // Create a minimal config for build time
          const mockConfig: RedisConfig = {
            primary: {
              type: 'standalone',
              connection: { host: 'localhost', port: 6379 },
              options: { lazyConnect: true },
            },
            healthCheck: { enabled: false },
            features: { enableTLS: false },
          }
          RedisClientManager.instance = new RedisClientManager(mockConfig)
        } else {
          throw new Error('RedisClientManager requires configuration on first initialization')
        }
      } else {
        RedisClientManager.instance = new RedisClientManager(config)
      }
    }
    return RedisClientManager.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    return this.observability.trackOperation('redis.initialize', async () => {
      try {
        // Initialize primary client
        const primaryClient = await this.createClient('primary', this.config.primary)
        this.clients.set('primary', primaryClient)

        // Initialize replica clients if configured
        if (this.config.replicas) {
          for (const [name, replicaConfig] of Object.entries(this.config.replicas)) {
            const replicaClient = await this.createClient(name, replicaConfig)
            this.clients.set(name, replicaClient)
          }
        }

        // Initialize pub/sub client
        if (this.config.pubsub) {
          const pubsubClient = await this.createClient('pubsub', this.config.pubsub)
          this.clients.set('pubsub', pubsubClient)
        }

        this.isInitialized = true
        console.log('Redis/Valkey clients initialized successfully')
      } catch (error) {
        console.error('Failed to initialize Redis clients:', error)
        throw error
      }
    })
  }

  private async createClient(
    name: string,
    config: RedisConnectionConfig
  ): Promise<Redis | Cluster> {
    const clientConfig: RedisOptions = {
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.database || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30_000,
      connectTimeout: 10_000,
      commandTimeout: 5000,
      ...config.options,
    }

    let client: Redis | Cluster

    if (config.type === 'cluster') {
      const clusterConfig: ClusterOptions = {
        ...clientConfig,
        redisOptions: clientConfig,
        enableOfflineQueue: false,
        maxRedirections: 16,
        retryDelayOnFailover: 100,
      }
      client = new Cluster(config.nodes || [], clusterConfig)
    } else {
      client = new Redis(clientConfig)
    }

    // Set up event handlers
    this.setupEventHandlers(client, name)

    // Connect to Redis/Valkey
    await client.connect()

    return client
  }

  private setupEventHandlers(client: Redis | Cluster, name: string): void {
    client.on('connect', () => {
      console.log(`Redis client '${name}' connected`)
      this.observability.recordEvent('redis.connection.established', {
        client: name,
      })
    })

    client.on('ready', () => {
      console.log(`Redis client '${name}' ready`)
      this.observability.recordEvent('redis.connection.ready', {
        client: name,
      })
    })

    client.on('error', (error) => {
      console.error(`Redis client '${name}' error:`, error)
      this.observability.recordError('redis.connection.error', error)
    })

    client.on('close', () => {
      console.log(`Redis client '${name}' connection closed`)
      this.observability.recordEvent('redis.connection.closed', {
        client: name,
      })
    })

    client.on('reconnecting', () => {
      console.log(`Redis client '${name}' reconnecting`)
      this.observability.recordEvent('redis.connection.reconnecting', {
        client: name,
      })
    })
  }

  getClient(name = 'primary'): Redis | Cluster {
    // During build, return a mock client
    if (process.env.NODE_ENV === 'production' && !this.isInitialized) {
      // Return a mock Redis client that does nothing
      return {
        get: async () => null,
        set: async () => 'OK',
        del: async () => 0,
        exists: async () => 0,
        expire: async () => 0,
        ttl: async () => -1,
        ping: async () => 'PONG',
        quit: async () => 'OK',
        disconnect: () => {},
        on: () => {},
        status: 'ready',
      } as any
    }

    if (!this.isInitialized) {
      throw new Error('RedisClientManager not initialized. Call initialize() first.')
    }

    const client = this.clients.get(name)
    if (!client) {
      throw new Error(`Redis client '${name}' not found`)
    }
    return client
  }

  async executeCommand<T>(command: string, args: any[], clientName = 'primary'): Promise<T> {
    return this.observability.trackOperation('redis.command', async () => {
      const client = this.getClient(clientName)
      const startTime = Date.now()

      try {
        const result = await client.call(command, ...args)
        const duration = Date.now() - startTime

        this.observability.recordEvent('redis.command.duration', duration, {
          command,
          client: clientName,
          status: 'success',
        })

        return result as T
      } catch (error) {
        const duration = Date.now() - startTime

        this.observability.recordEvent('redis.command.duration', duration, {
          command,
          client: clientName,
          status: 'error',
        })

        this.observability.recordError('redis.command.error', error as Error, {
          command,
          client: clientName,
        })

        throw error
      }
    })
  }

  async healthCheck(): Promise<RedisHealthStatus> {
    const healthStatus: RedisHealthStatus = {
      overall: 'healthy',
      clients: {},
      timestamp: new Date(),
    }

    for (const [name, client] of this.clients.entries()) {
      try {
        const startTime = Date.now()
        await client.ping()
        const responseTime = Date.now() - startTime

        healthStatus.clients[name] = {
          status: 'healthy',
          responseTime,
          connected: client.status === 'ready',
        }
      } catch (error) {
        healthStatus.clients[name] = {
          status: 'unhealthy',
          error: (error as Error).message,
          connected: false,
        }
        healthStatus.overall = 'degraded'
      }
    }

    return healthStatus
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down Redis clients...')

    const shutdownPromises = Array.from(this.clients.entries()).map(async ([name, client]) => {
      try {
        await client.quit()
        console.log(`Redis client '${name}' shut down successfully`)
      } catch (error) {
        console.error(`Error shutting down Redis client '${name}':`, error)
      }
    })

    await Promise.all(shutdownPromises)
    this.clients.clear()
    this.isInitialized = false
  }

  // Utility methods
  isClientConnected(name = 'primary'): boolean {
    const client = this.clients.get(name)
    return client ? client.status === 'ready' : false
  }

  getConnectedClients(): string[] {
    return Array.from(this.clients.entries())
      .filter(([, client]) => client.status === 'ready')
      .map(([name]) => name)
  }

  async flushAll(clientName = 'primary'): Promise<void> {
    const client = this.getClient(clientName)
    await client.flushall()
    console.log(`Flushed all data from Redis client '${clientName}'`)
  }
}

// Export redis client getter function
export const getRedis = () => RedisClientManager.getInstance()

// Export a default redis instance getter
export const redis = {
  get client() {
    const manager = RedisClientManager.getInstance()
    return manager.getClient('primary')
  },
}
