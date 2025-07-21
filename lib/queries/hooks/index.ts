/**
 * Central export for all TanStack Query hooks
 * This provides a single entry point for all database query hooks
 */

// Re-export database types
export type { AgentExecution, WorkflowExecution } from "@/db/schema";
export {
	createOptimizedQueryClient,
	getOptimizedQueryConfig,
} from "@/lib/query/config";
// Export utility functions
export {
	getElectricBridge,
	initializeElectricBridge,
} from "@/lib/query/electric-bridge";
export type { MutationKeys, QueryKeys } from "../keys";
// Export query keys
export { mutationKeys, queryKeys } from "../keys";
// Agent execution hooks
export {
	// Types
	type AgentExecutionFilters,
	type ExecutionPerformance,
	type ExecutionStats,
	type ExecutionsResponse,
	// Helpers
	prefetchExecution,
	prefetchExecutionStats,
	useAgentExecution,
	// Query hooks
	useAgentExecutions,
	useCancelAgentExecution,
	// Mutation hooks
	useCreateAgentExecution,
	useExecutionPerformance,
	// Performance hooks
	useExecutionPerformanceMonitor,
	useExecutionStats,
	useExecutionsByAgent,
	useExecutionsByTask,
	useExecutionsByTrace,
	// Real-time hooks
	useExecutionsSubscription,
	useInfiniteAgentExecutions,
	useRetryAgentExecution,
} from "./use-agent-executions";

// Agent memory hooks
export {
	// Types
	type MemoryFilters,
	type MemorySearchResult,
	type MemoryStats,
	// Helpers
	prefetchMemory,
	prefetchMemoryStats,
	type UpdateMemoryInput,
	// Query hooks
	useAgentMemories,
	useAgentMemory,
	useCleanupMemories,
	// Mutation hooks
	useCreateAgentMemory,
	useDeleteAgentMemory,
	useMemoriesByAgent,
	useMemoryByContext,
	useMemorySearch,
	useMemoryStats,
	// Real-time hooks
	useMemorySubscription,
	useMemoryVectorSearch,
	useRefreshMemoryImportance,
	useUpdateAgentMemory,
	// WASM hooks
	useWASMVectorSearch,
} from "./use-agent-memory";
// Environment hooks
export {
	// Types
	type EnvironmentFilters,
	type EnvironmentValidationResult,
	prefetchActiveEnvironment,
	// Helpers
	prefetchEnvironment,
	type UpdateEnvironmentInput,
	useActivateEnvironment,
	useActiveEnvironment,
	useCloneEnvironment,
	// Mutation hooks
	useCreateEnvironment,
	// Convenience hooks
	useDeactivateEnvironment,
	useDeleteEnvironment,
	useEnvironment,
	// Query hooks
	useEnvironments,
	// Real-time hooks
	useEnvironmentsSubscription,
	useUpdateEnvironment,
	useValidateEnvironmentConfig,
} from "./use-environments";
// Observability event hooks
export {
	type EventAggregation,
	// Types
	type EventFilters,
	type EventsResponse,
	type EventTimeline,
	// Helpers
	prefetchEvent,
	prefetchEventTimeline,
	useBulkCreateObservabilityEvents,
	// Mutation hooks
	useCreateObservabilityEvent,
	useCriticalEvents,
	useErrorEvents,
	useEventAggregation,
	useEventStream,
	useEventsByExecution,
	useEventsBySeverity,
	useEventsByTrace,
	// Real-time hooks
	useEventsSubscription,
	useEventTimeline,
	useInfiniteObservabilityEvents,
	useObservabilityEvent,
	// Query hooks
	useObservabilityEvents,
} from "./use-observability-events";
// Task hooks
export {
	// Helpers
	prefetchTask,
	prefetchTasks,
	type TaskFilters,
	// Types
	type TasksResponse,
	type UpdateTaskInput,
	// Convenience hooks
	useArchiveTask,
	// Batch operations
	useBulkUpdateTasks,
	// Mutation hooks
	useCreateTask,
	useDeleteTask,
	useInfiniteTasks,
	useTask,
	useTaskStats,
	// Query hooks
	useTasks,
	// Real-time hooks
	useTasksSubscription,
	useTaskVectorSearch,
	useUnarchiveTask,
	useUpdateTask,
	useUpdateTaskPriority,
	useUpdateTaskStatus,
} from "./use-tasks";
// Workflow hooks
export {
	type ExecutionsResponse as WorkflowExecutionsResponse,
	// Helpers
	prefetchWorkflow,
	prefetchWorkflowExecution,
	type UpdateWorkflowInput,
	// Convenience hooks
	useActiveWorkflows,
	useCancelWorkflowExecution,
	useChildExecutions,
	useCreateExecutionSnapshot,
	// Workflow mutation hooks
	useCreateWorkflow,
	useDeleteWorkflow,
	useExecuteWorkflow,
	useExecutionSnapshots,
	useInfiniteWorkflowExecutions,
	// Workflow execution mutation hooks
	usePauseWorkflowExecution,
	useResumeWorkflowExecution,
	useUpdateWorkflow,
	useValidateWorkflow,
	useWorkflow,
	useWorkflowExecution,
	useWorkflowExecutionStats,
	// Workflow execution query hooks
	useWorkflowExecutions,
	useWorkflowExecutionsByWorkflow,
	useWorkflowExecutionsSubscription,
	// Workflow query hooks
	useWorkflows,
	useWorkflowsByTag,
	// Real-time hooks
	useWorkflowsSubscription,
	useWorkflowVersions,
	type WorkflowExecutionFilters,
	type WorkflowExecutionStats,
	// Types
	type WorkflowFilters,
} from "./use-workflows";
