/**
 * Health Check API Route
 *
 * Provides health status and metrics for deployment monitoring
 */

import { NextResponse } from "next/server";
import { deploymentMonitor } from "@/lib/monitoring/deployment-monitor";
import { observability } from "@/lib/observability";

/**
 * GET /api/health - Get deployment health status
 */
export async function GET() {
	return observability.trackOperation("api.health.check", async () => {
		try {
			const healthStatus = deploymentMonitor.getHealthStatus();
			const metrics = deploymentMonitor.getMetrics();

			const response = {
				status: healthStatus.overall,
				timestamp: new Date().toISOString(),
				checks: healthStatus.checks.map((check) => ({
					name: check.name,
					status: check.status,
					message: check.message,
					responseTime: check.responseTime,
					lastCheck: check.timestamp.toISOString(),
				})),
				metrics: metrics
					? {
							database: {
								connections: metrics.database.connectionCount,
								activeQueries: metrics.database.activeQueries,
								avgQueryTime: `${metrics.database.avgQueryTime}ms`,
								errorRate: `${(metrics.database.errorRate * 100).toFixed(2)}%`,
							},
							electric: {
								syncLatency: `${metrics.electric.syncLatency}ms`,
								connections: metrics.electric.connectionCount,
								errorRate: `${(metrics.electric.errorRate * 100).toFixed(2)}%`,
								lastSync: metrics.electric.lastSyncTime.toISOString(),
							},
							application: {
								uptime: `${Math.floor(metrics.application.uptime)}s`,
								memoryUsage: `${metrics.application.memoryUsage.toFixed(1)}%`,
								cpuUsage: `${metrics.application.cpuUsage.toFixed(1)}%`,
								requestRate: `${metrics.application.requestRate}/min`,
								errorRate: `${(metrics.application.errorRate * 100).toFixed(2)}%`,
							},
						}
					: null,
				version: process.env.SERVICE_VERSION || "1.0.0",
				environment: process.env.NODE_ENV || "development",
			};

			// Set appropriate HTTP status based on health
			const statusCode =
				healthStatus.overall === "healthy" ? 200 : healthStatus.overall === "degraded" ? 200 : 503;

			observability.recordEvent("api.health.checked", {
				status: healthStatus.overall,
				checksCount: healthStatus.checks.length,
			});

			return NextResponse.json(response, { status: statusCode });
		} catch (error) {
			observability.recordError("api.health.check-failed", error as Error);

			return NextResponse.json(
				{
					status: "unhealthy",
					timestamp: new Date().toISOString(),
					error: "Health check failed",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 503 }
			);
		}
	});
}
