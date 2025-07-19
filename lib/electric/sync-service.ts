import { ElectricClient } from './client'
import { ObservabilityService } from '../observability'
import * as schema from '../../db/schema'

// Sync service for managing real-time synchronization
export class ElectricSyncService {
  private static instance: ElectricSyncService | null = null
  private electricClient: ElectricClient
  private observability = ObservabilityService.getInstance()
  private subscriptions = new Map<string, () => void>()
  private syncIntervals = new Map<string, NodeJS.Timeout>()
  private isInitialized = false

  private constructor() {
    this.electricClient = ElectricClient.getInstance()
  }

  static getInstance(): ElectricSyncService {
    if (!ElectricSyncService.instance) {
      ElectricSyncService.instance = new ElectricSyncService()
    }
    return ElectricSyncService.instance
  }

  /**
   * Initialize the sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    return this.observability.trackOperation('sync-service.initialize', async () => {
      // Initialize ElectricSQL client
      await this.electricClient.initialize()

      // Set up table-specific sync configurations
      await this.setupTableSync()

      this.isInitialized = true
      console.log('ElectricSQL sync service initialized')
    })
  }

  /**
   * Set up synchronization for all tables
   */
  private async setupTableSync(): Promise<void> {
    // Configure sync for tasks table
    await this.setupTasksSync()

    // Configure sync for environments table
    await this.setupEnvironmentsSync()

    // Configure sync for agent executions table
    await this.setupAgentExecutionsSync()

    // Configure sync for observability events table
    await this.setupObservabilityEventsSync()

    // Configure sync for agent memory table
    await this.setupAgentMemorySync()

    // Configure sync for workflows table
    await this.setupWorkflowsSync()

    // Configure sync for workflow executions table
    await this.setupWorkflowExecutionsSync()

    // Configure sync for execution snapshots table
    await this.setupExecutionSnapshotsSync()
  }

