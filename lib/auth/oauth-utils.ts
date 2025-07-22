/**
 * Shared OAuth authentication utilities
 * Reduces code duplication across OAuth providers
 */

import { NextResponse } from "next/server";

export interface OAuthValidationParams {
	code: string | null;
	state: string | null;
	error: string | null;
	errorDescription: string | null;
}

export interface OAuthConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	tokenUrl?: string;
	providerName: string;
}

/**
 * Common OAuth state validation
 */
export const validateOAuthState = (state: string): boolean => {
	// In production, this would validate the state against stored values
	return state && state.length > 0;
};

/**
 * Sanitize redirect URLs to prevent XSS attacks
 */
export const sanitizeRedirectUrl = (url: string): string => {
	if (!url || url.startsWith("javascript:") || url.startsWith("data:")) {
		throw new Error("Invalid redirect URL");
	}
	return url;
};

/**
 * Standardized error handling for auth operations
 */
export const handleAuthError = (error: any): string => {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
};

/**
 * Generic OAuth parameter validation
 */
export function validateOAuthParameters(params: OAuthValidationParams): NextResponse | null {
	// Handle OAuth errors
	if (params.error) {
		return NextResponse.json(
			{
				error: params.error,
				error_description: params.errorDescription,
			},
			{ status: 400 },
		);
	}

	// Validate required parameters
	if (!params.code) {
		return NextResponse.json(
			{ error: "Missing code parameter" },
			{ status: 400 },
		);
	}

	if (!params.state) {
		return NextResponse.json(
			{ error: "Missing state parameter" },
			{ status: 400 },
		);
	}

	// Validate state parameter
	if (!validateOAuthState(params.state)) {
		return NextResponse.json(
			{ error: "Invalid state parameter" },
			{ status: 400 },
		);
	}

	return null; // No validation errors
}

/**
 * Generic OAuth configuration validation
 */
export function validateOAuthConfiguration(config: OAuthConfig): NextResponse | null {
	if (!config.clientId || !config.clientSecret) {
		return NextResponse.json(
			{ error: `Missing ${config.providerName} configuration` },
			{ status: 500 },
		);
	}
	return null;
}

/**
 * Handle OAuth redirect with security validation
 */
export function handleOAuthRedirect(
	redirectUri: string | null,
	tokenResponse?: any,
	cookieName?: string
): NextResponse | null {
	if (!redirectUri) {
		return null;
	}

	try {
		const sanitizedUrl = sanitizeRedirectUrl(redirectUri);
		const response = NextResponse.redirect(sanitizedUrl);

		// Set cookie if token and cookie name provided
		if (tokenResponse && cookieName) {
			response.cookies.set(cookieName, tokenResponse.access_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: tokenResponse.expires_in || 3600,
			});
		}

		return response;
	} catch (error) {
		return NextResponse.json(
			{ error: handleAuthError(error) },
			{ status: 400 },
		);
	}
}

/**
 * Create secure token cookie
 */
export function createTokenCookie(
	response: NextResponse,
	tokenResponse: any,
	cookieName: string
): void {
	response.cookies.set(cookieName, tokenResponse.access_token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: tokenResponse.expires_in || 3600,
	});
}

/**
 * Generic OAuth callback handler
 */
export async function handleOAuthCallback({
	searchParams,
	config,
	tokenExchanger,
	cookieName,
}: {
	searchParams: URLSearchParams;
	config: OAuthConfig;
	tokenExchanger: (code: string, config: OAuthConfig) => Promise<any>;
	cookieName?: string;
}): Promise<NextResponse> {
	try {
		const code = searchParams.get("code");
		const state = searchParams.get("state");
		const error = searchParams.get("error");
		const errorDescription = searchParams.get("error_description");
		const redirectUri = searchParams.get("redirect_uri");

		// Validate OAuth parameters
		const validationError = validateOAuthParameters({
			code,
			state,
			error,
			errorDescription,
		});
		if (validationError) {
			return validationError;
		}

		// Check configuration
		const configError = validateOAuthConfiguration(config);
		if (configError) {
			return configError;
		}

		// Exchange code for token
		const tokenResponse = await tokenExchanger(code!, config);

		// Handle redirect if specified
		const redirectResponse = handleOAuthRedirect(
			redirectUri,
			tokenResponse,
			cookieName
		);
		if (redirectResponse) {
			return redirectResponse;
		}

		// Return token response
		const response = NextResponse.json({
			success: true,
			token: tokenResponse,
		});

		// Set cookie if cookie name provided
		if (cookieName) {
			createTokenCookie(response, tokenResponse, cookieName);
		}

		return response;
	} catch (error) {
		return NextResponse.json(
			{ error: handleAuthError(error) },
			{ status: 500 },
		);
	}
}