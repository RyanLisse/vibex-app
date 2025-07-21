/**
 * TanStack Query Hooks - Main Export
 *
 * Centralized exports for all query hooks with Redis caching integration
 * and ElectricSQL real-time sync capabilities
 */

// Re-export query client utilities
import { export { useQueryClient } from "@tanstack/react-query";
// Enhanced ElectricSQL Environment hooks (simplified)
export {
	type CreateElectricEnvironmentInput,
	type ElectricEnvironment,
	electricEnvironmentKeys,
	type UpdateElectricEnvironmentInput,
	import { useCreateElectricEnvironment,
	import { useDeleteElectricEnvironment,
	import { useElectricEnvironment,
	import { useElectricEnvironments,
	import { useUpdateElectricEnvironment
} from "./use-electric-environments";
// Enhanced ElectricSQL Task hooks (temporarily disabled to fix build)
// export {
//   type CreateElectricTaskInput,
//   type ElectricTask,
//   type ElectricTaskFilters,
//   type ElectricTaskOptions,
//   electricTaskKeys,
//   type UpdateElectricTaskInput,
//   useActiveTasks,
//   useArchivedTasks,
//   useCreateElectricTask,
//   useDeleteElectricTask,
//   useElectricTask,
//   useElectricTasks,
//   useForceTaskSync,
//   useOfflineTaskStatus,
//   useTasksBySession,
//   useTasksByStatus,
//   useUpdateElectricTask,
// } from './use-electric-tasks'

// Legacy Environment hooks (for backward compatibility)
export {
	type CreateEnvironmentInput,
	type Environment,
	environmentKeys,
	type UpdateEnvironmentInput,
	useCreateEnvironment,
	useDeleteEnvironment,
	useEnvironment,
	useEnvironmentByName,
	import { useEnvironments,
	import { useEnvironmentsByOrganization,
	import { usePrefetchEnvironment,
	import { useUpdateEnvironment,
	import { useValidateEnvironmentName
} from "./use-environments";

// Migration hooks
export {
	useDataSource,
	import { useMigration,
	import { usePrefetchData,
	import { useResetMigration,
	import { useUnifiedEnvironments,
	import { useUnifiedTasks
} from "./use-migration";
// Legacy Task hooks (for backward compatibility)
export {
	type CreateTaskInput,
	type Task,
	taskKeys,
	type UpdateTaskInput,
	useArchiveTask,
	useCancelTask,
	useCreateTask,
	useDeleteTask,
	useInfiniteTasks,
	usePauseTask,
	import { useResumeTask,
	import { useTask,
	import { useTasks,
	import { useUnarchiveTask,
	import { useUpdateTask
} from "./use-tasks";

// Common query patterns
export const queryPatterns = {
	// Invalidate all data
	invalidateAll: (queryClient: any) => {
		queryClient.invalidateQueries({ queryKey: taskKeys.all });
		queryClient.invalidateQueries({ queryKey: environmentKeys.all });
	},

	// Clear all cache
	clearAll: (queryClient: any) => {
		queryClient.removeQueries({ queryKey: taskKeys.all });
		queryClient.removeQueries({ queryKey: environmentKeys.all });
	},

	// Prefetch common data
	prefetchCommon: (queryClient: any) => {
		queryClient.prefetchQuery({
			queryKey: taskKeys.list({ archived: false }),
			queryFn: () =>
				fetch("/api/tasks?archived=false").then((res) => res.json()),
		});

		queryClient.prefetchQuery({
			queryKey: environmentKeys.lists(),
			queryFn: () => fetch("/api/environments").then((res) => res.json()),
		});
	},
};

// Query configuration helpers
export const queryConfig = {
	// Default stale times
	staleTime: {
		short: 1000 * 60 * 2, // 2 minutes
		medium: 1000 * 60 * 5, // 5 minutes
		long: 1000 * 60 * 10, // 10 minutes
	},

	// Default cache times
	cacheTime: {
		short: 1000 * 60 * 5, // 5 minutes
		medium: 1000 * 60 * 10, // 10 minutes
		long: 1000 * 60 * 30, // 30 minutes
	},

	// Retry configuration
	retry: {
		default: 3,
		important: 5,
		background: 1,
	},
};

// Error handling utilities
export const queryErrorHandlers = {
	// Standard error handler
	onError: (error: Error, queryKey: unknown[]) => {
		console.error("Query error:", error, "Query key:", queryKey);

		// You could integrate with your error tracking service here
		// errorTracker.captureException(error, { extra: { queryKey } })
	},

	// Network error handler
	onNetworkError: (error: Error) => {
		console.error("Network error:", error);
		// Handle network-specific errors (offline, timeout, etc.)
	},

	// Authentication error handler
	onAuthError: (error: Error) => {
		console.error("Authentication error:", error);
		// Redirect to login or refresh tokens
	},
};

// Query key factories for consistent key generation
export const createQueryKey = {
	task: (id: string) => taskKeys.detail(id),
	tasks: (filters: Record<string, any> = {}) => taskKeys.list(filters),
	environment: (id: string) => environmentKeys.detail(id),
	environments: (filters: Record<string, any> = {}) =>
		environmentKeys.list(filters),

	// Custom query keys
	custom: (
		namespace: string,
		...parts: (string | number | Record<string, any>)[]
	) => [namespace, ...parts],
};

// Hook utilities and types
export type {
import { AgentExecution,
import { WorkflowFilter
} from "@/lib/observability/types";
// Observability and Database Integration hooks
export * from "./use-agent-executions";
export * from "./use-agent-memory";
export * from "./use-observability-events";
export * from "./use-workflows";

// Optimistic update helpers
export const optimisticUpdates = {
	// Add item to list
	addToList: <T extends { id: string }>(
		queryClient: any,
		queryKey: unknown[],
		newItem: T,
	) => {
		queryClient.setQueryData(queryKey, (old: any) => {
			if (!old) return { items: [newItem], total: 1 };
			return {
				...old,
				items: [newItem, ...old.items],
				total: old.total + 1,
			};
		});
	},

	// Update item in list
	updateInList: <T extends { id: string }>(
		queryClient: any,
		queryKey: unknown[],
		updatedItem: T,
	) => {
		queryClient.setQueryData(queryKey, (old: any) => {
			if (!old) return old;
			return {
				...old,
				items: old.items.map((item: T) =>
					item.id === updatedItem.id ? updatedItem : item,
				),
			};
		});
	},

	// Remove item from list
	removeFromList: <T extends { id: string }>(
		queryClient: any,
		queryKey: unknown[],
		itemId: string,
	) => {
		queryClient.setQueryData(queryKey, (old: any) => {
			if (!old) return old;
			return {
				...old,
				items: old.items.filter((item: T) => item.id !== itemId),
				total: old.total - 1,
			};
		});
	},
};

// Cache synchronization utilities
export const cacheSync = {
	// Sync query cache with Redis
	syncWithRedis: async (queryClient: any, keys: string[]) => {
		// This would sync specific cache keys with Redis
		// Implementation depends on your Redis setup
		console.log("Syncing cache with Redis for keys:", keys);
	},

	// Warm up cache
	warmUpCache: async (queryClient: any) => {
		await queryPatterns.prefetchCommon(queryClient);
	},

	// Clean up stale cache
	cleanupStaleCache: (queryClient: any, maxAge: number = 1000 * 60 * 60) => {
		const now = Date.now();
		queryClient
			.getQueryCache()
			.getAll()
			.forEach((query: any) => {
				if (query.state.dataUpdatedAt < now - maxAge) {
					queryClient.removeQueries({ queryKey: query.queryKey });
				}
			});
	},
};
