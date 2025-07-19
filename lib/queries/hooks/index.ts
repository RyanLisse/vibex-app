/**
 * Central export for all TanStack Query hooks
 * This provides a single entry point for all database query hooks
 */

// Export query keys
export { queryKeys, mutationKeys } from '../keys'
export type { QueryKeys, MutationKeys } from '../keys'

// Task hooks
export {
  // Query hooks
  useTasks,
  useTask,
  useInfiniteTasks,
  useTaskVectorSearch,
  useTaskStats,
  // Mutation hooks
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  // Convenience hooks
  useArchiveTask,
  useUnarchiveTask,
  useUpdateTaskStatus,
  useUpdateTaskPriority,
  // Real-time hooks
  useTasksSubscription,
  // Batch operations
  useBulkUpdateTasks,
  // Helpers
  prefetchTask,
  prefetchTasks,
  // Types
  type TasksResponse,
  type TaskFilters,
  type UpdateTaskInput,
} from './use-tasks'

// Environment hooks
export {
  // Query hooks
  useEnvironments,
  useEnvironment,
  useActiveEnvironment,
  useValidateEnvironmentConfig,
  // Mutation hooks
  useCreateEnvironment,
  useUpdateEnvironment,
  useDeleteEnvironment,
  useActivateEnvironment,
  // Real-time hooks
  useEnvironmentsSubscription,
  // Convenience hooks
  useDeactivateEnvironment,
  useCloneEnvironment,
  // Helpers
  prefetchEnvironment,
  prefetchActiveEnvironment,
  // Types
  type EnvironmentFilters,
  type UpdateEnvironmentInput,
  type EnvironmentValidationResult,
} from './use-environments'

// Agent execution hooks
export {
  // Query hooks
  useAgentExecutions,
  useAgentExecution,
  useInfiniteAgentExecutions,
  useExecutionStats,
  useExecutionPerformance,
  useExecutionsByTask,
  useExecutionsByAgent,
  useExecutionsByTrace,
  // Mutation hooks
  useCreateAgentExecution,
  useCancelAgentExecution,
  useRetryAgentExecution,
  // Real-time hooks
  useExecutionsSubscription,
  // Performance hooks
  useExecutionPerformanceMonitor,
  // Helpers
  prefetchExecution,
  prefetchExecutionStats,
  // Types
  type AgentExecutionFilters,
  type ExecutionStats,
  type ExecutionPerformance,
  type ExecutionsResponse,
} from './use-agent-executions'

// Observability event hooks
export {
  // Query hooks
  useObservabilityEvents,
  useObservabilityEvent,
  useInfiniteObservabilityEvents,
  useEventTimeline,
  useEventAggregation,
  useEventsByExecution,
  useEventsByTrace,
  useEventsBySeverity,
  useCriticalEvents,
  useErrorEvents,
  // Mutation hooks
  useCreateObservabilityEvent,
  useBulkCreateObservabilityEvents,
  // Real-time hooks
  useEventsSubscription,
  useEventStream,
  // Helpers
  prefetchEvent,
  prefetchEventTimeline,
  // Types
  type EventFilters,
  type EventsResponse,
  type EventTimeline,
  type EventAggregation,
} from './use-observability-events'

// Agent memory hooks
export {
  // Query hooks
  useAgentMemories,
  useAgentMemory,
  useMemorySearch,
  useMemoryVectorSearch,
  useMemoryStats,
  useMemoriesByAgent,
  useMemoryByContext,
  // Mutation hooks
  useCreateAgentMemory,
  useUpdateAgentMemory,
  useDeleteAgentMemory,
  useCleanupMemories,
  useRefreshMemoryImportance,
  // Real-time hooks
  useMemorySubscription,
  // WASM hooks
  useWASMVectorSearch,
  // Helpers
  prefetchMemory,
  prefetchMemoryStats,
  // Types
  type MemoryFilters,
  type MemorySearchResult,
  type MemoryStats,
  type UpdateMemoryInput,
} from './use-agent-memory'

// Workflow hooks
export {
  // Workflow query hooks
  useWorkflows,
  useWorkflow,
  useWorkflowVersions,
  useValidateWorkflow,
  // Workflow execution query hooks
  useWorkflowExecutions,
  useWorkflowExecution,
  useInfiniteWorkflowExecutions,
  useWorkflowExecutionStats,
  useExecutionSnapshots,
  // Workflow mutation hooks
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useExecuteWorkflow,
  // Workflow execution mutation hooks
  usePauseWorkflowExecution,
  useResumeWorkflowExecution,
  useCancelWorkflowExecution,
  useCreateExecutionSnapshot,
  // Real-time hooks
  useWorkflowsSubscription,
  useWorkflowExecutionsSubscription,
  // Convenience hooks
  useActiveWorkflows,
  useWorkflowsByTag,
  useWorkflowExecutionsByWorkflow,
  useChildExecutions,
  // Helpers
  prefetchWorkflow,
  prefetchWorkflowExecution,
  // Types
  type WorkflowFilters,
  type WorkflowExecutionFilters,
  type WorkflowValidationResult,
  type WorkflowExecutionStats,
  type UpdateWorkflowInput,
  type ExecutionsResponse as WorkflowExecutionsResponse,
} from './use-workflows'

// Re-export database types
export type {
  // Core entities
  Task,
  NewTask,
  Environment,
  NewEnvironment,
  AgentExecution,
  NewAgentExecution,
  ObservabilityEvent,
  NewObservabilityEvent,
  AgentMemory,
  NewAgentMemory,
  Workflow,
  NewWorkflow,
  WorkflowExecution,
  NewWorkflowExecution,
  ExecutionSnapshot,
  NewExecutionSnapshot,
  // User entities
  User,
  NewUser,
  AuthSession,
  NewAuthSession,
  FileUpload,
  NewFileUpload,
  AgentSession,
  NewAgentSession,
  // GitHub entities
  GitHubRepository,
  NewGitHubRepository,
  GitHubBranch,
  NewGitHubBranch,
  // System entities
  Migration,
  NewMigration,
} from '@/db/schema'

// Export utility functions
export { initializeElectricBridge, getElectricBridge } from '@/lib/query/electric-bridge'
export { createOptimizedQueryClient, getOptimizedQueryConfig } from '@/lib/query/config'

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
