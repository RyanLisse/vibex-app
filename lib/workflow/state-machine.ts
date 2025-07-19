/**
 * Workflow State Machine
 *
 * Implements state transitions and workflow lifecycle management
 */

import { EventEmitter } from 'events'
import type {
  WorkflowError,
  WorkflowEvent,
  WorkflowExecutionState,
  WorkflowStatus,
  WorkflowTransition,
} from './types'

// State machine configuration
export interface StateMachineConfig {
  initialStatus: WorkflowStatus
  transitions: WorkflowTransition[]
  onStateChange?: (
    fromStatus: WorkflowStatus,
    toStatus: WorkflowStatus,
    state: WorkflowExecutionState
  ) => void
  onError?: (error: WorkflowError, state: WorkflowExecutionState) => void
}

// Workflow state machine
export class WorkflowStateMachine extends EventEmitter {
  private transitions: Map<WorkflowStatus, WorkflowTransition[]> = new Map()
  private currentState: WorkflowExecutionState | null = null

  constructor(private config: StateMachineConfig) {
    super()
    this.initializeTransitions()
  }

  private initializeTransitions(): void {
    // Group transitions by from status
    for (const transition of this.config.transitions) {
      const existing = this.transitions.get(transition.fromStatus) || []
      existing.push(transition)
      this.transitions.set(transition.fromStatus, existing)
    }
  }

  /**
   * Initialize state machine with execution state
   */
  initialize(state: WorkflowExecutionState): void {
    this.currentState = state
    this.emit('initialized', state)
  }

  /**
   * Get current state
   */
  getState(): WorkflowExecutionState | null {
    return this.currentState
  }

  /**
   * Check if transition is allowed
   */
  canTransition(toStatus: WorkflowStatus): boolean {
    if (!this.currentState) {
      return false
    }

    const possibleTransitions = this.transitions.get(this.currentState.status) || []

    return possibleTransitions.some((t) => {
      if (t.toStatus !== toStatus) {
        return false
      }

      if (t.condition) {
        try {
          return t.condition(this.currentState!)
        } catch {
          return false
        }
      }

      return true
    })
  }

  /**
   * Perform state transition
   */
  async transition(
    toStatus: WorkflowStatus,
    updates?: Partial<WorkflowExecutionState>
  ): Promise<void> {
    if (!this.currentState) {
      throw new Error('State machine not initialized')
    }

    const fromStatus = this.currentState.status

    if (!this.canTransition(toStatus)) {
      throw new Error(`Invalid transition from ${fromStatus} to ${toStatus}`)
    }

    // Find the matching transition
    const possibleTransitions = this.transitions.get(fromStatus) || []
    const transition = possibleTransitions.find(
      (t) => t.toStatus === toStatus && (!t.condition || t.condition(this.currentState!))
    )

    if (!transition) {
      throw new Error(`No valid transition found from ${fromStatus} to ${toStatus}`)
    }

    // Update state
    const previousState = { ...this.currentState }
    this.currentState = {
      ...this.currentState,
      ...updates,
      status: toStatus,
    }

    // Apply transition-specific updates
    switch (toStatus) {
      case 'paused':
        this.currentState.pausedAt = new Date()
        break
      case 'resumed':
        this.currentState.resumedAt = new Date()
        this.currentState.status = 'running' // Resume goes back to running
        break
      case 'completed':
      case 'failed':
      case 'cancelled':
        this.currentState.completedAt = new Date()
        break
    }

    // Execute transition action if defined
    if (transition.action) {
      try {
        await transition.action(this.currentState)
      } catch (error) {
        // Rollback state on action failure
        this.currentState = previousState
        throw error
      }
    }

    // Emit events
    this.emit('stateChanged', fromStatus, toStatus, this.currentState)
    this.emit(`entered:${toStatus}`, this.currentState)
    this.emit(`exited:${fromStatus}`, previousState)

    // Call config callback
    if (this.config.onStateChange) {
      this.config.onStateChange(fromStatus, toStatus, this.currentState)
    }
  }

  /**
   * Handle workflow error
   */
  handleError(error: WorkflowError): void {
    if (!this.currentState) {
      throw new Error('State machine not initialized')
    }

    this.currentState.error = error

    this.emit('error', error, this.currentState)

    if (this.config.onError) {
      this.config.onError(error, this.currentState)
    }
  }

