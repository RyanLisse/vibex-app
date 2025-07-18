import { ElectricDatabase, electrify } from 'electric-sql/wa-sqlite'
import { PGlite } from '@electric-sql/pglite'
import { Electric, ElectricConfig } from '@electric-sql/client'
import { schema } from './schema'

// ElectricSQL configuration
export const electricConfig: ElectricConfig = {
  // Database URL for the Electric sync service
  url: process.env.ELECTRIC_URL || 'ws://localhost:5133',
  
  // Authentication configuration
  auth: {
    token: process.env.ELECTRIC_AUTH_TOKEN || '',
  },
  
  // Sync configuration
  sync: {
    // Enable real-time sync
    realtime: true,
    
    // Conflict resolution strategy
    conflictResolution: 'last-write-wins',
    
    // Sync interval in milliseconds
    syncInterval: 1000,
    
    // Maximum retry attempts for failed syncs
    maxRetries: 3,
    
    // Retry delay in milliseconds
    retryDelay: 1000,
  },
  
  // Offline configuration
  offline: {
    // Enable offline-first mode
    enabled: true,
    
    // Maximum offline storage size in MB
    maxStorageSize: 100,
    
    // Sync when coming back online
    syncOnReconnect: true,
  },
  
  // Debug configuration
  debug: process.env.NODE_ENV === 'development',
}

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

// Database connection management
export class ElectricDatabaseManager {
  private static instance: ElectricDatabaseManager
  private electric: Electric | null = null
  private pglite: PGlite | null = null
  private isInitialized = false
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected'
  private syncState: 'idle' | 'syncing' | 'error' = 'idle'
  private listeners: Array<(state: { connection: string; sync: string }) => void> = []

  static getInstance(): ElectricDatabaseManager {
    if (!ElectricDatabaseManager.instance) {
      ElectricDatabaseManager.instance = new ElectricDatabaseManager()
    }
    return ElectricDatabaseManager.instance
  }

  /**
   * Initialize the Electric database connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      this.connectionState = 'connecting'
      this.notifyListeners()

      // Initialize PGlite for client-side database
      this.pglite = new PGlite(pgliteConfig)
      
      // Initialize Electric client
      this.electric = new Electric(electricConfig)
      
      // Set up event listeners
      this.setupEventListeners()
      
      // Connect to Electric sync service
      await this.electric.connect()
      
      this.connectionState = 'connected'
      this.isInitialized = true
      this.notifyListeners()
      
      console.log('✅ ElectricSQL initialized successfully')
    } catch (error) {
      this.connectionState = 'error'
      this.notifyListeners()
      console.error('❌ Failed to initialize ElectricSQL:', error)
      throw error
    }
  }

  /**
   * Set up event listeners for connection and sync events
   */
  private setupEventListeners(): void {
    if (!this.electric) return

    // Connection events
    this.electric.on('connect', () => {
      this.connectionState = 'connected'
      this.notifyListeners()
      console.log('🔗 ElectricSQL connected')
    })

    this.electric.on('disconnect', () => {
      this.connectionState = 'disconnected'
      this.notifyListeners()
      console.log('🔌 ElectricSQL disconnected')
    })

    this.electric.on('error', (error: Error) => {
      this.connectionState = 'error'
      this.notifyListeners()
      console.error('❌ ElectricSQL error:', error)
    })

    // Sync events
    this.electric.on('sync:start', () => {
      this.syncState = 'syncing'
      this.notifyListeners()
      console.log('🔄 ElectricSQL sync started')
    })

    this.electric.on('sync:complete', () => {
      this.syncState = 'idle'
      this.notifyListeners()
      console.log('✅ ElectricSQL sync completed')
    })

    this.electric.on('sync:error', (error: Error) => {
      this.syncState = 'error'
      this.notifyListeners()
      console.error('❌ ElectricSQL sync error:', error)
    })
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
    this.listeners.forEach(listener => listener(state))
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
      // Additional stats would be implemented based on Electric client API
    }
  }
}

// Export singleton instance
export const electricDb = ElectricDatabaseManager.getInstance()
