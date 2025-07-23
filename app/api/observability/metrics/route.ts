// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { observabilityService } from "@/lib/observability";
import { metricsCollector } from "@/lib/observability/metrics";

const metricsQuerySchema = z.object({
	metrics: z
		.array(
			z.enum([
				"query_duration",
				"sync_latency",
				"wasm_init_time",
				"memory_usage",
				"cpu_usage",
				"network_latency",
				"cache_hit_rate",
				"error_rate",
				"throughput",
			]),
		)
		.optional(),
	startTime: z.string().datetime().optional(),
	endTime: z.string().datetime().optional(),
	granularity: z.enum(["minute", "hour", "day"]).default("hour"),
	aggregation: z.enum(["avg", "sum", "min", "max", "count"]).default("avg"),
});

const recordMetricSchema = z.object({
	type: z.enum([
		"query_duration",
		"sync_latency",
		"wasm_init_time",
		"memory_usage",
		"cpu_usage",
		"network_latency",
		"cache_hit_rate",
		"error_rate",
		"throughput",
	]),
	value: z.number(),
	tags: z.record(z.string(), z.string()).default({}),
	timestamp: z.string().datetime().optional(),
});

// GET /api/observability/metrics - Get performance metrics
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const queryParams = Object.fromEntries(searchParams.entries());
		const query = metricsQuerySchema.parse(queryParams);

		observabilityService.recordEvent({
			type: "query",
			category: "metrics",
			message: "Fetching performance metrics",
			metadata: { query },
		});

		const startTime = query.startTime
			? new Date(query.startTime)
			: new Date(Date.now() - 24 * 60 * 60 * 1000);
		const endTime = query.endTime ? new Date(query.endTime) : new Date();

		// Get current metrics snapshot
		const currentMetrics =
			(await (metricsCollector as any).getCurrentMetrics?.()) || {};

		// Get historical metrics
		const historicalMetrics =
			(await (metricsCollector as any).getMetrics?.({
				types: query.metrics,
				startTime,
				endTime,
				granularity: query.granularity,
				aggregation: query.aggregation,
			})) || [];

		// Get performance analysis
		const analysis = (await (metricsCollector as any).analyzePerformance?.({
			startTime,
			endTime,
			includeRecommendations: true,
		})) || { trends: [], anomalies: [], recommendations: [], healthScore: 0 };

		return NextResponse.json({
			current: currentMetrics,
			historical: historicalMetrics,
			analysis: {
				trends: analysis.trends,
				anomalies: analysis.anomalies,
				recommendations: analysis.recommendations,
				healthScore: analysis.healthScore,
			},
			metadata: {
				timeRange: {
					start: startTime,
					end: endTime,
				},
				granularity: query.granularity,
				aggregation: query.aggregation,
				dataPoints: Array.isArray(historicalMetrics)
					? historicalMetrics.reduce(
							(sum: number, metric: any) =>
								sum + (metric.dataPoints?.length || 0),
							0,
						)
					: 0,
			},
		});
	} catch (error) {
		observabilityService.recordError(error as Error, {
			context: "observability_metrics_get",
		});

		return NextResponse.json(
			{ error: "Failed to fetch metrics" },
			{ status: 500 },
		);
	}
}

// POST /api/observability/metrics - Record new metric
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const metricData = recordMetricSchema.parse(body);

		observabilityService.recordEvent({
			type: "execution",
			category: "metrics",
			message: "Recording performance metric",
			metadata: {
				type: metricData.type,
				value: metricData.value,
				tags: metricData.tags,
			},
		});

		// Record the metric
		await metricsCollector.recordMetric(
			metricData.type,
			metricData.value,
			metricData.tags as Record<string, string>,
		);

		return NextResponse.json(
			{
				success: true,
				recorded: {
					type: metricData.type,
					value: metricData.value,
					timestamp: metricData.timestamp || new Date().toISOString(),
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		observabilityService.recordError(error as Error, {
			context: "observability_metrics_post",
		});

		return NextResponse.json(
			{ error: "Failed to record metric" },
			{ status: 500 },
		);
	}
}
