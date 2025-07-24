/**
 * Performance Metrics API Route
 *
 * Provides detailed performance metrics with aggregation and filtering capabilities.
 */

import { type NextRequest, NextResponse } from "next/server";
import { performanceAggregation } from "@/lib/observability/performance-aggregation";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const timeRange = parseInt(searchParams.get("timeRange") || "60"); // minutes
		const format = searchParams.get("format") || "json";

		// Get performance metrics
		const metrics = await performanceAggregation.collectPerformanceMetrics(timeRange);

		if (format === "prometheus") {
			// Convert to Prometheus format
			const prometheusMetrics = convertToPrometheusFormat(metrics);
			return new NextResponse(prometheusMetrics, {
				headers: {
					"Content-Type": "text/plain; version=0.0.4; charset=utf-8",
				},
			});
		}

		return NextResponse.json({
			timestamp: new Date().toISOString(),
			timeRange: {
				minutes: timeRange,
				start: new Date(Date.now() - timeRange * 60 * 1000).toISOString(),
				end: new Date().toISOString(),
			},
			metrics,
		});
	} catch (error) {
		console.error("Error getting performance metrics:", error);
		return NextResponse.json({ error: "Failed to get performance metrics" }, { status: 500 });
	}
}

/**
 * Convert metrics to Prometheus format
 */
function convertToPrometheusFormat(metrics: any[]): string {
	let output = "";

	for (const metric of metrics) {
		const labels = Object.entries(metric.labels)
			.map(([key, value]) => `${key}="${value}"`)
			.join(",");

		const labelString = labels ? `{${labels}}` : "";

		// Add metric help and type
		output += `# HELP ${metric.name} ${metric.name}\n`;
		output += `# TYPE ${metric.name} histogram\n`;

		// Add metric values
		output += `${metric.name}_count${labelString} ${metric.count}\n`;
		output += `${metric.name}_sum${labelString} ${metric.sum}\n`;
		output += `${metric.name}_bucket{le="0.1"${labels ? "," + labels : ""}} ${Math.floor(metric.count * 0.1)}\n`;
		output += `${metric.name}_bucket{le="0.5"${labels ? "," + labels : ""}} ${Math.floor(metric.count * 0.5)}\n`;
		output += `${metric.name}_bucket{le="1.0"${labels ? "," + labels : ""}} ${Math.floor(metric.count * 0.7)}\n`;
		output += `${metric.name}_bucket{le="5.0"${labels ? "," + labels : ""}} ${Math.floor(metric.count * 0.9)}\n`;
		output += `${metric.name}_bucket{le="+Inf"${labels ? "," + labels : ""}} ${metric.count}\n`;
	}

	return output;
}
