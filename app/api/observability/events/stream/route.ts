/**
 * Real-time Event Streaming API Route
 *
 * Provides Server-Sent Events (SSE) for real-time observability event streaming.
 */

import { type NextRequest, NextResponse } from "next/server";
import type { EventStreamFilter } from "@/lib/observability/streaming";
import { eventStream } from "@/lib/observability/streaming";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);

	// Parse filter parameters
	const filter: EventStreamFilter = {
		types: searchParams.get("types")?.split(",") as any,
		severities: searchParams.get("severities")?.split(",") as any,
		sources: searchParams.get("sources")?.split(","),
		tags: searchParams.get("tags")?.split(","),
		executionId: searchParams.get("executionId") || undefined,
		userId: searchParams.get("userId") || undefined,
		sessionId: searchParams.get("sessionId") || undefined,
	};

	// Create readable stream for SSE
	const stream = new ReadableStream({
		start(controller) {
			// Subscribe to event stream
			const subscriptionId = eventStream.manager.subscribe(filter, (event) => {
				const data = `data: ${JSON.stringify({
					type: "event",
					data: event,
					timestamp: new Date().toISOString(),
				})}\n\n`;

				try {
					controller.enqueue(new TextEncoder().encode(data));
				} catch (error) {
					console.error("Error sending SSE event:", error);
				}
			});

			// Send initial connection event
			const connectionData = `data: ${JSON.stringify({
				type: "connected",
				subscriptionId,
				filter,
				timestamp: new Date().toISOString(),
			})}\n\n`;

			controller.enqueue(new TextEncoder().encode(connectionData));

			// Handle client disconnect
			const cleanup = () => {
				eventStream.manager.unsubscribe(subscriptionId);
				try {
					controller.close();
				} catch (error) {
					// Controller might already be closed
				}
			};

			// Store cleanup function for later use
			(controller as any).cleanup = cleanup;
		},
		cancel() {
			// Cleanup when stream is cancelled
			if ((this as any).cleanup) {
				(this as any).cleanup();
			}
		},
	});

	return new NextResponse(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Cache-Control",
		},
	});
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { action, subscriptionId } = body;

		switch (action) {
			case "unsubscribe": {
				if (!subscriptionId) {
					return NextResponse.json({ error: "Subscription ID required" }, { status: 400 });
				}

				const success = eventStream.manager.unsubscribe(subscriptionId);
				return NextResponse.json({ success });
			}

			case "stats": {
				const stats = eventStream.manager.getSubscriptionStats();
				const performance = eventStream.manager.getPerformanceMetrics();
				return NextResponse.json({ stats, performance });
			}

			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}
	} catch (error) {
		console.error("Error processing stream action:", error);
		return NextResponse.json({ error: "Failed to process action" }, { status: 500 });
	}
}
