/**
 * ElectricSQL + TanStack Query Integration Bridge
 *
 * Provides seamless integration between ElectricSQL real-time subscriptions
 * and TanStack Query cache invalidation for automatic UI updates.
 */

import type { QueryClient } from '@tanstack/react-query'
import { ElectricClient, electricClient } from '@/lib/electric/client'
import { observability } from '@/lib/observability'
import { queryKeys } from './config'

export interface TableChangeEvent {
  table: string
  operation: 'insert' | 'update' | 'delete'
  id: string | string[]
  data?: any
  timestamp: Date
}

export interface ElectricBridgeConfig {
  enableRealTimeInvalidation: boolean
  batchInvalidationMs: number
  debugMode: boolean
  tableSubscriptions: string[]
}

/**
 * Bridge service that connects ElectricSQL real-time events to TanStack Query cache management
 */
export class ElectricQueryBridge {
  private static instance: ElectricQueryBridge | null = null
  private queryClient: QueryClient | null = null
  private isActive = false
  private subscriptions = new Map<string, () => void>()
  private invalidationQueue = new Map<string, Set<string>>()
  private batchTimer: NodeJS.Timeout | null = null
  private config: ElectricBridgeConfig

  // Table to query key mappings
  private tableQueryMappings = new Map<string, (data?: any) => string[][]>([
    ['tasks', () => [queryKeys.tasks.all, queryKeys.executions.all]],
    ['environments', () => [queryKeys.environments.all]],
    [
      'agentExecutions',
      (data) => [
        queryKeys.executions.all,
        ...(data?.taskId ? [queryKeys.executions.byTask(data.taskId)] : []),
        ...(data?.id ? [queryKeys.executions.detail(data.id)] : []),
      ],
    ],
    [
      'observabilityEvents',
      (data) => [
        queryKeys.events.all,
        ...(data?.executionId ? [queryKeys.events.byExecution(data.executionId)] : []),
      ],
    ],
    [
      'agentMemory',
      (data) => [
        queryKeys.memory.all,
        ...(data?.agentType ? [queryKeys.memory.byAgent(data.agentType)] : []),
      ],
    ],
    [
      'workflows',
      (data) => [
        queryKeys.workflows.all,
        ...(data?.id ? [queryKeys.workflows.detail(data.id)] : []),
      ],
    ],
    [
      'workflowExecutions',
      (data) => [
        [...queryKeys.workflows.all, 'executions'],
        ...(data?.workflowId ? [queryKeys.workflows.executions(data.workflowId)] : []),
        ...(data?.id ? [queryKeys.workflows.all, 'execution', data.id] : []),
      ],
    ],
  ])

  private constructor(config: Partial<ElectricBridgeConfig> = {}) {
    this.config = {
      enableRealTimeInvalidation: true,
      batchInvalidationMs: 100,
      debugMode: process.env.NODE_ENV === 'development',
      tableSubscriptions: [
        'tasks',
        'environments',
        'agentExecutions',
        'observabilityEvents',
        'agentMemory',
        'workflows',
        'workflowExecutions',
      ],
      ...config,
    }
  }

  static getInstance(config?: Partial<ElectricBridgeConfig>): ElectricQueryBridge {
    if (!ElectricQueryBridge.instance) {
      ElectricQueryBridge.instance = new ElectricQueryBridge(config)
    }
    return ElectricQueryBridge.instance
  }

  /**
   * Initialize the bridge with a QueryClient instance
   */
  async initialize(queryClient: QueryClient): Promise<void> {
    return observability.trackOperation('electric-bridge.initialize', async () => {
      if (this.isActive) {
        console.warn('ElectricSQL Bridge already initialized')
        return
      }

      this.queryClient = queryClient

      // Initialize ElectricSQL client if needed
      await electricClient.initialize()

      // Set up real-time subscriptions
      await this.setupTableSubscriptions()

      // Set up ElectricSQL event listeners
      this.setupElectricEventListeners()

      this.isActive = true

      if (this.config.debugMode) {
        console.log('🔄 ElectricSQL Query Bridge initialized')
        console.log('📊 Table subscriptions:', this.config.tableSubscriptions)
      }
    })
  }

