/**
 * Agent Memory Context API Route
 *
 * Provides relevant context for agents starting new tasks
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { agentMemoryService } from "@/lib/agent-memory/memory-service";
import { observability } from "@/lib/observability";

const GetContextSchema = z.object({
	agentType: z.string().min(1).max(100),
	taskDescription: z.string().min(1),
	maxMemories: z.number().int().positive().max(50).optional(),
	includePatterns: z.boolean().optional(),
	includeSummary: z.boolean().optional(),
});

/**
 * POST /api/agent-memory/context - Get relevant context for a task
 */
export async function POST(request: NextRequest) {
	return observability.trackOperation("api.agent-memory.get-context", async () => {
		try {
			const body = await request.json();
			const validatedData = GetContextSchema.parse(body);

			const context = await agentMemoryService.getRelevantContext(
				validatedData.agentType,
				validatedData.taskDescription,
				{
					maxMemories: validatedData.maxMemories,
					includePatterns: validatedData.includePatterns,
					includeSummary: validatedData.includeSummary,
				}
			);

			observability.recordEvent("api.agent-memory.context-retrieved", {
				agentType: validatedData.agentType,
				taskDescription: validatedData.taskDescription.substring(0, 50),
				relevantMemoriesCount: context.relevantMemories.length,
				totalMemories: context.totalMemories,
			});

			return NextResponse.json({
				success: true,
				data: context,
			});
		} catch (error) {
			observability.recordError("api.agent-memory.get-context-failed", error as Error);

			if (error instanceof z.ZodError) {
				return NextResponse.json(
					{
						success: false,
						error: "Validation failed",
						details: error.issues.map(issue => ({ field: issue.path.join("."), message: issue.message })),
					},
					{ status: 400 }
				);
			}

			return NextResponse.json(
				{
					success: false,
					error: "Failed to get context",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
