/**
 * Workflow Orchestration Module
 *
 * Comprehensive workflow engine with execution, monitoring, and visualization
 */

// Core engine and types
export * from './types'
export { workflowEngine } from './engine'

// Templates
export {
  templateRegistry,
  TEMPLATE_CATEGORIES,
  suggestTemplates,
} from './templates'

// Executors
export {
  stepExecutorRegistry,
  ActionStepExecutor,
  ConditionStepExecutor,
  ParallelStepExecutor,
  SequentialStepExecutor,
  LoopStepExecutor,
  WaitStepExecutor,
  HumanApprovalStepExecutor,
  WebhookStepExecutor,
  TransformStepExecutor,
  AggregateStepExecutor,
  BranchStepExecutor,
} from './executors'

// State machine
export {
  WorkflowStateMachine,
  createWorkflowStateMachine,
  StateValidation,
  useWorkflowStateMachine,
  DEFAULT_WORKFLOW_TRANSITIONS,
} from './state-machine'

// Error handling
export {
  WorkflowErrorCode,
  ErrorSeverity,
  RecoveryStrategy,
  WorkflowErrorClassifier,
  RecoveryExecutor,
  recoveryExecutor,
  enrichError,
  ErrorAggregator,
  type ErrorClassification,
  type RecoveryContext,
  type RecoveryResult,
  type ErrorSummary,
} from './error-recovery'

// Monitoring
export {
  WorkflowMonitor,
  workflowMonitor,
  WorkflowDashboard,
  workflowDashboard,
  type MonitoringConfig,
  type AlertThresholds,
  type RetentionPolicy,
  type WorkflowMetricsCollection,
  type PerformanceReport,
  type Alert,
  type RealTimeMetrics,
  type DashboardOverview,
} from './monitoring'

// Visualization
export {
  WorkflowVisualizer,
  getStatusColor,
  getStatusIcon,
  formatDuration,
  type WorkflowGraph,
  type GraphNode,
  type GraphEdge,
  type GraphMetadata,
  type NodeStyle,
  type EdgeStyle,
  type ExecutionTimeline,
  type TimelineEvent,
} from './visualization'

// Inngest handlers
export {
  workflowHandlers,
  workflowTriggerHandler,
  scheduledWorkflowHandler,
  workflowStateChangeHandler,
  workflowRetryHandler,
  humanApprovalHandler,
  webhookTriggerHandler,
  workflowMonitoringHandler,
  workflowCleanupHandler,
} from './inngest-handlers'

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
    interval: 60000, // 1 minute
  },
  retryPolicy: {
    maxAttempts: 3,
    backoffType: 'exponential' as const,
    initialDelay: 1000,
    maxDelay: 30000,
  },
  errorHandling: {
    strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 60000,
    },
  },
  visualization: {
    autoLayout: true,
    animateTransitions: true,
  },
}
