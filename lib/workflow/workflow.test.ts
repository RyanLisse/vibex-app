/**
 * Comprehensive test suite for workflow orchestration engine
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { workflowEngine, templateRegistry, stepExecutorRegistry } from './index'
import { createWorkflowStateMachine, StateValidation } from './state-machine'
import { WorkflowErrorClassifier, recoveryExecutor } from './error-recovery'
import { WorkflowVisualizer } from './visualization'
import type {
  WorkflowDefinition,
  WorkflowExecutionState,
  StepConfig,
  ActionStepConfig,
  ConditionStepConfig,
  ParallelStepConfig,
} from './types'

// Mock database operations
vi.mock('@/db/config', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}))

// Mock observability
vi.mock('@/lib/observability', () => ({
  observability: {
    trackAgentExecution: vi.fn((agent, action, fn) => fn()),
    trackEvent: vi.fn(),
    trackOperation: vi.fn((op, fn) => fn()),
    recordMetric: vi.fn(),
  },
}))

// Mock Inngest
vi.mock('@/lib/inngest', () => ({
  inngest: {
    send: vi.fn(),
  },
}))

// Mock snapshot manager
vi.mock('@/lib/time-travel/execution-snapshots', () => ({
  snapshotManager: {
    captureSnapshot: vi.fn(),
    createCheckpoint: vi.fn(),
  },
}))

describe('Workflow Engine', () => {
  describe('Workflow Definition', () => {
    it('should create a valid workflow definition', () => {
      const definition: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: 1,
        startStepId: 'step1',
        steps: [
          {
            id: 'step1',
            name: 'First Step',
            type: 'action',
            action: {
              type: 'test.action',
              params: { value: 'test' },
            },
          } as ActionStepConfig,
        ],
      }

      expect(definition).toBeDefined()
      expect(definition.steps).toHaveLength(1)
      expect(definition.startStepId).toBe('step1')
    })

    it('should validate step configurations', () => {
      const executor = stepExecutorRegistry.get('action')
      const errors = executor?.validate({
        id: '',
        name: '',
        type: 'action',
        action: { type: 'test', params: {} },
      } as ActionStepConfig)

      expect(errors).toContain('Step ID is required')
      expect(errors).toContain('Step name is required')
    })
  })

  describe('Workflow Templates', () => {
    it('should register and retrieve templates', () => {
      const allTemplates = templateRegistry.getAll()
      expect(allTemplates.length).toBeGreaterThan(0)

      const dataTemplate = templateRegistry.get('data-processing-pipeline')
      expect(dataTemplate).toBeDefined()
      expect(dataTemplate?.category).toBe('data')
    })

    it('should create workflow from template', () => {
      const params = {
        sourceUrl: 'https://api.example.com/data',
        transformScript: 'data.map(d => d)',
        destinationTable: 'processed_data',
      }

      const workflow = templateRegistry.createFromTemplate('data-processing-pipeline', params)

      expect(workflow).toBeDefined()
      expect(workflow.name).toBe('Data Processing Pipeline')
      expect(workflow.metadata?.templateId).toBe('data-processing-pipeline')
    })

    it('should suggest templates based on use case', () => {
      const suggestions = templateRegistry.getByTags(['retry'])
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0].tags).toContain('retry')
    })
  })

  describe('State Machine', () => {
    let stateMachine: ReturnType<typeof createWorkflowStateMachine>
    let executionState: WorkflowExecutionState

    beforeEach(() => {
      stateMachine = createWorkflowStateMachine()
      executionState = {
        executionId: 'test-execution',
        workflowId: 'test-workflow',
        status: 'pending',
        startedAt: new Date(),
        variables: {},
        stepStates: {},
        triggeredBy: 'test',
      }
      stateMachine.initialize(executionState)
    })

    it('should transition between valid states', async () => {
      expect(stateMachine.canTransition('running')).toBe(true)
      await stateMachine.transition('running')

      const state = stateMachine.getState()
      expect(state?.status).toBe('running')

      expect(stateMachine.canTransition('paused')).toBe(true)
      await stateMachine.transition('paused')
      expect(stateMachine.getState()?.status).toBe('paused')
    })

    it('should prevent invalid transitions', async () => {
      await stateMachine.transition('running')

      expect(stateMachine.canTransition('pending')).toBe(false)
      await expect(stateMachine.transition('pending')).rejects.toThrow('Invalid transition')
    })

    it('should validate terminal states', () => {
      expect(StateValidation.isTerminal('completed')).toBe(true)
      expect(StateValidation.isTerminal('failed')).toBe(true)
      expect(StateValidation.isTerminal('running')).toBe(false)
    })

    it('should get available transitions', async () => {
      const available = stateMachine.getAvailableTransitions()
      expect(available).toContain('running')
      expect(available).toContain('cancelled')

      await stateMachine.transition('running')
      const runningTransitions = stateMachine.getAvailableTransitions()
      expect(runningTransitions).toContain('paused')
      expect(runningTransitions).toContain('completed')
    })
  })

  describe('Step Executors', () => {
    it('should execute action steps', async () => {
      const actionExecutor = stepExecutorRegistry.get('action')
      const mockContext = createMockContext()

      const result = await actionExecutor?.execute(
        {
          id: 'test-action',
          name: 'Test Action',
          type: 'action',
          action: {
            type: 'workflow.update',
            params: { 'variables.test': 'value' },
          },
        } as ActionStepConfig,
        mockContext
      )

      expect(result?.status).toBe('completed')
      expect(mockContext.setVariable).toHaveBeenCalledWith('variables.test', 'value')
    })

    it('should execute condition steps', async () => {
      const conditionExecutor = stepExecutorRegistry.get('condition')
      const mockContext = createMockContext({ testValue: true })

      const result = await conditionExecutor?.execute(
        {
          id: 'test-condition',
          name: 'Test Condition',
          type: 'condition',
          condition: {
            expression: 'testValue === true',
            trueStepId: 'true-branch',
            falseStepId: 'false-branch',
          },
        } as ConditionStepConfig,
        mockContext
      )

      expect(result?.status).toBe('completed')
      expect(result?.nextStepId).toBe('true-branch')
    })

    it('should handle step execution errors', async () => {
      const actionExecutor = stepExecutorRegistry.get('action')
      const mockContext = createMockContext()

      const result = await actionExecutor?.execute(
        {
          id: 'error-action',
          name: 'Error Action',
          type: 'action',
          action: {
            type: 'unknown.action',
            params: {},
          },
        } as ActionStepConfig,
        mockContext
      )

      expect(result?.status).toBe('failed')
      expect(result?.error).toBeDefined()
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should classify errors correctly', () => {
      const timeoutError = new Error('Operation timed out')
      const classification = WorkflowErrorClassifier.classify(timeoutError)

      expect(classification.code).toBe('STEP_TIMEOUT')
      expect(classification.recoverable).toBe(true)
      expect(classification.retryable).toBe(true)
    })

    it('should execute recovery strategies', async () => {
      const error = new Error('Network error')
      const context = {
        executionId: 'test',
        workflowId: 'test-workflow',
        stepId: 'test-step',
        retryCount: 0,
      }

      const result = await recoveryExecutor.executeRecovery(error, context)
      expect(result.action).toBe('retry')
      expect(result.success).toBe(true)
    })

    it('should respect max retry attempts', async () => {
      const error = new Error('Persistent error')
      const context = {
        executionId: 'test',
        workflowId: 'test-workflow',
        stepId: 'test-step',
        retryCount: 5,
      }

      const result = await recoveryExecutor.executeRecovery(error, context)
      expect(result.action).toBe('max_retries_exceeded')
      expect(result.success).toBe(false)
    })
  })

  describe('Workflow Visualization', () => {
    it('should convert workflow to graph', () => {
      const definition: WorkflowDefinition = {
        id: 'viz-test',
        name: 'Visualization Test',
        version: 1,
        startStepId: 'step1',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            type: 'action',
            action: { type: 'test', params: {} },
          } as ActionStepConfig,
          {
            id: 'step2',
            name: 'Step 2',
            type: 'condition',
            condition: {
              expression: 'true',
              trueStepId: 'step3',
              falseStepId: 'step4',
            },
          } as ConditionStepConfig,
          {
            id: 'step3',
            name: 'Step 3',
            type: 'action',
            action: { type: 'test', params: {} },
          } as ActionStepConfig,
          {
            id: 'step4',
            name: 'Step 4',
            type: 'action',
            action: { type: 'test', params: {} },
          } as ActionStepConfig,
        ],
      }

      const graph = WorkflowVisualizer.toGraph(definition)

      expect(graph.nodes).toHaveLength(6) // start + 4 steps + end
      expect(graph.edges.length).toBeGreaterThan(0)
      expect(graph.metadata.workflowId).toBe('viz-test')
    })

    it('should generate execution timeline', () => {
      const execution: WorkflowExecutionState = {
        executionId: 'timeline-test',
        workflowId: 'test-workflow',
        status: 'completed',
        startedAt: new Date('2024-01-01T10:00:00'),
        completedAt: new Date('2024-01-01T10:05:00'),
        variables: {},
        stepStates: {
          step1: {
            stepId: 'step1',
            status: 'completed',
            startedAt: new Date('2024-01-01T10:00:01'),
            completedAt: new Date('2024-01-01T10:02:00'),
          },
          step2: {
            stepId: 'step2',
            status: 'completed',
            startedAt: new Date('2024-01-01T10:02:01'),
            completedAt: new Date('2024-01-01T10:04:00'),
          },
        },
        triggeredBy: 'test',
      }

      const timeline = WorkflowVisualizer.generateTimeline(execution)

      expect(timeline.events.length).toBeGreaterThan(0)
      expect(timeline.totalDuration).toBe(5 * 60 * 1000) // 5 minutes
      expect(timeline.status).toBe('completed')
    })
  })

  describe('Parallel and Sequential Execution', () => {
    it('should handle parallel step execution', async () => {
      const parallelExecutor = stepExecutorRegistry.get('parallel')
      const mockContext = createMockContext()
      const mockExecuteStep = vi.fn().mockResolvedValue({
        status: 'completed',
        output: 'test',
      })

      // Register executor with step execution
      stepExecutorRegistry.registerWithStepExecution(mockExecuteStep)

      const result = await stepExecutorRegistry.get('parallel')?.execute(
        {
          id: 'parallel-test',
          name: 'Parallel Test',
          type: 'parallel',
          parallel: {
            steps: ['step1', 'step2', 'step3'],
            waitForAll: true,
          },
        } as ParallelStepConfig,
        mockContext
      )

      expect(result?.status).toBe('completed')
      expect(mockExecuteStep).toHaveBeenCalledTimes(3)
    })
  })
})

// Helper function to create mock context
function createMockContext(variables: Record<string, any> = {}): any {
  return {
    executionId: 'test-execution',
    workflowId: 'test-workflow',
    stepId: 'test-step',
    variables,
    getVariable: vi.fn((path: string) => {
      return path.split('.').reduce((acc, part) => acc?.[part], variables)
    }),
    setVariable: vi.fn(),
    emit: vi.fn(),
    log: vi.fn(),
    metrics: {
      record: vi.fn(),
      increment: vi.fn(),
      gauge: vi.fn(),
    },
  }
}
