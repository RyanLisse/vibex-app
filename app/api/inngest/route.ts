import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Handle GET requests to Inngest endpoint
 */
export async function GET(request: NextRequest) {
	try {
		return NextResponse.json({
			status: "ok",
			message: "Inngest endpoint is running",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Inngest GET error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * Handle POST requests to Inngest endpoint
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// Mock implementation for build purposes
		console.log("Inngest POST received:", body);

		return NextResponse.json({
			success: true,
			message: "Event received",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Inngest POST error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * Handle PUT requests to Inngest endpoint
 */
export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();

		// Mock implementation for build purposes
		console.log("Inngest PUT received:", body);

		return NextResponse.json({
			success: true,
			message: "Event updated",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Inngest PUT error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
