import { act, renderHook } from "@testing-library/react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	spyOn,
	test,
	vi,
} from "vitest";
import { useAnthropicAuthRefactored } from "./use-anthropic-auth-refactored";

// Mock the base auth hook
const mockUseAuthBase = {
	state: {
		authenticated: false,
		loading: false,
		error: null,
		user: null,
		token: null,
	},
	actions: {
		login: vi.fn(),
		logout: vi.fn(),
		refresh: vi.fn(),
		checkAuth: vi.fn(),
		clearError: vi.fn(),
	},
};

vi.mock("./use-auth-base", () => ({
	useAuthBase: () => mockUseAuthBase,
}));

// Mock environment variables
vi.mock("@/lib/env", () => ({
	env: {
		ANTHROPIC_CLIENT_ID: "test-anthropic-client-id",
		ANTHROPIC_API_URL: "https://api.anthropic.com",
		ANTHROPIC_AUTH_URL: "https://auth.anthropic.com",
		ANTHROPIC_REDIRECT_URI: "https://app.example.com/auth/anthropic/callback",
	},
}));

describe("useAnthropicAuthRefactored", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mock state
		mockUseAuthBase.state = {
			authenticated: false,
			loading: false,
			error: null,
			user: null,
			token: null,
		};
	});

	it("should initialize with base auth state", () => {
		const { result } = renderHook(() => useAnthropicAuthRefactored());

		expect(result.current.authenticated).toBe(false);
		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBeNull();
		expect(result.current.user).toBeNull();
	});

	it("should return authenticated state with Claude-specific features", () => {
		mockUseAuthBase.state = {
			authenticated: true,
			loading: false,
			error: null,
			user: {
				id: "user-456",
				email: "test@anthropic.com",
				name: "Claude User",
				organization_id: "org-anthropic-123",
				claude_pro: true,
				model_access: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
				usage_tier: "professional",
			},
			token: {
				access_token: "anthropic-token",
				refresh_token: "anthropic-refresh",
				expires_at: Date.now() + 3_600_000,
			},
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		expect(result.current.authenticated).toBe(true);
		expect(result.current.user?.claude_pro).toBe(true);
		expect(result.current.user?.model_access).toContain("claude-3-opus");
		expect(result.current.user?.usage_tier).toBe("professional");
	});

	it("should handle login with Claude-specific parameters", async () => {
		const { result } = renderHook(() => useAnthropicAuthRefactored());

		await act(async () => {
			await result.current.login({
				scope: "claude:read claude:write model:claude-3-opus",
				model_request: "claude-3-opus",
				usage_tier_request: "professional",
			});
		});

		expect(mockUseAuthBase.actions.login).toHaveBeenCalledWith(
			expect.objectContaining({
				scope: "claude:read claude:write model:claude-3-opus",
				model_request: "claude-3-opus",
				usage_tier_request: "professional",
			}),
		);
	});

	it("should check Claude model access", () => {
		mockUseAuthBase.state = {
			authenticated: true,
			user: {
				model_access: ["claude-3-opus", "claude-3-sonnet", "claude-instant"],
			},
			token: { access_token: "test-token" },
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		expect(result.current.hasClaudeModelAccess("claude-3-opus")).toBe(true);
		expect(result.current.hasClaudeModelAccess("claude-3-sonnet")).toBe(true);
		expect(result.current.hasClaudeModelAccess("claude-3-haiku")).toBe(false);
	});

	it("should get available Claude models", () => {
		mockUseAuthBase.state = {
			authenticated: true,
			user: {
				model_access: [
					"claude-3-opus",
					"claude-3-sonnet",
					"claude-instant-1.2",
				],
			},
			token: { access_token: "test-token" },
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		const models = result.current.getAvailableClaudeModels();
		expect(models).toHaveLength(3);
		expect(models).toContain("claude-3-opus");
		expect(models).toContain("claude-instant-1.2");
	});

	it("should check Claude Pro status", () => {
		mockUseAuthBase.state = {
			authenticated: true,
			user: {
				claude_pro: true,
				pro_features: {
					priority_access: true,
					extended_context: true,
					advanced_reasoning: true,
				},
			},
			token: { access_token: "test-token" },
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		expect(result.current.isClaudePro()).toBe(true);
		expect(result.current.getProFeatures()).toEqual({
			priority_access: true,
			extended_context: true,
			advanced_reasoning: true,
		});
	});

	it("should handle usage tier information", () => {
		mockUseAuthBase.state = {
			authenticated: true,
			user: {
				usage_tier: "professional",
				tier_limits: {
					requests_per_minute: 100,
					tokens_per_minute: 500_000,
					context_window: 200_000,
				},
			},
			token: { access_token: "test-token" },
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		expect(result.current.getUsageTier()).toBe("professional");
		expect(result.current.getTierLimits()).toEqual({
			requests_per_minute: 100,
			tokens_per_minute: 500_000,
			context_window: 200_000,
		});
	});

	it("should handle Constitutional AI preferences", () => {
		mockUseAuthBase.state = {
			authenticated: true,
			user: {
				constitutional_ai_preferences: {
					helpfulness: "high",
					harmlessness: "strict",
					honesty: "balanced",
					custom_constitution: true,
				},
			},
			token: { access_token: "test-token" },
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		const prefs = result.current.getConstitutionalAIPreferences();
		expect(prefs.helpfulness).toBe("high");
		expect(prefs.harmlessness).toBe("strict");
		expect(prefs.custom_constitution).toBe(true);
	});

	it("should update Constitutional AI preferences", async () => {
		mockUseAuthBase.state.authenticated = true;

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		await act(async () => {
			await result.current.updateConstitutionalAIPreferences({
				helpfulness: "balanced",
				harmlessness: "moderate",
				honesty: "high",
			});
		});

		expect(mockUseAuthBase.actions.login).toHaveBeenCalledWith(
			expect.objectContaining({
				constitutional_ai_preferences: {
					helpfulness: "balanced",
					harmlessness: "moderate",
					honesty: "high",
				},
			}),
		);
	});

	it("should handle Claude API key authentication", async () => {
		const { result } = renderHook(() => useAnthropicAuthRefactored());

		await act(async () => {
			await result.current.authenticateWithClaudeAPIKey("sk-ant-test-key");
		});

		expect(mockUseAuthBase.actions.login).toHaveBeenCalledWith(
			expect.objectContaining({
				api_key: "sk-ant-test-key",
				auth_type: "api_key",
				provider: "anthropic",
			}),
		);
	});

	it("should validate Claude API key format", () => {
		const { result } = renderHook(() => useAnthropicAuthRefactored());

		expect(result.current.isValidClaudeAPIKey("sk-ant-api-key")).toBe(true);
		expect(result.current.isValidClaudeAPIKey("invalid-key")).toBe(false);
		expect(result.current.isValidClaudeAPIKey("sk-test")).toBe(false);
		expect(result.current.isValidClaudeAPIKey("")).toBe(false);
	});

	it("should get Claude usage statistics", () => {
		mockUseAuthBase.state = {
			authenticated: true,
			user: {
				claude_usage: {
					total_tokens: 1_000_000,
					total_conversations: 500,
					tokens_this_month: 250_000,
					conversations_this_month: 150,
					average_conversation_length: 2000,
				},
			},
			token: { access_token: "test-token" },
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		const usage = result.current.getClaudeUsageStatistics();
		expect(usage.total_tokens).toBe(1_000_000);
		expect(usage.conversations_this_month).toBe(150);
		expect(usage.average_conversation_length).toBe(2000);
	});

	it("should handle research preview features", () => {
		mockUseAuthBase.state = {
			authenticated: true,
			user: {
				research_preview_access: true,
				preview_features: ["computer-use", "multi-modal", "advanced-tool-use"],
			},
			token: { access_token: "test-token" },
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		expect(result.current.hasResearchPreviewAccess()).toBe(true);
		expect(result.current.getPreviewFeatures()).toContain("computer-use");
		expect(result.current.hasPreviewFeature("multi-modal")).toBe(true);
	});

	it("should handle workspace management", () => {
		mockUseAuthBase.state = {
			authenticated: true,
			user: {
				workspaces: [
					{ id: "ws-1", name: "Personal", role: "owner" },
					{ id: "ws-2", name: "Team", role: "admin" },
					{ id: "ws-3", name: "Client", role: "member" },
				],
				current_workspace_id: "ws-2",
			},
			token: { access_token: "test-token" },
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		const workspaces = result.current.getWorkspaces();
		expect(workspaces).toHaveLength(3);

		const currentWorkspace = result.current.getCurrentWorkspace();
		expect(currentWorkspace?.id).toBe("ws-2");
		expect(currentWorkspace?.name).toBe("Team");
	});

	it("should switch workspaces", async () => {
		mockUseAuthBase.state = {
			authenticated: true,
			user: {
				workspaces: [
					{ id: "ws-1", name: "Personal", role: "owner" },
					{ id: "ws-2", name: "Team", role: "admin" },
				],
				current_workspace_id: "ws-1",
			},
			token: { access_token: "test-token" },
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		await act(async () => {
			await result.current.switchWorkspace("ws-2");
		});

		expect(mockUseAuthBase.actions.login).toHaveBeenCalledWith(
			expect.objectContaining({
				workspace_id: "ws-2",
			}),
		);
	});

	it("should handle rate limiting information", () => {
		mockUseAuthBase.state = {
			authenticated: true,
			user: {
				rate_limits: {
					claude_3_opus: {
						rpm: 50,
						tpm: 100_000,
						context_window: 200_000,
					},
					claude_3_sonnet: {
						rpm: 100,
						tpm: 200_000,
						context_window: 200_000,
					},
				},
			},
			token: { access_token: "test-token" },
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		const opusLimits = result.current.getModelRateLimits("claude-3-opus");
		expect(opusLimits?.rpm).toBe(50);
		expect(opusLimits?.context_window).toBe(200_000);

		const sonnetLimits = result.current.getModelRateLimits("claude-3-sonnet");
		expect(sonnetLimits?.rpm).toBe(100);
	});

	it("should handle Claude Projects integration", () => {
		mockUseAuthBase.state = {
			authenticated: true,
			user: {
				projects: [
					{ id: "proj-1", name: "AI Assistant", created_at: "2024-01-01" },
					{ id: "proj-2", name: "Code Generator", created_at: "2024-02-01" },
				],
				active_project_id: "proj-1",
			},
			token: { access_token: "test-token" },
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		const projects = result.current.getProjects();
		expect(projects).toHaveLength(2);

		const activeProject = result.current.getActiveProject();
		expect(activeProject?.id).toBe("proj-1");
		expect(activeProject?.name).toBe("AI Assistant");
	});

	it("should handle prompt caching preferences", () => {
		mockUseAuthBase.state = {
			authenticated: true,
			user: {
				prompt_caching: {
					enabled: true,
					max_cache_size: 1000,
					cache_ttl: 3600,
					cached_prompts: 25,
				},
			},
			token: { access_token: "test-token" },
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		const caching = result.current.getPromptCachingSettings();
		expect(caching.enabled).toBe(true);
		expect(caching.max_cache_size).toBe(1000);
		expect(caching.cached_prompts).toBe(25);
	});

	it("should handle error states specific to Anthropic", () => {
		mockUseAuthBase.state = {
			authenticated: false,
			loading: false,
			error: "Claude Pro subscription required",
			user: null,
			token: null,
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		expect(result.current.error).toBe("Claude Pro subscription required");
		expect(result.current.authenticated).toBe(false);
	});

	it("should check feature availability based on tier", () => {
		mockUseAuthBase.state = {
			authenticated: true,
			user: {
				usage_tier: "free",
				claude_pro: false,
			},
			token: { access_token: "test-token" },
		};

		const { result } = renderHook(() => useAnthropicAuthRefactored());

		expect(result.current.canAccessFeature("priority_access")).toBe(false);
		expect(result.current.canAccessFeature("basic_chat")).toBe(true);
	});
});
