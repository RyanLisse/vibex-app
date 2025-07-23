/**
 * Agent Memory Insights API Route
 *
 * Provides analytics and insights about agent memory patterns
 */

import { type NextRequest, NextResponse } from "next/server";
import { agentMemoryService } from "@/lib/agent-memory/memory-service";
import { observability } from "@/lib/observability";

/**
 * GET /api/agent-memory/insights - Get memory insights for an agent
 */
export async function GET(request: NextRequest) {
	return observability.trackOperation("api.agent-memory.get-insights", async () => {
		try {
			const { searchParams } = new URL(request.url);
			const agentType = searchParams.get("agentType");

			if (!agentType) {
				return NextResponse.json(
					{
						success: false,
						error: "agentType parameter is required",
					},
					{ status: 400 }
				);
			}

			const insights = await agentMemoryService.getMemoryInsights(agentType);

			observability.recordEvent("api.agent-memory.insights-retrieved", {
				agentType,
				patternsCount: insights.patterns.length,
				frequentContextsCount: insights.frequentContexts.length,
				recommendationsCount: insights.recommendations.length,
			});

			return NextResponse.json({
				success: true,
				data: insights,
			});
		} catch (error) {
			observability.recordError("api.agent-memory.get-insights-failed", error as Error);

			return NextResponse.json(
				{
					success: false,
					error: "Failed to get insights",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
