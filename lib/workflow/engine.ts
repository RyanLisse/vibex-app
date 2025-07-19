import { and, eq } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '@/db/config'
import {
  type ExecutionSnapshot,
  executionSnapshots,
  observabilityEvents,
  type Workflow,
  type WorkflowExecution,
  workflowExecutions,
  workflows,
} from '@/db/schema'
import { inngest } from '@/lib/inngest'
import { observability } from '@/lib/observability'
import { snapshotManager } from '@/lib/time-travel/execution-snapshots'
import { stepExecutorRegistry } from './executors'
import { createWorkflowStateMachine, StateValidation } from './state-machine'
import { templateRegistry } from './templates'
import type {
  StepConfig,
  StepExecutionResult,
  StepExecutionState,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowError,
  WorkflowEvent,
  WorkflowExecutionState,
  WorkflowMetrics,
} from './types'

/**
 * WorkflowExecutionEngine
 *
 * Comprehensive workflow orchestration engine with:
 * - Step-by-step execution with conditional logic
 * - State machine for workflow lifecycle management
 * - Integration with Inngest for event-driven workflows
 * - Real-time status updates and monitoring
 * - Error handling and recovery mechanisms
 * - Template-based workflow creation
 */
export class WorkflowExecutionEngine {
  private static instance: WorkflowExecutionEngine | null = null
  private activeExecutions = new Map<string, WorkflowExecutionState>()
  private executionMetrics = new Map<string, WorkflowMetrics>()

  private constructor() {
    // Register step executors that need execution capability
    stepExecutorRegistry.registerWithStepExecution(this.executeStep.bind(this))
  }

  static getInstance(): WorkflowExecutionEngine {
    if (!WorkflowExecutionEngine.instance) {
      WorkflowExecutionEngine.instance = new WorkflowExecutionEngine()
    }
    return WorkflowExecutionEngine.instance
  }

  /**
   * Create workflow from template
   */
  async createWorkflowFromTemplate(
    templateId: string,
    params: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<Workflow> {
    const definition = templateRegistry.createFromTemplate(templateId, params)

    const [workflow] = await db
      .insert(workflows)
      .values({
        name: definition.name,
        definition: definition as any,
        version: definition.version,
        isActive: true,
        tags: metadata?.tags,
        description: definition.description,
        createdBy: metadata?.createdBy,
      })
      .returning()

    return workflow
  }

  /**
   * Load workflow definition
   */
  private async loadWorkflowDefinition(workflowId: string): Promise<WorkflowDefinition> {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1)

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    return workflow.definition as WorkflowDefinition
  }

  /**
   * Start a new workflow execution.
   */
  async startWorkflow(
    workflowId: string,
    triggeredBy: string,
    initialInput: unknown = {},
    parentExecutionId?: string
  ): Promise<WorkflowExecution> {
    return observability.trackAgentExecution('system', 'workflow.start', async () => {
      // Load workflow definition
      const definition = await this.loadWorkflowDefinition(workflowId)

      // Initialize execution state
      const executionId = ulid()
      const executionState: WorkflowExecutionState = {
        executionId,
        workflowId,
        status: 'pending',
        startedAt: new Date(),
        variables: {
          ...definition.variables,
          input: initialInput,
        },
        stepStates: {},
        triggeredBy,
        parentExecutionId,
      }

      // Create state machine
      const stateMachine = createWorkflowStateMachine({
        onStateChange: async (from, to, state) => {
          await this.emitWorkflowEvent({
            id: ulid(),
            executionId,
            type: `workflow.${to}` as any,
            timestamp: new Date(),
            data: { from, to, state },
          })
        },
      })

      stateMachine.initialize(executionState)

      // Store in database
      const [execution] = await db
        .insert(workflowExecutions)
        .values({
          id: executionId,
          workflowId,
          status: 'pending',
          currentStep: 0,
          totalSteps: definition.steps.length,
          state: executionState.variables as any,
          startedAt: new Date(),
          triggeredBy,
          parentExecutionId,
        })
        .returning()

      // Store in memory
      this.activeExecutions.set(executionId, executionState)

      // Initialize metrics
      this.executionMetrics.set(executionId, {
        executionId,
        workflowId,
        startTime: new Date(),
        stepMetrics: {},
        resourceUsage: {},
        performance: {
          throughput: 0,
          latency: 0,
          errorRate: 0,
          successRate: 0,
        },
      })

      // Transition to running
      await stateMachine.transition('running')
      await this.updateExecutionStatus(executionId, 'running')

      // Start execution in background
      this.executeWorkflow(executionId, definition).catch((error) => {
        this.handleWorkflowError(executionId, error)
      })

      // Initial snapshot
      await snapshotManager.captureSnapshot(
        executionId,
        'execution_start',
        0,
        executionState as any,
        'Workflow execution started',
        ['workflow', 'start'],
        true
      )

      return execution
    })
  }

