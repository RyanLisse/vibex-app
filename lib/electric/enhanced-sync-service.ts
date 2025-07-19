/**
 * Enhanced ElectricSQL Sync Service
 *
 * Provides comprehensive real-time synchronization with:
 * - Bidirectional sync between ElectricSQL and PostgreSQL
 * - Conflict resolution with multiple strategies
 * - Offline support with queue management
 * - Performance monitoring and metrics
 * - Redis caching integration
 */

import { ElectricClient } from './client'
import { electricDatabaseClient } from './database-client'
import { conflictResolutionService } from './conflict-resolution'
import { ObservabilityService } from '../observability'
import { redisCache } from '../redis'
import * as schema from '../../db/schema'

export interface SyncConfiguration {
  autoSync: boolean
  syncInterval: number // milliseconds
  conflictStrategy: 'last-write-wins' | 'user-priority' | 'field-merge' | 'server-wins'
  offlineQueueLimit: number
  performanceMonitoring: boolean
  cacheEnabled: boolean
  cacheTTL: number
}

export interface SyncMetrics {
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  conflictsResolved: number
  averageSyncTime: number
  lastSyncTime: Date | null
  offlineOperations: number
  cacheHitRate: number
}

export interface RealtimeSubscription {
  id: string
  table: string
  filter?: any
  callback: (event: SyncEvent) => void
  userId?: string
  active: boolean
}

export interface SyncEvent {
  id: string
  type: 'insert' | 'update' | 'delete' | 'conflict' | 'sync'
  table: string
  data?: any
  timestamp: Date
  source: 'local' | 'remote'
  userId?: string
  metadata?: any
}

export class EnhancedSyncService {
  private static instance: EnhancedSyncService | null = null
  private electricClient: ElectricClient
  private observability = ObservabilityService.getInstance()
  private subscriptions = new Map<string, RealtimeSubscription>()
  private syncInterval: NodeJS.Timeout | null = null
  private isInitialized = false
  private isSyncing = false

  private config: SyncConfiguration = {
    autoSync: true,
    syncInterval: 30000, // 30 seconds
    conflictStrategy: 'last-write-wins',
    offlineQueueLimit: 1000,
    performanceMonitoring: true,
    cacheEnabled: true,
    cacheTTL: 300, // 5 minutes
  }

