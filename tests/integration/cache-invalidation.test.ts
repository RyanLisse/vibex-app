/**
 * Cache Invalidation Tests
 *
 * Tests to verify that cache invalidation happens correctly for different
 * scenarios and query patterns
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@/db/schema";
	taskKeys,
	useCreateTask,
	useDeleteTask,
	useTask,
	useTasks,
	useUpdateTask,
} from "@/lib/query/hooks";

// Mock fetch
global.fetch = vi.fn();

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
				staleTime: 0,
			},
			mutations: {
				retry: false,
			},
		},
	});

	return ({ children }: { children: React.ReactNode }) =>
		React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("Cache Invalidation", () => {
	let mockFetch: ReturnType<typeof vi.fn>;
	let queryClient: QueryClient;

	beforeEach(() => {
		mockFetch = vi.mocked(fetch);
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false, gcTime: 0, staleTime: 0 },
				mutations: { retry: false },
			},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		queryClient.clear();
	});

	describe("Task List Invalidation", () => {
		it("should invalidate task lists after creating a task", async () => {
			const wrapper = createWrapper();

			// Mock initial tasks fetch
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						tasks: [{ id: "1", title: "Existing Task" }],
						total: 1,
						hasMore: false,
					}),
			} as Response);

			const { result } = renderHook(
				() => {
					const tasksQuery = useTasks();
					const createMutation = useCreateTask();
					return { tasksQuery, createMutation };
				},
				{ wrapper },
			);

			// Wait for initial data
			await waitFor(() => {
				expect(result.current.tasksQuery.data?.tasks).toHaveLength(1);
			});

			// Mock create task response
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						id: "2",
						title: "New Task",
						status: "pending",
					}),
			} as Response);

			// Mock refetch after invalidation
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						tasks: [
							{ id: "1", title: "Existing Task" },
							{ id: "2", title: "New Task" },
						],
						total: 2,
						hasMore: false,
					}),
			} as Response);

			// Create new task
			act(() => {
				result.current.createMutation.mutate({
					title: "New Task",
					status: "pending",
					priority: "medium",
				});
			});

			// Wait for mutation to complete and cache to invalidate
			await waitFor(() => {
				expect(result.current.createMutation.isSuccess).toBe(true);
			});

			// Should have refetched the tasks list
			await waitFor(() => {
				expect(result.current.tasksQuery.data?.tasks).toHaveLength(2);
			});

			// Verify the correct API calls were made
			expect(mockFetch).toHaveBeenCalledTimes(3); // Initial fetch, create, refetch
		});

		it("should invalidate specific task queries after update", async () => {
			const wrapper = createWrapper();

			// Setup initial data for both list and individual task
			const taskData = { id: "1", title: "Original Title", status: "pending" };

			queryClient.setQueryData(taskKeys.list({}), {
				tasks: [taskData],
				total: 1,
				hasMore: false,
			});

			queryClient.setQueryData(taskKeys.detail("1"), taskData);

			const { result } = renderHook(
				() => {
					const tasksQuery = useTasks();
					const taskQuery = useTask("1");
					const updateMutation = useUpdateTask();
					return { tasksQuery, taskQuery, updateMutation };
				},
				{ wrapper },
			);

			// Mock update response
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						id: "1",
						title: "Updated Title",
						status: "pending",
					}),
			} as Response);

			// Update task
			act(() => {
				result.current.updateMutation.mutate({
					id: "1",
					title: "Updated Title",
				});
			});

			// Wait for mutation to complete
			await waitFor(() => {
				expect(result.current.updateMutation.isSuccess).toBe(true);
			});

			// Both queries should reflect the update
			expect(result.current.taskQuery.data?.title).toBe("Updated Title");
			expect(result.current.tasksQuery.data?.tasks[0].title).toBe(
				"Updated Title",
			);
		});

		it("should remove task from cache after deletion", async () => {
			const wrapper = createWrapper();

			const initialTasks = [
				{ id: "1", title: "Task to Delete" },
				{ id: "2", title: "Task to Keep" },
			] as Task[];

			queryClient.setQueryData(taskKeys.list({}), {
				tasks: initialTasks,
				total: 2,
				hasMore: false,
			});

			const { result } = renderHook(
				() => {
					const tasksQuery = useTasks();
					const deleteMutation = useDeleteTask();
					return { tasksQuery, deleteMutation };
				},
				{ wrapper },
			);

			// Mock delete response
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			} as Response);

			// Delete task
			act(() => {
				result.current.deleteMutation.mutate("1");
			});

			// Wait for mutation to complete
			await waitFor(() => {
				expect(result.current.deleteMutation.isSuccess).toBe(true);
			});

			// Task should be removed from cache
			expect(result.current.tasksQuery.data?.tasks).toHaveLength(1);
			expect(result.current.tasksQuery.data?.tasks[0].id).toBe("2");

			// Individual task query should also be removed
			expect(queryClient.getQueryData(taskKeys.detail("1"))).toBeUndefined();
		});
	});

	describe("Selective Invalidation", () => {
		it("should only invalidate relevant query keys", async () => {
			const wrapper = createWrapper();

			// Setup multiple different queries
			queryClient.setQueryData(taskKeys.list({}), {
				tasks: [{ id: "1", title: "Task 1" }],
				total: 1,
				hasMore: false,
			});

			queryClient.setQueryData(taskKeys.list({ status: "completed" }), {
				tasks: [{ id: "2", title: "Completed Task" }],
				total: 1,
				hasMore: false,
			});

			queryClient.setQueryData(["environments", "list"], {
				environments: [{ id: "env1", name: "Environment 1" }],
			});

			const { result } = renderHook(
				() => {
					const allTasksQuery = useTasks();
					const completedTasksQuery = useTasks({ status: "completed" });
					const createMutation = useCreateTask();
					return { allTasksQuery, completedTasksQuery, createMutation };
				},
				{ wrapper },
			);

			// Mock create response
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						id: "3",
						title: "New Task",
						status: "pending",
					}),
			} as Response);

			// Create new task
			act(() => {
				result.current.createMutation.mutate({
					title: "New Task",
					status: "pending",
					priority: "medium",
				});
			});

			await waitFor(() => {
				expect(result.current.createMutation.isSuccess).toBe(true);
			});

			// Task queries should be invalidated, but environment queries should not
			expect(queryClient.getQueryState(taskKeys.list({}))?.isInvalidated).toBe(
				true,
			);
			expect(
				queryClient.getQueryState(taskKeys.list({ status: "completed" }))
					?.isInvalidated,
			).toBe(true);
			expect(
				queryClient.getQueryState(["environments", "list"])?.isInvalidated,
			).toBeFalsy();
		});

		it("should handle query key patterns correctly", async () => {
			const wrapper = createWrapper();

			// Setup queries with different filters
			const queries = [
				{ key: taskKeys.list({}), data: { tasks: [], total: 0 } },
				{
					key: taskKeys.list({ status: "pending" }),
					data: { tasks: [], total: 0 },
				},
				{
					key: taskKeys.list({ status: "completed" }),
					data: { tasks: [], total: 0 },
				},
				{ key: taskKeys.detail("1"), data: { id: "1", title: "Task 1" } },
				{ key: taskKeys.detail("2"), data: { id: "2", title: "Task 2" } },
			];

			queries.forEach(({ key, data }) => {
				queryClient.setQueryData(key, data);
			});

			const { result } = renderHook(
				() => {
					const updateMutation = useUpdateTask();
					return { updateMutation };
				},
				{ wrapper },
			);

			// Mock update response
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						id: "1",
						title: "Updated Task 1",
						status: "completed",
					}),
			} as Response);

			// Update task
			act(() => {
				result.current.updateMutation.mutate({
					id: "1",
					title: "Updated Task 1",
					status: "completed",
				});
			});

			await waitFor(() => {
				expect(result.current.updateMutation.isSuccess).toBe(true);
			});

			// All task list queries should be invalidated
			expect(queryClient.getQueryState(taskKeys.list({}))?.isInvalidated).toBe(
				true,
			);
			expect(
				queryClient.getQueryState(taskKeys.list({ status: "pending" }))
					?.isInvalidated,
			).toBe(true);
			expect(
				queryClient.getQueryState(taskKeys.list({ status: "completed" }))
					?.isInvalidated,
			).toBe(true);

			// The specific task should be updated in cache
			expect(queryClient.getQueryData(taskKeys.detail("1"))).toMatchObject({
				id: "1",
				title: "Updated Task 1",
				status: "completed",
			});
		});
	});

	describe("Background Refetching", () => {
		it("should refetch stale queries in background", async () => {
			const wrapper = createWrapper();

			// Mock initial fetch
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						tasks: [{ id: "1", title: "Initial Task" }],
						total: 1,
						hasMore: false,
					}),
			} as Response);

			const { result } = renderHook(() => useTasks(), { wrapper });

			// Wait for initial data
			await waitFor(() => {
				expect(result.current.data?.tasks).toHaveLength(1);
			});

			// Mark query as stale
			queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

			// Mock background refetch
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						tasks: [
							{ id: "1", title: "Initial Task" },
							{ id: "2", title: "Background Task" },
						],
						total: 2,
						hasMore: false,
					}),
			} as Response);

			// Should trigger background refetch
			await waitFor(() => {
				expect(result.current.data?.tasks).toHaveLength(2);
			});

			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe("Error Handling in Cache Operations", () => {
		it("should handle cache update errors gracefully", async () => {
			const wrapper = createWrapper();

			const initialTasks = [{ id: "1", title: "Task 1" }] as Task[];

			queryClient.setQueryData(taskKeys.list({}), {
				tasks: initialTasks,
				total: 1,
				hasMore: false,
			});

			const { result } = renderHook(
				() => {
					const updateMutation = useUpdateTask();
					return { updateMutation };
				},
				{ wrapper },
			);

			// Mock server error
			mockFetch.mockRejectedValueOnce(new Error("Server error"));

			// Update task (should fail)
			act(() => {
				result.current.updateMutation.mutate({
					id: "1",
					title: "Failed Update",
				});
			});

			await waitFor(() => {
				expect(result.current.updateMutation.isError).toBe(true);
			});

			// Cache should be restored to original state
			const cachedData = queryClient.getQueryData(taskKeys.list({})) as any;
			expect(cachedData.tasks[0].title).toBe("Task 1");
		});
	});
});
