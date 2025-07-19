/**
 * Execution Snapshots System
 *
 * Captures complete state snapshots during agent execution for time-travel debugging,
 * step-by-step replay, and execution comparison capabilities.
 */

import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '@/db/config'
import { agentExecutions, executionSnapshots } from '@/db/schema'
import { observability } from '@/lib/observability'

// Snapshot types
export type SnapshotType =
  | 'execution_start'
  | 'step_start'
  | 'step_end'
  | 'decision_point'
  | 'error_state'
  | 'execution_end'
  | 'checkpoint'
  | 'rollback_point'

// Execution state interface
export interface ExecutionState {
  // Agent state
  agentId: string
  sessionId: string
  currentStep: number
  totalSteps?: number

  // Memory state
  memory: {
    shortTerm: Record<string, any>
    longTerm: Record<string, any>
    context: Record<string, any>
    variables: Record<string, any>
  }

  // Execution context
  context: {
    environment: Record<string, any>
    tools: string[]
    permissions: string[]
    constraints: Record<string, any>
  }

  // Current operation
  currentOperation?: {
    type: string
    name: string
    parameters: Record<string, any>
    startTime: Date
    status: 'pending' | 'running' | 'completed' | 'failed'
  }

  // Results and outputs
  outputs: {
    messages: any[]
    artifacts: any[]
    sideEffects: any[]
    metrics: Record<string, number>
  }

  // Error information
  error?: {
    type: string
    message: string
    stack?: string
    context: Record<string, any>
  }

  // Performance metrics
  performance: {
    memoryUsage: number
    cpuTime: number
    networkCalls: number
    databaseQueries: number
    wasmOperations: number
  }
}

// Snapshot interface
export interface ExecutionSnapshot {
  id: string
  executionId: string
  type: SnapshotType
  stepNumber: number
  timestamp: Date
  state: ExecutionState
  metadata: {
    description: string
    tags: string[]
    isCheckpoint: boolean
    canRollback: boolean
    diffFromPrevious?: Record<string, any>
  }
}

