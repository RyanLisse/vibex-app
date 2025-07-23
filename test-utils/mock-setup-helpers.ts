/**
 * Consolidated Mock Setup Utilities
 * 
 * This module consolidates common mock setup patterns to eliminate code duplication
 * identified by qlty smells analysis across test files.
 */
import { vi } from "vitest";

// Common mock setup for OAuth login tests
export interface OAuthLoginMocks {
	mockGenerateCodeVerifier: ReturnType<typeof vi.fn>;
	mockGenerateCodeChallenge: ReturnType<typeof vi.fn>;
	mockGenerateState: ReturnType<typeof vi.fn>;
	mockCreateAuthUrl: ReturnType<typeof vi.fn>;
	mockStoreOAuthState: ReturnType<typeof vi.fn>;
	mockHandleAuthError: ReturnType<typeof vi.fn>;
}

export interface MockNextResponse {
	json: ReturnType<typeof vi.fn>;
	redirect: ReturnType<typeof vi.fn>;
}

/**
 * Creates standardized OAuth login test setup
 */
export function createOAuthLoginTestSetup(): {
	mocks: OAuthLoginMocks;
	mockNextResponse: MockNextResponse;
	baseTestData: {
		codeVerifier: string;
		codeChallenge: string;
		state: string;
		authUrl: string;
	};
} {
	const baseTestData = {
		codeVerifier: "test-code-verifier",
		codeChallenge: "test-code-challenge",
		state: "test-state",
		authUrl: "https://auth.example.com/oauth/authorize",
	};

	const mocks: OAuthLoginMocks = {
		mockGenerateCodeVerifier: vi.fn().mockReturnValue(baseTestData.codeVerifier),
		mockGenerateCodeChallenge: vi.fn().mockReturnValue(baseTestData.codeChallenge),
		mockGenerateState: vi.fn().mockReturnValue(baseTestData.state),
		mockCreateAuthUrl: vi.fn().mockReturnValue(baseTestData.authUrl),
		mockStoreOAuthState: vi.fn().mockResolvedValue(undefined),
		mockHandleAuthError: vi.fn().mockReturnValue("Auth error"),
	};

	const mockNextResponse: MockNextResponse = {
		json: vi.fn().mockReturnValue({ url: baseTestData.authUrl } as any),
		redirect: vi.fn().mockReturnValue({ redirect: true } as any),
	};

	return { mocks, mockNextResponse, baseTestData };
}

/**
 * Creates a standardized OAuth login test case
 */
export function createStandardOAuthTest(
	testName: string,
	customSetup?: {
		customScope?: string;
		customRedirectUri?: string;
		expectError?: boolean;
		errorMessage?: string;
	}
) {
	return async () => {
		const { mocks, mockNextResponse, baseTestData } = createOAuthLoginTestSetup();
		
		if (customSetup?.expectError) {
			mocks.mockCreateAuthUrl.mockImplementation(() => {
				throw new Error(customSetup.errorMessage || "Auth URL generation failed");
			});
			mocks.mockHandleAuthError.mockReturnValue(customSetup.errorMessage || "Auth URL generation failed");
			mockNextResponse.json.mockReturnValue({
				error: customSetup.errorMessage || "Auth URL generation failed",
			} as any);
		}

		// Build request URL with parameters
		const searchParams = new URLSearchParams();
		if (customSetup?.customScope) {
			searchParams.set("scope", customSetup.customScope);
		}
		if (customSetup?.customRedirectUri) {
			searchParams.set("redirect_uri", customSetup.customRedirectUri);
		}

		const requestUrl = `https://app.example.com/api/auth/login${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
		
		// Mock the actual test execution
		expect(mocks.mockGenerateCodeVerifier).toHaveBeenCalled();
		expect(mocks.mockGenerateCodeChallenge).toHaveBeenCalledWith(baseTestData.codeVerifier);
		expect(mocks.mockGenerateState).toHaveBeenCalled();
		
		if (customSetup?.expectError) {
			expect(mocks.mockHandleAuthError).toHaveBeenCalled();
			expect(mockNextResponse.json).toHaveBeenCalledWith({
				error: customSetup.errorMessage || "Auth URL generation failed",
			});
		} else {
			expect(mocks.mockCreateAuthUrl).toHaveBeenCalled();
			expect(mocks.mockStoreOAuthState).toHaveBeenCalled();
			expect(mockNextResponse.json).toHaveBeenCalledWith({ url: baseTestData.authUrl });
		}
	};
}

/**
 * Common environment setup for tests
 */
export function createEnvironmentTestSetup() {
	const originalEnv = process.env;
	
	const setEnvironment = (env: "development" | "production" | "test") => {
		Object.defineProperty(process.env, 'NODE_ENV', {
			value: env,
			writable: true,
			configurable: true
		});
	};
	
	const restoreEnvironment = () => {
		process.env = originalEnv;
	};
	
	return { setEnvironment, restoreEnvironment };
}

/**
 * Common mock handler setup for API tests
 */
export function createMockHandler() {
	return {
		GET: vi.fn().mockResolvedValue({ status: 200, json: async () => ({ success: true }) }),
		POST: vi.fn().mockResolvedValue({ status: 200, json: async () => ({ success: true }) }),
		PUT: vi.fn().mockResolvedValue({ status: 200, json: async () => ({ success: true }) }),
		DELETE: vi.fn().mockResolvedValue({ status: 200, json: async () => ({ success: true }) }),
	};
}

/**
 * Creates error simulation for handlers
 */
export function simulateHandlerError(
	mockHandler: ReturnType<typeof createMockHandler>,
	method: keyof ReturnType<typeof createMockHandler>,
	errorMessage: string
) {
	mockHandler[method].mockImplementation(() =>
		Promise.reject(new Error(errorMessage))
	);
}

/**
 * Common test patterns for different scenarios
 */
export const TEST_PATTERNS = {
	OAUTH_LOGIN: {
		CUSTOM_SCOPE: "should handle custom scope parameter",
		CUSTOM_REDIRECT: "should handle custom redirect_uri parameter",
		AUTH_ERROR: "should handle auth URL generation error",
		INVALID_REDIRECT: "should handle invalid redirect URI",
		DEFAULT_SCOPE: "should handle default scope when not provided",
	},
	ENVIRONMENT: {
		DEVELOPMENT: "should handle development environment",
		PRODUCTION: "should handle production environment",
	},
	ERROR_HANDLING: {
		SERVER_ERROR: "should handle Inngest serve errors",
		NETWORK_ERROR: "should handle network errors gracefully",
		REGISTRATION_ERROR: "should handle function registration errors",
	},
} as const;