/**
 * System Health Metrics API Route
 *
 * Provides comprehensive system health metrics including execution statistics,
 * error rates, performance metrics, and agent activity.
 */

import { type NextRequest, NextResponse } from "next/server";
import { enhancedObservability } from "@/lib/observability/enhanced-events-system";
import { performanceAggregation } from "@/lib/observability/performance-aggregation";
import { eventStream } from "@/lib/observability/streaming";

export async function GET(request: NextRequest) {
	try {
		// Get comprehensive system health metrics
		const healthMetrics = await performanceAggregation.getSystemHealthMetrics();

		// Get active executions
		const activeExecutions = enhancedObservability.getActiveExecutions();

		// Get streaming performance metrics
		const streamingMetrics = eventStream.manager.getPerformanceMetrics();

		// Get subscription statistics
		const subscriptionStats = eventStream.manager.getSubscriptionStats();

		const response = {
			timestamp: new Date().toISOString(),
			health: healthMetrics,
			realtime: {
				activeExecutions: activeExecutions.length,
				executionsByType: activeExecutions.reduce(
					(acc, exec) => {
						acc[exec.agentType] = (acc[exec.agentType] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>,
				),
				streaming: streamingMetrics,
				subscriptions: subscriptionStats,
			},
			system: {
				uptime: process.uptime(),
				memory: process.memoryUsage(),
				cpu: process.cpuUsage(),
				nodeVersion: process.version,
				platform: process.platform,
			},
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error getting health metrics:", error);
		return NextResponse.json(
			{ error: "Failed to get health metrics" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { action } = body;

		switch (action) {
			case "clear_cache":
				performanceAggregation.clearCache();
				return NextResponse.json({ success: true, message: "Cache cleared" });

			case "force_flush":
				await enhancedObservability.forceFlush();
				return NextResponse.json({ success: true, message: "Events flushed" });

			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}
	} catch (error) {
		console.error("Error processing health action:", error);
		return NextResponse.json(
			{ error: "Failed to process action" },
			{ status: 500 },
		);
	}
}
