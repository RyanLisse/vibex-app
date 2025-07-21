/**
 * Shared Test Utilities for OAuth Authentication Callbacks
 *
 * Eliminates duplicate code across auth callback tests by providing
 * reusable test patterns, mocks, and assertions.
 */

import { NextRequest } from "next/server";
import { beforeEach, expect, vi } from "vitest";

// Common mock types
export interface MockToken {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token?: string;
	id_token?: string;
}

export interface AuthTestConfig {
	provider: string;
	clientIdEnv: string;
	clientSecretEnv: string;
	redirectUriEnv: string;
	tokenUrlEnv: string;
	authModulePath: string;
	tokenUrl: string;
	redirectUri: string;
}

export interface AuthMocks {
	exchangeCodeForToken: ReturnType<typeof vi.fn>;
	validateOAuthState: ReturnType<typeof vi.fn>;
	sanitizeRedirectUrl: ReturnType<typeof vi.fn>;
	handleAuthError: ReturnType<typeof vi.fn>;
	NextResponse: {
		json: ReturnType<typeof vi.fn>;
		redirect: ReturnType<typeof vi.fn>;
	};
}

/**
 * Creates standardized auth test environment
 */
export function createAuthTestEnvironment(config: AuthTestConfig): AuthMocks {
	// Mock the authentication utilities
	vi.mock(config.authModulePath, () => ({
		exchangeCodeForToken: vi.fn(),
		validateOAuthState: vi.fn(),
		sanitizeRedirectUrl: vi.fn(),
		handleAuthError: vi.fn(),
		...(config.provider === "anthropic" && {
			AuthAnthropic: {
				exchange: vi.fn(),
			},
		}),
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
	const envMock = {
		[config.clientIdEnv]: "test-client-id",
		[config.clientSecretEnv]: "test-client-secret",
		[config.redirectUriEnv]: config.redirectUri,
		[config.tokenUrlEnv]: config.tokenUrl,
		NEXTAUTH_URL: "https://app.example.com",
	};

	vi.mock("@/lib/env", () => ({ env: envMock }));

	return {
		exchangeCodeForToken: vi.fn(),
		validateOAuthState: vi.fn(),
		sanitizeRedirectUrl: vi.fn(),
		handleAuthError: vi.fn(),
		NextResponse: {
			json: vi.fn(),
			redirect: vi.fn(),
		},
	};
}

/**
 * Standard beforeEach setup for auth tests
 */
export function setupAuthTestMocks(mocks: AuthMocks): void {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.validateOAuthState.mockReturnValue(true);
		mocks.sanitizeRedirectUrl.mockImplementation((url) => url);
		mocks.handleAuthError.mockImplementation(
			(error: unknown) => error?.toString() || "Unknown error",
		);
	});
}

/**
 * Creates standard mock token
 */
export function createMockToken(includeIdToken = false): MockToken {
	const token: MockToken = {
		access_token: "test-access-token",
		token_type: "Bearer",
		expires_in: 3600,
		refresh_token: "test-refresh-token",
	};

	if (includeIdToken) {
		token.id_token = "test-id-token-mock-value";
	}

	return token;
}

/**
 * Standard test patterns for OAuth callback routes
 */
export class AuthCallbackTestSuite {
	constructor(
		private config: AuthTestConfig,
		private mocks: AuthMocks,
		private routeHandler: (req: NextRequest) => Promise<any>,
	) {}

	/**
	 * Test successful callback
	 */
	testSuccessfulCallback() {
		return async () => {
			const mockToken = createMockToken(this.config.provider === "openai");
			this.mocks.exchangeCodeForToken.mockResolvedValue(mockToken);
			this.mocks.NextResponse.json.mockReturnValue({ success: true } as any);

			const request = new NextRequest(
				`https://app.example.com/api/auth/${this.config.provider}/callback?code=test-code&state=test-state`,
			);

			await this.routeHandler(request);

			expect(this.mocks.exchangeCodeForToken).toHaveBeenCalledWith({
				tokenUrl: this.config.tokenUrl,
				clientId: "test-client-id",
				clientSecret: "test-client-secret",
				code: "test-code",
				redirectUri: this.config.redirectUri,
				codeVerifier: expect.any(String),
			});

			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith({
				success: true,
				token: mockToken,
			});
		};
	}

	/**
	 * Test missing code parameter
	 */
	testMissingCode() {
		return async () => {
			this.mocks.NextResponse.json.mockReturnValue({
				error: "Missing code parameter",
			} as any);

			const request = new NextRequest(
				`https://app.example.com/api/auth/${this.config.provider}/callback?state=test-state`,
			);

			await this.routeHandler(request);

			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith(
				{ error: "Missing code parameter" },
				{ status: 400 },
			);
		};
	}

	/**
	 * Test missing state parameter
	 */
	testMissingState() {
		return async () => {
			this.mocks.NextResponse.json.mockReturnValue({
				error: "Missing state parameter",
			} as any);

			const request = new NextRequest(
				`https://app.example.com/api/auth/${this.config.provider}/callback?code=test-code`,
			);

			await this.routeHandler(request);

			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith(
				{ error: "Missing state parameter" },
				{ status: 400 },
			);
		};
	}

	/**
	 * Test invalid state
	 */
	testInvalidState() {
		return async () => {
			this.mocks.validateOAuthState.mockReturnValue(false);
			this.mocks.NextResponse.json.mockReturnValue({
				error: "Invalid state parameter",
			} as any);

			const request = new NextRequest(
				`https://app.example.com/api/auth/${this.config.provider}/callback?code=test-code&state=invalid-state`,
			);

			await this.routeHandler(request);

			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith(
				{ error: "Invalid state parameter" },
				{ status: 400 },
			);
		};
	}

	/**
	 * Test error parameter handling
	 */
	testErrorParameter() {
		return async () => {
			this.mocks.NextResponse.json.mockReturnValue({
				error: "access_denied",
			} as any);

			const request = new NextRequest(
				`https://app.example.com/api/auth/${this.config.provider}/callback?error=access_denied&error_description=User%20denied%20access`,
			);

			await this.routeHandler(request);

			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith(
				{ error: "access_denied", error_description: "User denied access" },
				{ status: 400 },
			);
		};
	}

	/**
	 * Test token exchange failure
	 */
	testTokenExchangeFailure() {
		return async () => {
			this.mocks.exchangeCodeForToken.mockRejectedValue(
				new Error("Token exchange failed"),
			);
			this.mocks.handleAuthError.mockReturnValue("Token exchange failed");
			this.mocks.NextResponse.json.mockReturnValue({
				error: "Token exchange failed",
			} as any);

			const request = new NextRequest(
				`https://app.example.com/api/auth/${this.config.provider}/callback?code=test-code&state=test-state`,
			);

			await this.routeHandler(request);

			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith(
				{ error: "Token exchange failed" },
				{ status: 500 },
			);
		};
	}

	/**
	 * Test OAuth error responses
	 */
	testOAuthErrorResponses() {
		return async () => {
			this.mocks.NextResponse.json.mockReturnValue({
				error: "invalid_grant",
			} as any);

			const request = new NextRequest(
				`https://app.example.com/api/auth/${this.config.provider}/callback?error=invalid_grant&error_description=Invalid%20authorization%20code`,
			);

			await this.routeHandler(request);

			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith(
				{
					error: "invalid_grant",
					error_description: "Invalid authorization code",
				},
				{ status: 400 },
			);
		};
	}

	/**
	 * Test redirect after successful auth
	 */
	testSuccessfulRedirect() {
		return async () => {
			const mockToken = createMockToken(this.config.provider === "openai");
			this.mocks.exchangeCodeForToken.mockResolvedValue(mockToken);
			this.mocks.NextResponse.redirect.mockReturnValue({ status: 302 } as any);

			const request = new NextRequest(
				`https://app.example.com/api/auth/${this.config.provider}/callback?code=test-code&state=test-state&redirect_uri=https://app.example.com/dashboard`,
			);

			await this.routeHandler(request);

			expect(this.mocks.sanitizeRedirectUrl).toHaveBeenCalledWith(
				"https://app.example.com/dashboard",
			);
			expect(this.mocks.NextResponse.redirect).toHaveBeenCalledWith(
				"https://app.example.com/dashboard",
			);
		};
	}

	/**
	 * Test network errors
	 */
	testNetworkErrors() {
		return async () => {
			this.mocks.exchangeCodeForToken.mockRejectedValue(
				new Error("Network error"),
			);
			this.mocks.handleAuthError.mockReturnValue("Network error");
			this.mocks.NextResponse.json.mockReturnValue({
				error: "Network error",
			} as any);

			const request = new NextRequest(
				`https://app.example.com/api/auth/${this.config.provider}/callback?code=test-code&state=test-state`,
			);

			await this.routeHandler(request);

			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith(
				{ error: "Network error" },
				{ status: 500 },
			);
		};
	}

	/**
	 * Test malformed URLs
	 */
	testMalformedUrls() {
		return async () => {
			this.mocks.sanitizeRedirectUrl.mockImplementation(() => {
				throw new Error("Invalid redirect URL");
			});
			this.mocks.NextResponse.json.mockReturnValue({
				error: "Invalid redirect URL",
			} as any);

			const request = new NextRequest(
				`https://app.example.com/api/auth/${this.config.provider}/callback?code=test-code&state=test-state&redirect_uri=javascript:alert(1)`,
			);

			await this.routeHandler(request);

			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith(
				{ error: "Invalid redirect URL" },
				{ status: 400 },
			);
		};
	}

	/**
	 * Get all standard test cases
	 */
	getStandardTestCases() {
		return {
			"should handle successful callback": this.testSuccessfulCallback(),
			"should handle missing code parameter": this.testMissingCode(),
			"should handle missing state parameter": this.testMissingState(),
			"should handle invalid state": this.testInvalidState(),
			"should handle error parameter": this.testErrorParameter(),
			"should handle token exchange failure": this.testTokenExchangeFailure(),
			"should handle OAuth error responses": this.testOAuthErrorResponses(),
			"should handle redirect after successful auth":
				this.testSuccessfulRedirect(),
			"should handle network errors": this.testNetworkErrors(),
			"should handle malformed URLs": this.testMalformedUrls(),
		};
	}
}

/**
 * Standard test patterns for OAuth login routes
 */
export class AuthLoginTestSuite {
	constructor(
		private mocks: AuthMocks & {
			generateAuthUrl: ReturnType<typeof vi.fn>;
			generateCodeChallenge: ReturnType<typeof vi.fn>;
			generateCodeVerifier: ReturnType<typeof vi.fn>;
			generateState: ReturnType<typeof vi.fn>;
		},
		private routeHandler: (req: NextRequest) => Promise<any>,
	) {}

	/**
	 * Test auth URL generation and redirect
	 */
	testAuthUrlGeneration() {
		return async () => {
			const mockCodeVerifier = "test-code-verifier";
			const mockCodeChallenge = "test-code-challenge";
			const mockState = "test-state";
			const mockAuthUrl = "https://auth.openai.com/oauth/authorize";

			this.mocks.generateCodeVerifier.mockReturnValue(mockCodeVerifier);
			this.mocks.generateCodeChallenge.mockResolvedValue(mockCodeChallenge);
			this.mocks.generateState.mockReturnValue(mockState);
			this.mocks.generateAuthUrl.mockReturnValue(mockAuthUrl);

			this.mocks.NextResponse.redirect.mockReturnValue({ status: 302 } as any);

			const request = new NextRequest(
				"https://app.example.com/api/auth/openai/login",
				{
					method: "POST",
				},
			);

			await this.routeHandler(request);

			expect(this.mocks.generateCodeVerifier).toHaveBeenCalled();
			expect(this.mocks.generateCodeChallenge).toHaveBeenCalledWith(
				mockCodeVerifier,
			);
			expect(this.mocks.generateState).toHaveBeenCalled();
			expect(this.mocks.generateAuthUrl).toHaveBeenCalledWith(
				expect.objectContaining({
					state: mockState,
					codeChallenge: mockCodeChallenge,
				}),
			);
			expect(this.mocks.NextResponse.redirect).toHaveBeenCalledWith(
				mockAuthUrl,
			);
		};
	}

	/**
	 * Test code challenge generation error
	 */
	testCodeChallengeError() {
		return async () => {
			this.mocks.generateCodeVerifier.mockReturnValue("test-code-verifier");
			this.mocks.generateCodeChallenge.mockRejectedValue(
				new Error("Code challenge generation failed"),
			);
			this.mocks.generateState.mockReturnValue("test-state");

			this.mocks.NextResponse.json.mockReturnValue({
				error: "Code challenge generation failed",
			} as any);

			const request = new NextRequest(
				"https://app.example.com/api/auth/openai/login",
				{
					method: "POST",
				},
			);

			await this.routeHandler(request);

			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith(
				{ error: "Code challenge generation failed" },
				{ status: 500 },
			);
		};
	}

	/**
	 * Test auth URL generation error
	 */
	testAuthUrlError() {
		return async () => {
			this.mocks.generateCodeVerifier.mockReturnValue("test-code-verifier");
			this.mocks.generateCodeChallenge.mockResolvedValue("test-code-challenge");
			this.mocks.generateState.mockReturnValue("test-state");
			this.mocks.generateAuthUrl.mockImplementation(() => {
				throw new Error("Auth URL generation failed");
			});

			this.mocks.NextResponse.json.mockReturnValue({
				error: "Auth URL generation failed",
			} as any);

			const request = new NextRequest(
				"https://app.example.com/api/auth/openai/login",
				{
					method: "POST",
				},
			);

			await this.routeHandler(request);

			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith(
				{ error: "Auth URL generation failed" },
				{ status: 500 },
			);
		};
	}

	/**
	 * Get all standard login test cases
	 */
	getStandardTestCases() {
		return {
			"should generate auth URL and redirect": this.testAuthUrlGeneration(),
			"should handle code challenge generation error":
				this.testCodeChallengeError(),
			"should handle auth URL generation error": this.testAuthUrlError(),
		};
	}
}

/**
 * Standard test patterns for OAuth logout routes
 */
export class AuthLogoutTestSuite {
	constructor(
		private mocks: AuthMocks & {
			getStoredToken: ReturnType<typeof vi.fn>;
			revokeToken: ReturnType<typeof vi.fn>;
			clearStoredToken: ReturnType<typeof vi.fn>;
			clearStoredState: ReturnType<typeof vi.fn>;
			clearStoredCodeVerifier: ReturnType<typeof vi.fn>;
		},
		private routeHandler: (req: NextRequest) => Promise<any>,
	) {}

	/**
	 * Test successful logout
	 */
	testSuccessfulLogout() {
		return async () => {
			const mockToken = createMockToken();

			this.mocks.getStoredToken.mockResolvedValue(mockToken);
			this.mocks.revokeToken.mockResolvedValue(undefined);
			this.mocks.clearStoredToken.mockResolvedValue(undefined);
			this.mocks.clearStoredState.mockResolvedValue(undefined);
			this.mocks.clearStoredCodeVerifier.mockResolvedValue(undefined);
			this.mocks.NextResponse.json.mockReturnValue({
				success: true,
			} as unknown);

			const request = new NextRequest(
				"https://app.example.com/api/auth/openai/logout",
				{
					method: "POST",
				},
			);

			await this.routeHandler(request);

			expect(this.mocks.getStoredToken).toHaveBeenCalledWith(request);
			expect(this.mocks.revokeToken).toHaveBeenCalledWith(
				mockToken.access_token,
			);
			expect(this.mocks.clearStoredToken).toHaveBeenCalledWith(request);
			expect(this.mocks.clearStoredState).toHaveBeenCalledWith(request);
			expect(this.mocks.clearStoredCodeVerifier).toHaveBeenCalledWith(request);
			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith({
				success: true,
			});
		};
	}

	/**
	 * Test logout when no token exists
	 */
	testLogoutWithoutToken() {
		return async () => {
			this.mocks.getStoredToken.mockResolvedValue(null);
			this.mocks.clearStoredToken.mockResolvedValue(undefined);
			this.mocks.clearStoredState.mockResolvedValue(undefined);
			this.mocks.clearStoredCodeVerifier.mockResolvedValue(undefined);
			this.mocks.NextResponse.json.mockReturnValue({
				success: true,
			} as unknown);

			const request = new NextRequest(
				"https://app.example.com/api/auth/openai/logout",
				{
					method: "POST",
				},
			);

			await this.routeHandler(request);

			expect(this.mocks.getStoredToken).toHaveBeenCalledWith(request);
			expect(this.mocks.revokeToken).not.toHaveBeenCalled();
			expect(this.mocks.clearStoredToken).toHaveBeenCalledWith(request);
			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith({
				success: true,
			});
		};
	}

	/**
	 * Test token revocation failure
	 */
	testTokenRevocationFailure() {
		return async () => {
			const mockToken = createMockToken();

			this.mocks.getStoredToken.mockResolvedValue(mockToken);
			this.mocks.revokeToken.mockRejectedValue(
				new Error("Token revocation failed"),
			);
			this.mocks.clearStoredToken.mockResolvedValue(undefined);
			this.mocks.clearStoredState.mockResolvedValue(undefined);
			this.mocks.clearStoredCodeVerifier.mockResolvedValue(undefined);
			this.mocks.NextResponse.json.mockReturnValue({
				success: true,
				warning: "Token revocation failed, but local session cleared",
			} as any);

			const request = new NextRequest(
				"https://app.example.com/api/auth/openai/logout",
				{
					method: "POST",
				},
			);

			await this.routeHandler(request);

			expect(this.mocks.revokeToken).toHaveBeenCalledWith(
				mockToken.access_token,
			);
			expect(this.mocks.clearStoredToken).toHaveBeenCalledWith(request);
			expect(this.mocks.NextResponse.json).toHaveBeenCalledWith({
				success: true,
				warning: "Token revocation failed, but local session cleared",
			});
		};
	}

	/**
	 * Get all standard logout test cases
	 */
	getStandardTestCases() {
		return {
			"should handle successful logout": this.testSuccessfulLogout(),
			"should handle logout when no token exists":
				this.testLogoutWithoutToken(),
			"should handle token revocation failure":
				this.testTokenRevocationFailure(),
		};
	}
}
