/**
 * Offline Sync Integration Tests
 *
 * Tests for ElectricSQL offline-first functionality, queue management,
 * and sync resume capabilities
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOfflineSync } from "../../../hooks/use-offline-sync";
import { electricDb } from "../../../lib/electric/config";

// Mock ElectricSQL
vi.mock("@/lib/electric/config", () => ({
	electricDb: {
		executeRealtimeOperation: vi.fn(),
		isReady: vi.fn(() => true),
		getConnectionState: vi.fn(() => "connected"),
	},
}));

// Mock navigator.onLine
Object.defineProperty(navigator, "onLine", {
	writable: true,
	value: true,
});

// Mock localStorage
const mockLocalStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
	value: mockLocalStorage,
});

// Mock window events
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
Object.defineProperty(window, "addEventListener", {
	value: mockAddEventListener,
});
Object.defineProperty(window, "removeEventListener", {
	value: mockRemoveEventListener,
});

describe("Offline Sync Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockLocalStorage.getItem.mockReturnValue(null);
		navigator.onLine = true;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Offline Detection", () => {
		it("should detect when going offline", async () => {
			const { result } = renderHook(() => useOfflineSync());

			expect(result.current.isOnline).toBe(true);
			expect(result.current.isOffline).toBe(false);

			// Simulate going offline
			act(() => {
				navigator.onLine = false;
				// Trigger the offline event
				const offlineHandler = mockAddEventListener.mock.calls.find(
					(call) => call[0] === "offline",
				)?.[1];
				offlineHandler?.();
			});

			await waitFor(() => {
				expect(result.current.isOffline).toBe(true);
				expect(result.current.isOnline).toBe(false);
			});
		});

		it("should detect when coming back online", async () => {
			navigator.onLine = false;
			const { result } = renderHook(() => useOfflineSync());

			expect(result.current.isOffline).toBe(true);

			// Simulate coming back online
			act(() => {
				navigator.onLine = true;
				const onlineHandler = mockAddEventListener.mock.calls.find(
					(call) => call[0] === "online",
				)?.[1];
				onlineHandler?.();
			});

			await waitFor(() => {
				expect(result.current.isOnline).toBe(true);
				expect(result.current.isOffline).toBe(false);
			});
		});
	});

	describe("Offline Queue Management", () => {
		it("should queue operations when offline", async () => {
			const { result } = renderHook(() => useOfflineSync());

			act(() => {
				const operationId = result.current.queueOperation(
					"insert",
					"tasks",
					{ title: "Test Task", status: "pending" },
					"user-123",
				);
				expect(operationId).toBeDefined();
			});

			const stats = result.current.getStats();
			expect(stats.queueSize).toBe(1);
			expect(stats.pendingOperations).toBe(1);
		});

		it("should persist queue to localStorage", async () => {
			const { result } = renderHook(() => useOfflineSync());

			act(() => {
				result.current.queueOperation("insert", "tasks", {
					title: "Test Task",
				});
			});

			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"electric_offline_queue",
				expect.stringContaining("Test Task"),
			);
		});

		it("should load queue from localStorage on mount", async () => {
			const mockQueue = JSON.stringify([
				{
					id: "test-op-1",
					type: "insert",
					table: "tasks",
					data: { title: "Persisted Task" },
					timestamp: new Date().toISOString(),
					retries: 0,
					maxRetries: 3,
				},
			]);

			mockLocalStorage.getItem.mockReturnValue(mockQueue);

			const { result } = renderHook(() => useOfflineSync());

			await waitFor(() => {
				const stats = result.current.getStats();
				expect(stats.queueSize).toBe(1);
			});
		});
	});

	describe("Sync Resume", () => {
		it("should process queue when coming back online", async () => {
			vi.mocked(electricDb.executeRealtimeOperation).mockResolvedValue({
				id: "test-result",
			});

			const { result } = renderHook(() => useOfflineSync());

			// Queue an operation while offline
			act(() => {
				navigator.onLine = false;
				result.current.queueOperation("insert", "tasks", {
					title: "Offline Task",
				});
			});

			expect(result.current.getStats().queueSize).toBe(1);

			// Come back online and trigger sync
			act(() => {
				navigator.onLine = true;
				const onlineHandler = mockAddEventListener.mock.calls.find(
					(call) => call[0] === "online",
				)?.[1];
				onlineHandler?.();
			});

			await waitFor(() => {
				expect(electricDb.executeRealtimeOperation).toHaveBeenCalledWith(
					"tasks",
					"insert",
					{ title: "Offline Task" },
					false,
				);
			});

			await waitFor(() => {
				expect(result.current.getStats().queueSize).toBe(0);
			});
		});

		it("should retry failed operations", async () => {
			vi.mocked(electricDb.executeRealtimeOperation)
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValueOnce({ id: "success" });

			const { result } = renderHook(() => useOfflineSync());

			act(() => {
				result.current.queueOperation("insert", "tasks", {
					title: "Retry Task",
				});
			});

			// First sync attempt (should fail)
			await act(async () => {
				await result.current.manualSync();
			});

			expect(result.current.getStats().queueSize).toBe(1); // Still in queue for retry

			// Second sync attempt (should succeed)
			await act(async () => {
				await result.current.manualSync();
			});

			await waitFor(() => {
				expect(result.current.getStats().queueSize).toBe(0);
			});
		});

		it("should handle max retries exceeded", async () => {
			vi.mocked(electricDb.executeRealtimeOperation).mockRejectedValue(
				new Error("Persistent error"),
			);

			const { result } = renderHook(() => useOfflineSync());

			act(() => {
				result.current.queueOperation("insert", "tasks", {
					title: "Failing Task",
				});
			});

			// Attempt sync multiple times (should exceed max retries)
			for (let i = 0; i < 4; i++) {
				await act(async () => {
					try {
						await result.current.manualSync();
					} catch (error) {
						// Expected to fail
					}
				});
			}

			await waitFor(() => {
				const stats = result.current.getStats();
				expect(stats.failedOperations).toBe(1);
				expect(result.current.syncErrors.length).toBeGreaterThan(0);
			});
		});
	});

	describe("Manual Sync", () => {
		it("should allow manual sync trigger", async () => {
			vi.mocked(electricDb.executeRealtimeOperation).mockResolvedValue({
				id: "manual-sync",
			});

			const { result } = renderHook(() => useOfflineSync());

			act(() => {
				result.current.queueOperation("update", "tasks", {
					id: "task-1",
					title: "Updated",
				});
			});

			await act(async () => {
				await result.current.manualSync();
			});

			expect(electricDb.executeRealtimeOperation).toHaveBeenCalledWith(
				"tasks",
				"update",
				{ id: "task-1", title: "Updated" },
				false,
			);
		});

		it("should prevent manual sync when offline", async () => {
			const { result } = renderHook(() => useOfflineSync());

			act(() => {
				navigator.onLine = false;
				const offlineHandler = mockAddEventListener.mock.calls.find(
					(call) => call[0] === "offline",
				)?.[1];
				offlineHandler?.();
			});

			await expect(result.current.manualSync()).rejects.toThrow(
				"Cannot sync while offline",
			);
		});
	});

	describe("Test Mode", () => {
		it("should provide test offline functionality", async () => {
			vi.mocked(electricDb.executeRealtimeOperation).mockResolvedValue({
				id: "test-result",
			});

			const { result } = renderHook(() => useOfflineSync());

			await act(async () => {
				await result.current.testOfflineMode();
			});

			expect(result.current.getStats().queueSize).toBeGreaterThanOrEqual(0);
			expect(electricDb.executeRealtimeOperation).toHaveBeenCalled();
		});
	});
});
