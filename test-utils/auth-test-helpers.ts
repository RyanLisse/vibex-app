/**
 * Consolidated Auth Test Utilities
 * 
 * This module consolidates common OAuth callback test patterns to eliminate code duplication
 * identified by qlty smells analysis.
 */
import { NextRequest, NextResponse } from "next/server";

// Common test constants and mock responses
export const AUTH_TEST_SCENARIOS = {
	VALID_CALLBACK: "should handle valid OAuth callback",
	INVALID_STATE: "should handle invalid state parameter",
	TOKEN_EXCHANGE_ERROR: "should handle token exchange error",
} as const;

export const MOCK_OAUTH_RESPONSES = {
	ANTHROPIC: {
		tokenSuccess: {
			access_token: "anthropic-access-token",
			token_type: "Bearer",
			refresh_token: "anthropic-refresh-token",
			expires_in: 3600,
		},
	},
	OPENAI: {
		tokenSuccess: {
			access_token: "openai-access-token",
			token_type: "Bearer",
			refresh_token: "openai-refresh-token",
			expires_in: 3600,
		},
	},
} as const;

// Common test setup patterns
export interface AuthTestMocks {
	mockTokenStorage: jest.Mock;
	mockValidateOAuthState: jest.Mock;
	mockHandleAuthError: jest.Mock;
}

export interface MockNextResponse {
	json: jest.Mock;
}

/**
 * Creates a standardized valid callback test case
 */
export function createValidCallbackTest(
	provider: keyof typeof MOCK_OAUTH_RESPONSES,
	authMocks: AuthTestMocks,
	mockNextResponse: MockNextResponse
) {
	return async () => {
		const mockToken = MOCK_OAUTH_RESPONSES[provider].tokenSuccess;

		authMocks.mockTokenStorage.mockResolvedValue(mockToken);
		mockNextResponse.json.mockReturnValue({ success: true } as any);

		const request = new NextRequest("https://app.example.com/api/auth/callback?code=test&state=valid");
		const response = await POST(request);

		expect(authMocks.mockTokenStorage).toHaveBeenCalledWith("test", "valid");
		expect(mockNextResponse.json).toHaveBeenCalledWith({ success: true });
		expect(response).toEqual({ success: true });
	};
}

/**
 * Creates a standardized invalid state test case
 */
export function createInvalidStateTest(
	authMocks: AuthTestMocks,
	mockNextResponse: MockNextResponse
) {
	return async () => {
		authMocks.mockValidateOAuthState.mockReturnValue(false);
		mockNextResponse.json.mockReturnValue({
			error: "Invalid state parameter",
		} as any);

		const request = new NextRequest("https://app.example.com/api/auth/callback?code=test&state=invalid");
		const response = await POST(request);

		expect(authMocks.mockValidateOAuthState).toHaveBeenCalledWith("invalid");
		expect(mockNextResponse.json).toHaveBeenCalledWith({
			error: "Invalid state parameter",
		});
		expect(response).toEqual({ error: "Invalid state parameter" });
	};
}

/**
 * Creates a standardized token exchange error test case
 */
export function createTokenExchangeErrorTest(
	authMocks: AuthTestMocks,
	mockNextResponse: MockNextResponse
) {
	return async () => {
		authMocks.mockTokenStorage.mockRejectedValue(
			new Error("Token exchange failed"),
		);
		authMocks.mockHandleAuthError.mockReturnValue("Token exchange failed");
		mockNextResponse.json.mockReturnValue({
			error: "Token exchange failed",
		} as any);

		const request = new NextRequest("https://app.example.com/api/auth/callback?code=test&state=valid");
		const response = await POST(request);

		expect(authMocks.mockTokenStorage).toHaveBeenCalledWith("test", "valid");
		expect(authMocks.mockHandleAuthError).toHaveBeenCalledWith(
			expect.any(Error)
		);
		expect(mockNextResponse.json).toHaveBeenCalledWith({
			error: "Token exchange failed",
		});
		expect(response).toEqual({ error: "Token exchange failed" });
	};
}

// Mock POST function type (to be imported from actual route files)
declare function POST(request: NextRequest): Promise<any>;