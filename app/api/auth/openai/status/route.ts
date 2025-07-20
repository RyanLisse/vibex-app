// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { CodexAuthenticator } from "@/lib/auth/openai-codex";

export async function GET() {
	try {
		const authenticator = new CodexAuthenticator();

		const isAuthenticated = await authenticator.isAuthenticated();

		if (!isAuthenticated) {
			return NextResponse.json({
				authenticated: false,
			});
		}

		const config = await authenticator.loadAuthConfig();

		return NextResponse.json({
			authenticated: true,
			user: {
				email: config?.user_email,
				organization_id: config?.organization_id,
				credits_granted: config?.credits_granted,
				created_at: config?.created_at,
			},
			expires_at: config?.expires_at,
			hasRefreshToken: !!config?.refresh_token,
		});
	} catch (error) {
		return NextResponse.json(
			{
				authenticated: false,
				error: error instanceof Error ? error.message : "Status check failed",
			},
			{ status: 500 },
		);
	}
}
