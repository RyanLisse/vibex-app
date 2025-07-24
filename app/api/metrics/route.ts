/**
 * Prometheus Metrics API Endpoint
 * Exposes metrics in Prometheus format for scraping
 */

import { type NextRequest, NextResponse } from "next/server";
import { PrometheusMetricsCollector } from "@/lib/metrics/prometheus-client";

export async function GET(request: NextRequest) {
	try {
		const collector = PrometheusMetricsCollector.getInstance();
		const metrics = await collector.getMetrics();

		return new NextResponse(metrics, {
			status: 200,
			headers: {
				"Content-Type": "text/plain; version=0.0.4; charset=utf-8",
				"Cache-Control": "no-cache, no-store, must-revalidate",
				Pragma: "no-cache",
				Expires: "0",
			},
		});
	} catch (error) {
		console.error("Error getting metrics:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}

// Optional: Add authentication for production environments
function isAuthorized(request: NextRequest): boolean {
	// In production, add proper authentication here
	if (process.env.NODE_ENV === "production") {
		const authHeader = request.headers.get("authorization");
		const expectedToken = process.env.METRICS_AUTH_TOKEN;

		if (!expectedToken) {
			console.warn("METRICS_AUTH_TOKEN not set in production environment");
			return false;
		}

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return false;
		}

		const token = authHeader.substring(7);
		return token === expectedToken;
	}

	// Allow unrestricted access in development
	return true;
}

// Alternative authenticated endpoint
export async function POST(request: NextRequest) {
	if (!isAuthorized(request)) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	return GET(request);
}
