// Mock the CodexAuthenticator class
const mockCodexAuthenticator = {
	isAuthenticated: vi.fn(),
	loadAuthConfig: vi.fn(),
};

vi.mock("@/lib/auth/openai-codex", () => ({
	CodexAuthenticator: vi.fn(() => mockCodexAuthenticator),
}));

// Mock NextResponse
const mockNextResponse = {
	json: vi.fn((data, options) => ({
		json: () => Promise.resolve(data),
		status: options?.status || 200,
		...data,
	})),
};

vi.mock("next/server", () => ({
	NextResponse: mockNextResponse,
}));

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { vi } from "vitest";
import { GET } from "@/app/api/auth/openai/status/route";

describe("GET /api/auth/openai/status", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
describe('GET /api/auth/openai/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

	it("should return authenticated status with valid config", async () => {
		const mockConfig = {
			user_email: "test@example.com",
			organization_id: "org-123",
			credits_granted: 1000,
			created_at: Date.now(),
			expires_at: Date.now() + 3_600_000,
			refresh_token: "refresh-token",
		};

		mockCodexAuthenticator.isAuthenticated.mockResolvedValue(true);
		mockCodexAuthenticator.loadAuthConfig.mockResolvedValue(mockConfig);

		const _response = await GET();

		expect(mockCodexAuthenticator.isAuthenticated).toHaveBeenCalled();
		expect(mockCodexAuthenticator.loadAuthConfig).toHaveBeenCalled();
		expect(mockNextResponse.json).toHaveBeenCalledWith({
			authenticated: true,
			user: {
				email: mockConfig.user_email,
				organization_id: mockConfig.organization_id,
				credits_granted: mockConfig.credits_granted,
				created_at: mockConfig.created_at,
			},
			expires_at: mockConfig.expires_at,
			hasRefreshToken: true,
		});
	});

	it("should return unauthenticated status when not authenticated", async () => {
		mockCodexAuthenticator.isAuthenticated.mockResolvedValue(false);

		const _response = await GET();

		expect(mockCodexAuthenticator.isAuthenticated).toHaveBeenCalled();
		expect(mockNextResponse.json).toHaveBeenCalledWith({
			authenticated: false,
		});
	});

	it("should handle authentication check error", async () => {
		mockCodexAuthenticator.isAuthenticated.mockRejectedValue(
			new Error("Auth check failed"),
		);

		const _response = await GET();

		expect(mockCodexAuthenticator.isAuthenticated).toHaveBeenCalled();
		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{
				authenticated: false,
				error: "Auth check failed",
			},
			{ status: 500 },
		);
	});

	it("should handle config loading error", async () => {
		mockCodexAuthenticator.isAuthenticated.mockResolvedValue(true);
		mockCodexAuthenticator.loadAuthConfig.mockRejectedValue(
			new Error("Config load failed"),
		);

		const _response = await GET();

		expect(mockCodexAuthenticator.isAuthenticated).toHaveBeenCalled();
		expect(mockCodexAuthenticator.loadAuthConfig).toHaveBeenCalled();
		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{
				authenticated: false,
				error: "Config load failed",
			},
			{ status: 500 },
		);
	});

	it("should handle config without refresh token", async () => {
		const mockConfig = {
			user_email: "test@example.com",
			organization_id: "org-123",
			credits_granted: 1000,
			created_at: Date.now(),
			expires_at: Date.now() + 3_600_000,
			// no refresh_token
		};

		mockCodexAuthenticator.isAuthenticated.mockResolvedValue(true);
		mockCodexAuthenticator.loadAuthConfig.mockResolvedValue(mockConfig);

		const _response = await GET();

		expect(mockNextResponse.json).toHaveBeenCalledWith({
			authenticated: true,
			user: {
				email: mockConfig.user_email,
				organization_id: mockConfig.organization_id,
				credits_granted: mockConfig.credits_granted,
				created_at: mockConfig.created_at,
			},
			expires_at: mockConfig.expires_at,
			hasRefreshToken: false,
		});
	});

	it("should handle null config", async () => {
		mockCodexAuthenticator.isAuthenticated.mockResolvedValue(true);
		mockCodexAuthenticator.loadAuthConfig.mockResolvedValue(null);

		const _response = await GET();

		expect(mockNextResponse.json).toHaveBeenCalledWith({
			authenticated: true,
			user: {
				email: undefined,
				organization_id: undefined,
				credits_granted: undefined,
				created_at: undefined,
			},
			expires_at: undefined,
			hasRefreshToken: false,
		});
	});
});
