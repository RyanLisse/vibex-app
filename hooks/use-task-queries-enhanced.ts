"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { NewTask, Task } from "@/db/schema";
import { invalidateQueries, mutationKeys, queryKeys } from "@/lib/query/config";
import { useElectricTasks } from "./use-electric-tasks";
import {
	useEnhancedMutation,
	useEnhancedQuery,
	useVectorSearchQuery,
} from "./use-enhanced-query-new";

/**
 * Enhanced task queries with comprehensive database integration, WASM optimization, and real-time sync
 */

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

export interface TaskSearchOptions {
	query: string;
	useSemanticSearch?: boolean;
	filters?: TaskFilters;
	limit?: number;
	threshold?: number;
}

export interface TaskWithRelations extends Task {
	agentExecutions?: Array<{
		id: string;
		status: string;
		startedAt: Date;
		completedAt?: Date;
		agentType: string;
	}>;
	executionCount?: number;
	lastExecution?: Date;
}

/**
 * Hook for querying a single task by ID with full relations
 */
export function useTaskQuery(taskId: string) {
	return useEnhancedQuery(
		queryKeys.tasks.detail(taskId),
		async (): Promise<TaskWithRelations> => {
			const response = await fetch(`/api/tasks/${taskId}?include=executions`);
			if (!response.ok) {
				if (response.status === 404) {
					throw new Error(`Task with id ${taskId} not found`);
				}
				throw new Error(`Failed to fetch task: ${response.statusText}`);
			}
			const result = await response.json();
			return result.data;
		},
		{
			enabled: !!taskId,
			staleTime: 2 * 60 * 1000, // 2 minutes
			enableWASMOptimization: false, // Single record doesn't need WASM optimization
			enableRealTimeSync: true,
			syncTable: "tasks",
		},
	);
}

/**
 * Hook for querying tasks with enhanced caching, WASM optimization, and real-time sync
 */
