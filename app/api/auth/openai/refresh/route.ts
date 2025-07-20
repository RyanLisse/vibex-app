// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { CodexAuthenticator } from "@/lib/auth/openai-codex";

export async function POST() {
	try {
		const authenticator = new CodexAuthenticator();

		const config = await authenticator.refreshAccessToken();

		return NextResponse.json({
			success: true,
			message: "Token refreshed successfully",
			expires_at: config.expires_at,
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Token refresh failed",
			},
			{ status: 500 },
		);
	}
}
