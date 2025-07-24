import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthBase } from "./use-auth-base";
import { useOpenAIAuth } from "./use-openai-auth";

// Mock the base auth hook
// vi.mock("./use-auth-base", () => ({
// 	useAuthBase: vi.fn(),
// }));

// Mock fetch
global.fetch = vi.fn();

describe.skip("useOpenAIAuth", () => {
	const mockBaseAuth = {
		authenticated: false,
		loading: true,
		login: vi.fn(),
		logout: vi.fn(),
		refresh: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		(useAuthBase as any).mockReturnValue(mockBaseAuth);
		(global.fetch as any).mockResolvedValue({
			ok: true,
			json: async () => ({}),
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should initialize with correct endpoints", () => {
		renderHook(() => useOpenAIAuth());

		expect(useAuthBase).toHaveBeenCalledWith(
			{
				statusEndpoint: "/api/auth/openai/status",
				loginEndpoint: "/api/auth/openai/login",
				logoutEndpoint: "/api/auth/openai/logout",
				provider: "openai",
			},
			{
				authenticated: false,
				loading: true,
			}
		);
	});

	it("should return all base auth properties plus refreshToken", () => {
		const { result } = renderHook(() => useOpenAIAuth());

		expect(result.current).toMatchObject({
			authenticated: false,
			loading: true,
			login: expect.any(Function),
			logout: expect.any(Function),
			refresh: expect.any(Function),
			refreshToken: expect.any(Function),
		});
	});

	describe("refreshToken", () => {
		it("should call refresh endpoint and update auth state", async () => {
			const { result } = renderHook(() => useOpenAIAuth());

			await act(async () => {
				await result.current.refreshToken();
			});

			expect(global.fetch).toHaveBeenCalledWith("/api/auth/openai/refresh", {
				method: "POST",
			});
			expect(mockBaseAuth.refresh).toHaveBeenCalled();
		});

		it("should handle refresh errors", async () => {
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const fetchMock = vi.mocked(global.fetch);
			fetchMock.mockResolvedValueOnce({
				ok: false,
				status: 401,
			});

			const { result } = renderHook(() => useOpenAIAuth());

			await act(async () => {
				await result.current.refreshToken();
			});

			expect(consoleSpy).toHaveBeenCalledWith("Token refresh failed:", expect.any(Error));
			expect(mockBaseAuth.refresh).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it("should handle network errors", async () => {
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const networkError = new Error("Network error");
			const fetchMock = vi.mocked(global.fetch);
			fetchMock.mockRejectedValueOnce(networkError);

			const { result } = renderHook(() => useOpenAIAuth());

			await act(async () => {
				await result.current.refreshToken();
			});

			expect(consoleSpy).toHaveBeenCalledWith("Token refresh failed:", networkError);
			expect(mockBaseAuth.refresh).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe("auto-refresh", () => {
		it("should not set up auto-refresh when not authenticated", () => {
			renderHook(() => useOpenAIAuth());

			// Advance time
			act(() => {
				vi.advanceTimersByTime(60_000);
			});

			expect(global.fetch).not.toHaveBeenCalled();
		});

		it("should not set up auto-refresh without expires_at", () => {
			(useAuthBase as any).mockReturnValue({
				...mockBaseAuth,
				authenticated: true,
				hasRefreshToken: true,
				expires_at: undefined,
			});

			renderHook(() => useOpenAIAuth());

			// Advance time
			act(() => {
				vi.advanceTimersByTime(60_000);
			});

			expect(global.fetch).not.toHaveBeenCalled();
		});

		it("should not set up auto-refresh without refresh token", () => {
			(useAuthBase as any).mockReturnValue({
				...mockBaseAuth,
				authenticated: true,
				hasRefreshToken: false,
				expires_at: Date.now() + 120_000,
			});

			renderHook(() => useOpenAIAuth());

			// Advance time
			act(() => {
				vi.advanceTimersByTime(60_000);
			});

			expect(global.fetch).not.toHaveBeenCalled();
		});

		it("should set up auto-refresh 60 seconds before expiry", async () => {
			const expiresAt = Date.now() + 120_000; // 2 minutes from now

			(useAuthBase as any).mockReturnValue({
				...mockBaseAuth,
				authenticated: true,
				hasRefreshToken: true,
				expires_at: expiresAt,
			});

			renderHook(() => useOpenAIAuth());

			// Should not refresh immediately
			expect(global.fetch).not.toHaveBeenCalled();

			// Advance to 59 seconds before expiry
			act(() => {
				vi.advanceTimersByTime(59_000);
			});
			expect(global.fetch).not.toHaveBeenCalled();

			// Advance to 60 seconds before expiry
			act(() => {
				vi.advanceTimersByTime(1000);
			});

			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalledWith("/api/auth/openai/refresh", {
					method: "POST",
				});
			});
		});

		it("should handle already expired tokens", async () => {
			const expiresAt = Date.now() - 10_000; // Already expired

			(useAuthBase as any).mockReturnValue({
				...mockBaseAuth,
				authenticated: true,
				hasRefreshToken: true,
				expires_at: expiresAt,
			});

			renderHook(() => useOpenAIAuth());

			// Should not attempt refresh for already expired tokens
			act(() => {
				vi.advanceTimersByTime(1000);
			});

			expect(global.fetch).not.toHaveBeenCalled();
		});

		it("should clean up timeout on unmount", () => {
			const expiresAt = Date.now() + 120_000;

			(useAuthBase as any).mockReturnValue({
				...mockBaseAuth,
				authenticated: true,
				hasRefreshToken: true,
				expires_at: expiresAt,
			});

			const { unmount } = renderHook(() => useOpenAIAuth());

			unmount();

			// Advance time past when refresh would occur
			act(() => {
				vi.advanceTimersByTime(120_000);
			});

			// Should not have called refresh after unmount
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it("should update timeout when expires_at changes", async () => {
			const initialExpiresAt = Date.now() + 120_000;
			const updatedExpiresAt = Date.now() + 240_000;

			const mockAuth = {
				...mockBaseAuth,
				authenticated: true,
				hasRefreshToken: true,
				expires_at: initialExpiresAt,
			};

			(useAuthBase as any).mockReturnValue(mockAuth);

			const { rerender } = renderHook(() => useOpenAIAuth());

			// Update expires_at
			mockAuth.expires_at = updatedExpiresAt;
			rerender();

			// Advance to when first refresh would have occurred
			act(() => {
				vi.advanceTimersByTime(60_000);
			});

			// Should not have refreshed yet
			expect(global.fetch).not.toHaveBeenCalled();

			// Advance to new refresh time (180 seconds from start)
			act(() => {
				vi.advanceTimersByTime(120_000);
			});

			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalledWith("/api/auth/openai/refresh", {
					method: "POST",
				});
			});
		});
	});

	it("should include user data when available", () => {
		const userData = {
			email: "test@example.com",
			organization_id: "org-123",
			credits_granted: 100,
			created_at: Date.now(),
		};

		(useAuthBase as any).mockReturnValue({
			...mockBaseAuth,
			authenticated: true,
			loading: false,
			user: userData,
		});

		const { result } = renderHook(() => useOpenAIAuth());

		expect(result.current.user).toEqual(userData);
	});
});
