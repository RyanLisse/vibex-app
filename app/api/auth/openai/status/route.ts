import { type NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/auth/openai-codex";

// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
	try {
		// Get token from Authorization header or cookies
		const authHeader = request.headers.get("authorization");
		const token = authHeader?.replace("Bearer ", "") || request.cookies.get("openai-token")?.value;

		if (!token) {
			return NextResponse.json({
				authenticated: false,
				user: null,
				message: "No token provided",
			});
		}

		// Validate the token
		const isValid = await validateToken(token);

		if (!isValid) {
			return NextResponse.json({
				authenticated: false,
				user: null,
				message: "Invalid or expired token",
			});
		}

		// In a real implementation, you would fetch user info
		// For now, return a mock user object
		return NextResponse.json({
			authenticated: true,
			user: {
				id: "mock-user-id",
				email: "user@example.com",
				name: "Mock User",
				provider: "openai",
			},
			token: {
				expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
				scope: "api.read api.write",
			},
		});
	} catch (error) {
		console.error("Error checking OpenAI auth status:", error);

		return NextResponse.json(
			{
				authenticated: false,
				user: null,
				error: "Failed to check authentication status",
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { token } = body;

		if (!token) {
			return NextResponse.json({ error: "Token is required" }, { status: 400 });
		}

		// Validate the provided token
		const isValid = await validateToken(token);

		return NextResponse.json({
			valid: isValid,
			message: isValid ? "Token is valid" : "Token is invalid or expired",
		});
	} catch (error) {
		console.error("Error validating OpenAI token:", error);

		return NextResponse.json({ error: "Failed to validate token" }, { status: 500 });
	}
}
