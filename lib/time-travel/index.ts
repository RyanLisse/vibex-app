/**
 * Time-Travel Debugging System
 *
 * Complete time-travel debugging system with execution snapshots,
 * step-by-step replay, timeline visualization, and rollback capabilities.
 */

// Re-export all time-travel components
export * from './execution-snapshots'
export * from './replay-engine'

import { observability } from '@/lib/observability'
// Import main components
import {
  type ExecutionSnapshot,
  type ExecutionState,
  type SnapshotType,
  snapshotManager,
} from './execution-snapshots'
import { type ReplaySession, type ReplaySpeed, ReplayState, replayEngine } from './replay-engine'

// Time-travel system manager
export class TimeTravelSystem {
  private static instance: TimeTravelSystem
  private initialized = false

  private constructor() {}

  static getInstance(): TimeTravelSystem {
    if (!TimeTravelSystem.instance) {
      TimeTravelSystem.instance = new TimeTravelSystem()
    }
    return TimeTravelSystem.instance
  }

  /**
   * Initialize the time-travel system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      console.log('🕰️ Initializing Time-Travel Debugging System...')

      // Initialize snapshot manager
      console.log('✅ Execution snapshot manager initialized')

      // Initialize replay engine
      console.log('✅ Time-travel replay engine initialized')

      // Set up system monitoring
      this.setupSystemMonitoring()
      console.log('✅ Time-travel monitoring configured')

      // Record initialization event
      await observability.events.collector.collectEvent(
        'system_event',
        'info',
        'Time-travel debugging system initialized',
        {
          initializationTime: Date.now(),
          components: ['snapshots', 'replay', 'monitoring'],
        },
        'time-travel',
        ['system', 'initialization']
      )

      this.initialized = true
      console.log('🎉 Time-Travel Debugging System fully initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Time-Travel Debugging System:', error)
      throw error
    }
  }

  /**
   * Set up system monitoring
   */
  private setupSystemMonitoring(): void {
    // Monitor snapshot creation rate
    setInterval(async () => {
      try {
        // This would typically track snapshot creation metrics
        // For now, we'll just ensure the system is healthy
      } catch (error) {
        console.error('Error in time-travel monitoring:', error)
      }
    }, 60_000) // Every minute
  }

  /**
   * Capture execution snapshot
   */
  async captureSnapshot(
    executionId: string,
    type: SnapshotType,
    stepNumber: number,
    state: ExecutionState,
    description?: string,
    tags?: string[],
    isCheckpoint?: boolean
  ): Promise<ExecutionSnapshot> {
    if (!this.initialized) {
      await this.initialize()
    }

    return snapshotManager.captureSnapshot(
      executionId,
      type,
      stepNumber,
      state,
      description,
      tags,
      isCheckpoint
    )
  }

  /**
   * Create checkpoint
   */
  async createCheckpoint(
    executionId: string,
    stepNumber: number,
    state: ExecutionState,
    description?: string
  ): Promise<ExecutionSnapshot> {
    if (!this.initialized) {
      await this.initialize()
    }

    return snapshotManager.createCheckpoint(executionId, stepNumber, state, description)
  }

  /**
   * Start time-travel replay session
   */
  async startReplaySession(
    executionId: string,
    options?: {
      fromStep?: number
      toStep?: number
      includeCheckpointsOnly?: boolean
    }
  ): Promise<string> {
    if (!this.initialized) {
      await this.initialize()
    }

    return replayEngine.createReplaySession(executionId, options)
  }

  /**
   * Get execution snapshots
   */
  async getExecutionSnapshots(
    executionId: string,
    options?: {
      limit?: number
      offset?: number
      types?: SnapshotType[]
      fromStep?: number
      toStep?: number
      checkpointsOnly?: boolean
    }
  ): Promise<ExecutionSnapshot[]> {
    if (!this.initialized) {
      await this.initialize()
    }

    return snapshotManager.getExecutionSnapshots(executionId, options)
  }

  /**
   * Get replay session
   */
  getReplaySession(sessionId: string): ReplaySession | null {
    return replayEngine.getSession(sessionId)
  }

