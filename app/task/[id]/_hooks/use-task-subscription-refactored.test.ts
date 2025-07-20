	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
	test,
} from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useTaskSubscription } from "@/app/task/[id]/_hooks/use-task-subscription-refactored";

// Mock the dependencies
vi.mock("@inngest/realtime/hooks", () => ({
	useInngestSubscription: vi.fn(() => ({
		latestData: null,
		disconnect: vi.fn(),
	})),
}));

vi.mock("@/lib/stream-utils", () => ({
	safeAsync: vi.fn(),
}));

vi.mock("./use-message-processor", () => ({
	useMessageProcessor: vi.fn(() => ({
		processMessage: vi.fn(),
	})),
}));

vi.mock("./use-status-processor", () => ({
	useStatusProcessor: vi.fn(() => ({
		processStatusUpdate: vi.fn(),
	})),
}));

vi.mock("@/app/actions/inngest", () => ({
	fetchRealtimeSubscriptionToken: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useTaskSubscription", () => {
	const mockTaskId = "test-task-id";
	const mockTaskMessages = [
		{ role: "user" as const, type: "message", data: { text: "Hello" } },
	];

	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					status: "ok",
					config: { isDev: true },
				}),
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'ok',
          config: { isDev: true },
        }),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

	it("should initialize with correct default state", () => {
		const { result } = renderHook(() =>
			useTaskSubscription({
				taskId: mockTaskId,
				taskMessages: mockTaskMessages,
			}),
		);

		expect(result.current.subscriptionEnabled).toBe(false);
		expect(result.current.isInitialized).toBe(false);
		expect(result.current.lastError).toBe(null);
		expect(result.current.connectionState).toBe("disconnected");
		expect(result.current.isConnected).toBe(false);
		expect(result.current.isConnecting).toBe(false);
		expect(result.current.hasError).toBe(false);
		expect(result.current.messagesCount).toBe(0);
	});

	it("should check Inngest availability on mount", async () => {
		renderHook(() =>
			useTaskSubscription({
				taskId: mockTaskId,
				taskMessages: mockTaskMessages,
			}),
		);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith("/api/inngest");
		});
	});

	it("should enable subscription when Inngest is available", async () => {
		const { result } = renderHook(() =>
			useTaskSubscription({
				taskId: mockTaskId,
				taskMessages: mockTaskMessages,
			}),
		);

		await waitFor(() => {
			expect(result.current.subscriptionEnabled).toBe(true);
			expect(result.current.isInitialized).toBe(true);
			expect(result.current.connectionState).toBe("connected");
		});
	});

	it("should disable subscription when Inngest is not available", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					status: "error",
					config: { isDev: false },
				}),
		});

		const { result } = renderHook(() =>
			useTaskSubscription({
				taskId: mockTaskId,
				taskMessages: mockTaskMessages,
			}),
		);

		await waitFor(() => {
			expect(result.current.subscriptionEnabled).toBe(false);
			expect(result.current.isInitialized).toBe(true);
			expect(result.current.connectionState).toBe("disconnected");
		});
	});

	it("should handle fetch errors gracefully", async () => {
		const mockError = new Error("Network error");
		mockFetch.mockRejectedValue(mockError);

		const { result } = renderHook(() =>
			useTaskSubscription({
				taskId: mockTaskId,
				taskMessages: mockTaskMessages,
			}),
		);

		await waitFor(() => {
			expect(result.current.subscriptionEnabled).toBe(false);
			expect(result.current.isInitialized).toBe(true);
			expect(result.current.connectionState).toBe("error");
			expect(result.current.lastError).toEqual(mockError);
			expect(result.current.hasError).toBe(true);
		});
	});

	it("should handle HTTP errors", async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});

		const { result } = renderHook(() =>
			useTaskSubscription({
				taskId: mockTaskId,
				taskMessages: mockTaskMessages,
			}),
		);

		await waitFor(() => {
			expect(result.current.subscriptionEnabled).toBe(false);
			expect(result.current.isInitialized).toBe(true);
			expect(result.current.connectionState).toBe("error");
			expect(result.current.hasError).toBe(true);
		});
	});

	it("should properly cleanup on unmount", () => {
		const mockDisconnect = vi.fn();
		const { useInngestSubscription } = require("@inngest/realtime/hooks");
		useInngestSubscription.mockReturnValue({
			latestData: null,
			disconnect: mockDisconnect,
		});

		const { unmount } = renderHook(() =>
			useTaskSubscription({
				taskId: mockTaskId,
				taskMessages: mockTaskMessages,
			}),
		);

		act(() => {
			unmount();
		});

		expect(require("@/lib/stream-utils").safeAsync).toHaveBeenCalledWith(
			expect.any(Function),
			undefined,
			"Error disconnecting subscription:",
		);
	});

	it("should handle streaming messages correctly", () => {
		const { result } = renderHook(() =>
			useTaskSubscription({
				taskId: mockTaskId,
				taskMessages: mockTaskMessages,
			}),
		);

		expect(result.current.streamingMessages).toBeInstanceOf(Map);
		expect(result.current.streamingMessages.size).toBe(0);
	});

	it("should provide correct connection state helpers", async () => {
		const { result } = renderHook(() =>
			useTaskSubscription({
				taskId: mockTaskId,
				taskMessages: mockTaskMessages,
			}),
		);

		await waitFor(() => {
			expect(result.current.isConnected).toBe(
				result.current.connectionState === "connected",
			);
			expect(result.current.isConnecting).toBe(
				result.current.connectionState === "connecting",
			);
			expect(result.current.hasError).toBe(result.current.lastError !== null);
		});
	});

	it("should handle taskId changes correctly", async () => {
		const { result, rerender } = renderHook(
			({ taskId }) =>
				useTaskSubscription({ taskId, taskMessages: mockTaskMessages }),
			{ initialProps: { taskId: mockTaskId } },
		);

		await waitFor(() => {
			expect(result.current.isInitialized).toBe(true);
		});

		const newTaskId = "new-task-id";
		rerender({ taskId: newTaskId });

		// Should maintain state but use new taskId for processing
		expect(result.current.isInitialized).toBe(true);
	});

	it("should handle empty task messages", () => {
		const { result } = renderHook(() =>
			useTaskSubscription({ taskId: mockTaskId }),
		);

		expect(result.current.streamingMessages).toBeInstanceOf(Map);
		expect(result.current.messagesCount).toBe(0);
	});
});
