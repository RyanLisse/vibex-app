import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	AUTH_TEST_SCENARIOS,
	AuthCallbackAssertions,
	type AuthTestContext,
	createAuthCallbackTestSuite,
	createMockCallbackRequest,
	MOCK_OAUTH_RESPONSES,
	resetAuthMocks,
	setupAuthTestMocks,
} from "@/lib/test-utils/auth-test-helpers";
import { GET } from "./route";

// Mock the authentication utilities
vi.mock("@/lib/auth/openai-codex", () => ({
	exchangeCodeForToken: vi.fn(),
	validateOAuthState: vi.fn(),
	sanitizeRedirectUrl: vi.fn(),
	handleAuthError: vi.fn(),
}));

// Mock NextResponse
vi.mock("next/server", async () => {
	const actual = await vi.importActual("next/server");
	return {
		...actual,
		NextResponse: {
			json: vi.fn(),
			redirect: vi.fn(),
		},
	};
});

// Mock environment variables
vi.mock("@/lib/env", () => ({
	env: {
		OPENAI_CLIENT_ID: "test-client-id",
		OPENAI_CLIENT_SECRET: "test-client-secret",
		OPENAI_REDIRECT_URI: "https://app.example.com/auth/openai/callback",
		OPENAI_TOKEN_URL: "https://auth.openai.com/oauth/token",
		NEXTAUTH_URL: "https://app.example.com",
	},
}));

const { NextResponse } = await import("next/server");
const mockNextResponse = NextResponse as any;

// Declare missing mock variables
let mockExchangeCodeForToken: any;
let mockSanitizeRedirectUrl: any;
let mockHandleAuthError: any;