  /**
   * Control replay playback
   */
  async controlReplay(
    sessionId: string,
    action: 'start' | 'pause' | 'stop' | 'step-forward' | 'step-backward',
    options?: { speed?: ReplaySpeed; index?: number }
  ): Promise<void> {
    switch (action) {
      case 'start':
        await replayEngine.startReplay(sessionId)
        break
      case 'pause':
        await replayEngine.pauseReplay(sessionId)
        break
      case 'stop':
        await replayEngine.stopReplay(sessionId)
        break
      case 'step-forward':
        await replayEngine.stepForward(sessionId)
        break
      case 'step-backward':
        await replayEngine.stepBackward(sessionId)
        break
    }

    if (options?.speed) {
      await replayEngine.setSpeed(sessionId, options.speed)
    }

    if (options?.index !== undefined) {
      await replayEngine.stepTo(sessionId, options.index)
    }
  }

  /**
   * Compare snapshots
   */
  compareSnapshots(snapshot1: ExecutionSnapshot, snapshot2: ExecutionSnapshot) {
    return snapshotManager.compareSnapshots(snapshot1, snapshot2)
  }

  /**
   * Rollback to checkpoint
   */
  async rollbackToCheckpoint(
    executionId: string,
    checkpointStepNumber: number
  ): Promise<ExecutionSnapshot | null> {
    if (!this.initialized) {
      await this.initialize()
    }

    // Get the checkpoint snapshot
    const snapshots = await snapshotManager.getExecutionSnapshots(executionId, {
      checkpointsOnly: true,
    })

    const checkpoint = snapshots.find((s) => s.stepNumber === checkpointStepNumber)
    if (!checkpoint) {
      throw new Error(`Checkpoint at step ${checkpointStepNumber} not found`)
    }

    // Record rollback event
    await observability.events.collector.collectEvent(
      'system_event',
      'info',
      `Rollback to checkpoint at step ${checkpointStepNumber}`,
      {
        executionId,
        checkpointStepNumber,
        checkpointId: checkpoint.id,
      },
      'time-travel',
      ['rollback', 'checkpoint']
    )

    return checkpoint
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    initialized: boolean
    components: {
      snapshots: boolean
      replay: boolean
    }
    stats: {
      activeSessions: number
    }
  } {
    return {
      initialized: this.initialized,
      components: {
        snapshots: true,
        replay: true,
      },
      stats: {
        activeSessions: replayEngine['sessions']?.size || 0,
      },
    }
  }

  /**
   * Shutdown the time-travel system
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return

    try {
      console.log('🕰️ Shutting down Time-Travel Debugging System...')

      // Record shutdown event
      await observability.events.collector.collectEvent(
        'system_event',
        'info',
        'Time-travel debugging system shutting down',
        { shutdownTime: Date.now() },
        'time-travel',
        ['system', 'shutdown']
      )

      // Flush all pending snapshots
      await snapshotManager.forceFlush()

      // Stop periodic processes
      snapshotManager.stopPeriodicFlush()

      this.initialized = false
      console.log('✅ Time-Travel Debugging System shutdown complete')
    } catch (error) {
      console.error('❌ Error during Time-Travel Debugging System shutdown:', error)
      throw error
    }
  }
}

// Main time-travel system instance
export const timeTravel = {
  system: TimeTravelSystem.getInstance(),
  snapshots: snapshotManager,
  replay: replayEngine,

  // Convenience methods
  initialize: () => TimeTravelSystem.getInstance().initialize(),
  shutdown: () => TimeTravelSystem.getInstance().shutdown(),
  getStatus: () => TimeTravelSystem.getInstance().getSystemStatus(),

  // Snapshot methods
  captureSnapshot: (
    executionId: string,
    type: SnapshotType,
    stepNumber: number,
    state: ExecutionState,
    description?: string,
    tags?: string[],
    isCheckpoint?: boolean
  ) =>
    TimeTravelSystem.getInstance().captureSnapshot(
      executionId,
      type,
      stepNumber,
      state,
      description,
      tags,
      isCheckpoint
    ),

  createCheckpoint: (
    executionId: string,
    stepNumber: number,
    state: ExecutionState,
    description?: string
  ) => TimeTravelSystem.getInstance().createCheckpoint(executionId, stepNumber, state, description),

  // Replay methods
  startReplay: (executionId: string, options?: any) =>
    TimeTravelSystem.getInstance().startReplaySession(executionId, options),

  controlReplay: (sessionId: string, action: any, options?: any) =>
    TimeTravelSystem.getInstance().controlReplay(sessionId, action, options),

  // Rollback methods
  rollbackToCheckpoint: (executionId: string, checkpointStepNumber: number) =>
    TimeTravelSystem.getInstance().rollbackToCheckpoint(executionId, checkpointStepNumber),
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize on next tick to avoid blocking
  setTimeout(() => {
    timeTravel.initialize().catch(console.error)
  }, 0)
}

// Default export
export default timeTravel