  /**
   * Set up tasks table synchronization
   */
  private async setupTasksSync(): Promise<void> {
    return this.observability.trackOperation('sync-service.setup-tasks', async () => {
      // Enable real-time sync for tasks table
      const unsubscribe = this.electricClient.subscribe<schema.Task>(
        'tasks',
        (tasks) => {
          this.observability.recordEvent('sync.tasks.updated', {
            count: tasks.length,
            timestamp: new Date(),
          })

          // Emit custom event for UI updates
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tasks:updated', { detail: tasks }))
          }
        },
        {
          orderBy: { createdAt: 'desc' },
        }
      )

      this.subscriptions.set('tasks', unsubscribe)
      console.log('Tasks sync configured')
    })
  }

  /**
   * Set up environments table synchronization
   */
  private async setupEnvironmentsSync(): Promise<void> {
    return this.observability.trackOperation('sync-service.setup-environments', async () => {
      const unsubscribe = this.electricClient.subscribe<schema.Environment>(
        'environments',
        (environments) => {
          this.observability.recordEvent('sync.environments.updated', {
            count: environments.length,
            timestamp: new Date(),
          })

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('environments:updated', {
                detail: environments,
              })
            )
          }
        },
        {
          orderBy: { createdAt: 'desc' },
        }
      )

      this.subscriptions.set('environments', unsubscribe)
      console.log('Environments sync configured')
    })
  }

  /**
   * Set up agent executions table synchronization
   */
  private async setupAgentExecutionsSync(): Promise<void> {
    return this.observability.trackOperation('sync-service.setup-agent-executions', async () => {
      const unsubscribe = this.electricClient.subscribe<schema.AgentExecution>(
        'agent_executions',
        (executions) => {
          this.observability.recordEvent('sync.agent-executions.updated', {
            count: executions.length,
            timestamp: new Date(),
          })

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('agent-executions:updated', {
                detail: executions,
              })
            )
          }
        },
        {
          orderBy: { startedAt: 'desc' },
          limit: 100, // Limit to recent executions for performance
        }
      )

      this.subscriptions.set('agent_executions', unsubscribe)
      console.log('Agent executions sync configured')
    })
  }

  /**
   * Set up observability events table synchronization
   */
  private async setupObservabilityEventsSync(): Promise<void> {
    return this.observability.trackOperation(
      'sync-service.setup-observability-events',
      async () => {
        const unsubscribe = this.electricClient.subscribe<schema.ObservabilityEvent>(
          'observability_events',
          (events) => {
            this.observability.recordEvent('sync.observability-events.updated', {
              count: events.length,
              timestamp: new Date(),
            })

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('observability-events:updated', {
                  detail: events,
                })
              )
            }
          },
          {
            orderBy: { timestamp: 'desc' },
            limit: 500, // Limit for performance
          }
        )

        this.subscriptions.set('observability_events', unsubscribe)
        console.log('Observability events sync configured')
      }
    )
  }

  /**
   * Set up agent memory table synchronization
   */
  private async setupAgentMemorySync(): Promise<void> {
    return this.observability.trackOperation('sync-service.setup-agent-memory', async () => {
      const unsubscribe = this.electricClient.subscribe<schema.AgentMemory>(
        'agent_memory',
        (memories) => {
          this.observability.recordEvent('sync.agent-memory.updated', {
            count: memories.length,
            timestamp: new Date(),
          })

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('agent-memory:updated', { detail: memories }))
          }
        },
        {
          orderBy: { lastAccessedAt: 'desc' },
          limit: 200,
        }
      )

      this.subscriptions.set('agent_memory', unsubscribe)
      console.log('Agent memory sync configured')
    })
  }

  /**
   * Set up workflows table synchronization
   */
  private async setupWorkflowsSync(): Promise<void> {
    return this.observability.trackOperation('sync-service.setup-workflows', async () => {
      const unsubscribe = this.electricClient.subscribe<schema.Workflow>(
        'workflows',
        (workflows) => {
          this.observability.recordEvent('sync.workflows.updated', {
            count: workflows.length,
            timestamp: new Date(),
          })

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('workflows:updated', { detail: workflows }))
          }
        },
        {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        }
      )

      this.subscriptions.set('workflows', unsubscribe)
      console.log('Workflows sync configured')
    })
  }

  /**
   * Set up workflow executions table synchronization
   */
  private async setupWorkflowExecutionsSync(): Promise<void> {
    return this.observability.trackOperation('sync-service.setup-workflow-executions', async () => {
      const unsubscribe = this.electricClient.subscribe<schema.WorkflowExecution>(
        'workflow_executions',
        (executions) => {
          this.observability.recordEvent('sync.workflow-executions.updated', {
            count: executions.length,
            timestamp: new Date(),
          })

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('workflow-executions:updated', {
                detail: executions,
              })
            )
          }
        },
        {
          orderBy: { startedAt: 'desc' },
          limit: 100,
        }
      )

      this.subscriptions.set('workflow_executions', unsubscribe)
      console.log('Workflow executions sync configured')
    })
  }

  /**
   * Set up execution snapshots table synchronization
   */
  private async setupExecutionSnapshotsSync(): Promise<void> {
    return this.observability.trackOperation('sync-service.setup-execution-snapshots', async () => {
      const unsubscribe = this.electricClient.subscribe<schema.ExecutionSnapshot>(
        'execution_snapshots',
        (snapshots) => {
          this.observability.recordEvent('sync.execution-snapshots.updated', {
            count: snapshots.length,
            timestamp: new Date(),
          })

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('execution-snapshots:updated', {
                detail: snapshots,
              })
            )
          }
        },
        {
          orderBy: { timestamp: 'desc' },
          limit: 200,
        }
      )

      this.subscriptions.set('execution_snapshots', unsubscribe)
      console.log('Execution snapshots sync configured')
    })
  }

  /**
   * Subscribe to specific table changes with custom callback
   */
  subscribeToTable<T>(
    tableName: string,
    callback: (data: T[]) => void,
    options?: {
      where?: any
      orderBy?: any
      limit?: number
    }
  ): () => void {
    return this.observability.trackOperationSync('sync-service.subscribe', () => {
      const subscriptionKey = `custom_${tableName}_${Date.now()}`

      const unsubscribe = this.electricClient.subscribe<T>(
        tableName,
        (data) => {
          this.observability.recordEvent(`sync.${tableName}.custom-update`, {
            count: data.length,
            timestamp: new Date(),
          })
          callback(data)
        },
        options
      )

      this.subscriptions.set(subscriptionKey, unsubscribe)

      return () => {
        unsubscribe()
        this.subscriptions.delete(subscriptionKey)
      }
    })
  }

  /**
   * Force sync for all tables
   */
  async forceSyncAll(): Promise<void> {
    return this.observability.trackOperation('sync-service.force-sync-all', async () => {
      await this.electricClient.forceSync()
      console.log('Forced sync completed for all tables')
    })
  }

  /**
   * Get sync status for all tables
   */
  getSyncStatus(): {
    isConnected: boolean
    syncStatus: string
    lastSyncTime: Date | null
    offlineQueueSize: number
    conflictCount: number
    activeSubscriptions: number
  } {
    const connectionStatus = this.electricClient.getConnectionStatus()

    return {
      ...connectionStatus,
      activeSubscriptions: this.subscriptions.size,
    }
  }

  /**
   * Get conflict log
   */
  getConflictLog(): Array<{
    table: string
    id: string
    conflict: any
    resolution: any
    timestamp: Date
  }> {
    return this.electricClient.getConflictLog()
  }

  /**
   * Set up periodic health checks
   */
  startHealthMonitoring(intervalMs = 30000): void {
    const healthCheckInterval = setInterval(async () => {
      try {
        const status = this.getSyncStatus()

        this.observability.recordEvent('sync-service.health-check', {
          status,
          timestamp: new Date(),
        })

        // Alert if offline queue is getting large
        if (status.offlineQueueSize > 100) {
          console.warn(`Large offline queue detected: ${status.offlineQueueSize} operations`)
        }

        // Alert if many conflicts
        if (status.conflictCount > 50) {
          console.warn(`High conflict count detected: ${status.conflictCount} conflicts`)
        }

        // Alert if disconnected for too long
        if (!status.isConnected && status.lastSyncTime) {
          const timeSinceLastSync = Date.now() - status.lastSyncTime.getTime()
          if (timeSinceLastSync > 300000) {
            // 5 minutes
            console.warn(`ElectricSQL disconnected for ${Math.round(timeSinceLastSync / 1000)}s`)
          }
        }
      } catch (error) {
        this.observability.recordError('sync-service.health-check', error as Error)
      }
    }, intervalMs)

    // Store interval for cleanup
    this.syncIntervals.set('health-check', healthCheckInterval)
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup(): Promise<void> {
    return this.observability.trackOperation('sync-service.cleanup', async () => {
      // Clear all intervals
      for (const interval of this.syncIntervals.values()) {
        clearInterval(interval)
      }
      this.syncIntervals.clear()

      // Unsubscribe from all subscriptions
      for (const unsubscribe of this.subscriptions.values()) {
        unsubscribe()
      }
      this.subscriptions.clear()

      // Disconnect ElectricSQL client
      await this.electricClient.disconnect()

      this.isInitialized = false
      console.log('ElectricSQL sync service cleaned up')
    })
  }

  /**
   * Reset service instance (for testing)
   */
  static reset(): void {
    if (ElectricSyncService.instance) {
      ElectricSyncService.instance.cleanup().catch(console.error)
      ElectricSyncService.instance = null
    }
  }
}

// Export singleton instance
export const electricSyncService = ElectricSyncService.getInstance()