  /**
   * Get available transitions from current state
   */
  getAvailableTransitions(): WorkflowStatus[] {
    if (!this.currentState) {
      return []
    }

    const possibleTransitions = this.transitions.get(this.currentState.status) || []

    return possibleTransitions
      .filter((t) => !t.condition || t.condition(this.currentState!))
      .map((t) => t.toStatus)
  }

  /**
   * Reset state machine
   */
  reset(): void {
    this.currentState = null
    this.removeAllListeners()
  }
}

// Default workflow transitions
export const DEFAULT_WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  // From pending
  {
    fromStatus: 'pending',
    toStatus: 'running',
  },
  {
    fromStatus: 'pending',
    toStatus: 'cancelled',
  },

  // From running
  {
    fromStatus: 'running',
    toStatus: 'paused',
  },
  {
    fromStatus: 'running',
    toStatus: 'completed',
    condition: (state) => !state.error,
  },
  {
    fromStatus: 'running',
    toStatus: 'failed',
    condition: (state) => !!state.error,
  },
  {
    fromStatus: 'running',
    toStatus: 'cancelled',
  },

  // From paused
  {
    fromStatus: 'paused',
    toStatus: 'running',
  },
  {
    fromStatus: 'paused',
    toStatus: 'cancelled',
  },

  // From failed
  {
    fromStatus: 'failed',
    toStatus: 'running', // Allow retry
  },

  // Terminal states (no transitions)
  // completed, cancelled, terminated
]

// State machine factory
export function createWorkflowStateMachine(
  config?: Partial<StateMachineConfig>
): WorkflowStateMachine {
  return new WorkflowStateMachine({
    initialStatus: 'pending',
    transitions: DEFAULT_WORKFLOW_TRANSITIONS,
    ...config,
  })
}

// State validation utilities
export const StateValidation = {
  /**
   * Check if status is terminal
   */
  isTerminal(status: WorkflowStatus): boolean {
    return ['completed', 'failed', 'cancelled', 'terminated'].includes(status)
  },

  /**
   * Check if status is active
   */
  isActive(status: WorkflowStatus): boolean {
    return ['running', 'paused'].includes(status)
  },

  /**
   * Check if status can be retried
   */
  canRetry(status: WorkflowStatus): boolean {
    return status === 'failed'
  },

  /**
   * Check if status can be paused
   */
  canPause(status: WorkflowStatus): boolean {
    return status === 'running'
  },

  /**
   * Check if status can be resumed
   */
  canResume(status: WorkflowStatus): boolean {
    return status === 'paused'
  },

  /**
   * Check if status can be cancelled
   */
  canCancel(status: WorkflowStatus): boolean {
    return ['pending', 'running', 'paused'].includes(status)
  },
}

// State machine hooks for React
export interface UseStateMachineOptions {
  onStateChange?: (fromStatus: WorkflowStatus, toStatus: WorkflowStatus) => void
  onError?: (error: WorkflowError) => void
}

export function useWorkflowStateMachine(
  initialState?: WorkflowExecutionState,
  options?: UseStateMachineOptions
): {
  state: WorkflowExecutionState | null
  status: WorkflowStatus | null
  canTransition: (toStatus: WorkflowStatus) => boolean
  transition: (toStatus: WorkflowStatus, updates?: Partial<WorkflowExecutionState>) => Promise<void>
  availableTransitions: WorkflowStatus[]
  isTerminal: boolean
  isActive: boolean
  canPause: boolean
  canResume: boolean
  canCancel: boolean
  canRetry: boolean
} {
  const stateMachine = createWorkflowStateMachine({
    onStateChange: options?.onStateChange,
    onError: options?.onError,
  })

  if (initialState) {
    stateMachine.initialize(initialState)
  }

  const state = stateMachine.getState()
  const status = state?.status || null

  return {
    state,
    status,
    canTransition: (toStatus) => stateMachine.canTransition(toStatus),
    transition: (toStatus, updates) => stateMachine.transition(toStatus, updates),
    availableTransitions: stateMachine.getAvailableTransitions(),
    isTerminal: status ? StateValidation.isTerminal(status) : false,
    isActive: status ? StateValidation.isActive(status) : false,
    canPause: status ? StateValidation.canPause(status) : false,
    canResume: status ? StateValidation.canResume(status) : false,
    canCancel: status ? StateValidation.canCancel(status) : false,
    canRetry: status ? StateValidation.canRetry(status) : false,
  }
}
