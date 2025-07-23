/**
 * Database Integration Tests
 *
 * Tests database operations, TanStack Query integration,
 * and real-time synchronization functionality.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { eq } from "drizzle-orm";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { agentMemory, environments, tasks } from "@/db/schema";
import { useCreateEnvironment, useEnvironments } from "@/hooks/use-environment-queries-enhanced";
import { agentMemoryService } from "@/lib/agent-memory/memory-service";
import { useCreateTask, useTasks, useUpdateTask } from "@/lib/queries/hooks/use-tasks";

// Mock database
vi.mock("@/db", () => ({
	db: {
		select: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		returning: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
	},
}));

// Mock observability
vi.mock("@/lib/observability", () => ({
	observability: {
		trackOperation: vi.fn((name, fn) => fn()),
		recordEvent: vi.fn(),
		recordError: vi.fn(),
	},
}));

// Test wrapper component
const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe("Database Integration", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		vi.clearAllMocks();
	});

	afterEach(() => {
		queryClient.clear();
	});

	describe("Task Operations", () => {
		it("should fetch tasks successfully", async () => {
			const mockTasks = [
				{
					id: "task-1",
					title: "Test Task",
					description: "Test Description",
					status: "pending",
					priority: "medium",
					createdAt: new Date(),
					updatedAt: new Date(),
					userId: "user-1",
					metadata: {},
					embedding: null,
				},
			];

			// Mock database response
			const mockDb = vi.mocked(db);
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockResolvedValue(mockTasks),
				}),
			} as any);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useTasks(), { wrapper });

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual(mockTasks);
		});

		it("should create task with optimistic updates", async () => {
			const newTask = {
				title: "New Task",
				description: "New Description",
				status: "pending" as const,
				priority: "high" as const,
			};

			const createdTask = {
				id: "task-2",
				...newTask,
				createdAt: new Date(),
				updatedAt: new Date(),
				userId: "user-1",
				metadata: {},
				embedding: null,
			};

			// Mock database response
			const mockDb = vi.mocked(db);
			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([createdTask]),
				}),
			} as any);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useCreateTask(), { wrapper });

			await waitFor(() => {
				expect(result.current.mutate).toBeDefined();
			});

			result.current.mutate(newTask);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual(createdTask);
		});

		it("should update task with optimistic updates", async () => {
			const taskId = "task-1";
			const updates = { status: "completed" as const };
			const updatedTask = {
				id: taskId,
				title: "Test Task",
				description: "Test Description",
				status: "completed" as const,
				priority: "medium" as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				userId: "user-1",
				metadata: {},
				embedding: null,
			};

			// Mock database response
			const mockDb = vi.mocked(db);
			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedTask]),
					}),
				}),
			} as any);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useUpdateTask(), { wrapper });

			await waitFor(() => {
				expect(result.current.mutate).toBeDefined();
			});

			result.current.mutate({ id: taskId, data: updates });

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual(updatedTask);
		});

		it("should handle task creation errors gracefully", async () => {
			const newTask = {
				title: "New Task",
				description: "New Description",
				status: "pending" as const,
			};

			// Mock database error
			const mockDb = vi.mocked(db);
			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockRejectedValue(new Error("Database error")),
				}),
			} as any);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useCreateTask(), { wrapper });

			await waitFor(() => {
				expect(result.current.mutate).toBeDefined();
			});

			result.current.mutate(newTask);

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			expect(result.current.error).toBeInstanceOf(Error);
		});
	});

	describe("Environment Operations", () => {
		it("should fetch environments successfully", async () => {
			const mockEnvironments = [
				{
					id: "env-1",
					name: "Development",
					config: { type: "development" },
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
					userId: "user-1",
					schemaVersion: 1,
				},
			];

			// Mock database response
			const mockDb = vi.mocked(db);
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockResolvedValue(mockEnvironments),
					}),
				}),
			} as any);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useEnvironments(), { wrapper });

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual(mockEnvironments);
		});

		it("should create environment successfully", async () => {
			const newEnvironment = {
				name: "Test Environment",
				config: { type: "test" },
				isActive: false,
			};

			const createdEnvironment = {
				id: "env-2",
				...newEnvironment,
				createdAt: new Date(),
				updatedAt: new Date(),
				userId: "user-1",
				schemaVersion: 1,
			};

			// Mock database response
			const mockDb = vi.mocked(db);
			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([createdEnvironment]),
				}),
			} as any);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useCreateEnvironment(), { wrapper });

			await waitFor(() => {
				expect(result.current.mutate).toBeDefined();
			});

			result.current.mutate(newEnvironment);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual(createdEnvironment);
		});
	});

	describe("Agent Memory Operations", () => {
		beforeEach(async () => {
			// Initialize agent memory service
			await agentMemoryService.initialize();
		});

		it("should store and retrieve agent memory", async () => {
			const agentType = "test-agent";
			const contextKey = "test-context";
			const content = "Test memory content";

			// Mock database responses
			const mockDb = vi.mocked(db);

			// Mock select for checking existing memory
			mockDb.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]), // No existing memory
					}),
				}),
			} as any);

			// Mock insert for creating new memory
			const createdMemory = {
				id: "memory-1",
				agentType,
				contextKey,
				content,
				embedding: [0.1, 0.2, 0.3],
				createdAt: new Date(),
				lastAccessedAt: new Date(),
				accessCount: 1,
				metadata: {},
				importance: 5,
				expiresAt: null,
			};

			mockDb.insert.mockReturnValueOnce({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([createdMemory]),
				}),
			} as any);

			const result = await agentMemoryService.storeMemory(agentType, contextKey, content);

			expect(result).toEqual(
				expect.objectContaining({
					agentType,
					contextKey,
					content,
					importance: 5,
				})
			);
		});

		it("should search memories semantically", async () => {
			const query = "test search";
			const mockResults = [
				{
					document: {
						id: "memory-1",
						content: "Test memory content",
						embedding: [0.1, 0.2, 0.3],
						metadata: {
							agentType: "test-agent",
							contextKey: "test-context",
							importance: 5,
						},
					},
					similarity: 0.8,
					rank: 1,
				},
			];

			// Mock vector search
			const mockVectorSearch = agentMemoryService["vectorSearch"];
			vi.spyOn(mockVectorSearch, "search").mockResolvedValue(mockResults);

			const results = await agentMemoryService.searchMemories(query, {
				agentType: "test-agent",
				maxResults: 10,
			});

			expect(results).toEqual(mockResults);
			expect(mockVectorSearch.search).toHaveBeenCalledWith(
				expect.any(Array), // embedding
				expect.objectContaining({
					threshold: 0.7,
					maxResults: 20, // Gets more for filtering
					filters: { agentType: "test-agent" },
					includeMetadata: true,
				})
			);
		});

		it("should get relevant context for tasks", async () => {
			const agentType = "test-agent";
			const taskDescription = "Implement a new feature";

			// Mock database stats query
			const mockDb = vi.mocked(db);
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([
						{
							count: 10,
							avgImportance: 5.5,
							oldestDate: new Date("2023-01-01"),
							newestDate: new Date("2024-01-01"),
						},
					]),
				}),
			} as any);

			// Mock search results
			const mockSearchResults = [
				{
					document: {
						id: "memory-1",
						content: "Feature implementation best practices",
						embedding: [0.1, 0.2, 0.3],
					},
					similarity: 0.8,
					rank: 1,
					metadata: {
						agentType,
						contextKey: "best-practices",
						importance: 7,
						accessCount: 5,
						createdAt: new Date().toISOString(),
						lastAccessedAt: new Date().toISOString(),
					},
				},
			];

			vi.spyOn(agentMemoryService, "searchMemories").mockResolvedValue(mockSearchResults);

			const context = await agentMemoryService.getRelevantContext(agentType, taskDescription);

			expect(context).toEqual(
				expect.objectContaining({
					relevantMemories: expect.arrayContaining([
						expect.objectContaining({
							content: "Feature implementation best practices",
							importance: 7,
						}),
					]),
					totalMemories: 10,
					averageImportance: 5.5,
					contextSummary: expect.stringContaining("Feature implementation best practices"),
				})
			);
		});
	});

	describe("Real-time Synchronization", () => {
		it("should handle real-time task updates", async () => {
			// This would test ElectricSQL integration
			// For now, we'll test the hook subscription mechanism

			const wrapper = createWrapper();
			const { result } = renderHook(
				() => {
					const { data: tasks } = useTasks();
					return { tasks };
				},
				{ wrapper }
			);

			// Simulate real-time update
			const updatedTask = {
				id: "task-1",
				title: "Updated Task",
				status: "completed" as const,
				priority: "high" as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				userId: "user-1",
				metadata: {},
				embedding: null,
			};

			// In a real test, this would simulate ElectricSQL pushing updates
			queryClient.setQueryData(["tasks", "list", {}], [updatedTask]);

			await waitFor(() => {
				expect(result.current.tasks).toContainEqual(
					expect.objectContaining({
						id: "task-1",
						title: "Updated Task",
						status: "completed",
					})
				);
			});
		});
	});

	describe("Error Handling", () => {
		it("should handle database connection errors", async () => {
			// Mock database connection error
			const mockDb = vi.mocked(db);
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockRejectedValue(new Error("Connection failed")),
				}),
			} as any);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useTasks(), { wrapper });

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			expect(result.current.error).toBeInstanceOf(Error);
			expect(result.current.error?.message).toBe("Connection failed");
		});

		it("should retry failed operations", async () => {
			let callCount = 0;
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockImplementation(() => {
						callCount++;
						if (callCount < 3) {
							return Promise.reject(new Error("Temporary failure"));
						}
						return Promise.resolve([]);
					}),
				}),
			} as any);

			const queryClientWithRetry = new QueryClient({
				defaultOptions: {
					queries: {
						retry: 2,
						retryDelay: 100,
					},
				},
			});

			const wrapper = ({ children }: { children: React.ReactNode }) => (
				<QueryClientProvider client={queryClientWithRetry}>{children}</QueryClientProvider>
			);

			const { result } = renderHook(() => useTasks(), { wrapper });

			await waitFor(
				() => {
					expect(result.current.isSuccess).toBe(true);
				},
				{ timeout: 5000 }
			);

			expect(callCount).toBe(3); // Initial call + 2 retries
		});
	});

	describe("Performance", () => {
		it("should cache query results effectively", async () => {
			const mockTasks = [
				{
					id: "task-1",
					title: "Cached Task",
					status: "pending" as const,
					priority: "medium" as const,
					createdAt: new Date(),
					updatedAt: new Date(),
					userId: "user-1",
					metadata: {},
					embedding: null,
				},
			];

			let callCount = 0;
			const mockDb = vi.mocked(db);
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockImplementation(() => {
						callCount++;
						return Promise.resolve(mockTasks);
					}),
				}),
			} as any);

			const wrapper = createWrapper();

			// First render
			const { result: result1 } = renderHook(() => useTasks(), { wrapper });
			await waitFor(() => expect(result1.current.isSuccess).toBe(true));

			// Second render with same query - should use cache
			const { result: result2 } = renderHook(() => useTasks(), { wrapper });
			await waitFor(() => expect(result2.current.isSuccess).toBe(true));

			// Should only call the API once due to caching
			expect(callCount).toBe(1);
			expect(result1.current.data).toEqual(result2.current.data);
		});

		it("should handle large datasets efficiently", async () => {
			// Generate large dataset
			const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
				id: `task-${i}`,
				title: `Task ${i}`,
				status: "pending" as const,
				priority: "medium" as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				userId: "user-1",
				metadata: {},
				embedding: null,
			}));

			const mockDb = vi.mocked(db);
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockResolvedValue(largeTasks),
				}),
			} as any);

			const wrapper = createWrapper();
			const startTime = performance.now();

			const { result } = renderHook(() => useTasks(), { wrapper });

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(result.current.data).toHaveLength(1000);
			expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
		});
	});
});
