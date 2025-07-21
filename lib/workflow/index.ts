/**
 * Workflow Orchestration Module
 *
 * Comprehensive workflow engine with execution, monitoring, and visualization
 */

// Main engine
export { workflowEngine } from "./engine";

// Error handling
export {
	ErrorAggregator,
	type ErrorClassification,
	WorkflowErrorCode,
} from "./error-recovery";

// Executors
export {
	ActionStepExecutor,
	WebhookStepExecutor,
} from "./executors";

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
} from "./inngest-handlers";

// Monitoring
export {
	type Alert,
	type AlertThresholds,
	type DashboardOverview,
	type MonitoringConfig,
	type PerformanceReport,
	type RealTimeMetrics,
	type RetentionPolicy,
	WorkflowMonitor,
	workflowDashboard,
	workflowMonitor,
} from "./monitoring";

// State machine
export {
	createWorkflowStateMachine,
	DEFAULT_WORKFLOW_TRANSITIONS,
	WorkflowStateMachine,
} from "./state-machine";

// Templates
export {
	suggestTemplates,
	TEMPLATE_CATEGORIES,
	templateRegistry,
} from "./templates";

// Core engine and types
export * from "./types";

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
} from "./visualization";
