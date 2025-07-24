import { type NextRequest, NextResponse } from "next/server";
import { revokeToken } from "@/lib/auth/openai-codex";

// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Mock environment variables
const env = {
	OPENAI_CLIENT_ID: process.env.OPENAI_CLIENT_ID || "test-client-id",
	OPENAI_CLIENT_SECRET: process.env.OPENAI_CLIENT_SECRET || "test-client-secret",
	NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
};

// Utility functions
const handleLogoutError = (error: any): string => {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
};

const clearAuthCookies = (response: NextResponse): void => {
	const cookieOptions = {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax" as const,
		maxAge: 0, // Expire immediately
	};

	response.cookies.set("openai-token", "", cookieOptions);
	response.cookies.set("openai-oauth-state", "", cookieOptions);
	response.cookies.set("openai-redirect-uri", "", cookieOptions);
	response.cookies.set("openai-refresh-token", "", cookieOptions);
};

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const redirectUri = searchParams.get("redirect_uri") || env.NEXTAUTH_URL;

		// Get token from cookie
		const token = request.cookies.get("openai-token")?.value;

		// Create logout response
		const response = NextResponse.json({
			success: true,
			message: "Logged out successfully",
			redirect_uri: redirectUri,
		});

		// Clear authentication cookies
		clearAuthCookies(response);

		// Attempt to revoke token if available
		if (token && env.OPENAI_CLIENT_ID && env.OPENAI_CLIENT_SECRET) {
			try {
				await revokeToken({
					token,
					clientId: env.OPENAI_CLIENT_ID,
					clientSecret: env.OPENAI_CLIENT_SECRET,
				});
			} catch (revokeError) {
				// Log error but don't fail the logout
				console.warn("Failed to revoke OpenAI token:", revokeError);
			}
		}

		return response;
	} catch (error) {
		// Even if logout fails, clear cookies and return success
		const response = NextResponse.json({
			success: true,
			message: "Logged out successfully (with errors)",
			error: handleLogoutError(error),
		});

		clearAuthCookies(response);
		return response;
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { redirect_uri, revoke_token: shouldRevokeToken = true } = body;

		// Get token from cookie or request body
		const tokenFromCookie = request.cookies.get("openai-token")?.value;
		const tokenFromBody = body.token;
		const token = tokenFromBody || tokenFromCookie;

		// Create logout response
		const response = NextResponse.json({
			success: true,
			message: "Logged out successfully",
			redirect_uri: redirect_uri || env.NEXTAUTH_URL,
			token_revoked: false,
		});

		// Clear authentication cookies
		clearAuthCookies(response);

		// Attempt to revoke token if requested and available
		if (shouldRevokeToken && token && env.OPENAI_CLIENT_ID && env.OPENAI_CLIENT_SECRET) {
			try {
				await revokeToken({
					token,
					clientId: env.OPENAI_CLIENT_ID,
					clientSecret: env.OPENAI_CLIENT_SECRET,
				});

				// Update response to indicate token was revoked
				return NextResponse.json({
					success: true,
					message: "Logged out and token revoked successfully",
					redirect_uri: redirect_uri || env.NEXTAUTH_URL,
					token_revoked: true,
				});
			} catch (revokeError) {
				// Log error but don't fail the logout
				console.warn("Failed to revoke OpenAI token:", revokeError);

				return NextResponse.json({
					success: true,
					message: "Logged out successfully (token revocation failed)",
					redirect_uri: redirect_uri || env.NEXTAUTH_URL,
					token_revoked: false,
					revoke_error: handleLogoutError(revokeError),
				});
			}
		}

		return response;
	} catch (error) {
		// Even if logout fails, clear cookies and return success
		const response = NextResponse.json({
			success: true,
			message: "Logged out successfully (with errors)",
			error: handleLogoutError(error),
		});

		clearAuthCookies(response);
		return response;
	}
}
