/**
 * Agent Memory Knowledge Sharing API Route
 *
 * Enables knowledge sharing between different agent sessions
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { agentMemoryService } from "@/lib/agent-memory/memory-service";
import { observability } from "@/lib/observability";

const ShareKnowledgeSchema = z.object({
	fromAgentType: z.string().min(1).max(100),
	toAgentType: z.string().min(1).max(100),
	contextKey: z.string().min(1).max(255),
	minImportance: z.number().int().min(1).max(10).optional(),
	copyMetadata: z.boolean().optional(),
	adjustImportance: z.boolean().optional(),
});

/**
 * POST /api/agent-memory/share - Share knowledge between agents
 */
export async function POST(request: NextRequest) {
	return observability.trackOperation("api.agent-memory.share-knowledge", async () => {
		try {
			const body = await request.json();
			const validatedData = ShareKnowledgeSchema.parse(body);

			const result = await agentMemoryService.shareKnowledge(
				validatedData.fromAgentType,
				validatedData.toAgentType,
				validatedData.contextKey,
				{
					minImportance: validatedData.minImportance,
					copyMetadata: validatedData.copyMetadata,
					adjustImportance: validatedData.adjustImportance,
				}
			);

			observability.recordEvent("api.agent-memory.knowledge-shared", {
				fromAgentType: validatedData.fromAgentType,
				toAgentType: validatedData.toAgentType,
				contextKey: validatedData.contextKey,
				shared: result.shared,
				errors: result.errors,
			});

			return NextResponse.json({
				success: true,
				data: result,
			});
		} catch (error) {
			observability.recordError("api.agent-memory.share-knowledge-failed", error as Error);

			if (error instanceof z.ZodError) {
				return NextResponse.json(
					{
						success: false,
						error: "Validation failed",
						details: error.issues.map((issue) => ({
							field: issue.path.join("."),
							message: issue.message,
						})),
					},
					{ status: 400 }
				);
			}

			return NextResponse.json(
				{
					success: false,
					error: "Failed to share knowledge",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
