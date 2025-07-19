/**
 * Time-Travel Debugging System
 *
 * Comprehensive debugging tools for agent execution analysis,
 * state inspection, and performance profiling.
 */

// Export React components
export { ExecutionTimeline } from '@/components/debug/execution-timeline'
export { StateDiffViewer } from '@/components/debug/state-diff-viewer'
export { StateReplayViewer } from '@/components/debug/state-replay-viewer'
export { TimeTravelDebugDashboard } from '@/components/debug/time-travel-debug-dashboard'
// Export hooks
export * from '@/hooks/use-time-travel-debug'
// Re-export time-travel components
export * from '@/lib/time-travel'
export * from './execution-comparison'
// Export session management
export * from './session-manager'

import { timeTravel } from '@/lib/time-travel'
import { comparisonEngine } from './execution-comparison'
// Main debug API
import { debugSessionManager } from './session-manager'

export const debug = {
  // Session management
  sessions: debugSessionManager,

  // Comparison tools
  compare: comparisonEngine,

  // Time travel
  timeTravel,

  // Quick start methods
  async startDebugSession(executionId: string, userId: string) {
    return debugSessionManager.createSession(executionId, userId)
  },

  async compareExecutions(leftId: string, rightId: string) {
    const leftSnapshots = await timeTravel.system.getExecutionSnapshots(leftId)
    const rightSnapshots = await timeTravel.system.getExecutionSnapshots(rightId)

    if (leftSnapshots.length === 0 || rightSnapshots.length === 0) {
      throw new Error('No snapshots found for comparison')
    }

    // Compare last snapshots by default
    return comparisonEngine.compareSnapshots(
      leftSnapshots[leftSnapshots.length - 1],
      rightSnapshots[rightSnapshots.length - 1]
    )
  },
}

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  // Initialize debug system on next tick
  setTimeout(() => {
    timeTravel.initialize().catch(console.error)
  }, 0)
}
