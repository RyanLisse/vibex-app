import { eq } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '@/db/config'
import {
  type ExecutionSnapshot,
  executionSnapshots,
  type Workflow,
  type WorkflowExecution,
  workflowExecutions,
  workflows,
} from '@/db/schema'
import { observability } from '@/lib/observability'
import { snapshotManager } from '@/lib/time-travel/execution-snapshots'

/**
 * WorkflowExecutionEngine
 *
 * Minimal engine to run, pause, resume and track workflows.
 * Designed to satisfy requirements in database-observability-integration spec.
 * This is **NOT** a full orchestration runtime – it provides the
 * database-side plumbing so other services (e.g. background workers)
 * can build rich workflow behaviour incrementally.
 */
export class WorkflowExecutionEngine {
  private static instance: WorkflowExecutionEngine | null = null
  private constructor() {}

  static getInstance(): WorkflowExecutionEngine {
    if (!WorkflowExecutionEngine.instance) {
      WorkflowExecutionEngine.instance = new WorkflowExecutionEngine()
    }
    return WorkflowExecutionEngine.instance
  }

  /**
   * Start a new workflow execution.
   */
  async startWorkflow(
    workflowId: string,
    triggeredBy: string,
    initialState: unknown = {}
  ): Promise<WorkflowExecution> {
    return observability.trackAgentExecution('system', 'workflow.start', async () => {
      const id = ulid()
      const [execution] = await db
        .insert(workflowExecutions)
        .values({
          id,
          workflowId,
          status: 'running',
          currentStep: 0,
          state: initialState as any,
          startedAt: new Date(),
          triggeredBy,
        })
        .returning()

      // Initial snapshot (execution_start)
      await snapshotManager.captureSnapshot(
        execution.id,
        'execution_start',
        0,
        {
          agentId: 'workflow-engine',
          sessionId: execution.id,
          currentStep: 0,
          totalSteps: execution.totalSteps ?? 0,
          memory: {
            shortTerm: {},
            longTerm: {},
            context: {},
            variables: {},
          },
          context: {
            environment: {},
            tools: [],
            permissions: [],
            constraints: {},
          },
          outputs: { messages: [], artifacts: [], sideEffects: [], metrics: {} },
          performance: {
            memoryUsage: 0,
            cpuTime: 0,
            networkCalls: 0,
            databaseQueries: 0,
            wasmOperations: 0,
          },
        },
        'Workflow execution started',
        ['workflow', 'start'],
        true
      )

      return execution
    })
  }

  /**
   * Update execution progress.
   */
  async updateProgress(
    executionId: string,
    stepNumber: number,
    stateUpdate: unknown
  ): Promise<void> {
    return observability.trackAgentExecution('system', 'workflow.progress', async () => {
      // Record snapshot for step
      await snapshotManager.captureSnapshot(
        executionId,
        'step_end',
        stepNumber,
        stateUpdate as any,
        `Step ${stepNumber} completed`,
        ['workflow', 'step']
      )

      // Update execution row
      await db
        .update(workflowExecutions)
        .set({ currentStep: stepNumber, updatedAt: new Date() })
        .where(eq(workflowExecutions.id, executionId))
    })
  }

  /** Pause execution – sets status and creates checkpoint snapshot */
  async pauseExecution(executionId: string, description = 'Paused by engine'): Promise<void> {
    return observability.trackAgentExecution('system', 'workflow.pause', async () => {
      const exe = await db
        .update(workflowExecutions)
        .set({ status: 'paused', updatedAt: new Date() })
        .where(eq(workflowExecutions.id, executionId))
        .returning()

      if (!exe.length) throw new Error('Execution not found')

      await snapshotManager.createCheckpoint(
        executionId,
        exe[0].currentStep ?? 0,
        exe[0].state as any,
        description
      )
    })
  }

  /** Resume a paused workflow execution */
  async resumeExecution(executionId: string): Promise<void> {
    return observability.trackAgentExecution('system', 'workflow.resume', async () => {
      await db
        .update(workflowExecutions)
        .set({ status: 'running', updatedAt: new Date() })
        .where(eq(workflowExecutions.id, executionId))
    })
  }

  /** Complete execution */
  async completeExecution(executionId: string, finalState: unknown): Promise<void> {
    return observability.trackAgentExecution('system', 'workflow.complete', async () => {
      const [exe] = await db
        .update(workflowExecutions)
        .set({ status: 'completed', completedAt: new Date(), state: finalState as any })
        .where(eq(workflowExecutions.id, executionId))
        .returning()

      await snapshotManager.captureSnapshot(
        executionId,
        'execution_end',
        exe.currentStep ?? 0,
        finalState as any,
        'Workflow execution completed',
        ['workflow', 'complete'],
        true
      )
    })
  }

  /** Mark execution failed */
  async failExecution(executionId: string, error: Error, state?: unknown): Promise<void> {
    return observability.trackAgentExecution('system', 'workflow.fail', async () => {
      await db
        .update(workflowExecutions)
        .set({ status: 'failed', error: error.message, completedAt: new Date() })
        .where(eq(workflowExecutions.id, executionId))

      await snapshotManager.captureSnapshot(
        executionId,
        'error_state',
        0,
        (state ?? {}) as any,
        error.message,
        ['workflow', 'error']
      )
    })
  }
}

// export singleton
export const workflowEngine = WorkflowExecutionEngine.getInstance()
