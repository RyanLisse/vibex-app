import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
	test,
} from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { useInngestSubscriptionManagement } from "@/hooks/use-inngest-subscription";

// Mock dependencies
const mockFetchRealtimeSubscriptionToken = vi.fn();
const mockUseInngestSubscription = vi.fn();

vi.mock("@inngest/realtime/hooks", () => ({
	useInngestSubscription: (config: any) => mockUseInngestSubscription(config),
	InngestSubscriptionState: {
		Closed: "closed",
		Open: "open",
		Error: "error",
	},
}));

vi.mock("@/app/actions/inngest", () => ({
	fetchRealtimeSubscriptionToken: () => mockFetchRealtimeSubscriptionToken(),
}));

const mockConsoleLog = spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = spyOn(console, "error").mockImplementation(() => {});

describe("useInngestSubscriptionManagement", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetchRealtimeSubscriptionToken.mockResolvedValue({
			token: "test-token",
			channel: "tasks",
		});
		mockUseInngestSubscription.mockReturnValue({
			latestData: null,
			error: null,
			state: "open",
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should return subscription management functions", () => {
		const { result } = renderHook(() => useInngestSubscriptionManagement());

		expect(result.current.subscription).toBeDefined();
		expect(result.current.subscriptionEnabled).toBe(true);
		expect(result.current.refreshToken).toBeInstanceOf(Function);
		expect(result.current.handleError).toBeInstanceOf(Function);
	});

	it("should handle successful token refresh", async () => {
		const { result } = renderHook(() => useInngestSubscriptionManagement());

		const token = await result.current.refreshToken();
		expect(token).toEqual({ token: "test-token", channel: "tasks" });
	});

	it("should handle token refresh failure", async () => {
		mockFetchRealtimeSubscriptionToken.mockResolvedValue(null);
		const { result } = renderHook(() => useInngestSubscriptionManagement());

		await act(async () => {
			await result.current.refreshToken();
		});

		expect(mockConsoleLog).toHaveBeenCalledWith(
			"Inngest subscription disabled: No token available",
		);
		expect(result.current.subscriptionEnabled).toBe(false);
	});

	it("should handle token refresh error", async () => {
		const error = new Error("Token fetch failed");
		mockFetchRealtimeSubscriptionToken.mockRejectedValue(error);
		const { result } = renderHook(() => useInngestSubscriptionManagement());

		await act(async () => {
			await result.current.refreshToken();
		});

		expect(mockConsoleError).toHaveBeenCalledWith(
			"Failed to refresh Inngest token:",
			error,
		);
		expect(result.current.subscriptionEnabled).toBe(false);
	});

	it("should handle subscription errors", () => {
		const error = new Error("Connection failed");
		mockUseInngestSubscription.mockReturnValue({
			latestData: null,
			error,
			state: "error",
		});

		const { result } = renderHook(() => useInngestSubscriptionManagement());

		act(() => {
			result.current.handleError(error);
		});

		expect(mockConsoleError).toHaveBeenCalledWith(
			"Container Inngest subscription error:",
			error,
		);
		expect(result.current.subscriptionEnabled).toBe(false);
	});

	it("should handle subscription state changes", () => {
		mockUseInngestSubscription.mockReturnValue({
			latestData: null,
			error: null,
			state: "closed",
		});

		renderHook(() => useInngestSubscriptionManagement());

		expect(mockConsoleLog).toHaveBeenCalledWith(
			"Container Inngest subscription closed",
		);
	});
});