export function useTasksQuery(filters: TaskFilters = {}) {
	const { userId, status, priority, search, dateRange, tags, assignedTo } =
		filters;

	return useEnhancedQuery(
		queryKeys.tasks.list(filters),
		async (): Promise<TaskWithRelations[]> => {
			const searchParams = new URLSearchParams();

			if (userId) searchParams.append("userId", userId);
			if (status?.length) searchParams.append("status", status.join(","));
			if (priority?.length) searchParams.append("priority", priority.join(","));
			if (search) searchParams.append("search", search);
			if (dateRange) {
				searchParams.append("startDate", dateRange.start.toISOString());
				searchParams.append("endDate", dateRange.end.toISOString());
			}
			if (tags?.length) searchParams.append("tags", tags.join(","));
			if (assignedTo) searchParams.append("assignedTo", assignedTo);

			const response = await fetch(`/api/tasks?${searchParams.toString()}`);
			if (!response.ok) {
				throw new Error(`Failed to fetch tasks: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data;
		},
		{
			enableWASMOptimization: true,
			staleWhileRevalidate: true,
			enableRealTimeSync: true,
			syncTable: "tasks",
			wasmFallback: async () => {
				// Fallback to simpler query without complex filtering
				const response = await fetch("/api/tasks");
				if (!response.ok) {
					throw new Error(`Failed to fetch tasks: ${response.statusText}`);
				}
				const result = await response.json();

				// Apply client-side filtering as fallback
				let filteredTasks = result.data;

				if (status?.length) {
					filteredTasks = filteredTasks.filter((task: Task) =>
						status.includes(task.status),
					);
				}

				if (priority?.length) {
					filteredTasks = filteredTasks.filter((task: Task) =>
						priority.includes(task.priority),
					);
				}

				if (search) {
					const searchLower = search.toLowerCase();
					filteredTasks = filteredTasks.filter(
						(task: Task) =>
							task.title.toLowerCase().includes(searchLower) ||
							task.description?.toLowerCase().includes(searchLower),
					);
				}

				return filteredTasks;
			},
		},
	);
}

/**
 * Hook for infinite task queries with virtualization support
 */
export function useInfiniteTasksQuery(
	filters: TaskFilters = {},
	pageSize = 50,
) {
	return useInfiniteQuery({
		queryKey: queryKeys.tasks.infinite(filters),
		queryFn: async ({ pageParam = 0 }) => {
			const searchParams = new URLSearchParams();
			searchParams.append("page", pageParam.toString());
			searchParams.append("limit", pageSize.toString());

			if (filters.userId) searchParams.append("userId", filters.userId);
			if (filters.status?.length)
				searchParams.append("status", filters.status.join(","));
			if (filters.priority?.length)
				searchParams.append("priority", filters.priority.join(","));
			if (filters.search) searchParams.append("search", filters.search);

			const response = await fetch(
				`/api/tasks/infinite?${searchParams.toString()}`,
			);
			if (!response.ok) {
				throw new Error(`Failed to fetch tasks: ${response.statusText}`);
			}

			const result = await response.json();
			return {
				tasks: result.data,
				nextCursor: result.hasMore ? (pageParam as number) + 1 : undefined,
				hasMore: result.hasMore,
				total: result.total,
			};
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		staleTime: 2 * 60 * 1000, // 2 minutes
	});
}

/**
 * Hook for semantic task search using WASM vector search
 */
export function useTaskSearchQuery(options: TaskSearchOptions) {
	const {
		query,
		useSemanticSearch = false,
		filters,
		limit = 20,
		threshold = 0.7,
	} = options;

	// Use vector search if semantic search is enabled and query is substantial
	const shouldUseVectorSearch = useSemanticSearch && query.length > 10;

	const vectorSearchQuery = useVectorSearchQuery<TaskWithRelations>(query, {
		enabled: shouldUseVectorSearch,
		filters,
		limit,
		threshold,
	});

	// Fallback to regular text search
	const textSearchQuery = useEnhancedQuery(
		queryKeys.tasks.search(query),
		async (): Promise<TaskWithRelations[]> => {
			if (!query.trim()) return [];

			const searchParams = new URLSearchParams();
			searchParams.append("q", query);
			searchParams.append("limit", limit.toString());

			if (filters?.status?.length)
				searchParams.append("status", filters.status.join(","));
			if (filters?.priority?.length)
				searchParams.append("priority", filters.priority.join(","));
			if (filters?.userId) searchParams.append("userId", filters.userId);

			const response = await fetch(
				`/api/tasks/search?${searchParams.toString()}`,
			);
			if (!response.ok) {
				throw new Error(`Failed to search tasks: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data;
		},
		{
			enabled: !shouldUseVectorSearch && query.length > 0,
			enableWASMOptimization: true,
			enableRealTimeSync: true,
			syncTable: "tasks",
			staleTime: 30 * 1000, // 30 seconds for search results
		},
	);

	return {
		tasks: shouldUseVectorSearch
			? vectorSearchQuery.data
			: textSearchQuery.data,
		loading: shouldUseVectorSearch
			? vectorSearchQuery.isLoading
			: textSearchQuery.isLoading,
		error: shouldUseVectorSearch
			? vectorSearchQuery.error
			: textSearchQuery.error,
		isSemanticSearch: shouldUseVectorSearch,
		refetch: shouldUseVectorSearch
			? vectorSearchQuery.refetch
			: textSearchQuery.refetch,
	};
}

/**
 * Hook for creating tasks with optimistic updates and real-time sync
 */
export function useCreateTaskMutation() {
	const queryClient = useQueryClient();

	return useEnhancedMutation(
		async (newTask: Omit<NewTask, "id" | "createdAt" | "updatedAt">) => {
			const response = await fetch("/api/tasks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newTask),
			});

			if (!response.ok) {
				throw new Error(`Failed to create task: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data;
		},
		{
			optimisticUpdate: (variables) => {
				// Create optimistic task
				const optimisticTask: TaskWithRelations = {
					id: `temp-${Date.now()}`,
					...variables,
					createdAt: new Date(),
					updatedAt: new Date(),
					agentExecutions: [],
					executionCount: 0,
				} as TaskWithRelations;

				// Add to all relevant caches
				queryClient.setQueryData(
					queryKeys.tasks.lists(),
					(old: TaskWithRelations[] = []) => [optimisticTask, ...old],
				);

				return { optimisticTask };
			},
			rollbackUpdate: (context) => {
				if (context?.optimisticTask) {
					// Remove optimistic task from cache
					queryClient.setQueryData(
						queryKeys.tasks.lists(),
						(old: TaskWithRelations[] = []) =>
							old.filter((task) => task.id !== context.optimisticTask.id),
					);
				}
			},
			invalidateQueries: [queryKeys.tasks.all],
			enableRealTimeSync: true,
			syncTable: "tasks",
		},
	);
}

/**
 * Hook for updating tasks with optimistic updates and real-time sync
 */
export function useUpdateTaskMutation() {
	const queryClient = useQueryClient();

	return useEnhancedMutation(
		async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
			const response = await fetch(`/api/tasks/${taskId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				throw new Error(`Failed to update task: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data;
		},
		{
			optimisticUpdate: ({ taskId, updates }) => {
				const previousTask = queryClient.getQueryData(
					queryKeys.tasks.detail(taskId),
				) as TaskWithRelations;

				// Update task in all relevant caches
				queryClient.setQueryData(
					queryKeys.tasks.detail(taskId),
					(old: TaskWithRelations) =>
						old ? { ...old, ...updates, updatedAt: new Date() } : old,
				);

				queryClient.setQueryData(
					queryKeys.tasks.lists(),
					(old: TaskWithRelations[] = []) =>
						old.map((task) =>
							task.id === taskId
								? { ...task, ...updates, updatedAt: new Date() }
								: task,
						),
				);

				return { previousTask, taskId };
			},
			rollbackUpdate: (context) => {
				if (context?.previousTask && context?.taskId) {
					// Restore previous task data
					queryClient.setQueryData(
						queryKeys.tasks.detail(context.taskId),
						context.previousTask,
					);

					queryClient.setQueryData(
						queryKeys.tasks.lists(),
						(old: TaskWithRelations[] = []) =>
							old.map((task) =>
								task.id === context.taskId ? context.previousTask : task,
							),
					);
				}
			},
			invalidateQueries: [queryKeys.tasks.all],
			enableRealTimeSync: true,
			syncTable: "tasks",
		},
	);
}

/**
 * Hook for deleting tasks with optimistic updates and real-time sync
 */
export function useDeleteTaskMutation() {
	const queryClient = useQueryClient();

	return useEnhancedMutation(
		async (taskId: string) => {
			const response = await fetch(`/api/tasks/${taskId}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error(`Failed to delete task: ${response.statusText}`);
			}

			return { id: taskId };
		},
		{
			optimisticUpdate: (taskId) => {
				const previousTask = queryClient.getQueryData(
					queryKeys.tasks.detail(taskId),
				) as TaskWithRelations;

				// Remove task from all caches
				queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId) });

				queryClient.setQueryData(
					queryKeys.tasks.lists(),
					(old: TaskWithRelations[] = []) =>
						old.filter((task) => task.id !== taskId),
				);

				return { previousTask, taskId };
			},
			rollbackUpdate: (context) => {
				if (context?.previousTask && context?.taskId) {
					// Restore deleted task
					queryClient.setQueryData(
						queryKeys.tasks.detail(context.taskId),
						context.previousTask,
					);

					queryClient.setQueryData(
						queryKeys.tasks.lists(),
						(old: TaskWithRelations[] = []) => [context.previousTask, ...old],
					);
				}
			},
			invalidateQueries: [queryKeys.tasks.all],
			enableRealTimeSync: true,
			syncTable: "tasks",
		},
	);
}

/**
 * Hook for bulk task operations with WASM optimization
 */
export function useBulkTaskMutation() {
	const queryClient = useQueryClient();

	return useEnhancedMutation(
		async ({
			taskIds,
			updates,
		}: {
			taskIds: string[];
			updates: Partial<Task>;
		}) => {
			const response = await fetch("/api/tasks/bulk", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ taskIds, updates }),
			});

			if (!response.ok) {
				throw new Error(`Failed to bulk update tasks: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data;
		},
		{
			optimisticUpdate: ({ taskIds, updates }) => {
				const previousTasks = taskIds
					.map(
						(id) =>
							queryClient.getQueryData(
								queryKeys.tasks.detail(id),
							) as TaskWithRelations,
					)
					.filter(Boolean);

				// Update all tasks in cache
				taskIds.forEach((taskId) => {
					queryClient.setQueryData(
						queryKeys.tasks.detail(taskId),
						(old: TaskWithRelations) =>
							old ? { ...old, ...updates, updatedAt: new Date() } : old,
					);
				});

				queryClient.setQueryData(
					queryKeys.tasks.lists(),
					(old: TaskWithRelations[] = []) =>
						old.map((task) =>
							taskIds.includes(task.id)
								? { ...task, ...updates, updatedAt: new Date() }
								: task,
						),
				);

				return { previousTasks, taskIds };
			},
			rollbackUpdate: (context) => {
				if (context?.previousTasks && context?.taskIds) {
					// Restore previous task data
					context.previousTasks.forEach((task, index) => {
						const taskId = context.taskIds[index];
						queryClient.setQueryData(queryKeys.tasks.detail(taskId), task);
					});

					queryClient.setQueryData(
						queryKeys.tasks.lists(),
						(old: TaskWithRelations[] = []) =>
							old.map((task) => {
								const previousTask = context.previousTasks.find(
									(pt) => pt.id === task.id,
								);
								return previousTask || task;
							}),
					);
				}
			},
			invalidateQueries: [queryKeys.tasks.all],
			enableWASMOptimization: true, // Bulk operations can benefit from WASM
			enableRealTimeSync: true,
			syncTable: "tasks",
		},
	);
}

/**
 * Hook for task analytics and statistics
 */
export function useTaskAnalyticsQuery(filters: TaskFilters = {}) {
	return useEnhancedQuery(
		[...queryKeys.tasks.all, "analytics", filters],
		async () => {
			const searchParams = new URLSearchParams();

			if (filters.userId) searchParams.append("userId", filters.userId);
			if (filters.dateRange) {
				searchParams.append("startDate", filters.dateRange.start.toISOString());
				searchParams.append("endDate", filters.dateRange.end.toISOString());
			}

			const response = await fetch(
				`/api/tasks/analytics?${searchParams.toString()}`,
			);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch task analytics: ${response.statusText}`,
				);
			}

			const result = await response.json();
			return result.data;
		},
		{
			staleTime: 5 * 60 * 1000, // 5 minutes for analytics
			enableWASMOptimization: true,
			enableRealTimeSync: true,
			syncTable: "tasks",
		},
	);
}

/**
 * Hook for task dependencies and relationships
 */
export function useTaskDependenciesQuery(taskId: string) {
	return useEnhancedQuery(
		[...queryKeys.tasks.detail(taskId), "dependencies"],
		async () => {
			const response = await fetch(`/api/tasks/${taskId}/dependencies`);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch task dependencies: ${response.statusText}`,
				);
			}

			const result = await response.json();
			return result.data;
		},
		{
			enabled: !!taskId,
			staleTime: 2 * 60 * 1000, // 2 minutes
			enableRealTimeSync: true,
			syncTable: "tasks",
		},
	);
}
