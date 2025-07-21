import { type NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/auth/openai-codex";

// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Mock environment variables
const env = {
	OPENAI_CLIENT_ID: process.env.OPENAI_CLIENT_ID || "test-client-id",
	OPENAI_CLIENT_SECRET:
		process.env.OPENAI_CLIENT_SECRET || "test-client-secret",
	OPENAI_REDIRECT_URI:
		process.env.OPENAI_REDIRECT_URI ||
		"http://localhost:3000/auth/openai/callback",
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
function validateOpenAIParameters(params: {
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

function validateOpenAIConfiguration() {
	if (!env.OPENAI_CLIENT_ID || !env.OPENAI_CLIENT_SECRET) {
		return NextResponse.json(
			{ error: "Missing configuration" },
			{ status: 500 },
		);
	}
	return null;
}

function createTokenCookie(response: NextResponse, tokenResponse: any) {
	response.cookies.set("openai-token", tokenResponse.access_token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: tokenResponse.expires_in || 3600,
	});
}

function handleOpenAIRedirect(redirectUri: string | null, tokenResponse: any) {
	if (!redirectUri) {
		return null;
	}

	try {
		const sanitizedUrl = sanitizeRedirectUrl(redirectUri);

		// Create response with redirect and set token cookie
		const response = NextResponse.redirect(sanitizedUrl);
		createTokenCookie(response, tokenResponse);

		return response;
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
		const validationError = validateOpenAIParameters({
			code,
			state,
			error,
			errorDescription,
		});
		if (validationError) {
			return validationError;
		}

		// Check configuration
		const configError = validateOpenAIConfiguration();
		if (configError) {
			return configError;
		}

		// Exchange code for token
		const tokenResponse = await exchangeCodeForToken(
			code!,
			env.OPENAI_CLIENT_ID,
			env.OPENAI_CLIENT_SECRET,
			env.OPENAI_REDIRECT_URI,
		);

		// Handle redirect if specified
		const redirectResponse = handleOpenAIRedirect(redirectUri, tokenResponse);
		if (redirectResponse) {
			return redirectResponse;
		}

		// Return token response with cookie
		const response = NextResponse.json({
			success: true,
			token: tokenResponse,
		});

		createTokenCookie(response, tokenResponse);
		return response;
	} catch (error) {
		return NextResponse.json(
			{ error: handleAuthError(error) },
			{ status: 500 },
		);
	}
}
