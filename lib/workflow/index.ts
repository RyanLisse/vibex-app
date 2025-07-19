/**
 * Workflow Orchestration Module
 *
 * Comprehensive workflow engine with execution, monitoring, and visualization
 */

export { workflowEngine } from './engine'
// Error handling
export {
  ErrorAggregator,
  type ErrorClassification,
  ErrorSeverity,
  type ErrorSummary,
  enrichError,
  type RecoveryContext,
  RecoveryExecutor,
  type RecoveryResult,
  RecoveryStrategy,
  recoveryExecutor,
  WorkflowErrorClassifier,
  WorkflowErrorCode,
} from './error-recovery'
// Executors
export {
  ActionStepExecutor,
  AggregateStepExecutor,
  BranchStepExecutor,
  ConditionStepExecutor,
  HumanApprovalStepExecutor,
  LoopStepExecutor,
  ParallelStepExecutor,
  SequentialStepExecutor,
  stepExecutorRegistry,
  TransformStepExecutor,
  WaitStepExecutor,
  WebhookStepExecutor,
} from './executors'
// Inngest handlers
export {
  humanApprovalHandler,
  scheduledWorkflowHandler,
  webhookTriggerHandler,
  workflowCleanupHandler,
  workflowHandlers,
  workflowMonitoringHandler,
  workflowRetryHandler,
  workflowStateChangeHandler,
  workflowTriggerHandler,
} from './inngest-handlers'
// Monitoring
export {
  type Alert,
  type AlertThresholds,
  type DashboardOverview,
  type MonitoringConfig,
  type PerformanceReport,
  type RealTimeMetrics,
  type RetentionPolicy,
  WorkflowDashboard,
  type WorkflowMetricsCollection,
  WorkflowMonitor,
  workflowDashboard,
  workflowMonitor,
} from './monitoring'
// State machine
export {
  createWorkflowStateMachine,
  DEFAULT_WORKFLOW_TRANSITIONS,
  StateValidation,
  useWorkflowStateMachine,
  WorkflowStateMachine,
} from './state-machine'
// Templates
export {
  suggestTemplates,
  TEMPLATE_CATEGORIES,
  templateRegistry,
} from './templates'
// Core engine and types
export * from './types'
// Visualization
export {
  type EdgeStyle,
  type ExecutionTimeline,
  formatDuration,
  type GraphEdge,
  type GraphMetadata,
  type GraphNode,
  getStatusColor,
  getStatusIcon,
  type NodeStyle,
  type TimelineEvent,
  type WorkflowGraph,
  WorkflowVisualizer,
} from './visualization'

// Convenience exports for common use cases
export const Workflow = {
  // Engine operations
  start: workflowEngine.startWorkflow.bind(workflowEngine),
  pause: workflowEngine.pauseExecution.bind(workflowEngine),
  resume: workflowEngine.resumeExecution.bind(workflowEngine),
  cancel: workflowEngine.cancelExecution.bind(workflowEngine),
  complete: workflowEngine.completeExecution.bind(workflowEngine),
  fail: workflowEngine.failExecution.bind(workflowEngine),

  // Template operations
  createFromTemplate: workflowEngine.createWorkflowFromTemplate.bind(workflowEngine),
  getTemplates: () => templateRegistry.getAll(),
  suggestTemplates,

  // Monitoring
  startMonitoring: () => workflowMonitor.start(),
  stopMonitoring: () => workflowMonitor.stop(),
  getDashboard: () => workflowDashboard.getOverviewData(),

  // Visualization
  visualize: WorkflowVisualizer.toGraph,
  timeline: WorkflowVisualizer.generateTimeline,
}

// Default configuration
export const DEFAULT_WORKFLOW_CONFIG = {
  monitoring: {
    enabled: true,
    interval: 60_000, // 1 minute
  },
  retryPolicy: {
    maxAttempts: 3,
    backoffType: 'exponential' as const,
    initialDelay: 1000,
    maxDelay: 30_000,
  },
  errorHandling: {
    strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 60_000,
    },
  },
  visualization: {
    autoLayout: true,
    animateTransitions: true,
  },
}
