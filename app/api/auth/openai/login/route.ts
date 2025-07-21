import { type NextRequest, NextResponse } from "next/server";
import { generateAuthUrl } from "@/lib/auth/openai-codex";

// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Mock environment variables
const env = {
	OPENAI_CLIENT_ID: process.env.OPENAI_CLIENT_ID || "test-client-id",
	OPENAI_REDIRECT_URI:
		process.env.OPENAI_REDIRECT_URI ||
		"http://localhost:3000/auth/openai/callback",
	NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
};

// Utility functions
const generateState = (): string => {
	// In production, this would be a cryptographically secure random string
	return Math.random().toString(36).substring(2, 15);
};

const validateRedirectUri = (redirectUri: string): boolean => {
	// Basic validation to ensure redirect URI is safe
	if (!redirectUri) return false;
	if (
		redirectUri.startsWith("javascript:") ||
		redirectUri.startsWith("data:")
	) {
		return false;
	}
	return true;
};

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const redirectUri = searchParams.get("redirect_uri") || env.NEXTAUTH_URL;

		// Validate redirect URI
		if (!validateRedirectUri(redirectUri)) {
			return NextResponse.json(
				{ error: "Invalid redirect URI" },
				{ status: 400 },
			);
		}

		// Check configuration
		if (!env.OPENAI_CLIENT_ID) {
			return NextResponse.json(
				{ error: "Missing configuration" },
				{ status: 500 },
			);
		}

		// Generate state for CSRF protection
		const state = generateState();

		// Generate authorization URL
		const authUrl = generateAuthUrl({
			clientId: env.OPENAI_CLIENT_ID,
			redirectUri: env.OPENAI_REDIRECT_URI,
			state,
			scopes: ["read", "write"],
		});

		// Create response with redirect
		const response = NextResponse.json({
			success: true,
			auth_url: authUrl,
			state,
		});

		// Store state in cookie for validation
		response.cookies.set("openai-oauth-state", state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 600, // 10 minutes
		});

		// Store redirect URI for after auth
		response.cookies.set("openai-redirect-uri", redirectUri, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 600, // 10 minutes
		});

		return response;
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { redirect_uri } = body;

		// Validate redirect URI if provided
		if (redirect_uri && !validateRedirectUri(redirect_uri)) {
			return NextResponse.json(
				{ error: "Invalid redirect URI" },
				{ status: 400 },
			);
		}

		// Check configuration
		if (!env.OPENAI_CLIENT_ID) {
			return NextResponse.json(
				{ error: "Missing configuration" },
				{ status: 500 },
			);
		}

		// Generate state for CSRF protection
		const state = generateState();
		const finalRedirectUri = redirect_uri || env.NEXTAUTH_URL;

		// Generate authorization URL
		const authUrl = generateAuthUrl({
			clientId: env.OPENAI_CLIENT_ID,
			redirectUri: env.OPENAI_REDIRECT_URI,
			state,
			scopes: ["read", "write"],
		});

		// Create response
		const response = NextResponse.json({
			success: true,
			auth_url: authUrl,
			state,
			redirect_uri: finalRedirectUri,
		});

		// Store state in cookie for validation
		response.cookies.set("openai-oauth-state", state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 600, // 10 minutes
		});

		// Store redirect URI for after auth
		response.cookies.set("openai-redirect-uri", finalRedirectUri, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 600, // 10 minutes
		});

		return response;
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 500 },
		);
	}
}
