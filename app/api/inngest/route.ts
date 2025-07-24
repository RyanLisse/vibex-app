import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/route-error-handler";

// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Handle GET requests to Inngest endpoint
 */
export const GET = withErrorHandling(
	async (request: NextRequest) => {
		return NextResponse.json({
			status: "ok",
			message: "Inngest endpoint is running",
			timestamp: new Date().toISOString(),
		});
	},
	{
		route: "GET /api/inngest",
		metricName: "inngest_api",
	}
);

/**
 * Handle POST requests to Inngest endpoint
 */
export const POST = withErrorHandling(
	async (request: NextRequest) => {
		const body = await request.json();

		// Mock implementation for build purposes
		console.log("Inngest POST received:", body);

		return NextResponse.json({
			success: true,
			message: "Event received",
			timestamp: new Date().toISOString(),
		});
	},
	{
		route: "POST /api/inngest",
		metricName: "inngest_api",
	}
);

/**
 * Handle PUT requests to Inngest endpoint
 */
export const PUT = withErrorHandling(
	async (request: NextRequest) => {
		const body = await request.json();

		// Mock implementation for build purposes
		console.log("Inngest PUT received:", body);

		return NextResponse.json({
			success: true,
			message: "Event updated",
			timestamp: new Date().toISOString(),
		});
	},
	{
		route: "PUT /api/inngest",
		metricName: "inngest_api",
	}
);