  /**
   * Execute workflow
   */
  private async executeWorkflow(
    executionId: string,
    definition: WorkflowDefinition
  ): Promise<void> {
    const state = this.activeExecutions.get(executionId)
    if (!state) {
      throw new Error(`Execution ${executionId} not found`)
    }

    try {
      // Start from the first step
      let currentStepId = definition.startStepId
      let stepCount = 0

      while (currentStepId && stepCount < definition.steps.length) {
        // Check if workflow is paused or cancelled
        const currentStatus = await this.getExecutionStatus(executionId)
        if (currentStatus === 'paused') {
          await this.waitForResume(executionId)
        } else if (StateValidation.isTerminal(currentStatus)) {
          break
        }

        // Find step definition
        const stepDef = definition.steps.find((s) => s.id === currentStepId)
        if (!stepDef) {
          throw new Error(`Step ${currentStepId} not found in workflow definition`)
        }

        // Execute step
        const result = await this.executeStep(
          currentStepId,
          this.createContext(executionId, stepDef.id)
        )

        // Update progress
        await this.updateProgress(executionId, stepCount + 1, {
          currentStepId,
          stepResult: result,
        })

        // Determine next step
        currentStepId = result.nextStepId || this.getNextStep(definition, currentStepId)
        stepCount++
      }

      // Workflow completed
      await this.completeExecution(executionId, state.variables)
    } catch (error) {
      await this.handleWorkflowError(executionId, error)
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    stepId: string,
    context: WorkflowContext
  ): Promise<StepExecutionResult> {
    const executionState = this.activeExecutions.get(context.executionId)
    if (!executionState) {
      throw new Error(`Execution ${context.executionId} not found`)
    }

    // Load workflow definition to get step config
    const definition = await this.loadWorkflowDefinition(context.workflowId)
    const stepConfig = definition.steps.find((s) => s.id === stepId)
    if (!stepConfig) {
      throw new Error(`Step ${stepId} not found`)
    }

    // Get executor
    const executor = stepExecutorRegistry.get(stepConfig.type)
    if (!executor) {
      throw new Error(`No executor found for step type: ${stepConfig.type}`)
    }

    // Record step start
    const stepState: StepExecutionState = {
      stepId,
      status: 'running',
      startedAt: new Date(),
    }
    executionState.stepStates[stepId] = stepState

    await this.emitWorkflowEvent({
      id: ulid(),
      executionId: context.executionId,
      type: 'step.started',
      timestamp: new Date(),
      data: { stepId, stepConfig },
    })

    try {
      // Execute step with timeout
      const timeout = stepConfig.timeout || 300_000 // 5 minutes default
      const result = await this.withTimeout(executor.execute(stepConfig, context), timeout)

      // Update step state
      stepState.status = result.status === 'completed' ? 'completed' : 'failed'
      stepState.completedAt = new Date()
      stepState.output = result.output
      stepState.error = result.error

      // Record metrics
      const duration = stepState.completedAt.getTime() - stepState.startedAt!.getTime()
      this.recordStepMetrics(context.executionId, stepId, {
        executionTime: duration,
        success: result.status === 'completed',
        retries: stepState.retryCount || 0,
      })

      await this.emitWorkflowEvent({
        id: ulid(),
        executionId: context.executionId,
        type: result.status === 'completed' ? 'step.completed' : 'step.failed',
        timestamp: new Date(),
        data: { stepId, result },
      })

      // Handle retries if configured
      if (result.status === 'failed' && stepConfig.retryPolicy) {
        const shouldRetry = await this.handleRetry(stepConfig, stepState)
        if (shouldRetry) {
          return await this.executeStep(stepId, context)
        }
      }

      return result
    } catch (error) {
      stepState.status = 'failed'
      stepState.completedAt = new Date()
      stepState.error = {
        code: 'STEP_EXECUTION_ERROR',
        message: error.message || 'Step execution failed',
        details: error,
      }

      throw error
    }
  }

  /**
   * Create workflow context for step execution
   */
  private createContext(executionId: string, stepId: string): WorkflowContext {
    const state = this.activeExecutions.get(executionId)
    if (!state) {
      throw new Error(`Execution ${executionId} not found`)
    }

    return {
      executionId,
      workflowId: state.workflowId,
      stepId,
      variables: state.variables,
      getVariable: (path: string) => {
        return path.split('.').reduce((acc, part) => acc?.[part], state.variables)
      },
      setVariable: (path: string, value: any) => {
        const parts = path.split('.')
        const last = parts.pop()!
        const target = parts.reduce((acc, part) => {
          if (!acc[part]) acc[part] = {}
          return acc[part]
        }, state.variables)
        target[last] = value
      },
      emit: (event: WorkflowEvent) => {
        this.emitWorkflowEvent(event)
      },
      log: (level, message, data) => {
        console.log(`[${level}] [${executionId}/${stepId}] ${message}`, data)
      },
      metrics: {
        record: (name, value, tags) => {
          // Record custom metrics
        },
        increment: (name, tags) => {
          // Increment counter
        },
        gauge: (name, value, tags) => {
          // Set gauge value
        },
      },
    }
  }

  /**
   * Get next step in workflow
   */
  private getNextStep(definition: WorkflowDefinition, currentStepId: string): string | undefined {
    const currentIndex = definition.steps.findIndex((s) => s.id === currentStepId)
    if (currentIndex === -1 || currentIndex === definition.steps.length - 1) {
      return
    }
    return definition.steps[currentIndex + 1].id
  }

  /**
   * Handle step retry
   */
  private async handleRetry(
    stepConfig: StepConfig,
    stepState: StepExecutionState
  ): Promise<boolean> {
    if (!stepConfig.retryPolicy) {
      return false
    }

    const retryCount = (stepState.retryCount || 0) + 1
    if (retryCount > stepConfig.retryPolicy.maxAttempts) {
      return false
    }

    // Calculate delay
    let delay = stepConfig.retryPolicy.initialDelay
    if (stepConfig.retryPolicy.backoffType === 'exponential') {
      delay = delay * 2 ** (retryCount - 1)
    } else if (stepConfig.retryPolicy.backoffType === 'linear') {
      delay = delay * retryCount
    }

    if (stepConfig.retryPolicy.maxDelay) {
      delay = Math.min(delay, stepConfig.retryPolicy.maxDelay)
    }

    // Wait before retry
    await new Promise((resolve) => setTimeout(resolve, delay))

    stepState.retryCount = retryCount
    return true
  }

  /**
   * Execute with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      ),
    ])
  }

  /**
   * Wait for workflow resume
   */
  private async waitForResume(executionId: string): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        const status = await this.getExecutionStatus(executionId)
        if (status !== 'paused') {
          clearInterval(checkInterval)
          resolve()
        }
      }, 1000) // Check every second
    })
  }

  /**
   * Get execution status
   */
  private async getExecutionStatus(executionId: string): Promise<string> {
    const state = this.activeExecutions.get(executionId)
    if (state) {
      return state.status
    }

    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1)

    return execution?.status || 'unknown'
  }

  /**
   * Update execution status
   */
  private async updateExecutionStatus(executionId: string, status: string): Promise<void> {
    const state = this.activeExecutions.get(executionId)
    if (state) {
      state.status = status as any
    }

    await db
      .update(workflowExecutions)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(workflowExecutions.id, executionId))
  }

  /**
   * Update execution progress.
   */
  async updateProgress(executionId: string, stepNumber: number, stateUpdate: any): Promise<void> {
    return observability.trackAgentExecution('system', 'workflow.progress', async () => {
      const state = this.activeExecutions.get(executionId)
      if (state) {
        // Update in-memory state
        state.currentStepId = stateUpdate.currentStepId
        Object.assign(state.variables, stateUpdate)
      }

      // Record snapshot for step
      await snapshotManager.captureSnapshot(
        executionId,
        'step_end',
        stepNumber,
        stateUpdate,
        `Step ${stepNumber} completed`,
        ['workflow', 'step']
      )

      // Update execution in database
      await db
        .update(workflowExecutions)
        .set({
          currentStep: stepNumber,
          state: state?.variables as any,
          updatedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId))
    })
  }

  /** Pause execution – sets status and creates checkpoint snapshot */
  async pauseExecution(executionId: string, description = 'Paused by user'): Promise<void> {
    return observability.trackAgentExecution('system', 'workflow.pause', async () => {
      const state = this.activeExecutions.get(executionId)
      if (!state) {
        throw new Error(`Execution ${executionId} not found`)
      }

      // Create state machine and transition
      const stateMachine = createWorkflowStateMachine()
      stateMachine.initialize(state)
      await stateMachine.transition('paused')

      // Update database
      const [exe] = await db
        .update(workflowExecutions)
        .set({
          status: 'paused',
          pausedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId))
        .returning()

      if (!exe) throw new Error('Execution not found')

      // Create checkpoint
      await snapshotManager.createCheckpoint(
        executionId,
        exe.currentStep ?? 0,
        state.variables as any,
        description
      )

      // Emit event
      await this.emitWorkflowEvent({
        id: ulid(),
        executionId,
        type: 'workflow.paused',
        timestamp: new Date(),
        data: { description },
      })

      // Trigger Inngest event
      await inngest.send({
        name: 'workflow.paused',
        data: { executionId, workflowId: state.workflowId },
      })
    })
  }

  /** Resume a paused workflow execution */
  async resumeExecution(executionId: string): Promise<void> {
    return observability.trackAgentExecution('system', 'workflow.resume', async () => {
      const state = this.activeExecutions.get(executionId)
      if (!state) {
        // Load from database
        const [exe] = await db
          .select()
          .from(workflowExecutions)
          .where(eq(workflowExecutions.id, executionId))
          .limit(1)

        if (!exe) {
          throw new Error(`Execution ${executionId} not found`)
        }

        // Reconstruct state
        const reconstructedState: WorkflowExecutionState = {
          executionId,
          workflowId: exe.workflowId,
          status: exe.status as any,
          currentStepId: `step-${exe.currentStep}`,
          startedAt: exe.startedAt,
          completedAt: exe.completedAt || undefined,
          pausedAt: exe.pausedAt || undefined,
          resumedAt: exe.resumedAt || undefined,
          variables: (exe.state as any) || {},
          stepStates: {},
          triggeredBy: exe.triggeredBy || 'system',
          parentExecutionId: exe.parentExecutionId || undefined,
        }

        this.activeExecutions.set(executionId, reconstructedState)
      }

      // Update status
      await db
        .update(workflowExecutions)
        .set({
          status: 'running',
          resumedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId))

      // Emit event
      await this.emitWorkflowEvent({
        id: ulid(),
        executionId,
        type: 'workflow.resumed',
        timestamp: new Date(),
        data: {},
      })

      // Trigger Inngest event
      await inngest.send({
        name: 'workflow.resumed',
        data: { executionId },
      })
    })
  }

  /** Complete execution */
  async completeExecution(executionId: string, finalState: any): Promise<void> {
    return observability.trackAgentExecution('system', 'workflow.complete', async () => {
      const state = this.activeExecutions.get(executionId)
      if (state) {
        state.status = 'completed'
        state.completedAt = new Date()
      }

      const [exe] = await db
        .update(workflowExecutions)
        .set({
          status: 'completed',
          completedAt: new Date(),
          state: finalState,
          updatedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId))
        .returning()

      // Calculate final metrics
      const metrics = this.executionMetrics.get(executionId)
      if (metrics) {
        metrics.endTime = new Date()
        metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime()

        // Calculate performance metrics
        const stepMetrics = Object.values(metrics.stepMetrics)
        metrics.performance.successRate =
          stepMetrics.filter((m) => m.success).length / stepMetrics.length
        metrics.performance.errorRate = 1 - metrics.performance.successRate
        metrics.performance.throughput = stepMetrics.length / (metrics.duration / 1000)
        metrics.performance.latency = metrics.duration / stepMetrics.length

        // Store metrics
        await this.storeWorkflowMetrics(metrics)
      }

      // Final snapshot
      await snapshotManager.captureSnapshot(
        executionId,
        'execution_end',
        exe.currentStep ?? 0,
        finalState,
        'Workflow execution completed',
        ['workflow', 'complete'],
        true
      )

      // Emit event
      await this.emitWorkflowEvent({
        id: ulid(),
        executionId,
        type: 'workflow.completed',
        timestamp: new Date(),
        data: { finalState, metrics },
      })

      // Cleanup
      this.activeExecutions.delete(executionId)
      this.executionMetrics.delete(executionId)

      // Trigger Inngest event
      await inngest.send({
        name: 'workflow.completed',
        data: { executionId, workflowId: state?.workflowId },
      })
    })
  }

  /** Mark execution failed */
  async failExecution(executionId: string, error: any, currentState?: any): Promise<void> {
    return observability.trackAgentExecution('system', 'workflow.fail', async () => {
      const state = this.activeExecutions.get(executionId)
      if (state) {
        state.status = 'failed'
        state.completedAt = new Date()
        state.error = {
          code: error.code || 'WORKFLOW_ERROR',
          message: error.message || 'Workflow execution failed',
          details: error,
          stepId: state.currentStepId,
          timestamp: new Date(),
          recoverable: false,
        }
      }

      await db
        .update(workflowExecutions)
        .set({
          status: 'failed',
          error: error.message || 'Unknown error',
          completedAt: new Date(),
          state: currentState || state?.variables,
          updatedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId))

      // Store error snapshot
      await snapshotManager.captureSnapshot(
        executionId,
        'error_state',
        0,
        currentState || state?.variables || {},
        error.message,
        ['workflow', 'error']
      )

      // Emit event
      await this.emitWorkflowEvent({
        id: ulid(),
        executionId,
        type: 'workflow.failed',
        timestamp: new Date(),
        data: { error, state: currentState },
      })

      // Cleanup
      this.activeExecutions.delete(executionId)
      this.executionMetrics.delete(executionId)

      // Trigger Inngest event
      await inngest.send({
        name: 'workflow.failed',
        data: { executionId, error: error.message },
      })
    })
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(executionId: string, reason?: string): Promise<void> {
    return observability.trackAgentExecution('system', 'workflow.cancel', async () => {
      const state = this.activeExecutions.get(executionId)
      if (state) {
        state.status = 'cancelled'
        state.completedAt = new Date()
      }

      await db
        .update(workflowExecutions)
        .set({
          status: 'cancelled',
          completedAt: new Date(),
          error: reason,
          updatedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId))

      // Emit event
      await this.emitWorkflowEvent({
        id: ulid(),
        executionId,
        type: 'workflow.cancelled',
        timestamp: new Date(),
        data: { reason },
      })

      // Cleanup
      this.activeExecutions.delete(executionId)
      this.executionMetrics.delete(executionId)

      // Trigger Inngest event
      await inngest.send({
        name: 'workflow.cancelled',
        data: { executionId, reason },
      })
    })
  }

  /**
   * Get workflow execution details
   */
  async getExecution(executionId: string): Promise<WorkflowExecutionState | null> {
    // Check in-memory first
    const state = this.activeExecutions.get(executionId)
    if (state) {
      return state
    }

    // Load from database
    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1)

    if (!execution) {
      return null
    }

    // Reconstruct state
    return {
      executionId,
      workflowId: execution.workflowId,
      status: execution.status as any,
      currentStepId: `step-${execution.currentStep}`,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt || undefined,
      pausedAt: execution.pausedAt || undefined,
      resumedAt: execution.resumedAt || undefined,
      variables: (execution.state as any) || {},
      stepStates: {},
      triggeredBy: execution.triggeredBy || 'system',
      parentExecutionId: execution.parentExecutionId || undefined,
      error: execution.error
        ? {
            code: 'WORKFLOW_ERROR',
            message: execution.error,
            timestamp: new Date(),
            recoverable: false,
          }
        : undefined,
    }
  }

  /**
   * List active executions
   */
  async listActiveExecutions(): Promise<WorkflowExecutionState[]> {
    return Array.from(this.activeExecutions.values())
  }

  /**
   * Handle workflow error
   */
  private async handleWorkflowError(executionId: string, error: any): Promise<void> {
    await this.failExecution(executionId, error)
  }

  /**
   * Emit workflow event
   */
  private async emitWorkflowEvent(event: WorkflowEvent): Promise<void> {
    // Store in database
    await db.insert(observabilityEvents).values({
      executionId: event.executionId,
      type: event.type,
      timestamp: event.timestamp,
      data: event.data as any,
      severity: 'info',
      category: 'workflow',
      metadata: event.metadata as any,
    })

    // Could also emit to event bus, websockets, etc.
  }

  /**
   * Record step metrics
   */
  private recordStepMetrics(
    executionId: string,
    stepId: string,
    metrics: Partial<StepMetrics>
  ): void {
    const executionMetrics = this.executionMetrics.get(executionId)
    if (!executionMetrics) {
      return
    }

    executionMetrics.stepMetrics[stepId] = {
      stepId,
      executionTime: 0,
      retries: 0,
      success: false,
      ...executionMetrics.stepMetrics[stepId],
      ...metrics,
    }
  }

  /**
   * Store workflow metrics
   */
  private async storeWorkflowMetrics(metrics: WorkflowMetrics): Promise<void> {
    // Store metrics in observability events
    await db.insert(observabilityEvents).values({
      executionId: metrics.executionId,
      type: 'metric.recorded',
      timestamp: new Date(),
      data: metrics as any,
      severity: 'info',
      category: 'metrics',
    })
  }
}

// Export singleton
export const workflowEngine = WorkflowExecutionEngine.getInstance()

export { stepExecutorRegistry } from './executors'
export { createWorkflowStateMachine, StateValidation } from './state-machine'
export { suggestTemplates, TEMPLATE_CATEGORIES, templateRegistry } from './templates'
// Export types and utilities
export * from './types'
