import Redis, { Cluster, RedisOptions, ClusterOptions } from 'ioredis'
import { ObservabilityService } from '../observability'
import { RedisConfig, RedisConnectionConfig, RedisHealthStatus, ClientHealthStatus } from './types'

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
        throw new Error('RedisClientManager requires configuration on first initialization')
      }
      RedisClientManager.instance = new RedisClientManager(config)
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
      keepAlive: 30000,
      connectTimeout: 10000,
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
      this.observability.recordMetric('redis.connection.established', 1, {
        client: name,
      })
    })

    client.on('ready', () => {
      console.log(`Redis client '${name}' ready`)
      this.observability.recordMetric('redis.connection.ready', 1, {
        client: name,
      })
    })

    client.on('error', (error) => {
      console.error(`Redis client '${name}' error:`, error)
      this.observability.trackError('redis.connection.error', error, {
        client: name,
      })
    })

    client.on('close', () => {
      console.log(`Redis client '${name}' connection closed`)
      this.observability.recordMetric('redis.connection.closed', 1, {
        client: name,
      })
    })

    client.on('reconnecting', () => {
      console.log(`Redis client '${name}' reconnecting`)
      this.observability.recordMetric('redis.connection.reconnecting', 1, {
        client: name,
      })
    })
  }

  getClient(name: string = 'primary'): Redis | Cluster {
    if (!this.isInitialized) {
      throw new Error('RedisClientManager not initialized. Call initialize() first.')
    }

    const client = this.clients.get(name)
    if (!client) {
      throw new Error(`Redis client '${name}' not found`)
    }
    return client
  }

  async executeCommand<T>(
    command: string,
    args: any[],
    clientName: string = 'primary'
  ): Promise<T> {
    return this.observability.trackOperation('redis.command', async () => {
      const client = this.getClient(clientName)
      const startTime = Date.now()

      try {
        const result = await client.call(command, ...args)
        const duration = Date.now() - startTime

        this.observability.recordMetric('redis.command.duration', duration, {
          command,
          client: clientName,
          status: 'success',
        })

        return result as T
      } catch (error) {
        const duration = Date.now() - startTime

        this.observability.recordMetric('redis.command.duration', duration, {
          command,
          client: clientName,
          status: 'error',
        })

        this.observability.trackError('redis.command.error', error as Error, {
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
  isClientConnected(name: string = 'primary'): boolean {
    const client = this.clients.get(name)
    return client ? client.status === 'ready' : false
  }

  getConnectedClients(): string[] {
    return Array.from(this.clients.entries())
      .filter(([, client]) => client.status === 'ready')
      .map(([name]) => name)
  }

  async flushAll(clientName: string = 'primary'): Promise<void> {
    const client = this.getClient(clientName)
    await client.flushall()
    console.log(`Flushed all data from Redis client '${clientName}'`)
  }
}
