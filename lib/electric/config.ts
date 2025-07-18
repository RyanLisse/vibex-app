import { electrify } from 'electric-sql/wa-sqlite'
import { PGlite } from '@electric-sql/pglite'
import { Electric } from '@electric-sql/client'
import { schema } from './schema'
import { electricSchema } from './schema'

// Environment configuration
const getElectricConfig = () => ({
  // Database URL for the Electric sync service
  url: process.env.ELECTRIC_URL || process.env.NEXT_PUBLIC_ELECTRIC_URL || 'ws://localhost:5133',

  // Authentication configuration
  auth: {
    token: process.env.ELECTRIC_AUTH_TOKEN || process.env.NEXT_PUBLIC_ELECTRIC_AUTH_TOKEN || '',
    // Add JWT token for user authentication
    getToken: async () => {
      // This would integrate with your auth system
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('electric_auth_token')
        return token || ''
      }
      return process.env.ELECTRIC_AUTH_TOKEN || ''
    },
  },

  // Schema configuration
  schema: electricSchema,

  // Sync configuration
  sync: {
    // Enable real-time sync
    realtime: true,

    // Conflict resolution strategy
    conflictResolution: 'last-write-wins',

    // Sync interval in milliseconds (5 seconds)
    syncInterval: 5000,

    // Maximum retry attempts for failed syncs
    maxRetries: 5,

    // Retry delay in milliseconds with exponential backoff
    retryDelay: 1000,
    retryBackoff: 2,

    // Batch size for sync operations
    batchSize: 100,

    // Enable compression for large payloads
    compression: true,

    // Heartbeat interval to keep connection alive
    heartbeatInterval: 30000,
  },

  // Offline configuration
  offline: {
    // Enable offline-first mode
    enabled: true,

    // Maximum offline storage size in MB
    maxStorageSize: 500,

    // Sync when coming back online
    syncOnReconnect: true,

    // Queue size for offline operations
    maxQueueSize: 1000,

    // Persist queue across sessions
    persistQueue: true,
  },

  // Performance optimization
  optimization: {
    // Enable delta sync for large tables
    deltaSync: true,

    // Prefetch related data
    prefetch: {
      enabled: true,
      depth: 2,
    },

    // Connection pooling
    connectionPool: {
      min: 1,
      max: 5,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
    },
  },

  // Debug configuration
  debug: process.env.NODE_ENV === 'development' || process.env.ELECTRIC_DEBUG === 'true',

  // Logging configuration
  logging: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    enableConsole: true,
    enableRemote: false,
  },
})

// PGlite configuration for client-side database
export const pgliteConfig = {
  // Database path for persistent storage
  dataDir: process.env.NODE_ENV === 'development' ? './pglite-data' : undefined,

  // Extensions to load
  extensions: {
    vector: true,
    uuid: true,
  },

  // Debug mode
  debug: process.env.NODE_ENV === 'development',
}

// Sync event types
export interface SyncEvent {
  type: 'insert' | 'update' | 'delete'
  table: string
  record: any
  timestamp: Date
  userId?: string
}

// Conflict resolution result
export interface ConflictResolution {
  resolved: any
  strategy: string
  winner: 'local' | 'remote' | 'merged'
  metadata?: any
}

// Offline queue item
export interface OfflineOperation {
  id: string
  type: 'insert' | 'update' | 'delete'
  table: string
  data: any
  timestamp: Date
  retries: number
  maxRetries: number
}

// Database connection management with comprehensive real-time sync
export class ElectricDatabaseManager {
  private static instance: ElectricDatabaseManager
  private electric: Electric | null = null
  private pglite: PGlite | null = null
  private isInitialized = false
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected'
  private syncState: 'idle' | 'syncing' | 'error' = 'idle'
  private listeners: Array<(state: { connection: string; sync: string }) => void> = []
  private offlineQueue: OfflineOperation[] = []
  private syncEventListeners: Map<string, Array<(event: SyncEvent) => void>> = new Map()
  private conflictResolvers: Map<string, (local: any, remote: any) => ConflictResolution> =
    new Map()
  private lastSyncTime: Date | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10

