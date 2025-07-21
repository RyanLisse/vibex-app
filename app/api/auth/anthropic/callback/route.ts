import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token?: string;
}

interface AuthExchangeParams {
	tokenUrl: string;
	clientId: string;
	clientSecret: string;
	code: string;
	redirectUri: string;
	codeVerifier?: string;
}

// Mock authentication utilities for development
const AuthAnthropic = {
	exchange: async (params: AuthExchangeParams): Promise<TokenResponse> => {
		// This would normally make an actual API call to Anthropic
		return {
			access_token: "mock-access-token",
			token_type: "Bearer",
			expires_in: 3600,
			refresh_token: "mock-refresh-token",
		};
	},
};

// Mock environment variables (these would come from env)
const env = {
	ANTHROPIC_CLIENT_ID: process.env.ANTHROPIC_CLIENT_ID || "test-client-id",
	ANTHROPIC_CLIENT_SECRET:
		process.env.ANTHROPIC_CLIENT_SECRET || "test-client-secret",
	ANTHROPIC_REDIRECT_URI:
		process.env.ANTHROPIC_REDIRECT_URI ||
		"http://localhost:3000/auth/anthropic/callback",
	ANTHROPIC_TOKEN_URL:
		process.env.ANTHROPIC_TOKEN_URL || "https://api.anthropic.com/oauth/token",
	NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
};

// Utility functions
const validateOAuthState = (state: string): boolean => {
	// In production, this would validate the state against stored values
	return state && state.length > 0;
};

const sanitizeRedirectUrl = (url: string): string => {
	// Basic validation to prevent XSS
	if (!url || url.startsWith("javascript:") || url.startsWith("data:")) {
		throw new Error("Invalid redirect URL");
	}
	return url;
};

const handleAuthError = (error: any): string => {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
};

// Helper functions to reduce early returns
function validateOAuthParameters(params: {
	code: string | null;
	state: string | null;
	error: string | null;
	errorDescription: string | null;
}) {
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

function validateConfiguration() {
	if (!env.ANTHROPIC_CLIENT_ID || !env.ANTHROPIC_CLIENT_SECRET) {
		return NextResponse.json(
			{ error: "Missing configuration" },
			{ status: 500 },
		);
	}
	return null;
}

function handleRedirect(redirectUri: string | null) {
	if (!redirectUri) {
		return null;
	}

	try {
		const sanitizedUrl = sanitizeRedirectUrl(redirectUri);
		return NextResponse.redirect(sanitizedUrl);
	} catch (error) {
		return NextResponse.json(
			{ error: handleAuthError(error) },
			{ status: 400 },
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
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
		const configError = validateConfiguration();
		if (configError) {
			return configError;
		}

		// Exchange code for token
		const tokenResponse = await AuthAnthropic.exchange({
			tokenUrl: env.ANTHROPIC_TOKEN_URL,
			clientId: env.ANTHROPIC_CLIENT_ID,
			clientSecret: env.ANTHROPIC_CLIENT_SECRET,
			code: code!,
			redirectUri: env.ANTHROPIC_REDIRECT_URI,
			codeVerifier: "mock-code-verifier", // In production, get from session
		});

		// Handle redirect if specified
		const redirectResponse = handleRedirect(redirectUri);
		if (redirectResponse) {
			return redirectResponse;
		}

		// Return token response
		return NextResponse.json({
			success: true,
			token: tokenResponse,
		});
	} catch (error) {
		return NextResponse.json(
			{ error: handleAuthError(error) },
			{ status: 500 },
		);
	}
}
