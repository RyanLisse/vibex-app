// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import { githubAuth } from "@/lib/github";

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const code = searchParams.get("code");
	const error = searchParams.get("error");

	// Handle OAuth errors
	if (error) {
		return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
	}

	if (!code) {
		return NextResponse.redirect(new URL("/?error=missing_code", request.url));
	}

	try {
		// Exchange code for access token
		const accessToken = await githubAuth.exchangeCodeForToken(code);

		// Get user info
		const user = await githubAuth.getUser(accessToken);

		// Create the response with a redirect to close the popup
		const response = NextResponse.redirect(
			new URL("/auth/success", request.url),
		);

		// Set the access token in an httpOnly cookie (secure)
		response.cookies.set("github_access_token", accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 60 * 60 * 24 * 7, // 7 days
		});

		// Set user info in a readable cookie for the frontend
		response.cookies.set(
			"github_user",
			JSON.stringify({
				id: user.id,
				login: user.login,
				avatar_url: user.avatar_url,
				name: user.name,
			}),
			{
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 60 * 60 * 24 * 7, // 7 days
			},
		);

		return response;
	} catch (_error) {
		return NextResponse.redirect(new URL("/?error=oauth_failed", request.url));
	}
}