  static getInstance(): ElectricDatabaseManager {
    if (!ElectricDatabaseManager.instance) {
      ElectricDatabaseManager.instance = new ElectricDatabaseManager()
    }
    return ElectricDatabaseManager.instance
  }

  /**
   * Initialize the Electric database connection with comprehensive sync setup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      this.connectionState = 'connecting'
      this.notifyListeners()

      const config = getElectricConfig()

      // Initialize PGlite for client-side database
      this.pglite = new PGlite({
        ...pgliteConfig,
        // Enable WAL mode for better concurrency
        options: {
          journal_mode: 'WAL',
          synchronous: 'NORMAL',
          cache_size: -64000, // 64MB cache
        },
      })

      // Wait for PGlite to be ready
      await this.pglite.waitReady()

      // Initialize Electric client with proper configuration
      this.electric = await this.createElectricClient(config)

      // Set up event listeners for real-time sync
      this.setupEventListeners()

      // Set up conflict resolvers
      this.setupConflictResolvers()

      // Connect to Electric sync service
      await this.electric.connect()

      // Start heartbeat to maintain connection
      this.startHeartbeat()

      // Process any queued offline operations
      await this.processOfflineQueue()

      this.connectionState = 'connected'
      this.isInitialized = true
      this.reconnectAttempts = 0
      this.notifyListeners()

      console.log('✅ ElectricSQL initialized successfully with real-time sync')
    } catch (error) {
      this.connectionState = 'error'
      this.notifyListeners()
      console.error('❌ Failed to initialize ElectricSQL:', error)

      // Attempt reconnection if not at max attempts
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.attemptReconnection(), 5000)
      }

      throw error
    }
  }

  /**
   * Create Electric client with enhanced configuration
   */
  private async createElectricClient(config: any): Promise<Electric> {
    // Create Electric client with the PGlite database
    const electric = await electrify(this.pglite!, schema, config)

    return electric
  }

  /**
   * Set up comprehensive event listeners for connection and sync events
   */
  private setupEventListeners(): void {
    if (!this.electric) return

    // Connection events
    this.electric.on('connect', () => {
      this.connectionState = 'connected'
      this.reconnectAttempts = 0
      this.notifyListeners()
      console.log('🔗 ElectricSQL connected')
    })

    this.electric.on('disconnect', () => {
      this.connectionState = 'disconnected'
      this.notifyListeners()
      console.log('🔌 ElectricSQL disconnected')

      // Attempt reconnection
      this.attemptReconnection()
    })

    this.electric.on('error', (error: Error) => {
      this.connectionState = 'error'
      this.notifyListeners()
      console.error('❌ ElectricSQL error:', error)

      // Attempt reconnection on error
      this.attemptReconnection()
    })

    // Sync events
    this.electric.on('sync:start', () => {
      this.syncState = 'syncing'
      this.notifyListeners()
      console.log('🔄 ElectricSQL sync started')
    })

    this.electric.on('sync:complete', () => {
      this.syncState = 'idle'
      this.lastSyncTime = new Date()
      this.notifyListeners()
      console.log('✅ ElectricSQL sync completed')
    })

    this.electric.on('sync:error', (error: Error) => {
      this.syncState = 'error'
      this.notifyListeners()
      console.error('❌ ElectricSQL sync error:', error)
    })

    // Real-time data events
    this.electric.on('data:insert', (event: any) => {
      this.handleSyncEvent({
        type: 'insert',
        table: event.table,
        record: event.record,
        timestamp: new Date(),
        userId: event.record?.user_id,
      })
    })

    this.electric.on('data:update', (event: any) => {
      this.handleSyncEvent({
        type: 'update',
        table: event.table,
        record: event.record,
        timestamp: new Date(),
        userId: event.record?.user_id,
      })
    })

    this.electric.on('data:delete', (event: any) => {
      this.handleSyncEvent({
        type: 'delete',
        table: event.table,
        record: event.record,
        timestamp: new Date(),
        userId: event.record?.user_id,
      })
    })

    // Conflict events
    this.electric.on('conflict', (event: any) => {
      this.handleConflict(event.table, event.local, event.remote)
    })
  }

