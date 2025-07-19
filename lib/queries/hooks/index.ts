/**
 * Central export for all TanStack Query hooks
 * This provides a single entry point for all database query hooks
 */

// Re-export database types
export type {
  AgentExecution,
  AgentMemory,
  AgentSession,
  AuthSession,
  Environment,
  ExecutionSnapshot,
  FileUpload,
  GitHubBranch,
  // GitHub entities
  GitHubRepository,
  // System entities
  Migration,
  NewAgentExecution,
  NewAgentMemory,
  NewAgentSession,
  NewAuthSession,
  NewEnvironment,
  NewExecutionSnapshot,
  NewFileUpload,
  NewGitHubBranch,
  NewGitHubRepository,
  NewMigration,
  NewObservabilityEvent,
  NewTask,
  NewUser,
  NewWorkflow,
  NewWorkflowExecution,
  ObservabilityEvent,
  // Core entities
  Task,
  // User entities
  User,
  Workflow,
  WorkflowExecution,
} from '@/db/schema'
export { createOptimizedQueryClient, getOptimizedQueryConfig } from '@/lib/query/config'
// Export utility functions
export { getElectricBridge, initializeElectricBridge } from '@/lib/query/electric-bridge'
export type { MutationKeys, QueryKeys } from '../keys'
// Export query keys
export { mutationKeys, queryKeys } from '../keys'
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
} from './use-agent-executions'

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
} from './use-agent-memory'
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
} from './use-environments'
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
} from './use-observability-events'
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
} from './use-tasks'
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
  type WorkflowValidationResult,
} from './use-workflows'

// Export hooks for other entities (to be implemented)
// These are placeholders for the remaining hooks

// User and auth hooks
export const useUsers = () => {
  throw new Error('useUsers hook not yet implemented')
}

export const useUser = (id: string) => {
  throw new Error('useUser hook not yet implemented')
}

export const useCurrentUser = () => {
  throw new Error('useCurrentUser hook not yet implemented')
}

export const useAuthSessions = (userId: string) => {
  throw new Error('useAuthSessions hook not yet implemented')
}

// File upload hooks
export const useFileUploads = (filters?: any) => {
  throw new Error('useFileUploads hook not yet implemented')
}

export const useFileUpload = (id: string) => {
  throw new Error('useFileUpload hook not yet implemented')
}

export const useCreateFileUpload = () => {
  throw new Error('useCreateFileUpload hook not yet implemented')
}

// GitHub repository hooks
export const useGitHubRepositories = (filters?: any) => {
  throw new Error('useGitHubRepositories hook not yet implemented')
}

export const useGitHubRepository = (id: string) => {
  throw new Error('useGitHubRepository hook not yet implemented')
}

export const useSyncGitHubRepositories = () => {
  throw new Error('useSyncGitHubRepositories hook not yet implemented')
}

// GitHub branch hooks
export const useGitHubBranches = (repositoryId: string) => {
  throw new Error('useGitHubBranches hook not yet implemented')
}

export const useSyncGitHubBranches = () => {
  throw new Error('useSyncGitHubBranches hook not yet implemented')
}

// Migration hooks
export const useMigrations = () => {
  throw new Error('useMigrations hook not yet implemented')
}

export const usePendingMigrations = () => {
  throw new Error('usePendingMigrations hook not yet implemented')
}

// WASM-optimized hooks
export const useWASMSQLiteQuery = (sql: string, params?: any[]) => {
  throw new Error('useWASMSQLiteQuery hook not yet implemented')
}

export const useWASMCompute = (operation: string, data: any) => {
  throw new Error('useWASMCompute hook not yet implemented')
}
