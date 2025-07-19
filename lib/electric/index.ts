// ElectricSQL Real-time Sync Integration
// This module provides offline-first real-time synchronization with conflict resolution

export { ElectricClient, electricClient } from './client'
export { ElectricDatabaseClient, electricDatabaseClient } from './database-client'
export { ElectricSyncService, electricSyncService } from './sync-service'
export { EnhancedElectricSyncService, enhancedElectricSyncService } from './enhanced-sync-service'
export { ConflictResolutionService, conflictResolutionService } from './conflict-resolution'
export { ElectricAuthService, electricAuthService } from './auth'
export {
  electricConfig,
  getFinalConfig,
  validateElectricConfig,
  electricDb,
  type SyncEvent,
} from './config'
export { pgliteConfig, getPGliteInstance } from './simple-config'

// Re-export types from schema
export type {
  Task,
  NewTask,
  Environment,
  NewEnvironment,
  AgentExecution,
  NewAgentExecution,
  ObservabilityEvent,
  NewObservabilityEvent,
  AgentMemory,
  NewAgentMemory,
  Workflow,
  NewWorkflow,
  WorkflowExecution,
  NewWorkflowExecution,
  ExecutionSnapshot,
  NewExecutionSnapshot,
} from '../../db/schema'

// Main initialization function
export async function initializeElectricSQL(options?: {
  userId?: string
  apiKey?: string
  customToken?: string
  enableHealthMonitoring?: boolean
}): Promise<void> {
  const { electricAuthService, electricSyncService } = await import('./index')

  try {
    console.log('Initializing ElectricSQL integration...')

    // Initialize authentication
    await electricAuthService.initialize({
      userId: options?.userId,
      apiKey: options?.apiKey,
      customToken: options?.customToken,
    })

    // Initialize sync service
    await electricSyncService.initialize()

    // Start health monitoring if enabled
    if (options?.enableHealthMonitoring !== false) {
      electricSyncService.startHealthMonitoring()
    }

    console.log('ElectricSQL integration initialized successfully')
  } catch (error) {
    console.error('Failed to initialize ElectricSQL integration:', error)
    throw error
  }
}

// Cleanup function
export async function cleanupElectricSQL(): Promise<void> {
  const { electricSyncService, electricAuthService } = await import('./index')

  try {
    await electricSyncService.cleanup()
    await electricAuthService.logout()
    console.log('ElectricSQL integration cleaned up')
  } catch (error) {
    console.error('Failed to cleanup ElectricSQL integration:', error)
    throw error
  }
}

// Health check function
export function getElectricSQLHealth(): {
  auth: {
    hasToken: boolean
    isExpired: boolean
    expiresAt: Date | null
    timeUntilExpiry: number | null
  }
  sync: {
    isConnected: boolean
    syncStatus: string
    lastSyncTime: Date | null
    offlineQueueSize: number
    conflictCount: number
    activeSubscriptions: number
  }
} {
  const { electricAuthService, electricSyncService } = require('./index')

  return {
    auth: electricAuthService.getTokenInfo(),
    sync: electricSyncService.getSyncStatus(),
  }
}

// Utility functions for common operations
export class ElectricSQLUtils {
  /**
   * Subscribe to real-time updates for a specific table
   */
  static subscribeToTable<T>(
    tableName: string,
    callback: (data: T[]) => void,
    options?: {
      where?: any
      orderBy?: any
      limit?: number
    }
  ): () => void {
    const { electricSyncService } = require('./index')
    return electricSyncService.subscribeToTable(tableName, callback, options)
  }

  /**
   * Force sync for all tables
   */
  static async forceSyncAll(): Promise<void> {
    const { electricSyncService } = require('./index')
    return electricSyncService.forceSyncAll()
  }

  /**
   * Get conflict log for debugging
   */
  static getConflictLog(): Array<{
    table: string
    id: string
    conflict: any
    resolution: any
    timestamp: Date
  }> {
    const { electricSyncService } = require('./index')
    return electricSyncService.getConflictLog()
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(operation: 'read' | 'write' | 'delete' | 'admin'): boolean {
    const { electricAuthService } = require('./index')
    return electricAuthService.hasPermission(operation)
  }

  /**
   * Get authorization headers for API requests
   */
  static getAuthHeaders(): Record<string, string> {
    const { electricAuthService } = require('./index')
    return electricAuthService.getAuthHeaders()
  }
}

// React hooks for ElectricSQL integration (to be used with TanStack Query)
export const useElectricSQLStatus = () => {
  if (typeof window === 'undefined') {
    return {
      isConnected: false,
      syncStatus: 'disconnected',
      lastSyncTime: null,
      offlineQueueSize: 0,
      conflictCount: 0,
      activeSubscriptions: 0,
    }
  }

  const { electricSyncService } = require('./index')
  return electricSyncService.getSyncStatus()
}

export const useElectricSQLAuth = () => {
  if (typeof window === 'undefined') {
    return {
      hasToken: false,
      isExpired: true,
      expiresAt: null,
      timeUntilExpiry: null,
    }
  }

  const { electricAuthService } = require('./index')
  return electricAuthService.getTokenInfo()
}

// Error classes
export class ElectricSQLError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ElectricSQLError'
  }
}

export class ElectricSQLAuthError extends ElectricSQLError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', details)
    this.name = 'ElectricSQLAuthError'
  }
}

export class ElectricSQLSyncError extends ElectricSQLError {
  constructor(message: string, details?: any) {
    super(message, 'SYNC_ERROR', details)
    this.name = 'ElectricSQLSyncError'
  }
}

export class ElectricSQLConflictError extends ElectricSQLError {
  constructor(
    message: string,
    public conflictData: any
  ) {
    super(message, 'CONFLICT_ERROR', conflictData)
    this.name = 'ElectricSQLConflictError'
  }
}