  /**
   * Set up conflict resolution strategies
   */
  private setupConflictResolvers(): void {
    // Last-write-wins resolver (default)
    this.conflictResolvers.set('last-write-wins', (local: any, remote: any): ConflictResolution => {
      const localTime = new Date(local.updated_at || local.created_at)
      const remoteTime = new Date(remote.updated_at || remote.created_at)

      return {
        resolved: localTime > remoteTime ? local : remote,
        strategy: 'last-write-wins',
        winner: localTime > remoteTime ? 'local' : 'remote',
        metadata: { localTime, remoteTime },
      }
    })

    // Server-wins resolver
    this.conflictResolvers.set('server-wins', (local: any, remote: any): ConflictResolution => {
      return {
        resolved: remote,
        strategy: 'server-wins',
        winner: 'remote',
      }
    })

    // Importance-based resolver for agent memory
    this.conflictResolvers.set(
      'importance-based',
      (local: any, remote: any): ConflictResolution => {
        // Higher importance wins
        if (local.importance !== remote.importance) {
          return {
            resolved: local.importance > remote.importance ? local : remote,
            strategy: 'importance-based',
            winner: local.importance > remote.importance ? 'local' : 'remote',
            metadata: { criteria: 'importance' },
          }
        }

        // More recent access wins
        const localAccess = new Date(local.last_accessed_at || local.created_at)
        const remoteAccess = new Date(remote.last_accessed_at || remote.created_at)

        return {
          resolved: localAccess > remoteAccess ? local : remote,
          strategy: 'importance-based',
          winner: localAccess > remoteAccess ? 'local' : 'remote',
          metadata: { criteria: 'access_time', localAccess, remoteAccess },
        }
      }
    )

    // Custom merge resolver for complex objects
    this.conflictResolvers.set('merge', (local: any, remote: any): ConflictResolution => {
      const merged = { ...remote, ...local }

      // Merge metadata if both have it
      if (local.metadata && remote.metadata) {
        merged.metadata = { ...remote.metadata, ...local.metadata }
      }

      return {
        resolved: merged,
        strategy: 'merge',
        winner: 'merged',
      }
    })
  }

