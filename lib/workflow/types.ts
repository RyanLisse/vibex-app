/**
 * Workflow orchestration type definitions
 *
 * Comprehensive types for workflow definition, execution, and state management
 */

import type { z } from 'zod'

// Workflow step types
export type StepType =
  | 'action'
  | 'condition'
  | 'parallel'
  | 'sequential'
  | 'loop'
  | 'wait'
  | 'human_approval'
  | 'webhook'
  | 'transform'
  | 'aggregate'
  | 'branch'
  | 'merge'
  | 'retry'
  | 'circuit_breaker'

// Step execution status
export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'paused'
  | 'cancelled'
  | 'retrying'

// Workflow execution status
export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'terminated'

// Step configuration base
export interface BaseStepConfig {
  id: string
  name: string
  type: StepType
  description?: string
  timeout?: number // milliseconds
  retryPolicy?: RetryPolicy
  errorHandler?: ErrorHandler
  metadata?: Record<string, any>
}

// Retry policy configuration
export interface RetryPolicy {
  maxAttempts: number
  backoffType: 'fixed' | 'exponential' | 'linear'
  initialDelay: number
  maxDelay?: number
  retryableErrors?: string[]
}

// Error handler configuration
export interface ErrorHandler {
  type: 'ignore' | 'fail' | 'retry' | 'compensate' | 'fallback'
  fallbackStepId?: string
  compensationStepId?: string
  customHandler?: string
}

// Action step configuration
export interface ActionStepConfig extends BaseStepConfig {
  type: 'action'
  action: {
    type: string
    params: Record<string, any>
    outputMapping?: Record<string, string>
  }
}

// Condition step configuration
export interface ConditionStepConfig extends BaseStepConfig {
  type: 'condition'
  condition: {
    expression: string
    trueStepId: string
    falseStepId?: string
  }
}

// Parallel step configuration
export interface ParallelStepConfig extends BaseStepConfig {
  type: 'parallel'
  parallel: {
    steps: string[]
    waitForAll: boolean
    continueOnError?: boolean
  }
}

// Sequential step configuration
export interface SequentialStepConfig extends BaseStepConfig {
  type: 'sequential'
  sequential: {
    steps: string[]
    continueOnError?: boolean
  }
}

// Loop step configuration
export interface LoopStepConfig extends BaseStepConfig {
  type: 'loop'
  loop: {
    items: string // path to array in state
    itemVariable: string
    indexVariable?: string
    bodyStepId: string
    maxIterations?: number
  }
}

// Wait step configuration
export interface WaitStepConfig extends BaseStepConfig {
  type: 'wait'
  wait: {
    duration?: number // milliseconds
    until?: string // ISO date string or expression
    event?: string
  }
}

// Human approval step configuration
export interface HumanApprovalStepConfig extends BaseStepConfig {
  type: 'human_approval'
  approval: {
    approvers: string[]
    title: string
    description?: string
    timeout?: number
    onTimeout?: 'approve' | 'reject' | 'escalate'
  }
}

// Webhook step configuration
export interface WebhookStepConfig extends BaseStepConfig {
  type: 'webhook'
  webhook: {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    headers?: Record<string, string>
    body?: any
    authentication?: {
      type: 'bearer' | 'basic' | 'api_key'
      credentials: string
    }
    responseMapping?: Record<string, string>
  }
}

// Transform step configuration
export interface TransformStepConfig extends BaseStepConfig {
  type: 'transform'
  transform: {
    expression: string
    outputVariable: string
  }
}

// Aggregate step configuration
export interface AggregateStepConfig extends BaseStepConfig {
  type: 'aggregate'
  aggregate: {
    sources: string[] // step IDs or state paths
    operation: 'merge' | 'concat' | 'custom'
    customAggregator?: string
    outputVariable: string
  }
}

// Branch step configuration
export interface BranchStepConfig extends BaseStepConfig {
  type: 'branch'
  branch: {
    conditions: Array<{
      expression: string
      stepId: string
    }>
    defaultStepId?: string
  }
}

// Union type for all step configurations
export type StepConfig =
  | ActionStepConfig
  | ConditionStepConfig
  | ParallelStepConfig
  | SequentialStepConfig
  | LoopStepConfig
  | WaitStepConfig
  | HumanApprovalStepConfig
  | WebhookStepConfig
  | TransformStepConfig
  | AggregateStepConfig
  | BranchStepConfig

// Workflow definition
export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  version: number
  steps: StepConfig[]
  startStepId: string
  variables?: Record<string, any>
  inputSchema?: z.ZodSchema<any>
  outputSchema?: z.ZodSchema<any>
  metadata?: {
    author?: string
    tags?: string[]
    category?: string
    icon?: string
  }
  triggers?: WorkflowTrigger[]
  globalErrorHandler?: ErrorHandler
  timeout?: number
}

// Workflow trigger configuration
export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'webhook' | 'manual'
  config: Record<string, any>
}

