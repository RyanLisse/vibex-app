/**
 * Authentication Test Helpers - Shared Test Utilities
 *
 * Eliminates duplication across authentication callback tests by providing
 * reusable test setup, mocks, and assertion helpers.
 */

import { vi } from "vitest";
import type { Mock } from "vitest";

// Common test data structures
export interface AuthTestContext {
	mockValidateOAuthState: Mock;
	mockSanitizeRedirectUrl: Mock;
	mockHandleAuthError: Mock;
	mockCreateSession: Mock;
	mockGetProfile: Mock;
	mockTokenStorage: Mock;
	mockExchangeCodeForToken: Mock;
}

export interface AuthCallbackTestData {
	validCode: string;
	validState: string;
	invalidCode: string;
	invalidState: string;
	testUserId: string;
	testEmail: string;
	redirectUrl: string;
}

// Default test data - can be overridden
export const DEFAULT_AUTH_TEST_DATA: AuthCallbackTestData = {
	validCode: "test_auth_code_123",
	validState: "valid_state_token",
	invalidCode: "invalid_code",
	invalidState: "invalid_state",
	testUserId: "user_12345",
	testEmail: "test@example.com",
	redirectUrl: "/dashboard",
};

/**
 * Sets up common authentication test mocks
 * Eliminates the 20+ lines of repeated mock setup across callback tests
 */
export function setupAuthTestMocks(): AuthTestContext {
	const mockValidateOAuthState = vi.fn().mockReturnValue(true);
	const mockSanitizeRedirectUrl = vi.fn().mockImplementation((url) => url);
	const mockHandleAuthError = vi.fn().mockImplementation((error) => error.toString());
	const mockCreateSession = vi.fn().mockResolvedValue({
		id: "session_123",
		userId: DEFAULT_AUTH_TEST_DATA.testUserId,
	});
	const mockGetProfile = vi.fn().mockResolvedValue({
		id: DEFAULT_AUTH_TEST_DATA.testUserId,
		email: DEFAULT_AUTH_TEST_DATA.testEmail,
		name: "Test User",
	});
	const mockTokenStorage = vi.fn().mockResolvedValue({
		accessToken: "access_token_123",
		refreshToken: "refresh_token_123",
		expiresAt: Date.now() + 3600000,
	});
	const mockExchangeCodeForToken = vi.fn().mockResolvedValue({
		access_token: "access_token_123",
		token_type: "Bearer",
		expires_in: 3600,
		refresh_token: "refresh_token_123",
	});

	return {
		mockValidateOAuthState,
		mockSanitizeRedirectUrl,
		mockHandleAuthError,
		mockCreateSession,
		mockGetProfile,
		mockTokenStorage,
		mockExchangeCodeForToken,
	};
}

/**
 * Resets all authentication mocks - common beforeEach pattern
 */
export function resetAuthMocks(context: AuthTestContext): void {
	vi.clearAllMocks();

	// Reset to default successful behaviors
	context.mockValidateOAuthState.mockReturnValue(true);
	context.mockSanitizeRedirectUrl.mockImplementation((url) => url);
	context.mockHandleAuthError.mockImplementation((error) => error.toString());
	context.mockCreateSession.mockResolvedValue({
		id: "session_123",
		userId: DEFAULT_AUTH_TEST_DATA.testUserId,
	});
	context.mockGetProfile.mockResolvedValue({
		id: DEFAULT_AUTH_TEST_DATA.testUserId,
		email: DEFAULT_AUTH_TEST_DATA.testEmail,
		name: "Test User",
	});
	context.mockTokenStorage.mockResolvedValue({
		accessToken: "access_token_123",
		refreshToken: "refresh_token_123",
		expiresAt: Date.now() + 3600000,
	});
	context.mockExchangeCodeForToken.mockResolvedValue({
		access_token: "access_token_123",
		token_type: "Bearer",
		expires_in: 3600,
		refresh_token: "refresh_token_123",
	});
}

/**
 * Creates mock request objects for OAuth callback testing
 */
export function createMockCallbackRequest(params: {
	code?: string;
	state?: string;
	error?: string;
	baseUrl?: string;
}): any {
	const {
		code = DEFAULT_AUTH_TEST_DATA.validCode,
		state = DEFAULT_AUTH_TEST_DATA.validState,
		error,
		baseUrl = "http://localhost:3000",
	} = params;

	const url = new URL("/api/auth/callback", baseUrl);
	if (code) url.searchParams.set("code", code);
	if (state) url.searchParams.set("state", state);
	if (error) url.searchParams.set("error", error);

	// Create a mock NextRequest-like object
	return {
		url: url.toString(),
		nextUrl: url,
		method: "GET",
		cookies: new Map(),
		headers: new Map(),
		page: {},
		ua: {},
		[Symbol.for("NextRequest")]: true,
	};
}

/**
 * Common test scenarios for OAuth callback flows
 */