  /**
   * Handle incoming sync events and notify listeners
   */
  private handleSyncEvent(event: SyncEvent): void {
    const listeners = this.syncEventListeners.get(event.table) || []
    listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error(`Error in sync event listener for table ${event.table}:`, error)
      }
    })

    // Also notify global listeners
    const globalListeners = this.syncEventListeners.get('*') || []
    globalListeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in global sync event listener:', error)
      }
    })
  }

  /**
   * Handle conflicts using appropriate resolution strategy
   */
  private handleConflict(table: string, local: any, remote: any): void {
    // Determine conflict resolution strategy based on table
    let strategy = 'last-write-wins'

    if (table === 'agent_executions' || table === 'observability_events') {
      strategy = 'server-wins'
    } else if (table === 'agent_memory') {
      strategy = 'importance-based'
    }

    const resolver = this.conflictResolvers.get(strategy)
    if (!resolver) {
      console.error(`No conflict resolver found for strategy: ${strategy}`)
      return
    }

    const resolution = resolver(local, remote)
    console.log(`Conflict resolved for table ${table} using ${strategy}:`, resolution)

    // Apply the resolution (this would integrate with Electric's conflict resolution API)
    // For now, we log the resolution
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.electric && this.connectionState === 'connected') {
        this.electric.ping().catch((error) => {
          console.warn('Heartbeat ping failed:', error)
        })
      }
    }, 30000) // 30 seconds
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000)

    console.log(
      `Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    )

    setTimeout(async () => {
      try {
        if (this.electric) {
          await this.electric.connect()
        }
      } catch (error) {
        console.error('Reconnection failed:', error)
        this.attemptReconnection()
      }
    }, delay)
  }

  /**
   * Process offline operations queue
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return

    console.log(`Processing ${this.offlineQueue.length} offline operations`)

    const operations = [...this.offlineQueue]
    this.offlineQueue = []

    for (const operation of operations) {
      try {
        await this.executeOperation(operation)
        console.log(`Processed offline operation: ${operation.type} on ${operation.table}`)
      } catch (error) {
        operation.retries++

        if (operation.retries < operation.maxRetries) {
          this.offlineQueue.push(operation)
          console.warn(`Offline operation failed, retrying: ${operation.id}`, error)
        } else {
          console.error(`Offline operation failed permanently: ${operation.id}`, error)
        }
      }
    }
  }

  /**
   * Execute a database operation
   */
  private async executeOperation(operation: OfflineOperation): Promise<void> {
    if (!this.electric) {
      throw new Error('Electric client not initialized')
    }

    const { type, table, data } = operation

    switch (type) {
      case 'insert':
        await this.electric.db[table].create({ data })
        break
      case 'update':
        await this.electric.db[table].update({
          where: { id: data.id },
          data,
        })
        break
      case 'delete':
        await this.electric.db[table].delete({
          where: { id: data.id },
        })
        break
      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }

  /**
   * Get the Electric client instance
   */
  getElectric(): Electric | null {
    return this.electric
  }

  /**
   * Get the PGlite instance
   */
  getPGlite(): PGlite | null {
    return this.pglite
  }

  /**
   * Get current connection state
   */
  getConnectionState(): string {
    return this.connectionState
  }

  /**
   * Get current sync state
   */
  getSyncState(): string {
    return this.syncState
  }

  /**
   * Check if the database is ready for operations
   */
  isReady(): boolean {
    return this.isInitialized && this.connectionState === 'connected'
  }

  /**
   * Add a state change listener
   */
  addStateListener(listener: (state: { connection: string; sync: string }) => void): void {
    this.listeners.push(listener)
  }

  /**
   * Remove a state change listener
   */
  removeStateListener(listener: (state: { connection: string; sync: string }) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    const state = {
      connection: this.connectionState,
      sync: this.syncState,
    }
    this.listeners.forEach((listener) => listener(state))
  }

  /**
   * Manually trigger a sync
   */
  async sync(): Promise<void> {
    if (!this.electric || !this.isReady()) {
      throw new Error('ElectricSQL not initialized or not connected')
    }

    try {
      await this.electric.sync()
    } catch (error) {
      console.error('❌ Manual sync failed:', error)
      throw error
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    if (this.electric) {
      await this.electric.disconnect()
      this.electric = null
    }

    if (this.pglite) {
      await this.pglite.close()
      this.pglite = null
    }

    this.isInitialized = false
    this.connectionState = 'disconnected'
    this.syncState = 'idle'
    this.notifyListeners()
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    connectionState: string
    syncState: string
    isReady: boolean
    lastSyncTime?: Date
    pendingChanges?: number
  }> {
    return {
      connectionState: this.connectionState,
      syncState: this.syncState,
      isReady: this.isReady(),
      lastSyncTime: this.lastSyncTime || undefined,
      pendingChanges: this.offlineQueue.length,
    }
  }

  /**
   * Add sync event listener for specific table or all tables (*)
   */
  addSyncEventListener(table: string, listener: (event: SyncEvent) => void): void {
    if (!this.syncEventListeners.has(table)) {
      this.syncEventListeners.set(table, [])
    }
    this.syncEventListeners.get(table)!.push(listener)
  }

  /**
   * Remove sync event listener
   */
  removeSyncEventListener(table: string, listener: (event: SyncEvent) => void): void {
    const listeners = this.syncEventListeners.get(table)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to real-time updates for a specific table
   */
  async subscribeToTable(table: string, filters?: any): Promise<void> {
    if (!this.electric || !this.isReady()) {
      throw new Error('ElectricSQL not initialized or not connected')
    }

    try {
      // Subscribe to table changes with optional filters
      await this.electric.db[table].liveMany(filters)
      console.log(`✅ Subscribed to real-time updates for table: ${table}`)
    } catch (error) {
      console.error(`❌ Failed to subscribe to table ${table}:`, error)
      throw error
    }
  }

  /**
   * Execute real-time operation with optimistic updates
   */
  async executeRealtimeOperation(
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: any,
    optimistic = true
  ): Promise<any> {
    if (!this.electric) {
      throw new Error('Electric client not initialized')
    }

    // If offline, queue the operation
    if (this.connectionState !== 'connected') {
      return this.queueOfflineOperation(table, operation, data)
    }

    try {
      let result: any

      // Execute the operation based on type
      switch (operation) {
        case 'insert':
          result = await this.electric.db[table].create({ data })
          break
        case 'update':
          result = await this.electric.db[table].update({
            where: { id: data.id },
            data,
          })
          break
        case 'delete':
          result = await this.electric.db[table].delete({
            where: { id: data.id },
          })
          break
        default:
          throw new Error(`Unknown operation type: ${operation}`)
      }

      // Emit local sync event for optimistic updates
      if (optimistic) {
        this.handleSyncEvent({
          type: operation,
          table,
          record: result || data,
          timestamp: new Date(),
          userId: data.user_id || data.userId,
        })
      }

      return result
    } catch (error) {
      console.error(`❌ Real-time operation failed for ${table}:`, error)

      // If operation fails and we're not offline, queue it
      if (this.connectionState === 'connected') {
        await this.queueOfflineOperation(table, operation, data)
      }

      throw error
    }
  }

  /**
   * Queue operation for offline processing
   */
  async queueOfflineOperation(
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: any
  ): Promise<string> {
    const operationId = `${table}-${operation}-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const offlineOperation: OfflineOperation = {
      id: operationId,
      type: operation,
      table,
      data,
      timestamp: new Date(),
      retries: 0,
      maxRetries: 3,
    }

    this.offlineQueue.push(offlineOperation)

    // Persist queue if enabled
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('electric_offline_queue', JSON.stringify(this.offlineQueue))
      } catch (error) {
        console.warn('Failed to persist offline queue:', error)
      }
    }

    console.log(`Queued offline operation: ${operationId}`)
    return operationId
  }

  /**
   * Load offline queue from persistence
   */
  private loadOfflineQueue(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem('electric_offline_queue')
      if (stored) {
        this.offlineQueue = JSON.parse(stored)
        console.log(`Loaded ${this.offlineQueue.length} offline operations from storage`)
      }
    } catch (error) {
      console.warn('Failed to load offline queue from storage:', error)
    }
  }

  /**
   * Clear offline queue from persistence
   */
  private clearOfflineQueue(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem('electric_offline_queue')
    } catch (error) {
      console.warn('Failed to clear offline queue from storage:', error)
    }
  }

  /**
   * Get real-time statistics and metrics
   */
  getRealtimeStats(): {
    connectionState: string
    syncState: string
    lastSyncTime?: Date
    reconnectAttempts: number
    offlineQueueSize: number
    subscribedTables: string[]
    syncEventListenerCount: number
    isOnline: boolean
    syncMetrics: {
      totalSyncs: number
      failedSyncs: number
      averageSyncTime: number
    }
  } {
    return {
      connectionState: this.connectionState,
      syncState: this.syncState,
      lastSyncTime: this.lastSyncTime || undefined,
      reconnectAttempts: this.reconnectAttempts,
      offlineQueueSize: this.offlineQueue.length,
      subscribedTables: Array.from(this.syncEventListeners.keys()).filter((key) => key !== '*'),
      syncEventListenerCount: Array.from(this.syncEventListeners.values()).reduce(
        (total, listeners) => total + listeners.length,
        0
      ),
      isOnline: this.connectionState === 'connected',
      syncMetrics: {
        totalSyncs: 0, // TODO: Implement metrics tracking
        failedSyncs: 0,
        averageSyncTime: 0,
      },
    }
  }

  /**
   * Create presence system for collaborative features
   */
  createPresenceSystem(): {
    updatePresence: (userId: string, data: any) => void
    getPresence: (userId?: string) => any
    subscribeToPresence: (callback: (presenceData: any) => void) => void
    removePresence: (userId: string) => void
  } {
    const presenceData = new Map<string, any>()
    const presenceCallbacks: Array<(data: any) => void> = []

    // Update presence information
    const updatePresence = (userId: string, data: any) => {
      const timestamp = new Date()
      const presence = {
        ...data,
        userId,
        timestamp,
        lastSeen: timestamp,
      }

      presenceData.set(userId, presence)

      // Broadcast presence update
      const allPresence = Object.fromEntries(presenceData.entries())
      presenceCallbacks.forEach((callback) => {
        try {
          callback(allPresence)
        } catch (error) {
          console.error('Error in presence callback:', error)
        }
      })

      // Sync presence data if connected
      if (this.isReady()) {
        this.executeRealtimeOperation('presence', 'update', presence, false).catch((error) => {
          console.warn('Failed to sync presence data:', error)
        })
      }
    }

    // Get presence data
    const getPresence = (userId?: string) => {
      if (userId) {
        return presenceData.get(userId)
      }
      return Object.fromEntries(presenceData.entries())
    }

    // Subscribe to presence updates
    const subscribeToPresence = (callback: (presenceData: any) => void) => {
      presenceCallbacks.push(callback)

      // Send current presence data immediately
      const allPresence = Object.fromEntries(presenceData.entries())
      callback(allPresence)
    }

    // Remove presence
    const removePresence = (userId: string) => {
      presenceData.delete(userId)

      // Broadcast presence update
      const allPresence = Object.fromEntries(presenceData.entries())
      presenceCallbacks.forEach((callback) => {
        try {
          callback(allPresence)
        } catch (error) {
          console.error('Error in presence callback:', error)
        }
      })

      // Sync removal if connected
      if (this.isReady()) {
        this.executeRealtimeOperation('presence', 'delete', { userId }, false).catch((error) => {
          console.warn('Failed to sync presence removal:', error)
        })
      }
    }

    // Listen for presence events from other clients
    this.addSyncEventListener('presence', (event) => {
      if (event.type === 'update' || event.type === 'insert') {
        const { userId, ...data } = event.record
        if (userId) {
          presenceData.set(userId, { userId, ...data, timestamp: event.timestamp })

          // Notify callbacks
          const allPresence = Object.fromEntries(presenceData.entries())
          presenceCallbacks.forEach((callback) => {
            try {
              callback(allPresence)
            } catch (error) {
              console.error('Error in presence callback:', error)
            }
          })
        }
      } else if (event.type === 'delete') {
        const { userId } = event.record
        if (userId) {
          presenceData.delete(userId)

          // Notify callbacks
          const allPresence = Object.fromEntries(presenceData.entries())
          presenceCallbacks.forEach((callback) => {
            try {
              callback(allPresence)
            } catch (error) {
              console.error('Error in presence callback:', error)
            }
          })
        }
      }
    })

    return {
      updatePresence,
      getPresence,
      subscribeToPresence,
      removePresence,
    }
  }

  /**
   * Enhanced initialization with offline queue loading
   */
  async initializeEnhanced(): Promise<void> {
    // Load offline queue from storage first
    this.loadOfflineQueue()

    // Then proceed with normal initialization
    await this.initialize()
  }
}

// Export singleton instance
export const electricDb = ElectricDatabaseManager.getInstance()