// Workflow execution state
export interface WorkflowExecutionState {
  executionId: string
  workflowId: string
  status: WorkflowStatus
  currentStepId?: string
  startedAt: Date
  completedAt?: Date
  pausedAt?: Date
  resumedAt?: Date
  variables: Record<string, any>
  stepStates: Record<string, StepExecutionState>
  error?: WorkflowError
  parentExecutionId?: string
  triggeredBy: string
  metadata?: Record<string, any>
}

// Step execution state
export interface StepExecutionState {
  stepId: string
  status: StepStatus
  startedAt?: Date
  completedAt?: Date
  input?: any
  output?: any
  error?: StepError
  retryCount?: number
  metadata?: Record<string, any>
}

// Workflow error
export interface WorkflowError {
  code: string
  message: string
  stepId?: string
  timestamp: Date
  details?: any
  recoverable: boolean
}

// Step error
export interface StepError {
  code: string
  message: string
  details?: any
  stack?: string
}

// Workflow template
export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  definition: Partial<WorkflowDefinition>
  parameters: TemplateParameter[]
  examples?: WorkflowExample[]
  tags?: string[]
  icon?: string
}

// Template parameter
export interface TemplateParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  required?: boolean
  default?: any
  validation?: z.ZodSchema<any>
}

// Workflow example
export interface WorkflowExample {
  name: string
  description?: string
  input: Record<string, any>
  expectedOutput?: any
}

// Workflow metrics
export interface WorkflowMetrics {
  executionId: string
  workflowId: string
  startTime: Date
  endTime?: Date
  duration?: number
  stepMetrics: Record<string, StepMetrics>
  resourceUsage: ResourceUsage
  performance: PerformanceMetrics
}

// Step metrics
export interface StepMetrics {
  stepId: string
  executionTime: number
  retries: number
  success: boolean
  resourceUsage?: ResourceUsage
}

// Resource usage
export interface ResourceUsage {
  cpuTime?: number
  memoryUsage?: number
  networkCalls?: number
  databaseQueries?: number
  apiCalls?: number
}

// Performance metrics
export interface PerformanceMetrics {
  throughput: number
  latency: number
  errorRate: number
  successRate: number
}

// Workflow event
export interface WorkflowEvent {
  id: string
  executionId: string
  type: WorkflowEventType
  timestamp: Date
  data: any
  metadata?: Record<string, any>
}

// Workflow event types
export type WorkflowEventType =
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'workflow.paused'
  | 'workflow.resumed'
  | 'workflow.cancelled'
  | 'step.started'
  | 'step.completed'
  | 'step.failed'
  | 'step.retrying'
  | 'step.skipped'
  | 'variable.updated'
  | 'error.occurred'
  | 'metric.recorded'

// Workflow context (passed to step executors)
export interface WorkflowContext {
  executionId: string
  workflowId: string
  stepId: string
  variables: Record<string, any>
  getVariable: (path: string) => any
  setVariable: (path: string, value: any) => void
  emit: (event: WorkflowEvent) => void
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) => void
  metrics: {
    record: (name: string, value: number, tags?: Record<string, string>) => void
    increment: (name: string, tags?: Record<string, string>) => void
    gauge: (name: string, value: number, tags?: Record<string, string>) => void
  }
}

// Step executor interface
export interface StepExecutor<T extends StepConfig = StepConfig> {
  type: StepType
  execute: (step: T, context: WorkflowContext) => Promise<StepExecutionResult>
  validate?: (step: T) => string[] // Returns validation errors
}

// Step execution result
export interface StepExecutionResult {
  status: 'completed' | 'failed' | 'paused'
  output?: any
  error?: StepError
  nextStepId?: string
  metadata?: Record<string, any>
}

// Workflow transition
export interface WorkflowTransition {
  fromStatus: WorkflowStatus
  toStatus: WorkflowStatus
  condition?: (state: WorkflowExecutionState) => boolean
  action?: (state: WorkflowExecutionState) => Promise<void>
}

// Export all types
export type {
  StepType,
  StepStatus,
  WorkflowStatus,
  BaseStepConfig,
  RetryPolicy,
  ErrorHandler,
  ActionStepConfig,
  ConditionStepConfig,
  ParallelStepConfig,
  SequentialStepConfig,
  LoopStepConfig,
  WaitStepConfig,
  HumanApprovalStepConfig,
  WebhookStepConfig,
  TransformStepConfig,
  AggregateStepConfig,
  BranchStepConfig,
  StepConfig,
  WorkflowDefinition,
  WorkflowTrigger,
  WorkflowExecutionState,
  StepExecutionState,
  WorkflowError,
  StepError,
  WorkflowTemplate,
  TemplateParameter,
  WorkflowExample,
  WorkflowMetrics,
  StepMetrics,
  ResourceUsage,
  PerformanceMetrics,
  WorkflowEvent,
  WorkflowEventType,
  WorkflowContext,
  StepExecutor,
  StepExecutionResult,
  WorkflowTransition,
}