describe("GET /api/auth/openai/callback", () => {
	let authMocks: AuthTestContext;

	beforeEach(() => {
		vi.clearAllMocks();
		authMocks = setupAuthTestMocks();

		// Assign mock variables from authMocks
		mockExchangeCodeForToken = authMocks.mockExchangeCodeForToken;
		mockSanitizeRedirectUrl = authMocks.mockSanitizeRedirectUrl;
		mockHandleAuthError = authMocks.mockHandleAuthError;
	});

	afterEach(() => {
		resetAuthMocks(authMocks);
	});

	it(AUTH_TEST_SCENARIOS.VALID_CALLBACK, async () => {
		const mockToken = MOCK_OAUTH_RESPONSES.OPENAI.tokenSuccess;

		authMocks.mockTokenStorage.mockResolvedValue(mockToken);
		mockNextResponse.json.mockReturnValue({ success: true } as any);

		const request = createMockCallbackRequest({
			code: "test-code",
			state: "test-state",
		});

		const response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith({
			success: true,
			token: mockToken,
		});
	});

	it(AUTH_TEST_SCENARIOS.MISSING_CODE, async () => {
		mockNextResponse.json.mockReturnValue({
			error: "Missing code parameter",
		} as any);

		const request = createMockCallbackRequest({
			code: undefined,
			state: "test-state",
		});

		const response = await GET(request);

		AuthCallbackAssertions.assertErrorResponse(response, 400);
	});

	it(AUTH_TEST_SCENARIOS.MISSING_STATE, async () => {
		mockNextResponse.json.mockReturnValue({
			error: "Missing state parameter",
		} as any);

		const request = createMockCallbackRequest({
			code: "test-code",
		});

		const response = await GET(request);

		AuthCallbackAssertions.assertErrorResponse(response, 400);
	});

	it(AUTH_TEST_SCENARIOS.INVALID_STATE, async () => {
		authMocks.mockValidateOAuthState.mockReturnValue(false);
		mockNextResponse.json.mockReturnValue({
			error: "Invalid state parameter",
		} as any);

		const request = createMockCallbackRequest({
			code: "test-code",
			state: "invalid-state",
		});

		const response = await GET(request);

		AuthCallbackAssertions.assertErrorResponse(response, 400);
	});

	it("should handle error parameter", async () => {
		mockNextResponse.json.mockReturnValue({ error: "access_denied" } as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/openai/callback?error=access_denied&error_description=User%20denied%20access"
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{ error: "access_denied", error_description: "User denied access" },
			{ status: 400 }
		);
	});

	it(AUTH_TEST_SCENARIOS.TOKEN_EXCHANGE_ERROR, async () => {
		authMocks.mockTokenStorage.mockRejectedValue(new Error("Token exchange failed"));
		authMocks.mockHandleAuthError.mockReturnValue("Token exchange failed");
		mockNextResponse.json.mockReturnValue({
			error: "Token exchange failed",
		} as any);

		const request = createMockCallbackRequest({
			code: "test-code",
			state: "test-state",
		});

		const response = await GET(request);

		AuthCallbackAssertions.assertErrorResponse(response, 500);
	});

	it("should handle OAuth error responses", async () => {
		mockNextResponse.json.mockReturnValue({ error: "invalid_grant" } as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/openai/callback?error=invalid_grant&error_description=Invalid%20authorization%20code"
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{
				error: "invalid_grant",
				error_description: "Invalid authorization code",
			},
			{ status: 400 }
		);
	});

	it("should handle redirect after successful auth", async () => {
		const mockToken = {
			access_token: "test-access-token",
			token_type: "Bearer",
			expires_in: 3600,
			refresh_token: "test-refresh-token",
			id_token: "test-id-token",
		};

		mockExchangeCodeForToken.mockResolvedValue(mockToken);
		mockNextResponse.redirect.mockReturnValue({ status: 302 } as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state&redirect_uri=https://app.example.com/dashboard"
		);

		const _response = await GET(request);

		expect(mockSanitizeRedirectUrl).toHaveBeenCalledWith("https://app.example.com/dashboard");
		expect(mockNextResponse.redirect).toHaveBeenCalledWith("https://app.example.com/dashboard");
	});

	it("should handle user info extraction from id_token", async () => {
		const mockToken = {
			access_token: "test-access-token",
			token_type: "Bearer",
			expires_in: 3600,
			refresh_token: "test-refresh-token",
			id_token:
				"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNjI0NTU2NDAwfQ.signature",
		};

		mockExchangeCodeForToken.mockResolvedValue(mockToken);
		mockNextResponse.json.mockReturnValue({ success: true } as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state"
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith({
			success: true,
			token: mockToken,
		});
	});

	it("should handle code verifier from session", async () => {
		const mockToken = {
			access_token: "test-access-token",
			token_type: "Bearer",
			expires_in: 3600,
			refresh_token: "test-refresh-token",
		};

		mockExchangeCodeForToken.mockResolvedValue(mockToken);
		mockNextResponse.json.mockReturnValue({ success: true } as any);

		// Mock session storage or cookies for code verifier
		const request = new NextRequest(
			"https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state"
		);

		const _response = await GET(request);

		expect(mockExchangeCodeForToken).toHaveBeenCalledWith({
			tokenUrl: "https://auth.openai.com/oauth/token",
			clientId: "test-client-id",
			clientSecret: "test-client-secret",
			code: "test-code",
			redirectUri: "https://app.example.com/auth/openai/callback",
			codeVerifier: expect.any(String),
		});
	});

	it("should handle missing environment variables", async () => {
		vi.doMock("@/lib/env", () => ({
			env: {
				OPENAI_CLIENT_ID: undefined,
				OPENAI_CLIENT_SECRET: undefined,
				OPENAI_REDIRECT_URI: undefined,
				OPENAI_TOKEN_URL: undefined,
				NEXTAUTH_URL: undefined,
			},
		}));

		mockNextResponse.json.mockReturnValue({
			error: "Missing configuration",
		} as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state"
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{ error: "Missing configuration" },
			{ status: 500 }
		);
	});

	it("should handle network errors", async () => {
		mockExchangeCodeForToken.mockRejectedValue(new Error("Network error"));
		mockHandleAuthError.mockReturnValue("Network error");
		mockNextResponse.json.mockReturnValue({ error: "Network error" } as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state"
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith({ error: "Network error" }, { status: 500 });
	});

	it("should handle malformed URLs", async () => {
		mockSanitizeRedirectUrl.mockImplementation(() => {
			throw new Error("Invalid redirect URL");
		});
		mockNextResponse.json.mockReturnValue({
			error: "Invalid redirect URL",
		} as any);

		const request = new NextRequest(
			"https://app.example.com/api/auth/openai/callback?code=test-code&state=test-state&redirect_uri=javascript:alert(1)"
		);

		const _response = await GET(request);

		expect(mockNextResponse.json).toHaveBeenCalledWith(
			{ error: "Invalid redirect URL" },
			{ status: 400 }
		);
	});
});
