"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { NewTask, Task } from "@/db/schema";
import { invalidateQueries, mutationKeys, queryKeys } from "@/lib/query/config";
import { useElectricTasks } from "./use-electric-tasks";
import {
	useEnhancedInfiniteQuery,
	useEnhancedMutation,
	useEnhancedQuery,
	useVectorSearchQuery,
} from "./use-enhanced-query";

/**
 * Enhanced task queries with WASM optimization and ElectricSQL integration
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
}

export interface TaskSearchOptions {
	query: string;
	useSemanticSearch?: boolean;
	filters?: TaskFilters;
	limit?: number;
}

/**
 * Hook for querying a single task by ID
 */
export function useTaskQuery(taskId: string) {
	return useEnhancedQuery(
		queryKeys.task(taskId),
		async () => {
			const response = await fetch(`/api/tasks/${taskId}`);
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
		},
	);
}

/**
 * Hook for querying tasks with enhanced caching and WASM optimization
 */
export function useTasksQuery(filters: TaskFilters = {}) {
	const { userId, status, priority, search, dateRange } = filters;

	// Use ElectricSQL for real-time data
	const {
		tasks: electricTasks,
		loading: electricLoading,
		error: electricError,
	} = useElectricTasks(userId);

	// Enhanced query with WASM optimization for complex filtering
	const enhancedQuery = useEnhancedQuery(
		queryKeys.tasks.list(filters),
		async () => {
			// Apply client-side filtering with potential WASM optimization
			let filteredTasks = electricTasks;

			if (status?.length) {
				filteredTasks = filteredTasks.filter((task) =>
					status.includes(task.status),
				);
			}

			if (priority?.length) {
				filteredTasks = filteredTasks.filter((task) =>
					priority.includes(task.priority),
				);
			}

			if (search) {
				const searchLower = search.toLowerCase();
				filteredTasks = filteredTasks.filter(
					(task) =>
						task.title.toLowerCase().includes(searchLower) ||
						task.description?.toLowerCase().includes(searchLower),
				);
			}

			if (dateRange) {
				filteredTasks = filteredTasks.filter((task) => {
					const taskDate = new Date(task.createdAt);
					return taskDate >= dateRange.start && taskDate <= dateRange.end;
				});
			}

			return filteredTasks;
		},
		{
			enabled: !(electricLoading || electricError),
			enableWASMOptimization: true,
			staleWhileRevalidate: true,
			wasmFallback: async () => {
				// Fallback to simple filtering without WASM optimization
				return electricTasks.filter((task) => {
					if (status?.length && !status.includes(task.status)) return false;
					if (priority?.length && !priority.includes(task.priority))
						return false;
					if (search) {
						const searchLower = search.toLowerCase();
						if (
							!(
								task.title.toLowerCase().includes(searchLower) ||
								task.description?.toLowerCase().includes(searchLower)
							)
						) {
							return false;
						}
					}
					return true;
				});
			},
		},
	);

	// Combine ElectricSQL real-time data with enhanced filtering
	const tasks = enhancedQuery.data || electricTasks;
	const loading = electricLoading || enhancedQuery.isLoading;
	const error = electricError || enhancedQuery.error;

	return {
		tasks,
		loading,
		error,
		refetch: enhancedQuery.refetch,
		isStale: enhancedQuery.isStale,
		isFetching: enhancedQuery.isFetching,
	};
}

/**
 * Hook for infinite task queries with virtualization support
 */
export function useInfiniteTasksQuery(
	filters: TaskFilters = {},
	pageSize = 50,
) {
	const queryClient = useQueryClient();

	return useEnhancedInfiniteQuery(
		queryKeys.tasks.infinite(filters),
		async ({ pageParam = 0 }) => {
			// This would typically fetch from a paginated API
			// For now, we'll simulate pagination with the ElectricSQL data
			const allTasks =
				(queryClient.getQueryData(queryKeys.tasks.list(filters)) as Task[]) ||
				[];

			const start = (pageParam as number) * pageSize;
			const end = start + pageSize;
			const paginatedTasks = allTasks.slice(start, end);

			return {
				tasks: paginatedTasks,
				nextCursor:
					end < allTasks.length ? (pageParam as number) + 1 : undefined,
				hasMore: end < allTasks.length,
				total: allTasks.length,
			};
		},
		{
			initialPageParam: 0,
			getNextPageParam: (lastPage) => lastPage.nextCursor,
			enableVirtualization: true,
			enableWASMOptimization: true,
			staleTime: 2 * 60 * 1000, // 2 minutes
		},
	);
}

/**
 * Hook for semantic task search using WASM vector search
 */
