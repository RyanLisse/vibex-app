import { type NextRequest } from "next/server";
import { handleOAuthCallback, type OAuthConfig } from "@/lib/auth/oauth-utils";

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
	ANTHROPIC_CLIENT_SECRET: process.env.ANTHROPIC_CLIENT_SECRET || "test-client-secret",
	ANTHROPIC_REDIRECT_URI:
		process.env.ANTHROPIC_REDIRECT_URI || "http://localhost:3000/auth/anthropic/callback",
	ANTHROPIC_TOKEN_URL: process.env.ANTHROPIC_TOKEN_URL || "https://api.anthropic.com/oauth/token",
	NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
};

// Configuration for OAuth handler
const anthropicConfig: OAuthConfig = {
	clientId: env.ANTHROPIC_CLIENT_ID,
	clientSecret: env.ANTHROPIC_CLIENT_SECRET,
	redirectUri: env.ANTHROPIC_REDIRECT_URI,
	tokenUrl: env.ANTHROPIC_TOKEN_URL,
	providerName: "Anthropic",
};

// Token exchange function specific to Anthropic
async function exchangeAnthropicToken(code: string, config: OAuthConfig): Promise<TokenResponse> {
	return AuthAnthropic.exchange({
		tokenUrl: config.tokenUrl!,
		clientId: config.clientId,
		clientSecret: config.clientSecret,
		code,
		redirectUri: config.redirectUri,
		codeVerifier: "mock-code-verifier", // In production, get from session
	});
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);

	return handleOAuthCallback({
		searchParams,
		config: anthropicConfig,
		tokenExchanger: exchangeAnthropicToken,
		cookieName: "anthropic-token",
	});
}
