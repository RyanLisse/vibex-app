import { ElectricClient as BaseElectricClient, ElectricDatabase } from '@electric-sql/client'
import { PGlite } from '@electric-sql/pglite'
import { electricConfig, getFinalConfig, validateElectricConfig } from './config'
import { ObservabilityService } from '../observability'
import * as schema from '../../db/schema'

// Type definitions for our database schema
export type DatabaseSchema = typeof schema

// Enhanced ElectricSQL client with observability and error handling
export class ElectricClient {
  private static instance: ElectricClient | null = null
  private client: BaseElectricClient | null = null
  private database: ElectricDatabase | null = null
  private pglite: PGlite | null = null
  private isConnected = false
  private connectionPromise: Promise<void> | null = null
  private observability = ObservabilityService.getInstance()
  private subscriptions = new Map<string, () => void>()
  private offlineQueue: Array<{
    operation: string
    data: any
    timestamp: Date
  }> = []
  private syncStatus: 'connected' | 'disconnected' | 'syncing' | 'error' = 'disconnected'
  private lastSyncTime: Date | null = null
  private conflictLog: Array<{
    table: string
    id: string
    conflict: any
    resolution: any
    timestamp: Date
  }> = []

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): ElectricClient {
    if (!ElectricClient.instance) {
      ElectricClient.instance = new ElectricClient()
    }
    return ElectricClient.instance
  }

  /**
   * Initialize the ElectricSQL client with configuration validation
   */
  async initialize(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = this.observability.trackOperation('electric.initialize', async () => {
      try {
        // Validate configuration
        validateElectricConfig()
        const config = getFinalConfig()

        // Initialize PGlite for local database
        this.pglite = new PGlite({
          dataDir: process.env.ELECTRIC_LOCAL_DB_PATH || 'idb://electric-local',
          extensions: {
            vector: true, // Enable vector extension for embeddings
          },
        })

        // Initialize ElectricSQL client
        this.client = new BaseElectricClient({
          ...config,
          database: this.pglite,
        })

        // Get database instance
        this.database = this.client.db

        // Set up event listeners
        this.setupEventListeners()

        // Connect to ElectricSQL service
        await this.connect()

        console.log('ElectricSQL client initialized successfully')
      } catch (error) {
        console.error('Failed to initialize ElectricSQL client:', error)
        this.observability.recordError('electric.initialize', error as Error)
        throw error
      }
    })

    return this.connectionPromise
  }

  /**
   * Connect to ElectricSQL service with retry logic
   */
  private async connect(): Promise<void> {
    return this.observability.trackOperation('electric.connect', async () => {
      if (!this.client) {
        throw new Error('ElectricSQL client not initialized')
      }

      const config = getFinalConfig()
      let retryCount = 0

      while (retryCount < config.sync.maxRetries) {
        try {
          await this.client.connect()
          this.isConnected = true
          this.syncStatus = 'connected'
          this.lastSyncTime = new Date()

          // Process offline queue if any
          await this.processOfflineQueue()

          console.log('Connected to ElectricSQL service')
          return
        } catch (error) {
          retryCount++
          this.syncStatus = 'error'

          if (retryCount >= config.sync.maxRetries) {
            console.error('Failed to connect to ElectricSQL service after retries:', error)
            throw error
          }

          // Exponential backoff
          const delay = config.sync.retryBackoff * Math.pow(2, retryCount - 1)
          console.warn(`Connection attempt ${retryCount} failed, retrying in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    })
  }

  /**
   * Set up event listeners for connection status and sync events
   */
  private setupEventListeners(): void {
    if (!this.client) return

    // Connection status events
    this.client.on('connected', () => {
      this.isConnected = true
      this.syncStatus = 'connected'
      this.observability.recordEvent('electric.connected', {})
      console.log('ElectricSQL connected')
    })

    this.client.on('disconnected', () => {
      this.isConnected = false
      this.syncStatus = 'disconnected'
      this.observability.recordEvent('electric.disconnected', {})
      console.log('ElectricSQL disconnected')
    })

    // Sync events
    this.client.on('sync:start', () => {
      this.syncStatus = 'syncing'
      this.observability.recordEvent('electric.sync.start', {})
    })

    this.client.on('sync:complete', (data: any) => {
      this.syncStatus = 'connected'
      this.lastSyncTime = new Date()
      this.observability.recordEvent('electric.sync.complete', { data })
    })

    this.client.on('sync:error', (error: any) => {
      this.syncStatus = 'error'
      this.observability.recordError('electric.sync', error)
      console.error('ElectricSQL sync error:', error)
    })

    // Conflict resolution events
    this.client.on('conflict', (conflict: any) => {
      this.handleConflict(conflict)
    })

    // Error events
    this.client.on('error', (error: any) => {
      this.observability.recordError('electric.client', error)
      console.error('ElectricSQL client error:', error)
    })
  }

  /**
   * Handle conflicts using last-write-wins with conflict detection
   */
  private handleConflict(conflict: any): void {
    this.observability.trackOperation('electric.conflict.resolve', async () => {
      const { table, id, local, remote } = conflict

      // Log conflict for debugging
      const conflictEntry = {
        table,
        id,
        conflict: { local, remote },
        resolution: null as any,
        timestamp: new Date(),
      }

      try {
        // Last-write-wins resolution
        const localTimestamp = new Date(local.updated_at || local.created_at)
        const remoteTimestamp = new Date(remote.updated_at || remote.created_at)

        const winner = remoteTimestamp > localTimestamp ? remote : local
        conflictEntry.resolution = {
          strategy: 'last-write-wins',
          winner: winner === remote ? 'remote' : 'local',
        }

        // Apply resolution
        await this.database?.execute(
          `
          UPDATE ${table} 
          SET ${Object.keys(winner)
            .map((key) => `${key} = $${key}`)
            .join(', ')}
          WHERE id = $id
        `,
          { ...winner, id }
        )

        console.log(`Conflict resolved for ${table}:${id} using last-write-wins`)
      } catch (error) {
        conflictEntry.resolution = {
          strategy: 'last-write-wins',
          error: error.message,
        }
        console.error('Failed to resolve conflict:', error)
      }

      // Store conflict log (keep last 100 conflicts)
      this.conflictLog.push(conflictEntry)
      if (this.conflictLog.length > 100) {
        this.conflictLog = this.conflictLog.slice(-100)
      }

      // Emit conflict resolution event
      this.observability.recordEvent('electric.conflict.resolved', conflictEntry)
    })
  }

  /**
   * Process offline queue when connection is restored
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return

    return this.observability.trackOperation('electric.offline.process', async () => {
      console.log(`Processing ${this.offlineQueue.length} offline operations...`)

      const processedOperations = []
      const failedOperations = []

      for (const operation of this.offlineQueue) {
        try {
          // Re-execute the operation
          await this.executeOperation(operation.operation, operation.data)
          processedOperations.push(operation)
        } catch (error) {
          console.error('Failed to process offline operation:', error)
          failedOperations.push({ ...operation, error })
        }
      }

      // Clear processed operations
      this.offlineQueue = failedOperations

      console.log(
        `Processed ${processedOperations.length} offline operations, ${failedOperations.length} failed`
      )
    })
  }

  /**
   * Execute database operation with offline queue support
   */
  private async executeOperation(operation: string, data: any): Promise<any> {
    if (!this.isConnected) {
      // Queue operation for offline processing
      this.offlineQueue.push({
        operation,
        data,
        timestamp: new Date(),
      })
      throw new Error('Operation queued for offline processing')
    }

    // Execute operation based on type
    switch (operation) {
      case 'insert':
        return this.database?.insert(data.table).values(data.values)
      case 'update':
        return this.database?.update(data.table).set(data.values).where(data.where)
      case 'delete':
        return this.database?.delete(data.table).where(data.where)
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  }

  /**
   * Subscribe to real-time changes for a specific table
   */
  subscribe<T>(
    table: string,
    callback: (data: T[]) => void,
    options?: {
      where?: any
      orderBy?: any
      limit?: number
    }
  ): () => void {
    return this.observability.trackOperation('electric.subscribe', () => {
      if (!this.client) {
        throw new Error('ElectricSQL client not initialized')
      }

      const subscriptionKey = `${table}_${Date.now()}_${Math.random()}`

      // Set up subscription
      const unsubscribe = this.client.subscribe(table, {
        ...options,
        callback: (data: T[]) => {
          this.observability.recordEvent('electric.subscription.data', {
            table,
            count: data.length,
          })
          callback(data)
        },
        onError: (error: any) => {
          this.observability.recordError('electric.subscription', error)
          console.error(`Subscription error for table ${table}:`, error)
        },
      })

      // Store subscription for cleanup
      this.subscriptions.set(subscriptionKey, unsubscribe)

      // Return unsubscribe function
      return () => {
        unsubscribe()
        this.subscriptions.delete(subscriptionKey)
      }
    })
  }

  /**
   * Get database instance for direct queries
   */
  get db(): ElectricDatabase {
    if (!this.database) {
      throw new Error('ElectricSQL client not initialized. Call initialize() first.')
    }
    return this.database
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean
    syncStatus: string
    lastSyncTime: Date | null
    offlineQueueSize: number
    conflictCount: number
  } {
    return {
      isConnected: this.isConnected,
      syncStatus: this.syncStatus,
      lastSyncTime: this.lastSyncTime,
      offlineQueueSize: this.offlineQueue.length,
      conflictCount: this.conflictLog.length,
    }
  }

  /**
   * Get conflict log for debugging
   */
  getConflictLog(): Array<{
    table: string
    id: string
    conflict: any
    resolution: any
    timestamp: Date
  }> {
    return [...this.conflictLog]
  }

  /**
   * Force sync with server
   */
  async forceSync(): Promise<void> {
    return this.observability.trackOperation('electric.force-sync', async () => {
      if (!this.client) {
        throw new Error('ElectricSQL client not initialized')
      }

      await this.client.sync()
      this.lastSyncTime = new Date()
    })
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    return this.observability.trackOperation('electric.disconnect', async () => {
      // Unsubscribe from all subscriptions
      for (const unsubscribe of this.subscriptions.values()) {
        unsubscribe()
      }
      this.subscriptions.clear()

      // Disconnect client
      if (this.client) {
        await this.client.disconnect()
        this.client = null
      }

      // Close PGlite
      if (this.pglite) {
        await this.pglite.close()
        this.pglite = null
      }

      this.database = null
      this.isConnected = false
      this.syncStatus = 'disconnected'
      this.connectionPromise = null

      console.log('ElectricSQL client disconnected')
    })
  }

  /**
   * Reset client instance (for testing)
   */
  static reset(): void {
    if (ElectricClient.instance) {
      ElectricClient.instance.disconnect().catch(console.error)
      ElectricClient.instance = null
    }
  }
}

// Export singleton instance
export const electricClient = ElectricClient.getInstance()