  /**
   * Set up real-time subscriptions for all configured tables
   */
  private async setupTableSubscriptions(): Promise<void> {
    return observability.trackOperation('electric-bridge.setup-subscriptions', async () => {
      for (const tableName of this.config.tableSubscriptions) {
        try {
          const unsubscribe = electricClient.subscribe(
            tableName,
            (data: any[]) => this.handleTableDataChange(tableName, data),
            {
              // Subscribe to all changes with minimal filtering
              orderBy: { updated_at: 'desc' },
              limit: 1000,
            }
          )

          this.subscriptions.set(tableName, unsubscribe)

          if (this.config.debugMode) {
            console.log(`📡 Subscribed to table: ${tableName}`)
          }
        } catch (error) {
          console.error(`Failed to subscribe to table ${tableName}:`, error)
          observability.recordError('electric-bridge.subscription', error as Error, {
            table: tableName,
          })
        }
      }
    })
  }

  /**
   * Set up ElectricSQL client event listeners for sync events
   */
  private setupElectricEventListeners(): void {
    // Listen to ElectricSQL client events (assuming we can extend the client)
    // For now, we'll use a simple approach with direct event monitoring

    // Set up periodic sync status monitoring
    setInterval(() => {
      this.checkSyncStatus()
    }, 5000) // Check every 5 seconds
  }

  /**
   * Handle real-time data changes from ElectricSQL subscriptions
   */
  private handleTableDataChange(tableName: string, data: any[]): void {
    if (!(this.config.enableRealTimeInvalidation && this.queryClient)) {
      return
    }

    observability.trackOperation('electric-bridge.handle-change', () => {
      // Queue cache invalidations for this table
      this.queueTableInvalidation(tableName, data)

      if (this.config.debugMode) {
        console.log(`🔄 Data change detected in ${tableName}:`, {
          count: data.length,
          sample: data[0],
        })
      }
    })
  }

  /**
   * Queue table invalidation with batching to prevent excessive cache updates
   */
  private queueTableInvalidation(tableName: string, data: any[]): void {
    // Get query keys that should be invalidated for this table
    const queryKeyGenerator = this.tableQueryMappings.get(tableName)
    if (!queryKeyGenerator) {
      if (this.config.debugMode) {
        console.warn(`No query mapping found for table: ${tableName}`)
      }
      return
    }

    // Generate query keys to invalidate
    const queryKeysToInvalidate = new Set<string>()

    // Add general table queries
    const baseQueryKeys = queryKeyGenerator()
    baseQueryKeys.forEach((queryKey) => {
      queryKeysToInvalidate.add(JSON.stringify(queryKey))
    })

    // Add specific query keys based on data
    data.forEach((item) => {
      const specificQueryKeys = queryKeyGenerator(item)
      specificQueryKeys.forEach((queryKey) => {
        queryKeysToInvalidate.add(JSON.stringify(queryKey))
      })
    })

    // Add to invalidation queue
    if (!this.invalidationQueue.has(tableName)) {
      this.invalidationQueue.set(tableName, new Set())
    }

    const tableQueue = this.invalidationQueue.get(tableName)!
    queryKeysToInvalidate.forEach((key) => tableQueue.add(key))

    // Batch invalidations to prevent excessive updates
    this.scheduleBatchInvalidation()
  }

  /**
   * Schedule batched invalidation to optimize performance
   */
  private scheduleBatchInvalidation(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }

