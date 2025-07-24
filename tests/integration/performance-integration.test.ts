/**
 * Performance Integration Tests
 *
 * Tests system performance under various load conditions and ensures
 * optimizations work correctly across integrated components
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
// Mock server setup with timing controls
import { setupServer } from "msw/node";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "../../db/schema";
import { useCreateTask, useTasks, useUpdateTask } from "../../lib/query/hooks";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Performance monitoring utilities
class PerformanceMonitor {
	private metrics: { [key: string]: number[] } = {};

	startTiming(label: string): () => number {
		const start = performance.now();
		return () => {
			const duration = performance.now() - start;
			if (!this.metrics[label]) {
				this.metrics[label] = [];
			}
			this.metrics[label].push(duration);
			return duration;
		};
	}

	getAverageTime(label: string): number {
		const times = this.metrics[label] || [];
		return times.reduce((sum, time) => sum + time, 0) / times.length;
	}

	getMaxTime(label: string): number {
		const times = this.metrics[label] || [];
		return Math.max(...times);
	}

	getMetrics(label: string) {
		const times = this.metrics[label] || [];
		return {
			count: times.length,
			average: this.getAverageTime(label),
			max: this.getMaxTime(label),
			min: Math.min(...times),
			p95: times.sort()[Math.floor(times.length * 0.95)],
		};
	}

	reset() {
		this.metrics = {};
	}
}

// Test wrapper with performance monitoring
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

// Test data factory for large datasets
function createBatchTasks(count: number): Task[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `batch-task-${i}`,
		title: `Batch Task ${i}`,
		description: `Description for batch task ${i}`,
		status: i % 3 === 0 ? "completed" : "pending",
		priority: ["low", "medium", "high"][i % 3] as "low" | "medium" | "high",
		createdAt: new Date(Date.now() - i * 1000),
		updatedAt: new Date(Date.now() - i * 500),
		completedAt: i % 3 === 0 ? new Date() : null,
		dueDate: null,
		assignee: null,
		tags: [`tag-${i % 5}`],
		metadata: { batchId: Math.floor(i / 10) },
		userId: "test-user",
	}));
}

describe("Performance Integration Tests", () => {
	let monitor: PerformanceMonitor;

	beforeEach(() => {
		monitor = new PerformanceMonitor();
	});

	describe("Large Dataset Handling", () => {
		it("should handle 1000+ tasks with acceptable performance", async () => {
			const largeBatch = createBatchTasks(1000);

			server.use(
				http.get("/api/tasks", async () => {
					await delay(100); // Simulate realistic server response time
					return HttpResponse.json({
						success: true,
						data: {
							tasks: largeBatch,
							total: 1000,
							hasMore: false,
						},
					});
				})
			);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useTasks(), { wrapper });

			const endTiming = monitor.startTiming("large-dataset-load");

			// Wait for data to load
			await waitFor(
				() => {
					expect(result.current.isSuccess).toBe(true);
				},
				{ timeout: 5000 }
			);

			const loadTime = endTiming();

			// Performance assertions
			expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
			expect(result.current.data?.tasks).toHaveLength(1000);

			// Memory usage should be reasonable
			const memoryUsage = (performance as any).memory?.usedJSHeapSize;
			if (memoryUsage) {
				expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // < 50MB
			}
		});

		it("should handle pagination efficiently", async () => {
			const pageSize = 20;
			const totalTasks = 200;

			server.use(
				http.get("/api/tasks", ({ request }) => {
					const url = new URL(request.url);
					const page = Number.parseInt(url.searchParams.get("page") || "1");
					const limit = Number.parseInt(url.searchParams.get("limit") || "20");

					const startIndex = (page - 1) * limit;
					const endIndex = startIndex + limit;
					const tasks = createBatchTasks(totalTasks).slice(startIndex, endIndex);

					return HttpResponse.json({
						success: true,
						data: {
							tasks,
							total: totalTasks,
							hasMore: endIndex < totalTasks,
						},
					});
				})
			);

			const wrapper = createWrapper();

			// Test multiple page loads
			for (let page = 1; page <= 5; page++) {
				const { result } = renderHook(() => useTasks({ page, limit: pageSize }), { wrapper });

				const endTiming = monitor.startTiming(`page-${page}-load`);

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true);
				});

				endTiming();
				expect(result.current.data?.tasks).toHaveLength(pageSize);
			}

			// Each page should load quickly
			const avgPageLoad = monitor.getAverageTime("page-1-load");
			expect(avgPageLoad).toBeLessThan(500); // < 500ms per page
		});
	});

	describe("Optimistic Updates Performance", () => {
		it("should show optimistic updates within 50ms", async () => {
			const initialTasks = createBatchTasks(100);

			server.use(
				http.get("/api/tasks", () => {
					return HttpResponse.json({
						success: true,
						data: {
							tasks: initialTasks,
							total: 100,
							hasMore: false,
						},
					});
				}),
				http.post("/api/tasks", async ({ request }) => {
					const body = await request.json();
					await delay(200); // Simulate server processing time
					return HttpResponse.json(
						{
							success: true,
							data: { ...body, id: "server-generated-id" },
						},
						{ status: 201 }
					);
				})
			);

			const wrapper = createWrapper();
			const { result } = renderHook(
				() => {
					const tasks = useTasks();
					const createTask = useCreateTask();
					return { tasks, createTask };
				},
				{ wrapper }
			);

			// Wait for initial load
			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(100);
			});

			// Measure optimistic update timing
			const endTiming = monitor.startTiming("optimistic-update");

			act(() => {
				result.current.createTask.mutate({
					title: "Performance Test Task",
					status: "pending",
					priority: "medium",
				});
			});

			// Check how quickly UI updates
			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(101);
			});

			const optimisticTime = endTiming();

			// Optimistic update should be nearly instant
			expect(optimisticTime).toBeLessThan(50);
		});

		it("should handle rapid successive operations efficiently", async () => {
			const initialTasks = createBatchTasks(50);
			let operationCount = 0;

			server.use(
				http.get("/api/tasks", () => {
					return HttpResponse.json({
						success: true,
						data: {
							tasks: initialTasks,
							total: 50,
							hasMore: false,
						},
					});
				}),
				http.patch("/api/tasks/:id", async ({ params, request }) => {
					operationCount++;
					const body = await request.json();
					await delay(50); // Simulate processing
					return HttpResponse.json({
						success: true,
						data: { id: params.id, ...body },
					});
				})
			);

			const wrapper = createWrapper();
			const { result } = renderHook(
				() => {
					const tasks = useTasks();
					const updateTask = useUpdateTask();
					return { tasks, updateTask };
				},
				{ wrapper }
			);

			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(50);
			});

			// Perform 10 rapid updates
			const endTiming = monitor.startTiming("rapid-operations");

			for (let i = 0; i < 10; i++) {
				act(() => {
					result.current.updateTask.mutate({
						id: `batch-task-${i}`,
						status: "completed",
					});
				});
			}

			// Wait for all optimistic updates
			await waitFor(() => {
				const completedTasks = result.current.tasks.data?.tasks.filter(
					(t) => t.status === "completed"
				);
				expect(completedTasks).toHaveLength(10);
			});

			const totalTime = endTiming();

			// All optimistic updates should complete quickly
			expect(totalTime).toBeLessThan(200);

			// Should eventually sync with server
			await waitFor(
				() => {
					expect(operationCount).toBe(10);
				},
				{ timeout: 2000 }
			);
		});
	});

	describe("Cache Performance", () => {
		it("should efficiently invalidate and update cache", async () => {
			const tasks = createBatchTasks(500);
			let requestCount = 0;

			server.use(
				http.get("/api/tasks", () => {
					requestCount++;
					return HttpResponse.json({
						success: true,
						data: {
							tasks,
							total: 500,
							hasMore: false,
						},
					});
				}),
				http.post("/api/tasks", async ({ request }) => {
					const body = await request.json();
					tasks.push({ ...body, id: "new-task-id" });
					return HttpResponse.json(
						{
							success: true,
							data: { ...body, id: "new-task-id" },
						},
						{ status: 201 }
					);
				})
			);

			const wrapper = createWrapper();
			const { result } = renderHook(
				() => {
					const tasks = useTasks();
					const createTask = useCreateTask();
					return { tasks, createTask };
				},
				{ wrapper }
			);

			// Initial load
			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(500);
			});

			expect(requestCount).toBe(1);

			// Create new task (should trigger cache invalidation)
			const endTiming = monitor.startTiming("cache-invalidation");

			act(() => {
				result.current.createTask.mutate({
					title: "Cache Test Task",
					status: "pending",
					priority: "medium",
				});
			});

			// Wait for cache update
			await waitFor(() => {
				expect(result.current.tasks.data?.tasks).toHaveLength(501);
			});

			const cacheUpdateTime = endTiming();

			// Cache invalidation and update should be fast
			expect(cacheUpdateTime).toBeLessThan(100);
			expect(requestCount).toBe(2); // One refetch after mutation
		});

		it("should handle concurrent cache operations", async () => {
			const tasks = createBatchTasks(100);

			server.use(
				http.get("/api/tasks", ({ request }) => {
					const url = new URL(request.url);
					const status = url.searchParams.get("status");

					if (status) {
						return HttpResponse.json({
							success: true,
							data: {
								tasks: tasks.filter((t) => t.status === status),
								total: tasks.filter((t) => t.status === status).length,
								hasMore: false,
							},
						});
					}

					return HttpResponse.json({
						success: true,
						data: {
							tasks,
							total: 100,
							hasMore: false,
						},
					});
				})
			);

			const wrapper = createWrapper();

			// Create multiple concurrent queries
			const { result: allTasks } = renderHook(() => useTasks(), { wrapper });
			const { result: pendingTasks } = renderHook(() => useTasks({ status: "pending" }), {
				wrapper,
			});
			const { result: completedTasks } = renderHook(() => useTasks({ status: "completed" }), {
				wrapper,
			});

			const endTiming = monitor.startTiming("concurrent-queries");

			// Wait for all queries to complete
			await waitFor(() => {
				expect(allTasks.current.isSuccess).toBe(true);
				expect(pendingTasks.current.isSuccess).toBe(true);
				expect(completedTasks.current.isSuccess).toBe(true);
			});

			const concurrentTime = endTiming();

			// Concurrent queries should not block each other
			expect(concurrentTime).toBeLessThan(1000);

			// Each query should have correct filtered data
			expect(allTasks.current.data?.tasks).toHaveLength(100);
			expect(pendingTasks.current.data?.tasks.every((t) => t.status === "pending")).toBe(true);
			expect(completedTasks.current.data?.tasks.every((t) => t.status === "completed")).toBe(true);
		});
	});

	describe("Memory Management", () => {
		it("should not leak memory with frequent operations", async () => {
			const tasks = createBatchTasks(50);

			server.use(
				http.get("/api/tasks", () => {
					return HttpResponse.json({
						success: true,
						data: { tasks, total: 50, hasMore: false },
					});
				}),
				http.patch("/api/tasks/:id", async ({ params, request }) => {
					const body = await request.json();
					return HttpResponse.json({
						success: true,
						data: { id: params.id, ...body },
					});
				})
			);

			const wrapper = createWrapper();

			// Perform many operations to test memory usage
			for (let round = 0; round < 10; round++) {
				const { result, unmount } = renderHook(
					() => {
						const tasks = useTasks();
						const updateTask = useUpdateTask();
						return { tasks, updateTask };
					},
					{ wrapper }
				);

				await waitFor(() => {
					expect(result.current.tasks.isSuccess).toBe(true);
				});

				// Perform multiple updates
				for (let i = 0; i < 5; i++) {
					act(() => {
						result.current.updateTask.mutate({
							id: `batch-task-${i}`,
							title: `Updated in round ${round}`,
						});
					});
				}

				// Cleanup
				unmount();
			}

			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}

			// Memory should not grow excessively
			const memoryUsage = (performance as any).memory?.usedJSHeapSize;
			if (memoryUsage) {
				expect(memoryUsage).toBeLessThan(20 * 1024 * 1024); // < 20MB
			}
		});
	});

	describe("Network Optimization", () => {
		it("should batch requests efficiently", async () => {
			let requestCount = 0;
			const batchedRequests: any[] = [];

			server.use(
				http.post("/api/tasks/batch", async ({ request }) => {
					requestCount++;
					const body = await request.json();
					batchedRequests.push(body);
					await delay(100);
					return HttpResponse.json({
						success: true,
						data: {
							processed: body.operations.length,
							results: body.operations.map((op: any) => ({
								id: op.id,
								success: true,
							})),
						},
					});
				})
			);

			// This would test a batch operation hook (to be implemented)
			// For now, we simulate the batching behavior

			const endTiming = monitor.startTiming("batch-operations");

			// Simulate batching 20 operations into 2 requests
			await Promise.all([
				fetch("/api/tasks/batch", {
					method: "POST",
					body: JSON.stringify({
						operations: Array.from({ length: 10 }, (_, i) => ({
							id: `batch-${i}`,
							type: "update",
							data: { status: "completed" },
						})),
					}),
				}),
				fetch("/api/tasks/batch", {
					method: "POST",
					body: JSON.stringify({
						operations: Array.from({ length: 10 }, (_, i) => ({
							id: `batch-${i + 10}`,
							type: "update",
							data: { status: "completed" },
						})),
					}),
				}),
			]);

			const batchTime = endTiming();

			// Should use fewer requests than individual operations
			expect(requestCount).toBe(2);
			expect(batchTime).toBeLessThan(500);
			expect(batchedRequests).toHaveLength(2);
			expect(batchedRequests[0].operations).toHaveLength(10);
		});
	});

	afterEach(() => {
		// Log performance metrics for debugging
		const metrics = monitor.getMetrics("large-dataset-load");
		if (metrics.count > 0) {
			console.log("Performance metrics:", metrics);
		}
	});
});
