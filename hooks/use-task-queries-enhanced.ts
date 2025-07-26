"use client";

import {
	type UseMutationOptions,
	type UseQueryOptions,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { observability } from "@/lib/observability";
import type { CreateTaskInput, Task, UpdateTaskInput } from "@/types/task";

// Query keys for consistent caching
export const queryKeys = {
	tasks: {
		all: ["tasks"] as const,
		lists: () => [...queryKeys.tasks.all, "list"] as const,
		list: (filters: Record<string, any>) => [...queryKeys.tasks.lists(), filters] as const,
		details: () => [...queryKeys.tasks.all, "detail"] as const,
		detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
		infinite: (filters: Record<string, any>) =>
			[...queryKeys.tasks.all, "infinite", filters] as const,
		search: (query: string) => [...queryKeys.tasks.all, "search", query] as const,
	},
};

export interface TaskFilters {
	status?: string[];
	priority?: string[];
	userId?: string;
	search?: string;
	dateRange?: {
		start: Date;
		end: Date;
	};
	tags?: string[];
	assignedTo?: string;
}

/**
 * Hook for querying a single task by ID
 */
export function useTaskQuery(taskId: string, options?: UseQueryOptions<Task, Error>) {
	return useQuery({
		queryKey: queryKeys.tasks.detail(taskId),
		queryFn: async (): Promise<Task> => {
			return observability.trackOperation("tasks.get", async () => {
				const response = await fetch(`/api/tasks/${taskId}`, {
					headers: {
						"Cache-Control": "max-age=120", // 2 minutes browser cache
					},
				});

				if (!response.ok) {
					if (response.status === 404) {
						throw new Error(`Task with id ${taskId} not found`);
					}
					throw new Error(`Failed to fetch task: ${response.statusText}`);
				}

				const result = await response.json();
				return result.tasks?.[0] || result.data || result;
			});
		},
		enabled: !!taskId && taskId.length > 0,
		staleTime: 2 * 60 * 1000, // 2 minutes
		retry: (failureCount, error) => {
			// Don't retry 404s or client errors
			if (error instanceof Error && error.message.includes("not found")) {
				return false;
			}
			return failureCount < 3;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		...options,
	});
}

/**
 * Hook for querying tasks with filters
 */
export function useTasksQuery(filters: TaskFilters = {}, options?: UseQueryOptions<Task[], Error>) {
	const { userId, status, priority, search, dateRange, tags, assignedTo } = filters;

	// Memoize the search params to prevent unnecessary re-renders
	const searchParamsString = useMemo(() => {
		const searchParams = new URLSearchParams();

		if (userId) {
			searchParams.append("userId", userId);
		}
		if (status?.length) {
			searchParams.append("status", status.join(","));
		}
		if (priority?.length) {
			searchParams.append("priority", priority.join(","));
		}
		if (search && search.trim()) {
			searchParams.append("search", search.trim());
		}
		if (dateRange) {
			searchParams.append("startDate", dateRange.start.toISOString());
			searchParams.append("endDate", dateRange.end.toISOString());
		}
		if (tags?.length) {
			searchParams.append("tags", tags.join(","));
		}
		if (assignedTo) {
			searchParams.append("assignedTo", assignedTo);
		}

		return searchParams.toString();
	}, [userId, status, priority, search, dateRange, tags, assignedTo]);

	// Debounce search queries to reduce API calls
	const isSearchQuery = search && search.length > 0;
	const shouldDebounce = isSearchQuery && search.length < 3;

	return useQuery({
		queryKey: queryKeys.tasks.list(filters),
		queryFn: async (): Promise<Task[]> => {
			return observability.trackOperation("tasks.list", async () => {
				const response = await fetch(`/api/tasks?${searchParamsString}`, {
					headers: {
						"Cache-Control": isSearchQuery ? "no-cache" : "max-age=300", // 5 min cache for non-search
					},
				});

				if (!response.ok) {
					throw new Error(`Failed to fetch tasks: ${response.statusText}`);
				}

				const result = await response.json();
				return result.tasks || result.data || result;
			});
		},
		enabled: !shouldDebounce, // Disable query for very short search terms
		staleTime: isSearchQuery ? 30 * 1000 : 2 * 60 * 1000, // 30s for search, 2min for filters
		retry: (failureCount) => {
			// Don't retry search queries as aggressively
			if (isSearchQuery) {
				return failureCount < 1;
			}
			return failureCount < 3;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		...options,
	});
}

/**
 * Hook for creating tasks with optimistic updates
 */
export function useCreateTaskMutation(options?: UseMutationOptions<Task, Error, CreateTaskInput>) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (newTask: CreateTaskInput): Promise<Task> => {
			return observability.trackOperation("tasks.create", async () => {
				const response = await fetch("/api/tasks", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(newTask),
				});

				if (!response.ok) {
					throw new Error(`Failed to create task: ${response.statusText}`);
				}

				const result = await response.json();
				return result.data || result;
			});
		},
		onMutate: async (variables) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() });

			// Create optimistic task
			const optimisticTask: Task = {
				id: `temp-${Date.now()}`,
				title: variables.title,
				description: variables.description,
				status: "pending",
				priority: variables.priority || "medium",
				userId: variables.userId || "",
				createdAt: new Date(),
				updatedAt: new Date(),
				tags: variables.tags || [],
				metadata: variables.metadata,
			} as Task;

			// Add to all relevant caches
			queryClient.setQueriesData({ queryKey: queryKeys.tasks.lists() }, (old: Task[] = []) => [
				optimisticTask,
				...old,
			]);

			return { optimisticTask };
		},
		onSuccess: (newTask, variables, context) => {
			// Replace optimistic update with real data
			if (context?.optimisticTask) {
				queryClient.setQueriesData({ queryKey: queryKeys.tasks.lists() }, (old: Task[] = []) =>
					old.map((task) => (task.id === context.optimisticTask.id ? newTask : task))
				);
			}
			// Invalidate to ensure consistency
			queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
		},
		onError: (error, variables, context) => {
			// Remove optimistic update on error
			if (context?.optimisticTask) {
				queryClient.setQueriesData({ queryKey: queryKeys.tasks.lists() }, (old: Task[] = []) =>
					old.filter((task) => task.id !== context.optimisticTask.id)
				);
			}
			console.error("Failed to create task:", error);
		},
		...options,
	});
}