    this.batchTimer = setTimeout(() => {
      this.processBatchedInvalidations()
    }, this.config.batchInvalidationMs)
  }

  /**
   * Process all queued invalidations in a batch
   */
  private processBatchedInvalidations(): void {
    if (!this.queryClient) return

    observability.trackOperation('electric-bridge.batch-invalidate', () => {
      const allQueryKeys = new Set<string>()

      // Collect all unique query keys
      for (const [tableName, queryKeys] of this.invalidationQueue) {
        queryKeys.forEach((key) => allQueryKeys.add(key))

        if (this.config.debugMode) {
          console.log(`🔄 Invalidating ${queryKeys.size} queries for ${tableName}`)
        }
      }

      // Invalidate all collected query keys
      for (const queryKeyStr of allQueryKeys) {
        try {
          const queryKey = JSON.parse(queryKeyStr)
          this.queryClient!.invalidateQueries({ queryKey })
        } catch (error) {
          console.error('Failed to parse query key:', queryKeyStr, error)
        }
      }

      // Clear the queue
      this.invalidationQueue.clear()

      if (this.config.debugMode && allQueryKeys.size > 0) {
        console.log(`✅ Batch invalidated ${allQueryKeys.size} unique query keys`)
      }
    })
  }

  /**
   * Monitor sync status and invalidate caches after sync completion
   */
  private checkSyncStatus(): void {
    const status = electricClient.getConnectionStatus()

    // If sync just completed, invalidate all caches to ensure fresh data
    if (status.syncStatus === 'connected' && status.lastSyncTime) {
      const timeSinceSync = Date.now() - status.lastSyncTime.getTime()

      // If sync completed within the last sync check interval, refresh caches
      if (timeSinceSync < 10_000) {
        // 10 seconds
        this.invalidateAllCaches()
      }
    }
  }

  /**
   * Invalidate all cached queries (useful after major sync events)
   */
  private invalidateAllCaches(): void {
    if (!this.queryClient) return

    observability.trackOperation('electric-bridge.invalidate-all', () => {
      // Invalidate all query keys we manage
      for (const [tableName, queryKeyGenerator] of this.tableQueryMappings) {
        const queryKeys = queryKeyGenerator()
        queryKeys.forEach((queryKey) => {
          this.queryClient!.invalidateQueries({ queryKey })
        })
      }

      if (this.config.debugMode) {
        console.log('🔄 Invalidated all caches after sync completion')
      }
    })
  }

  /**
   * Add custom table to query key mapping
   */
  addTableMapping(tableName: string, queryKeyGenerator: (data?: any) => string[][]): void {
    this.tableQueryMappings.set(tableName, queryKeyGenerator)

    // If bridge is active, set up subscription for new table
    if (this.isActive && !this.subscriptions.has(tableName)) {
      const unsubscribe = electricClient.subscribe(tableName, (data: any[]) =>
        this.handleTableDataChange(tableName, data)
      )
      this.subscriptions.set(tableName, unsubscribe)
    }

    if (this.config.debugMode) {
      console.log(`📊 Added custom table mapping: ${tableName}`)
    }
  }

  /**
   * Manually trigger cache invalidation for specific tables
   */
  invalidateTable(tableName: string, data?: any[]): void {
    if (data && data.length > 0) {
      this.handleTableDataChange(tableName, data)
    } else {
      // Invalidate all queries for this table
      this.queueTableInvalidation(tableName, [{}])
    }
  }

  /**
   * Get bridge statistics for monitoring
   */
  getStats(): {
    isActive: boolean
    subscribedTables: string[]
    queuedInvalidations: number
    connectionStatus: any
  } {
    return {
      isActive: this.isActive,
      subscribedTables: Array.from(this.subscriptions.keys()),
      queuedInvalidations: Array.from(this.invalidationQueue.values()).reduce(
        (total, set) => total + set.size,
        0
      ),
      connectionStatus: electricClient.getConnectionStatus(),
    }
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup(): Promise<void> {
    return observability.trackOperation('electric-bridge.cleanup', async () => {
      // Clear batch timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer)
        this.batchTimer = null
      }

      // Unsubscribe from all table subscriptions
      for (const [tableName, unsubscribe] of this.subscriptions) {
        try {
          unsubscribe()
          if (this.config.debugMode) {
            console.log(`📡 Unsubscribed from table: ${tableName}`)
          }
        } catch (error) {
          console.error(`Failed to unsubscribe from ${tableName}:`, error)
        }
      }
      this.subscriptions.clear()

      // Clear invalidation queue
      this.invalidationQueue.clear()

      this.isActive = false
      this.queryClient = null

      if (this.config.debugMode) {
        console.log('🔄 ElectricSQL Query Bridge cleaned up')
      }
    })
  }

  /**
   * Reset instance (for testing)
   */
  static reset(): void {
    if (ElectricQueryBridge.instance) {
      ElectricQueryBridge.instance.cleanup().catch(console.error)
      ElectricQueryBridge.instance = null
    }
  }
}

// Export singleton instance
export const electricQueryBridge = ElectricQueryBridge.getInstance()

// Utility functions
export const initializeElectricBridge = async (
  queryClient: QueryClient,
  config?: Partial<ElectricBridgeConfig>
) => {
  const bridge = ElectricQueryBridge.getInstance(config)
  await bridge.initialize(queryClient)
  return bridge
}

export const getElectricBridge = () => electricQueryBridge
