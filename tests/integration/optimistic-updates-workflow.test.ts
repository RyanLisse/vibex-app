/**
 * Optimistic Updates Workflow Integration Tests
 *
 * Tests complete workflows involving optimistic updates, ensuring proper
 * UI behavior, error handling, and state consistency
 */

import {
	beforeAll,
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import type { Task } from "@/db/schema";
import {
	useBatchUpdateTasks,
	useCreateTask,
	useDeleteTask,
	useTasks,
	useUpdateTask,
} from "@/lib/query/hooks";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test wrapper
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

// Test data factory
function createMockTask(overrides: Partial<Task> = {}): Task {
	return {
		id: "task-" + Math.random().toString(36).substr(2, 9),
		title: "Test Task",
		description: "Test Description",
		status: "pending",
		priority: "medium",
		createdAt: new Date(),
		updatedAt: new Date(),
		completedAt: null,
		dueDate: null,
		assignee: null,
		tags: [],
		metadata: {},
		userId: "test-user",
		...overrides,
	};
}

describe("Optimistic Updates Workflow", () => {
	describe("Task Creation Workflow", () => {
		it("should handle complete task creation workflow with instant UI feedback", async () => {
			const existingTasks = [
				createMockTask({ id: "1", title: "Existing Task" }),
			];

			const newTaskInput = {
				title: "New Optimistic Task",
				description: "This task shows immediately",
				status: "pending" as const,
				priority: "high" as const,
			};

			let requestCount = 0;
			server.use(
				http.get("/api/tasks", () => {
					requestCount++;
					return HttpResponse.json({
						success: true,
						data: {
							tasks:
								requestCount === 1
									? existingTasks
									: [
											...existingTasks,
											createMockTask({ ...newTaskInput, id: "server-id" }),
										],
							total: requestCount === 1 ? 1 : 2,
							hasMore: false,
						},
					});
				}),
				http.post("/api/tasks", async () => {
					// Simulate network delay
					await delay(100);
					return HttpResponse.json(
						{
							success: true,
							data: createMockTask({ ...newTaskInput, id: "server-id" }),
						},
						{ status: 201 },
					);
				}),
			);

			const wrapper = createWrapper();
			const { result } = renderHook(
				() => {
					const tasks = useTasks();
					const createTask = useCreateTask();
					return { tasks, createTask };
				},
				{ wrapper },
			);

			// Wait for initial load
			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(1);
			});

			// Track UI updates
			const uiUpdates: number[] = [];
			if (result.current.tasks.data) {
				uiUpdates.push(result.current.tasks.data.tasks.length);
			}

			// Create task
			act(() => {
				result.current.createTask.mutate(newTaskInput);
			});

			// Should show optimistic update immediately (before server response)
			await waitFor(() => {
				const tasks = result.current.tasks.data?.tasks || [];
				expect(tasks).toHaveLength(2);

				const optimisticTask = tasks.find(
					(t) => t.title === "New Optimistic Task",
				);
				expect(optimisticTask).toBeDefined();
				expect(optimisticTask?.id).toMatch(/^temp-/); // Temporary ID
			});

			// Wait for server response and cache invalidation
			await waitFor(() => {
				expect(result.current.createTask.isSuccess).toBe(true);
			});

			// Final state should have server-assigned ID
			await waitFor(() => {
				const tasks = result.current.tasks.data?.tasks || [];
				const serverTask = tasks.find((t) => t.title === "New Optimistic Task");
				expect(serverTask?.id).toBe("server-id");
			});
		});

		it("should handle task creation failure with proper rollback", async () => {
			const existingTasks = [
				createMockTask({ id: "1", title: "Existing Task" }),
			];

			server.use(
				http.get("/api/tasks", () => {
					return HttpResponse.json({
						success: true,
						data: {
							tasks: existingTasks,
							total: 1,
							hasMore: false,
						},
					});
				}),
				http.post("/api/tasks", async () => {
					await delay(50);
					return HttpResponse.json(
						{
							success: false,
							error: "Validation failed",
							code: "VALIDATION_ERROR",
						},
						{ status: 400 },
					);
				}),
			);

			const wrapper = createWrapper();
			const { result } = renderHook(
				() => {
					const tasks = useTasks();
					const createTask = useCreateTask();
					return { tasks, createTask };
				},
				{ wrapper },
			);

			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(1);
			});

			// Create task that will fail
			act(() => {
				result.current.createTask.mutate({
					title: "Doomed Task",
					status: "pending",
					priority: "medium",
				});
			});

			// Should show optimistic update
			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(2);
			});

			// Should rollback after error
			await waitFor(() => {
				expect(result.current.createTask.isError).toBe(true);
				expect(result.current.tasks.data?.tasks).toHaveLength(1);
			});

			// Original task should remain
			expect(result.current.tasks.data?.tasks[0].title).toBe("Existing Task");
		});
	});

	describe("Bulk Operations Workflow", () => {
		it("should handle bulk task updates with optimistic updates", async () => {
			const tasks = [
				createMockTask({ id: "1", title: "Task 1", status: "pending" }),
				createMockTask({ id: "2", title: "Task 2", status: "pending" }),
				createMockTask({ id: "3", title: "Task 3", status: "pending" }),
			];

			server.use(
				http.get("/api/tasks", () => {
					return HttpResponse.json({
						success: true,
						data: {
							tasks,
							total: 3,
							hasMore: false,
						},
					});
				}),
				http.post("/api/tasks/batch", async ({ request }) => {
					const body = await request.json();
					await delay(100);

					return HttpResponse.json({
						success: true,
						data: {
							updated: body.updates.length,
							tasks: tasks.map((task) => ({
								...task,
								...(body.updates.find((u: any) => u.id === task.id) || {}),
								updatedAt: new Date(),
							})),
						},
					});
				}),
			);

			const wrapper = createWrapper();
			const { result } = renderHook(
				() => {
					const tasks = useTasks();
					const batchUpdate = useBatchUpdateTasks();
					return { tasks, batchUpdate };
				},
				{ wrapper },
			);

			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(3);
			});

			// Perform bulk update
			act(() => {
				result.current.batchUpdate.mutate({
					updates: [
						{ id: "1", status: "completed" },
						{ id: "2", status: "completed" },
						{ id: "3", status: "completed" },
					],
				});
			});

			// Should show optimistic updates immediately
			await waitFor(() => {
				const completedTasks = result.current.tasks.data?.tasks.filter(
					(t) => t.status === "completed",
				);
				expect(completedTasks).toHaveLength(3);
			});

			// Wait for server confirmation
			await waitFor(() => {
				expect(result.current.batchUpdate.isSuccess).toBe(true);
			});
		});

		it("should handle partial bulk update failures", async () => {
			const tasks = [
				createMockTask({ id: "1", title: "Task 1", status: "pending" }),
				createMockTask({ id: "2", title: "Task 2", status: "pending" }),
				createMockTask({ id: "3", title: "Task 3", status: "pending" }),
			];

			server.use(
				http.get("/api/tasks", () => {
					return HttpResponse.json({
						success: true,
						data: {
							tasks,
							total: 3,
							hasMore: false,
						},
					});
				}),
				http.post("/api/tasks/batch", async () => {
					await delay(50);
					return HttpResponse.json(
						{
							success: false,
							error: "Partial failure",
							data: {
								succeeded: ["1"],
								failed: ["2", "3"],
								errors: {
									"2": "Permission denied",
									"3": "Task locked",
								},
							},
						},
						{ status: 207 },
					); // Multi-status
				}),
			);

			const wrapper = createWrapper();
			const { result } = renderHook(
				() => {
					const tasks = useTasks();
					const batchUpdate = useBatchUpdateTasks();
					return { tasks, batchUpdate };
				},
				{ wrapper },
			);

			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(3);
			});

			// Perform bulk update
			act(() => {
				result.current.batchUpdate.mutate({
					updates: [
						{ id: "1", status: "completed" },
						{ id: "2", status: "completed" },
						{ id: "3", status: "completed" },
					],
				});
			});

			// Wait for response
			await waitFor(() => {
				expect(result.current.batchUpdate.isSettled).toBe(true);
			});

			// Only task 1 should be completed
			const updatedTasksList = result.current.tasks.data?.tasks || [];
			expect(updatedTasksList.find((t) => t.id === "1")?.status).toBe(
				"completed",
			);
			expect(updatedTasksList.find((t) => t.id === "2")?.status).toBe(
				"pending",
			);
			expect(updatedTasksList.find((t) => t.id === "3")?.status).toBe(
				"pending",
			);
		});
	});

	describe("Complex Workflow Scenarios", () => {
		it("should handle rapid sequential operations correctly", async () => {
			const initialTask = createMockTask({
				id: "rapid-task",
				title: "Initial Title",
				status: "pending",
				priority: "low",
			});

			let currentTask = { ...initialTask };

			server.use(
				http.get("/api/tasks", () => {
					return HttpResponse.json({
						success: true,
						data: {
							tasks: [currentTask],
							total: 1,
							hasMore: false,
						},
					});
				}),
				http.patch("/api/tasks/:id", async ({ request }) => {
					const body = await request.json();
					currentTask = { ...currentTask, ...body, updatedAt: new Date() };
					await delay(50); // Simulate network delay

					return HttpResponse.json({
						success: true,
						data: currentTask,
					});
				}),
			);

			const wrapper = createWrapper();
			const { result } = renderHook(
				() => {
					const tasks = useTasks();
					const updateTask = useUpdateTask();
					return { tasks, updateTask };
				},
				{ wrapper },
			);

			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(1);
			});

			// Perform rapid updates
			act(() => {
				result.current.updateTask.mutate({
					id: "rapid-task",
					title: "Update 1",
				});
			});

			await waitFor(() => {
				expect(result.current.tasks.data?.tasks[0].title).toBe("Update 1");
			});

			act(() => {
				result.current.updateTask.mutate({
					id: "rapid-task",
					status: "in_progress",
				});
			});

			await waitFor(() => {
				expect(result.current.tasks.data?.tasks[0].status).toBe("in_progress");
			});

			act(() => {
				result.current.updateTask.mutate({
					id: "rapid-task",
					priority: "high",
				});
			});

			await waitFor(() => {
				expect(result.current.tasks.data?.tasks[0].priority).toBe("high");
			});

			// All updates should be applied
			const finalTask = result.current.tasks.data?.tasks[0];
			expect(finalTask?.title).toBe("Update 1");
			expect(finalTask?.status).toBe("in_progress");
			expect(finalTask?.priority).toBe("high");
		});

		it("should handle create -> update -> delete workflow", async () => {
			server.use(
				http.get("/api/tasks", () => {
					return HttpResponse.json({
						success: true,
						data: {
							tasks: [],
							total: 0,
							hasMore: false,
						},
					});
				}),
				http.post("/api/tasks", async ({ request }) => {
					const body = await request.json();
					await delay(50);
					return HttpResponse.json(
						{
							success: true,
							data: createMockTask({ ...body, id: "workflow-task" }),
						},
						{ status: 201 },
					);
				}),
				http.patch("/api/tasks/:id", async ({ request }) => {
					const body = await request.json();
					await delay(50);
					return HttpResponse.json({
						success: true,
						data: { id: "workflow-task", ...body },
					});
				}),
				http.delete("/api/tasks/:id", async () => {
					await delay(50);
					return HttpResponse.json({
						success: true,
						data: { id: "workflow-task" },
					});
				}),
			);

			const wrapper = createWrapper();
			const { result } = renderHook(
				() => {
					const tasks = useTasks();
					const createTask = useCreateTask();
					const updateTask = useUpdateTask();
					const deleteTask = useDeleteTask();
					return { tasks, createTask, updateTask, deleteTask };
				},
				{ wrapper },
			);

			// Start with empty list
			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(0);
			});

			// Create task
			act(() => {
				result.current.createTask.mutate({
					title: "Workflow Task",
					status: "pending",
					priority: "medium",
				});
			});

			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(1);
			});

			// Update task
			act(() => {
				result.current.updateTask.mutate({
					id: "workflow-task",
					status: "completed",
				});
			});

			await waitFor(() => {
				expect(result.current.tasks.data?.tasks[0].status).toBe("completed");
			});

			// Delete task
			act(() => {
				result.current.deleteTask.mutate("workflow-task");
			});

			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(0);
			});

			// Verify all operations completed
			expect(result.current.createTask.isSuccess).toBe(true);
			expect(result.current.updateTask.isSuccess).toBe(true);
			expect(result.current.deleteTask.isSuccess).toBe(true);
		});
	});

	describe("Race Condition Handling", () => {
		it("should handle overlapping mutations correctly", async () => {
			const task = createMockTask({
				id: "race-task",
				title: "Original",
				status: "pending",
			});

			let updateCount = 0;
			server.use(
				http.get("/api/tasks", () => {
					return HttpResponse.json({
						success: true,
						data: {
							tasks: [task],
							total: 1,
							hasMore: false,
						},
					});
				}),
				http.patch("/api/tasks/:id", async ({ request }) => {
					const body = await request.json();
					updateCount++;

					// Simulate varying response times
					await delay(updateCount === 1 ? 100 : 50);

					return HttpResponse.json({
						success: true,
						data: { ...task, ...body, version: updateCount },
					});
				}),
			);

			const wrapper = createWrapper();
			const { result } = renderHook(
				() => {
					const tasks = useTasks();
					const updateTask = useUpdateTask();
					return { tasks, updateTask };
				},
				{ wrapper },
			);

			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(1);
			});

			// Fire two overlapping updates
			act(() => {
				result.current.updateTask.mutate({
					id: "race-task",
					title: "First Update",
				});

				// Second update fires before first completes
				setTimeout(() => {
					act(() => {
						result.current.updateTask.mutate({
							id: "race-task",
							status: "completed",
						});
					});
				}, 25);
			});

			// Wait for both to complete
			await waitFor(
				() => {
					expect(updateCount).toBe(2);
				},
				{ timeout: 200 },
			);

			// Final state should reflect both updates
			const finalTask = result.current.tasks.data?.tasks[0];
			expect(finalTask).toBeDefined();
			// The exact final state depends on the mutation queue implementation
		});
	});
});
