// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { githubAuth } from "@/lib/github";

export async function GET() {
	try {
		const authUrl = githubAuth.getAuthUrl();

		return NextResponse.json({ url: authUrl });
	} catch (_error) {
		return NextResponse.json(
			{ error: "Failed to generate auth URL" },
			{ status: 500 },
		);
	}
}
