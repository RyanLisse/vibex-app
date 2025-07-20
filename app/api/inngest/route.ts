// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { serve } from "inngest/next";
import type { NextRequest } from "next/server";
import { createTask, inngest, taskControl } from "@/lib/inngest";

// Set max duration for Vercel functions
export const maxDuration = 60;

// Export runtime configuration for edge compatibility

// Configure Inngest serve handler
const handler = serve({
	client: inngest,
	functions: [createTask, taskControl],
	// Add signing key for production
	signingKey: process.env.INNGEST_SIGNING_KEY,
	// Add serve path configuration
	servePath: "/api/inngest",
});

// Wrap handlers to gracefully handle empty body PUT requests from Inngest dev server
const wrapHandler = (method: "GET" | "POST" | "PUT") => {
	return async (req: NextRequest) => {
		try {
			// For PUT requests in dev mode, check if body exists
			const isDevMode =
				process.env.NODE_ENV === "development" ||
				process.env.INNGEST_DEV === "1";
			if (method === "PUT" && isDevMode) {
				const contentLength = req.headers.get("content-length");

				// If no content or empty body, return early success
				if (contentLength === "0" || contentLength === null) {
					return new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}
			}

			// Call the original handler
			return await handler[method](req, {});
		} catch (error) {
			// Handle JSON parsing errors gracefully
			if (error instanceof SyntaxError && error.message.includes("JSON")) {
				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}

			// Re-throw other errors
			throw error;
		}
	};
};

export const GET = wrapHandler("GET");
export const POST = wrapHandler("POST");
export const PUT = wrapHandler("PUT");