// Snapshot manager class
export class ExecutionSnapshotManager {
  private static instance: ExecutionSnapshotManager
  private snapshotBuffer: Map<string, ExecutionSnapshot[]> = new Map()
  private readonly MAX_BUFFER_SIZE = 50
  private readonly FLUSH_INTERVAL = 10_000 // 10 seconds
  private flushInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.startPeriodicFlush()
  }

  static getInstance(): ExecutionSnapshotManager {
    if (!ExecutionSnapshotManager.instance) {
      ExecutionSnapshotManager.instance = new ExecutionSnapshotManager()
    }
    return ExecutionSnapshotManager.instance
  }

  /**
   * Capture execution snapshot
   */
  async captureSnapshot(
    executionId: string,
    type: SnapshotType,
    stepNumber: number,
    state: ExecutionState,
    description = '',
    tags: string[] = [],
    isCheckpoint = false
  ): Promise<ExecutionSnapshot> {
    const snapshot: ExecutionSnapshot = {
      id: ulid(),
      executionId,
      type,
      stepNumber,
      timestamp: new Date(),
      state: this.deepClone(state),
      metadata: {
        description,
        tags,
        isCheckpoint,
        canRollback: isCheckpoint || type === 'checkpoint' || type === 'rollback_point',
      },
    }

    // Calculate diff from previous snapshot
    const previousSnapshot = await this.getLatestSnapshot(executionId)
    if (previousSnapshot) {
      snapshot.metadata.diffFromPrevious = this.calculateStateDiff(previousSnapshot.state, state)
    }

    // Add to buffer
    if (!this.snapshotBuffer.has(executionId)) {
      this.snapshotBuffer.set(executionId, [])
    }

    const buffer = this.snapshotBuffer.get(executionId)!
    buffer.push(snapshot)

    // Trim buffer if too large
    if (buffer.length > this.MAX_BUFFER_SIZE) {
      buffer.shift()
    }

    // Flush if buffer is getting full
    if (buffer.length >= this.MAX_BUFFER_SIZE * 0.8) {
      await this.flushSnapshots(executionId)
    }

    // Record observability event
    await observability.events.collector.collectEvent(
      'step_start',
      'debug',
      `Execution snapshot captured: ${type}`,
      {
        executionId,
        snapshotId: snapshot.id,
        type,
        stepNumber,
        isCheckpoint,
        stateSize: JSON.stringify(state).length,
      },
      'time-travel',
      ['snapshot', 'capture', type]
    )

    return snapshot
  }

  /**
   * Get snapshots for an execution
   */
  async getExecutionSnapshots(
    executionId: string,
    options: {
      limit?: number
      offset?: number
      types?: SnapshotType[]
      fromStep?: number
      toStep?: number
      checkpointsOnly?: boolean
    } = {}
  ): Promise<ExecutionSnapshot[]> {
    const { limit = 100, offset = 0, types, fromStep, toStep, checkpointsOnly = false } = options

    try {
      // Build query conditions
      const conditions = [eq(executionSnapshots.executionId, executionId)]

      if (types && types.length > 0) {
        conditions.push(eq(executionSnapshots.type, types[0])) // Simplified for demo
      }

      if (fromStep !== undefined) {
        conditions.push(gte(executionSnapshots.stepNumber, fromStep))
      }

      if (toStep !== undefined) {
        conditions.push(lte(executionSnapshots.stepNumber, toStep))
      }

      // Execute query
      const snapshots = await db
        .select()
        .from(executionSnapshots)
        .where(and(...conditions))
        .orderBy(desc(executionSnapshots.stepNumber))
        .limit(limit)
        .offset(offset)

      // Filter checkpoints if requested
      const filteredSnapshots = checkpointsOnly
        ? snapshots.filter((s) => s.metadata?.isCheckpoint)
        : snapshots

      return filteredSnapshots.map(this.mapDbSnapshotToSnapshot)
    } catch (error) {
      console.error('Failed to get execution snapshots:', error)
      throw new Error('Failed to retrieve execution snapshots')
    }
  }

  /**
   * Get latest snapshot for execution
   */
  async getLatestSnapshot(executionId: string): Promise<ExecutionSnapshot | null> {
    try {
      // Check buffer first
      const buffer = this.snapshotBuffer.get(executionId)
      if (buffer && buffer.length > 0) {
        return buffer[buffer.length - 1]
      }

      // Query database
      const [snapshot] = await db
        .select()
        .from(executionSnapshots)
        .where(eq(executionSnapshots.executionId, executionId))
        .orderBy(desc(executionSnapshots.stepNumber))
        .limit(1)

      return snapshot ? this.mapDbSnapshotToSnapshot(snapshot) : null
    } catch (error) {
      console.error('Failed to get latest snapshot:', error)
      return null
    }
  }

  /**
   * Get checkpoint snapshots for rollback
   */
  async getCheckpoints(executionId: string): Promise<ExecutionSnapshot[]> {
    return this.getExecutionSnapshots(executionId, { checkpointsOnly: true })
  }

  /**
   * Create checkpoint snapshot
   */
  async createCheckpoint(
    executionId: string,
    stepNumber: number,
    state: ExecutionState,
    description = 'Manual checkpoint'
  ): Promise<ExecutionSnapshot> {
    return this.captureSnapshot(
      executionId,
      'checkpoint',
      stepNumber,
      state,
      description,
      ['checkpoint', 'manual'],
      true
    )
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(
    snapshot1: ExecutionSnapshot,
    snapshot2: ExecutionSnapshot
  ): {
    differences: Record<string, any>
    summary: {
      stateChanges: number
      memoryChanges: number
      outputChanges: number
      performanceChanges: Record<string, number>
    }
  } {
    const diff = this.calculateStateDiff(snapshot1.state, snapshot2.state)

    const summary = {
      stateChanges: Object.keys(diff).length,
      memoryChanges: Object.keys(diff.memory || {}).length,
      outputChanges: Object.keys(diff.outputs || {}).length,
      performanceChanges: diff.performance || {},
    }

    return { differences: diff, summary }
  }

  /**
   * Calculate state difference
   */
  private calculateStateDiff(
    oldState: ExecutionState,
    newState: ExecutionState
  ): Record<string, any> {
    const diff: Record<string, any> = {}

    // Compare top-level properties
    for (const key in newState) {
      if (key in oldState) {
        const oldValue = (oldState as any)[key]
        const newValue = (newState as any)[key]

        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          diff[key] = {
            old: oldValue,
            new: newValue,
          }
        }
      } else {
        diff[key] = {
          old: undefined,
          new: (newState as any)[key],
        }
      }
    }

    // Check for removed properties
    for (const key in oldState) {
      if (!(key in newState)) {
        diff[key] = {
          old: (oldState as any)[key],
          new: undefined,
        }
      }
    }

    return diff
  }

  /**
   * Deep clone object
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }

  /**
   * Map database snapshot to interface
   */
  private mapDbSnapshotToSnapshot(dbSnapshot: any): ExecutionSnapshot {
    return {
      id: dbSnapshot.id,
      executionId: dbSnapshot.executionId,
      type: dbSnapshot.type,
      stepNumber: dbSnapshot.stepNumber,
      timestamp: dbSnapshot.timestamp,
      state: dbSnapshot.state,
      metadata: dbSnapshot.metadata || {},
    }
  }

  /**
   * Flush snapshots to database
   */
  private async flushSnapshots(executionId?: string): Promise<void> {
    const executionsToFlush = executionId ? [executionId] : Array.from(this.snapshotBuffer.keys())

    for (const execId of executionsToFlush) {
      const buffer = this.snapshotBuffer.get(execId)
      if (!buffer || buffer.length === 0) continue

      const snapshotsToFlush = [...buffer]
      this.snapshotBuffer.set(execId, [])

      try {
        await db.insert(executionSnapshots).values(
          snapshotsToFlush.map((snapshot) => ({
            id: snapshot.id,
            executionId: snapshot.executionId,
            type: snapshot.type,
            stepNumber: snapshot.stepNumber,
            timestamp: snapshot.timestamp,
            state: snapshot.state,
            metadata: snapshot.metadata,
          }))
        )
      } catch (error) {
        console.error(`Failed to flush snapshots for execution ${execId}:`, error)
        // Re-add snapshots to buffer for retry
        const currentBuffer = this.snapshotBuffer.get(execId) || []
        this.snapshotBuffer.set(execId, [...snapshotsToFlush, ...currentBuffer])
      }
    }
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushSnapshots().catch(console.error)
    }, this.FLUSH_INTERVAL)
  }

  /**
   * Stop periodic flush
   */
  stopPeriodicFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
  }

  /**
   * Force flush all snapshots
   */
  async forceFlush(): Promise<void> {
    await this.flushSnapshots()
  }
}

// Export singleton instance
export const snapshotManager = ExecutionSnapshotManager.getInstance()
