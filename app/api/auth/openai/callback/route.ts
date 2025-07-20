// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import {
	exchangeCodeForToken,
	handleAuthError,
	sanitizeRedirectUrl,
	validateOAuthState,
} from "@/lib/auth/openai-codex";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const code = searchParams.get("code");
		const state = searchParams.get("state");
		const error = searchParams.get("error");
		const errorDescription = searchParams.get("error_description");

		// Handle OAuth error responses
		if (error) {
			return NextResponse.json(
				{ error, error_description: errorDescription },
				{ status: 400 },
			);
		}

		// Validate required parameters
		if (!code) {
			return NextResponse.json(
				{ error: "Missing code parameter" },
				{ status: 400 },
			);
		}

		if (!state) {
			return NextResponse.json(
				{ error: "Missing state parameter" },
				{ status: 400 },
			);
		}

		// Validate state parameter
		if (!validateOAuthState(state)) {
			return NextResponse.json(
				{ error: "Invalid state parameter" },
				{ status: 400 },
			);
		}

		// Check environment configuration
		if (
			!(
				env.OPENAI_CLIENT_ID &&
				env.OPENAI_CLIENT_SECRET &&
				env.OPENAI_REDIRECT_URI &&
				env.OPENAI_TOKEN_URL
			)
		) {
			return NextResponse.json(
				{ error: "Missing configuration" },
				{ status: 500 },
			);
		}

		// Exchange code for token
		const token = await exchangeCodeForToken({
			tokenUrl: env.OPENAI_TOKEN_URL,
			clientId: env.OPENAI_CLIENT_ID,
			clientSecret: env.OPENAI_CLIENT_SECRET,
			code,
			redirectUri: env.OPENAI_REDIRECT_URI,
			codeVerifier: "placeholder-verifier", // TODO: Get from session
		});

		// Handle redirect
		const redirectUrl = searchParams.get("redirect_uri");
		if (redirectUrl) {
			const sanitizedUrl = sanitizeRedirectUrl(redirectUrl);
			return NextResponse.redirect(sanitizedUrl);
		}

		return NextResponse.json({
			success: true,
			token,
		});
	} catch (error) {
		const errorMessage = handleAuthError(error);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
