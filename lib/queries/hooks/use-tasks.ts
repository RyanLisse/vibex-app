/**
 * TanStack Query hooks for task operations with ElectricSQL integration
 */

import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import React from "react";
import type { NewTask, Task } from "@/db/schema";
import { observability } from "@/lib/observability";
import { electricQueryBridge } from "@/lib/query/electric-bridge";
import { mutationKeys, queryKeys } from "../config";

// API functions (these would integrate with your actual API)
const taskApi = {
	async getTasks(filters?: {
		status?: string;
		priority?: string;
		userId?: string;
		limit?: number;
		offset?: number;
	}): Promise<{ tasks: Task[]; total: number }> {
		// This would call your actual API endpoint
		const params = new URLSearchParams();
		if (filters?.status) params.append("status", filters.status);
		if (filters?.priority) params.append("priority", filters.priority);
		if (filters?.userId) params.append("userId", filters.userId);
		if (filters?.limit) params.append("limit", filters.limit.toString());
		if (filters?.offset) params.append("offset", filters.offset.toString());

		const response = await fetch(`/api/tasks?${params}`);
		if (!response.ok) {
			throw new Error("Failed to fetch tasks");
		}
		return response.json();
	},

	async getTask(id: string): Promise<Task> {
		const response = await fetch(`/api/tasks/${id}`);
		if (!response.ok) {
			throw new Error("Failed to fetch task");
		}
		return response.json();
	},

	async createTask(data: NewTask): Promise<Task> {
		const response = await fetch("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		if (!response.ok) {
			throw new Error("Failed to create task");
		}
		return response.json();
	},

	async updateTask(id: string, data: Partial<Task>): Promise<Task> {
		const response = await fetch(`/api/tasks/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		if (!response.ok) {
			throw new Error("Failed to update task");
		}
		return response.json();
	},

	async deleteTask(id: string): Promise<void> {
		const response = await fetch(`/api/tasks/${id}`, {
			method: "DELETE",
		});
		if (!response.ok) {
			throw new Error("Failed to delete task");
		}
	},
};

/**
 * Hook to fetch tasks with filters
 */
export function useTasks(filters?: {
	status?: string;
	priority?: string;
	userId?: string;
}) {
	return useQuery({
		queryKey: queryKeys.tasks.list(filters || {}),
		queryFn: () => taskApi.getTasks(filters),
		staleTime: 30000, // 30 seconds
		select: (data) => data.tasks,
	});
}

/**
 * Hook to fetch a single task
 */
export function useTask(id: string) {
	return useQuery({
		queryKey: queryKeys.tasks.detail(id),
		queryFn: () => taskApi.getTask(id),
		enabled: !!id,
		staleTime: 60000, // 1 minute
	});
}

/**
 * Hook to fetch tasks with infinite scrolling
 */
export function useInfiniteTasks(filters?: {
	status?: string;
	priority?: string;
	userId?: string;
}) {
	return useInfiniteQuery({
		queryKey: queryKeys.tasks.infinite(filters || {}),
		queryFn: ({ pageParam = 0 }) =>
			taskApi.getTasks({
				...filters,
				limit: 20,
				offset: pageParam * 20,
			}),
		getNextPageParam: (lastPage, allPages) => {
			const totalFetched = allPages.length * 20;
			return totalFetched < lastPage.total ? allPages.length : undefined;
		},
		initialPageParam: 0,
	});
}

/**
 * Hook to create a new task with optimistic updates
 */
export function useCreateTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: mutationKeys.tasks.create,
		mutationFn: (data: NewTask) => {
			return observability.trackOperation("tasks.create", () =>
				taskApi.createTask(data),
			);
		},
		onMutate: async (newTask) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });

			// Snapshot previous value
			const previousTasks = queryClient.getQueryData(queryKeys.tasks.lists());

			// Optimistically update
			const tempId = `temp-${Date.now()}`;
			const optimisticTask: Task = {
				id: tempId,
				title: newTask.title,
				description: newTask.description || null,
				status: newTask.status || "pending",
				priority: newTask.priority || "medium",
				createdAt: new Date(),
				updatedAt: new Date(),
				userId: newTask.userId || null,
				metadata: newTask.metadata || null,
				embedding: null,
			};

			// Update all relevant queries
			queryClient.setQueriesData(
				{ queryKey: queryKeys.tasks.lists() },
				(old: any) => {
					if (!old) return { tasks: [optimisticTask], total: 1 };
					return {
						tasks: [optimisticTask, ...old.tasks],
						total: old.total + 1,
					};
				},
			);

			return { previousTasks, tempId };
		},
		onSuccess: (newTask, variables, context) => {
			// Replace optimistic update with real data
			queryClient.setQueriesData(
				{ queryKey: queryKeys.tasks.lists() },
				(old: any) => {
					if (!old) return old;
					return {
						...old,
						tasks: old.tasks.map((task: Task) =>
							task.id === context?.tempId ? newTask : task,
						),
					};
				},
			);

			// Invalidate to ensure consistency
			queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
		},
		onError: (error, variables, context) => {
			// Rollback optimistic update
			if (context?.previousTasks) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.tasks.lists() },
					context.previousTasks,
				);
			}
			console.error("Failed to create task:", error);
		},
	});
}

/**
 * Hook to update a task with optimistic updates
 */
export function useUpdateTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: mutationKeys.tasks.update(""),
		mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => {
			return observability.trackOperation("tasks.update", () =>
				taskApi.updateTask(id, data),
			);
		},
		onMutate: async ({ id, data }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) });

			// Snapshot previous values
			const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(id));
			const previousTasks = queryClient.getQueryData(queryKeys.tasks.lists());

			// Optimistically update
			const updatedTask = {
				...previousTask,
				...data,
				updatedAt: new Date(),
			} as Task;

			queryClient.setQueryData(queryKeys.tasks.detail(id), updatedTask);
			queryClient.setQueriesData(
				{ queryKey: queryKeys.tasks.lists() },
				(old: any) => {
					if (!old) return old;
					return {
						...old,
						tasks: old.tasks.map((task: Task) =>
							task.id === id ? updatedTask : task,
						),
					};
				},
			);

			return { previousTask, previousTasks };
		},
		onError: (error, { id }, context) => {
			// Rollback optimistic updates
			if (context?.previousTask) {
				queryClient.setQueryData(
					queryKeys.tasks.detail(id),
					context.previousTask,
				);
			}
			if (context?.previousTasks) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.tasks.lists() },
					context.previousTasks,
				);
			}
			console.error("Failed to update task:", error);
		},
		onSettled: (data, error, { id }) => {
			// Always refetch after error or success
			queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) });
			queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
		},
	});
}

/**
 * Hook to delete a task
 */
export function useDeleteTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: mutationKeys.tasks.delete(""),
		mutationFn: (id: string) => {
			return observability.trackOperation("tasks.delete", () =>
				taskApi.deleteTask(id),
			);
		},
		onMutate: async (id) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });

			// Snapshot previous values
			const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(id));
			const previousTasks = queryClient.getQueryData(queryKeys.tasks.lists());

			// Optimistically remove
			queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(id) });
			queryClient.setQueriesData(
				{ queryKey: queryKeys.tasks.lists() },
				(old: any) => {
					if (!old) return old;
					return {
						...old,
						tasks: old.tasks.filter((task: Task) => task.id !== id),
						total: old.total - 1,
					};
				},
			);

			return { previousTask, previousTasks };
		},
		onError: (error, id, context) => {
			// Rollback optimistic updates
			if (context?.previousTask) {
				queryClient.setQueryData(
					queryKeys.tasks.detail(id),
					context.previousTask,
				);
			}
			if (context?.previousTasks) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.tasks.lists() },
					context.previousTasks,
				);
			}
			console.error("Failed to delete task:", error);
		},
		onSettled: () => {
			// Invalidate to ensure consistency
			queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
		},
	});
}

/**
 * Hook to subscribe to real-time task updates
 */
export function useTasksSubscription(
	filters?: { status?: string; priority?: string },
	callback?: (tasks: Task[]) => void,
) {
	const queryClient = useQueryClient();

	// Set up real-time subscription
	React.useEffect(() => {
		const unsubscribe = electricQueryBridge.subscribeToTable(
			"tasks",
			(updatedTasks: Task[]) => {
				// Update cache with real-time data
				queryClient.setQueriesData(
					{ queryKey: queryKeys.tasks.lists() },
					(old: any) => {
						if (!old)
							return { tasks: updatedTasks, total: updatedTasks.length };

						// Merge updated tasks with existing data
						const taskMap = new Map(old.tasks.map((t: Task) => [t.id, t]));
						updatedTasks.forEach((task) => taskMap.set(task.id, task));

						return {
							tasks: Array.from(taskMap.values()),
							total: taskMap.size,
						};
					},
				);

				// Call user callback
				if (callback) {
					callback(updatedTasks);
				}
			},
		);

		return unsubscribe;
	}, [queryClient, callback]);
}

/**
 * Hook to prefetch a task
 */
export function usePrefetchTask() {
	const queryClient = useQueryClient();

	return (id: string) => {
		queryClient.prefetchQuery({
			queryKey: queryKeys.tasks.detail(id),
			queryFn: () => taskApi.getTask(id),
			staleTime: 60000,
		});
	};
}

/**
 * Utility function to prefetch task (for use outside components)
 */
export function prefetchTask(queryClient: any, id: string) {
	return queryClient.prefetchQuery({
		queryKey: queryKeys.tasks.detail(id),
		queryFn: () => taskApi.getTask(id),
		staleTime: 60000,
	});
}
