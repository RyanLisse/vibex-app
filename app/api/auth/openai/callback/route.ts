import { type NextRequest } from "next/server";
import { exchangeCodeForToken } from "@/lib/auth/openai-codex";
import { handleOAuthCallback, type OAuthConfig } from "@/lib/auth/oauth-utils";

// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Mock environment variables
const env = {
	OPENAI_CLIENT_ID: process.env.OPENAI_CLIENT_ID || "test-client-id",
	OPENAI_CLIENT_SECRET: process.env.OPENAI_CLIENT_SECRET || "test-client-secret",
	OPENAI_REDIRECT_URI:
		process.env.OPENAI_REDIRECT_URI || "http://localhost:3000/auth/openai/callback",
	NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
};

// Configuration for OAuth handler
const openaiConfig: OAuthConfig = {
	clientId: env.OPENAI_CLIENT_ID,
	clientSecret: env.OPENAI_CLIENT_SECRET,
	redirectUri: env.OPENAI_REDIRECT_URI,
	providerName: "OpenAI",
};

// Token exchange function specific to OpenAI
async function exchangeOpenAIToken(code: string, config: OAuthConfig): Promise<any> {
	return exchangeCodeForToken(code, config.clientId, config.clientSecret, config.redirectUri);
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);

	return handleOAuthCallback({
		searchParams,
		config: openaiConfig,
		tokenExchanger: exchangeOpenAIToken,
		cookieName: "openai-token",
	});
}
