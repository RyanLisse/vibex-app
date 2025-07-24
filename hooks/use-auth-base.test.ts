import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, spyOn, test, vi } from "vitest";
import { useAuthBase } from "./use-auth-base";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = {
	href: "",
};
Object.defineProperty(window, "location", {
	value: mockLocation,
	writable: true,
});

describe("useAuthBase", () => {
	const mockConfig = {
		statusEndpoint: "/api/auth/status",
		loginEndpoint: "/api/auth/login",
		logoutEndpoint: "/api/auth/logout",
		authorizeEndpoint: "/api/auth/authorize",
	};

	const mockInitialState = {
		authenticated: false,
		loading: true,
		error: undefined,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockLocation.href = "";
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize with initial state", () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ authenticated: false, loading: false }),
		});

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		expect(result.current.authenticated).toBe(false);
		expect(result.current.loading).toBe(true);
		expect(result.current.error).toBeUndefined();
	});

	it("should check auth status on mount", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ authenticated: true, loading: false }),
		});

		renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith("/api/auth/status");
		});
	});

	it("should update state after successful status check", async () => {
		const mockResponse = {
			authenticated: true,
			loading: false,
			user: { email: "test@example.com" },
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(true);
			expect(result.current.loading).toBe(false);
			expect(result.current.user).toEqual({ email: "test@example.com" });
		});
	});

	it("should handle failed status check", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 401,
		});

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(false);
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBe("Failed to check auth status");
		});
	});

	it("should handle network error during status check", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Network error"));

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(false);
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBe("Network error");
		});
	});

	it("should handle successful logout", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ authenticated: true, loading: false }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: true }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ authenticated: false, loading: false }),
			});

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(true);
		});

		await act(async () => {
			await result.current.logout();
		});

		expect(mockFetch).toHaveBeenCalledWith("/api/auth/logout", {
			method: "POST",
		});

		await waitFor(() => {
			expect(result.current.authenticated).toBe(false);
		});
	});

	it("should handle failed logout", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ authenticated: true, loading: false }),
			})
			.mockResolvedValueOnce({
				ok: false,
				status: 400,
			});

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(true);
		});

		await act(async () => {
			await result.current.logout();
		});

		expect(result.current.error).toBe("Failed to logout");
		expect(result.current.authenticated).toBe(true);
	});

	it("should handle login with loginEndpoint", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ authenticated: false, loading: false }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: true }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ authenticated: true, loading: false }),
			});

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(false);
		});

		await act(async () => {
			await result.current.login();
		});

		expect(mockFetch).toHaveBeenCalledWith("/api/auth/login", {
			method: "POST",
		});

		await waitFor(() => {
			expect(result.current.authenticated).toBe(true);
		});
	});

	it("should handle login failure with loginEndpoint", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ authenticated: false, loading: false }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: false, error: "Invalid credentials" }),
			});

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(false);
		});

		await act(async () => {
			try {
				await result.current.login();
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toBe("Invalid credentials");
			}
		});

		expect(result.current.error).toBe("Invalid credentials");
	});

	it("should handle login with authorizeEndpoint", async () => {
		const configWithAuthorize = {
			...mockConfig,
			loginEndpoint: undefined,
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ authenticated: false, loading: false }),
		});

		const { result } = renderHook(() => useAuthBase(configWithAuthorize, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(false);
		});

		act(() => {
			result.current.login();
		});

		expect(mockLocation.href).toBe("/api/auth/authorize");
	});

	it("should handle login with authorizeEndpoint and params", async () => {
		const configWithAuthorize = {
			...mockConfig,
			loginEndpoint: undefined,
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ authenticated: false, loading: false }),
		});

		const { result } = renderHook(() => useAuthBase(configWithAuthorize, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(false);
		});

		act(() => {
			result.current.login({ mode: "max", redirect: "/dashboard" });
		});

		expect(mockLocation.href).toBe("/api/auth/authorize?mode=max&redirect=%2Fdashboard");
	});

	it("should handle refresh (checkAuthStatus)", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ authenticated: false, loading: false }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ authenticated: true, loading: false }),
			});

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(false);
		});

		await act(async () => {
			await result.current.refresh();
		});

		expect(result.current.authenticated).toBe(true);
	});

	it("should handle network error during login", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ authenticated: false, loading: false }),
			})
			.mockRejectedValueOnce(new Error("Network error"));

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(false);
		});

		await act(async () => {
			try {
				await result.current.login();
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toBe("Network error");
			}
		});

		expect(result.current.error).toBe("Network error");
	});

	it("should handle login success with message instead of error", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ authenticated: false, loading: false }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: false, message: "Custom message" }),
			});

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(false);
		});

		await act(async () => {
			try {
				await result.current.login();
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toBe("Custom message");
			}
		});

		expect(result.current.error).toBe("Custom message");
	});

	it("should handle unknown error types", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ authenticated: false, loading: false }),
			})
			.mockRejectedValueOnce("String error");

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(false);
		});

		await act(async () => {
			try {
				await result.current.login();
			} catch (error) {
				expect(error).toBe("String error");
			}
		});

		expect(result.current.error).toBe("Login failed");
	});

	it("should preserve additional state properties", async () => {
		const extendedInitialState = {
			...mockInitialState,
			user: { email: "test@example.com" },
			customProperty: "test",
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				authenticated: true,
				loading: false,
				user: { email: "updated@example.com" },
				customProperty: "updated",
			}),
		});

		const { result } = renderHook(() => useAuthBase(mockConfig, extendedInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(true);
			expect(result.current.user).toEqual({ email: "updated@example.com" });
			expect(result.current.customProperty).toBe("updated");
		});
	});

	it("should handle logout network error", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ authenticated: true, loading: false }),
			})
			.mockRejectedValueOnce(new Error("Network error during logout"));

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(true);
		});

		await act(async () => {
			await result.current.logout();
		});

		expect(result.current.error).toBe("Network error during logout");
	});

	it("should handle logout unknown error", async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ authenticated: true, loading: false }),
			})
			.mockRejectedValueOnce("Unknown error");

		const { result } = renderHook(() => useAuthBase(mockConfig, mockInitialState));

		await waitFor(() => {
			expect(result.current.authenticated).toBe(true);
		});

		await act(async () => {
			await result.current.logout();
		});

		expect(result.current.error).toBe("Logout failed");
	});
});