export const AUTH_TEST_SCENARIOS = {
	// Success scenarios
	VALID_CALLBACK: "should handle valid OAuth callback",
	EXISTING_USER: "should handle callback for existing user",
	NEW_USER: "should handle callback for new user registration",

	// Error scenarios
	MISSING_CODE: "should return 400 when code parameter is missing",
	MISSING_STATE: "should return 400 when state parameter is missing",
	INVALID_STATE: "should return 400 when state validation fails",
	OAUTH_ERROR: "should handle OAuth provider error responses",
	TOKEN_EXCHANGE_ERROR: "should handle token exchange failures",
	PROFILE_FETCH_ERROR: "should handle profile fetch failures",
	SESSION_CREATION_ERROR: "should handle session creation failures",

	// Edge cases
	MALFORMED_URL: "should handle malformed callback URLs",
	EXPIRED_STATE: "should handle expired state tokens",
	RATE_LIMITED: "should handle rate limiting responses",
};

/**
 * Common assertion helpers for OAuth callback responses
 */
export class AuthCallbackAssertions {
	/**
	 * Assert successful OAuth callback response
	 */
	static assertSuccessResponse(response: Response, expectedUserId?: string): void {
		expect(response.status).toBe(302);
		expect(response.headers.get("Location")).toContain("/dashboard");

		if (expectedUserId) {
			// Additional assertions based on expected user
			expect(response.headers.get("Set-Cookie")).toContain("session");
		}
	}

	/**
	 * Assert error response with specific status and message
	 */
	static assertErrorResponse(
		response: Response,
		expectedStatus: number,
		expectedMessage?: string
	): void {
		expect(response.status).toBe(expectedStatus);

		if (expectedMessage) {
			expect(response.statusText).toContain(expectedMessage);
		}
	}

	/**
	 * Assert redirect response to error page
	 */
	static assertErrorRedirect(response: Response, errorType?: string): void {
		expect(response.status).toBe(302);
		expect(response.headers.get("Location")).toContain("/auth/error");

		if (errorType) {
			expect(response.headers.get("Location")).toContain(`error=${errorType}`);
		}
	}
}

/**
 * Test suite factory for OAuth provider callback tests
 * Eliminates the need to duplicate test structure across providers
 */
export function createAuthCallbackTestSuite(
	providerName: string,
	callbackHandler: Function,
	customTestData?: Partial<AuthCallbackTestData>
) {
	const testData = { ...DEFAULT_AUTH_TEST_DATA, ...customTestData };

	return () => {
		describe(`${providerName} OAuth Callback Tests`, () => {
			let authMocks: AuthTestContext;

			beforeEach(() => {
				authMocks = setupAuthTestMocks();
			});

			afterEach(() => {
				resetAuthMocks(authMocks);
			});

			describe("Success Cases", () => {
				it(AUTH_TEST_SCENARIOS.VALID_CALLBACK, async () => {
					const request = createMockCallbackRequest({
						code: testData.validCode,
						state: testData.validState,
					});

					const response = await callbackHandler(request);
					AuthCallbackAssertions.assertSuccessResponse(response, testData.testUserId);
				});

				it(AUTH_TEST_SCENARIOS.EXISTING_USER, async () => {
					// Configure mocks for existing user scenario
					authMocks.mockGetProfile.mockResolvedValue({
						id: testData.testUserId,
						email: testData.testEmail,
						name: "Existing User",
					});

					const request = createMockCallbackRequest({
						code: testData.validCode,
						state: testData.validState,
					});

					const response = await callbackHandler(request);
					AuthCallbackAssertions.assertSuccessResponse(response);
				});
			});

			describe("Error Cases", () => {
				it(AUTH_TEST_SCENARIOS.MISSING_CODE, async () => {
					const request = createMockCallbackRequest({
						code: undefined,
						state: testData.validState,
					});

					const response = await callbackHandler(request);
					AuthCallbackAssertions.assertErrorResponse(response, 400);
				});

				it(AUTH_TEST_SCENARIOS.INVALID_STATE, async () => {
					authMocks.mockValidateOAuthState.mockReturnValue(false);

					const request = createMockCallbackRequest({
						code: testData.validCode,
						state: testData.invalidState,
					});

					const response = await callbackHandler(request);
					AuthCallbackAssertions.assertErrorResponse(response, 400);
				});

				it(AUTH_TEST_SCENARIOS.TOKEN_EXCHANGE_ERROR, async () => {
					authMocks.mockTokenStorage.mockRejectedValue(new Error("Token exchange failed"));

					const request = createMockCallbackRequest({
						code: testData.validCode,
						state: testData.validState,
					});

					const response = await callbackHandler(request);
					AuthCallbackAssertions.assertErrorRedirect(response, "token_exchange");
				});
			});
		});
	};
}

/**
 * Mock OAuth provider responses
 */
export const MOCK_OAUTH_RESPONSES = {
	ANTHROPIC: {
		tokenSuccess: {
			access_token: "anthropic_access_token",
			token_type: "Bearer",
			expires_in: 3600,
			refresh_token: "anthropic_refresh_token",
		},
		profileSuccess: {
			id: "anthropic_user_123",
			email: "user@anthropic.com",
			name: "Anthropic User",
		},
	},
	OPENAI: {
		tokenSuccess: {
			access_token: "openai_access_token",
			token_type: "Bearer",
			expires_in: 3600,
			refresh_token: "openai_refresh_token",
		},
		profileSuccess: {
			id: "openai_user_123",
			email: "user@openai.com",
			name: "OpenAI User",
		},
	},
};