/**
 * Hook for updating tasks with optimistic updates
 */
export function useUpdateTaskMutation(
	options?: UseMutationOptions<Task, Error, { taskId: string; updates: UpdateTaskInput }>
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			taskId,
			updates,
		}: {
			taskId: string;
			updates: UpdateTaskInput;
		}): Promise<Task> => {
			return observability.trackOperation("tasks.update", async () => {
				const response = await fetch(`/api/tasks/${taskId}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(updates),
				});

				if (!response.ok) {
					throw new Error(`Failed to update task: ${response.statusText}`);
				}

				const result = await response.json();
				return result.data || result;
			});
		},
		onMutate: async ({ taskId, updates }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) });

			// Snapshot previous value
			const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(taskId)) as Task;

			// Optimistically update
			const updatedTask = {
				...previousTask,
				...updates,
				updatedAt: new Date(),
			} as Task;

			queryClient.setQueryData(queryKeys.tasks.detail(taskId), updatedTask);
			queryClient.setQueriesData({ queryKey: queryKeys.tasks.lists() }, (old: Task[] = []) =>
				old.map((task) => (task.id === taskId ? updatedTask : task))
			);

			return { previousTask, taskId };
		},
		onError: (err, variables, context) => {
			// Rollback on error
			if (context?.previousTask) {
				queryClient.setQueryData(queryKeys.tasks.detail(variables.taskId), context.previousTask);
				queryClient.setQueriesData({ queryKey: queryKeys.tasks.lists() }, (old: Task[] = []) =>
					old.map((task) => (task.id === variables.taskId ? context.previousTask : task))
				);
			}
		},
		onSettled: (data, error, variables) => {
			// Always refetch after error or success
			queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
			queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
		},
		...options,
	});
}

/**
 * Hook for deleting tasks with optimistic updates
 */
export function useDeleteTaskMutation(options?: UseMutationOptions<void, Error, string>) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (taskId: string): Promise<void> => {
			return observability.trackOperation("tasks.delete", async () => {
				const response = await fetch(`/api/tasks/${taskId}`, {
					method: "DELETE",
				});

				if (!response.ok) {
					throw new Error(`Failed to delete task: ${response.statusText}`);
				}
			});
		},
		onMutate: async (taskId) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });

			// Snapshot previous value
			const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(taskId)) as Task;

			// Remove task from all caches
			queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId) });
			queryClient.setQueriesData({ queryKey: queryKeys.tasks.lists() }, (old: Task[] = []) =>
				old.filter((task) => task.id !== taskId)
			);

			return { previousTask, taskId };
		},
		onError: (err, taskId, context) => {
			// Rollback on error
			if (context?.previousTask) {
				queryClient.setQueryData(queryKeys.tasks.detail(taskId), context.previousTask);
				queryClient.setQueriesData({ queryKey: queryKeys.tasks.lists() }, (old: Task[] = []) => [
					context.previousTask,
					...old,
				]);
			}
		},
		onSettled: () => {
			// Always refetch after error or success
			queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
		},
		...options,
	});
}

/**
 * Utility hooks for common task operations
 */

// Get all tasks (replaces useTaskStore().getTasks())
export function useTasks(filters?: TaskFilters) {
	return useTasksQuery(filters);
}

// Get active tasks (replaces useTaskStore().getActiveTasks())
export function useActiveTasks(userId?: string) {
	return useTasksQuery({
		status: ["pending", "in-progress"],
		userId,
	});
}

// Get completed tasks
export function useCompletedTasks(userId?: string) {
	return useTasksQuery({
		status: ["completed"],
		userId,
	});
}

// Get task by ID (replaces useTaskStore().getTaskById())
export function useTask(taskId: string) {
	return useTaskQuery(taskId);
}

// Get tasks by status (replaces useTaskStore().getTasksByStatus())
export function useTasksByStatus(status: string, userId?: string) {
	return useTasksQuery({
		status: [status],
		userId,
	});
}

// Get tasks by session ID (replaces useTaskStore().getTasksBySessionId())
export function useTasksBySessionId(sessionId: string) {
	return useTasksQuery({
		search: sessionId, // This might need adjustment based on API implementation
	});
}

/**
 * Real-time subscription hook for tasks with ElectricSQL integration
 */
export function useTaskSubscription(taskId?: string, userId?: string) {
	const queryClient = useQueryClient();

	useEffect(() => {
		let unsubscribe: (() => void) | undefined;

		const setupSubscription = async () => {
			try {
				// Import ElectricSQL client dynamically to avoid SSR issues
				const { electricDb } = await import("@/lib/electric/config-client");

				if (electricDb.isReady()) {
					// Set up real-time subscription for tasks
					const filters = userId ? { user_id: userId } : undefined;
					await electricDb.subscribeToTable("tasks", filters);

					// Listen for sync events
					const handleSyncEvent = (event: any) => {
						if (event.table === "tasks") {
							// Invalidate relevant queries when tasks change
							if (taskId && event.record?.id === taskId) {
								queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
							} else {
								queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
							}
						}
					};

					electricDb.addSyncEventListener("tasks", handleSyncEvent);

					unsubscribe = () => {
						electricDb.removeSyncEventListener("tasks", handleSyncEvent);
					};
				}
			} catch (error) {
				console.warn("Failed to set up ElectricSQL subscription:", error);

				// Fallback to polling
				const interval = setInterval(() => {
					if (taskId) {
						queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
					} else {
						queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
					}
				}, 30000);

				unsubscribe = () => clearInterval(interval);
			}
		};

		setupSubscription();

		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	}, [taskId, userId, queryClient]);
}

/**
 * Enhanced task queries with ElectricSQL real-time sync
 */
export function useTasksWithSync(filters: TaskFilters = {}, userId?: string) {
	const tasksQuery = useTasksQuery(filters);

	// Set up real-time subscription
	useTaskSubscription(undefined, userId);

	return tasksQuery;
}

export function useTaskWithSync(taskId: string, userId?: string) {
	const taskQuery = useTaskQuery(taskId);

	// Set up real-time subscription for this specific task
	useTaskSubscription(taskId, userId);

	return taskQuery;
}

/**
 * Enhanced task mutations with ElectricSQL real-time sync
 */
export function useTaskMutationWithSync<T = any>(
	mutationFn: (variables: T) => Promise<any>,
	options?: {
		onOptimisticUpdate?: (variables: T) => void;
		onRollback?: (variables: T) => void;
		invalidateQueries?: string[][];
	}
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (variables: T) => {
			try {
				// Import ElectricSQL client dynamically
				const { electricDb } = await import("@/lib/electric/config-client");

				if (electricDb.isReady()) {
					// Use ElectricSQL for real-time sync
					return await mutationFn(variables);
				}
				// Fallback to regular API call
				return await mutationFn(variables);
			} catch (error) {
				console.warn("ElectricSQL not available, using fallback:", error);
				return await mutationFn(variables);
			}
		},
		onMutate: options?.onOptimisticUpdate,
		onError: (error, variables) => {
			if (options?.onRollback) {
				options.onRollback(variables);
			}
		},
		onSuccess: () => {
			// Invalidate specified queries
			if (options?.invalidateQueries) {
				options.invalidateQueries.forEach((queryKey) => {
					queryClient.invalidateQueries({ queryKey });
				});
			}
		},
	});
}

/**
 * Enhanced create task mutation with real-time sync
 */
export function useCreateTaskMutationWithSync() {
	const queryClient = useQueryClient();

	return useTaskMutationWithSync(
		async (newTask: CreateTaskInput) => {
			try {
				// Try ElectricSQL first
				const { electricDb } = await import("@/lib/electric/config-client");

				if (electricDb.isReady()) {
					return await electricDb.executeRealtimeOperation("tasks", "insert", newTask, true);
				}
			} catch (error) {
				console.warn("ElectricSQL not available, using API fallback");
			}

			// Fallback to API
			const response = await fetch("/api/tasks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newTask),
			});

			if (!response.ok) {
				throw new Error(`Failed to create task: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data || result;
		},
		{
			onOptimisticUpdate: (variables) => {
				// Create optimistic task
				const optimisticTask: Task = {
					id: `temp-${Date.now()}`,
					title: variables.title,
					description: variables.description,
					status: "pending",
					priority: variables.priority || "medium",
					userId: variables.userId || "",
					createdAt: new Date(),
					updatedAt: new Date(),
					tags: variables.tags || [],
					metadata: variables.metadata,
				} as Task;

				// Add to all relevant caches
				queryClient.setQueriesData({ queryKey: queryKeys.tasks.lists() }, (old: Task[] = []) => [
					optimisticTask,
					...old,
				]);
			},
			onRollback: (variables) => {
				// Remove optimistic update on error
				queryClient.setQueriesData({ queryKey: queryKeys.tasks.lists() }, (old: Task[] = []) =>
					old.filter((task) => !task.id.startsWith("temp-"))
				);
			},
			invalidateQueries: [queryKeys.tasks.all],
		}
	);
}

/**
 * Enhanced update task mutation with real-time sync
 */
export function useUpdateTaskMutationWithSync() {
	const queryClient = useQueryClient();

	return useTaskMutationWithSync(
		async ({ taskId, updates }: { taskId: string; updates: UpdateTaskInput }) => {
			try {
				// Try ElectricSQL first
				const { electricDb } = await import("@/lib/electric/config-client");

				if (electricDb.isReady()) {
					return await electricDb.executeRealtimeOperation(
						"tasks",
						"update",
						{ id: taskId, ...updates },
						true
					);
				}
			} catch (error) {
				console.warn("ElectricSQL not available, using API fallback");
			}

			// Fallback to API
			const response = await fetch(`/api/tasks/${taskId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				throw new Error(`Failed to update task: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data || result;
		},
		{
			onOptimisticUpdate: ({ taskId, updates }) => {
				// Optimistically update task
				const updatedTask = {
					...updates,
					id: taskId,
					updatedAt: new Date(),
				} as Partial<Task>;

				queryClient.setQueryData(queryKeys.tasks.detail(taskId), (old: Task) =>
					old ? { ...old, ...updatedTask } : old
				);

				queryClient.setQueriesData({ queryKey: queryKeys.tasks.lists() }, (old: Task[] = []) =>
					old.map((task) => (task.id === taskId ? { ...task, ...updatedTask } : task))
				);
			},
			onRollback: ({ taskId }) => {
				// Invalidate to restore original data
				queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
				queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
			},
			invalidateQueries: [queryKeys.tasks.all],
		}
	);
}

/**
 * Hook that automatically sets up real-time sync for tasks
 */
export function useTasksWithRealTimeSync(filters?: TaskFilters) {
	const tasksQuery = useTasksQuery(filters);

	// Set up real-time subscription
	useTaskSubscription();

	return {
		...tasksQuery,
		// Add sync status
		isRealTimeEnabled: true,
	};
}

/**
 * Hook that automatically sets up real-time sync for a single task
 */
export function useTaskWithRealTimeSync(taskId: string) {
	const taskQuery = useTaskQuery(taskId);

	// Set up real-time subscription for this specific task
	useTaskSubscription(taskId);

	return {
		...taskQuery,
		// Add sync status
		isRealTimeEnabled: true,
	};
}