  private metrics: SyncMetrics = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    conflictsResolved: 0,
    averageSyncTime: 0,
    lastSyncTime: null,
    offlineOperations: 0,
    cacheHitRate: 0,
  }

  private constructor() {
    this.electricClient = ElectricClient.getInstance()
  }

  static getInstance(): EnhancedSyncService {
    if (!EnhancedSyncService.instance) {
      EnhancedSyncService.instance = new EnhancedSyncService()
    }
    return EnhancedSyncService.instance
  }

  /**
   * Initialize enhanced sync service
   */
  async initialize(config?: Partial<SyncConfiguration>): Promise<void> {
    if (this.isInitialized) return

    return this.observability.trackOperation('enhanced-sync.initialize', async () => {
      // Update configuration
      if (config) {
        this.config = { ...this.config, ...config }
      }

      // Initialize ElectricSQL client
      await this.electricClient.initialize()

      // Setup real-time event handlers
      this.setupRealtimeHandlers()

      // Start auto-sync if enabled
      if (this.config.autoSync) {
        this.startAutoSync()
      }

      // Load metrics from cache
      await this.loadMetrics()

      this.isInitialized = true
      console.log('Enhanced sync service initialized with config:', this.config)
    })
  }

  /**
   * Setup real-time event handlers
   */
  private setupRealtimeHandlers(): void {
    // Handle ElectricSQL events
    const tables = ['tasks', 'environments', 'agent_executions', 'observability_events']

    tables.forEach((table) => {
      // Subscribe to ElectricSQL changes
      this.electricClient.subscribe(table, async (data) => {
        await this.handleElectricChange(table, data)
      })

      // Subscribe to database changes
      electricDatabaseClient.subscribeToTable(table, async (event) => {
        await this.handleDatabaseChange(table, event)
      })
    })
  }

  /**
   * Handle changes from ElectricSQL
   */
  private async handleElectricChange(table: string, data: any[]): Promise<void> {
    return this.observability.trackOperation('enhanced-sync.handle-electric-change', async () => {
      try {
        // Sync changes to PostgreSQL database
        for (const record of data) {
          const operation = this.detectOperation(record)

          await conflictResolutionService.executeOperationWithConflictResolution(
            {
              table,
              operation,
              data: record,
              where: { id: record.id },
              options: {
                userId: record.userId,
                realtime: true,
                cache: this.config.cacheEnabled,
                ttl: this.config.cacheTTL,
              },
            },
            {
              conflictStrategy: this.config.conflictStrategy,
              offlineSupport: true,
            }
          )
        }

        // Emit sync events
        this.emitSyncEvent({
          id: `sync-${Date.now()}`,
          type: 'sync',
          table,
          data,
          timestamp: new Date(),
          source: 'local',
        })
      } catch (error) {
        this.observability.recordError('enhanced-sync.electric-change', error as Error)
        throw error
      }
    })
  }

  /**
   * Handle changes from PostgreSQL database
   */
  private async handleDatabaseChange(table: string, event: any): Promise<void> {
    return this.observability.trackOperation('enhanced-sync.handle-database-change', async () => {
      try {
        // Sync changes to ElectricSQL
        const { operation, data, userId } = event

        // Apply changes to ElectricSQL local database
        const pglite = this.electricClient.db

        switch (operation) {
          case 'insert':
            await pglite.execute(`INSERT INTO ${table} VALUES ($1)`, [data])
            break
          case 'update':
            await pglite.execute(`UPDATE ${table} SET data = $1 WHERE id = $2`, [data, data.id])
            break
          case 'delete':
            await pglite.execute(`DELETE FROM ${table} WHERE id = $1`, [data.id])
            break
        }

        // Emit sync events
        this.emitSyncEvent({
          id: `sync-${Date.now()}`,
          type: operation,
          table,
          data,
          timestamp: new Date(),
          source: 'remote',
          userId,
        })
      } catch (error) {
        this.observability.recordError('enhanced-sync.database-change', error as Error)
        throw error
      }
    })
  }

  /**
   * Perform full synchronization
   */
  async performFullSync(): Promise<void> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress')
    }

    this.isSyncing = true
    const startTime = Date.now()

    return this.observability.trackOperation('enhanced-sync.full-sync', async () => {
      try {
        this.metrics.totalSyncs++

        // Process offline queue first
        const offlineResult = await conflictResolutionService.processOfflineQueue()
        this.metrics.offlineOperations = offlineResult.operationsFailed
        this.metrics.conflictsResolved += offlineResult.conflictsResolved

        // Sync each table
        const tables = ['tasks', 'environments', 'agent_executions', 'observability_events']

        for (const table of tables) {
          await this.syncTable(table)
        }

        // Force ElectricSQL sync
        await this.electricClient.forceSync()

        // Update metrics
        this.metrics.successfulSyncs++
        this.metrics.lastSyncTime = new Date()
        this.metrics.averageSyncTime = this.calculateAverageSyncTime(Date.now() - startTime)

        // Persist metrics
        await this.saveMetrics()

        console.log('Full sync completed successfully')
      } catch (error) {
        this.metrics.failedSyncs++
        this.observability.recordError('enhanced-sync.full-sync', error as Error)
        throw error
      } finally {
        this.isSyncing = false
      }
    })
  }

  /**
   * Sync specific table
   */
  private async syncTable(table: string): Promise<void> {
    return this.observability.trackOperation(`enhanced-sync.sync-table.${table}`, async () => {
      // Get data from both sources
      const localData = await this.getLocalData(table)
      const remoteData = await this.getRemoteData(table)

      // Find differences
      const { toInsert, toUpdate, toDelete } = this.findDifferences(localData, remoteData)

      // Apply changes with conflict resolution
      for (const record of toInsert) {
        await conflictResolutionService.executeOperationWithConflictResolution(
          {
            table,
            operation: 'insert',
            data: record,
            options: { realtime: false },
          },
          {
            conflictStrategy: this.config.conflictStrategy,
          }
        )
      }

      for (const record of toUpdate) {
        await conflictResolutionService.executeOperationWithConflictResolution(
          {
            table,
            operation: 'update',
            data: record,
            where: { id: record.id },
            options: { realtime: false },
          },
          {
            conflictStrategy: this.config.conflictStrategy,
          }
        )
      }

      for (const record of toDelete) {
        await conflictResolutionService.executeOperationWithConflictResolution(
          {
            table,
            operation: 'delete',
            where: { id: record.id },
            options: { realtime: false },
          },
          {
            conflictStrategy: this.config.conflictStrategy,
          }
        )
      }
    })
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(
    table: string,
    callback: (event: SyncEvent) => void,
    options?: {
      filter?: any
      userId?: string
    }
  ): string {
    const subscriptionId = `sub-${Date.now()}-${Math.random()}`

    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      table,
      filter: options?.filter,
      callback,
      userId: options?.userId,
      active: true,
    }

    this.subscriptions.set(subscriptionId, subscription)

    return subscriptionId
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      subscription.active = false
      this.subscriptions.delete(subscriptionId)
    }
  }

  /**
   * Emit sync event to subscribers
   */
  private emitSyncEvent(event: SyncEvent): void {
    this.subscriptions.forEach((subscription) => {
      if (!subscription.active || subscription.table !== event.table) return

      // Check user filter
      if (subscription.userId && event.userId && subscription.userId !== event.userId) return

      // Check custom filter
      if (subscription.filter && !this.matchesFilter(event.data, subscription.filter)) return

      try {
        subscription.callback(event)
      } catch (error) {
        console.error('Subscription callback error:', error)
      }
    })
  }

  /**
   * Start automatic synchronization
   */
  private startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.performFullSync()
      } catch (error) {
        console.error('Auto-sync failed:', error)
      }
    }, this.config.syncInterval)

    console.log(`Auto-sync started with interval: ${this.config.syncInterval}ms`)
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('Auto-sync stopped')
    }
  }

  /**
   * Get sync status and metrics
   */
  getSyncStatus(): {
    isInitialized: boolean
    isSyncing: boolean
    config: SyncConfiguration
    metrics: SyncMetrics
    connectionStatus: any
    offlineQueueStatus: any
  } {
    return {
      isInitialized: this.isInitialized,
      isSyncing: this.isSyncing,
      config: this.config,
      metrics: this.metrics,
      connectionStatus: this.electricClient.getConnectionStatus(),
      offlineQueueStatus: conflictResolutionService.getOfflineQueueStatus(),
    }
  }

  /**
   * Update sync configuration
   */
  updateConfig(config: Partial<SyncConfiguration>): void {
    this.config = { ...this.config, ...config }

    // Restart auto-sync if interval changed
    if (config.syncInterval !== undefined || config.autoSync !== undefined) {
      if (this.config.autoSync) {
        this.startAutoSync()
      } else {
        this.stopAutoSync()
      }
    }

    console.log('Sync configuration updated:', this.config)
  }

  /**
   * Helper: Get local data from ElectricSQL
   */
  private async getLocalData(table: string): Promise<any[]> {
    const pglite = this.electricClient.db
    const result = await pglite.query(`SELECT * FROM ${table}`)
    return result.rows
  }

  /**
   * Helper: Get remote data from PostgreSQL
   */
  private async getRemoteData(table: string): Promise<any[]> {
    const result = await electricDatabaseClient.executeOperation({
      table,
      operation: 'select',
      options: { cache: false },
    })
    return result.success ? result.data : []
  }

  /**
   * Helper: Find differences between datasets
   */
  private findDifferences(
    local: any[],
    remote: any[]
  ): {
    toInsert: any[]
    toUpdate: any[]
    toDelete: any[]
  } {
    const localMap = new Map(local.map((item) => [item.id, item]))
    const remoteMap = new Map(remote.map((item) => [item.id, item]))

    const toInsert: any[] = []
    const toUpdate: any[] = []
    const toDelete: any[] = []

    // Find records to insert (in remote but not in local)
    remote.forEach((remoteItem) => {
      if (!localMap.has(remoteItem.id)) {
        toInsert.push(remoteItem)
      }
    })

    // Find records to update or delete
    local.forEach((localItem) => {
      const remoteItem = remoteMap.get(localItem.id)
      if (!remoteItem) {
        toDelete.push(localItem)
      } else if (JSON.stringify(localItem) !== JSON.stringify(remoteItem)) {
        toUpdate.push(remoteItem)
      }
    })

    return { toInsert, toUpdate, toDelete }
  }

  /**
   * Helper: Detect operation type
   */
  private detectOperation(record: any): 'insert' | 'update' | 'delete' {
    if (record._deleted) return 'delete'
    if (record.createdAt === record.updatedAt) return 'insert'
    return 'update'
  }

  /**
   * Helper: Check if data matches filter
   */
  private matchesFilter(data: any, filter: any): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (data[key] !== value) return false
    }
    return true
  }

  /**
   * Helper: Calculate average sync time
   */
  private calculateAverageSyncTime(newTime: number): number {
    const totalTime = this.metrics.averageSyncTime * (this.metrics.successfulSyncs - 1) + newTime
    return Math.round(totalTime / this.metrics.successfulSyncs)
  }

  /**
   * Helper: Load metrics from cache
   */
  private async loadMetrics(): Promise<void> {
    try {
      const cached = await redisCache.get<SyncMetrics>('electric:sync:metrics')
      if (cached) {
        this.metrics = cached
      }
    } catch (error) {
      console.warn('Failed to load metrics from cache:', error)
    }
  }

  /**
   * Helper: Save metrics to cache
   */
  private async saveMetrics(): Promise<void> {
    try {
      await redisCache.set('electric:sync:metrics', this.metrics, {
        ttl: 86400,
      }) // 24 hours
    } catch (error) {
      console.warn('Failed to save metrics to cache:', error)
    }
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup(): Promise<void> {
    return this.observability.trackOperation('enhanced-sync.cleanup', async () => {
      // Stop auto-sync
      this.stopAutoSync()

      // Clear subscriptions
      this.subscriptions.clear()

      // Save final metrics
      await this.saveMetrics()

      // Cleanup ElectricSQL client
      await this.electricClient.disconnect()

      this.isInitialized = false
      console.log('Enhanced sync service cleaned up')
    })
  }

  /**
   * Reset service instance (for testing)
   */
  static reset(): void {
    if (EnhancedSyncService.instance) {
      EnhancedSyncService.instance.cleanup().catch(console.error)
      EnhancedSyncService.instance = null
    }
  }
}

// Export singleton instance
export const enhancedSyncService = EnhancedSyncService.getInstance()