export function useTaskSearchQuery(options: TaskSearchOptions) {
	const { query, useSemanticSearch = false, filters, limit = 20 } = options;

	// Use vector search if semantic search is enabled and query is substantial
	const shouldUseVectorSearch = useSemanticSearch && query.length > 10;

	const vectorSearchQuery = useVectorSearchQuery<Task>(query, {
		enabled: shouldUseVectorSearch,
		filters,
		limit,
		threshold: 0.7,
	});

	// Fallback to regular text search
	const textSearchQuery = useEnhancedQuery(
		queryKeys.tasks.search(query),
		async () => {
			// This would typically be a database text search
			// For now, we'll use the tasks from the main query
			const allTasks =
				((await queryClient.getQueryData(
					queryKeys.tasks.list(filters || {}),
				)) as Task[]) || [];

			if (!query.trim()) return [];

			const searchLower = query.toLowerCase();
			return allTasks
				.filter(
					(task) =>
						task.title.toLowerCase().includes(searchLower) ||
						task.description?.toLowerCase().includes(searchLower),
				)
				.slice(0, limit);
		},
		{
			enabled: !shouldUseVectorSearch && query.length > 0,
			enableWASMOptimization: true,
			staleTime: 30 * 1000, // 30 seconds for search results
		},
	);

	const queryClient = useQueryClient();

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
 * Hook for task detail query
 */

/**
 * Hook for creating tasks with optimistic updates
 */
export function useCreateTaskMutation() {
	const queryClient = useQueryClient();
	const { createTask } = useElectricTasks();

	return useEnhancedMutation(
		async (newTask: Omit<NewTask, "id" | "createdAt" | "updatedAt">) => {
			return await createTask(newTask);
		},
		{
			optimisticUpdate: (variables) => {
				// Create optimistic task
				const optimisticTask: Task = {
					id: `temp-${Date.now()}`,
					...variables,
					createdAt: new Date(),
					updatedAt: new Date(),
				} as Task;

				// Add to all relevant caches
				queryClient.setQueryData(
					queryKeys.tasks.lists(),
					(old: Task[] = []) => [optimisticTask, ...old],
				);

				return { optimisticTask };
			},
			rollbackUpdate: (context) => {
				if (context?.optimisticTask) {
					// Remove optimistic task from cache
					queryClient.setQueryData(
						queryKeys.tasks.lists(),
						(old: Task[] = []) =>
							old.filter((task) => task.id !== context.optimisticTask.id),
					);
				}
			},
			invalidateQueries: [queryKeys.tasks.all],
			enableWASMOptimization: false, // Mutations don't typically need WASM optimization
		},
	);
}

/**
 * Hook for updating tasks with optimistic updates
 */
export function useUpdateTaskMutation() {
	const queryClient = useQueryClient();
	const { updateTask } = useElectricTasks();

	return useEnhancedMutation(
		async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
			return await updateTask(taskId, updates);
		},
		{
			optimisticUpdate: ({ taskId, updates }) => {
				const previousTask = queryClient.getQueryData(
					queryKeys.tasks.detail(taskId),
				) as Task;

				// Update task in all relevant caches
				queryClient.setQueryData(queryKeys.tasks.detail(taskId), (old: Task) =>
					old ? { ...old, ...updates, updatedAt: new Date() } : old,
				);

				queryClient.setQueryData(queryKeys.tasks.lists(), (old: Task[] = []) =>
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
						(old: Task[] = []) =>
							old.map((task) =>
								task.id === context.taskId ? context.previousTask : task,
							),
					);
				}
			},
			invalidateQueries: [queryKeys.tasks.all],
		},
	);
}

/**
 * Hook for deleting tasks with optimistic updates
 */
export function useDeleteTaskMutation() {
	const queryClient = useQueryClient();
	const { deleteTask } = useElectricTasks();

	return useEnhancedMutation(
		async (taskId: string) => {
			return await deleteTask(taskId);
		},
		{
			optimisticUpdate: (taskId) => {
				const previousTask = queryClient.getQueryData(
					queryKeys.tasks.detail(taskId),
				) as Task;

				// Remove task from all caches
				queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId) });

				queryClient.setQueryData(queryKeys.tasks.lists(), (old: Task[] = []) =>
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
						(old: Task[] = []) => [context.previousTask, ...old],
					);
				}
			},
			invalidateQueries: [queryKeys.tasks.all],
		},
	);
}

/**
 * Hook for bulk task operations
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
			// This would typically be a bulk API call
			// For now, we'll simulate it
			console.log("Bulk updating tasks:", taskIds, updates);
			return { updatedCount: taskIds.length };
		},
		{
			optimisticUpdate: ({ taskIds, updates }) => {
				const previousTasks = taskIds
					.map(
						(id) =>
							queryClient.getQueryData(queryKeys.tasks.detail(id)) as Task,
					)
					.filter(Boolean);

				// Update all tasks in cache
				taskIds.forEach((taskId) => {
					queryClient.setQueryData(
						queryKeys.tasks.detail(taskId),
						(old: Task) =>
							old ? { ...old, ...updates, updatedAt: new Date() } : old,
					);
				});

				queryClient.setQueryData(queryKeys.tasks.lists(), (old: Task[] = []) =>
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
						(old: Task[] = []) =>
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
		},
	);
}
