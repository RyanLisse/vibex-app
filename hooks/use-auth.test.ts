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
import { useAuth } from "@/hooks/use-auth";

// Mock the individual auth hooks
const mockUseOpenAIAuth = vi.fn();
const mockUseAnthropicAuth = vi.fn();
const mockUseGitHubAuth = vi.fn();

vi.mock("./use-openai-auth", () => ({
	useOpenAIAuth: () => mockUseOpenAIAuth(),
}));

vi.mock("./use-anthropic-auth", () => ({
	useAnthropicAuth: () => mockUseAnthropicAuth(),
}));

vi.mock("./use-github-auth", () => ({
	useGitHubAuth: () => mockUseGitHubAuth(),
}));

describe("useAuth", () => {
	const mockOpenAILogin = vi.fn();
	const mockOpenAILogout = vi.fn();
	const mockAnthropicLogin = vi.fn();
	const mockAnthropicLogout = vi.fn();
	const mockGitHubLogin = vi.fn();
	const mockGitHubLogout = vi.fn();

<<<<<<< HEAD
	beforeEach(() => {
		vi.clearAllMocks();
=======
  beforeEach(() => {
    vi.clearAllMocks()
>>>>>>> ryan-lisse/review-this-pr

		// Default mock implementations
		mockUseOpenAIAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			error: null,
			user: null,
			login: mockOpenAILogin,
			logout: mockOpenAILogout,
		});

		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			error: null,
			user: null,
			login: mockAnthropicLogin,
			logout: mockAnthropicLogout,
		});

		mockUseGitHubAuth.mockReturnValue({
			isAuthenticated: false,
			isLoading: false,
			error: null,
			user: null,
			login: mockGitHubLogin,
			logout: mockGitHubLogout,
		});
	});

	it("should initialize with no authenticated providers", () => {
		const { result } = renderHook(() => useAuth());

		expect(result.current.isAuthenticated).toBe(false);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
		expect(result.current.providers.openai.authenticated).toBe(false);
		expect(result.current.providers.anthropic.authenticated).toBe(false);
		expect(result.current.providers.github.authenticated).toBe(false);
	});

	it("should return authenticated when any provider is authenticated", () => {
		mockUseOpenAIAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			error: null,
			user: { email: "user@openai.com" },
			login: mockOpenAILogin,
			logout: mockOpenAILogout,
		});

		const { result } = renderHook(() => useAuth());

		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.providers.openai.authenticated).toBe(true);
	});

	it("should handle multiple authenticated providers", () => {
		mockUseOpenAIAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			error: null,
			user: { email: "user@openai.com" },
			login: mockOpenAILogin,
			logout: mockOpenAILogout,
		});

		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			error: null,
			user: { email: "user@anthropic.com" },
			login: mockAnthropicLogin,
			logout: mockAnthropicLogout,
		});

		const { result } = renderHook(() => useAuth());

		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.providers.openai.authenticated).toBe(true);
		expect(result.current.providers.anthropic.authenticated).toBe(true);
		expect(result.current.authenticatedProviders).toEqual([
			"openai",
			"anthropic",
		]);
	});

	it("should handle loading states", () => {
		mockUseOpenAIAuth.mockReturnValue({
			authenticated: false,
			loading: true,
			error: null,
			user: null,
			login: mockOpenAILogin,
			logout: mockOpenAILogout,
		});

		const { result } = renderHook(() => useAuth());

		expect(result.current.isLoading).toBe(true);
		expect(result.current.providers.openai.loading).toBe(true);
	});

	it("should aggregate errors from all providers", () => {
		mockUseOpenAIAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			error: "OpenAI auth failed",
			user: null,
			login: mockOpenAILogin,
			logout: mockOpenAILogout,
		});

		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			error: "Anthropic auth failed",
			user: null,
			login: mockAnthropicLogin,
			logout: mockAnthropicLogout,
		});

		const { result } = renderHook(() => useAuth());

		expect(result.current.error).toEqual({
			openai: "OpenAI auth failed",
			anthropic: "Anthropic auth failed",
		});
	});

	it("should login to specific provider", async () => {
		const { result } = renderHook(() => useAuth());

		await act(async () => {
			await result.current.login("openai");
		});

		expect(mockOpenAILogin).toHaveBeenCalledTimes(1);
		expect(mockAnthropicLogin).not.toHaveBeenCalled();
	});

	it("should logout from specific provider", async () => {
		mockUseOpenAIAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			error: null,
			user: { email: "user@openai.com" },
			login: mockOpenAILogin,
			logout: mockOpenAILogout,
		});

		const { result } = renderHook(() => useAuth());

		await act(async () => {
			await result.current.logout("openai");
		});

		expect(mockOpenAILogout).toHaveBeenCalledTimes(1);
	});

	it("should logout from all providers", async () => {
		mockUseOpenAIAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			error: null,
			user: { email: "user@openai.com" },
			login: mockOpenAILogin,
			logout: mockOpenAILogout,
		});

		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			error: null,
			user: { email: "user@anthropic.com" },
			login: mockAnthropicLogin,
			logout: mockAnthropicLogout,
		});

		const { result } = renderHook(() => useAuth());

		await act(async () => {
			await result.current.logoutAll();
		});

		expect(mockOpenAILogout).toHaveBeenCalledTimes(1);
		expect(mockAnthropicLogout).toHaveBeenCalledTimes(1);
	});

	it("should get current user from first authenticated provider", () => {
		mockUseOpenAIAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			error: null,
			user: null,
			login: mockOpenAILogin,
			logout: mockOpenAILogout,
		});

		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			error: null,
			user: { email: "user@anthropic.com", name: "Test User" },
			login: mockAnthropicLogin,
			logout: mockAnthropicLogout,
		});

		const { result } = renderHook(() => useAuth());

		expect(result.current.currentUser).toEqual({
			email: "user@anthropic.com",
			name: "Test User",
		});
	});

	it("should handle provider-specific operations", async () => {
		const { result } = renderHook(() => useAuth());

		// Test OpenAI specific methods
		await act(async () => {
			await result.current.providers.openai.login();
		});
		expect(mockOpenAILogin).toHaveBeenCalled();

		// Test Anthropic specific methods
		await act(async () => {
			await result.current.providers.anthropic.login();
		});
		expect(mockAnthropicLogin).toHaveBeenCalled();

		// Test GitHub specific methods
		await act(async () => {
			await result.current.providers.github.login();
		});
		expect(mockGitHubLogin).toHaveBeenCalled();
	});

	it("should handle invalid provider names", async () => {
		const { result } = renderHook(() => useAuth());

		await expect(
			act(async () => {
				await result.current.login("invalid" as any);
			}),
		).rejects.toThrow("Invalid provider: invalid");
	});

	it("should check if specific provider is authenticated", () => {
		mockUseOpenAIAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			error: null,
			user: { email: "user@openai.com" },
			login: mockOpenAILogin,
			logout: mockOpenAILogout,
		});

		const { result } = renderHook(() => useAuth());

		expect(result.current.isProviderAuthenticated("openai")).toBe(true);
		expect(result.current.isProviderAuthenticated("anthropic")).toBe(false);
		expect(result.current.isProviderAuthenticated("github")).toBe(false);
	});

	it("should handle authentication state changes", () => {
		const { result, rerender } = renderHook(() => useAuth());

		expect(result.current.isAuthenticated).toBe(false);

		// Simulate OpenAI authentication
		mockUseOpenAIAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			error: null,
			user: { email: "user@openai.com" },
			login: mockOpenAILogin,
			logout: mockOpenAILogout,
		});

		rerender();

		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.authenticatedProviders).toContain("openai");
	});

	it("should handle concurrent provider operations", async () => {
		const { result } = renderHook(() => useAuth());

		await act(async () => {
			await Promise.all([
				result.current.login("openai"),
				result.current.login("anthropic"),
				result.current.login("github"),
			]);
		});

		expect(mockOpenAILogin).toHaveBeenCalledTimes(1);
		expect(mockAnthropicLogin).toHaveBeenCalledTimes(1);
		expect(mockGitHubLogin).toHaveBeenCalledTimes(1);
	});

	it("should handle provider errors gracefully", async () => {
		mockOpenAILogin.mockRejectedValue(new Error("OpenAI login failed"));

		const { result } = renderHook(() => useAuth());

		await expect(
			act(async () => {
				await result.current.login("openai");
			}),
		).rejects.toThrow("OpenAI login failed");
	});

	it("should provide consolidated user info", () => {
		mockUseOpenAIAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			error: null,
			user: {
				email: "user@openai.com",
				organization_id: "org-123",
			},
			login: mockOpenAILogin,
			logout: mockOpenAILogout,
		});

		mockUseGitHubAuth.mockReturnValue({
			isAuthenticated: true,
			isLoading: false,
			error: null,
			user: {
				login: "githubuser",
				email: "user@github.com",
				avatar_url: "https://github.com/avatar.jpg",
			},
			login: mockGitHubLogin,
			logout: mockGitHubLogout,
		});

		const { result } = renderHook(() => useAuth());

		expect(result.current.consolidatedUserInfo).toEqual({
			openai: {
				email: "user@openai.com",
				organization_id: "org-123",
			},
			github: {
				login: "githubuser",
				email: "user@github.com",
				avatar_url: "https://github.com/avatar.jpg",
			},
		});
	});
});
